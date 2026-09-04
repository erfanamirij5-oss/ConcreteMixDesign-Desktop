from tolou_mix_engine.aggregate_compliance import evaluate_aggregate_compliance


def aggregate(**overrides):
    item = {
        "id": "a1",
        "name": "ماسه نمونه",
        "material_type": "fine_aggregate",
        "aggregate_role": "natural_sand",
        "specific_gravity": 2.65,
        "absorption_percent": 1.8,
        "fineness_modulus": 2.7,
        "astm_c117_finer_75um_percent": 2.0,
        "finer_75um_limit_percent": 3.0,
        "gradation_rows": [
            {"sieve_size_mm": 4.75, "percent_passing": 98.0, "standard_min": 95.0, "standard_max": 100.0},
            {"sieve_size_mm": 2.36, "percent_passing": 85.0, "standard_min": 80.0, "standard_max": 100.0},
        ],
    }
    item.update(overrides)
    return item


def test_complete_fine_aggregate_passes():
    result = evaluate_aggregate_compliance({"aggregates": [aggregate()]})
    assert result["status"] == "pass"
    assert result["sources"][0]["gradation"]["status"] == "pass"


def test_gradation_outside_stored_limits_fails():
    result = evaluate_aggregate_compliance({"aggregates": [aggregate(gradation_rows=[{"sieve_size_mm": 4.75, "percent_passing": 90.0, "standard_min": 95.0, "standard_max": 100.0}])]})
    assert result["status"] == "fail"
    assert any(w["code"] == "AGGREGATE_GRADATION_OUTSIDE_LIMITS" for w in result["warnings"])


def test_c117_over_project_limit_fails():
    result = evaluate_aggregate_compliance({"aggregates": [aggregate(astm_c117_finer_75um_percent=4.0)]})
    assert result["status"] == "fail"
    assert any(w["code"] == "ASTM_C117_FINER_75UM_EXCEEDS_LIMIT" for w in result["warnings"])


def test_c117_without_project_limit_needs_review():
    result = evaluate_aggregate_compliance({"aggregates": [aggregate(finer_75um_limit_percent=None)]})
    assert result["status"] == "needs_review"


def test_coarse_aggregate_requires_unit_weight_for_core_completeness():
    result = evaluate_aggregate_compliance({"aggregates": [aggregate(material_type="coarse_aggregate", name="شن نمونه", fineness_modulus=None, unit_weight_kg_m3=None)]})
    assert result["status"] == "needs_review"
    assert any(w["code"] == "AGGREGATE_PHYSICAL_PROPERTIES_INCOMPLETE" for w in result["warnings"])


def test_missing_gradation_limits_needs_review_not_false_pass():
    result = evaluate_aggregate_compliance({"aggregates": [aggregate(gradation_rows=[{"sieve_size_mm": 4.75, "percent_passing": 98.0, "standard_min": None, "standard_max": None}])]})
    assert result["status"] == "needs_review"
