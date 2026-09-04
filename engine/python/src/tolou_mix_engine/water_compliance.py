from __future__ import annotations


ASTM_C1602_LIMITS = {
    "strength_ratio_7d_min_percent": 90.0,
    "setting_time_deviation_min_min": -60.0,
    "setting_time_deviation_max_min": 90.0,
    "sulfate_mg_l_max": 3000.0,
    "alkalis_na2oeq_mg_l_max": 600.0,
    "total_solids_mg_l_max": 50000.0,
}


def evaluate_mixing_water_compliance(materials: dict, durability_conditions: dict | None = None) -> dict:
    """Evaluate ASTM C1602/C1602M mixing-water qualification.

    Performance qualification is primary. Chemical limits are reported as the optional
    purchaser/project limits in ASTM C1602 and are not converted into a hard failure by
    this engine unless the performance requirements themselves fail.
    """
    waters = [item for item in list(materials.get("admixtures") or []) if item.get("material_type") == "water"]
    durability_conditions = durability_conditions or {}
    prestressed = bool(durability_conditions.get("prestressed_concrete", False))
    reinforced = bool(durability_conditions.get("reinforced_or_embedded_metal", False))
    chloride_limit = 500.0 if prestressed else 1000.0 if reinforced else None

    warnings: list[dict] = []
    if not waters:
        return {
            "status": "needs_review",
            "data_complete": False,
            "combined_water": None,
            "sources": [],
            "warnings": [{
                "code": "MIXING_WATER_SOURCE_MISSING",
                "severity": "needs_review",
                "message": "منبع آب اختلاط برای ارزیابی ASTM C1602 ثبت نشده است.",
                "reference": "ASTM C1602/C1602M-22",
            }],
            "references": _references(),
        }

    shares = [_optional_number(item.get("water_share_percent")) for item in waters]
    if len(waters) == 1 and shares[0] is None:
        shares[0] = 100.0
    share_complete = all(value is not None for value in shares)
    share_total = sum(value or 0.0 for value in shares)
    share_valid = share_complete and abs(share_total - 100.0) <= 0.01
    if not share_valid:
        warnings.append({
            "code": "MIXING_WATER_SHARES_NOT_100",
            "severity": "needs_review",
            "message": f"جمع سهم منابع آب باید 100% باشد؛ مقدار فعلی {share_total:.3f}% است.",
            "reference": "ASTM C1602/C1602M-22 - combined water source qualification",
        })

    source_rows = []
    weighted = {"chloride_mg_l": 0.0, "sulfate_mg_l": 0.0, "alkalis_na2oeq_mg_l": 0.0, "total_solids_mg_l": 0.0}
    chemical_complete = share_valid
    any_performance_fail = False
    all_single_source_performance_complete = True

    for item, share in zip(waters, shares):
        strength = _optional_number(item.get("c1602_strength_ratio_7d_percent"))
        set_dev = _optional_number(item.get("c1602_setting_time_deviation_min"))
        performance_complete = strength is not None and set_dev is not None
        all_single_source_performance_complete = all_single_source_performance_complete and performance_complete
        performance_pass = performance_complete and strength >= 90.0 and -60.0 <= set_dev <= 90.0
        if performance_complete and not performance_pass:
            any_performance_fail = True
            warnings.append({
                "code": "ASTM_C1602_PERFORMANCE_FAILED",
                "severity": "fail",
                "message": f"آب «{item.get('name') or 'بدون نام'}» الزامات عملکردی مقاومت/زمان گیرش ASTM C1602 را برآورده نمی‌کند.",
                "reference": "ASTM C1602/C1602M-22 Table 1",
            })
        elif not performance_complete:
            warnings.append({
                "code": "ASTM_C1602_PERFORMANCE_DATA_MISSING",
                "severity": "needs_review",
                "message": f"نتیجه مقاومت 7روزه یا انحراف زمان گیرش آب «{item.get('name') or 'بدون نام'}» ثبت نشده است.",
                "reference": "ASTM C1602/C1602M-22 Table 1",
            })

        chemistry = {
            "chloride_mg_l": _optional_number(item.get("chloride_mg_l")),
            "sulfate_mg_l": _optional_number(item.get("sulfate_mg_l")),
            "alkalis_na2oeq_mg_l": _optional_number(item.get("alkalis_na2oeq_mg_l")),
            "total_solids_mg_l": _optional_number(item.get("total_solids_mg_l")),
        }
        for key, value in chemistry.items():
            if value is None or share is None:
                chemical_complete = False
            else:
                weighted[key] += value * share / 100.0

        source_rows.append({
            "material_id": item.get("id"),
            "name": item.get("name"),
            "material_subtype": item.get("material_subtype"),
            "share_percent": share,
            "density_kg_m3": _optional_number(item.get("density_kg_m3")),
            **chemistry,
            "strength_ratio_7d_percent": strength,
            "setting_time_deviation_min": set_dev,
            "performance_complete": performance_complete,
            "performance_pass": performance_pass if performance_complete else None,
            "evidence_ref": item.get("c1602_performance_evidence_ref"),
        })

    chemical_checks = _chemical_checks(weighted, chloride_limit) if chemical_complete else []
    exceeded = [check for check in chemical_checks if check["status"] == "exceeds_optional_limit"]
    if exceeded:
        warnings.append({
            "code": "ASTM_C1602_OPTIONAL_CHEMICAL_LIMIT_EXCEEDED",
            "severity": "needs_review",
            "message": "یک یا چند حد شیمیایی اختیاری آب ترکیبی ASTM C1602 تجاوز شده است؛ الزام خریدار/پروژه باید بررسی شود.",
            "reference": "ASTM C1602/C1602M-22 optional chemical limits",
        })

    combined_performance_qualified = len(waters) == 1 and all_single_source_performance_complete and not any_performance_fail
    if len(waters) > 1:
        warnings.append({
            "code": "COMBINED_WATER_PERFORMANCE_TEST_REQUIRED",
            "severity": "needs_review",
            "message": "برای چند منبع آب، Qualification عملکردی باید روی آب ترکیبی با بیشترین solids مورد انتظار انجام شود؛ قبولی جداگانه منابع جایگزین آزمون ترکیبی نیست.",
            "reference": "ASTM C1602/C1602M-22 combined water qualification",
        })

    if any_performance_fail:
        status = "fail"
    elif not share_valid or not chemical_complete or not combined_performance_qualified or exceeded:
        status = "needs_review"
    else:
        status = "pass"

    return {
        "status": status,
        "data_complete": share_valid and chemical_complete and combined_performance_qualified,
        "source_count": len(waters),
        "sources": source_rows,
        "combined_water": {
            "share_total_percent": round(share_total, 4),
            "chloride_mg_l": round(weighted["chloride_mg_l"], 3) if chemical_complete else None,
            "sulfate_mg_l": round(weighted["sulfate_mg_l"], 3) if chemical_complete else None,
            "alkalis_na2oeq_mg_l": round(weighted["alkalis_na2oeq_mg_l"], 3) if chemical_complete else None,
            "total_solids_mg_l": round(weighted["total_solids_mg_l"], 3) if chemical_complete else None,
            "chloride_optional_limit_mg_l": chloride_limit,
            "chemical_checks": chemical_checks,
            "performance_qualified": combined_performance_qualified,
        },
        "warnings": warnings,
        "references": _references(),
    }


