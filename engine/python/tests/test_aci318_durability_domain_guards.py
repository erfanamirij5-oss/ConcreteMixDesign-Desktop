from __future__ import annotations

from tolou_mix_engine.durability import AIR_CONTENT_PERCENT, evaluate_durability


def test_freeze_thaw_air_requirement_refuses_non_tabulated_nmsa() -> None:
    result = evaluate_durability(
        {
            "max_aggregate_size_mm": 20.0,
            "conditions": {
                "freeze_thaw_exposure": True,
                "freeze_water_exposure": "frequent",
            },
        }
    )
    assert result["status"] == "fail"
    assert result["error"] == "durability_air_nmsa_not_tabulated"
    assert result["governing_requirements"]["target_air_percent"] is None
    assert result["warnings"][0]["code"] == "AIR_TABLE_NMSA_SNAPPING_REFUSED"


def test_freeze_thaw_air_requirement_accepts_each_implemented_nmsa_node() -> None:
    for nmsa in AIR_CONTENT_PERCENT:
        result = evaluate_durability(
            {
                "max_aggregate_size_mm": nmsa,
                "conditions": {
                    "freeze_thaw_exposure": True,
                    "freeze_water_exposure": "frequent",
                },
            }
        )
        assert result["status"] != "fail"
        assert result["governing_requirements"]["target_air_percent"] is not None


def test_non_tabulated_nmsa_does_not_fail_when_no_freeze_thaw_air_requirement_applies() -> None:
    result = evaluate_durability(
        {
            "max_aggregate_size_mm": 20.0,
            "conditions": {"freeze_thaw_exposure": False},
        }
    )
    assert result["status"] != "fail"
    assert result["governing_requirements"]["target_air_percent"] is None
