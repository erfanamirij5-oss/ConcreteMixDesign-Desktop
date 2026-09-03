from __future__ import annotations

ENGINE_VERSION = "0.1.0"


def calculate_normal_weight_mix(payload: dict) -> dict:
    """Initial ACI-style normal-weight concrete calculation skeleton.

    This is not yet a full ACI 211.1 implementation. It establishes the validated output
    structure, traceability fields, assumptions, and warning behavior that every future
    calculation must follow.
    """

    requirements = payload.get("requirements", {}) if isinstance(payload, dict) else {}
    target_strength_mpa = float(requirements.get("target_strength_mpa", 30))
    slump_mm = float(requirements.get("slump_mm", 100))
    max_aggregate_size_mm = float(requirements.get("max_aggregate_size_mm", 19))
    w_cm_ratio = float(requirements.get("w_cm_ratio", 0.45))

    water_kg_m3 = estimate_initial_water(slump_mm, max_aggregate_size_mm)
    cementitious_kg_m3 = round(water_kg_m3 / w_cm_ratio, 1)

    warnings: list[dict] = []
    if w_cm_ratio > 0.5:
        warnings.append(
            {
                "code": "HIGH_W_CM",
                "severity": "warning",
                "message": "نسبت آب به مواد سیمانی برای بسیاری از شرایط دوام بالا است و باید با کلاس مواجهه کنترل شود.",
                "reference": "ACI 318 / ACI 301 durability requirements",
            }
        )

    if target_strength_mpa >= 55:
        warnings.append(
            {
                "code": "HIGH_STRENGTH_SCOPE",
                "severity": "needs_review",
                "message": "این مقاومت وارد محدوده بتن پرمقاومت می‌شود و باید با ACI 211.4 و بچ آزمایشی کنترل شود.",
                "reference": "ACI 211.4R",
            }
        )

    return {
        "status": "warning" if warnings else "needs_review",
        "engine_version": ENGINE_VERSION,
        "calculation_method": "initial_aci_211_1_style_skeleton",
        "mix_proportions": {
            "water_kg_m3": water_kg_m3,
            "cementitious_kg_m3": cementitious_kg_m3,
            "w_cm_ratio": w_cm_ratio,
            "fine_aggregate_kg_m3": None,
            "coarse_aggregate_kg_m3": None,
            "air_content_percent": None,
        },
        "engineering_notes": [
            "این خروجی اسکلت اولیه موتور محاسبات است و هنوز جایگزین طراحی کامل ACI 211.1 نیست.",
            "در نسخه بعد، حجم مطلق، هوای بتن، حجم سنگدانه درشت، مدول نرمی ماسه و اصلاح رطوبت اضافه می‌شود.",
        ],
        "warnings": warnings,
        "standard_references": [
            "ACI 211.1 - Selecting Proportions for Normal, Heavyweight, and Mass Concrete",
            "ACI 318 - Exposure categories and durability requirements",
            "ACI 301 - Specifications for Concrete Construction",
        ],
        "assumptions": [
            f"target_strength_mpa={target_strength_mpa}",
            f"slump_mm={slump_mm}",
            f"max_aggregate_size_mm={max_aggregate_size_mm}",
            f"w_cm_ratio={w_cm_ratio}",
        ],
        "limitations": [
            "برای استفاده صنعتی، داده واقعی سیمان، سنگدانه، جذب آب، رطوبت، چگالی و آزمایش‌های تاییدی لازم است.",
            "کنترل نهایی باید توسط مهندس مسئول و الزامات پروژه تایید شود.",
        ],
    }


def estimate_initial_water(slump_mm: float, max_aggregate_size_mm: float) -> float:
    base = 190.0

    if max_aggregate_size_mm >= 25:
        base -= 10
    elif max_aggregate_size_mm <= 12.5:
        base += 12

    if slump_mm > 100:
        base += 8
    elif slump_mm < 50:
        base -= 8

    return round(base, 1)
