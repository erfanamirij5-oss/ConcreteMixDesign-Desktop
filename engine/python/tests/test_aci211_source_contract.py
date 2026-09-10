from __future__ import annotations

from tolou_mix_engine.aci211_verification import ACI_211_PROFILE_REFERENCE


def test_aci211_source_identity_is_versioned_and_scope_bound() -> None:
    assert ACI_211_PROFILE_REFERENCE == {
        "designation": "ACI PRC-211.1-22",
        "publication_year": 2022,
        "title": "Selecting Proportions for Normal-Density and High-Density Concrete—Guide",
        "verification_scope": "normal_weight_proportioning",
    }
