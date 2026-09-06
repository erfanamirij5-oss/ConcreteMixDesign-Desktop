from __future__ import annotations

from copy import deepcopy
from typing import Any

from tolou_mix_engine.integrated_design import calculate_integrated_normal_mix

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
            "Tolou does not infer high-strength or high-performance production proportions from a normal-concrete lookup.",
        ],
        "limitations": [
            "No production-ready mixture is claimed until Trial Mix and Calibration are completed.",
        ],
    }


def _validate_performance_inputs(family_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    requirements = payload.get("requirements") or {}
    materials = payload.get("materials") or {}

    if requirements.get("w_cm_ratio") is None:
        return _fail(
            family_id,
            "explicit_w_cm_required",
            "برای HSC/HPC نسبت w/cm باید صریحاً از مبنای طراحی پروژه/دوام/آزمایش تعیین شود؛ lookup بتن معمولی مجاز نیست.",
        )
    if requirements.get("mixing_water_kg_m3") is None:
        return _fail(
            family_id,
            "explicit_mixing_water_required",
            "برای HSC/HPC آب اختلاط باید صریحاً وارد شود تا موتور از جدول آب بتن معمولی استفاده نکند.",
        )
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
    if family_id == "high_performance" and not dict(payload.get("performance_requirements") or {}):
        return _fail(
            family_id,
            "performance_requirements_required",
            "برای HPC حداقل یک الزام عملکردی صریح باید ثبت شود؛ HPC صرفاً با مقاومت فشاری تعریف نمی‌شود.",
        )
    return None


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

    # Reuse the verified absolute-volume/material-compliance mechanics only after
    # family-specific guards remove normal-concrete lookup assumptions. The
    # original requested family remains explicit in the returned metadata.
    calculation_payload = deepcopy(source)
    calculation_payload["concrete_type"] = "normal_weight"
    result = calculate_integrated_normal_mix(calculation_payload)
    result["concrete_family"] = family_id
    result["design_strategy"] = (
        "high_strength_explicit_input_absolute_volume"
        if family_id == "high_strength"
        else "high_performance_explicit_input_absolute_volume"
    )
    result["design_confidence"] = "PRELIMINARY_UNTIL_TRIAL_AND_CALIBRATION"
    result["performance_requirements"] = dict(source.get("performance_requirements") or {})
    result["engineering_notes"] = list(result.get("engineering_notes") or []) + [
        "HSC/HPC با ورودی صریح w/cm و آب اختلاط محاسبه شد؛ هیچ lookup آب یا w/cm ویژه این خانواده به‌صورت حدسی اعمال نشد.",
        "مکانیک حجم مطلق و کنترل مصالح مشترک بازاستفاده شده‌اند، اما خانواده و Strategy در خروجی مستقل و قابل‌ردیابی باقی می‌مانند.",
        "برای پذیرش تولیدی، Trial Mix، نتایج آزمایشگاهی و Calibration الزامی است.",
    ]
    result["limitations"] = list(result.get("limitations") or []) + [
        "این G06 عمداً هیچ حد عددی HSC/HPC را بدون Rule Pack منبع‌دار و edition-pinned اضافه نمی‌کند.",
    ]
    return result
