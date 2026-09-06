from tolou_mix_engine.cli import validate_family_command_request
from tolou_mix_engine.concrete_families import (
    CONCRETE_FAMILIES,
    get_concrete_family,
    list_concrete_families,
    normalize_concrete_family_id,
    supports_engine_command,
)


def test_family_ids_and_aliases_are_unique_and_resolvable():
    ids = [family.id for family in CONCRETE_FAMILIES]
    assert len(ids) == len(set(ids))
    assert normalize_concrete_family_id("SCC") == "self_consolidating"
    assert normalize_concrete_family_id("HPC") == "high_performance"
    assert normalize_concrete_family_id("normal") == "normal_weight"
    assert get_concrete_family("uhpc").design_strategy == "uhpc_particle_packing"


def test_only_explicit_capabilities_can_enter_legacy_normal_mix_command():
    assert supports_engine_command("normal_weight", "calculate-normal-mix") is True
    assert supports_engine_command("pumped", "calculate-normal-mix") is True
    assert supports_engine_command("high_strength", "calculate-normal-mix") is False
    assert supports_engine_command("high_performance", "calculate-normal-mix") is False
    assert supports_engine_command("self_consolidating", "calculate-normal-mix") is False
    assert supports_engine_command("uhpc", "calculate-normal-mix") is False
    assert supports_engine_command("unknown-family", "calculate-normal-mix") is False


def test_scc_is_blocked_from_legacy_normal_mix_even_when_g07_capability_is_active():
    error, normalized = validate_family_command_request(
        {"concrete_type": "SCC", "requirements": {"target_strength_mpa": 45}},
        "calculate-normal-mix",
    )
    assert normalized["concrete_type"] == "self_consolidating"
    assert error is not None
    assert error["status"] == "fail"
    assert error["error"] == "unsupported_concrete_type_for_current_engine"
    assert error["implementation_status"] == "active"
    assert error["mix_proportions"] == {}


def test_alias_is_normalized_before_legacy_normal_weight_engine_routing():
    error, normalized = validate_family_command_request(
        {"concrete_type": "normal", "requirements": {"target_strength_mpa": 30}},
        "calculate-normal-mix",
    )
    assert error is None
    assert normalized["concrete_type"] == "normal_weight"


def test_g07_family_capabilities_are_explicit_and_fail_closed():
    catalog = list_concrete_families()
    by_id = {item["id"]: item for item in catalog}
    expected_active_capabilities = {
        "normal_weight": ["calculate-normal-mix", "calculate-family-mix"],
        "pumped": ["calculate-normal-mix", "calculate-placement-family"],
        "high_strength": ["calculate-family-mix"],
        "high_performance": ["calculate-family-mix"],
        "self_consolidating": ["calculate-placement-family"],
    }
    for family_id, commands in expected_active_capabilities.items():
        assert by_id[family_id]["implementation_status"] == "active"
        assert by_id[family_id]["supported_commands"] == commands

    planned_families = set(by_id) - set(expected_active_capabilities)
    for family_id in planned_families:
        assert by_id[family_id]["implementation_status"] == "planned"
        assert by_id[family_id]["supported_commands"] == []


def test_specialized_families_are_active_only_through_their_declared_commands():
    for family_id in ("high_strength", "high_performance"):
        assert supports_engine_command(family_id, "calculate-family-mix") is True
        assert supports_engine_command(family_id, "calculate-normal-mix") is False

    assert supports_engine_command("self_consolidating", "calculate-placement-family") is True
    assert supports_engine_command("self_consolidating", "calculate-family-mix") is False
    assert supports_engine_command("pumped", "calculate-placement-family") is True
