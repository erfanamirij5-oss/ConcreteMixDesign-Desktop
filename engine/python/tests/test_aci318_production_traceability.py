from __future__ import annotations

from tolou_mix_engine.cli import calculate_normal_mix_response, evaluate_durability_response


def test_evaluate_durability_response_exposes_verification_envelope() -> None:
    response = evaluate_durability_response({"conditions": {}, "max_aggregate_size_mm": 19})

    envelope = response["aci318_verification"]
    assert envelope["reference"]["designation"] == "ACI CODE-318-25"
    assert envelope["reference"]["publication_year"] == 2025
    assert envelope["verified_rule_count"] == 0
    assert envelope["rules"]["ACI318.DURABILITY.WCM_STRENGTH"] == "existing_unverified"
    assert envelope["rules"]["ACI318.DURABILITY.GOVERNING_COMBINATION"] == "engineering_core"


def test_normal_mix_fail_response_also_exposes_durability_verification_envelope() -> None:
    response = calculate_normal_mix_response(
        {
            "requirements": {
                "target_strength_mpa": 50,
                "air_entrained": False,
            }
        }
    )

    assert response["status"] == "fail"
    assert response["error"] == "w_cm_ratio_required_outside_strength_lookup"
    assert response["aci318_verification"]["verified_rule_count"] == 0
