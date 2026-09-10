from __future__ import annotations

ACI_318_OFFICIAL_EVIDENCE = {
    "designation": "ACI CODE-318-25",
    "publication_year": 2025,
    "publisher": "American Concrete Institute",
    "committee": "ACI Committee 318",
    "title": "Building Code for Structural Concrete—Code Requirements and Commentary",
    "pages": 702,
    "public_evidence_scope": {
        "document_identity": "verified",
        "edition_identity": "verified",
        "authority": "verified",
        "general_durability_scope": "verified",
        "numerical_tables_and_acceptance_rules": "not_verified_from_public_metadata",
    },
}

STANDARDS_RULE_EVIDENCE = {
    "ACI318.EXPOSURE.FREEZE_THAW.CLASSIFY": {
        "state": "blocked_authorized_exact_edition_source_required",
        "required_evidence": "exact ACI CODE-318-25 F exposure classification relationship, applicability notes, boundaries, and exceptions",
    },
    "ACI318.EXPOSURE.SULFATE.CLASSIFY": {
        "state": "blocked_authorized_exact_edition_source_required",
        "required_evidence": "exact ACI CODE-318-25 sulfate exposure classification thresholds, source/test basis, boundaries, and applicability notes",
        "related_test_methods_under_audit": ["ASTM C1580", "ASTM D516"],
    },
    "ACI318.EXPOSURE.WATER.CLASSIFY": {
        "state": "blocked_authorized_exact_edition_source_required",
        "required_evidence": "exact ACI CODE-318-25 W exposure classification relationship, boundaries, and applicability notes",
    },
    "ACI318.EXPOSURE.CORROSION.CLASSIFY": {
        "state": "blocked_authorized_exact_edition_source_required",
        "required_evidence": "exact ACI CODE-318-25 C exposure classification relationship, boundaries, and applicability notes",
    },
    "ACI318.DURABILITY.WCM_STRENGTH": {
        "state": "blocked_authorized_exact_edition_source_required",
        "required_evidence": "exact ACI CODE-318-25 durability max-w/cm and minimum-strength requirements with exposure applicability notes",
    },
    "ACI318.DURABILITY.AIR": {
        "state": "blocked_authorized_exact_edition_source_required",
        "required_evidence": "exact ACI CODE-318-25 durability air-content relationship, NMSA nodes, tolerances/notes, and boundary policy",
    },
    "ACI318.DURABILITY.CHLORIDE_LIMIT": {
        "state": "blocked_authorized_exact_edition_source_required",
        "required_evidence": "exact ACI CODE-318-25 chloride limits, member/material applicability, test basis, and exceptions",
    },
    "ACI318.DURABILITY.SULFATE_BINDER": {
        "state": "blocked_authorized_exact_edition_source_required",
        "required_evidence": "exact ACI CODE-318-25 sulfate binder restrictions/alternatives plus applicable ASTM edition and acceptance criteria",
        "related_test_methods_under_audit": ["ASTM C1012/C1012M"],
    },
}


def standards_evidence_is_closed(rule_key: str) -> bool:
    entry = STANDARDS_RULE_EVIDENCE.get(rule_key)
    return bool(entry and entry.get("state") == "verified_exact_edition")
