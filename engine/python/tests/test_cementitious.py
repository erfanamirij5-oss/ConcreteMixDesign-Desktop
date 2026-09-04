from tolou_mix_engine.cementitious import allocate_cementitious
from tolou_mix_engine.integrated_design import calculate_integrated_normal_mix


def test_two_component_binder_allocates_mass_and_weighted_sg():
    result = allocate_cementitious(
        [
            {"id": "c1", "name": "Cement", "material_type": "cement", "material_subtype": "portland_cement", "specific_gravity": 3.15, "binder_share_percent": 80},
            {"id": "s1", "name": "Slag", "material_type": "scm", "material_subtype": "slag_cement", "specific_gravity": 2.90, "binder_share_percent": 20},
        ],
        400,
    )
    assert result["components"][0]["mass_kg_m3"] == 320.0
    assert result["components"][1]["mass_kg_m3"] == 80.0
    assert 3.0 < result["weighted_specific_gravity"] < 3.15
    assert result["warnings"] == []


def test_binder_shares_must_sum_to_100():
    result = allocate_cementitious(
        [
            {"material_type": "cement", "binder_share_percent": 70, "specific_gravity": 3.15},
            {"material_type": "scm", "material_subtype": "fly_ash", "binder_share_percent": 20, "specific_gravity": 2.35},
        ],
        400,
    )
    assert any(item["code"] == "BINDER_SHARES_NOT_100" for item in result["warnings"])


def test_integrated_mix_reports_binder_components():
    result = calculate_integrated_normal_mix(
        {
            "requirements": {"target_strength_mpa": 35, "slump_mm": 100, "max_aggregate_size_mm": 19, "w_cm_ratio": 0.45, "air_content_percent": 2.0},
            "materials": {
                "cementitious": [
                    {"id": "c1", "name": "Type II", "material_type": "cement", "material_subtype": "portland_cement", "specific_gravity": 3.15, "binder_share_percent": 85},
                    {"id": "sf1", "name": "Silica fume", "material_type": "scm", "material_subtype": "silica_fume", "specific_gravity": 2.20, "binder_share_percent": 15},
                ],
                "aggregates": [],
                "aggregate_blend_shares": [],
            },
            "durability_conditions": {},
            "calculation_options": {"aggregate_proportioning_mode": "manual_absolute_volume"},
        }
    )
    components = result["cementitious_system"]["components"]
    assert len(components) == 2
    assert abs(sum(item["mass_kg_m3"] for item in components) - result["mix_proportions"]["cementitious_kg_m3"]) <= 0.2
    assert result["mix_proportions"]["cementitious_weighted_specific_gravity"] < 3.15
