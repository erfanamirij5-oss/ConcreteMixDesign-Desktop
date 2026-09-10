from tolou_mix_engine.admixture_compliance import evaluate_admixture_compliance


def durability(corrosion="C2", prestressed=False):
    limits = {"nonprestressed_percent": 0.15, "prestressed_percent": 0.06}
    return {
        "exposure_classes": {"corrosion": corrosion},
        "governing_requirements": {"chloride_limit_percent": limits},
        "prestressed": prestressed,
    }


def test_c494_water_reducer_passes_identity_check_but_not_astm_compliance_claim():
    system = {"analysis": [{"material_id": "a1", "name": "HRWR", "material_subtype": "high_range_water_reducer", "standard_designation": "ASTM C494/C494M Type F", "mass_kg_m3": 5.0}]}
    materials = [{"id": "a1", "material_type": "admixture", "material_subtype": "high_range_water_reducer", "chloride_percent": 0.10}]
    result = evaluate_admixture_compliance(system, materials, 400.0, durability(), False)
    check = result["standard_checks"][0]
    assert check["status"] == "pass"
    assert check["verification_scope"] == "designation_identity_only"
    assert check["verification_state"] == "identity_only_unverified_acceptance"
    assert check["compliance_claim_allowed"] is False
    assert result["chloride"]["status"] == "partial_pass"
    assert result["chloride"]["admixture_chloride_percent_by_mass_cementitious"] == 0.00125
    assert result["status"] == "needs_review"


def test_air_entrainer_requires_c260_designation_and_never_claims_compliance():
    system = {"analysis": [{"material_id": "a1", "name": "AEA", "material_subtype": "air_entrainer", "standard_designation": "ASTM C494", "mass_kg_m3": 0.5}]}
    materials = [{"id": "a1", "material_type": "admixture", "material_subtype": "air_entrainer", "chloride_percent": 0.0}]
    result = evaluate_admixture_compliance(system, materials, 350.0, durability("C1"), False)
    check = result["standard_checks"][0]
    assert check["status"] == "needs_review"
    assert check["compliance_claim_allowed"] is False
    assert any(w["code"] == "ADMIXTURE_STANDARD_DESIGNATION_MISSING_OR_MISMATCHED" for w in result["warnings"])


def test_admixture_chloride_alone_can_fail_aci_limit():
    system = {"analysis": [{"material_id": "a1", "name": "Accelerator", "material_subtype": "accelerator", "standard_designation": "ASTM C494 Type C", "mass_kg_m3": 20.0}]}
    materials = [{"id": "a1", "material_type": "admixture", "material_subtype": "accelerator", "chloride_percent": 5.0}]
    result = evaluate_admixture_compliance(system, materials, 400.0, durability("C2"), False)
    assert result["chloride"]["admixture_chloride_percent_by_mass_cementitious"] == 0.25
    assert result["chloride"]["status"] == "fail"
    assert result["status"] == "fail"


def test_prestressed_uses_tighter_chloride_limit():
    system = {"analysis": [{"material_id": "a1", "name": "Accelerator", "material_subtype": "accelerator", "standard_designation": "ASTM C494 Type C", "mass_kg_m3": 10.0}]}
    materials = [{"id": "a1", "material_type": "admixture", "material_subtype": "accelerator", "chloride_percent": 3.0}]
    result = evaluate_admixture_compliance(system, materials, 400.0, durability("C0"), True)
    assert result["chloride"]["aci_limit_percent_by_mass_cementitious"] == 0.06
    assert result["chloride"]["admixture_chloride_percent_by_mass_cementitious"] == 0.075
    assert result["chloride"]["status"] == "fail"
