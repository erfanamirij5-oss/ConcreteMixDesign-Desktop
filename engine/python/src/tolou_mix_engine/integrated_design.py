from __future__ import annotations

from copy import deepcopy

from tolou_mix_engine.admixture_compliance import evaluate_admixture_compliance
from tolou_mix_engine.admixtures import apply_admixtures
from tolou_mix_engine.aggregate_compliance import evaluate_aggregate_compliance
from tolou_mix_engine.asr_compliance import evaluate_asr_compliance
from tolou_mix_engine.cementitious import allocate_cementitious
from tolou_mix_engine.cementitious_compliance import evaluate_cementitious_compliance
from tolou_mix_engine.chloride_compliance import evaluate_full_chloride_compliance
from tolou_mix_engine.durability import evaluate_durability
from tolou_mix_engine.mix_design.normal_weight import calculate_normal_weight_mix
from tolou_mix_engine.water_compliance import evaluate_mixing_water_compliance


def calculate_integrated_normal_mix(payload: dict) -> dict:
    """Run durability, binder allocation, proportioning and material compliance checks."""
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

    raw_cementitious = list(materials.get("cementitious") or [])
    binder_preview = allocate_cementitious(raw_cementitious, 100.0)
    materials["cement_specific_gravity"] = binder_preview["weighted_specific_gravity"]

    aggregate_compliance = evaluate_aggregate_compliance(materials)

    result = calculate_normal_weight_mix(source)
    warnings = list(result.get("warnings", []))
    warnings.extend(durability.get("warnings", []))
    warnings.extend(aggregate_compliance.get("warnings", []))

    mix = result.setdefault("mix_proportions", {})
    cementitious_total = float(mix.get("cementitious_kg_m3") or 0)
    binder = allocate_cementitious(raw_cementitious, cementitious_total)
    warnings.extend(binder.get("warnings", []))

    cementitious_compliance = evaluate_cementitious_compliance(raw_cementitious, durability)
    warnings.extend(cementitious_compliance.get("warnings", []))
    binder["durability_compliance"] = cementitious_compliance

    asr_compliance = evaluate_asr_compliance(materials, binder)
    warnings.extend(asr_compliance.get("warnings", []))
    binder["asr_compliance"] = asr_compliance

    water_compliance = evaluate_mixing_water_compliance(materials, durability_conditions)
    warnings.extend(water_compliance.get("warnings", []))

    raw_admixtures = list(materials.get("admixtures") or [])
    admixture_system = apply_admixtures(
        result,
        raw_admixtures,
        cementitious_total,
        str(options.get("aggregate_proportioning_mode") or "manual_absolute_volume"),
    )
    warnings.extend(admixture_system.get("warnings", []))

    admixture_compliance = evaluate_admixture_compliance(
        admixture_system,
        raw_admixtures,
        cementitious_total,
        durability,
        bool(durability_conditions.get("prestressed_concrete", False)),
    )
    warnings.extend(admixture_compliance.get("warnings", []))
    admixture_system["compliance"] = admixture_compliance

    full_chloride = evaluate_full_chloride_compliance(
        result,
        binder,
        admixture_compliance,
        materials,
        durability,
        durability_conditions,
    )
    warnings.extend(full_chloride.get("warnings", []))
    admixture_system["chloride_compliance"] = full_chloride

    target_strength_mpa = float(requirements.get("target_strength_mpa", 0) or 0)
    if durability_min_strength_mpa is not None and target_strength_mpa < float(durability_min_strength_mpa):
        warnings.append({"code": "TARGET_STRENGTH_BELOW_DURABILITY_MINIMUM", "severity": "fail", "message": f"مقاومت هدف پروژه {target_strength_mpa:g} MPa از حداقل موردنیاز دوام {float(durability_min_strength_mpa):g} MPa کمتر است.", "reference": "ACI CODE-318-25 Table 19.3.2.1"})

    mix["durability_governing_max_w_cm"] = durability_max_w_cm
    mix["project_input_w_cm_ratio"] = float(original_w_cm) if original_w_cm is not None else None
    mix["governing_w_cm_ratio"] = mix.get("w_cm_ratio")
    mix["durability_min_strength_mpa"] = durability_min_strength_mpa
    mix["durability_target_air_percent"] = durability_target_air
    mix["aggregate_compliance_status"] = aggregate_compliance.get("status")
    mix["cementitious_weighted_specific_gravity"] = binder.get("weighted_specific_gravity")
    mix["sulfate_exposure_class"] = cementitious_compliance.get("sulfate_exposure_class")
    mix["cementitious_sulfate_compliance_status"] = cementitious_compliance.get("status")
    mix["total_na2oeq_kg_m3"] = asr_compliance.get("binder_alkali", {}).get("total_na2oeq_kg_m3")
    mix["asr_compliance_status"] = asr_compliance.get("status")
    mix["mixing_water_compliance_status"] = water_compliance.get("status")
    mix["admixture_chloride_kg_m3"] = admixture_compliance.get("chloride", {}).get("admixture_chloride_kg_m3")
    mix["admixture_chloride_percent_binder"] = admixture_compliance.get("chloride", {}).get("admixture_chloride_percent_by_mass_cementitious")
    mix["aci_chloride_limit_percent_binder"] = full_chloride.get("aci_limit_percent_by_mass_cementitious")
    mix["total_chloride_kg_m3"] = full_chloride.get("total_chloride_kg_m3")
    mix["total_chloride_percent_binder"] = full_chloride.get("total_chloride_percent_by_mass_cementitious")

    result["durability"] = durability
    result["aggregate_compliance"] = aggregate_compliance
    result["cementitious_system"] = binder
    result["cementitious_compliance"] = cementitious_compliance
    result["asr_compliance"] = asr_compliance
    result["water_compliance"] = water_compliance
    result["admixture_system"] = admixture_system
    result["admixture_compliance"] = admixture_compliance
    result["chloride_compliance"] = full_chloride
    result["warnings"] = warnings
    result["engineering_notes"] = list(result.get("engineering_notes", [])) + [
        "پیش از محاسبه طرح، کلاس‌های مواجهه ACI 318-25 ارزیابی و محدودیت حاکم w/cm و هوا اعمال شد.",
        "دانه‌بندی، ASTM C117، خواص فیزیکی، LA Abrasion، ASTM C88 Soundness و مواد زیان‌آور ASTM C142/C123 هر منبع سنگدانه کنترل شد؛ حدود پذیرش وابسته به کاربرد فقط از Specification ثبت‌شده پروژه اعمال می‌شوند و نرم‌افزار حد را حدس نمی‌زند.",
        "وزن مخصوص موثر مواد سیمانی از سهم جرمی و وزن مخصوص هر سیمان/SCM محاسبه و در موازنه حجم مطلق اعمال شد.",
        "انطباق سیستم سیمانی با کلاس سولفات S0/S1/S2/S3 بر اساس Designation محصول و مدارک Qualification کنترل شد؛ S3 بدون انتخاب صریح مهندس pass کامل نمی‌گیرد.",
        "بار قلیایی Na₂Oeq مواد سیمانی و شواهد واکنش‌زایی سنگدانه برای ASR کنترل شد؛ سنگدانه واکنش‌زا بدون Qualification معتبر سیستم کاهش‌دهنده pass نمی‌گیرد.",
        "آب اختلاط بر اساس ASTM C1602/C1602M-22 از نظر مقاومت 7روزه، زمان گیرش و حدود شیمیایی اختیاری ارزیابی شد؛ آب ترکیبی چندمنبعی بدون آزمون عملکردی ترکیب pass کامل نمی‌گیرد.",
        "آب حامل افزودنی‌های مایع از آب قابل افزودن به بچ کسر و حجم غیرآبی افزودنی در موازنه حجم سنگدانه اعمال شد.",
        "کلراید آب، مواد سیمانی، سنگدانه و افزودنی‌ها تجمیع و با حد حاکم ACI مقایسه شد؛ فقط در صورت کامل بودن داده همه منابع، pass کامل صادر می‌شود.",
        "وجود CaCl2 در شرایط منع‌شده مانند S2/S3 یا بتن پیش‌تنیده موجب fail می‌شود.",
        "اگر مقاومت هدف پروژه از حداقل مقاومت دوام کمتر باشد، خروجی fail می‌شود و باید مشخصات پروژه اصلاح شود.",
    ]

    references = list(result.get("standard_references", []))
    for group in (aggregate_compliance, cementitious_compliance, asr_compliance, water_compliance, admixture_compliance, full_chloride):
        for reference in group.get("references", []):
            if reference not in references:
                references.append(reference)
    result["standard_references"] = references

    severity_rank = {"needs_review": 1, "warning": 2, "fail": 3}
    max_rank = max((severity_rank.get(str(item.get("severity")), 0) for item in warnings), default=0)
    result["status"] = "fail" if max_rank >= 3 else "warning" if max_rank >= 2 else "needs_review" if max_rank >= 1 else result.get("status", "pass")
    result["calculation_pipeline"] = [
        "ACI_318_25_durability",
        "ASTM_C33_C136_C117_C127_C128_C29_C131_C535_C88_C142_C123_aggregate_compliance",
        "cementitious_multi_binder_allocation",
        "ACI_318_25_sulfate_cementitious_compliance",
        "ASTM_C1778_ASR_alkali_compliance",
        "ASTM_C1602_mixing_water_compliance",
        "ACI_PRC_211_1_22_proportioning",
        "chemical_admixture_batch_water_and_volume_correction",
        "ASTM_C494_C260_admixture_compliance",
        "full_mixture_chloride_compliance",
    ]
    return result
