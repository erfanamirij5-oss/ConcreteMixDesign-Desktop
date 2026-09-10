from tolou_mix_engine.cementitious_compliance import evaluate_cementitious_compliance


def durability(sulfate: str) -> dict:
    return {"exposure_classes": {"sulfate": sulfate}}


def test_s1_direct_designation_is_recognized_but_not_auto_passed_before_evidence_closure():
    materials = [{"id": "c1", "material_type": "cement", "material_subtype": "portland_cement", "name": "Type II", "standard_designation": "ASTM C150 Type II"}]
    result = evaluate_cementitious_compliance(materials, durability("S1"))
    assert result["status"] == "needs_review"
    assert result["compliance_route"] == "direct_designation"
    assert result["qualification_evidence"]["matched_requirement"] == "C150 TYPEII"
    assert result["acceptance_relationship_state"] == "blocked_exact_edition_evidence_required"
    assert any(item["code"] == "SULFATE_ACCEPTANCE_RELATIONSHIP_UNVERIFIED" for item in result["warnings"])


def test_s2_hs_designation_is_recognized_but_not_auto_passed_before_evidence_closure():
    materials = [{"id": "c1", "material_type": "cement", "material_subtype": "blended_cement", "name": "HS cement", "standard_designation": "ASTM C595 HS"}]
    result = evaluate_cementitious_compliance(materials, durability("S2"))
    assert result["status"] == "needs_review"
    assert result["qualification_evidence"]["matched_requirement"] == "C595 HS"
    assert result["acceptance_relationship_state"] == "blocked_exact_edition_evidence_required"


def test_s2_unverified_system_fails():
    materials = [{"id": "c1", "material_type": "cement", "material_subtype": "portland_cement", "name": "Type I", "standard_designation": "ASTM C150 Type I"}]
    result = evaluate_cementitious_compliance(materials, durability("S2"))
    assert result["status"] == "fail"
    assert any(item["code"] == "S2_HIGH_SULFATE_RESISTANCE_NOT_VERIFIED" for item in result["warnings"])


def test_s2_c1012_qualified_combination_is_traceable_but_not_auto_passed_before_evidence_closure():
    materials = [
        {"id": "c1", "material_type": "cement", "material_subtype": "portland_cement", "name": "Base cement", "standard_designation": "ASTM C150 Type I"},
        {
            "id": "s1",
            "material_type": "scm",
            "material_subtype": "slag_cement",
            "name": "Qualified slag blend",
            "standard_designation": "ASTM C989",
            "sulfate_resistance_class": "HS",
            "sulfate_qualification_method": "astm_c1012",
            "astm_c1012_expansion_12m_percent": 0.04,
            "sulfate_performance_evidence_ref": "LAB-C1012-2026-17",
        },
    ]
    result = evaluate_cementitious_compliance(materials, durability("S2"))
    assert result["status"] == "needs_review"
    assert result["compliance_route"] == "qualified_combination"
    assert result["acceptance_relationship_state"] == "blocked_exact_edition_evidence_required"
    assert result["qualification_evidence"]["qualified"] is True


def test_s3_never_auto_passes_even_with_qualification():
    materials = [{
        "id": "c1",
        "material_type": "cement",
        "material_subtype": "blended_cement",
        "name": "Qualified HS system",
        "standard_designation": "ASTM C595 HS",
        "sulfate_resistance_class": "HS",
        "sulfate_qualification_method": "astm_c1012",
        "astm_c1012_expansion_12m_percent": 0.03,
        "sulfate_performance_evidence_ref": "LAB-C1012-S3",
    }]
    result = evaluate_cementitious_compliance(materials, durability("S3"))
    assert result["status"] == "needs_review"
    assert result["compliance_route"] == "qualified_pending_engineer_selection"
    assert any(item["code"] == "S3_OPTION_ENGINEERING_SELECTION_REQUIRED" for item in result["warnings"])


def test_missing_product_standard_is_needs_review_even_s0():
    materials = [{"id": "c1", "material_type": "cement", "material_subtype": "portland_cement", "name": "Unknown cement", "standard_designation": ""}]
    result = evaluate_cementitious_compliance(materials, durability("S0"))
    assert result["status"] == "needs_review"
