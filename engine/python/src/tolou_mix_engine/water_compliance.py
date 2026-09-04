from __future__ import annotations

from datetime import date, datetime, timedelta


ASTM_C1602_LIMITS = {
    "strength_ratio_7d_min_percent": 90.0,
    "setting_time_deviation_min_min": -60.0,
    "setting_time_deviation_max_min": 90.0,
    "sulfate_mg_l_max": 3000.0,
    "alkalis_na2oeq_mg_l_max": 600.0,
    "total_solids_mg_l_max": 50000.0,
}


def evaluate_mixing_water_compliance(materials: dict, durability_conditions: dict | None = None) -> dict:
    """Evaluate ASTM C1602/C1602M-22 mixing-water qualification and monitoring.

    Potable water is accepted without performance qualification. Non-potable water and
    water from concrete production operations require performance qualification. Water
    from concrete production operations also requires at least daily density monitoring.
    Optional chemical limits are reported separately and do not by themselves invalidate
    Table 1 performance qualification unless the purchaser/project makes them mandatory.
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
            "monitoring": {"status": "needs_review", "sources": []},
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
    monitoring_rows = []
    weighted = {"chloride_mg_l": 0.0, "sulfate_mg_l": 0.0, "alkalis_na2oeq_mg_l": 0.0, "total_solids_mg_l": 0.0}
    chemical_complete = share_valid
    any_performance_fail = False
    all_required_performance_qualified = True
    any_monitoring_review = False

    for item, share in zip(waters, shares):
        source_class = _water_source_class(item)
        strength = _optional_number(item.get("c1602_strength_ratio_7d_percent"))
        set_dev = _optional_number(item.get("c1602_setting_time_deviation_min"))
        performance_required = source_class != "potable"
        performance_complete = strength is not None and set_dev is not None
        performance_pass = performance_complete and strength >= 90.0 and -60.0 <= set_dev <= 90.0

        if performance_required:
            if performance_complete and not performance_pass:
                any_performance_fail = True
                all_required_performance_qualified = False
                warnings.append({
                    "code": "ASTM_C1602_PERFORMANCE_FAILED",
                    "severity": "fail",
                    "message": f"آب «{item.get('name') or 'بدون نام'}» الزامات عملکردی مقاومت/زمان گیرش ASTM C1602 را برآورده نمی‌کند.",
                    "reference": "ASTM C1602/C1602M-22 Table 1",
                })
            elif not performance_complete:
                all_required_performance_qualified = False
                warnings.append({
                    "code": "ASTM_C1602_PERFORMANCE_DATA_MISSING",
                    "severity": "needs_review",
                    "message": f"نتیجه مقاومت 7روزه یا انحراف زمان گیرش آب «{item.get('name') or 'بدون نام'}» ثبت نشده است.",
                    "reference": "ASTM C1602/C1602M-22 Table 1",
                })
        elif performance_complete and not performance_pass:
            warnings.append({
                "code": "POTABLE_WATER_RECORDED_TEST_OUTSIDE_C1602_TABLE1",
                "severity": "needs_review",
                "message": f"برای آب آشامیدنی «{item.get('name') or 'بدون نام'}» آزمون عملکردی ثبت‌شده خارج از Table 1 است؛ منبع و گزارش آزمایش بازبینی شود.",
                "reference": "ASTM C1602/C1602M-22",
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

        monitoring = _monitoring_assessment(item, source_class)
        monitoring_rows.append(monitoring)
        if monitoring["status"] == "needs_review":
            any_monitoring_review = True
            warnings.extend(monitoring["warnings"])

        source_rows.append({
            "material_id": item.get("id"),
            "name": item.get("name"),
            "material_subtype": item.get("material_subtype"),
            "source_class": source_class,
            "share_percent": share,
            "density_kg_m3": _optional_number(item.get("density_kg_m3")),
            **chemistry,
            "performance_required": performance_required,
            "strength_ratio_7d_percent": strength,
            "setting_time_deviation_min": set_dev,
            "performance_complete": performance_complete,
            "performance_pass": performance_pass if performance_complete else (True if not performance_required else None),
            "evidence_ref": item.get("c1602_performance_evidence_ref"),
            "monitoring": monitoring,
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

    combined_performance_qualified = len(waters) == 1 and all_required_performance_qualified and not any_performance_fail
    if len(waters) > 1:
        combined_performance_qualified = False
        warnings.append({
            "code": "COMBINED_WATER_PERFORMANCE_TEST_REQUIRED",
            "severity": "needs_review",
            "message": "برای چند منبع آب، Qualification عملکردی باید روی آب ترکیبی در بحرانی‌ترین درصد منبع غیرآشامیدنی/بیشترین solids مورد انتظار انجام شود.",
            "reference": "ASTM C1602/C1602M-22 combined water qualification",
        })

    if any_performance_fail:
        status = "fail"
    elif not share_valid or not combined_performance_qualified or any_monitoring_review or exceeded:
        status = "needs_review"
    else:
        status = "pass"

    return {
        "status": status,
        "data_complete": share_valid and combined_performance_qualified and not any_monitoring_review,
        "source_count": len(waters),
        "sources": source_rows,
        "monitoring": {
            "status": "needs_review" if any_monitoring_review else "pass",
            "sources": monitoring_rows,
            "note": "Default ASTM C1602 frequencies are used; permitted reduced frequencies require documented qualifying history and are not inferred automatically.",
        },
        "combined_water": {
            "share_total_percent": round(share_total, 4),
            "chloride_mg_l": round(weighted["chloride_mg_l"], 3) if chemical_complete else None,
            "sulfate_mg_l": round(weighted["sulfate_mg_l"], 3) if chemical_complete else None,
            "alkalis_na2oeq_mg_l": round(weighted["alkalis_na2oeq_mg_l"], 3) if chemical_complete else None,
            "total_solids_mg_l": round(weighted["total_solids_mg_l"], 3) if chemical_complete else None,
            "chloride_optional_limit_mg_l": chloride_limit,
            "chemical_data_complete": chemical_complete,
            "chemical_checks": chemical_checks,
            "performance_qualified": combined_performance_qualified,
        },
        "warnings": warnings,
        "references": _references(),
    }


def _monitoring_assessment(item: dict, source_class: str) -> dict:
    if source_class == "potable":
        return {
            "material_id": item.get("id"),
            "name": item.get("name"),
            "source_class": source_class,
            "status": "not_required",
            "density_check_required_daily": False,
            "qualification_frequency": "not_required",
            "qualification_due": False,
            "density_check_due": False,
            "warnings": [],
        }

    today = date.today()
    last_qualification = _optional_date(item.get("c1602_last_qualification_date"))
    last_density_check = _optional_date(item.get("c1602_last_density_check_date"))
    density = _optional_number(item.get("density_kg_m3"))
    warnings: list[dict] = []

    density_daily = source_class == "concrete_production"
    density_due = False
    if density_daily:
        density_due = last_density_check is None or today - last_density_check > timedelta(days=1)
        if density_due:
            warnings.append({
                "code": "C1602_DAILY_DENSITY_MONITORING_DUE",
                "severity": "needs_review",
                "message": f"کنترل روزانه چگالی آب تولیدی «{item.get('name') or 'بدون نام'}» ثبت نشده یا منقضی است.",
                "reference": "ASTM C1602/C1602M-22 5.2.1 / ASTM C1603",
            })

    if source_class == "nonpotable":
        interval_days = 92
        frequency = "every_3_months_default"
    elif density is None:
        interval_days = None
        frequency = "density_required_to_determine_frequency"
        warnings.append({
            "code": "C1602_RECYCLED_WATER_DENSITY_REQUIRED",
            "severity": "needs_review",
            "message": f"برای تعیین فرکانس Qualification آب تولیدی «{item.get('name') or 'بدون نام'}» چگالی ثبت شود.",
            "reference": "ASTM C1602/C1602M-22 5.2.2 / ASTM C1603",
        })
    elif density < 1010.0:
        interval_days = 183
        frequency = "every_6_months_default"
    elif density <= 1030.0:
        interval_days = 31
        frequency = "monthly_default"
    else:
        interval_days = 7
        frequency = "weekly_default"

    qualification_due = interval_days is None or last_qualification is None or today - last_qualification > timedelta(days=interval_days)
    next_due = last_qualification + timedelta(days=interval_days) if last_qualification is not None and interval_days is not None else None
    if qualification_due:
        warnings.append({
            "code": "C1602_PERFORMANCE_REQUALIFICATION_DUE",
            "severity": "needs_review",
            "message": f"Qualification عملکردی ASTM C1602 برای آب «{item.get('name') or 'بدون نام'}» سررسید/منقضی است.",
            "reference": "ASTM C1602/C1602M-22 5.1/5.2",
        })

    monitoring_method = item.get("c1602_density_monitoring_method")
    if density_daily and not monitoring_method:
        warnings.append({
            "code": "C1602_DENSITY_MONITORING_METHOD_MISSING",
            "severity": "needs_review",
            "message": f"روش پایش چگالی آب تولیدی «{item.get('name') or 'بدون نام'}» ثبت نشده است.",
            "reference": "ASTM C1602/C1602M-22 5.2.1 / ASTM C1603",
        })

    return {
        "material_id": item.get("id"),
        "name": item.get("name"),
        "source_class": source_class,
        "status": "needs_review" if warnings else "pass",
        "density_kg_m3": density,
        "density_check_required_daily": density_daily,
        "last_density_check_date": last_density_check.isoformat() if last_density_check else None,
        "density_check_due": density_due,
        "density_monitoring_method": monitoring_method,
        "last_qualification_date": last_qualification.isoformat() if last_qualification else None,
        "qualification_frequency": frequency,
        "qualification_interval_days": interval_days,
        "next_qualification_due_date": next_due.isoformat() if next_due else None,
        "qualification_due": qualification_due,
        "monitoring_evidence_ref": item.get("c1602_monitoring_evidence_ref"),
        "warnings": warnings,
    }


def _water_source_class(item: dict) -> str:
    explicit = str(item.get("water_source_class") or "").strip().lower()
    if explicit in {"potable", "nonpotable", "concrete_production"}:
        return explicit
    subtype = str(item.get("material_subtype") or "").strip().lower()
    if subtype == "wash_water":
        return "concrete_production"
    if subtype == "mixing_water":
        return "potable"
    return "nonpotable"


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


def _optional_date(value: object) -> date | None:
    if value is None or value == "":
        return None
    text = str(value).strip()
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
        except ValueError as exc:
            raise ValueError(f"invalid ISO date for C1602 monitoring: {text}") from exc


def _references() -> list[str]:
    return [
        "ASTM C1602/C1602M-22 - Mixing Water Used in the Production of Hydraulic Cement Concrete",
        "ASTM C1603-23 - Measurement of Solids in Water",
        "ASTM C31/C31M - Making and Curing Concrete Test Specimens in the Field",
        "ASTM C39/C39M - Compressive Strength of Cylindrical Concrete Specimens",
        "ASTM C403/C403M - Time of Setting of Concrete Mixtures by Penetration Resistance",
    ]
