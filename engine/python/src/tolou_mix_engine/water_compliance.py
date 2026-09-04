from __future__ import annotations

import datetime as dt

ASTM_C1602_LIMITS = {
    "sulfate_mg_l_max": 3000.0,
    "alkalis_na2oeq_mg_l_max": 600.0,
    "total_solids_mg_l_max": 50000.0,
}


def evaluate_mixing_water_compliance(materials: dict, durability_conditions: dict | None = None) -> dict:
    waters = [x for x in list(materials.get("admixtures") or []) if x.get("material_type") == "water"]
    conditions = durability_conditions or {}
    chloride_limit = 500.0 if conditions.get("prestressed_concrete") else 1000.0 if conditions.get("reinforced_or_embedded_metal") else None
    if not waters:
        warning = _warning("MIXING_WATER_SOURCE_MISSING", "needs_review", "منبع آب اختلاط برای ارزیابی ASTM C1602 ثبت نشده است.", "ASTM C1602/C1602M-22")
        return {"status": "needs_review", "data_complete": False, "combined_water": None, "sources": [], "monitoring": {"status": "needs_review", "sources": []}, "warnings": [warning], "references": _references()}

    warnings: list[dict] = []
    shares = [_num(x.get("water_share_percent")) for x in waters]
    if len(waters) == 1 and shares[0] is None:
        shares[0] = 100.0
    share_total = sum(x or 0.0 for x in shares)
    share_valid = all(x is not None for x in shares) and abs(share_total - 100.0) <= 0.01
    if not share_valid:
        warnings.append(_warning("MIXING_WATER_SHARES_NOT_100", "needs_review", f"جمع سهم منابع آب باید 100% باشد؛ مقدار فعلی {share_total:.3f}% است.", "ASTM C1602/C1602M-22"))

    weighted = {"chloride_mg_l": 0.0, "sulfate_mg_l": 0.0, "alkalis_na2oeq_mg_l": 0.0, "total_solids_mg_l": 0.0}
    chemical_complete = share_valid
    sources: list[dict] = []
    monitoring_rows: list[dict] = []
    any_fail = False
    all_required_qualified = True
    monitoring_review = False

    for item, share in zip(waters, shares):
        source_class = _source_class(item)
        strength = _num(item.get("c1602_strength_ratio_7d_percent"))
        set_dev = _num(item.get("c1602_setting_time_deviation_min"), allow_negative=True)
        evidence = str(item.get("c1602_performance_evidence_ref") or "").strip()
        required = source_class != "potable"
        complete = strength is not None and set_dev is not None
        perf_pass = bool(complete and strength >= 90.0 and -60.0 <= set_dev <= 90.0)
        if required and not complete:
            all_required_qualified = False
            warnings.append(_warning("ASTM_C1602_PERFORMANCE_DATA_MISSING", "needs_review", f"نتیجه مقاومت 7روزه یا انحراف زمان گیرش آب «{_name(item)}» ثبت نشده است.", "ASTM C1602/C1602M-22 Table 1"))
        elif required and not perf_pass:
            any_fail = True
            all_required_qualified = False
            warnings.append(_warning("ASTM_C1602_PERFORMANCE_FAILED", "fail", f"آب «{_name(item)}» الزامات عملکردی مقاومت/زمان گیرش ASTM C1602 را برآورده نمی‌کند.", "ASTM C1602/C1602M-22 Table 1"))
        elif required and not evidence:
            all_required_qualified = False
            warnings.append(_warning("ASTM_C1602_PERFORMANCE_EVIDENCE_MISSING", "needs_review", f"نتایج عملکردی آب «{_name(item)}» وارد شده اما مرجع گزارش Qualification ثبت نشده است.", "ASTM C1602/C1602M-22 Table 1"))
        elif not required and complete and not perf_pass:
            warnings.append(_warning("POTABLE_WATER_RECORDED_TEST_OUTSIDE_C1602_TABLE1", "needs_review", f"آزمون ثبت‌شده آب آشامیدنی «{_name(item)}» خارج از Table 1 است و باید بازبینی شود.", "ASTM C1602/C1602M-22"))

        chemistry = {key: _num(item.get(key)) for key in weighted}
        for key, value in chemistry.items():
            if value is None or share is None:
                chemical_complete = False
            else:
                weighted[key] += value * share / 100.0

        monitoring = _monitoring(item, source_class)
        monitoring_rows.append(monitoring)
        if monitoring["status"] == "needs_review":
            monitoring_review = True
            warnings.extend(monitoring["warnings"])

        sources.append({
            "material_id": item.get("id"), "name": item.get("name"), "material_subtype": item.get("material_subtype"),
            "source_class": source_class, "share_percent": share, "density_kg_m3": _num(item.get("density_kg_m3")),
            **chemistry, "performance_required": required, "strength_ratio_7d_percent": strength,
            "setting_time_deviation_min": set_dev, "performance_complete": complete,
            "performance_pass": perf_pass if complete else (True if not required else None),
            "evidence_ref": evidence or None, "monitoring": monitoring,
        })

    checks = _chemical_checks(weighted, chloride_limit) if chemical_complete else []
    exceeded = any(x["status"] == "exceeds_optional_limit" for x in checks)
    if exceeded:
        warnings.append(_warning("ASTM_C1602_OPTIONAL_CHEMICAL_LIMIT_EXCEEDED", "needs_review", "یک یا چند حد شیمیایی اختیاری آب ترکیبی ASTM C1602 تجاوز شده است؛ الزام پروژه بررسی شود.", "ASTM C1602/C1602M-22"))

    performance_qualified = len(waters) == 1 and all_required_qualified and not any_fail
    if len(waters) > 1:
        performance_qualified = False
        warnings.append(_warning("COMBINED_WATER_PERFORMANCE_TEST_REQUIRED", "needs_review", "برای چند منبع آب، Qualification عملکردی باید روی خود آب ترکیبی و در نامساعدترین نسبت/بیشترین سهم منبع غیرآشامیدنی یا بیشترین جامدات مورد انتظار تولید انجام و مستند شود؛ میانگین‌گیری نتایج آزمون منابع منفرد جایگزین آزمون آب ترکیبی نیست.", "ASTM C1602/C1602M-22 Sections 4.3, 5.1 and 5.2"))

    status = "fail" if any_fail else "needs_review" if (not share_valid or not performance_qualified or monitoring_review or exceeded) else "pass"
    return {
        "status": status,
        "data_complete": share_valid and performance_qualified and not monitoring_review,
        "source_count": len(waters), "sources": sources,
        "monitoring": {"status": "needs_review" if monitoring_review else "pass", "sources": monitoring_rows, "note": "Default ASTM C1602 frequencies are used; reduced frequencies require documented qualifying history."},
        "combined_water": {
            "share_total_percent": round(share_total, 4),
            "chloride_mg_l": round(weighted["chloride_mg_l"], 3) if chemical_complete else None,
            "sulfate_mg_l": round(weighted["sulfate_mg_l"], 3) if chemical_complete else None,
            "alkalis_na2oeq_mg_l": round(weighted["alkalis_na2oeq_mg_l"], 3) if chemical_complete else None,
            "total_solids_mg_l": round(weighted["total_solids_mg_l"], 3) if chemical_complete else None,
            "chloride_optional_limit_mg_l": chloride_limit, "chemical_data_complete": chemical_complete,
            "chemical_checks": checks, "performance_qualified": performance_qualified,
            "qualification_basis": "single_source" if len(waters) == 1 else "combined_water_test_required",
        },
        "warnings": warnings, "references": _references(),
    }


