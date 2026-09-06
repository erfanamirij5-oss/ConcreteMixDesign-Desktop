from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from enum import Enum
from typing import Any


class MaterialCategory(str, Enum):
    CEMENT = "cement"
    SCM = "scm"
    FINE_AGGREGATE = "fine_aggregate"
    COARSE_AGGREGATE = "coarse_aggregate"
    WATER = "water"
    CHEMICAL_ADMIXTURE = "chemical_admixture"
    FIBER = "fiber"
    FILLER = "filler"
    SPECIAL = "special"


class DataProvenance(str, Enum):
    LAB_MEASURED = "lab_measured"
    SUPPLIER_CERTIFICATE = "supplier_certificate"
    PROJECT_SPECIFICATION = "project_specification"
    USER_DECLARED = "user_declared"
    REFERENCE_DEFAULT = "reference_default"
    DERIVED = "derived"


class DataConfidence(str, Enum):
    VERIFIED = "verified"
    MATERIAL_SPECIFIC = "material_specific"
    DECLARED = "declared"
    PRELIMINARY = "preliminary"


_PROVENANCE_CONFIDENCE = {
    DataProvenance.LAB_MEASURED: DataConfidence.VERIFIED,
    DataProvenance.SUPPLIER_CERTIFICATE: DataConfidence.MATERIAL_SPECIFIC,
    DataProvenance.PROJECT_SPECIFICATION: DataConfidence.MATERIAL_SPECIFIC,
    DataProvenance.USER_DECLARED: DataConfidence.DECLARED,
    DataProvenance.REFERENCE_DEFAULT: DataConfidence.PRELIMINARY,
    DataProvenance.DERIVED: DataConfidence.MATERIAL_SPECIFIC,
}


@dataclass(frozen=True)
class MaterialProperty:
    name: str
    value: Any
    unit: str | None
    provenance: DataProvenance
    source_reference: str | None = None
    measured_at: str | None = None

    @property
    def confidence(self) -> DataConfidence:
        return _PROVENANCE_CONFIDENCE[self.provenance]


@dataclass(frozen=True)
class MaterialIntelligenceRecord:
    material_id: str
    category: MaterialCategory
    properties: tuple[MaterialProperty, ...]
    warnings: tuple[str, ...]
    overall_confidence: DataConfidence


def _parse_provenance(value: Any) -> DataProvenance:
    try:
        return DataProvenance(str(value))
    except ValueError:
        return DataProvenance.USER_DECLARED


def _lowest_confidence(properties: Sequence[MaterialProperty]) -> DataConfidence:
    rank = {
        DataConfidence.VERIFIED: 4,
        DataConfidence.MATERIAL_SPECIFIC: 3,
        DataConfidence.DECLARED: 2,
        DataConfidence.PRELIMINARY: 1,
    }
    if not properties:
        return DataConfidence.PRELIMINARY
    return min((item.confidence for item in properties), key=rank.__getitem__)


def build_material_intelligence(
    material: Mapping[str, Any],
    property_rows: Sequence[Mapping[str, Any]],
) -> MaterialIntelligenceRecord:
    """Build a provenance-preserving material record without inventing engineering values."""
    material_id = str(material.get("id") or "").strip()
    if not material_id:
        raise ValueError("material_id_required")

    try:
        category = MaterialCategory(str(material.get("material_type") or ""))
    except ValueError as exc:
        raise ValueError("unsupported_material_category") from exc

    properties: list[MaterialProperty] = []
    warnings: list[str] = []
    names: set[str] = set()

    for row in property_rows:
        name = str(row.get("name") or "").strip()
        if not name:
            raise ValueError("material_property_name_required")
        if name in names:
            raise ValueError(f"duplicate_material_property:{name}")
        names.add(name)

        provenance = _parse_provenance(row.get("provenance"))
        source_reference = str(row.get("source_reference") or "").strip() or None
        if provenance in {
            DataProvenance.LAB_MEASURED,
            DataProvenance.SUPPLIER_CERTIFICATE,
            DataProvenance.PROJECT_SPECIFICATION,
        } and source_reference is None:
            warnings.append(f"SOURCE_REFERENCE_MISSING:{name}")

        if provenance == DataProvenance.REFERENCE_DEFAULT:
            warnings.append(f"REFERENCE_DEFAULT_NOT_PRODUCTION_VERIFIED:{name}")

        properties.append(
            MaterialProperty(
                name=name,
                value=row.get("value"),
                unit=str(row.get("unit") or "").strip() or None,
                provenance=provenance,
                source_reference=source_reference,
                measured_at=str(row.get("measured_at") or "").strip() or None,
            )
        )

    return MaterialIntelligenceRecord(
        material_id=material_id,
        category=category,
        properties=tuple(properties),
        warnings=tuple(warnings),
        overall_confidence=_lowest_confidence(properties),
    )
