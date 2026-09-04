from tolou_mix_engine.admixtures import apply_admixtures, calculate_admixture


def test_percent_binder_liquid_admixture_calculates_carrier_water():
    item = {
        "id": "sp-1",
        "name": "HRWR",
        "material_type": "admixture",
        "material_subtype": "high_range_water_reducer",
        "dosage_value": 1.2,
        "dosage_unit": "percent_binder",
        "density_kg_m3": 1080,
        "solids_percent": 30,
    }
    result = calculate_admixture(item, 400)
    assert round(result["mass_kg_m3"], 3) == 4.8
    assert round(result["carrier_water_kg_m3"], 3) == 3.36
    assert result["nonwater_absolute_volume_m3"] > 0
    assert result["warnings"] == []


def test_liter_dosage_requires_density():
    result = calculate_admixture(
        {
            "name": "Air entrainer",
            "material_type": "admixture",
            "dosage_value": 0.4,
            "dosage_unit": "l_m3",
            "solids_percent": 20,
        },
        350,
    )
    assert result["mass_kg_m3"] == 0
    assert any(item["code"] == "ADMIXTURE_DENSITY_REQUIRED_FOR_VOLUME_DOSAGE" for item in result["warnings"])


def test_admixture_carrier_water_reduces_batch_water_and_adjusts_fine_volume_for_aci_mode():
    result = {
        "mix_proportions": {
            "water_kg_m3": 180.0,
            "batch_water_adjustment_kg_m3": 5.0,
            "fine_aggregate_kg_m3": 700.0,
            "coarse_aggregate_kg_m3": 1050.0,
            "aggregate_ssd_kg_m3": 1750.0,
            "aggregate_batch_kg_m3": 1780.0,
        },
        "aggregate_analysis": [
            {
                "material_id": "sand",
                "material_type": "fine_aggregate",
                "specific_gravity_ssd": 2.65,
                "ssd_mass_kg_m3": 700.0,
                "batch_mass_kg_m3": 720.0,
                "water_adjustment_kg_m3": 4.0,
            },
            {
                "material_id": "stone",
                "material_type": "coarse_aggregate",
                "specific_gravity_ssd": 2.70,
                "ssd_mass_kg_m3": 1050.0,
                "batch_mass_kg_m3": 1060.0,
                "water_adjustment_kg_m3": 1.0,
            },
        ],
    }
    system = apply_admixtures(
        result,
        [
            {
                "id": "sp",
                "name": "Superplasticizer",
                "material_type": "admixture",
                "dosage_value": 1.0,
                "dosage_unit": "percent_binder",
                "density_kg_m3": 1100,
                "solids_percent": 40,
            }
        ],
        400,
        "aci_coarse_volume",
    )
    assert system["totals"]["mass_kg_m3"] == 4.0
    assert system["totals"]["carrier_water_kg_m3"] == 2.4
    assert result["mix_proportions"]["coarse_aggregate_kg_m3"] == 1050.0
    assert result["mix_proportions"]["fine_aggregate_kg_m3"] < 700.0
    assert result["mix_proportions"]["water_to_add_kg_m3"] < 175.0
