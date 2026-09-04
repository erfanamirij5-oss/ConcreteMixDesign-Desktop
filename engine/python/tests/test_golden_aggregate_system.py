from tolou_mix_engine.aggregate_compliance import evaluate_aggregate_compliance
from tolou_mix_engine.blend_optimizer import optimize_aggregate_blend
from tolou_mix_engine.combined_aggregate import evaluate_combined_aggregate_system


def _gradation(rows):
    return [
        {
            "sieve_size_mm": sieve,
            "percent_passing": passing,
            "standard_min": minimum,
            "standard_max": maximum,
        }
        for sieve, passing, minimum, maximum in rows
    ]


def test_golden_aggregate_quality_complete_sources_pass_explicit_limits():
    """Reference case: no implicit acceptance criteria; every required limit is explicit."""
    materials = {
        "aggregates": [
            {
                "id": "sand",
                "name": "Reference natural sand",
                "material_type": "fine_aggregate",
                "aggregate_role": "natural_sand",
                "aggregate_quality_standard": "ASTM C33/C33M-24a",
                "gradation_rows": _gradation(
                    [
                        (4.75, 100.0, 95.0, 100.0),
                        (2.36, 85.0, 80.0, 100.0),
                        (0.60, 35.0, 25.0, 60.0),
                    ]
                ),
                "astm_c117_finer_75um_percent": 2.0,
                "finer_75um_limit_percent": 3.0,
                "astm_c127_c128_ssd_specific_gravity": 2.65,
                "astm_c127_c128_absorption_percent": 1.5,
                "fineness_modulus": 2.70,
            },
            {
                "id": "stone",
                "name": "Reference 19 mm coarse aggregate",
                "material_type": "coarse_aggregate",
                "aggregate_role": "coarse_19",
                "aggregate_quality_standard": "ASTM C33/C33M-24a",
                "gradation_rows": _gradation(
                    [
                        (19.0, 100.0, 95.0, 100.0),
                        (4.75, 5.0, 0.0, 10.0),
                    ]
                ),
                "astm_c117_finer_75um_percent": 0.5,
                "finer_75um_limit_percent": 1.0,
                "astm_c127_c128_ssd_specific_gravity": 2.68,
                "astm_c127_c128_absorption_percent": 0.8,
                "astm_c29_rodded_unit_weight_kg_m3": 1600.0,
                "la_abrasion_method": "astm_c131",
                "la_abrasion_loss_percent": 25.0,
                "la_abrasion_limit_percent": 40.0,
            },
        ]
    }

    result = evaluate_aggregate_compliance(materials)

    assert result["status"] == "pass"
    assert result["data_complete"] is True
    assert result["warnings"] == []
    sand, stone = result["sources"]
    assert sand["gradation"]["status"] == "pass"
    assert sand["gradation"]["fineness_modulus"] == 2.70
    assert sand["fines_75um"] == {
        "status": "pass",
        "astm_c117_percent": 2.0,
        "limit_percent": 3.0,
    }
    assert stone["abrasion"]["status"] == "pass"
    assert stone["abrasion"]["loss_percent"] == 25.0
    assert stone["abrasion"]["limit_percent"] == 40.0


