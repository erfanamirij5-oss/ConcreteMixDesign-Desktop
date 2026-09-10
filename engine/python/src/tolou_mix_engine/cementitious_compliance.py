from __future__ import annotations

DIRECT_SULFATE_DESIGNATIONS = {
    "S1": (
        ("C150", "TYPEII"),
        ("C595", "MS"),
        ("C1157", "MS"),
    ),
    "S2": (
        ("C150", "TYPEV"),
        ("C595", "HS"),
        ("C1157", "HS"),
    ),
}

# G02B safety boundary: these legacy recognition routes are not promoted to a
# standards-compliance PASS until the exact ACI 318-25 relationship, applicable
# ASTM edition and acceptance criteria are backed by authorized evidence and
# independent golden/boundary tests.
SULFATE_ACCEPTANCE_RELATIONSHIP_VERIFIED = False


def evaluate_cementitious_compliance(materials: list[dict], durability: dict) -> dict:
    """Evaluate cementitious product traceability and sulfate-exposure compatibility.

    Existing designations and qualification evidence remain discoverable, but G02B does
    not allow them to produce an automatic standards-compliance PASS until exact-edition
    ACI/ASTM acceptance evidence is closed. S3 always remains an engineering review item.
    """
    binders = [item for item in materials if str(item.get("material_type")) in {"cement", "scm"}]
    sulfate_class = str((durability.get("exposure_classes") or {}).get("sulfate") or "S0")
    warnings: list[dict] = []
    product_checks = [_check_product_standard(item) for item in binders]
    for check in product_checks:
        warning = check.get("warning")
        if warning:
            warnings.append(warning)

    if not binders:
        warnings.append(
            {
                "code": "CEMENTITIOUS_SYSTEM_MISSING",
                "severity": "fail",
                "message": "هیچ سیمان یا SCM برای کنترل دوام سیستم سیمانی ثبت نشده است.",
                "reference": "ACI CODE-318-25 Table 19.3.2.1",
            }
        )
        return _response("fail", sulfate_class, product_checks, None, warnings)

    if sulfate_class == "S0":
        return _response(_status_from_warnings(warnings), sulfate_class, product_checks, "no_sulfate_restriction", warnings)

    direct = _find_direct_sulfate_designation(binders, sulfate_class)
    qualified = _find_qualified_combination(binders, sulfate_class)

    if sulfate_class == "S1":
        if direct:
            return _recognized_unverified_response(sulfate_class, product_checks, "direct_designation", warnings, direct)
        if qualified["qualified"]:
            return _recognized_unverified_response(sulfate_class, product_checks, "qualified_combination", warnings, qualified)
        warnings.append(
            {
                "code": "S1_CEMENTITIOUS_SYSTEM_NOT_QUALIFIED",
                "severity": "needs_review",
                "message": "برای S1 باید سیمان با Designation مقاوم به سولفات متوسط یا یک ترکیب واجد مدرک Qualification ثبت شود.",
                "reference": "ACI CODE-318-25 Table 19.3.2.1",
            }
        )
        return _response("needs_review", sulfate_class, product_checks, "unverified", warnings)

    if sulfate_class == "S2":
        if direct:
            return _recognized_unverified_response(sulfate_class, product_checks, "direct_designation", warnings, direct)
        if qualified["qualified"] and qualified["resistance_class"] == "HS":
            return _recognized_unverified_response(sulfate_class, product_checks, "qualified_combination", warnings, qualified)
        warnings.append(
            {
                "code": "S2_HIGH_SULFATE_RESISTANCE_NOT_VERIFIED",
                "severity": "fail",
                "message": "برای S2 سیستم سیمانی با مقاومت سولفاتی بالا (HS/Type V) یا ترکیب جایگزین واجد Qualification معتبر لازم است.",
                "reference": "ACI CODE-318-25 Table 19.3.2.1",
            }
        )
        return _response("fail", sulfate_class, product_checks, "unverified", warnings)

    # S3: never auto-pass. Capture evidence and force explicit engineering option selection.
    if not qualified["qualified"] or qualified["resistance_class"] not in {"HS", "qualified_combination"}:
        warnings.append(
            {
                "code": "S3_CEMENTITIOUS_QUALIFICATION_INCOMPLETE",
                "severity": "fail",
                "message": "برای S3 باید سیستم سیمانی مقاوم به سولفات با Qualification مستند ثبت شود؛ صرف نام SCM یا سیمان برای تأیید کافی نیست.",
                "reference": "ACI CODE-318-25 Table 19.3.2.1 and 26.4.2.2(c)",
            }
        )
        return _response("fail", sulfate_class, product_checks, "unverified", warnings, qualified)

    warnings.append(
        {
            "code": "S3_OPTION_ENGINEERING_SELECTION_REQUIRED",
            "severity": "needs_review",
            "message": "مدارک Qualification برای S3 ثبت شده‌اند، اما انتخاب صریح گزینه ACI و پذیرش نهایی سیستم سیمانی باید توسط مهندس انجام شود.",
            "reference": "ACI CODE-318-25 Table 19.3.2.1 and 26.4.2.2(c)",
        }
    )
    return _response("needs_review", sulfate_class, product_checks, "qualified_pending_engineer_selection", warnings, qualified)


