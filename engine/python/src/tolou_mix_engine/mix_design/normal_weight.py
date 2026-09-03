from __future__ import annotations

ENGINE_VERSION = "0.3.0"
WATER_DENSITY_KG_M3 = 1000.0
DEFAULT_CEMENT_SPECIFIC_GRAVITY = 3.15

NMSA_MM = (9.5, 12.5, 19.0, 25.0, 37.5, 50.0, 75.0, 150.0)

# Reference lookup values used by the classic ACI 211.1 proportioning procedure.
# The engine preserves the selected row/column in assumptions for traceability and
# still requires trial-batch verification before a production mixture is accepted.
NON_AIR_WATER_KG_M3 = {
    "25_50": (207.0, 199.0, 190.0, 179.0, 166.0, 154.0, 130.0, 113.0),
    "75_100": (228.0, 216.0, 205.0, 193.0, 181.0, 169.0, 145.0, 124.0),
    "150_175": (243.0, 228.0, 216.0, 202.0, 190.0, 178.0, 160.0, 160.0),
}
AIR_ENTRAINED_WATER_KG_M3 = {
    "25_50": (181.0, 175.0, 168.0, 160.0, 150.0, 142.0, 122.0, 107.0),
    "75_100": (202.0, 193.0, 184.0, 175.0, 165.0, 157.0, 133.0, 119.0),
    "150_175": (216.0, 205.0, 197.0, 184.0, 174.0, 166.0, 154.0, 154.0),
}
ENTRAPPED_AIR_PERCENT = (3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.3, 0.2)

# Volume of dry-rodded coarse aggregate per unit volume of concrete.
# Columns are fine-aggregate FM 2.4, 2.6, 2.8, 3.0.
COARSE_BULK_VOLUME = {
    9.5: (0.50, 0.48, 0.46, 0.44),
    12.5: (0.59, 0.57, 0.55, 0.53),
    19.0: (0.66, 0.64, 0.62, 0.60),
    25.0: (0.71, 0.69, 0.67, 0.65),
    37.5: (0.75, 0.73, 0.71, 0.69),
    50.0: (0.78, 0.76, 0.74, 0.72),
    75.0: (0.82, 0.80, 0.78, 0.76),
    150.0: (0.87, 0.85, 0.83, 0.81),
}
FM_COLUMNS = (2.4, 2.6, 2.8, 3.0)

# Approximate strength-based w/cm relationship used for preliminary proportioning.
# Durability/project limits must be applied separately and the governing lower value used.
NON_AIR_STRENGTH_W_CM = ((15.0, 0.79), (20.0, 0.69), (25.0, 0.61), (30.0, 0.54), (35.0, 0.47), (40.0, 0.42))
AIR_STRENGTH_W_CM = ((15.0, 0.70), (20.0, 0.60), (25.0, 0.52), (30.0, 0.45), (35.0, 0.39))


