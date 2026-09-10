from __future__ import annotations

from tolou_mix_engine.aci318_evidence import (
    ACI_318_OFFICIAL_EVIDENCE,
    STANDARDS_RULE_EVIDENCE,
    standards_evidence_is_closed,
)

ACI_318_PROFILE_REFERENCE = {
    "designation": "ACI CODE-318-25",
    "publication_year": 2025,
    "title": "Building Code for Structural Concrete—Code Requirements and Commentary",
    "verification_scope": "durability_exposure",
}

ACI_318_RULE_VERIFICATION = {
    "ACI318.EXPOSURE.FREEZE_THAW.CLASSIFY": "existing_unverified",
    "ACI318.EXPOSURE.SULFATE.CLASSIFY": "existing_unverified",
    "ACI318.EXPOSURE.WATER.CLASSIFY": "existing_unverified",
    "ACI318.EXPOSURE.CORROSION.CLASSIFY": "existing_unverified",
    "ACI318.DURABILITY.WCM_STRENGTH": "existing_unverified",
    "ACI318.DURABILITY.AIR": "existing_unverified",
    "ACI318.DURABILITY.CHLORIDE_LIMIT": "existing_unverified",
    "ACI318.DURABILITY.SULFATE_BINDER": "existing_unverified",
    "ACI318.DURABILITY.GOVERNING_COMBINATION": "engineering_core",
    "ACI318.DURABILITY.PSI_TO_MPA": "engineering_core",
}

NUMERICAL_OR_ACCEPTANCE_RULES = {
    "ACI318.EXPOSURE.FREEZE_THAW.CLASSIFY",
    "ACI318.EXPOSURE.SULFATE.CLASSIFY",
    "ACI318.EXPOSURE.WATER.CLASSIFY",
    "ACI318.EXPOSURE.CORROSION.CLASSIFY",
    "ACI318.DURABILITY.WCM_STRENGTH",
    "ACI318.DURABILITY.AIR",
    "ACI318.DURABILITY.CHLORIDE_LIMIT",
    "ACI318.DURABILITY.SULFATE_BINDER",
}


def validate_aci318_verification_registry() -> None:
    illegally_verified = [
        key
        for key in NUMERICAL_OR_ACCEPTANCE_RULES
        if ACI_318_RULE_VERIFICATION.get(key) == "verified"
        and not standards_evidence_is_closed(key)
    ]
    if illegally_verified:
        raise RuntimeError(
            "ACI 318 numerical/acceptance rules cannot be VERIFIED before exact-edition evidence closure: "
            + ", ".join(sorted(illegally_verified))
        )


def aci318_verification_envelope() -> dict:
    validate_aci318_verification_registry()
    return {
        "reference": dict(ACI_318_PROFILE_REFERENCE),
        "official_evidence": dict(ACI_318_OFFICIAL_EVIDENCE),
        "standards_evidence": {
            key: dict(value) for key, value in STANDARDS_RULE_EVIDENCE.items()
        },
        "rules": dict(ACI_318_RULE_VERIFICATION),
        "verified_rule_count": sum(
            1 for state in ACI_318_RULE_VERIFICATION.values() if state == "verified"
        ),
        "claim": "no standards-derived ACI 318-25 durability rule is certified verified until exact-edition evidence closure",
    }
