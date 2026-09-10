from tolou_mix_engine.astm_verification import (
    ASTM_VERIFICATION_REGISTRY,
    STANDARDS_ACCEPTANCE_STATE,
    acceptance_rule_is_verified,
    astm_verification_envelope,
)


def test_registry_separates_public_identity_from_acceptance_rules():
    assert ASTM_VERIFICATION_REGISTRY["C33/C33M-24a"]["kind"] == "material_specification"
    assert ASTM_VERIFICATION_REGISTRY["C136/C136M-25"]["kind"] == "test_method"
    assert all(
        row["state"] == "identity_scope_verified_public_metadata"
        for row in ASTM_VERIFICATION_REGISTRY.values()
    )
    assert STANDARDS_ACCEPTANCE_STATE == "evidence_blocked_exact_edition_required"


def test_acceptance_rules_fail_closed_without_exact_edition_evidence():
    assert acceptance_rule_is_verified("ASTM.C33.GRADATION") is False
    assert acceptance_rule_is_verified("ASTM.C1602.CHEMISTRY") is False


def test_envelope_does_not_claim_numerical_verification():
    envelope = astm_verification_envelope()
    assert envelope["authority"] == "ASTM International"
    assert envelope["gate"] == "G02C"
    assert envelope["acceptance_rule_state"] == "evidence_blocked_exact_edition_required"
    assert "exact-edition evidence" in envelope["claim"]
