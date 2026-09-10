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
        row["state"] in {
            "identity_scope_verified_public_metadata",
            "existing_unverified_edition",
        }
        for row in ASTM_VERIFICATION_REGISTRY.values()
    )
    assert STANDARDS_ACCEPTANCE_STATE == "evidence_blocked_exact_edition_required"


def test_registry_covers_g02c_material_and_test_method_domains():
    required = {
        "C33/C33M-24a",
        "C117-23",
        "C127-25",
        "C128-25",
        "C136/C136M-25",
        "C29/C29M-23",
        "C88/C88M-24",
        "C142/C142M-17(2023)",
        "C123/C123M-23",
        "C131/C131M",
        "C535",
        "D4791-19(2023)",
        "D5821-13(2025)",
        "C1260-23",
        "C1293/C1293M-23ae1",
        "C1567-25",
        "C1778-25",
        "C150/C150M-24",
        "C595/C595M-26",
        "C1157/C1157M-25",
        "C618",
        "C989/C989M-25",
        "C1240",
        "C1012/C1012M-24a",
        "C494/C494M-24",
        "C260/C260M-24",
        "C1602/C1602M-22",
        "C1603-23",
        "C1218/C1218M-20",
        "C1580-20",
    }
    assert required <= set(ASTM_VERIFICATION_REGISTRY)


def test_acceptance_rules_fail_closed_without_exact_edition_evidence():
    assert acceptance_rule_is_verified("ASTM.C33.GRADATION") is False
    assert acceptance_rule_is_verified("ASTM.C1602.CHEMISTRY") is False
    assert acceptance_rule_is_verified("ASTM.C494.PRODUCT") is False


def test_envelope_does_not_claim_numerical_verification():
    envelope = astm_verification_envelope()
    assert envelope["authority"] == "ASTM International"
    assert envelope["gate"] == "G02C"
    assert envelope["acceptance_rule_state"] == "evidence_blocked_exact_edition_required"
    assert "exact-edition evidence" in envelope["claim"]