def _recognized_unverified_response(
    sulfate_class: str,
    product_checks: list[dict],
    route: str,
    warnings: list[dict],
    evidence: object,
) -> dict:
    if SULFATE_ACCEPTANCE_RELATIONSHIP_VERIFIED:
        return _response(_status_from_warnings(warnings), sulfate_class, product_checks, route, warnings, evidence)
    guarded_warnings = list(warnings)
    guarded_warnings.append(
        {
            "code": "SULFATE_ACCEPTANCE_RELATIONSHIP_UNVERIFIED",
            "severity": "needs_review",
            "message": (
                "Designation/qualification شناسایی شد، اما رابطه پذیرش ACI 318-25 با edition دقیق استاندارد ASTM و معیار پذیرش مربوطه "
                "هنوز در G02B با evidence مجاز و golden tests مستقل بسته نشده است؛ بنابراین PASS خودکار مجاز نیست."
            ),
            "reference": "G02B exact-edition verification policy; ACI CODE-318-25 / applicable ASTM product or performance standard",
        }
    )
    response = _response("needs_review", sulfate_class, product_checks, route, guarded_warnings, evidence)
    response["acceptance_relationship_state"] = "blocked_exact_edition_evidence_required"
    return response


def _check_product_standard(item: dict) -> dict:
    subtype = str(item.get("material_subtype") or item.get("material_type") or "")
    designation = str(item.get("standard_designation") or "").strip()
    normalized = _normalize(designation)
    expected_tokens: tuple[str, ...] | None
    if subtype in {"portland_cement", "blended_cement", "cement"}:
        expected_tokens = ("C150", "C595", "C1157")
    elif subtype == "slag_cement":
        expected_tokens = ("C989",)
    elif subtype in {"fly_ash", "natural_pozzolan"}:
        expected_tokens = ("C618",)
    elif subtype == "silica_fume":
        expected_tokens = ("C1240",)
    else:
        expected_tokens = None

    base = {
        "material_id": item.get("id"),
        "name": item.get("name"),
        "material_subtype": subtype,
        "standard_designation": designation or None,
    }
    if expected_tokens is None:
        return {
            **base,
            "status": "needs_review",
            "expected_standard": "project specification / applicable product standard",
            "warning": {
                "code": "CEMENTITIOUS_STANDARD_PROJECT_REVIEW",
                "severity": "needs_review",
                "message": f"استاندارد محصول «{item.get('name') or 'بدون نام'}» باید طبق مشخصات پروژه و مدارک سازنده تأیید شود.",
                "reference": "Project specification / manufacturer qualification data",
            },
        }
    if any(token in normalized for token in expected_tokens):
        return {**base, "status": "pass", "expected_standard": " / ".join(f"ASTM {token}" for token in expected_tokens)}
    return {
        **base,
        "status": "needs_review",
        "expected_standard": " / ".join(f"ASTM {token}" for token in expected_tokens),
        "warning": {
            "code": "CEMENTITIOUS_STANDARD_DESIGNATION_MISSING_OR_MISMATCHED",
            "severity": "needs_review",
            "message": f"Designation قابل ردیابی برای ماده سیمانی «{item.get('name') or 'بدون نام'}» با استاندارد مورد انتظار همخوان نیست.",
            "reference": "ASTM product specification as applicable",
        },
    }


