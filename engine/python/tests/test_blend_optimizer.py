from tolou_mix_engine.blend_optimizer import optimize_aggregate_blend


def source(material_id: str, name: str, material_type: str, passing: dict[float, float]) -> dict:
    return {
        "id": material_id,
        "name": name,
        "material_type": material_type,
        "gradation_rows": [
            {"sieve_size_mm": sieve, "percent_passing": percent}
            for sieve, percent in passing.items()
        ],
    }


def materials() -> dict:
    return {
        "aggregates": [
            source("sand", "ماسه", "fine_aggregate", {19: 100, 9.5: 100, 4.75: 98, 2.36: 86, 0.6: 42}),
            source("pea", "نخودی", "coarse_aggregate", {19: 100, 9.5: 60, 4.75: 8, 2.36: 2, 0.6: 0}),
            source("coarse", "بادامی", "coarse_aggregate", {19: 95, 9.5: 20, 4.75: 3, 2.36: 1, 0.6: 0}),
        ]
    }


def test_optimizer_returns_ranked_candidates_with_100_percent_shares():
    result = optimize_aggregate_blend(materials(), {"aggregate_blend_optimizer_step_percent": 10})
    assert result["candidates"]
    assert result["candidates"][0]["score"] >= result["candidates"][-1]["score"]
    assert abs(sum(row["share_percent"] for row in result["candidates"][0]["shares"]) - 100) < 1e-9


def test_optimizer_respects_per_source_minimum_and_maximum_constraints():
    result = optimize_aggregate_blend(materials(), {
        "aggregate_blend_optimizer_step_percent": 10,
        "aggregate_blend_constraints": {
            "sand": {"min_percent": 40, "max_percent": 50},
            "pea": {"min_percent": 20, "max_percent": 40},
            "coarse": {"min_percent": 20, "max_percent": 40},
        },
    })
    for candidate in result["candidates"]:
        shares = {row["material_id"]: row["share_percent"] for row in candidate["shares"]}
        assert 40 <= shares["sand"] <= 50
        assert 20 <= shares["pea"] <= 40
        assert 20 <= shares["coarse"] <= 40


def test_combined_gradation_limits_improve_candidate_ranking():
    result = optimize_aggregate_blend(materials(), {
        "aggregate_blend_optimizer_step_percent": 10,
        "combined_gradation_limits": [
            {"sieve_size_mm": 4.75, "min_percent": 35, "max_percent": 50},
            {"sieve_size_mm": 2.36, "min_percent": 25, "max_percent": 45},
        ],
    })
    assert result["status"] == "pass"
    assert result["combined_limits_applied"] is True
    assert result["candidates"][0]["metrics"]["combined_limit_failure_count"] == 0


def test_missing_combined_limits_keeps_optimizer_as_needs_review():
    result = optimize_aggregate_blend(materials(), {"aggregate_blend_optimizer_step_percent": 10})
    assert result["status"] == "needs_review"
    assert any(w["code"] == "BLEND_COMBINED_LIMITS_NOT_SUPPLIED" for w in result["warnings"])


def test_fine_share_range_penalizes_candidates_outside_requested_range():
    result = optimize_aggregate_blend(materials(), {
        "aggregate_blend_optimizer_step_percent": 10,
        "fine_aggregate_share_range": [40, 50],
        "combined_gradation_limits": [{"sieve_size_mm": 4.75, "min_percent": 0, "max_percent": 100}],
    })
    assert 40 <= result["candidates"][0]["fine_aggregate_share_percent"] <= 50


def test_optimizer_reports_no_candidate_when_constraints_cannot_sum_to_100():
    result = optimize_aggregate_blend(materials(), {
        "aggregate_blend_optimizer_step_percent": 10,
        "aggregate_blend_constraints": {
            "sand": {"max_percent": 20},
            "pea": {"max_percent": 20},
            "coarse": {"max_percent": 20},
        },
        "combined_gradation_limits": [{"sieve_size_mm": 4.75, "min_percent": 0, "max_percent": 100}],
    })
    assert result["status"] == "needs_review"
    assert result["candidates"] == []
    assert any(w["code"] == "BLEND_OPTIMIZER_NO_FEASIBLE_CANDIDATE" for w in result["warnings"])


def test_disabled_optimizer_does_not_generate_candidates_or_warnings():
    result = optimize_aggregate_blend(materials(), {"blend_optimizer_enabled": False})
    assert result["status"] == "disabled"
    assert result["evaluated_candidate_count"] == 0
    assert result["candidates"] == []
    assert result["warnings"] == []
