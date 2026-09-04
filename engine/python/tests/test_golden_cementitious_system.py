from tolou_mix_engine.cementitious import allocate_cementitious


def test_golden_cementitious_mass_share_and_weighted_specific_gravity():
    """70/30 binder split with independently derived harmonic volume balance."""
    total = 400.0
    materials = [
        {
            "id": "cement",
            "name": "Portland cement",
            "material_type": "cement",
            "material_subtype": "portland_cement",
            "binder_share_percent": 70.0,
            "specific_gravity": 3.15,
            "standard_designation": "ASTM C150 Type I/II",
        },
        {
            "id": "slag",
            "name": "Slag cement",
            "material_type": "scm",
            "material_subtype": "slag_cement",
            "binder_share_percent": 30.0,
            "specific_gravity": 2.90,
            "standard_designation": "ASTM C989",
        },
    ]

    result = allocate_cementitious(materials, total)

    cement_mass = 400.0 * 0.70
    slag_mass = 400.0 * 0.30
    expected_absolute_volume = cement_mass / (3.15 * 1000.0) + slag_mass / (2.90 * 1000.0)
    expected_weighted_sg = total / (expected_absolute_volume * 1000.0)

    assert result["warnings"] == []
    assert result["components"][0]["mass_kg_m3"] == 280.0
    assert result["components"][1]["mass_kg_m3"] == 120.0
    assert result["components"][0]["share_percent"] == 70.0
    assert result["components"][1]["share_percent"] == 30.0
    assert result["absolute_volume_m3"] == round(expected_absolute_volume, 6)
    assert result["weighted_specific_gravity"] == round(expected_weighted_sg, 4)
    assert result["weighted_specific_gravity"] == 3.0706