def _chemical_checks(weighted: dict, chloride_limit: float | None) -> list[dict]:
    checks = []
    limits = [
        ("chloride_mg_l", chloride_limit),
        ("sulfate_mg_l", ASTM_C1602_LIMITS["sulfate_mg_l_max"]),
        ("alkalis_na2oeq_mg_l", ASTM_C1602_LIMITS["alkalis_na2oeq_mg_l_max"]),
        ("total_solids_mg_l", ASTM_C1602_LIMITS["total_solids_mg_l_max"]),
    ]
    for key, limit in limits:
        value = weighted[key]
        if limit is None:
            status = "project_limit_not_applicable"
        else:
            status = "within_optional_limit" if value <= limit else "exceeds_optional_limit"
        checks.append({"parameter": key, "value": round(value, 3), "limit": limit, "status": status})
    return checks


def _optional_number(value: object) -> float | None:
    if value is None or value == "":
        return None
    number = float(value)
    if number < 0:
        raise ValueError("water compliance values cannot be negative")
    return number


def _references() -> list[str]:
    return [
        "ASTM C1602/C1602M-22 - Mixing Water Used in Hydraulic Cement Concrete",
        "ASTM C31/C31M - Making and Curing Concrete Test Specimens in the Field",
        "ASTM C39/C39M - Compressive Strength of Cylindrical Concrete Specimens",
        "ASTM C403/C403M - Time of Setting of Concrete Mixtures by Penetration Resistance",
    ]