def calculate_normal_weight_mix(payload: dict) -> dict:
    requirements = payload.get("requirements", {}) if isinstance(payload, dict) else {}
    materials = payload.get("materials", {}) if isinstance(payload, dict) else {}
    options = payload.get("calculation_options", {}) if isinstance(payload, dict) else {}

    target_strength_mpa = positive_float(requirements.get("target_strength_mpa", 30), "target_strength_mpa")
    slump_mm = nonnegative_float(requirements.get("slump_mm", 100), "slump_mm")
    max_aggregate_size_mm = positive_float(requirements.get("max_aggregate_size_mm", 19), "max_aggregate_size_mm")
    air_entrained = bool(requirements.get("air_entrained", False))

    selected_nmsa = nearest_value(max_aggregate_size_mm, NMSA_MM)
    water_kg_m3, water_band = estimate_mixing_water(slump_mm, selected_nmsa, air_entrained)
    default_air = estimate_air_content(selected_nmsa, air_entrained)
    air_content_percent = nonnegative_float(requirements.get("air_content_percent", default_air), "air_content_percent")

    suggested_strength_w_cm = estimate_strength_w_cm(target_strength_mpa, air_entrained)
    provided_w_cm = requirements.get("w_cm_ratio")
    if provided_w_cm is None:
        w_cm_ratio = suggested_strength_w_cm
        w_cm_source = "strength_lookup"
    else:
        w_cm_ratio = positive_float(provided_w_cm, "w_cm_ratio")
        w_cm_source = "project_input"

    cement_specific_gravity = positive_float(
        materials.get("cement_specific_gravity", DEFAULT_CEMENT_SPECIFIC_GRAVITY),
        "cement_specific_gravity",
    )
    cementitious_kg_m3 = round(water_kg_m3 / w_cm_ratio, 1)

    warnings: list[dict] = []
    warnings.extend(validate_design_inputs(slump_mm, max_aggregate_size_mm, selected_nmsa, w_cm_ratio, air_content_percent))

    if suggested_strength_w_cm is not None and w_cm_ratio > suggested_strength_w_cm + 1e-9:
        warnings.append(
            {
                "code": "W_CM_ABOVE_STRENGTH_GUIDE",
                "severity": "warning",
                "message": (
                    f"w/cm واردشده ({w_cm_ratio:.3f}) از مقدار تقریبی مبتنی بر مقاومت "
                    f"({suggested_strength_w_cm:.3f}) بزرگ‌تر است. مقاومت و دوام باید با بچ آزمایشی کنترل شود."
                ),
                "reference": "ACI PRC-211.1 proportioning procedure",
            }
        )

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
                "message": "این مقاومت باید با روش و الزامات بتن پرمقاومت و بچ‌های آزمایشی ویژه بازبینی شود.",
                "reference": "ACI 211 high-strength concrete guidance",
            }
        )

    aggregates = materials.get("aggregates", [])
    blend_shares = materials.get("aggregate_blend_shares", [])
    proportioning_mode = str(options.get("aggregate_proportioning_mode") or "manual_absolute_volume")

    if proportioning_mode == "aci_coarse_volume":
        aggregate_result = allocate_aggregates_aci_coarse_volume(
            aggregates,
            blend_shares,
            water_kg_m3,
            cementitious_kg_m3,
            cement_specific_gravity,
            air_content_percent,
            selected_nmsa,
        )
    else:
        aggregate_result = allocate_aggregates_by_absolute_volume(
            aggregates,
            blend_shares,
            water_kg_m3,
            cementitious_kg_m3,
            cement_specific_gravity,
            air_content_percent,
        )

    warnings.extend(aggregate_result["warnings"])

    severity_rank = {"needs_review": 1, "warning": 2, "fail": 3}
    max_rank = max((severity_rank.get(str(item.get("severity")), 0) for item in warnings), default=0)
    status = "fail" if max_rank >= 3 else "warning" if max_rank >= 2 else "needs_review"

    return {
        "status": status,
        "engine_version": ENGINE_VERSION,
        "calculation_method": "aci_211_1_absolute_volume_with_coarse_volume_option",
        "mix_proportions": {
            "water_kg_m3": water_kg_m3,
            "cementitious_kg_m3": cementitious_kg_m3,
            "w_cm_ratio": round(w_cm_ratio, 3),
            "strength_based_w_cm_ratio": round(suggested_strength_w_cm, 3) if suggested_strength_w_cm is not None else None,
            "fine_aggregate_kg_m3": aggregate_result["fine_aggregate_kg_m3"],
            "coarse_aggregate_kg_m3": aggregate_result["coarse_aggregate_kg_m3"],
            "aggregate_ssd_kg_m3": aggregate_result["aggregate_ssd_kg_m3"],
            "aggregate_batch_kg_m3": aggregate_result["aggregate_batch_kg_m3"],
            "batch_water_adjustment_kg_m3": aggregate_result["batch_water_adjustment_kg_m3"],
            "water_to_add_kg_m3": (
                round(water_kg_m3 - aggregate_result["batch_water_adjustment_kg_m3"], 1)
                if aggregate_result["batch_water_adjustment_kg_m3"] is not None
                else None
            ),
            "air_content_percent": air_content_percent,
        },
        "aggregate_analysis": aggregate_result["aggregate_analysis"],
        "aggregate_proportioning": aggregate_result.get("proportioning_metadata", {}),
        "engineering_notes": [
            "آب اختلاط از جدول مرجع ACI 211.1 بر اساس اسلامپ، NMSA و وضعیت هوازایی انتخاب شده است.",
            "w/cm مقاومت‌محور فقط مقدار اولیه است؛ حد دوام/مشخصات پروژه باید جداگانه اعمال و مقدار حاکم انتخاب شود.",
            "در حالت ACI coarse-volume، حجم سنگدانه درشت از NMSA و FM ماسه تعیین و ماسه از موازنه حجم مطلق محاسبه می‌شود.",
            "جرم بچینگ و اصلاح آب بر مبنای تبدیل صحیح OD → SSD → wet batch محاسبه شده است.",
        ],
        "warnings": warnings,
        "standard_references": [
            "ACI PRC-211.1-22 - Selecting Proportions for Normal-Density and High-Density Concrete",
            "ACI 318 - Exposure categories and durability requirements",
            "ACI 301 - Specifications for Concrete Construction",
            "ASTM C29/C29M - Bulk density (unit weight) and voids in aggregate",
            "ASTM C127 / ASTM C128 - Aggregate relative density and absorption",
            "ASTM C33 / ASTM C136/C136M - Aggregate grading and sieve analysis",
        ],
        "assumptions": [
            f"target_strength_mpa={target_strength_mpa}",
            f"slump_mm={slump_mm}",
            f"requested_max_aggregate_size_mm={max_aggregate_size_mm}",
            f"lookup_nmsa_mm={selected_nmsa}",
            f"mixing_water_lookup_band={water_band}",
            f"air_entrained={air_entrained}",
            f"air_content_percent={air_content_percent}",
            f"w_cm_source={w_cm_source}",
            f"cement_specific_gravity={cement_specific_gravity}",
            f"aggregate_proportioning_mode={proportioning_mode}",
        ],
        "limitations": [
            "این خروجی باید با بچ آزمایشی، اصلاح رطوبت روز تولید، چگالی واقعی و مقاومت‌های آزمایشگاهی تایید شود.",
            "کنترل کامل دوام و انتخاب w/cm حاکم بر اساس کلاس مواجهه هنوز ماژول مستقل بعدی است.",
            "Dry-rodded unit weight سنگدانه درشت باید مطابق روش آزمایش معتبر وارد شود؛ unit weight نامشخص برای روش ACI کافی نیست.",
        ],
    }


