from __future__ import annotations

import pytest

from tolou_mix_engine.material_intelligence import (
    DataConfidence,
    DataProvenance,
    MaterialCategory,
    build_material_intelligence,
)


def test_lab_material_property_is_verified_and_traceable() -> None:
    record = build_material_intelligence(
        {"id": "agg-1", "material_type": "coarse_aggregate"},
        [
            {
                "name": "specific_gravity_ssd",
                "value": 2.68,
                "unit": None,
                "provenance": "lab_measured",
                "source_reference": "LAB-AGG-2026-014",
            }
        ],
    )
    assert record.category == MaterialCategory.COARSE_AGGREGATE
    assert record.overall_confidence == DataConfidence.VERIFIED
    assert record.properties[0].provenance == DataProvenance.LAB_MEASURED
    assert record.warnings == ()


def test_reference_default_forces_preliminary_confidence() -> None:
    record = build_material_intelligence(
        {"id": "cement-1", "material_type": "cement"},
        [
            {
                "name": "specific_gravity",
                "value": 3.15,
                "provenance": "reference_default",
                "source_reference": "preliminary engineering reference",
            },
            {
                "name": "manufacturer",
                "value": "Example",
                "provenance": "supplier_certificate",
                "source_reference": "COA-001",
            },
        ],
    )
    assert record.overall_confidence == DataConfidence.PRELIMINARY
    assert "REFERENCE_DEFAULT_NOT_PRODUCTION_VERIFIED:specific_gravity" in record.warnings


def test_source_controlled_property_without_reference_is_flagged() -> None:
    record = build_material_intelligence(
        {"id": "water-1", "material_type": "water"},
        [{"name": "chloride", "value": 120, "unit": "mg/L", "provenance": "lab_measured"}],
    )
    assert "SOURCE_REFERENCE_MISSING:chloride" in record.warnings


def test_unknown_provenance_is_not_promoted_to_verified() -> None:
    record = build_material_intelligence(
        {"id": "adm-1", "material_type": "chemical_admixture"},
        [{"name": "density", "value": 1.08, "provenance": "unknown_external"}],
    )
    assert record.properties[0].provenance == DataProvenance.USER_DECLARED
    assert record.overall_confidence == DataConfidence.DECLARED


def test_duplicate_property_is_rejected() -> None:
    with pytest.raises(ValueError, match="duplicate_material_property"):
        build_material_intelligence(
            {"id": "scm-1", "material_type": "scm"},
            [
                {"name": "specific_gravity", "value": 2.3, "provenance": "user_declared"},
                {"name": "specific_gravity", "value": 2.4, "provenance": "lab_measured"},
            ],
        )


def test_unsupported_category_is_rejected_instead_of_guessed() -> None:
    with pytest.raises(ValueError, match="unsupported_material_category"):
        build_material_intelligence({"id": "x", "material_type": "mystery"}, [])