def _find_direct_sulfate_designation(binders: list[dict], sulfate_class: str) -> dict | None:
    rules = DIRECT_SULFATE_DESIGNATIONS.get(sulfate_class, ())
    for item in binders:
        normalized = _normalize(str(item.get("standard_designation") or ""))
        for standard, property_token in rules:
            if standard in normalized and property_token in normalized:
                return {
                    "material_id": item.get("id"),
                    "name": item.get("name"),
                    "standard_designation": item.get("standard_designation"),
                    "matched_requirement": f"{standard} {property_token}",
                }
    return None


def _find_qualified_combination(binders: list[dict], sulfate_class: str) -> dict:
    required_resistance = "MS" if sulfate_class == "S1" else "HS"
    candidates = []
    for item in binders:
        resistance = str(item.get("sulfate_resistance_class") or "").strip()
        method = str(item.get("sulfate_qualification_method") or "").strip()
        evidence = str(item.get("sulfate_performance_evidence_ref") or "").strip()
        exp6 = item.get("astm_c1012_expansion_6m_percent")
        exp12 = item.get("astm_c1012_expansion_12m_percent")
        method_valid = method in {"astm_c1012", "documented_service_record", "engineer_approved_combination"}
        resistance_valid = resistance in {required_resistance, "qualified_combination"} or (required_resistance == "MS" and resistance == "HS")
        c1012_data_ok = method != "astm_c1012" or exp6 is not None or exp12 is not None
        if resistance_valid and method_valid and evidence and c1012_data_ok:
            candidates.append(
                {
                    "material_id": item.get("id"),
                    "name": item.get("name"),
                    "resistance_class": resistance,
                    "qualification_method": method,
                    "evidence_ref": evidence,
                    "astm_c1012_expansion_6m_percent": exp6,
                    "astm_c1012_expansion_12m_percent": exp12,
                }
            )
    if not candidates:
        return {"qualified": False, "resistance_class": None, "candidates": []}
    resistance = "HS" if any(row["resistance_class"] == "HS" for row in candidates) else candidates[0]["resistance_class"]
    return {"qualified": True, "resistance_class": resistance, "candidates": candidates}


def _normalize(value: str) -> str:
    return value.upper().replace(" ", "").replace("-", "").replace("/", "")


def _status_from_warnings(warnings: list[dict]) -> str:
    if any(item.get("severity") == "fail" for item in warnings):
        return "fail"
    if warnings:
        return "needs_review"
    return "pass"


def _response(status: str, sulfate_class: str, product_checks: list[dict], route: str | None, warnings: list[dict], evidence: object = None) -> dict:
    return {
        "status": status,
        "sulfate_exposure_class": sulfate_class,
        "compliance_route": route,
        "product_standard_checks": product_checks,
        "qualification_evidence": evidence,
        "warnings": warnings,
        "references": [
            "ACI CODE-318-25 Table 19.3.2.1",
            "ACI CODE-318-25 26.4.2.2(c)",
            "ASTM C150/C150M",
            "ASTM C595/C595M",
            "ASTM C1157/C1157M",
            "ASTM C989/C989M",
            "ASTM C618",
            "ASTM C1240",
            "ASTM C1012/C1012M",
        ],
    }