def _monitoring(item: dict, source_class: str) -> dict:
    if source_class == "potable":
        return {"material_id": item.get("id"), "name": item.get("name"), "source_class": source_class, "status": "not_required", "density_check_required_daily": False, "qualification_frequency": "not_required", "qualification_due": False, "density_check_due": False, "warnings": []}
    today = dt.datetime.now(dt.UTC).date()
    last_q = _date(item.get("c1602_last_qualification_date"))
    last_d = _date(item.get("c1602_last_density_check_date"))
    density = _num(item.get("density_kg_m3"))
    row_warnings: list[dict] = []
    daily = source_class == "concrete_production"
    density_due = daily and (last_d is None or today - last_d > dt.timedelta(days=1))
    if density_due:
        row_warnings.append(_warning("C1602_DAILY_DENSITY_MONITORING_DUE", "needs_review", f"کنترل روزانه چگالی آب تولیدی «{_name(item)}» ثبت نشده یا منقضی است.", "ASTM C1602/C1602M-22 / ASTM C1603-23"))

    if source_class == "nonpotable":
        days, frequency = 92, "every_3_months_default"
    elif density is None:
        days, frequency = None, "density_required_to_determine_frequency"
        row_warnings.append(_warning("C1602_RECYCLED_WATER_DENSITY_REQUIRED", "needs_review", f"برای تعیین فرکانس Qualification آب تولیدی «{_name(item)}» چگالی ثبت شود.", "ASTM C1602/C1602M-22 / ASTM C1603-23"))
    elif density < 1010.0:
        days, frequency = 183, "every_6_months_default"
    elif density <= 1030.0:
        days, frequency = 31, "monthly_default"
    else:
        days, frequency = 7, "weekly_default"

    qualification_due = days is None or last_q is None or today - last_q > dt.timedelta(days=days)
    next_due = last_q + dt.timedelta(days=days) if last_q is not None and days is not None else None
    if qualification_due:
        row_warnings.append(_warning("C1602_PERFORMANCE_REQUALIFICATION_DUE", "needs_review", f"Qualification عملکردی ASTM C1602 برای آب «{_name(item)}» سررسید/منقضی است.", "ASTM C1602/C1602M-22"))
    method = item.get("c1602_density_monitoring_method")
    if daily and not method:
        row_warnings.append(_warning("C1602_DENSITY_MONITORING_METHOD_MISSING", "needs_review", f"روش پایش چگالی آب تولیدی «{_name(item)}» ثبت نشده است.", "ASTM C1603-23"))
    return {
        "material_id": item.get("id"), "name": item.get("name"), "source_class": source_class,
        "status": "needs_review" if row_warnings else "pass", "density_kg_m3": density,
        "density_check_required_daily": daily, "last_density_check_date": last_d.isoformat() if last_d else None,
        "density_check_due": density_due, "density_monitoring_method": method,
        "last_qualification_date": last_q.isoformat() if last_q else None, "qualification_frequency": frequency,
        "qualification_interval_days": days, "next_qualification_due_date": next_due.isoformat() if next_due else None,
        "qualification_due": qualification_due, "monitoring_evidence_ref": item.get("c1602_monitoring_evidence_ref"), "warnings": row_warnings,
    }


