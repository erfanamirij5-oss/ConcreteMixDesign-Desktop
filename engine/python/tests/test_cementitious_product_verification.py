from tolou_mix_engine.cementitious_product_verification import (
    classify_cementitious_product_designation,
)


def test_portland_cement_designation_is_identity_only_not_compliance():
    result = classify_cementitious_product_designation(
        {
            "id": "c1",
            "name": "Portland cement",
            "material_type": "cement",
            "material_subtype": "portland_cement",
            "standard_designation": "ASTM C150/C150M",
        }
    )
    assert result["identity_state"] == "designation_recognized"
    assert result["matched_standard_token"] == "C150"
    assert result["verification_state"] == "identity_only_unverified_acceptance"
    assert result["compliance_claim_allowed"] is False


def test_scm_designation_is_identity_only_not_compliance():
    result = classify_cementitious_product_designation(
        {
            "id": "s1",
            "name": "Fly ash",
            "material_type": "scm",
            "material_subtype": "fly_ash",
            "standard_designation": "ASTM C618",
        }
    )
    assert result["identity_state"] == "designation_recognized"
    assert result["matched_standard_token"] == "C618"
    assert result["compliance_claim_allowed"] is False


def test_mismatched_designation_is_not_verified():
    result = classify_cementitious_product_designation(
        {
            "id": "s1",
            "name": "Silica fume",
            "material_type": "scm",
            "material_subtype": "silica_fume",
            "standard_designation": "ASTM C618",
        }
    )
    assert result["identity_state"] == "missing_or_mismatched"
    assert result["verification_state"] == "not_verified"
    assert result["compliance_claim_allowed"] is False


def test_unknown_subtype_requires_project_review():
    result = classify_cementitious_product_designation(
        {
            "id": "x1",
            "name": "Custom SCM",
            "material_type": "scm",
            "material_subtype": "other_scm",
            "standard_designation": "CUSTOM-001",
        }
    )
    assert result["identity_state"] == "project_review_required"
    assert result["compliance_claim_allowed"] is False
