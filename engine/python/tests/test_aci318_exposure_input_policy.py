from __future__ import annotations

from tolou_mix_engine.durability import evaluate_durability
from tolou_mix_engine.durability_input_policy import validate_active_exposure_inputs


def test_freeze_thaw_active_requires_explicit_water_contact_frequency() -> None:
    result = evaluate_durability(
        {
            "conditions": {"freeze_thaw_exposure": True},
            "max_aggregate_size_mm": 19.0,
        }
    )
    assert result["status"] == "fail"
    assert result["error"] == "durability_exposure_inputs_incomplete"
    assert result["exposure_classes"] == {}
    assert result["warnings"][0]["code"] == "FREEZE_WATER_EXPOSURE_REQUIRED"


def test_water_contact_active_requires_explicit_low_permeability_decision() -> None:
    issues = validate_active_exposure_inputs({"water_contact": True})
    assert [item["code"] for item in issues] == ["LOW_PERMEABILITY_DECISION_REQUIRED"]


def test_moisture_exposure_active_requires_explicit_external_chloride_decision() -> None:
    issues = validate_active_exposure_inputs({"moisture_exposure": True})
    assert [item["code"] for item in issues] == ["EXTERNAL_CHLORIDE_DECISION_REQUIRED"]


def test_contradictory_subordinate_flags_fail_closed() -> None:
    issues = validate_active_exposure_inputs(
        {
            "freeze_water_exposure": "frequent",
            "low_permeability_required": True,
            "external_chloride_exposure": True,
        }
    )
    assert {item["code"] for item in issues} == {
        "FREEZE_THAW_FLAG_REQUIRED",
        "WATER_CONTACT_FLAG_REQUIRED",
        "MOISTURE_EXPOSURE_FLAG_REQUIRED",
    }


def test_explicit_active_inputs_preserve_existing_classification_behavior() -> None:
    result = evaluate_durability(
        {
            "conditions": {
                "freeze_thaw_exposure": True,
                "freeze_water_exposure": "frequent",
                "water_contact": True,
                "low_permeability_required": False,
                "moisture_exposure": True,
                "external_chloride_exposure": False,
            },
            "max_aggregate_size_mm": 19.0,
        }
    )
    assert result["status"] in {"pass", "warning"}
    assert result["exposure_classes"]["freeze_thaw"] == "F2"
    assert result["exposure_classes"]["water"] == "W1"
    assert result["exposure_classes"]["corrosion"] == "C1"


def test_legacy_all_inactive_baseline_remains_backward_compatible() -> None:
    result = evaluate_durability({"conditions": {}, "max_aggregate_size_mm": 19.0})
    assert result["status"] in {"pass", "warning"}
    assert result["exposure_classes"] == {
        "freeze_thaw": "F0",
        "sulfate": "S0",
        "water": "W0",
        "corrosion": "C0",
    }
