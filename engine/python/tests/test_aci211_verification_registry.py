from __future__ import annotations

from tolou_mix_engine.aci211_verification import aci211_verification_envelope


def test_g02a_does_not_silently_certify_existing_numerical_rules() -> None:
    envelope = aci211_verification_envelope()
    assert envelope["reference"]["designation"] == "ACI PRC-211.1-22"
    assert envelope["reference"]["publication_year"] == 2022
    assert envelope["reference"]["verification_scope"] == "normal_weight_proportioning"
    assert envelope["verified_rule_count"] == 0

    rules = envelope["rules"]
    assert rules["ACI211.WATER.SLUMP_NMSA.AIR"] == "existing_unverified"
    assert rules["ACI211.AIR.ENTRAINED.DEFAULT"] == "existing_unverified"
    assert rules["ACI211.WCM.STRENGTH.PRELIMINARY"] == "existing_unverified"
    assert rules["ACI211.COARSE_VOLUME.NMSA_FM"] == "existing_unverified"
