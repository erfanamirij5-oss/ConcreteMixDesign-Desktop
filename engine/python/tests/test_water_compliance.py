from datetime import UTC, datetime, timedelta

from tolou_mix_engine.water_compliance import evaluate_mixing_water_compliance


def today():
    return datetime.now(UTC).date()


def water(**overrides):
    item = {
        "id": "w1",
        "name": "آب شهری",
        "material_type": "water",
        "material_subtype": "mixing_water",
        "water_source_class": "potable",
        "water_share_percent": 100.0,
        "chloride_mg_l": 120.0,
        "sulfate_mg_l": 250.0,
        "alkalis_na2oeq_mg_l": 80.0,
        "total_solids_mg_l": 700.0,
        "c1602_strength_ratio_7d_percent": 96.0,
        "c1602_setting_time_deviation_min": 20.0,
    }
    item.update(overrides)
    return item


def nonpotable(**overrides):
    return water(
        name="آب چاه غیرآشامیدنی",
        material_subtype="other",
        water_source_class="nonpotable",
        c1602_last_qualification_date=today().isoformat(),
        **overrides,
    )


def recycled(**overrides):
    return water(
        name="آب بازیافتی کارخانه",
        material_subtype="wash_water",
        water_source_class="concrete_production",
        density_kg_m3=1020.0,
        c1602_last_qualification_date=today().isoformat(),
        c1602_last_density_check_date=today().isoformat(),
        c1602_density_monitoring_method="astm_c1603",
        **overrides,
    )


def test_single_potable_source_passes_without_performance_test_requirement():
    result = evaluate_mixing_water_compliance(
        {"admixtures": [water(c1602_strength_ratio_7d_percent=None, c1602_setting_time_deviation_min=None)]},
        {},
    )
    assert result["status"] == "pass"
    assert result["combined_water"]["performance_qualified"] is True


def test_nonpotable_strength_below_90_fails():
    result = evaluate_mixing_water_compliance({"admixtures": [nonpotable(c1602_strength_ratio_7d_percent=89.0)]}, {})
    assert result["status"] == "fail"
    assert any(item["code"] == "ASTM_C1602_PERFORMANCE_FAILED" for item in result["warnings"])


def test_nonpotable_setting_time_outside_window_fails():
    result = evaluate_mixing_water_compliance({"admixtures": [nonpotable(c1602_setting_time_deviation_min=95.0)]}, {})
    assert result["status"] == "fail"


def test_nonpotable_missing_performance_data_needs_review():
    result = evaluate_mixing_water_compliance({"admixtures": [nonpotable(c1602_strength_ratio_7d_percent=None)]}, {})
    assert result["status"] == "needs_review"


def test_two_sources_require_combined_performance_qualification():
    first = water(id="w1", name="شهری", water_share_percent=70.0)
    second = recycled(id="w2", water_share_percent=30.0)
    result = evaluate_mixing_water_compliance({"admixtures": [first, second]}, {})
    assert result["status"] == "needs_review"
    assert result["combined_water"]["chloride_mg_l"] == 120.0
    assert any(item["code"] == "COMBINED_WATER_PERFORMANCE_TEST_REQUIRED" for item in result["warnings"])


def test_optional_chemical_exceedance_is_review_not_false_fail():
    result = evaluate_mixing_water_compliance({"admixtures": [water(sulfate_mg_l=3500.0)]}, {})
    assert result["status"] == "needs_review"
    assert any(item["code"] == "ASTM_C1602_OPTIONAL_CHEMICAL_LIMIT_EXCEEDED" for item in result["warnings"])


def test_prestressed_uses_lower_chloride_screening_limit():
    result = evaluate_mixing_water_compliance(
        {"admixtures": [water(chloride_mg_l=600.0)]},
        {"prestressed_concrete": True},
    )
    chloride = next(item for item in result["combined_water"]["chemical_checks"] if item["parameter"] == "chloride_mg_l")
    assert chloride["limit"] == 500.0
    assert chloride["status"] == "exceeds_optional_limit"


def test_recycled_water_requires_daily_density_monitoring():
    result = evaluate_mixing_water_compliance(
        {"admixtures": [recycled(c1602_last_density_check_date=(today() - timedelta(days=3)).isoformat())]},
        {},
    )
    assert result["status"] == "needs_review"
    assert any(item["code"] == "C1602_DAILY_DENSITY_MONITORING_DUE" for item in result["warnings"])


def test_recycled_water_density_controls_default_qualification_frequency():
    low = evaluate_mixing_water_compliance({"admixtures": [recycled(density_kg_m3=1005.0)]}, {})
    mid = evaluate_mixing_water_compliance({"admixtures": [recycled(density_kg_m3=1020.0)]}, {})
    high = evaluate_mixing_water_compliance({"admixtures": [recycled(density_kg_m3=1040.0)]}, {})
    assert low["monitoring"]["sources"][0]["qualification_frequency"] == "every_6_months_default"
    assert mid["monitoring"]["sources"][0]["qualification_frequency"] == "monthly_default"
    assert high["monitoring"]["sources"][0]["qualification_frequency"] == "weekly_default"


def test_nonpotable_default_requalification_due_after_three_months():
    result = evaluate_mixing_water_compliance(
        {"admixtures": [nonpotable(c1602_last_qualification_date=(today() - timedelta(days=100)).isoformat())]},
        {},
    )
    assert result["status"] == "needs_review"
    assert result["monitoring"]["sources"][0]["qualification_due"] is True
