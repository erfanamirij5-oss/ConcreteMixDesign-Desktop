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

    assert result["engine_version"] == "0.2.0"
    assert result["mix_proportions"]["water_kg_m3"] > 0
    assert result["mix_proportions"]["cementitious_kg_m3"] > 0
    assert result["standard_references"]
    assert result["assumptions"]
    assert result["limitations"]


def test_high_w_cm_ratio_creates_warning():
    result = calculate_normal_weight_mix({"requirements": {"w_cm_ratio": 0.6}})

    assert any(warning["code"] == "HIGH_W_CM" for warning in result["warnings"])


def test_high_strength_is_flagged_for_aci_211_4_review():
    result = calculate_normal_weight_mix({"requirements": {"target_strength_mpa": 60}})

    assert any(warning["code"] == "HIGH_STRENGTH_SCOPE" for warning in result["warnings"])


def test_aggregate_blend_allocates_ssd_and_batch_masses():
    result = calculate_normal_weight_mix(
        {
            "requirements": {"w_cm_ratio": 0.45, "air_content_percent": 2},
            "materials": {
                "aggregates": [
                    {"id": "sand-1", "name": "ماسه طبیعی", "material_type": "fine_aggregate", "specific_gravity": 2.62, "absorption_percent": 1.5, "moisture_percent": 3.0},
                    {"id": "coarse-1", "name": "شن بادامی", "material_type": "coarse_aggregate", "specific_gravity": 2.68, "absorption_percent": 0.8, "moisture_percent": 1.2},
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
    assert result["aggregate_analysis"][0]["water_adjustment_kg_m3"] > 0


def test_invalid_aggregate_share_total_is_flagged():
    result = calculate_normal_weight_mix(
        {
            "materials": {
                "aggregates": [{"id": "sand-1", "name": "ماسه", "material_type": "fine_aggregate", "specific_gravity": 2.65}],
                "aggregate_blend_shares": [{"material_id": "sand-1", "share_percent": 80}],
            }
        }
    )

    assert any(warning["code"] == "AGGREGATE_SHARE_NOT_100" for warning in result["warnings"])
    assert result["mix_proportions"]["aggregate_ssd_kg_m3"] is None
