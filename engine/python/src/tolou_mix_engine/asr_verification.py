from __future__ import annotations


ASR_ASTM_REFERENCES = {
    "C1260-23": {"kind": "test_method", "verification_state": "identity_only_unverified_acceptance"},
    "C1293/C1293M-23ae1": {"kind": "test_method", "verification_state": "identity_only_unverified_acceptance"},
    "C1567-25": {"kind": "test_method", "verification_state": "identity_only_unverified_acceptance"},
    "C1778-25": {"kind": "guide", "verification_state": "identity_only_unverified_acceptance"},
}


def asr_verification_envelope() -> dict:
    return {
        "authority": "ASTM International",
        "gate": "G02C",
        "domain": "ASR",
        "references": ASR_ASTM_REFERENCES,
        "acceptance_rule_state": "evidence_blocked_exact_edition_required",
        "screening_values_may_be_engineering_core": True,
        "astm_compliance_claim_allowed": False,
        "claim": (
            "C1260, C1293/C1293M and C1567 results are test evidence and C1778 is guidance; "
            "no numerical ASR screening or mitigation threshold is promoted to ASTM-verified acceptance "
            "without authorized exact-edition evidence and a traced project/profile criterion."
        ),
    }


def asr_acceptance_rule_is_verified(_: str) -> bool:
    return False
