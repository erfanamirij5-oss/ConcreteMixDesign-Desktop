from tolou_mix_engine.integrated_design import calculate_integrated_normal_mix


def test_integrated_supported_path_preserves_full_traceability_contract():
    result = calculate_integrated_normal_mix(
        {
            "concrete_type": "normal_weight",
            "requirements": {
                "target_strength_mpa": 35,
                "slump_mm": 100,
                "max_aggregate_size_mm": 19,
                "w_cm_ratio": 0.45,
            },
            "materials": {
                "cementitious": [
                    {
                        "id": "cement",
                        "name": "Reference cement",
                        "material_type": "cement",
                        "material_subtype": "portland_cement",
                        "binder_share_percent": 100.0,
                        "specific_gravity": 3.15,
                        "standard_designation": "ASTM C150 Type I/II",
                        "alkali_percent": 0.55,
                        "chloride_percent": 0.01,
                    }
                ],
                "aggregates": [],
                "admixtures": [],
            },
        }
    )

    assert result["calculation_method"]
    assert result["standard_references"]
    assert result["assumptions"]
    assert result["warnings"]
    assert result["limitations"]
    assert result["engineering_notes"]
    assert result["calculation_pipeline"]
    assert "ACI_318_25_durability" in result["calculation_pipeline"]
    assert "ACI_PRC_211_1_22_proportioning" in result["calculation_pipeline"]
    assert any("ACI PRC-211.1-22" in reference for reference in result["standard_references"])
    assert any("ASTM C1602" in reference for reference in result["standard_references"])
    assert result["durability"].get("traceability")
    assert result["cementitious_compliance"].get("references")
    assert result["asr_compliance"].get("references")
    assert result["water_compliance"].get("references")
    assert result["chloride_compliance"].get("references")
