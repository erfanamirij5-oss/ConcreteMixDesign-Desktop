from tolou_mix_engine.integrated_design import calculate_integrated_normal_mix


def test_unsupported_concrete_type_has_complete_traceability_contract():
    result = calculate_integrated_normal_mix({"concrete_type": "self_compacting"})

    assert result["status"] == "fail"
    assert result["error"] == "unsupported_concrete_type_for_current_engine"
    assert result["calculation_method"] == "engineering_scope_guard_no_proportioning_performed"
    assert result["mix_proportions"] == {}
    assert result["standard_references"]
    assert result["engineering_notes"]
    assert result["assumptions"]
    assert result["limitations"]
    assert result["calculation_pipeline"] == ["engineering_scope_guard"]
    assert any("requested_concrete_type=self_compacting" == row for row in result["assumptions"])
    assert any(warning["code"] == "CONCRETE_TYPE_NOT_IMPLEMENTED" for warning in result["warnings"])