def estimate_mixing_water(slump_mm: float, nmsa_mm: float, air_entrained: bool) -> tuple[float, str]:
    if slump_mm <= 50:
        band = "25_50"
    elif slump_mm <= 100:
        band = "75_100"
    else:
        band = "150_175"

    table = AIR_ENTRAINED_WATER_KG_M3 if air_entrained else NON_AIR_WATER_KG_M3
    index = NMSA_MM.index(nearest_value(nmsa_mm, NMSA_MM))
    return table[band][index], band


def estimate_air_content(nmsa_mm: float, air_entrained: bool) -> float:
    index = NMSA_MM.index(nearest_value(nmsa_mm, NMSA_MM))
    if air_entrained:
        # Moderate-exposure default is intentionally not assumed here; explicit exposure
        # classification belongs in the durability module. A conservative placeholder is used.
        return (6.0, 5.5, 5.0, 4.5, 4.5, 4.0, 3.5, 3.0)[index]
    return ENTRAPPED_AIR_PERCENT[index]


def estimate_strength_w_cm(target_strength_mpa: float, air_entrained: bool) -> float | None:
    table = AIR_STRENGTH_W_CM if air_entrained else NON_AIR_STRENGTH_W_CM
    if target_strength_mpa < table[0][0] or target_strength_mpa > table[-1][0]:
        return None
    for index in range(len(table) - 1):
        f1, r1 = table[index]
        f2, r2 = table[index + 1]
        if f1 <= target_strength_mpa <= f2:
            fraction = (target_strength_mpa - f1) / (f2 - f1)
            return r1 + fraction * (r2 - r1)
    return table[-1][1]


