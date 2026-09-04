from tolou_mix_engine.mix_design.normal_weight import calculate_normal_weight_mix


def test_normal_weight_engine_returns_traceable_result():
    result = calculate_normal_weight_mix(
        {
            "requirements": {
                "target_strength_mpa": 35,
                "slump_mm": 100,
                "max_aggregate_size_mm": 19,
                "w_cm_ratio": 0.45,
            }
        }
    )

    assert result["engine_version"] == "0.3.0"
    assert result["mix_proportions"]["water_kg_m3"] == 205.0
    assert result["mix_proportions"]["cementitious_kg_m3"] > 0
    assert result["mix_proportions"]["strength_based_w_cm_ratio"] == 0.47
    assert result["standard_references"]
    assert result["assumptions"]
    assert result["limitations"]


def test_high_w_cm_ratio_creates_warning():
    result = calculate_normal_weight_mix({"requirements": {"w_cm_ratio": 0.6}})

    assert any(warning["code"] == "HIGH_W_CM" for warning in result["warnings"])


def test_high_strength_is_flagged_for_review():
    result = calculate_normal_weight_mix(
        {"requirements": {"target_strength_mpa": 60, "w_cm_ratio": 0.35}}
    )

    assert any(warning["code"] == "HIGH_STRENGTH_SCOPE" for warning in result["warnings"])
    assert result["mix_proportions"]["strength_based_w_cm_ratio"] is None


def test_manual_aggregate_blend_allocates_ssd_and_batch_masses_with_od_moisture_basis():
    result = calculate_normal_weight_mix(
        {
            "requirements": {"w_cm_ratio": 0.45, "air_content_percent": 2},
            "calculation_options": {"aggregate_proportioning_mode": "manual_absolute_volume"},
            "materials": {
                "aggregates": [
                    {
                        "id": "sand-1",
                        "name": "ماسه طبیعی",
                        "material_type": "fine_aggregate",
                        "specific_gravity": 2.62,
                        "absorption_percent": 1.5,
                        "moisture_percent": 3.0,
                    },
                    {
                        "id": "coarse-1",
                        "name": "شن بادامی",
                        "material_type": "coarse_aggregate",
                        "specific_gravity": 2.68,
                        "absorption_percent": 0.8,
                        "moisture_percent": 1.2,
                    },
                ],
                "aggregate_blend_shares": [
                    {"material_id": "sand-1", "share_percent": 42},
                    {"material_id": "coarse-1", "share_percent": 58},
                ],
            },
        }
    )

    proportions = result["mix_proportions"]
    assert proportions["fine_aggregate_kg_m3"] > 0
    assert proportions["coarse_aggregate_kg_m3"] > 0
    assert proportions["aggregate_ssd_kg_m3"] > proportions["cementitious_kg_m3"]
    assert proportions["aggregate_batch_kg_m3"] > proportions["aggregate_ssd_kg_m3"]
    first = result["aggregate_analysis"][0]
    assert first["od_mass_kg_m3"] < first["ssd_mass_kg_m3"] < first["batch_mass_kg_m3"]
    assert first["water_adjustment_kg_m3"] > 0
    assert proportions["water_to_add_kg_m3"] < proportions["water_kg_m3"]


def test_aci_coarse_volume_mode_uses_fm_and_dry_rodded_unit_weight():
    result = calculate_normal_weight_mix(
        {
            "requirements": {
                "target_strength_mpa": 35,
                "slump_mm": 100,
                "max_aggregate_size_mm": 19,
                "w_cm_ratio": 0.45,
                "air_content_percent": 2,
            },
            "calculation_options": {"aggregate_proportioning_mode": "aci_coarse_volume"},
            "materials": {
                "aggregates": [
                    {
                        "id": "sand-1",
                        "name": "ماسه",
                        "material_type": "fine_aggregate",
                        "specific_gravity": 2.62,
                        "absorption_percent": 1.5,
                        "moisture_percent": 3.0,
                        "fineness_modulus": 2.6,
                    },
                    {
                        "id": "coarse-1",
                        "name": "شن 19",
                        "material_type": "coarse_aggregate",
                        "specific_gravity": 2.68,
                        "absorption_percent": 0.8,
                        "moisture_percent": 1.2,
                        "unit_weight_kg_m3": 1600,
                    },
                ],
                "aggregate_blend_shares": [
                    {"material_id": "sand-1", "share_percent": 40},
                    {"material_id": "coarse-1", "share_percent": 60},
                ],
            },
        }
    )

    metadata = result["aggregate_proportioning"]
    assert metadata["method"] == "aci_coarse_bulk_volume_plus_absolute_volume_fine"
    assert metadata["fine_aggregate_fineness_modulus"] == 2.6
    assert metadata["coarse_bulk_volume_fraction"] == 0.64
    assert result["mix_proportions"]["coarse_aggregate_kg_m3"] > 1000
    assert result["mix_proportions"]["fine_aggregate_kg_m3"] > 0
    assert not any(warning["code"] == "FINE_AGGREGATE_FM_REQUIRED" for warning in result["warnings"])


def test_aci_mode_falls_back_when_fm_is_missing():
    result = calculate_normal_weight_mix(
        {
            "calculation_options": {"aggregate_proportioning_mode": "aci_coarse_volume"},
            "materials": {
                "aggregates": [
                    {"id": "sand", "name": "ماسه", "material_type": "fine_aggregate", "specific_gravity": 2.65},
                    {
                        "id": "stone",
                        "name": "شن",
                        "material_type": "coarse_aggregate",
                        "specific_gravity": 2.68,
                        "unit_weight_kg_m3": 1600,
                    },
                ],
                "aggregate_blend_shares": [
                    {"material_id": "sand", "share_percent": 40},
                    {"material_id": "stone", "share_percent": 60},
                ],
            },
        }
    )

    assert any(warning["code"] == "FINE_AGGREGATE_FM_REQUIRED" for warning in result["warnings"])
    assert result["aggregate_proportioning"]["method"] == "manual_absolute_volume_shares"


def test_invalid_aggregate_share_total_is_flagged():
    result = calculate_normal_weight_mix(
        {
            "calculation_options": {"aggregate_proportioning_mode": "manual_absolute_volume"},
            "materials": {
                "aggregates": [
                    {"id": "sand-1", "name": "ماسه", "material_type": "fine_aggregate", "specific_gravity": 2.65}
                ],
                "aggregate_blend_shares": [{"material_id": "sand-1", "share_percent": 80}],
            },
        }
    )

    assert any(warning["code"] == "AGGREGATE_SHARE_NOT_100" for warning in result["warnings"])
    assert result["mix_proportions"]["aggregate_ssd_kg_m3"] is None
