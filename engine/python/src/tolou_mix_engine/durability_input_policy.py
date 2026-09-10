from __future__ import annotations


def validate_active_exposure_inputs(conditions: dict) -> list[dict]:
    """Return fail-closed issues for active/contradictory durability exposure inputs.

    G02B deliberately preserves the historical all-inactive baseline for backward
    compatibility. Once an exposure is asserted active, however, any subordinate
    decision needed to classify that exposure must be explicit rather than silently
    defaulted by Python truthiness or ``dict.get`` fallbacks.

    Sulfate is evidence-driven rather than controlled by one parent flag. Explicit
    soil/water sulfate test results are sufficient evidence to enter the existing
    classifier without requiring a separate seawater=False flag. An explicit
    seawater=False assertion with no soil/water result is incomplete and fails closed.
    Exact ACI classification thresholds remain separately evidence-gated by G02B.
    """
    source = conditions if isinstance(conditions, dict) else {}
    issues: list[dict] = []

    if source.get("freeze_thaw_exposure") is True:
        freeze_water = str(source.get("freeze_water_exposure") or "").strip().lower()
        if freeze_water not in {"limited", "frequent"}:
            issues.append(
                {
                    "field": "freeze_water_exposure",
                    "code": "FREEZE_WATER_EXPOSURE_REQUIRED",
                    "message": "برای Freeze/Thaw فعال، نوع تماس آب باید صریحاً limited یا frequent تعیین شود؛ مقدار پیش‌فرض مجاز نیست.",
                }
            )
    elif source.get("freeze_water_exposure") not in (None, ""):
        issues.append(
            {
                "field": "freeze_thaw_exposure",
                "code": "FREEZE_THAW_FLAG_REQUIRED",
                "message": "freeze_water_exposure بدون فعال بودن صریح freeze_thaw_exposure قابل طبقه‌بندی نیست.",
            }
        )

    soil = source.get("soil_water_soluble_sulfate_percent")
    water = source.get("water_dissolved_sulfate_ppm")
    seawater = source.get("seawater_exposure")
    has_soil_result = soil not in (None, "")
    has_water_result = water not in (None, "")

    if seawater not in (None, "") and not isinstance(seawater, bool):
        issues.append(
            {
                "field": "seawater_exposure",
                "code": "SEAWATER_EXPOSURE_BOOLEAN_REQUIRED",
                "message": "seawater_exposure در صورت ثبت باید صریحاً true/false باشد.",
            }
        )
    if seawater is False and not has_soil_result and not has_water_result:
        issues.append(
            {
                "field": "soil_water_soluble_sulfate_percent|water_dissolved_sulfate_ppm",
                "code": "SULFATE_TEST_RESULT_REQUIRED",
                "message": "برای ارزیابی سولفات غیر‌دریایی باید حداقل نتیجه آزمون سولفات خاک یا آب ثبت شود؛ نبود داده نباید به S0 تعبیر شود.",
            }
        )

    if source.get("water_contact") is True:
        if not isinstance(source.get("low_permeability_required"), bool):
            issues.append(
                {
                    "field": "low_permeability_required",
                    "code": "LOW_PERMEABILITY_DECISION_REQUIRED",
                    "message": "برای water_contact فعال، نیاز یا عدم‌نیاز به low permeability باید صریحاً true/false تعیین شود.",
                }
            )
    elif source.get("low_permeability_required") is True:
        issues.append(
            {
                "field": "water_contact",
                "code": "WATER_CONTACT_FLAG_REQUIRED",
                "message": "low_permeability_required=true بدون water_contact=true ورودی متناقض است.",
            }
        )

    if source.get("moisture_exposure") is True:
        if not isinstance(source.get("external_chloride_exposure"), bool):
            issues.append(
                {
                    "field": "external_chloride_exposure",
                    "code": "EXTERNAL_CHLORIDE_DECISION_REQUIRED",
                    "message": "برای moisture_exposure فعال، وجود یا عدم وجود external chloride exposure باید صریحاً true/false تعیین شود.",
                }
            )
    elif source.get("external_chloride_exposure") is True:
        issues.append(
            {
                "field": "moisture_exposure",
                "code": "MOISTURE_EXPOSURE_FLAG_REQUIRED",
                "message": "external_chloride_exposure=true بدون moisture_exposure=true ورودی متناقض است.",
            }
        )

    return issues
