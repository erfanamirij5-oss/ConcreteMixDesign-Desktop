from __future__ import annotations

ENGINE_VERSION = "0.2.0"
WATER_DENSITY_KG_M3 = 1000.0
CEMENT_SPECIFIC_GRAVITY = 3.15


def calculate_normal_weight_mix(payload: dict) -> dict:
    """Initial ACI-style normal-weight concrete calculation skeleton.

    This is still not a full ACI 211.1 implementation. It now connects final
    aggregate blend shares to an absolute-volume allocation so the UI's aggregate
    decisions can be carried into mix quantities, moisture correction, and reports.
    """

    requirements = payload.get("requirements", {}) if isinstance(payload, dict) else {}
    materials = payload.get("materials", {}) if isinstance(payload, dict) else {}
    target_strength_mpa = float(requirements.get("target_strength_mpa", 30))
    slump_mm = float(requirements.get("slump_mm", 100))
    max_aggregate_size_mm = float(requirements.get("max_aggregate_size_mm", 19))
    w_cm_ratio = float(requirements.get("w_cm_ratio", 0.45))
    air_content_percent = float(requirements.get("air_content_percent", 2.0))

    water_kg_m3 = estimate_initial_water(slump_mm, max_aggregate_size_mm)
    cementitious_kg_m3 = round(water_kg_m3 / w_cm_ratio, 1)
    aggregate_result = allocate_aggregates_by_absolute_volume(
        materials.get("aggregates", []),
        materials.get("aggregate_blend_shares", []),
        water_kg_m3,
        cementitious_kg_m3,
        air_content_percent,
    )

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

    warnings.extend(aggregate_result["warnings"])
    status = "warning" if warnings else "needs_review"

    return {
        "status": status,
        "engine_version": ENGINE_VERSION,
        "calculation_method": "initial_aci_211_1_style_absolute_volume_skeleton",
        "mix_proportions": {
            "water_kg_m3": water_kg_m3,
            "cementitious_kg_m3": cementitious_kg_m3,
            "w_cm_ratio": w_cm_ratio,
            "fine_aggregate_kg_m3": aggregate_result["fine_aggregate_kg_m3"],
            "coarse_aggregate_kg_m3": aggregate_result["coarse_aggregate_kg_m3"],
            "aggregate_ssd_kg_m3": aggregate_result["aggregate_ssd_kg_m3"],
            "aggregate_batch_kg_m3": aggregate_result["aggregate_batch_kg_m3"],
            "batch_water_adjustment_kg_m3": aggregate_result["batch_water_adjustment_kg_m3"],
            "air_content_percent": air_content_percent,
        },
        "aggregate_analysis": aggregate_result["aggregate_analysis"],
        "engineering_notes": [
            "این خروجی هنوز جایگزین طراحی کامل ACI 211.1 نیست و باید با داده آزمایشگاهی و بچ آزمایشی کنترل شود.",
            "مقادیر سنگدانه فعلاً با حجم مطلق باقی‌مانده و سهم‌های نهایی کاربر یا پیشنهاد نرم‌افزار تقسیم می‌شود.",
            "در نسخه بعد، حجم سنگدانه درشت ACI بر اساس اندازه اسمی و مدول نرمی ماسه دقیق‌تر می‌شود.",
        ],
        "warnings": warnings,
        "standard_references": [
            "ACI 211.1 - Selecting Proportions for Normal, Heavyweight, and Mass Concrete",
            "ACI 318 - Exposure categories and durability requirements",
            "ACI 301 - Specifications for Concrete Construction",
            "ASTM C33 / ASTM C136 - Aggregate grading and sieve analysis",
        ],
        "assumptions": [
            f"target_strength_mpa={target_strength_mpa}",
            f"slump_mm={slump_mm}",
            f"max_aggregate_size_mm={max_aggregate_size_mm}",
            f"w_cm_ratio={w_cm_ratio}",
            f"air_content_percent={air_content_percent}",
            "cement_specific_gravity=3.15 unless provided in later material model",
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


def allocate_aggregates_by_absolute_volume(
    aggregates: list[dict],
    blend_shares: list[dict],
    water_kg_m3: float,
    cementitious_kg_m3: float,
    air_content_percent: float,
) -> dict:
    warnings: list[dict] = []
    aggregate_analysis: list[dict] = []
    aggregate_by_id = {str(item.get("id")): item for item in aggregates if item.get("id")}
    usable_shares = [share for share in blend_shares if float(share.get("share_percent", 0) or 0) > 0]

    if not aggregate_by_id or not usable_shares:
        warnings.append(
            {
                "code": "MISSING_AGGREGATE_BLEND",
                "severity": "needs_review",
                "message": "سهم نهایی سنگدانه‌ها به موتور محاسبات نرسیده است؛ مقدار سنگدانه قابل اتکا نیست.",
                "reference": "ACI 211.1 absolute volume method",
            }
        )
        return empty_aggregate_result(warnings)

    total_share = sum(float(share.get("share_percent", 0) or 0) for share in usable_shares)
    if abs(total_share - 100) > 0.01:
        warnings.append(
            {
                "code": "AGGREGATE_SHARE_NOT_100",
                "severity": "fail",
                "message": f"جمع سهم سنگدانه‌ها {round(total_share, 2)} درصد است و باید 100 درصد باشد.",
                "reference": "ACI 211.1 absolute volume method",
            }
        )
        return empty_aggregate_result(warnings)

    water_volume = water_kg_m3 / WATER_DENSITY_KG_M3
    cement_volume = cementitious_kg_m3 / (CEMENT_SPECIFIC_GRAVITY * WATER_DENSITY_KG_M3)
    air_volume = air_content_percent / 100.0
    available_aggregate_volume = 1.0 - water_volume - cement_volume - air_volume

    if available_aggregate_volume <= 0:
        warnings.append(
            {
                "code": "NO_AGGREGATE_VOLUME",
                "severity": "fail",
                "message": "حجم باقی‌مانده برای سنگدانه منفی یا صفر شده است؛ ورودی‌های آب، سیمان یا هوا باید بازبینی شوند.",
                "reference": "ACI 211.1 absolute volume method",
            }
        )
        return empty_aggregate_result(warnings)

    fine_total = 0.0
    coarse_total = 0.0
    aggregate_ssd_total = 0.0
    aggregate_batch_total = 0.0
    batch_water_adjustment = 0.0

    for share in usable_shares:
        material = aggregate_by_id.get(str(share.get("material_id")))
        if not material:
            warnings.append(
                {
                    "code": "AGGREGATE_MATERIAL_NOT_FOUND",
                    "severity": "warning",
                    "message": f"مصالح با شناسه {share.get('material_id')} در فهرست سنگدانه‌ها پیدا نشد.",
                    "reference": "Material traceability requirement",
                }
            )
            continue

        specific_gravity = float(material.get("specific_gravity") or 0)
        if specific_gravity <= 0:
            warnings.append(
                {
                    "code": "MISSING_AGGREGATE_SG",
                    "severity": "needs_review",
                    "message": f"وزن مخصوص SSD برای {material.get('name', 'سنگدانه')} معتبر نیست.",
                    "reference": "ASTM C127 / ASTM C128",
                }
            )
            continue

        share_fraction = float(share.get("share_percent", 0) or 0) / 100.0
        aggregate_volume = available_aggregate_volume * share_fraction
        ssd_mass = aggregate_volume * specific_gravity * WATER_DENSITY_KG_M3
        absorption = float(material.get("absorption_percent") or 0)
        moisture = float(material.get("moisture_percent") or 0)
        batch_mass = ssd_mass * (1 + moisture / 100.0)
        water_adjustment = ssd_mass * (moisture - absorption) / 100.0

        material_type = material.get("material_type")
        if material_type == "fine_aggregate":
            fine_total += ssd_mass
        elif material_type == "coarse_aggregate":
            coarse_total += ssd_mass

        aggregate_ssd_total += ssd_mass
        aggregate_batch_total += batch_mass
        batch_water_adjustment += water_adjustment
        aggregate_analysis.append(
            {
                "material_id": material.get("id"),
                "material_name": material.get("name"),
                "material_type": material_type,
                "share_percent": round(share_fraction * 100, 2),
                "specific_gravity_ssd": specific_gravity,
                "ssd_mass_kg_m3": round(ssd_mass, 1),
                "batch_mass_kg_m3": round(batch_mass, 1),
                "absorption_percent": absorption,
                "moisture_percent": moisture,
                "water_adjustment_kg_m3": round(water_adjustment, 1),
            }
        )

    return {
        "fine_aggregate_kg_m3": round(fine_total, 1) if fine_total else None,
        "coarse_aggregate_kg_m3": round(coarse_total, 1) if coarse_total else None,
        "aggregate_ssd_kg_m3": round(aggregate_ssd_total, 1) if aggregate_ssd_total else None,
        "aggregate_batch_kg_m3": round(aggregate_batch_total, 1) if aggregate_batch_total else None,
        "batch_water_adjustment_kg_m3": round(batch_water_adjustment, 1) if aggregate_analysis else None,
        "aggregate_analysis": aggregate_analysis,
        "warnings": warnings,
    }


def empty_aggregate_result(warnings: list[dict]) -> dict:
    return {
        "fine_aggregate_kg_m3": None,
        "coarse_aggregate_kg_m3": None,
        "aggregate_ssd_kg_m3": None,
        "aggregate_batch_kg_m3": None,
        "batch_water_adjustment_kg_m3": None,
        "aggregate_analysis": [],
        "warnings": warnings,
    }
