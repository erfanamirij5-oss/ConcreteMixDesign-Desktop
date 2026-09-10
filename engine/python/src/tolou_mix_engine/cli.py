from __future__ import annotations

import json
import sys

from tolou_mix_engine import __version__
from tolou_mix_engine.durability import evaluate_durability
from tolou_mix_engine.integrated_design import calculate_integrated_normal_mix

NON_AIR_STRENGTH_RANGE_MPA = (15.0, 40.0)
AIR_STRENGTH_RANGE_MPA = (15.0, 35.0)
ACI_211_SLUMP_RANGE_MM = (25.0, 175.0)
ACI_211_NMSA_MM = (9.5, 12.5, 19.0, 25.0, 37.5, 50.0, 75.0, 150.0)


def read_payload() -> dict:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def _normal_mix_fail(error: str, warning: dict, note: str, limitation: str) -> dict:
    return {
        "status": "fail",
        "engine": "tolou-mix-engine",
        "engine_version": __version__,
        "error": error,
        "mix_proportions": {
            "water_kg_m3": None,
            "cementitious_kg_m3": None,
            "w_cm_ratio": None,
            "strength_based_w_cm_ratio": None,
            "fine_aggregate_kg_m3": None,
            "coarse_aggregate_kg_m3": None,
            "aggregate_ssd_kg_m3": None,
            "aggregate_batch_kg_m3": None,
            "batch_water_adjustment_kg_m3": None,
            "water_to_add_kg_m3": None,
        },
        "warnings": [warning],
        "engineering_notes": [note],
        "standard_references": [
            "ACI PRC-211.1-22 - Selecting Proportions for Normal-Density and High-Density Concrete",
            "ACI CODE-318-25 - Durability requirements where applicable",
        ],
        "limitations": [limitation],
    }


def validate_normal_mix_request(payload: dict) -> dict | None:
    """Fail closed when the current ACI 211 lookup domain is unresolved.

    G02A does not certify implicit clamping or nearest-table snapping as ACI 211.1-22
    behavior. Requests outside the implemented slump domain or using a non-tabulated
    NMSA are rejected before numerical proportioning. Strength-only w/cm requests are
    likewise rejected outside the bounded preliminary strength lookup unless an explicit
    project/durability w/cm is supplied.
    """
    requirements = payload.get("requirements", {}) if isinstance(payload, dict) else {}

    slump = float(requirements.get("slump_mm", 100) or 0)
    slump_lower, slump_upper = ACI_211_SLUMP_RANGE_MM
    if not slump_lower <= slump <= slump_upper:
        return _normal_mix_fail(
            "slump_outside_aci211_lookup_domain",
            {
                "code": "SLUMP_OUTSIDE_LOOKUP_RANGE",
                "severity": "fail",
                "message": (
                    f"اسلامپ {slump:g} mm خارج از دامنه lookup پیاده‌سازی‌شده "
                    f"({slump_lower:g} تا {slump_upper:g} mm) است؛ انتخاب نزدیک‌ترین band مجاز نیست."
                ),
                "reference": "ACI PRC-211.1-22 mixing-water selection; G02A fail-closed domain policy",
            },
            "محاسبه پیش از lookup آب متوقف شد تا clamp ضمنی اسلامپ به‌عنوان رفتار تاییدشده ACI تلقی نشود.",
            "برای ادامه باید اسلامپ داخل دامنه پیاده‌سازی‌شده باشد یا rule معتبرِ نسخه دقیق برای دامنه دیگر اضافه شود.",
        )

    requested_nmsa = float(requirements.get("max_aggregate_size_mm", 19) or 0)
    if not any(abs(requested_nmsa - candidate) <= 0.01 for candidate in ACI_211_NMSA_MM):
        allowed = ", ".join(f"{value:g}" for value in ACI_211_NMSA_MM)
        return _normal_mix_fail(
            "nmsa_not_tabulated_for_aci211_lookup",
            {
                "code": "NMSA_LOOKUP_SNAPPING_REFUSED",
                "severity": "fail",
                "message": (
                    f"NMSA واردشده {requested_nmsa:g} mm در مجموعه اندازه‌های جدولی پیاده‌سازی‌شده نیست؛ "
                    "نگاشت خودکار به نزدیک‌ترین اندازه متوقف شد."
                ),
                "reference": "ACI PRC-211.1-22 aggregate-size lookup; G02A fail-closed domain policy",
            },
            "محاسبه پیش از lookup آب/هوا/حجم سنگدانه درشت متوقف شد تا nearest-value snapping پنهان رخ ندهد.",
            f"NMSA باید یکی از مقادیر پیاده‌سازی‌شده باشد: {allowed} mm؛ هر سیاست interpolation یا mapping دیگر نیازمند evidence و test مستقل است.",
        )

    provided_w_cm = requirements.get("w_cm_ratio")
    if provided_w_cm is not None:
        return None

    target = float(requirements.get("target_strength_mpa", 30) or 30)
    air_entrained = bool(requirements.get("air_entrained", False))
    lower, upper = AIR_STRENGTH_RANGE_MPA if air_entrained else NON_AIR_STRENGTH_RANGE_MPA
    if lower <= target <= upper:
        return None

    return _normal_mix_fail(
        "w_cm_ratio_required_outside_strength_lookup",
        {
            "code": "W_CM_EXPLICIT_REQUIRED_OUTSIDE_STRENGTH_LOOKUP",
            "severity": "fail",
            "message": (
                f"مقاومت هدف {target:g} MPa خارج از بازه lookup مقاومت‌محور فعلی "
                f"({lower:g} تا {upper:g} MPa) است. برای ادامه، w/cm پروژه/دوام باید صریحاً تعیین شود؛ "
                "نرم‌افزار برون‌یابی خودکار انجام نمی‌دهد."
            ),
            "reference": "ACI PRC-211.1-22 preliminary proportioning; project/durability w/cm governs",
        },
        "محاسبه پیش از تناسب اجزا متوقف شد تا از تولید w/cm برون‌یابی‌شده یا غیرقابل ردیابی جلوگیری شود.",
        "پس از تعیین w/cm حاکم باید طرح مجدداً محاسبه و با Trial Mix تایید شود.",
    )


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"status": "fail", "error": "missing command"}, ensure_ascii=False))
        return 2

    command = sys.argv[1]
    payload = read_payload()

    if command == "health":
        response = {
            "status": "pass",
            "engine": "tolou-mix-engine",
            "version": __version__,
            "message": "Python engineering engine is ready.",
        }
    elif command == "calculate-normal-mix":
        response = validate_normal_mix_request(payload) or calculate_integrated_normal_mix(payload)
    elif command == "evaluate-durability":
        response = evaluate_durability(payload)
    else:
        response = {"status": "fail", "error": f"unknown command: {command}"}

    print(json.dumps(response, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
