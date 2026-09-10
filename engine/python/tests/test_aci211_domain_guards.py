from __future__ import annotations

from tolou_mix_engine.cli import validate_normal_mix_request
from tolou_mix_engine.mix_design.normal_weight import estimate_strength_w_cm


def test_strength_lookup_refuses_non_air_extrapolation() -> None:
    assert estimate_strength_w_cm(14.999, False) is None
    assert estimate_strength_w_cm(40.001, False) is None


def test_strength_lookup_refuses_air_entrained_extrapolation() -> None:
    assert estimate_strength_w_cm(14.999, True) is None
    assert estimate_strength_w_cm(35.001, True) is None


def test_cli_requires_explicit_wcm_outside_non_air_lookup() -> None:
    result = validate_normal_mix_request({"requirements": {"target_strength_mpa": 45.0, "air_entrained": False}})
    assert result is not None
    assert result["status"] == "fail"
    assert result["error"] == "w_cm_ratio_required_outside_strength_lookup"
    assert result["mix_proportions"]["w_cm_ratio"] is None


def test_cli_requires_explicit_wcm_outside_air_lookup() -> None:
    result = validate_normal_mix_request({"requirements": {"target_strength_mpa": 40.0, "air_entrained": True}})
    assert result is not None
    assert result["status"] == "fail"
    assert result["error"] == "w_cm_ratio_required_outside_strength_lookup"


def test_explicit_project_wcm_allows_outside_strength_lookup_without_extrapolation() -> None:
    result = validate_normal_mix_request(
        {"requirements": {"target_strength_mpa": 45.0, "air_entrained": False, "w_cm_ratio": 0.40}}
    )
    assert result is None


def test_cli_refuses_slump_below_implemented_lookup_domain() -> None:
    result = validate_normal_mix_request(
        {"requirements": {"slump_mm": 24.999, "max_aggregate_size_mm": 19.0, "w_cm_ratio": 0.45}}
    )
    assert result is not None
    assert result["status"] == "fail"
    assert result["error"] == "slump_outside_aci211_lookup_domain"
    assert result["warnings"][0]["code"] == "SLUMP_OUTSIDE_LOOKUP_RANGE"


def test_cli_refuses_slump_above_implemented_lookup_domain() -> None:
    result = validate_normal_mix_request(
        {"requirements": {"slump_mm": 175.001, "max_aggregate_size_mm": 19.0, "w_cm_ratio": 0.45}}
    )
    assert result is not None
    assert result["status"] == "fail"
    assert result["error"] == "slump_outside_aci211_lookup_domain"


def test_cli_accepts_slump_lookup_boundaries() -> None:
    assert validate_normal_mix_request(
        {"requirements": {"slump_mm": 25.0, "max_aggregate_size_mm": 19.0, "w_cm_ratio": 0.45}}
    ) is None
    assert validate_normal_mix_request(
        {"requirements": {"slump_mm": 175.0, "max_aggregate_size_mm": 19.0, "w_cm_ratio": 0.45}}
    ) is None


def test_cli_refuses_non_tabulated_nmsa_instead_of_snapping() -> None:
    result = validate_normal_mix_request(
        {"requirements": {"slump_mm": 100.0, "max_aggregate_size_mm": 20.0, "w_cm_ratio": 0.45}}
    )
    assert result is not None
    assert result["status"] == "fail"
    assert result["error"] == "nmsa_not_tabulated_for_aci211_lookup"
    assert result["warnings"][0]["code"] == "NMSA_LOOKUP_SNAPPING_REFUSED"


def test_cli_accepts_each_implemented_nmsa_node() -> None:
    for nmsa in (9.5, 12.5, 19.0, 25.0, 37.5, 50.0, 75.0, 150.0):
        assert validate_normal_mix_request(
            {"requirements": {"slump_mm": 100.0, "max_aggregate_size_mm": nmsa, "w_cm_ratio": 0.45}}
        ) is None
