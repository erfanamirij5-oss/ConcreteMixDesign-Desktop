from tolou_mix_engine.aggregate_compliance import evaluate_aggregate_compliance


def _fine_aggregate(**overrides):
    item = {
        "id": "g02c-fine-1",
        "name": "G02C fine aggregate",
        "material_type": "fine_aggregate",
        "aggregate_role": "natural_sand",
        "specific_gravity": 2.65,
        "absorption_percent": 1.5,
        "fineness_modulus": 2.7,
        "astm_c117_finer_75um_percent": 2.0,
        "finer_75um_limit_percent": 3.0,
        "gradation_rows": [
            {
                "sieve_size_mm": 4.75,
                "percent_passing": 98.0,
                "standard_min": 95.0,
                "standard_max": 100.0,
            }
        ],
    }
    item.update(overrides)
    return item


def test_method_result_without_acceptance_limit_never_passes():
    result = evaluate_aggregate_compliance(
        {"aggregates": [_fine_aggregate(finer_75um_limit_percent=None)]}
    )

    assert result["status"] == "needs_review"
    assert result["sources"][0]["fines_75um"]["status"] == "needs_review"
    assert any(w["code"] == "C117_PROJECT_LIMIT_MISSING" for w in result["warnings"])


def test_explicit_acceptance_limit_is_compared_deterministically():
    result = evaluate_aggregate_compliance(
        {
            "aggregates": [
                _fine_aggregate(
                    astm_c117_finer_75um_percent=4.0,
                    finer_75um_limit_percent=3.0,
                )
            ]
        }
    )

    assert result["status"] == "fail"
    assert result["sources"][0]["fines_75um"]["status"] == "fail"
    assert result["sources"][0]["fines_75um"]["astm_c117_percent"] == 4.0
    assert result["sources"][0]["fines_75um"]["limit_percent"] == 3.0


def test_physical_test_method_values_do_not_create_implicit_acceptance_limit():
    result = evaluate_aggregate_compliance({"aggregates": [_fine_aggregate()]})

    physical = result["sources"][0]["physical_properties"]
    assert physical["data_complete"] is True
    assert physical["ssd_specific_gravity"] == 2.65
    assert physical["absorption_percent"] == 1.5
    assert "status" not in physical


def test_stored_gradation_limits_are_compared_without_claiming_source_verification():
    result = evaluate_aggregate_compliance(
        {
            "aggregates": [
                _fine_aggregate(
                    gradation_rows=[
                        {
                            "sieve_size_mm": 4.75,
                            "percent_passing": 90.0,
                            "standard_min": 95.0,
                            "standard_max": 100.0,
                        }
                    ]
                )
            ]
        }
    )

    assert result["status"] == "fail"
    gradation = result["sources"][0]["gradation"]
    assert gradation["status"] == "fail"
    assert gradation["failure_count"] == 1
    # The executable comparison uses stored limits only. This test intentionally
    # does not assert that those limits are verified ASTM C33/C33M values.
