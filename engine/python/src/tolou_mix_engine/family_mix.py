from __future__ import annotations

from copy import deepcopy
from typing import Any

from tolou_mix_engine.cementitious import allocate_cementitious
from tolou_mix_engine.durability import evaluate_durability
from tolou_mix_engine.integrated_design import calculate_integrated_normal_mix
from tolou_mix_engine.mix_design.normal_weight import allocate_aggregates_by_absolute_volume

SUPPORTED_G06_FAMILIES = {"normal_weight", "high_strength", "high_performance"}


def _fail(family_id: str, code: str, message: str) -> dict[str, Any]:
    return {
        "status": "fail",
        "engine": "tolou-mix-engine",
        "error": code,
        "concrete_family": family_id,
        "mix_proportions": {},
        "warnings": [
            {
                "code": code.upper(),
                "severity": "fail",
                "message": message,
                "reference": "Tolou G06 family-specific design contract",
            }
        ],
        "engineering_notes": [
            "Tolou does not infer HSC/HPC production proportions from normal-concrete strength or water lookups.",
        ],
        "limitations": [
            "No production-ready mixture is claimed until Trial Mix and Calibration are completed.",
        ],
    }


def _positive(value: object, name: str) -> float:
    number = float(value)
    if number <= 0:
        raise ValueError(f"{name} must be greater than zero")
    return number


def _nonnegative(value: object, name: str) -> float:
    number = float(value)
    if number < 0:
        raise ValueError(f"{name} must be nonnegative")
    return number