def validate_design_inputs(
    slump_mm: float,
    requested_nmsa: float,
    selected_nmsa: float,
    w_cm_ratio: float,
    air_content_percent: float,
) -> list[dict]:
    warnings: list[dict] = []
    if slump_mm < 25 or slump_mm > 175:
        warnings.append(
            {
                "code": "SLUMP_OUTSIDE_LOOKUP_RANGE",
                "severity": "needs_review",
                "message": "اسلامپ خارج از بازه جداول پایه 25 تا 175 میلی‌متر است؛ مقدار آب فقط بر اساس نزدیک‌ترین بازه برآورد شده است.",
                "reference": "ACI PRC-211.1 mixing-water selection",
            }
        )
    if abs(requested_nmsa - selected_nmsa) > 0.01:
        warnings.append(
            {
                "code": "NMSA_LOOKUP_SNAPPED",
                "severity": "needs_review",
                "message": f"NMSA واردشده {requested_nmsa:g} mm به نزدیک‌ترین اندازه جدولی {selected_nmsa:g} mm نگاشت شد.",
                "reference": "ACI PRC-211.1 aggregate-size lookup",
            }
        )
    if not 0.25 <= w_cm_ratio <= 0.90:
        warnings.append(
            {
                "code": "W_CM_OUTSIDE_TYPICAL_RANGE",
                "severity": "warning",
                "message": "w/cm خارج از محدوده معمول طراحی اولیه است و باید بازبینی شود.",
                "reference": "Engineering input validation",
            }
        )
    if air_content_percent > 12:
        warnings.append(
            {
                "code": "AIR_CONTENT_HIGH",
                "severity": "warning",
                "message": "درصد هوای واردشده بسیار بالا است و باید صحت داده بررسی شود.",
                "reference": "Engineering input validation",
            }
        )
    return warnings


