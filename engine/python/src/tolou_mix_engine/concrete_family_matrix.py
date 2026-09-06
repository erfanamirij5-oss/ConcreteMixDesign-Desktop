from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

SourceStatus = Literal["reviewed_scope", "extended_review_required"]


@dataclass(frozen=True)
class ConcreteFamilyMatrixEntry:
    family_id: str
    required_input_groups: tuple[str, ...]
    validation_domains: tuple[str, ...]
    source_profiles: tuple[str, ...]
    source_status: SourceStatus


COMMON_INPUTS = (
    "project_requirements",
    "material_characterization",
    "service_environment",
    "target_fresh_properties",
    "target_hardened_properties",
)

COMMON_VALIDATION = (
    "input_completeness",
    "unit_and_state_consistency",
    "trial_plan",
    "traceability",
    "confidence_state",
)


CONCRETE_FAMILY_MATRIX: tuple[ConcreteFamilyMatrixEntry, ...] = (
    ConcreteFamilyMatrixEntry("normal_weight", COMMON_INPUTS + ("aggregate_gradation", "aggregate_moisture_absorption"), COMMON_VALIDATION + ("fresh_properties", "density_yield", "strength"), ("ACI_PRC_211_1_22",), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("pumped", COMMON_INPUTS + ("aggregate_gradation", "placement_pipeline", "pumpability_constraints"), COMMON_VALIDATION + ("fresh_stability", "pumpability_trial", "strength"), ("ACI_211_9R_18", "ACI_304_2R_17"), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("high_strength", COMMON_INPUTS + ("cementitious_system", "hrwr_system", "aggregate_quality", "curing_regime"), COMMON_VALIDATION + ("optimized_trial_batches", "workability_retention", "strength_development"), ("ACI_PRC_211_4_08",), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("high_performance", COMMON_INPUTS + ("explicit_performance_objectives", "cementitious_system", "admixture_system"), COMMON_VALIDATION + ("performance_specific_trials", "durability", "acceptance_criteria"), (), "extended_review_required"),
    ConcreteFamilyMatrixEntry("self_consolidating", COMMON_INPUTS + ("filling_requirement", "passing_requirement", "stability_requirement", "powder_system", "aggregate_volume_grading", "rheology_admixtures"), COMMON_VALIDATION + ("filling_tests", "passing_tests", "stability_tests", "strength_durability"), ("ACI_PRC_237_07_19", "ACI_238_FAMILY"), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("structural_lightweight", COMMON_INPUTS + ("lightweight_aggregate_source", "lightweight_aggregate_density", "aggregate_moisture_absorption", "prewetting_conditioning", "target_density"), COMMON_VALIDATION + ("moisture_conditioning", "density_yield", "strength", "durability"), ("ACI_PRC_213_14_23",), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("heavyweight", COMMON_INPUTS + ("heavy_aggregate_source_mineralogy", "particle_density", "aggregate_gradation", "target_density", "handling_placement_constraints"), COMMON_VALIDATION + ("density_uniformity", "segregation", "workability", "strength"), ("ACI_PRC_304_3_20", "ACI_PRC_211_1_22"), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("fiber_reinforced", COMMON_INPUTS + ("base_matrix", "fiber_material_geometry", "fiber_dosage_volume", "mixing_placement_constraints", "post_cracking_targets"), COMMON_VALIDATION + ("fiber_dispersion", "workability", "mechanical_response", "durability"), ("ACI_PRC_544_3_08_23", "ACI_544_FAMILY"), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("shotcrete", COMMON_INPUTS + ("process_type", "spray_equipment", "accelerator_system", "substrate_placement_conditions", "early_age_targets"), COMMON_VALIDATION + ("preconstruction_trial", "process_qualification", "early_age_properties", "finished_acceptance"), ("ACI_PRC_506_22", "ACI_506_2"), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("roller_compacted", COMMON_INPUTS + ("application_type", "aggregate_skeleton", "moisture", "consistency_compaction_target", "equipment_lift_constraints"), COMMON_VALIDATION + ("moisture_density_consistency", "compaction_density", "strength", "field_qc"), ("ACI_PRC_327_24", "ACI_PRC_207_5_11", "ACI_PRC_309_5_22"), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("pervious", COMMON_INPUTS + ("open_graded_aggregate", "target_void_system", "target_permeability", "compaction_method"), COMMON_VALIDATION + ("unit_weight_voids", "permeability", "strength", "placement_validation"), ("ACI_PRC_522_23",), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("mass_concrete", COMMON_INPUTS + ("element_geometry_boundary", "placement_sequence", "ambient_placement_temperature", "binder_heat_characteristics", "thermal_properties", "thermal_control_strategy"), COMMON_VALIDATION + ("thermal_characterization", "temperature_prediction_monitoring", "strength", "thermal_control"), ("ACI_PRC_207_1_21", "ACI_207_2_FAMILY", "ACI_207_4_FAMILY"), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("underwater", COMMON_INPUTS + ("placement_method_depth", "washout_stability_targets", "cohesion_system", "placement_environment"), COMMON_VALIDATION + ("procedure_mockup_trial", "fresh_stability", "strength", "durability"), (), "extended_review_required"),
    ConcreteFamilyMatrixEntry("recycled_aggregate", COMMON_INPUTS + ("recycled_aggregate_origin", "aggregate_quality", "aggregate_moisture_absorption", "replacement_fraction", "contaminant_evidence"), COMMON_VALIDATION + ("moisture_correction", "density_yield", "workability", "strength_durability_variability"), (), "extended_review_required"),
    ConcreteFamilyMatrixEntry("low_carbon", COMMON_INPUTS + ("host_family", "environmental_factor_source", "functional_unit_boundary", "carbon_objective"), COMMON_VALIDATION + ("host_family_validation", "carbon_data_provenance", "engineering_constraint_precedence"), (), "extended_review_required"),
    ConcreteFamilyMatrixEntry("uhpc", COMMON_INPUTS + ("particle_size_distributions", "powder_chemistry_physical", "binder_filler_system", "hrwr_compatibility", "mixing_energy_sequence", "curing_regime", "rheology_targets"), COMMON_VALIDATION + ("paste_matrix_optimization", "mixing_workability", "mechanical_performance", "durability"), ("ACI_239R_18", "ACI_PRC_239_1_24", "FHWA_HRT_13_100"), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("uhpfrc", COMMON_INPUTS + ("particle_size_distributions", "binder_filler_system", "hrwr_compatibility", "mixing_energy_sequence", "fiber_material_geometry", "fiber_volume", "tensile_targets"), COMMON_VALIDATION + ("matrix_trials", "fiber_composite_trials", "compressive_performance", "tensile_post_cracking", "durability"), ("ACI_239_FAMILY", "ACI_544_FAMILY", "FHWA_UHPC_FAMILY"), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("alkali_activated", COMMON_INPUTS + ("precursor_chemistry_physical", "activator_composition", "liquid_binder_definition", "curing_regime", "handling_safety_constraints"), COMMON_VALIDATION + ("fresh_setting", "strength_development", "shrinkage", "durability"), ("ACI_PRC_242_22",), "reviewed_scope"),
    ConcreteFamilyMatrixEntry("custom_research", ("user_defined_materials", "user_defined_variables", "bounds", "objectives", "units", "evidence_status", "test_plan", "acceptance_criteria"), ("experiment_matrix", "assumption_provenance", "result_traceability", "confidence_state"), (), "extended_review_required"),
)

MATRIX_BY_FAMILY = {entry.family_id: entry for entry in CONCRETE_FAMILY_MATRIX}


def get_family_matrix_entry(family_id: str) -> ConcreteFamilyMatrixEntry | None:
    return MATRIX_BY_FAMILY.get(family_id)
