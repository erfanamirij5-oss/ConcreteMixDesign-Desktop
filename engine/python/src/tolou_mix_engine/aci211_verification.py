from __future__ import annotations

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
    "ACI211.AIR.ENTRAINED.DEFAULT": "existing_unverified",
    "ACI211.WCM.STRENGTH.PRELIMINARY": "existing_unverified",
    "ACI211.CEMENTITIOUS.FROM_WCM": "engineering_core",
    "ACI211.COARSE_VOLUME.NMSA_FM": "existing_unverified",
    "ACI211.ABSOLUTE_VOLUME.FINE_BALANCE": "engineering_core",
    "ACI211.MOISTURE.SSD.BATCH": "engineering_core_with_astm_inputs",
    "ACI211.TRIAL_BATCH.REQUIRED": "reference_only",
}


def aci211_verification_envelope() -> dict:
    return {
        "reference": dict(ACI_211_PROFILE_REFERENCE),
        "rules": dict(ACI_211_RULE_VERIFICATION),
        "verified_rule_count": sum(
            1 for state in ACI_211_RULE_VERIFICATION.values() if state == "verified"
        ),
        "claim": "no numerical ACI 211 rule is certified verified by G02A until authoritative evidence closure",
    }