def allocate_aggregates_aci_coarse_volume(
    aggregates: list[dict],
    blend_shares: list[dict],
    water_kg_m3: float,
    cementitious_kg_m3: float,
    cement_specific_gravity: float,
    air_content_percent: float,
    nmsa_mm: float,
) -> dict:
    warnings: list[dict] = []
    fine = [item for item in aggregates if item.get("material_type") == "fine_aggregate"]
    coarse = [item for item in aggregates if item.get("material_type") == "coarse_aggregate"]
    if not fine or not coarse:
        warnings.append(
            {
                "code": "ACI_AGGREGATE_CATEGORIES_MISSING",
                "severity": "needs_review",
                "message": "برای روش ACI باید حداقل یک سنگدانه ریز و یک سنگدانه درشت موجود باشد؛ روش سهم دستی جایگزین شد.",
                "reference": "ACI PRC-211.1 aggregate proportioning",
            }
        )
        result = allocate_aggregates_by_absolute_volume(
            aggregates,
            blend_shares,
            water_kg_m3,
            cementitious_kg_m3,
            cement_specific_gravity,
            air_content_percent,
        )
        result["warnings"] = warnings + result["warnings"]
        return result

    fine_weights = normalized_category_weights(fine, blend_shares)
    coarse_weights = normalized_category_weights(coarse, blend_shares)
    fine_fm = weighted_material_property(fine, fine_weights, "fineness_modulus")
    coarse_unit_weight = weighted_material_property(coarse, coarse_weights, "unit_weight_kg_m3")

    if fine_fm is None or not 2.4 <= fine_fm <= 3.0:
        warnings.append(
            {
                "code": "FINE_AGGREGATE_FM_REQUIRED",
                "severity": "needs_review",
                "message": "FM معتبر ماسه در بازه 2.4 تا 3.0 برای انتخاب حجم سنگدانه درشت ACI موجود نیست؛ روش سهم دستی جایگزین شد.",
                "reference": "ACI PRC-211.1 coarse aggregate bulk-volume selection",
            }
        )
        result = allocate_aggregates_by_absolute_volume(
            aggregates,
            blend_shares,
            water_kg_m3,
            cementitious_kg_m3,
            cement_specific_gravity,
            air_content_percent,
        )
        result["warnings"] = warnings + result["warnings"]
        return result

    if coarse_unit_weight is None or coarse_unit_weight <= 0:
        warnings.append(
            {
                "code": "COARSE_DRY_RODDED_UNIT_WEIGHT_REQUIRED",
                "severity": "needs_review",
                "message": "وزن واحد خشک‌میله‌خورده سنگدانه درشت برای روش ACI موجود نیست؛ روش سهم دستی جایگزین شد.",
                "reference": "ASTM C29/C29M / ACI PRC-211.1",
            }
        )
        result = allocate_aggregates_by_absolute_volume(
            aggregates,
            blend_shares,
            water_kg_m3,
            cementitious_kg_m3,
            cement_specific_gravity,
            air_content_percent,
        )
        result["warnings"] = warnings + result["warnings"]
        return result

    coarse_bulk_fraction = interpolate_coarse_bulk_volume(nmsa_mm, fine_fm)
    if coarse_bulk_fraction is None:
        warnings.append(
            {
                "code": "ACI_COARSE_VOLUME_LOOKUP_FAILED",
                "severity": "fail",
                "message": "حجم مرجع سنگدانه درشت برای NMSA/FM محاسبه نشد.",
                "reference": "ACI PRC-211.1 coarse aggregate bulk-volume selection",
            }
        )
        return empty_aggregate_result(warnings)

    aggregate_analysis: list[dict] = []
    coarse_ssd_total = 0.0
    coarse_batch_total = 0.0
    water_adjustment_total = 0.0
    coarse_absolute_volume = 0.0

    for material in coarse:
        fraction = coarse_weights[str(material.get("id"))]
        dry_rodded_unit_weight = float(material.get("unit_weight_kg_m3") or coarse_unit_weight)
        od_mass = coarse_bulk_fraction * fraction * dry_rodded_unit_weight
        converted = moisture_state_from_od(material, od_mass)
        coarse_ssd_total += converted["ssd_mass"]
        coarse_batch_total += converted["batch_mass"]
        water_adjustment_total += converted["water_adjustment"]
        coarse_absolute_volume += converted["ssd_mass"] / (
            converted["specific_gravity"] * WATER_DENSITY_KG_M3
        )
        aggregate_analysis.append(build_analysis_row(material, fraction, converted, "aci_coarse_bulk_volume"))

    water_volume = water_kg_m3 / WATER_DENSITY_KG_M3
    cement_volume = cementitious_kg_m3 / (cement_specific_gravity * WATER_DENSITY_KG_M3)
    air_volume = air_content_percent / 100.0
    fine_absolute_volume = 1.0 - water_volume - cement_volume - air_volume - coarse_absolute_volume
    if fine_absolute_volume <= 0:
        warnings.append(
            {
                "code": "NO_FINE_AGGREGATE_VOLUME",
                "severity": "fail",
                "message": "پس از تخصیص سنگدانه درشت، حجم مثبتی برای سنگدانه ریز باقی نمانده است.",
                "reference": "ACI PRC-211.1 absolute volume method",
            }
        )
        return empty_aggregate_result(warnings)

    fine_ssd_total = 0.0
    fine_batch_total = 0.0
    for material in fine:
        fraction = fine_weights[str(material.get("id"))]
        specific_gravity = positive_material_property(material, "specific_gravity")
        if specific_gravity is None:
            warnings.append(missing_sg_warning(material))
            continue
        ssd_mass = fine_absolute_volume * fraction * specific_gravity * WATER_DENSITY_KG_M3
        converted = moisture_state_from_ssd(material, ssd_mass)
        fine_ssd_total += converted["ssd_mass"]
        fine_batch_total += converted["batch_mass"]
        water_adjustment_total += converted["water_adjustment"]
        aggregate_analysis.append(build_analysis_row(material, fraction, converted, "aci_fine_absolute_volume"))

    if fine_ssd_total <= 0:
        warnings.append(
            {
                "code": "FINE_AGGREGATE_CALCULATION_INCOMPLETE",
                "severity": "fail",
                "message": "جرم ماسه محاسبه نشد؛ وزن مخصوص سنگدانه ریز و داده‌های مصالح را کنترل کنید.",
                "reference": "ACI PRC-211.1 absolute volume method",
            }
        )
        return empty_aggregate_result(warnings)

    return {
        "fine_aggregate_kg_m3": round(fine_ssd_total, 1),
        "coarse_aggregate_kg_m3": round(coarse_ssd_total, 1),
        "aggregate_ssd_kg_m3": round(fine_ssd_total + coarse_ssd_total, 1),
        "aggregate_batch_kg_m3": round(fine_batch_total + coarse_batch_total, 1),
        "batch_water_adjustment_kg_m3": round(water_adjustment_total, 1),
        "aggregate_analysis": aggregate_analysis,
        "warnings": warnings,
        "proportioning_metadata": {
            "method": "aci_coarse_bulk_volume_plus_absolute_volume_fine",
            "fine_aggregate_fineness_modulus": round(fine_fm, 3),
            "coarse_dry_rodded_unit_weight_kg_m3": round(coarse_unit_weight, 1),
            "coarse_bulk_volume_fraction": round(coarse_bulk_fraction, 3),
            "fine_absolute_volume_m3_m3": round(fine_absolute_volume, 4),
        },
    }