def _source_class(item: dict) -> str:
    explicit = str(item.get("water_source_class") or "").strip().lower()
    if explicit in {"potable", "nonpotable", "concrete_production"}:
        return explicit
    subtype = str(item.get("material_subtype") or "").strip().lower()
    return "concrete_production" if subtype == "wash_water" else "potable" if subtype == "mixing_water" else "nonpotable"


def _chemical_checks(weighted: dict, chloride_limit: float | None) -> list[dict]:
    limits = {"chloride_mg_l": chloride_limit, "sulfate_mg_l": ASTM_C1602_LIMITS["sulfate_mg_l_max"], "alkalis_na2oeq_mg_l": ASTM_C1602_LIMITS["alkalis_na2oeq_mg_l_max"], "total_solids_mg_l": ASTM_C1602_LIMITS["total_solids_mg_l_max"]}
    return [{"parameter": key, "value": round(weighted[key], 3), "limit": limit, "status": "project_limit_not_applicable" if limit is None else "within_optional_limit" if weighted[key] <= limit else "exceeds_optional_limit"} for key, limit in limits.items()]


def _num(value: object, allow_negative: bool = False) -> float | None:
    if value is None or value == "":
        return None
    number = float(value)
    if not allow_negative and number < 0:
        raise ValueError("water compliance values cannot be negative")
    return number


def _date(value: object) -> dt.date | None:
    if value is None or value == "":
        return None
    text = str(value).strip()
    try:
        return dt.date.fromisoformat(text[:10])
    except ValueError:
        return dt.datetime.fromisoformat(text).date()


def _name(item: dict) -> str:
    return str(item.get("name") or "بدون نام")


def _warning(code: str, severity: str, message: str, reference: str) -> dict:
    return {"code": code, "severity": severity, "message": message, "reference": reference}


def _references() -> list[str]:
    return ["ASTM C1602/C1602M-22 - Mixing Water Used in the Production of Hydraulic Cement Concrete", "ASTM C1603-23 - Measurement of Solids in Water", "ASTM C31/C31M", "ASTM C39/C39M", "ASTM C403/C403M"]
