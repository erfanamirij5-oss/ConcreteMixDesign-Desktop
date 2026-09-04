export type MaterialType = 'cement' | 'water' | 'fine_aggregate' | 'coarse_aggregate' | 'admixture' | 'scm' | 'fiber';
export type AggregateRole = 'natural_sand' | 'manufactured_sand' | 'pea_gravel' | 'coarse_gravel' | 'coarse_12_5' | 'coarse_19' | 'coarse_25' | 'recycled_aggregate' | 'lightweight_aggregate' | 'heavyweight_aggregate' | 'correction_aggregate' | 'custom';
export type MoistureCondition = 'oven_dry' | 'air_dry' | 'ssd' | 'wet' | 'stockpile';
export type SulfateResistanceClass = 'none' | 'MS' | 'HS' | 'qualified_combination';
export type SulfateQualificationMethod = 'product_designation' | 'astm_c1012' | 'documented_service_record' | 'engineer_approved_combination';
export type AsrReactivityClass = 'unknown' | 'nonreactive' | 'potentially_reactive' | 'reactive';
export type AsrQualificationMethod = 'astm_c1260' | 'astm_c1293' | 'astm_c1567' | 'documented_service_record' | 'engineer_approved_mitigation';
export type WaterSourceClass = 'potable' | 'nonpotable' | 'concrete_production';
export type WaterDensityMonitoringMethod = 'astm_c1603' | 'verified_hydrometer' | 'automated_density_system';
export type MaterialSubtype =
  | 'portland_cement' | 'blended_cement' | 'slag_cement' | 'fly_ash' | 'silica_fume' | 'natural_pozzolan' | 'calcined_clay' | 'limestone_filler' | 'other_scm'
  | 'water_reducer' | 'high_range_water_reducer' | 'retarder' | 'accelerator' | 'calcium_chloride_accelerator' | 'air_entrainer' | 'viscosity_modifier' | 'corrosion_inhibitor' | 'shrinkage_reducer' | 'other_admixture'
  | 'steel_fiber' | 'polypropylene_fiber' | 'glass_fiber' | 'basalt_fiber' | 'other_fiber' | 'mixing_water' | 'wash_water' | 'other';

export type MaterialInput = {
  mixDesignId: string; materialType: MaterialType; aggregateRole: AggregateRole | null; nominalSizeMm: number | null; fracturedFacePercent: number | null; moistureCondition: MoistureCondition | null;
  name: string; source: string; specificGravity: number | null; absorptionPercent: number | null; moisturePercent: number | null; unitWeightKgM3: number | null; notes: string;
  materialSubtype?: MaterialSubtype | null; standardDesignation?: string | null; densityKgM3?: number | null; dosageValue?: number | null; dosageUnit?: string | null;
  binderSharePercent?: number | null; replacementPercent?: number | null; solidsPercent?: number | null; chloridePercent?: number | null; chlorideMgL?: number | null; waterSharePercent?: number | null; alkaliPercent?: number | null;
  sulfateMgL?: number | null; totalSolidsMgL?: number | null; alkalisNa2oeqMgL?: number | null; c1602StrengthRatio7dPercent?: number | null; c1602SettingTimeDeviationMin?: number | null; c1602PerformanceEvidenceRef?: string | null;
  waterSourceClass?: WaterSourceClass | null; c1602LastQualificationDate?: string | null; c1602LastDensityCheckDate?: string | null; c1602DensityMonitoringMethod?: WaterDensityMonitoringMethod | null; c1602MonitoringEvidenceRef?: string | null;
  astmC117Finer75umPercent?: number | null; finer75umLimitPercent?: number | null; aggregateTestEvidenceRef?: string | null; astmC29RoddedUnitWeightKgM3?: number | null; astmC127C128SsdSpecificGravity?: number | null; astmC127C128AbsorptionPercent?: number | null; aggregateQualityStandard?: string | null;
  lossOnIgnitionPercent?: number | null; activityIndexPercent?: number | null; manufacturer?: string | null; productCode?: string | null;
  sulfateResistanceClass?: SulfateResistanceClass | null; sulfateQualificationMethod?: SulfateQualificationMethod | null;
  astmC1012Expansion6mPercent?: number | null; astmC1012Expansion12mPercent?: number | null; sulfatePerformanceEvidenceRef?: string | null;
  asrReactivityClass?: AsrReactivityClass | null; asrQualificationMethod?: AsrQualificationMethod | null;
  astmC1260Expansion14dPercent?: number | null; astmC1293Expansion1yPercent?: number | null; astmC1567Expansion14dPercent?: number | null; asrPerformanceEvidenceRef?: string | null;
};
export type MaterialRecord = MaterialInput & { id: string; };
export type SaveMaterialResponse = { status: 'pass' | 'fail'; materialId?: string; error?: string; };
