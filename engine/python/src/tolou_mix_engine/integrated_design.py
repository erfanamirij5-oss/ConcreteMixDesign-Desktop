from __future__ import annotations

from copy import deepcopy

from tolou_mix_engine.admixtures import apply_admixtures
from tolou_mix_engine.cementitious import allocate_cementitious
from tolou_mix_engine.durability import evaluate_durability
from tolou_mix_engine.mix_design.normal_weight import calculate_normal_weight_mix


def calculate_integrated_normal_mix(payload: dict) -> dict:
    """Run durability, binder allocation, ACI proportioning and admixture corrections."""
    source = deepcopy(payload if isinstance(payload, dict) else {})
    requirements = source.setdefault("requirements", {})
    materials = source.setdefault("materials", {})
    options = source.setdefault("calculation_options", {})
    durability_conditions = source.get("durability_conditions") or {}
    max_aggregate_size_mm = float(requirements.get("max_aggregate_size_mm", 19) or 19)

    durability = evaluate_durability({"conditions": durability_conditions, "max_aggregate_size_mm": max_aggregate_size_mm})
    governing = durability.get("governing_requirements", {})
    durability_max_w_cm = governing.get("max_w_cm")
    durability_target_air = governing.get("target_air_percent")
    durability_min_strength_mpa = governing.get("min_strength_mpa")

    original_w_cm = requirements.get("w_cm_ratio")
    if durability_max_w_cm is not None:
        requirements["w_cm_ratio"] = durability_max_w_cm if original_w_cm is None else min(float(original_w_cm), float(durability_max_w_cm))
    if durability_target_air is not None:
        requirements["air_entrained"] = True
        requirements["air_content_percent"] = float(durability_target_air)

    binder_preview = allocate_cementitious(list(materials.get("cementitious") or []), 100.0)
    materials["cement_specific_gravity"] = binder_preview["weighted_specific_gravity"]

    result = calculate_normal_weight_mix(source)
    warnings = list(result.get("warnings", []))
    warnings.extend(durability.get("warnings", []))

    mix = result.setdefault("mix_proportions", {})
    cementitious_total = float(mix.get("cementitious_kg_m3") or 0)
    binder = allocate_cementitious(list(materials.get("cementitious") or []), cementitious_total)
    warnings.extend(binder.get("warnings", []))

    admixture_system = apply_admixtures(
        result,
        list(materials.get("admixtures") or []),
        cementitious_total,
        str(options.get("aggregate_proportioning_mode") or "manual_absolute_volume"),
    )
    warnings.extend(admixture_system.get("warnings", []))

    target_strength_mpa = float(requirements.get("target_strength_mpa", 0) or 0)
    if durability_min_strength_mpa is not None and target_strength_mpa < float(durability_min_strength_mpa):
        warnings.append({"code": "TARGET_STRENGTH_BELOW_DURABILITY_MINIMUM", "severity": "fail", "message": f"مقاومت هدف پروژه {target_strength_mpa:g} MPa از حداقل موردنیاز دوام {float(durability_min_strength_mpa):g} MPa کمتر است.", "reference": "ACI CODE-318-25 Table 19.3.2.1"})

    mix["durability_governing_max_w_cm"] = durability_max_w_cm
    mix["project_input_w_cm_ratio"] = float(original_w_cm) if original_w_cm is not None else None
    mix["governing_w_cm_ratio"] = mix.get("w_cm_ratio")
    mix["durability_min_strength_mpa"] = durability_min_strength_mpa
    mix["durability_target_air_percent"] = durability_target_air
    mix["cementitious_weighted_specific_gravity"] = binder.get("weighted_specific_gravity")

    result["durability"] = durability
    result["cementitious_system"] = binder
    result["admixture_system"] = admixture_system
    result["warnings"] = warnings
    result["engineering_notes"] = list(result.get("engineering_notes", [])) + [
        "پیش از محاسبه طرح، کلاس‌های مواجهه ACI 318-25 ارزیابی و محدودیت حاکم w/cm و هوا اعمال شد.",
        "وزن مخصوص موثر مواد سیمانی از سهم جرمی و وزن مخصوص هر سیمان/SCM محاسبه و در موازنه حجم مطلق اعمال شد.",
        "آب حامل افزودنی‌های مایع از آب قابل افزودن به بچ کسر و حجم غیرآبی افزودنی در موازنه حجم سنگدانه اعمال شد.",
        "اگر مقاومت هدف پروژه از حداقل مقاومت دوام کمتر باشد، خروجی fail می‌شود و باید مشخصات پروژه اصلاح شود.",
    ]

    severity_rank = {"needs_review": 1, "warning": 2, "fail": 3}
    max_rank = max((severity_rank.get(str(item.get("severity")), 0) for item in warnings), default=0)
    result["status"] = "fail" if max_rank >= 3 else "warning" if max_rank >= 2 else result.get("status", "pass")
    result["calculation_pipeline"] = [
        "ACI_318_25_durability",
        "cementitious_multi_binder_allocation",
        "ACI_PRC_211_1_22_proportioning",
        "chemical_admixture_batch_water_and_volume_correction",
    ]
    return result
