from tolou_mix_engine.asr_verification import (
    ASR_ASTM_REFERENCES,
    asr_acceptance_rule_is_verified,
    asr_verification_envelope,
)


def test_asr_registry_separates_test_methods_from_guidance():
    assert ASR_ASTM_REFERENCES["C1260-23"]["kind"] == "test_method"
    assert ASR_ASTM_REFERENCES["C1293/C1293M-23ae1"]["kind"] == "test_method"
    assert ASR_ASTM_REFERENCES["C1567-25"]["kind"] == "test_method"
    assert ASR_ASTM_REFERENCES["C1778-25"]["kind"] == "guide"


def test_asr_acceptance_stays_evidence_blocked():
    assert asr_acceptance_rule_is_verified("ASTM.C1260.SCREEN") is False
    assert asr_acceptance_rule_is_verified("ASTM.C1293.C1778.LIMIT") is False
    assert asr_acceptance_rule_is_verified("ASTM.C1567.MITIGATION") is False


def test_asr_envelope_disallows_astm_compliance_claim():
    envelope = asr_verification_envelope()
    assert envelope["gate"] == "G02C"
    assert envelope["domain"] == "ASR"
    assert envelope["acceptance_rule_state"] == "evidence_blocked_exact_edition_required"
    assert envelope["astm_compliance_claim_allowed"] is False
    assert "exact-edition evidence" in envelope["claim"]
