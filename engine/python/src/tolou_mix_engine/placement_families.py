from __future__ import annotations

from copy import deepcopy
from typing import Any

from tolou_mix_engine.integrated_design import calculate_integrated_normal_mix

SUPPORTED_G07_FAMILIES = {"self_consolidating", "pumped"}


def _fail(family_id: str, code: str, message: str) -> dict[str, Any]:
    return {
        "status": "fail",
        "engine": "tolou-mix-engine",
        "error": code,
        "concrete_family": family_id,
        "mix_proportions": {},
        "warnings": [{"code": code.upper(), "severity": "fail", "message": message}],
        "design_confidence": "CONCEPTUAL_OR_PRELIMINARY",
        "limitations": ["Trial Mix and placement-specific validation are required before production acceptance."],
    }


def _require_mapping(source: dict[str, Any], key: str, family_id: str) -> dict[str, Any] | None:
    value = source.get(key)
    if not isinstance(value, dict) or not value:
        return _fail(family_id, f"{key}_required", f"{key} must be explicitly defined for {family_id}.")
    return None


def _calculate_scc(source: dict[str, Any]) -> dict[str, Any]:
    family_id = "self_consolidating"
    for key in ("scc_performance_requirements", "scc_test_plan"):
        error = _require_mapping(source, key, family_id)
        if error is not None:
            return error

    performance = dict(source["scc_performance_requirements"])
    test_plan = dict(source["scc_test_plan"])
    required_performance = ("filling_ability", "passing_ability", "segregation_resistance")
    missing = [name for name in required_performance if not performance.get(name)]
    if missing:
        return _fail(
            family_id,
            "incomplete_scc_performance_requirements",
            "SCC requires explicit filling ability, passing ability, and segregation resistance requirements.",
        )
    if not test_plan.get("fresh_property_tests"):
        return _fail(
            family_id,
            "scc_fresh_test_plan_required",
            "SCC requires an explicit fresh-property test plan; Tolou does not infer acceptance from slump alone.",
        )

    return {
        "status": "needs_review",
        "engine": "tolou-mix-engine",
        "concrete_family": family_id,
        "design_strategy": "scc_rheology_stability_performance_strategy",
        "design_confidence": "PRELIMINARY_UNTIL_TRIAL_AND_CALIBRATION",
        "mix_proportions": {},
        "scc_performance_requirements": performance,
        "scc_test_plan": test_plan,
        "warnings": [],
        "engineering_notes": [
            "SCC is governed by fresh-state performance, including filling ability, passing ability, and segregation resistance.",
            "G07 does not encode unverified numerical SCC acceptance limits or fabricate mixture proportions.",
            "A Trial Mix with the project-selected SCC fresh-property tests is required before production acceptance.",
        ],
        "standard_references": [
            "ACI PRC-237-07 (Reapproved 2019) - Self-Consolidating Concrete",
            "Project-selected ASTM/EN SCC test methods must be edition-pinned in the rule pack before numerical acceptance criteria are automated.",
        ],
        "limitations": ["No production-ready SCC mixture is claimed from requirements alone."],
    }


def _calculate_pumped(source: dict[str, Any]) -> dict[str, Any]:
    family_id = "pumped"
    error = _require_mapping(source, "pumpability_requirements", family_id)
    if error is not None:
        return error

    pumpability = dict(source["pumpability_requirements"])
    required = ("placement_distance", "vertical_rise", "line_configuration")
    missing = [name for name in required if pumpability.get(name) in (None, "", {})]
    if missing:
        return _fail(
            family_id,
            "incomplete_pumpability_requirements",
            "Pumpable concrete requires explicit placement distance, vertical rise, and line configuration.",
        )

    base_payload = deepcopy(source)
    base_payload["concrete_type"] = "normal_weight"
    base_result = calculate_integrated_normal_mix(base_payload)
    if base_result.get("status") == "fail":
        base_result["concrete_family"] = family_id
        base_result["design_strategy"] = "normal_weight_base_with_pumpability_overlay"
        return base_result

    base_result["concrete_family"] = family_id
    base_result["design_strategy"] = "normal_weight_base_with_pumpability_overlay"
    base_result["design_confidence"] = "PRELIMINARY_UNTIL_PUMPABILITY_VALIDATION"
    base_result["pumpability_requirements"] = pumpability
    base_result.setdefault("engineering_notes", []).extend(
        [
            "Pumpability is treated as a placement-performance overlay, not as a replacement for the base concrete engineering design.",
            "No unverified ACI 211.9 numerical pumpability limits are encoded in G07.",
            "Trial batching and project-representative pumping validation are required before production acceptance.",
        ]
    )
    base_result.setdefault("standard_references", []).append(
        "ACI PRC-211.9-18 - Guide to Selecting Proportions for Pumpable Concrete"
    )
    return base_result


def calculate_placement_family(payload: dict[str, Any]) -> dict[str, Any]:
    source = deepcopy(payload if isinstance(payload, dict) else {})
    family_id = str(source.get("concrete_type") or "").strip().lower()
    aliases = {"scc": "self_consolidating", "self_compacting": "self_consolidating", "pumpable": "pumped"}
    family_id = aliases.get(family_id, family_id)

    if family_id not in SUPPORTED_G07_FAMILIES:
        return _fail(family_id, "unsupported_g07_family", "This family is outside the G07 placement-engine scope.")
    if family_id == "self_consolidating":
        return _calculate_scc(source)
    return _calculate_pumped(source)
