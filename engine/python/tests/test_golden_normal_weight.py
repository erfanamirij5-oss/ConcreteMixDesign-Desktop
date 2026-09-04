from tolou_mix_engine.mix_design.normal_weight import calculate_normal_weight_mix


def test_golden_aci_211_normal_weight_19mm_non_air_coarse_volume_case():
    """Independent regression case for the complete ACI-style proportioning path.

    Reference inputs intentionally exercise the classic lookup + absolute-volume chain:
    - slump 100 mm, NMSA 19 mm, non-air-entrained -> 205 kg/m3 mixing water
    - explicit governing w/cm = 0.45 -> 455.6 kg/m3 cementitious material
    - fine aggregate FM 2.6 and 19 mm NMSA -> coarse bulk-volume fraction 0.64
    - coarse dry-rodded unit weight = 1600 kg/m3

    The expected masses below are independently hand-calculated from those selected
    lookup values and the absolute-volume/moisture equations. This is a golden
    verification contract, not a snapshot copied from engine output.
    """
    result = calculate_normal_weight_mix(
        {
            "requirements": {
                "target_strength_mpa": 35,
                "slump_mm": 100,
                "max_aggregate_size_mm": 19,
                "w_cm_ratio": 0.45,
                "air_content_percent": 2.0,
            },
            "calculation_options": {"aggregate_proportioning_mode": "aci_coarse_volume"},
            "materials": {
                "cement_specific_gravity": 3.15,
                "aggregates": [
                    {
                        "id": "fine-reference",
                        "name": "Reference fine aggregate",
                        "material_type": "fine_aggregate",
                        "specific_gravity": 2.62,
                        "absorption_percent": 1.5,
                        "moisture_percent": 3.0,
                        "fineness_modulus": 2.6,
                    },
                    {
                        "id": "coarse-reference",
                        "name": "Reference 19 mm coarse aggregate",
                        "material_type": "coarse_aggregate",
                        "specific_gravity": 2.68,
                        "absorption_percent": 0.8,
                        "moisture_percent": 1.2,
                        "unit_weight_kg_m3": 1600.0,
                    },
                ],
                "aggregate_blend_shares": [
                    {"material_id": "fine-reference", "share_percent": 40.0},
                    {"material_id": "coarse-reference", "share_percent": 60.0},
                ],
            },
        }
    )

    mix = result["mix_proportions"]
    metadata = result["aggregate_proportioning"]

    assert mix["water_kg_m3"] == 205.0
    assert mix["cementitious_kg_m3"] == 455.6
    assert mix["w_cm_ratio"] == 0.45
    assert mix["strength_based_w_cm_ratio"] == 0.47

    assert metadata["method"] == "aci_coarse_bulk_volume_plus_absolute_volume_fine"
    assert metadata["fine_aggregate_fineness_modulus"] == 2.6
    assert metadata["coarse_bulk_volume_fraction"] == 0.64
    assert metadata["fine_absolute_volume_m3_m3"] == 0.2452

    assert mix["coarse_aggregate_kg_m3"] == 1032.2
    assert mix["fine_aggregate_kg_m3"] == 642.5
    assert mix["aggregate_ssd_kg_m3"] == 1674.7
    assert mix["aggregate_batch_kg_m3"] == 1688.3
    assert mix["batch_water_adjustment_kg_m3"] == 13.6
    assert mix["water_to_add_kg_m3"] == 191.4

    assert any("ACI PRC-211.1-22" in ref for ref in result["standard_references"])
    assert result["assumptions"]
    assert result["limitations"]
    assert not any(item["severity"] == "fail" for item in result["warnings"])
