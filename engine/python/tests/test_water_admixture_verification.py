from tolou_mix_engine.water_admixture_verification import (
    WATER_ADMIXTURE_ASTM_REFERENCES,
    water_admixture_acceptance_rule_is_verified,
    water_admixture_verification_envelope,
)


def test_water_and_admixture_reference_kinds_are_separated() -> None:
    assert WATER_ADMIXTURE_ASTM_REFERENCES["C1602/C1602M-22"]["kind"] == "material_specification"
    assert WATER_ADMIXTURE_ASTM_REFERENCES["C1603-23"]["kind"] == "test_method"
    assert WATER_ADMIXTURE_ASTM_REFERENCES["C494/C494M-24"]["kind"] == "material_specification"
    assert WATER_ADMIXTURE_ASTM_REFERENCES["C260/C260M-24"]["kind"] == "material_specification"


def test_public_metadata_does_not_verify_acceptance_rules() -> None:
    envelope = water_admixture_verification_envelope()
    assert envelope["astm_compliance_claim_allowed"] is False
    assert water_admixture_acceptance_rule_is_verified("C1602-performance") is False
    assert water_admixture_acceptance_rule_is_verified("C494-product") is False


def test_c1603_does_not_become_standalone_acceptance_authority() -> None:
    c1603 = WATER_ADMIXTURE_ASTM_REFERENCES["C1603-23"]
    assert c1603["acceptance_state"] == "method_only_no_standalone_acceptance"
