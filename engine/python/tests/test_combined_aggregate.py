from tolou_mix_engine.combined_aggregate import evaluate_combined_aggregate_system


def aggregate(material_id, material_type, rows, **extra):
    item = {
        "id": material_id,
        "name": material_id,
        "material_type": material_type,
        "gradation_rows": rows,
    }
    item.update(extra)
    return item


def test_manual_blend_builds_combined_curve_on_common_sieves_only():
    materials = {
        "aggregates": [
            aggregate("sand", "fine_aggregate", [
                {"sieve_size_mm": 4.75, "percent_passing": 98},
                {"sieve_size_mm": 2.36, "percent_passing": 85},
                {"sieve_size_mm": 0.6, "percent_passing": 40},
            ]),
            aggregate("stone", "coarse_aggregate", [
                {"sieve_size_mm": 19, "percent_passing": 95},
                {"sieve_size_mm": 4.75, "percent_passing": 5},
                {"sieve_size_mm": 2.36, "percent_passing": 2},
            ], astm_d4791_flat_elongated_percent=8, flat_elongated_limit_percent=10,
               astm_d5821_fractured_particles_percent=90, fractured_particles_min_percent=80),
        ],
        "aggregate_blend_shares": [
            {"material_id": "sand", "share_percent": 40},
            {"material_id": "stone", "share_percent": 60},
        ],
    }
    result = evaluate_combined_aggregate_system(materials, {}, "normal_weight")
    assert result["share_basis"] == "stored_manual_blend"
    assert result["common_sieve_count"] == 2
    assert result["key_passing"]["4_75_mm"] == 42.2
    assert result["fine_aggregate_share_percent"] == 40
    assert result["coarse_aggregate_share_percent"] == 60


def test_calculated_ssd_masses_are_used_when_manual_blend_is_absent():
    materials = {
        "aggregates": [
            aggregate("sand", "fine_aggregate", [{"sieve_size_mm": 4.75, "percent_passing": 100}]),
            aggregate("stone", "coarse_aggregate", [{"sieve_size_mm": 4.75, "percent_passing": 10}],
                      astm_d4791_flat_elongated_percent=7,
                      astm_d5821_fractured_particles_percent=85),
        ]
    }
    mix = {"aggregate_analysis": [
        {"material_id": "sand", "ssd_mass_kg_m3": 700},
        {"material_id": "stone", "ssd_mass_kg_m3": 1050},
    ]}
    result = evaluate_combined_aggregate_system(materials, mix)
    assert result["share_basis"] == "calculated_ssd_mass"
    assert result["fine_aggregate_share_percent"] == 40
    assert result["coarse_aggregate_share_percent"] == 60


def test_zero_retained_interval_is_flagged_without_invented_gap_limit():
    rows = [
        {"sieve_size_mm": 19, "percent_passing": 100},
        {"sieve_size_mm": 12.5, "percent_passing": 100},
        {"sieve_size_mm": 4.75, "percent_passing": 50},
    ]
    materials = {
        "aggregates": [aggregate("stone", "coarse_aggregate", rows,
                                 astm_d4791_flat_elongated_percent=5,
                                 astm_d5821_fractured_particles_percent=90)],
        "aggregate_blend_shares": [{"material_id": "stone", "share_percent": 100}],
    }
    result = evaluate_combined_aggregate_system(materials, {}, "pumped")
    assert result["continuity"]["zero_retained_interval_count"] == 1
    assert result["pumpability"]["status"] == "needs_review"
    assert any(w["code"] == "COMBINED_GRADATION_ZERO_RETAINED_INTERVAL" for w in result["warnings"])


def test_pumped_mix_with_complete_common_curve_and_shape_data_is_advisory_not_false_pass_claim():
    materials = {
        "aggregates": [
            aggregate("sand", "fine_aggregate", [
                {"sieve_size_mm": 4.75, "percent_passing": 98},
                {"sieve_size_mm": 2.36, "percent_passing": 82},
            ]),
            aggregate("stone", "coarse_aggregate", [
                {"sieve_size_mm": 4.75, "percent_passing": 8},
                {"sieve_size_mm": 2.36, "percent_passing": 2},
            ], astm_d4791_flat_elongated_percent=6, flat_elongated_limit_percent=10,
               astm_d5821_fractured_particles_percent=90, fractured_particles_min_percent=80),
        ],
        "aggregate_blend_shares": [
            {"material_id": "sand", "share_percent": 45},
            {"material_id": "stone", "share_percent": 55},
        ],
    }
    result = evaluate_combined_aggregate_system(materials, {}, "pumped")
    assert result["pumpability"]["status"] == "advisory"
    assert result["packing"]["status"] == "advisory"


def test_missing_common_sieves_requires_review():
    materials = {
        "aggregates": [
            aggregate("sand", "fine_aggregate", [{"sieve_size_mm": 0.6, "percent_passing": 40}]),
            aggregate("stone", "coarse_aggregate", [{"sieve_size_mm": 19, "percent_passing": 100}],
                      astm_d4791_flat_elongated_percent=6,
                      astm_d5821_fractured_particles_percent=90),
        ],
        "aggregate_blend_shares": [
            {"material_id": "sand", "share_percent": 45},
            {"material_id": "stone", "share_percent": 55},
        ],
    }
    result = evaluate_combined_aggregate_system(materials, {}, "normal_weight")
    assert result["status"] == "needs_review"
    assert result["common_sieve_count"] == 0