def test_golden_combined_curve_is_direct_weighted_mass_balance():
    """40/60 blend: P_combined = 0.40*P_sand + 0.60*P_stone at each common sieve."""
    materials = {
        "aggregates": [
            {
                "id": "sand",
                "name": "Reference sand",
                "material_type": "fine_aggregate",
                "gradation_rows": [
                    {"sieve_size_mm": 4.75, "percent_passing": 100.0},
                    {"sieve_size_mm": 2.36, "percent_passing": 80.0},
                    {"sieve_size_mm": 0.60, "percent_passing": 30.0},
                ],
            },
            {
                "id": "stone",
                "name": "Reference stone",
                "material_type": "coarse_aggregate",
                "gradation_rows": [
                    {"sieve_size_mm": 4.75, "percent_passing": 10.0},
                    {"sieve_size_mm": 2.36, "percent_passing": 2.0},
                    {"sieve_size_mm": 0.60, "percent_passing": 0.0},
                ],
                "astm_d4791_flat_elongated_percent": 6.0,
                "flat_elongated_limit_percent": 10.0,
                "astm_d5821_fractured_particles_percent": 90.0,
                "fractured_particles_min_percent": 80.0,
            },
        ],
        "aggregate_blend_shares": [
            {"material_id": "sand", "share_percent": 40.0},
            {"material_id": "stone", "share_percent": 60.0},
        ],
    }

    result = evaluate_combined_aggregate_system(materials, {}, "normal_weight")

    expected = {
        4.75: 46.0,  # 0.40*100 + 0.60*10
        2.36: 33.2,  # 0.40*80  + 0.60*2
        0.60: 12.0,  # 0.40*30  + 0.60*0
    }
    actual = {row["sieve_size_mm"]: row["percent_passing"] for row in result["combined_curve"]}
    assert result["status"] == "pass"
    assert result["share_basis"] == "stored_manual_blend"
    assert result["share_total_percent"] == 100.0
    assert result["fine_aggregate_share_percent"] == 40.0
    assert result["coarse_aggregate_share_percent"] == 60.0
    assert actual == expected
    assert result["continuity"]["zero_retained_interval_count"] == 0
    assert result["continuity"]["nonmonotonic_interval_count"] == 0


def test_golden_blend_optimizer_ranks_known_50_50_solution_first():
    """Independent envelope is centered on the analytically known 50/50 combined curve."""
    materials = {
        "aggregates": [
            {
                "id": "sand",
                "name": "Reference sand",
                "material_type": "fine_aggregate",
                "gradation_rows": [
                    {"sieve_size_mm": 4.75, "percent_passing": 100.0},
                    {"sieve_size_mm": 2.36, "percent_passing": 80.0},
                    {"sieve_size_mm": 0.60, "percent_passing": 30.0},
                ],
            },
            {
                "id": "stone",
                "name": "Reference stone",
                "material_type": "coarse_aggregate",
                "gradation_rows": [
                    {"sieve_size_mm": 4.75, "percent_passing": 10.0},
                    {"sieve_size_mm": 2.36, "percent_passing": 2.0},
                    {"sieve_size_mm": 0.60, "percent_passing": 0.0},
                ],
            },
        ]
    }
    options = {
        "blend_optimizer_enabled": True,
        "aggregate_blend_optimizer_step_percent": 25.0,
        "aggregate_blend_optimizer_top_n": 5,
        "fine_aggregate_share_range": [50.0, 50.0],
        "combined_gradation_limits": [
            {"sieve_size_mm": 4.75, "min_percent": 54.0, "max_percent": 56.0},
            {"sieve_size_mm": 2.36, "min_percent": 40.0, "max_percent": 42.0},
            {"sieve_size_mm": 0.60, "min_percent": 14.0, "max_percent": 16.0},
        ],
    }

    result = optimize_aggregate_blend(materials, options)

    assert result["status"] == "pass"
    assert result["evaluated_candidate_count"] == 5
    assert result["estimated_candidate_count"] == 5
    assert result["common_sieve_count"] == 3
    best = result["candidates"][0]
    shares = {row["material_id"]: row["share_percent"] for row in best["shares"]}
    curve = {row["sieve_size_mm"]: row["percent_passing"] for row in best["combined_curve"]}
    assert shares == {"sand": 50.0, "stone": 50.0}
    assert curve == {4.75: 55.0, 2.36: 41.0, 0.60: 15.0}
    assert best["score"] == 100.0
    assert best["metrics"]["combined_limit_failure_count"] == 0
    assert best["metrics"]["zero_retained_interval_count"] == 0
    assert best["metrics"]["fine_share_penalty"] == 0.0
