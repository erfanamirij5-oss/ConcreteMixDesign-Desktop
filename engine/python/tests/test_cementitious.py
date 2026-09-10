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


def test_missing_binder_specific_gravity_is_traced_as_preliminary_default():
    result = allocate_cementitious(
        [{"id": "fa1", "name": "Fly ash", "material_type": "scm", "material_subtype": "fly_ash", "binder_share_percent": 100}],
        400,
    )
    assert result["components"][0]["specific_gravity"] == 2.35
    assert result["components"][0]["specific_gravity_source"] == "default_preliminary"
    assert any(item["code"] == "DEFAULT_BINDER_SG_USED" and item["severity"] == "needs_review" for item in result["warnings"])


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


def test_golden_integrated_cementitious_mass_share_and_absolute_volume_case():
    """Independent numerical verification of the integrated binder allocation path.

    Reference calculation:
    - ACI 211.1-style lookup case uses 205 kg/m3 mixing water at 100 mm slump and 19 mm NMSA.
    - Explicit governing w/cm = 0.45, therefore total cementitious = 205 / 0.45 = 455.6 kg/m3 after product rounding.
    - 80% Portland cement at SG 3.15 -> 364.5 kg/m3.
    - 20% slag cement at SG 2.90 -> 91.1 kg/m3.
    - Independent binder absolute volume = 364.48/(3.15*1000) + 91.12/(2.90*1000)
      = 0.147129 m3/m3 after rounding.
    - Independent effective weighted SG = 455.6 / (0.147128626*1000) = 3.0966.

    Expected values are derived from the engineering equations and selected lookup values,
    not copied from current engine output.
    """
    result = calculate_integrated_normal_mix(
        {
            "concrete_type": "normal_weight",
            "requirements": {
                "target_strength_mpa": 35,
                "slump_mm": 100,
                "max_aggregate_size_mm": 19,
                "w_cm_ratio": 0.45,
                "air_content_percent": 2.0,
            },
            "materials": {
                "cementitious": [
                    {
                        "id": "cement-reference",
                        "name": "Reference Portland cement",
                        "material_type": "cement",
                        "material_subtype": "portland_cement",
                        "specific_gravity": 3.15,
                        "binder_share_percent": 80.0,
                    },
                    {
                        "id": "slag-reference",
                        "name": "Reference slag cement",
                        "material_type": "scm",
                        "material_subtype": "slag_cement",
                        "specific_gravity": 2.90,
                        "binder_share_percent": 20.0,
                    },
                ],
                "aggregates": [],
                "aggregate_blend_shares": [],
                "admixtures": [],
            },
            "durability_conditions": {},
            "calculation_options": {"aggregate_proportioning_mode": "manual_absolute_volume"},
        }
    )

    mix = result["mix_proportions"]
    binder = result["cementitious_system"]
    components = binder["components"]

    assert mix["water_kg_m3"] == 205.0
    assert mix["cementitious_kg_m3"] == 455.6
    assert [item["share_percent"] for item in components] == [80.0, 20.0]
    assert [item["mass_kg_m3"] for item in components] == [364.5, 91.1]
    assert binder["absolute_volume_m3"] == 0.147129
    assert binder["weighted_specific_gravity"] == 3.0966
    assert mix["cementitious_weighted_specific_gravity"] == 3.0966
    assert abs(sum(item["mass_kg_m3"] for item in components) - 455.6) <= 0.1
    assert not any(item["severity"] == "fail" and item["code"] in {"INCOMPLETE_BINDER_SHARES", "BINDER_SHARES_NOT_100"} for item in binder["warnings"])
