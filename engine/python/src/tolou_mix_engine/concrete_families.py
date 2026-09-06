from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal

FamilyStatus = Literal["active", "planned"]


@dataclass(frozen=True)
class ConcreteFamilyDefinition:
    id: str
    display_name_fa: str
    display_name_en: str
    category: str
    design_strategy: str
    implementation_status: FamilyStatus
    supported_commands: tuple[str, ...] = ()
    aliases: tuple[str, ...] = ()


CONCRETE_FAMILIES: tuple[ConcreteFamilyDefinition, ...] = (
    ConcreteFamilyDefinition("normal_weight", "بتن معمولی", "Normal-weight concrete", "conventional", "normal_weight_absolute_volume", "active", supported_commands=("calculate-normal-mix", "calculate-family-mix"), aliases=("normal", "normal_concrete")),
    ConcreteFamilyDefinition("pumped", "بتن پمپی", "Pumpable concrete", "placement_specialized", "normal_weight_with_pumpability_overlay", "active", supported_commands=("calculate-normal-mix", "calculate-placement-family"), aliases=("pumpable", "pumped_concrete")),
    ConcreteFamilyDefinition("high_strength", "بتن پرمقاومت", "High-strength concrete", "performance", "high_strength_explicit_input_absolute_volume", "active", supported_commands=("calculate-family-mix",), aliases=("hsc",)),
    ConcreteFamilyDefinition("high_performance", "بتن توانمند", "High-performance concrete", "performance", "high_performance_explicit_input_absolute_volume", "active", supported_commands=("calculate-family-mix",), aliases=("hpc",)),
    ConcreteFamilyDefinition("self_consolidating", "بتن خودتراکم", "Self-consolidating concrete", "rheology", "scc_rheology_stability_performance_strategy", "active", supported_commands=("calculate-placement-family",), aliases=("scc", "self_compacting")),
    ConcreteFamilyDefinition("structural_lightweight", "بتن سبک سازه‌ای", "Structural lightweight concrete", "density_specialized", "structural_lightweight", "planned", aliases=("lightweight", "slwc")),
    ConcreteFamilyDefinition("heavyweight", "بتن سنگین", "Heavyweight concrete", "density_specialized", "heavyweight", "planned"),
    ConcreteFamilyDefinition("fiber_reinforced", "بتن الیافی", "Fiber-reinforced concrete", "reinforcement_specialized", "fiber_reinforced", "planned", aliases=("frc",)),
    ConcreteFamilyDefinition("shotcrete", "شاتکریت / بتن پاششی", "Shotcrete", "placement_specialized", "shotcrete", "planned"),
    ConcreteFamilyDefinition("roller_compacted", "بتن غلتکی", "Roller-compacted concrete", "compaction_specialized", "roller_compacted", "planned", aliases=("rcc",)),
    ConcreteFamilyDefinition("pervious", "بتن نفوذپذیر", "Pervious concrete", "void_structured", "pervious", "planned"),
    ConcreteFamilyDefinition("mass_concrete", "بتن حجیم", "Mass concrete", "thermal", "mass_concrete", "planned", aliases=("mass",)),
    ConcreteFamilyDefinition("underwater", "بتن زیرآب / جایگذاری ویژه", "Underwater and special-placement concrete", "placement_specialized", "underwater", "planned"),
    ConcreteFamilyDefinition("recycled_aggregate", "بتن با سنگدانه بازیافتی", "Recycled-aggregate concrete", "circular_materials", "recycled_aggregate", "planned", aliases=("rac",)),
    ConcreteFamilyDefinition("low_carbon", "بتن کم‌کربن", "Low-carbon concrete", "sustainability", "low_carbon", "planned"),
    ConcreteFamilyDefinition("uhpc", "بتن فوق‌توانمند", "Ultra-high-performance concrete", "ultra_high_performance", "uhpc_particle_packing", "planned"),
    ConcreteFamilyDefinition("uhpfrc", "بتن الیافی فوق‌توانمند", "Ultra-high-performance fiber-reinforced concrete", "ultra_high_performance", "uhpfrc_particle_packing", "planned"),
    ConcreteFamilyDefinition("alkali_activated", "بتن قلیایی‌فعال / ژئوپلیمری", "Alkali-activated / geopolymer concrete", "alternative_binder", "alkali_activated", "planned", aliases=("aam", "geopolymer")),
    ConcreteFamilyDefinition("custom_research", "طرح سفارشی / تحقیقاتی", "Custom / research concrete", "research", "custom_constraint_based", "planned", aliases=("custom", "research")),
)

_FAMILY_BY_ID = {family.id: family for family in CONCRETE_FAMILIES}
_ALIAS_TO_ID = {alias: family.id for family in CONCRETE_FAMILIES for alias in family.aliases}


def normalize_concrete_family_id(value: object) -> str:
    family_id = str(value or "normal_weight").strip().lower()
    return _ALIAS_TO_ID.get(family_id, family_id)


def get_concrete_family(value: object) -> ConcreteFamilyDefinition | None:
    return _FAMILY_BY_ID.get(normalize_concrete_family_id(value))


def supports_engine_command(value: object, command: str) -> bool:
    family = get_concrete_family(value)
    return bool(family and family.implementation_status == "active" and command in family.supported_commands)


def list_concrete_families() -> list[dict]:
    return [{**asdict(family), "supported_commands": list(family.supported_commands), "aliases": list(family.aliases)} for family in CONCRETE_FAMILIES]
