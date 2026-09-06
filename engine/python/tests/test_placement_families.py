from tolou_mix_engine.placement_families import calculate_placement_family


def _normal_base_payload() -> dict:
    return {
        "concrete_type": "pumped",
        "requirements": {"target_strength_mpa": 30, "max_aggregate_size_mm": 19},
        "materials": {
            "cementitious": [{"id": "cement-1", "material_type": "cement", "specific_gravity": 3.15}],
            "aggregates": [
                {
                    "id": "sand-1",
                    "material_type": "fine_aggregate",
                    "specific_gravity": 2.62,
                    "absorption_percent": 1.0,
                    "moisture_percent": 2.0,
                },
                {
                    "id": "coarse-1",
                    "material_type": "coarse_aggregate",
                    "specific_gravity": 2.68,
                    "absorption_percent": 0.7,
                    "moisture_percent": 1.0,
                },
            ],
            "aggregate_blend_shares": [
                {"material_id": "sand-1", "share_percent": 45},
                {"material_id": "coarse-1", "share_percent": 55},
            ],
        },
        "pumpability_requirements": {
            "placement_distance": "120 m",
            "vertical_rise": "35 m",
            "line_configuration": "project-defined 125 mm line",
        },
    }


def test_scc_requires_explicit_performance_requirements():
    result = calculate_placement_family({"concrete_type": "scc"})
    assert result["status"] == "fail"
    assert result["error"] == "scc_performance_requirements_required"
    assert result["mix_proportions"] == {}


def test_scc_requires_all_three_fresh_performance_dimensions():
    result = calculate_placement_family(
        {
            "concrete_type": "scc",
            "scc_performance_requirements": {
                "filling_ability": "project-defined",
                "passing_ability": "project-defined",
            },
            "scc_test_plan": {"fresh_property_tests": ["project-selected"]},
        }
    )
    assert result["status"] == "fail"
    assert result["error"] == "incomplete_scc_performance_requirements"


def test_scc_requires_fresh_property_test_plan_and_does_not_fabricate_proportions():
    payload = {
        "concrete_type": "self_consolidating",
        "scc_performance_requirements": {
            "filling_ability": "project-defined",
            "passing_ability": "project-defined",
            "segregation_resistance": "project-defined",
        },
        "scc_test_plan": {"fresh_property_tests": ["project-selected ASTM/EN methods"]},
    }
    result = calculate_placement_family(payload)
    assert result["status"] == "needs_review"
    assert result["design_strategy"] == "scc_rheology_stability_performance_strategy"
    assert result["mix_proportions"] == {}
    assert result["design_confidence"] == "PRELIMINARY_UNTIL_TRIAL_AND_CALIBRATION"


def test_pumped_requires_placement_geometry_before_base_mix_calculation():
    payload = _normal_base_payload()
    del payload["pumpability_requirements"]["line_configuration"]
    result = calculate_placement_family(payload)
    assert result["status"] == "fail"
    assert result["error"] == "incomplete_pumpability_requirements"
    assert result["mix_proportions"] == {}


def test_pumped_uses_base_mix_with_explicit_pumpability_overlay():
    result = calculate_placement_family(_normal_base_payload())
    assert result["concrete_family"] == "pumped"
    assert result["design_strategy"] == "normal_weight_base_with_pumpability_overlay"
    assert result["design_confidence"] == "PRELIMINARY_UNTIL_PUMPABILITY_VALIDATION"
    assert result["pumpability_requirements"]["placement_distance"] == "120 m"
    assert result["mix_proportions"]["cementitious_kg_m3"] is not None
    assert any("pumping validation" in note for note in result["engineering_notes"])


def test_non_g07_family_fails_closed():
    result = calculate_placement_family({"concrete_type": "uhpc"})
    assert result["status"] == "fail"
    assert result["error"] == "unsupported_g07_family"
    assert result["mix_proportions"] == {}
