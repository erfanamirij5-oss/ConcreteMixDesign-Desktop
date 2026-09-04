from tolou_mix_engine.blend_optimizer import optimize_aggregate_blend


def test_manual_blend_lock_takes_priority_over_enabled_optimizer():
    materials = {
        "aggregates": [
            {
                "id": "sand",
                "name": "ماسه",
                "material_type": "fine_aggregate",
                "gradation_rows": [
                    {"sieve_size_mm": 4.75, "percent_passing": 98},
                    {"sieve_size_mm": 2.36, "percent_passing": 86},
                ],
            },
            {
                "id": "coarse",
                "name": "بادامی",
                "material_type": "coarse_aggregate",
                "gradation_rows": [
                    {"sieve_size_mm": 4.75, "percent_passing": 3},
                    {"sieve_size_mm": 2.36, "percent_passing": 1},
                ],
            },
        ]
    }

    result = optimize_aggregate_blend(
        materials,
        {
            "manual_blend_enabled": True,
            "blend_optimizer_enabled": True,
            "aggregate_blend_optimizer_step_percent": 5,
            "combined_gradation_limits": [
                {"sieve_size_mm": 4.75, "min_percent": 0, "max_percent": 100}
            ],
        },
    )

    assert result["status"] == "manual_locked"
    assert result["evaluated_candidate_count"] == 0
    assert result["estimated_candidate_count"] == 0
    assert result["candidates"] == []
    assert result["warnings"] == []
    assert "دستی" in result["note"]
