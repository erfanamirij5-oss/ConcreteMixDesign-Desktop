from __future__ import annotations

import json
import sys

from tolou_mix_engine import __version__
from tolou_mix_engine.aci318_verification import aci318_verification_envelope
from tolou_mix_engine.durability import evaluate_durability
from tolou_mix_engine.integrated_design import calculate_integrated_normal_mix

NON_AIR_STRENGTH_RANGE_MPA = (15.0, 40.0)
AIR_STRENGTH_RANGE_MPA = (15.0, 35.0)


def read_payload() -> dict:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def validate_normal_mix_request(payload: dict) -> dict | None:
    """Reject unresolved strength-only w/cm requests before numerical proportioning.

    The preliminary ACI-style strength lookup in the current normal-weight engine is bounded.
    Outside that range the engine must not extrapolate or allow None to enter arithmetic. An
    explicit project/durability w/cm is therefore required before proportioning can continue.
    """
    requirements = payload.get("requirements", {}) if isinstance(payload, dict) else {}
    provided_w_cm = requirements.get("w_cm_ratio")
    if provided_w_cm is not None:
        return None

    target = float(requirements.get("target_strength_mpa", 30) or 30)
    air_entrained = bool(requirements.get("air_entrained", False))
    lower, upper = AIR_STRENGTH_RANGE_MPA if air_entrained else NON_AIR_STRENGTH_RANGE_MPA
    if lower <= target <= upper:
        return None

    return {
        "status": "fail",
        "engine": "tolou-mix-engine",
        "engine_version": __version__,
        "error": "w_cm_ratio_required_outside_strength_lookup",
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
        "warnings": [
            {
                "code": "W_CM_EXPLICIT_REQUIRED_OUTSIDE_STRENGTH_LOOKUP",
                "severity": "fail",
                "message": (
                    f"مقاومت هدف {target:g} MPa خارج از بازه lookup مقاومت‌محور فعلی "
                    f"({lower:g} تا {upper:g} MPa) است. برای ادامه، w/cm پروژه/دوام باید صریحاً تعیین شود؛ "
                    "نرم‌افزار برون‌یابی خودکار انجام نمی‌دهد."
                ),
                "reference": "ACI PRC-211.1-22 preliminary proportioning; project/durability w/cm governs",
            }
        ],
        "engineering_notes": [
            "محاسبه پیش از تناسب اجزا متوقف شد تا از تولید w/cm برون‌یابی‌شده یا غیرقابل ردیابی جلوگیری شود."
        ],
        "standard_references": [
            "ACI PRC-211.1-22 - Selecting Proportions for Normal-Density and High-Density Concrete",
            "ACI CODE-318-25 - Durability requirements where applicable",
        ],
        "limitations": [
            "پس از تعیین w/cm حاکم باید طرح مجدداً محاسبه و با Trial Mix تایید شود."
        ],
    }


def _attach_aci318_traceability(response: dict) -> dict:
    response["aci318_verification"] = aci318_verification_envelope()
    return response


def calculate_normal_mix_response(payload: dict) -> dict:
    response = validate_normal_mix_request(payload) or calculate_integrated_normal_mix(payload)
    return _attach_aci318_traceability(response)


def evaluate_durability_response(payload: dict) -> dict:
    return _attach_aci318_traceability(evaluate_durability(payload))


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
        response = calculate_normal_mix_response(payload)
    elif command == "evaluate-durability":
        response = evaluate_durability_response(payload)
    else:
        response = {"status": "fail", "error": f"unknown command: {command}"}

    print(json.dumps(response, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
