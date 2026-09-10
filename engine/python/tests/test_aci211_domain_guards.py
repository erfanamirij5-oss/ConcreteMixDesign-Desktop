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
