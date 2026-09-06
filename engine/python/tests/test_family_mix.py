from tolou_mix_engine.concrete_families import supports_engine_command
from tolou_mix_engine.family_mix import calculate_family_mix


def _performance_payload(family: str) -> dict:
    payload = {
        "concrete_type": family,
        "requirements": {
            "target_strength_mpa": 70,
            "w_cm_ratio": 0.32,
            "mixing_water_kg_m3": 165,
            "air_content_percent": 2.0,
            "max_aggregate_size_mm": 19,
        },
        "materials": {
            "cementitious": [
                {
                    "id": "cement-1",
                    "name": "Portland cement",
                    "material_type": "cement",
                    "material_subtype": "portland_cement",
                    "specific_gravity": 3.15,
                }
            ],
            "aggregates": [
                {
                    "id": "sand-1",
                    "name": "Fine aggregate",
                    "material_type": "fine_aggregate",
                    "specific_gravity": 2.62,
                    "absorption_percent": 1.2,
                    "moisture_percent": 2.0,
                },
                {
                    "id": "coarse-1",
                    "name": "Coarse aggregate",
                    "material_type": "coarse_aggregate",
                    "specific_gravity": 2.68,
                    "absorption_percent": 0.7,
                    "moisture_percent": 1.0,
                },
            ],
            "aggregate_blend_shares": [
                {"material_id": "sand-1", "share_percent": 44},
                {"material_id": "coarse-1", "share_percent": 56},
            ],
        },
    }
    if family == "high_performance":
        payload["performance_requirements"] = {"durability": "project-defined"}
    return payload


def test_g06_capability_registry_activates_only_target_families_for_family_command():
    assert supports_engine_command("normal_weight", "calculate-family-mix")
    assert supports_engine_command("hsc", "calculate-family-mix")
    assert supports_engine_command("hpc", "calculate-family-mix")
    assert not supports_engine_command("scc", "calculate-family-mix")


def test_hsc_requires_explicit_water_and_w_cm_instead_of_normal_lookup():
    payload = _performance_payload("high_strength")
    del payload["requirements"]["mixing_water_kg_m3"]

    result = calculate_family_mix(payload)

    assert result["status"] == "fail"
    assert result["error"] == "explicit_mixing_water_kg_m3_required"
    assert result["mix_proportions"] == {}


def test_hpc_requires_explicit_performance_requirement():
    payload = _performance_payload("high_performance")
    payload.pop("performance_requirements")

    result = calculate_family_mix(payload)

    assert result["status"] == "fail"
    assert result["error"] == "performance_requirements_required"


def test_hsc_uses_explicit_input_absolute_volume_and_remains_preliminary():
    result = calculate_family_mix(_performance_payload("high_strength"))

    assert result["concrete_family"] == "high_strength"
    assert result["design_strategy"] == "high_strength_explicit_input_absolute_volume"
    assert result["design_confidence"] == "PRELIMINARY_UNTIL_TRIAL_AND_CALIBRATION"
    assert result["mix_proportions"]["water_kg_m3"] == 165.0
    assert result["mix_proportions"]["w_cm_ratio"] == 0.32
    assert result["mix_proportions"]["cementitious_kg_m3"] > 500
    assert result["mix_proportions"]["aggregate_ssd_kg_m3"] > 0


def test_hpc_keeps_performance_requirements_traceable():
    result = calculate_family_mix(_performance_payload("high_performance"))

    assert result["concrete_family"] == "high_performance"
    assert result["performance_requirements"] == {"durability": "project-defined"}
    assert result["design_strategy"] == "high_performance_explicit_input_absolute_volume"
    assert any("Trial Mix" in note for note in result["engineering_notes"])


def test_non_g06_family_fails_closed_without_proportioning():
    result = calculate_family_mix({"concrete_type": "self_consolidating"})

    assert result["status"] == "fail"
    assert result["error"] == "unsupported_g06_family"
    assert result["mix_proportions"] == {}