def _validate_performance_inputs(family_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    requirements = payload.get("requirements") or {}
    materials = payload.get("materials") or {}

    required_fields = (
        ("w_cm_ratio", "برای HSC/HPC نسبت w/cm باید صریحاً از مبنای طراحی پروژه/دوام/آزمایش تعیین شود."),
        ("mixing_water_kg_m3", "برای HSC/HPC آب اختلاط باید صریحاً وارد شود؛ جدول آب بتن معمولی استفاده نمی‌شود."),
        ("air_content_percent", "برای HSC/HPC مقدار هوای طراحی باید صریحاً وارد شود و به‌صورت پیش‌فرض حدس زده نمی‌شود."),
    )
    for field, message in required_fields:
        if requirements.get(field) is None:
            return _fail(family_id, f"explicit_{field}_required", message)

    if not list(materials.get("cementitious") or []):
        return _fail(
            family_id,
            "cementitious_system_required",
            "سیستم مواد سیمانی واقعی/تعریف‌شده برای HSC/HPC الزامی است.",
        )
    if not list(materials.get("aggregates") or []):
        return _fail(
            family_id,
            "aggregate_system_required",
            "سیستم سنگدانه برای HSC/HPC باید پیش از تناسب حجمی تعریف شود.",
        )
    if not list(materials.get("aggregate_blend_shares") or []):
        return _fail(
            family_id,
            "aggregate_blend_required",
            "سهم منابع سنگدانه برای HSC/HPC باید صریحاً ثبت شود؛ سهم مساوی یا خودکار فرض نمی‌شود.",
        )
    if family_id == "high_performance" and not dict(payload.get("performance_requirements") or {}):
        return _fail(
            family_id,
            "performance_requirements_required",
            "برای HPC حداقل یک الزام عملکردی صریح باید ثبت شود؛ HPC صرفاً با مقاومت فشاری تعریف نمی‌شود.",
        )
    return None


def _calculate_performance_family(family_id: str, source: dict[str, Any]) -> dict[str, Any]:
    requirements = source.get("requirements") or {}
    materials = source.get("materials") or {}

    try:
        w_cm = _positive(requirements["w_cm_ratio"], "w_cm_ratio")
        water = _positive(requirements["mixing_water_kg_m3"], "mixing_water_kg_m3")
        air = _nonnegative(requirements["air_content_percent"], "air_content_percent")
    except (KeyError, TypeError, ValueError) as exc:
        return _fail(family_id, "invalid_explicit_performance_input", str(exc))

    cementitious_total = water / w_cm
    binder = allocate_cementitious(list(materials.get("cementitious") or []), cementitious_total)
    binder_warnings = list(binder.get("warnings") or [])
    if any(item.get("severity") == "fail" for item in binder_warnings):
        result = _fail(
            family_id,
            "invalid_cementitious_system",
            "سیستم مواد سیمانی برای محاسبه HSC/HPC معتبر نیست؛ سهم اجزا و خواص مصالح را اصلاح کنید.",
        )
        result["warnings"].extend(binder_warnings)
        return result

    aggregate = allocate_aggregates_by_absolute_volume(
        list(materials.get("aggregates") or []),
        list(materials.get("aggregate_blend_shares") or []),
        water,
        cementitious_total,
        float(binder.get("weighted_specific_gravity") or 3.15),
        air,
    )

    durability = evaluate_durability(
        {
            "conditions": source.get("durability_conditions") or {},
            "max_aggregate_size_mm": float(requirements.get("max_aggregate_size_mm") or 19),
        }
    )
    governing_max_w_cm = (durability.get("governing_requirements") or {}).get("max_w_cm")

    warnings = binder_warnings + list(aggregate.get("warnings") or []) + list(durability.get("warnings") or [])
    if governing_max_w_cm is not None and w_cm > float(governing_max_w_cm):
        warnings.append(
            {
                "code": "W_CM_ABOVE_GOVERNING_DURABILITY_LIMIT",
                "severity": "fail",
                "message": (
                    f"w/cm صریح طرح ({w_cm:.3f}) از حد حاکم دوام ({float(governing_max_w_cm):.3f}) بزرگ‌تر است."
                ),
                "reference": "Tolou durability engine / active project exposure rules",
            }
        )

    severity_rank = {"needs_review": 1, "warning": 2, "fail": 3}
    highest = max((severity_rank.get(str(item.get("severity")), 0) for item in warnings), default=0)
    status = "fail" if highest >= 3 else "warning" if highest >= 2 else "needs_review"

    batch_water_adjustment = aggregate.get("batch_water_adjustment_kg_m3")
    water_to_add = None
    if batch_water_adjustment is not None:
        water_to_add = round(water - float(batch_water_adjustment), 1)

    return {
        "status": status,
        "engine": "tolou-mix-engine",
        "concrete_family": family_id,
        "design_strategy": (
            "high_strength_explicit_input_absolute_volume"
            if family_id == "high_strength"
            else "high_performance_explicit_input_absolute_volume"
        ),
        "design_confidence": "PRELIMINARY_UNTIL_TRIAL_AND_CALIBRATION",
        "calculation_method": "explicit_input_absolute_volume_no_family_lookup",
        "mix_proportions": {
            "water_kg_m3": round(water, 1),
            "cementitious_kg_m3": round(cementitious_total, 1),
            "w_cm_ratio": round(w_cm, 3),
            "air_content_percent": round(air, 2),
            "fine_aggregate_kg_m3": aggregate.get("fine_aggregate_kg_m3"),
            "coarse_aggregate_kg_m3": aggregate.get("coarse_aggregate_kg_m3"),
            "aggregate_ssd_kg_m3": aggregate.get("aggregate_ssd_kg_m3"),
            "aggregate_batch_kg_m3": aggregate.get("aggregate_batch_kg_m3"),
            "batch_water_adjustment_kg_m3": batch_water_adjustment,
            "water_to_add_kg_m3": water_to_add,
            "cementitious_weighted_specific_gravity": binder.get("weighted_specific_gravity"),
            "durability_governing_max_w_cm": governing_max_w_cm,
        },
        "cementitious_system": binder,
        "aggregate_analysis": aggregate.get("aggregate_analysis") or [],
        "aggregate_proportioning": aggregate.get("proportioning_metadata") or {},
        "durability": durability,
        "performance_requirements": dict(source.get("performance_requirements") or {}),
        "warnings": warnings,
        "engineering_notes": [
            "HSC/HPC فقط با w/cm، آب اختلاط و هوای صریح محاسبه می‌شود؛ lookup بتن معمولی برای این ورودی‌ها استفاده نمی‌شود.",
            "موازنه حجم مطلق و تصحیح رطوبت سنگدانه از هسته مشترک بازاستفاده شده، اما Strategy خانواده مستقل باقی مانده است.",
            "HPC به الزام عملکردی صریح نیاز دارد و صرفاً از روی مقاومت فشاری برچسب‌گذاری نمی‌شود.",
            "برای پذیرش تولیدی، Trial Mix، نتایج آزمایشگاهی و Calibration الزامی است.",
        ],
        "standard_references": [
            "ACI PRC-211.1-22 - shared absolute-volume background for normal-density proportioning",
            "ACI PRC-211.4-08 - high-strength concrete proportioning guidance; source edition must be reviewed before encoding family-specific numerical rules",
        ],
        "limitations": [
            "هیچ حد عددی HSC/HPC در G06 بدون Rule Pack منبع‌دار و edition-pinned اضافه نشده است.",
            "این خروجی پیش از Trial Mix و Calibration نباید Verified یا Production-ready تلقی شود.",
        ],
    }


def calculate_family_mix(payload: dict[str, Any]) -> dict[str, Any]:
    source = deepcopy(payload if isinstance(payload, dict) else {})
    family_id = str(source.get("concrete_type") or "normal_weight").strip().lower()

    if family_id not in SUPPORTED_G06_FAMILIES:
        return _fail(
            family_id,
            "unsupported_g06_family",
            f"خانواده '{family_id}' در دامنه G06 فعال نیست و باید از Strategy اختصاصی Gate مربوطه استفاده کند.",
        )

    if family_id == "normal_weight":
        result = calculate_integrated_normal_mix(source)
        result["concrete_family"] = family_id
        result["design_strategy"] = "normal_weight_absolute_volume"
        return result

    validation_error = _validate_performance_inputs(family_id, source)
    if validation_error is not None:
        return validation_error
    return _calculate_performance_family(family_id, source)
