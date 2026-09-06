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


def test_only_explicit_active_families_can_enter_current_normal_mix_command():
    assert supports_engine_command("normal_weight", "calculate-normal-mix") is True
    assert supports_engine_command("pumped", "calculate-normal-mix") is True
    assert supports_engine_command("self_consolidating", "calculate-normal-mix") is False
    assert supports_engine_command("uhpc", "calculate-normal-mix") is False
    assert supports_engine_command("unknown-family", "calculate-normal-mix") is False


def test_planned_family_is_catalogued_but_blocked_before_proportioning():
    error, normalized = validate_family_command_request(
        {
            "concrete_type": "SCC",
            "requirements": {"target_strength_mpa": 45},
        },
        "calculate-normal-mix",
    )
    assert normalized["concrete_type"] == "self_consolidating"
    assert error is not None
    assert error["status"] == "fail"
    assert error["error"] == "unsupported_concrete_type_for_current_engine"
    assert error["implementation_status"] == "planned"
    assert error["mix_proportions"] == {}
    assert error["calculation_pipeline"] == ["concrete_family_registry", "engineering_scope_guard"]


def test_alias_is_normalized_before_legacy_normal_weight_engine_routing():
    error, normalized = validate_family_command_request(
        {
            "concrete_type": "normal",
            "requirements": {"target_strength_mpa": 30},
        },
        "calculate-normal-mix",
    )
    assert error is None
    assert normalized["concrete_type"] == "normal_weight"


def test_catalog_exposes_all_required_next_generation_families_without_claiming_implementation():
    catalog = list_concrete_families()
    by_id = {item["id"]: item for item in catalog}
    expected = {
        "normal_weight",
        "high_strength",
        "high_performance",
        "self_consolidating",
        "pumped",
        "structural_lightweight",
        "heavyweight",
        "fiber_reinforced",
        "shotcrete",
        "roller_compacted",
        "pervious",
        "mass_concrete",
        "underwater",
        "recycled_aggregate",
        "low_carbon",
        "uhpc",
        "uhpfrc",
        "alkali_activated",
        "custom_research",
    }
    assert expected.issubset(by_id)
    for family_id in expected - {"normal_weight", "pumped"}:
        assert by_id[family_id]["implementation_status"] == "planned"
        assert by_id[family_id]["supported_commands"] == []
