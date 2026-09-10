from __future__ import annotations

from tolou_mix_engine.aci211_evidence import (
    ACI_211_OFFICIAL_EVIDENCE,
    NUMERICAL_RULE_EVIDENCE,
    numerical_evidence_is_closed,
)

ACI_211_PROFILE_REFERENCE = {
    "designation": "ACI PRC-211.1-22",
    "publication_year": 2022,
    "title": "Selecting Proportions for Normal-Density and High-Density Concrete—Guide",
    "verification_scope": "normal_weight_proportioning",
}

# This registry is intentionally conservative. Existing executable numbers are not
# promoted to VERIFIED until authoritative numerical source evidence and independent
# golden/boundary cases are recorded for the exact edition.
ACI_211_RULE_VERIFICATION = {
    "ACI211.WATER.SLUMP_NMSA.AIR": "existing_unverified",
    "ACI211.AIR.ENTRAPPED.NMSA": "existing_unverified",
    "ACI211.AIR.ENTRAINED.DEFAULT": "policy_guarded_no_generic_default",
    "ACI211.WCM.STRENGTH.PRELIMINARY": "existing_unverified",
    "ACI211.CEMENTITIOUS.FROM_WCM": "engineering_core",
    "ACI211.COARSE_VOLUME.NMSA_FM": "existing_unverified",
    "ACI211.ABSOLUTE_VOLUME.FINE_BALANCE": "engineering_core",
    "ACI211.MOISTURE.SSD.BATCH": "engineering_core_with_astm_inputs",
    "ACI211.TRIAL_BATCH.REQUIRED": "reference_only",
}

NUMERICAL_RULE_KEYS = tuple(NUMERICAL_RULE_EVIDENCE)


def assert_no_unsubstantiated_numeric_verification() -> None:
    for rule_key in NUMERICAL_RULE_KEYS:
        state = ACI_211_RULE_VERIFICATION.get(rule_key)
        if state == "verified" and not numerical_evidence_is_closed(rule_key):
            raise RuntimeError(
                f"{rule_key} cannot be VERIFIED until authorized exact-edition numerical evidence is closed"
            )


def aci211_verification_envelope() -> dict:
    assert_no_unsubstantiated_numeric_verification()
    return {
        "reference": dict(ACI_211_PROFILE_REFERENCE),
        "official_evidence": dict(ACI_211_OFFICIAL_EVIDENCE),
        "numerical_evidence": {key: dict(value) for key, value in NUMERICAL_RULE_EVIDENCE.items()},
        "rules": dict(ACI_211_RULE_VERIFICATION),
        "verified_rule_count": sum(
            1 for state in ACI_211_RULE_VERIFICATION.values() if state == "verified"
        ),
        "claim": "no numerical ACI 211 rule is certified verified by G02A until authorized exact-edition evidence closure",
    }
