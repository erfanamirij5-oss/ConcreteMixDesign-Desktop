from __future__ import annotations

import pytest

import tolou_mix_engine.aci318_verification as verification


def test_g02b_starts_with_no_verified_standards_derived_rules() -> None:
    envelope = verification.aci318_verification_envelope()
    assert envelope["reference"]["designation"] == "ACI CODE-318-25"
    assert envelope["reference"]["publication_year"] == 2025
    assert envelope["reference"]["verification_scope"] == "durability_exposure"
    assert envelope["verified_rule_count"] == 0
    assert envelope["rules"]["ACI318.DURABILITY.GOVERNING_COMBINATION"] == "engineering_core"
    assert envelope["rules"]["ACI318.DURABILITY.WCM_STRENGTH"] == "existing_unverified"


def test_registry_fails_closed_if_numerical_rule_is_promoted_without_evidence() -> None:
    key = "ACI318.DURABILITY.WCM_STRENGTH"
    original = verification.ACI_318_RULE_VERIFICATION[key]
    verification.ACI_318_RULE_VERIFICATION[key] = "verified"
    try:
        with pytest.raises(RuntimeError, match="exact-edition evidence closure"):
            verification.validate_aci318_verification_registry()
    finally:
        verification.ACI_318_RULE_VERIFICATION[key] = original
