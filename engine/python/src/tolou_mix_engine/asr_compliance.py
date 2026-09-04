from __future__ import annotations


def evaluate_asr_compliance(materials: dict, binder_system: dict) -> dict:
    """Evaluate alkali loading, aggregate ASR evidence and mitigation qualification.

    ASTM C1260/C1293/C1567 results are treated as engineering evidence. The engine does not
    declare an aggregate innocuous solely from missing or low binder alkali data.
    """
    warnings: list[dict] = []
    binders = list(materials.get("cementitious") or [])
    aggregates = list(materials.get("aggregates") or [])
    components = list(binder_system.get("components") or [])
    raw_by_id = {str(item.get("id")): item for item in binders if item.get("id")}

    alkali_kg_m3 = 0.0
    binder_data_complete = bool(components)
    binder_rows: list[dict] = []
    for component in components:
        raw = raw_by_id.get(str(component.get("material_id")), {})
        alkali = _optional_percent(raw.get("alkali_percent"))
        mass = float(component.get("mass_kg_m3") or 0.0)
        if alkali is None:
            binder_data_complete = False
            warnings.append({
                "code": "BINDER_NA2OEQ_MISSING",
                "severity": "needs_review",
                "message": f"Na₂Oeq ماده سیمانی «{component.get('name') or 'بدون نام'}» ثبت نشده است.",
                "reference": "Mill certificate / cementitious material chemical analysis",
            })
            contribution = None
        else:
            contribution = mass * alkali / 100.0
            alkali_kg_m3 += contribution
        binder_rows.append({
            "material_id": component.get("material_id"),
            "name": component.get("name"),
            "mass_kg_m3": round(mass, 3),
            "na2oeq_percent": alkali,
            "na2oeq_kg_m3": round(contribution, 6) if contribution is not None else None,
        })

    aggregate_rows: list[dict] = []
    aggregate_data_complete = bool(aggregates)
    any_reactive = False
    any_unknown = False
    for item in aggregates:
        assessment = _assess_aggregate(item)
        aggregate_rows.append(assessment)
        if assessment["status"] == "reactive":
            any_reactive = True
        if assessment["status"] in {"unknown", "needs_review"}:
            any_unknown = True
            aggregate_data_complete = False
            warnings.append({
                "code": "ASR_AGGREGATE_REACTIVITY_UNRESOLVED",
                "severity": "needs_review",
                "message": f"وضعیت ASR سنگدانه «{item.get('name') or 'بدون نام'}» قطعی نیست.",
                "reference": "ASTM C1260 / ASTM C1293 / documented field performance",
            })

    mitigation = _assess_mitigation(binders, any_reactive)
    warnings.extend(mitigation["warnings"])

    if any_reactive and mitigation["status"] == "fail":
        status = "fail"
    elif not binder_data_complete or not aggregate_data_complete or mitigation["status"] == "needs_review" or any_unknown:
        status = "needs_review"
    elif (any_reactive and mitigation["status"] == "pass") or not any_reactive:
        status = "pass"
    else:
        status = "needs_review"

    return {
        "status": status,
        "binder_alkali": {
            "data_complete": binder_data_complete,
            "total_na2oeq_kg_m3": round(alkali_kg_m3, 6),
            "components": binder_rows,
            "scope_note": "Na₂Oeq loading is reported as a design indicator; acceptance requires aggregate reactivity/mitigation evidence.",
        },
        "aggregate_reactivity": {
            "data_complete": aggregate_data_complete,
            "any_reactive": any_reactive,
            "sources": aggregate_rows,
        },
        "mitigation": mitigation,
        "warnings": warnings,
        "references": [
            "ASTM C1260 - Potential alkali reactivity of aggregates (mortar-bar method)",
            "ASTM C1293 - Determination of length change of concrete due to alkali-silica reaction",
            "ASTM C1567 - Potential alkali-silica reactivity of combinations of cementitious materials and aggregate",
            "ASTM C1778 - Guide for reducing the risk of deleterious alkali-aggregate reaction in concrete",
        ],
    }


def _assess_aggregate(item: dict) -> dict:
    declared = str(item.get("asr_reactivity_class") or "").strip().lower()
    c1260 = _optional_percent(item.get("astm_c1260_expansion_14d_percent"))
    c1293 = _optional_percent(item.get("astm_c1293_expansion_1y_percent"))
    method = item.get("asr_qualification_method")
    evidence = item.get("asr_performance_evidence_ref")

    status = "unknown"
    basis = "no evidence"
    if c1293 is not None:
        status = "nonreactive" if c1293 <= 0.04 else "reactive"
        basis = "ASTM C1293 1-year expansion"
    elif c1260 is not None:
        if c1260 < 0.10:
            status = "nonreactive"
        elif c1260 > 0.20:
            status = "reactive"
        else:
            status = "needs_review"
        basis = "ASTM C1260 14-day expansion"
    elif declared in {"nonreactive", "innocuous"}:
        status = "nonreactive" if evidence or method else "needs_review"
        basis = "declared classification"
    elif declared in {"reactive", "potentially_reactive", "deleterious"}:
        status = "reactive"
        basis = "declared classification"

    return {
        "material_id": item.get("id"),
        "name": item.get("name"),
        "status": status,
        "basis": basis,
        "declared_class": declared or None,
        "astm_c1260_expansion_14d_percent": c1260,
        "astm_c1293_expansion_1y_percent": c1293,
        "qualification_method": method,
        "evidence_ref": evidence,
    }


def _assess_mitigation(binders: list[dict], reactive: bool) -> dict:
    warnings: list[dict] = []
    if not reactive:
        return {"status": "not_required", "qualified": False, "best_c1567_expansion_14d_percent": None, "warnings": warnings}

    values = []
    evidence = False
    for item in binders:
        value = _optional_percent(item.get("astm_c1567_expansion_14d_percent"))
        if value is not None:
            values.append(value)
        if item.get("asr_performance_evidence_ref"):
            evidence = True

    best = min(values) if values else None
    if best is not None and best < 0.10:
        return {"status": "pass", "qualified": True, "best_c1567_expansion_14d_percent": best, "warnings": warnings}
    if best is not None and best >= 0.10:
        warnings.append({
            "code": "ASR_MITIGATION_C1567_NOT_EFFECTIVE",
            "severity": "fail",
            "message": f"نتیجه ASTM C1567 برای سیستم کاهش ASR برابر {best:.3f}% است و معیار محافظه‌کارانه 0.10% را برآورده نمی‌کند.",
            "reference": "ASTM C1567 / project ASR mitigation criteria",
        })
        return {"status": "fail", "qualified": False, "best_c1567_expansion_14d_percent": best, "warnings": warnings}

    warnings.append({
        "code": "ASR_MITIGATION_QUALIFICATION_REQUIRED",
        "severity": "needs_review",
        "message": "سنگدانه واکنش‌زا شناسایی شده ولی اثربخشی سیستم سیمانی/SCM با ASTM C1567 یا مدرک عملکرد معتبر تأیید نشده است.",
        "reference": "ASTM C1567 / ASTM C1778",
    })
    return {"status": "needs_review", "qualified": evidence, "best_c1567_expansion_14d_percent": None, "warnings": warnings}


def _optional_percent(value: object) -> float | None:
    if value is None or value == "":
        return None
    number = float(value)
    if number < 0:
        raise ValueError("percentage cannot be negative")
    return number
