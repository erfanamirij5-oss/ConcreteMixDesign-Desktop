from __future__ import annotations


def evaluate_aggregate_compliance(materials: dict) -> dict:
    """Evaluate aggregate quality data without inventing project-specific ASTM C33 limits.

    Grading pass/fail is based on the stored lower/upper limits for each sieve. ASTM C117
    material finer than 75 µm is checked only when a project/specification limit is
    explicitly stored, because the applicable C33 limit depends on aggregate/use.
    """
    aggregates = list(materials.get("aggregates") or [])
    warnings: list[dict] = []
    sources: list[dict] = []

    if not aggregates:
        return {
            "status": "needs_review",
            "data_complete": False,
            "sources": [],
            "warnings": [{
                "code": "AGGREGATE_QUALITY_SOURCE_MISSING",
                "severity": "needs_review",
                "message": "هیچ منبع سنگدانه‌ای برای کنترل کیفیت ثبت نشده است.",
                "reference": "ASTM C33/C33M",
            }],
            "references": _references(),
        }

    any_fail = False
    all_core_complete = True

    for item in aggregates:
        row_warnings: list[dict] = []
        gradation_rows = list(item.get("gradation_rows") or [])
        gradation_checked = [row for row in gradation_rows if row.get("standard_min") is not None and row.get("standard_max") is not None]
        gradation_failures = [row for row in gradation_checked if float(row.get("percent_passing", 0)) < float(row["standard_min"]) or float(row.get("percent_passing", 0)) > float(row["standard_max"])]
        gradation_status = "pass" if gradation_checked and not gradation_failures else "fail" if gradation_failures else "needs_review"
        if gradation_status == "fail":
            any_fail = True
            row_warnings.append(_warning("AGGREGATE_GRADATION_OUTSIDE_LIMITS", "fail", f"دانه‌بندی «{_name(item)}» در یک یا چند الک خارج از حدود ثبت‌شده است.", "ASTM C33/C33M + ASTM C136/C136M"))
        elif gradation_status == "needs_review":
            all_core_complete = False
            row_warnings.append(_warning("AGGREGATE_GRADATION_LIMITS_MISSING", "needs_review", f"برای «{_name(item)}» حدود پایین/بالای دانه‌بندی کامل ثبت نشده است.", "ASTM C33/C33M + ASTM C136/C136M"))

        fines = _optional_number(item.get("astm_c117_finer_75um_percent"))
        fines_limit = _optional_number(item.get("finer_75um_limit_percent"))
        if fines is None:
            fines_status = "needs_review"
            all_core_complete = False
            row_warnings.append(_warning("ASTM_C117_RESULT_MISSING", "needs_review", f"نتیجه مواد ریزتر از 75 µm به روش ASTM C117 برای «{_name(item)}» ثبت نشده است.", "ASTM C117"))
        elif fines_limit is None:
            fines_status = "needs_review"
            all_core_complete = False
            row_warnings.append(_warning("C117_PROJECT_LIMIT_MISSING", "needs_review", f"نتیجه C117 برای «{_name(item)}» موجود است ولی حد مجاز پروژه/Specification ثبت نشده است.", "ASTM C33/C33M + ASTM C117"))
        elif fines > fines_limit:
            fines_status = "fail"
            any_fail = True
            row_warnings.append(_warning("ASTM_C117_FINER_75UM_EXCEEDS_LIMIT", "fail", f"مواد ریزتر از 75 µm در «{_name(item)}» برابر {fines:g}% و بیشتر از حد ثبت‌شده {fines_limit:g}% است.", "ASTM C33/C33M + ASTM C117"))
        else:
            fines_status = "pass"

        sg = _optional_number(item.get("astm_c127_c128_ssd_specific_gravity"))
        if sg is None:
            sg = _optional_number(item.get("specific_gravity"))
        absorption = _optional_number(item.get("astm_c127_c128_absorption_percent"))
        if absorption is None:
            absorption = _optional_number(item.get("absorption_percent"))
        unit_weight = _optional_number(item.get("astm_c29_rodded_unit_weight_kg_m3"))
        if unit_weight is None:
            unit_weight = _optional_number(item.get("unit_weight_kg_m3"))

        physical_complete = sg is not None and absorption is not None
        if item.get("material_type") == "coarse_aggregate":
            physical_complete = physical_complete and unit_weight is not None
        if not physical_complete:
            all_core_complete = False
            row_warnings.append(_warning("AGGREGATE_PHYSICAL_PROPERTIES_INCOMPLETE", "needs_review", f"وزن مخصوص/جذب و در صورت نیاز وزن واحد «{_name(item)}» کامل نیست.", "ASTM C127/C128 + ASTM C29/C29M"))

        fm = _optional_number(item.get("fineness_modulus")) if item.get("material_type") == "fine_aggregate" else None
        if item.get("material_type") == "fine_aggregate" and fm is None:
            all_core_complete = False
            row_warnings.append(_warning("FINE_AGGREGATE_FM_INCOMPLETE", "needs_review", f"مدول نرمی «{_name(item)}» از ردیف‌های C136 قابل محاسبه نیست.", "ASTM C136/C136M"))

        source_status = "fail" if any(w["severity"] == "fail" for w in row_warnings) else "needs_review" if row_warnings else "pass"
        warnings.extend(row_warnings)
        sources.append({
            "material_id": item.get("id"),
            "name": item.get("name"),
            "material_type": item.get("material_type"),
            "aggregate_role": item.get("aggregate_role"),
            "standard": item.get("aggregate_quality_standard") or "ASTM C33/C33M",
            "status": source_status,
            "gradation": {
                "status": gradation_status,
                "checked_sieve_count": len(gradation_checked),
                "failure_count": len(gradation_failures),
                "failures": gradation_failures,
                "fineness_modulus": fm,
            },
            "fines_75um": {"status": fines_status, "astm_c117_percent": fines, "limit_percent": fines_limit},
            "physical_properties": {
                "data_complete": physical_complete,
                "ssd_specific_gravity": sg,
                "absorption_percent": absorption,
                "rodded_unit_weight_kg_m3": unit_weight,
            },
            "fractured_face_percent": _optional_number(item.get("fractured_face_percent")),
            "evidence_ref": item.get("aggregate_test_evidence_ref"),
        })

    status = "fail" if any_fail else "needs_review" if not all_core_complete or any(row["status"] == "needs_review" for row in sources) else "pass"
    return {"status": status, "data_complete": status == "pass", "sources": sources, "warnings": warnings, "references": _references()}


def _optional_number(value: object) -> float | None:
    if value is None or value == "":
        return None
    number = float(value)
    if number < 0:
        raise ValueError("aggregate quality values cannot be negative")
    return number


def _name(item: dict) -> str:
    return str(item.get("name") or "سنگدانه بدون نام")


def _warning(code: str, severity: str, message: str, reference: str) -> dict:
    return {"code": code, "severity": severity, "message": message, "reference": reference}


def _references() -> list[str]:
    return [
        "ASTM C33/C33M - Concrete Aggregates",
        "ASTM C136/C136M - Sieve Analysis of Fine and Coarse Aggregates",
        "ASTM C117 - Materials Finer than 75-µm Sieve by Washing",
        "ASTM C127 - Relative Density and Absorption of Coarse Aggregate",
        "ASTM C128 - Relative Density and Absorption of Fine Aggregate",
        "ASTM C29/C29M - Bulk Density and Voids in Aggregate",
    ]
