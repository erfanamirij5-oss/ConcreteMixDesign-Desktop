from tolou_mix_engine.engineering_advisor import (
    AdvisorMessageKind,
    DesignConfidence,
    assess_design,
    determine_confidence,
)
from tolou_mix_engine.standards import (
    RuleOutcome,
    RuleResult,
    RuleSeverity,
    StandardIdentity,
)


def _normal_complete_context() -> dict:
    return {
        "project_requirements": {"target_strength_mpa": 30},
        "material_characterization": {"cement": "specific"},
        "service_environment": {"exposure": "defined"},
        "target_fresh_properties": {"slump_mm": 100},
        "target_hardened_properties": {"strength_mpa": 30},
        "aggregate_gradation": [{"sieve_mm": 4.75}],
        "aggregate_moisture_absorption": {"fine": 1.2},
    }


def test_unknown_family_fails_closed():
    result = assess_design("not_registered", {})
    assert result.confidence == DesignConfidence.D_CONCEPTUAL
    assert result.messages[0].kind == AdvisorMessageKind.REQUIRED
    assert result.messages[0].code == "UNKNOWN_CONCRETE_FAMILY"


def test_missing_required_inputs_are_explicit_and_next_action_blocks_progress():
    result = assess_design("normal_weight", {})
    assert any(item.kind == AdvisorMessageKind.REQUIRED for item in result.messages)
    assert any(item.code == "COMPLETE_REQUIRED_INPUTS" for item in result.messages)


def test_confidence_state_is_monotonic_with_evidence():
    assert determine_confidence({}) == DesignConfidence.D_CONCEPTUAL
    assert determine_confidence({"partial_material_data": True}) == DesignConfidence.C_PRELIMINARY
    assert determine_confidence({"material_specific_data": True}) == DesignConfidence.B_MATERIAL_SPECIFIC
    assert determine_confidence({"trial_completed": True, "calibration_completed": True}) == DesignConfidence.A_VERIFIED


def test_standard_fail_is_surface_as_warning_and_blocks_candidate_progress():
    standard = StandardIdentity("ACI", "TEST", "2026")
    rule_result = RuleResult(
        rule_id="R1",
        standard=standard,
        title="حد نمونه",
        parameter="w_cm",
        unit=None,
        reference="verified test reference",
        severity=RuleSeverity.HARD,
        outcome=RuleOutcome.FAIL,
        reason="limit exceeded",
        actual_value=0.6,
        limit_value=0.5,
    )
    context = _normal_complete_context() | {"material_specific_data": True}
    result = assess_design("normal_weight", context, [rule_result])
    assert any(item.code == "STANDARD_FAIL_R1" for item in result.messages)
    assert any(item.code == "RESOLVE_STANDARD_FAILURES" for item in result.messages)


def test_material_specific_design_requires_trial_for_verified_state():
    context = _normal_complete_context() | {"material_specific_data": True}
    result = assess_design("normal_weight", context)
    assert result.confidence == DesignConfidence.B_MATERIAL_SPECIFIC
    assert any(item.code == "TRIAL_REQUIRED_FOR_VERIFICATION" for item in result.messages)
    assert any(item.code == "ADVANCE_TO_TRIAL_VALIDATION" for item in result.messages)
