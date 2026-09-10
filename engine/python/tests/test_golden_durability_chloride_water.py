from tolou_mix_engine.chloride_compliance import evaluate_full_chloride_compliance
from tolou_mix_engine.durability import evaluate_durability
from tolou_mix_engine.water_compliance import evaluate_mixing_water_compliance


def test_golden_durability_governing_limits_for_f2_s2_w2_c2():
    result = evaluate_durability(
        {
            "max_aggregate_size_mm": 19,
            "conditions": {
                "freeze_thaw_exposure": True,
                "freeze_water_exposure": "frequent",
                "water_dissolved_sulfate_ppm": 2000,
                "water_sulfate_test_method": "ASTM D516",
                "water_sulfate_test_edition": "22",
                "water_sulfate_evidence_ref": "LAB-WATER-GOLDEN-001",
                "water_contact": True,
                "low_permeability_required": True,
                "moisture_exposure": True,
                "external_chloride_exposure": True,
                "reinforced_or_embedded_metal": True,
            },
        }
    )

    assert result["exposure_classes"] == {
        "freeze_thaw": "F2",
        "sulfate": "S2",
        "water": "W2",
        "corrosion": "C2",
    }
    governing = result["governing_requirements"]
    assert governing["max_w_cm"] == 0.40
    assert governing["min_strength_psi"] == 5000
    assert governing["min_strength_mpa"] == 34.5
    assert governing["target_air_percent"] == 6.0
    assert governing["chloride_limit_percent"]["nonprestressed_percent"] == 0.15
    assert result["standard"] == "ACI_CODE_318_25"
    assert result["traceability"]["mixture_requirements"] == "ACI CODE-318-25 Table 19.3.2.1"


def test_golden_full_chloride_mass_balance_for_c2_nonprestressed():
    durability = evaluate_durability(
        {
            "max_aggregate_size_mm": 19,
            "conditions": {
                "moisture_exposure": True,
                "external_chloride_exposure": True,
                "reinforced_or_embedded_metal": True,
            },
        }
    )
    mix_result = {
        "mix_proportions": {
            "cementitious_kg_m3": 400.0,
            "water_to_add_kg_m3": 180.0,
        },
        "aggregate_analysis": [
            {
                "material_id": "agg",
                "material_name": "Combined aggregate",
                "ssd_mass_kg_m3": 1600.0,
            }
        ],
    }
    binder_system = {
        "components": [
            {"material_id": "cement", "name": "Cement", "mass_kg_m3": 400.0}
        ]
    }
    admixture_compliance = {
        "chloride": {
            "admixture_chloride_kg_m3": 0.010,
            "admixture_chloride_data_complete": True,
        }
    }
    materials = {
        "cementitious": [
            {
                "id": "cement",
                "name": "Cement",
                "chloride_percent": 0.010,
                "chloride_test_method": "LAB-METHOD-CEM",
                "chloride_test_edition": "2026",
                "chloride_evidence_ref": "CEM-CL-GOLDEN-001",
            }
        ],
        "aggregates": [
            {
                "id": "agg",
                "name": "Combined aggregate",
                "chloride_percent": 0.005,
                "chloride_test_method": "LAB-METHOD-AGG",
                "chloride_test_edition": "2026",
                "chloride_evidence_ref": "AGG-CL-GOLDEN-001",
            }
        ],
        "admixtures": [
            {
                "id": "water",
                "material_type": "water",
                "name": "Potable water",
                "chloride_mg_l": 250.0,
                "chloride_test_method": "LAB-METHOD-WATER",
                "chloride_test_edition": "2026",
                "chloride_evidence_ref": "WATER-CL-GOLDEN-001",
            }
        ],
    }

    checked = evaluate_full_chloride_compliance(
        mix_result,
        binder_system,
        admixture_compliance,
        materials,
        durability,
        {"prestressed_concrete": False},
    )

    # Independent mass balance:
    # binder 400*0.010% = 0.040 kg/m3
    # aggregate 1600*0.005% = 0.080 kg/m3
    # admixture = 0.010 kg/m3
    # water 180 kg/m3 * 250 mg/L / 1e6 = 0.045 kg/m3
    # total = 0.175 kg/m3; 0.175/400*100 = 0.04375%
    assert checked["status"] == "pass"
    assert checked["data_complete"] is True
    assert checked["provenance_complete"] is True
    assert checked["aci_limit_percent_by_mass_cementitious"] == 0.15
    assert checked["total_chloride_kg_m3"] == 0.175
    assert checked["total_chloride_percent_by_mass_cementitious"] == 0.04375


def test_golden_single_source_potable_water_passes_c1602_chemistry_screen():
    materials = {
        "admixtures": [
            {
                "id": "water-main",
                "material_type": "water",
                "material_subtype": "mixing_water",
                "name": "Potable mains water",
                "water_source_class": "potable",
                "water_share_percent": 100.0,
                "chloride_mg_l": 250.0,
                "sulfate_mg_l": 500.0,
                "alkalis_na2oeq_mg_l": 100.0,
                "total_solids_mg_l": 1000.0,
            }
        ]
    }

    checked = evaluate_mixing_water_compliance(
        materials,
        {"reinforced_or_embedded_metal": True, "prestressed_concrete": False},
    )

    combined = checked["combined_water"]
    assert checked["status"] == "pass"
    assert checked["data_complete"] is True
    assert combined["share_total_percent"] == 100.0
    assert combined["chloride_mg_l"] == 250.0
    assert combined["sulfate_mg_l"] == 500.0
    assert combined["alkalis_na2oeq_mg_l"] == 100.0
    assert combined["total_solids_mg_l"] == 1000.0
    assert combined["chloride_optional_limit_mg_l"] == 1000.0
    assert combined["performance_qualified"] is True
    assert all(
        item["status"] in {"within_optional_limit", "project_limit_not_applicable"}
        for item in combined["chemical_checks"]
    )
