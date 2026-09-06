from tolou_mix_engine.concrete_families import CONCRETE_FAMILIES
from tolou_mix_engine.concrete_family_matrix import CONCRETE_FAMILY_MATRIX, MATRIX_BY_FAMILY


def test_every_registered_concrete_family_has_exactly_one_master_matrix_entry():
    registry_ids = {family.id for family in CONCRETE_FAMILIES}
    matrix_ids = [entry.family_id for entry in CONCRETE_FAMILY_MATRIX]
    assert len(matrix_ids) == len(set(matrix_ids))
    assert set(matrix_ids) == registry_ids


def test_every_family_declares_inputs_and_validation_domains():
    for entry in CONCRETE_FAMILY_MATRIX:
        assert entry.required_input_groups, entry.family_id
        assert entry.validation_domains, entry.family_id
        assert "confidence_state" in entry.validation_domains


def test_reviewed_scope_entries_have_primary_source_profiles():
    for entry in CONCRETE_FAMILY_MATRIX:
        if entry.source_status == "reviewed_scope":
            assert entry.source_profiles, entry.family_id


def test_extended_review_families_cannot_be_mistaken_for_verified_standard_profiles():
    for family_id in ("high_performance", "underwater", "recycled_aggregate", "low_carbon", "custom_research"):
        assert MATRIX_BY_FAMILY[family_id].source_status == "extended_review_required"
