from tolou_mix_engine.durability import evaluate_durability


def test_default_conditions_are_nonaggressive_classes():
    result = evaluate_durability({"conditions": {}, "max_aggregate_size_mm": 19})
    assert result["exposure_classes"] == {
        "freeze_thaw": "F0",
        "sulfate": "S0",
        "water": "W0",
        "corrosion": "C0",
    }
    assert result["governing_requirements"]["max_w_cm"] is None


def test_c2_governs_w_cm_and_strength():
    result = evaluate_durability(
        {
            "conditions": {
                "moisture_exposure": True,
                "external_chloride_exposure": True,
                "reinforced_or_embedded_metal": True,
            },
            "max_aggregate_size_mm": 19,
        }
    )
    assert result["exposure_classes"]["corrosion"] == "C2"
    assert result["governing_requirements"]["max_w_cm"] == 0.40
    assert result["governing_requirements"]["min_strength_psi"] == 5000
    assert result["governing_requirements"]["chloride_limit_percent"]["nonprestressed_percent"] == 0.15


def test_sulfate_classification_uses_more_severe_measurement():
    result = evaluate_durability(
        {
            "conditions": {
                "soil_water_soluble_sulfate_percent": 0.12,
                "soil_sulfate_test_method": "ASTM C1580",
                "soil_sulfate_test_edition": "20",
                "soil_sulfate_evidence_ref": "LAB-SOIL-001",
                "water_dissolved_sulfate_ppm": 3000,
                "water_sulfate_test_method": "ASTM D516",
                "water_sulfate_test_edition": "22",
                "water_sulfate_evidence_ref": "LAB-WATER-001",
            }
        }
    )
    assert result["exposure_classes"]["sulfate"] == "S2"
    assert result["governing_requirements"]["max_w_cm"] == 0.45


def test_seawater_is_s1_and_external_chloride_can_be_c2():
    result = evaluate_durability(
        {
            "conditions": {
                "seawater_exposure": True,
                "moisture_exposure": True,
                "external_chloride_exposure": True,
            }
        }
    )
    assert result["exposure_classes"]["sulfate"] == "S1"
    assert result["exposure_classes"]["corrosion"] == "C2"


def test_f2_air_content_for_19_mm_nmsa():
    result = evaluate_durability(
        {
            "conditions": {
                "freeze_thaw_exposure": True,
                "freeze_water_exposure": "frequent",
            },
            "max_aggregate_size_mm": 19,
        }
    )
    assert result["exposure_classes"]["freeze_thaw"] == "F2"
    assert result["governing_requirements"]["target_air_percent"] == 6.0
    assert result["governing_requirements"]["max_w_cm"] == 0.45


def test_w2_requires_low_permeability_and_sets_limit():
    result = evaluate_durability(
        {
            "conditions": {
                "water_contact": True,
                "low_permeability_required": True,
            }
        }
    )
    assert result["exposure_classes"]["water"] == "W2"
    assert result["governing_requirements"]["max_w_cm"] == 0.50
    assert result["governing_requirements"]["min_strength_psi"] == 4000