def allocate_aggregates_by_absolute_volume(
    aggregates: list[dict],
    blend_shares: list[dict],
    water_kg_m3: float,
    cementitious_kg_m3: float,
    cement_specific_gravity: float,
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
                "reference": "ACI PRC-211.1 absolute volume method",
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
                "reference": "ACI PRC-211.1 absolute volume method",
            }
        )
        return empty_aggregate_result(warnings)

    water_volume = water_kg_m3 / WATER_DENSITY_KG_M3
    cement_volume = cementitious_kg_m3 / (cement_specific_gravity * WATER_DENSITY_KG_M3)
    air_volume = air_content_percent / 100.0
    available_aggregate_volume = 1.0 - water_volume - cement_volume - air_volume

    if available_aggregate_volume <= 0:
        warnings.append(
            {
                "code": "NO_AGGREGATE_VOLUME",
                "severity": "fail",
                "message": "حجم باقی‌مانده برای سنگدانه منفی یا صفر شده است؛ ورودی‌های آب، سیمان یا هوا باید بازبینی شوند.",
                "reference": "ACI PRC-211.1 absolute volume method",
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

        specific_gravity = positive_material_property(material, "specific_gravity")
        if specific_gravity is None:
            warnings.append(missing_sg_warning(material))
            continue

        share_fraction = float(share.get("share_percent", 0) or 0) / 100.0
        aggregate_volume = available_aggregate_volume * share_fraction
        ssd_mass = aggregate_volume * specific_gravity * WATER_DENSITY_KG_M3
        converted = moisture_state_from_ssd(material, ssd_mass)

        material_type = material.get("material_type")
        if material_type == "fine_aggregate":
            fine_total += converted["ssd_mass"]
        elif material_type == "coarse_aggregate":
            coarse_total += converted["ssd_mass"]

        aggregate_ssd_total += converted["ssd_mass"]
        aggregate_batch_total += converted["batch_mass"]
        batch_water_adjustment += converted["water_adjustment"]
        aggregate_analysis.append(build_analysis_row(material, share_fraction, converted, "manual_absolute_volume"))

    return {
        "fine_aggregate_kg_m3": round(fine_total, 1) if fine_total else None,
        "coarse_aggregate_kg_m3": round(coarse_total, 1) if coarse_total else None,
        "aggregate_ssd_kg_m3": round(aggregate_ssd_total, 1) if aggregate_ssd_total else None,
        "aggregate_batch_kg_m3": round(aggregate_batch_total, 1) if aggregate_batch_total else None,
        "batch_water_adjustment_kg_m3": round(batch_water_adjustment, 1) if aggregate_analysis else None,
        "aggregate_analysis": aggregate_analysis,
        "warnings": warnings,
        "proportioning_metadata": {"method": "manual_absolute_volume_shares"},
    }


def moisture_state_from_ssd(material: dict, ssd_mass: float) -> dict:
    absorption = nonnegative_float(material.get("absorption_percent", 0), "absorption_percent")
    moisture = nonnegative_float(material.get("moisture_percent", 0), "moisture_percent")
    specific_gravity = positive_float(material.get("specific_gravity"), "specific_gravity")
    od_mass = ssd_mass / (1.0 + absorption / 100.0)
    batch_mass = od_mass * (1.0 + moisture / 100.0)
    water_adjustment = od_mass * (moisture - absorption) / 100.0
    return {
        "od_mass": od_mass,
        "ssd_mass": ssd_mass,
        "batch_mass": batch_mass,
        "water_adjustment": water_adjustment,
        "absorption": absorption,
        "moisture": moisture,
        "specific_gravity": specific_gravity,
    }


def moisture_state_from_od(material: dict, od_mass: float) -> dict:
    absorption = nonnegative_float(material.get("absorption_percent", 0), "absorption_percent")
    moisture = nonnegative_float(material.get("moisture_percent", 0), "moisture_percent")
    specific_gravity = positive_float(material.get("specific_gravity"), "specific_gravity")
    ssd_mass = od_mass * (1.0 + absorption / 100.0)
    batch_mass = od_mass * (1.0 + moisture / 100.0)
    water_adjustment = od_mass * (moisture - absorption) / 100.0
    return {
        "od_mass": od_mass,
        "ssd_mass": ssd_mass,
        "batch_mass": batch_mass,
        "water_adjustment": water_adjustment,
        "absorption": absorption,
        "moisture": moisture,
        "specific_gravity": specific_gravity,
    }


def build_analysis_row(material: dict, fraction: float, converted: dict, method: str) -> dict:
    return {
        "material_id": material.get("id"),
        "material_name": material.get("name"),
        "material_type": material.get("material_type"),
        "share_percent": round(fraction * 100, 2),
        "specific_gravity_ssd": converted["specific_gravity"],
        "od_mass_kg_m3": round(converted["od_mass"], 1),
        "ssd_mass_kg_m3": round(converted["ssd_mass"], 1),
        "batch_mass_kg_m3": round(converted["batch_mass"], 1),
        "absorption_percent": converted["absorption"],
        "moisture_percent": converted["moisture"],
        "water_adjustment_kg_m3": round(converted["water_adjustment"], 1),
        "allocation_method": method,
    }


def normalized_category_weights(materials: list[dict], blend_shares: list[dict]) -> dict[str, float]:
    share_map = {str(item.get("material_id")): float(item.get("share_percent", 0) or 0) for item in blend_shares}
    raw = {str(item.get("id")): max(0.0, share_map.get(str(item.get("id")), 0.0)) for item in materials}
    total = sum(raw.values())
    if total <= 0:
        equal = 1.0 / len(materials)
        return {str(item.get("id")): equal for item in materials}
    return {key: value / total for key, value in raw.items()}


def weighted_material_property(materials: list[dict], weights: dict[str, float], key: str) -> float | None:
    values: list[tuple[float, float]] = []
    for material in materials:
        raw = material.get(key)
        if raw is None:
            return None
        value = float(raw)
        if value <= 0:
            return None
        values.append((weights[str(material.get("id"))], value))
    return sum(weight * value for weight, value in values)


def interpolate_coarse_bulk_volume(nmsa_mm: float, fineness_modulus: float) -> float | None:
    row = COARSE_BULK_VOLUME.get(nearest_value(nmsa_mm, tuple(COARSE_BULK_VOLUME.keys())))
    if row is None or fineness_modulus < FM_COLUMNS[0] or fineness_modulus > FM_COLUMNS[-1]:
        return None
    for index in range(len(FM_COLUMNS) - 1):
        fm1, fm2 = FM_COLUMNS[index], FM_COLUMNS[index + 1]
        if fm1 <= fineness_modulus <= fm2:
            fraction = (fineness_modulus - fm1) / (fm2 - fm1)
            return row[index] + fraction * (row[index + 1] - row[index])
    return row[-1]


def positive_material_property(material: dict, key: str) -> float | None:
    value = material.get(key)
    if value is None:
        return None
    number = float(value)
    return number if number > 0 else None


def missing_sg_warning(material: dict) -> dict:
    return {
        "code": "MISSING_AGGREGATE_SG",
        "severity": "needs_review",
        "message": f"وزن مخصوص SSD برای {material.get('name', 'سنگدانه')} معتبر نیست.",
        "reference": "ASTM C127 / ASTM C128",
    }


def nearest_value(value: float, candidates: tuple[float, ...]) -> float:
    return min(candidates, key=lambda item: abs(item - value))


def positive_float(value: object, name: str) -> float:
    number = float(value)
    if number <= 0:
        raise ValueError(f"{name} must be positive")
    return number


def nonnegative_float(value: object, name: str) -> float:
    number = float(value or 0)
    if number < 0:
        raise ValueError(f"{name} must be nonnegative")
    return number


def empty_aggregate_result(warnings: list[dict]) -> dict:
    return {
        "fine_aggregate_kg_m3": None,
        "coarse_aggregate_kg_m3": None,
        "aggregate_ssd_kg_m3": None,
        "aggregate_batch_kg_m3": None,
        "batch_water_adjustment_kg_m3": None,
        "aggregate_analysis": [],
        "warnings": warnings,
        "proportioning_metadata": {},
    }
