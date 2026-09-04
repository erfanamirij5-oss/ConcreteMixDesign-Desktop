from tolou_mix_engine.blend_optimizer import optimize_aggregate_blend


def source(material_id: str, material_type: str) -> dict:
    return {
        "id": material_id,
        "name": material_id,
        "material_type": material_type,
        "gradation_rows": [
            {"sieve_size_mm": 19.0, "percent_passing": 100.0},
            {"sieve_size_mm": 4.75, "percent_passing": 50.0},
            {"sieve_size_mm": 0.6, "percent_passing": 10.0},
        ],
    }


def test_optimizer_stops_before_combinatorial_search_exceeds_budget():
    materials = {
        "aggregates": [
            source("sand_a", "fine_aggregate"),
            source("sand_b", "fine_aggregate"),
            source("pea_a", "coarse_aggregate"),
            source("pea_b", "coarse_aggregate"),
            source("coarse_a", "coarse_aggregate"),
            source("coarse_b", "coarse_aggregate"),
        ]
    }
    result = optimize_aggregate_blend(
        materials,
        {
            "aggregate_blend_optimizer_step_percent": 1,
            "aggregate_blend_optimizer_max_candidates": 1000,
            "combined_gradation_limits": [
                {"sieve_size_mm": 4.75, "min_percent": 0, "max_percent": 100}
            ],
        },
    )

    assert result["status"] == "needs_review"
    assert result["evaluated_candidate_count"] == 0
    assert result["estimated_candidate_count"] > result["candidate_limit"]
    assert result["candidates"] == []
    assert any(
        warning["code"] == "BLEND_OPTIMIZER_SEARCH_BUDGET_EXCEEDED"
        for warning in result["warnings"]
    )


def test_optimizer_keeps_arbitrary_source_count_when_constraints_make_search_small():
    materials = {
        "aggregates": [
            source("sand_a", "fine_aggregate"),
            source("sand_b", "fine_aggregate"),
            source("pea_a", "coarse_aggregate"),
            source("pea_b", "coarse_aggregate"),
            source("coarse_a", "coarse_aggregate"),
            source("coarse_b", "coarse_aggregate"),
        ]
    }
    constraints = {
        "sand_a": {"min_percent": 20, "max_percent": 20},
        "sand_b": {"min_percent": 20, "max_percent": 20},
        "pea_a": {"min_percent": 15, "max_percent": 15},
        "pea_b": {"min_percent": 15, "max_percent": 15},
        "coarse_a": {"min_percent": 15, "max_percent": 15},
        "coarse_b": {"min_percent": 15, "max_percent": 15},
    }
    result = optimize_aggregate_blend(
        materials,
        {
            "aggregate_blend_optimizer_step_percent": 1,
            "aggregate_blend_optimizer_max_candidates": 1000,
            "aggregate_blend_constraints": constraints,
            "combined_gradation_limits": [
                {"sieve_size_mm": 4.75, "min_percent": 0, "max_percent": 100}
            ],
        },
    )

    assert result["status"] == "pass"
    assert result["estimated_candidate_count"] == 1
    assert result["evaluated_candidate_count"] == 1
    assert len(result["candidates"]) == 1
    assert len(result["candidates"][0]["shares"]) == 6
