from __future__ import annotations


def evaluate_aggregate_compliance(materials: dict) -> dict:
    """Evaluate aggregate quality without inventing project-specific acceptance limits.

    Stored grading limits are used for ASTM C136/C33 checks. C117, LA abrasion,
    sulfate soundness, deleterious-material and particle-shape results become
    pass/fail only when an explicit project/specification limit is stored.
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
        fines_check = _limit_check(
            fines,
            fines_limit,
            "ASTM_C117_RESULT_MISSING",
            "C117_PROJECT_LIMIT_MISSING",
            "ASTM_C117_FINER_75UM_EXCEEDS_LIMIT",
            f"نتیجه مواد ریزتر از 75 µm به روش ASTM C117 برای «{_name(item)}» ثبت نشده است.",
            f"نتیجه C117 برای «{_name(item)}» موجود است ولی حد مجاز پروژه/Specification ثبت نشده است.",
            "مواد ریزتر از 75 µm",
            "ASTM C33/C33M + ASTM C117",
        )
        row_warnings.extend(fines_check["warnings"])
        any_fail = any_fail or fines_check["status"] == "fail"
        all_core_complete = all_core_complete and fines_check["status"] == "pass"

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

        abrasion = _advanced_check(item, "la_abrasion_loss_percent", "la_abrasion_limit_percent", "LA_ABRASION_RESULT_MISSING", "LA_ABRASION_PROJECT_LIMIT_MISSING", "LA_ABRASION_EXCEEDS_LIMIT", "افت LA Abrasion", _abrasion_reference(item), required=item.get("material_type") == "coarse_aggregate")
        soundness = _advanced_check(item, "astm_c88_soundness_loss_percent", "soundness_limit_percent", "C88_SOUNDNESS_RESULT_MISSING", "C88_SOUNDNESS_PROJECT_LIMIT_MISSING", "C88_SOUNDNESS_EXCEEDS_LIMIT", "افت Soundness", "ASTM C88/C88M-24 + ASTM C33/C33M-24a", required=False)
        clay_lumps = _advanced_check(item, "astm_c142_clay_lumps_percent", "clay_lumps_limit_percent", "C142_RESULT_MISSING", "C142_PROJECT_LIMIT_MISSING", "C142_CLAY_LUMPS_EXCEEDS_LIMIT", "کلوخه‌های رسی و ذرات سست", "ASTM C142/C142M-17(2023) + ASTM C33/C33M-24a", required=False)
        lightweight = _advanced_check(item, "astm_c123_lightweight_particles_percent", "lightweight_particles_limit_percent", "C123_RESULT_MISSING", "C123_PROJECT_LIMIT_MISSING", "C123_LIGHTWEIGHT_PARTICLES_EXCEEDS_LIMIT", "ذرات سبک", "ASTM C123/C123M-23 + ASTM C33/C33M-24a", required=False)
        flat_elongated = _advanced_check(item, "astm_d4791_flat_elongated_percent", "flat_elongated_limit_percent", "D4791_RESULT_MISSING", "D4791_PROJECT_LIMIT_MISSING", "D4791_FLAT_ELONGATED_EXCEEDS_LIMIT", "ذرات تخت و کشیده", "ASTM D4791 - Flat Particles, Elongated Particles, or Flat and Elongated Particles", required=False)
        fractured = _minimum_check(
            item,
            "astm_d5821_fractured_particles_percent",
            "fractured_particles_min_percent",
            "D5821_RESULT_MISSING",
            "D5821_PROJECT_MINIMUM_MISSING",
            "D5821_FRACTURED_PARTICLES_BELOW_MINIMUM",
            "ذرات شکسته",
            "ASTM D5821 - Determining the Percentage of Fractured Particles in Coarse Aggregate",
        )

        for check in (abrasion, soundness, clay_lumps, lightweight, flat_elongated, fractured):
            row_warnings.extend(check["warnings"])
            any_fail = any_fail or check["status"] == "fail"
            if check.get("required"):
                all_core_complete = all_core_complete and check["status"] == "pass"

        shape_statuses = [flat_elongated["status"], fractured["status"]]
        shape_status = "fail" if "fail" in shape_statuses else "needs_review" if "needs_review" in shape_statuses else "pass" if "pass" in shape_statuses else "not_checked"
        placement_advisory = _placement_advisory(shape_status, gradation_status)

        source_status = "fail" if any(w["severity"] == "fail" for w in row_warnings) else "needs_review" if row_warnings else "pass"
        warnings.extend(row_warnings)
        sources.append({
            "material_id": item.get("id"),
            "name": item.get("name"),
            "material_type": item.get("material_type"),
            "aggregate_role": item.get("aggregate_role"),
            "standard": item.get("aggregate_quality_standard") or "ASTM C33/C33M-24a",
            "status": source_status,
            "gradation": {"status": gradation_status, "checked_sieve_count": len(gradation_checked), "failure_count": len(gradation_failures), "failures": gradation_failures, "fineness_modulus": fm},
            "fines_75um": {"status": fines_check["status"], "astm_c117_percent": fines, "limit_percent": fines_limit},
            "physical_properties": {"data_complete": physical_complete, "ssd_specific_gravity": sg, "absorption_percent": absorption, "rodded_unit_weight_kg_m3": unit_weight},
            "abrasion": {"status": abrasion["status"], "method": item.get("la_abrasion_method"), "loss_percent": abrasion["value"], "limit_percent": abrasion["limit"]},
            "soundness": {"status": soundness["status"], "salt": item.get("soundness_salt"), "loss_percent": soundness["value"], "limit_percent": soundness["limit"]},
            "deleterious_materials": {
                "clay_lumps": {"status": clay_lumps["status"], "percent": clay_lumps["value"], "limit_percent": clay_lumps["limit"]},
                "lightweight_particles": {"status": lightweight["status"], "percent": lightweight["value"], "limit_percent": lightweight["limit"]},
            },
            "shape_texture": {
                "status": shape_status,
                "flat_elongated": {"status": flat_elongated["status"], "percent": flat_elongated["value"], "limit_percent": flat_elongated["limit"], "dimensional_ratio": item.get("astm_d4791_dimensional_ratio")},
                "fractured_particles": {"status": fractured["status"], "percent": fractured["value"], "minimum_percent": fractured["limit"], "fractured_faces_required": item.get("fractured_faces_required")},
                "placement_advisory": placement_advisory,
            },
            "fractured_face_percent": _optional_number(item.get("fractured_face_percent")),
            "evidence_ref": item.get("shape_texture_evidence_ref") or item.get("advanced_aggregate_evidence_ref") or item.get("aggregate_test_evidence_ref"),
        })

    status = "fail" if any_fail else "needs_review" if not all_core_complete or any(row["status"] == "needs_review" for row in sources) else "pass"
    return {"status": status, "data_complete": status == "pass", "sources": sources, "warnings": warnings, "references": _references()}


def _limit_check(value: float | None, limit: float | None, missing_code: str, limit_code: str, exceed_code: str, missing_message: str, limit_message: str, label: str, reference: str) -> dict:
    warnings: list[dict] = []
    if value is None:
        warnings.append(_warning(missing_code, "needs_review", missing_message, reference))
        return {"status": "needs_review", "value": None, "limit": limit, "warnings": warnings}
    if limit is None:
        warnings.append(_warning(limit_code, "needs_review", limit_message, reference))
        return {"status": "needs_review", "value": value, "limit": None, "warnings": warnings}
    if value > limit:
        warnings.append(_warning(exceed_code, "fail", f"{label} برابر {value:g}% و بیشتر از حد ثبت‌شده {limit:g}% است.", reference))
        return {"status": "fail", "value": value, "limit": limit, "warnings": warnings}
    return {"status": "pass", "value": value, "limit": limit, "warnings": warnings}


def _advanced_check(item: dict, value_key: str, limit_key: str, missing_code: str, limit_code: str, exceed_code: str, label: str, reference: str, required: bool) -> dict:
    value = _optional_number(item.get(value_key))
    limit = _optional_number(item.get(limit_key))
    if value is None and not required:
        return {"status": "not_checked", "required": False, "value": None, "limit": limit, "warnings": []}
    result = _limit_check(value, limit, missing_code, limit_code, exceed_code, f"نتیجه {label} برای «{_name(item)}» ثبت نشده است.", f"نتیجه {label} برای «{_name(item)}» موجود است ولی حد پروژه/Specification ثبت نشده است.", label, reference)
    result["required"] = required
    return result


def _minimum_check(item: dict, value_key: str, minimum_key: str, missing_code: str, limit_code: str, below_code: str, label: str, reference: str) -> dict:
    value = _optional_number(item.get(value_key))
    minimum = _optional_number(item.get(minimum_key))
    if value is None:
        return {"status": "not_checked", "required": False, "value": None, "limit": minimum, "warnings": []}
    if minimum is None:
        return {"status": "needs_review", "required": False, "value": value, "limit": None, "warnings": [_warning(limit_code, "needs_review", f"نتیجه {label} برای «{_name(item)}» موجود است ولی حداقل پروژه/Specification ثبت نشده است.", reference)]}
    if value < minimum:
        return {"status": "fail", "required": False, "value": value, "limit": minimum, "warnings": [_warning(below_code, "fail", f"{label} برابر {value:g}% و کمتر از حداقل ثبت‌شده {minimum:g}% است.", reference)]}
    return {"status": "pass", "required": False, "value": value, "limit": minimum, "warnings": []}


def _placement_advisory(shape_status: str, gradation_status: str) -> dict:
    if shape_status == "fail" or gradation_status == "fail":
        return {"status": "review_required", "message": "شکل ذرات یا دانه‌بندی با حدود ثبت‌شده سازگار نیست؛ کارایی و قابلیت پمپاژ باید پس از اصلاح مصالح/ترکیب مجدداً ارزیابی شود."}
    if shape_status in {"needs_review", "not_checked"}:
        return {"status": "needs_review", "message": "برای نتیجه‌گیری درباره اثر شکل و بافت بر کارایی/پمپاژ، حدود پروژه و داده D4791/D5821 باید کامل شوند؛ نرم‌افزار اثر عددی فرض نمی‌کند."}
    return {"status": "acceptable_input", "message": "کنترل‌های ثبت‌شده شکل ذرات در حدود پروژه قرار دارند؛ پذیرش نهایی پمپاژ همچنان به دانه‌بندی ترکیبی، خمیر و آزمون مخلوط وابسته است."}


def _abrasion_reference(item: dict) -> str:
    method = str(item.get("la_abrasion_method") or "").strip().lower()
    if method == "astm_c535":
        return "ASTM C535-16(2024) + ASTM C33/C33M-24a"
    return "ASTM C131/C131M-20 + ASTM C33/C33M-24a"


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
        "ASTM C33/C33M-24a - Concrete Aggregates",
        "ASTM C136/C136M-25 - Sieve Analysis of Fine and Coarse Aggregates",
        "ASTM C117-23 - Materials Finer than 75-µm Sieve by Washing",
        "ASTM C127-25 - Relative Density and Absorption of Coarse Aggregate",
        "ASTM C128-25 - Relative Density and Absorption of Fine Aggregate",
        "ASTM C29/C29M-23 - Bulk Density and Voids in Aggregate",
        "ASTM C131/C131M-20 - Resistance to Degradation of Small-Size Coarse Aggregate",
        "ASTM C535-16(2024) - Resistance to Degradation of Large-Size Coarse Aggregate",
        "ASTM C88/C88M-24 - Soundness of Aggregates by Sodium or Magnesium Sulfate",
        "ASTM C142/C142M-17(2023) - Clay Lumps and Friable Particles in Aggregates",
        "ASTM C123/C123M-23 - Lightweight Particles in Aggregate",
        "ASTM D4791 - Flat Particles, Elongated Particles, or Flat and Elongated Particles in Coarse Aggregate",
        "ASTM D5821 - Determining the Percentage of Fractured Particles in Coarse Aggregate",
    ]
