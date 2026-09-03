export type MaterialType = 'cement' | 'water' | 'fine_aggregate' | 'coarse_aggregate' | 'admixture' | 'scm' | 'fiber';

export type AggregateRole =
  | 'natural_sand'
  | 'manufactured_sand'
  | 'pea_gravel'
  | 'coarse_gravel'
  | 'coarse_12_5'
  | 'coarse_19'
  | 'coarse_25'
  | 'recycled_aggregate'
  | 'lightweight_aggregate'
  | 'heavyweight_aggregate'
  | 'correction_aggregate'
  | 'custom';

export type MoistureCondition = 'oven_dry' | 'air_dry' | 'ssd' | 'wet' | 'stockpile';

export type MaterialInput = {
  mixDesignId: string;
  materialType: MaterialType;
  aggregateRole: AggregateRole | null;
  nominalSizeMm: number | null;
  fracturedFacePercent: number | null;
  moistureCondition: MoistureCondition | null;
  name: string;
  source: string;
  specificGravity: number | null;
  absorptionPercent: number | null;
  moisturePercent: number | null;
  unitWeightKgM3: number | null;
  notes: string;
};

export type MaterialRecord = MaterialInput & {
  id: string;
};

export type SaveMaterialResponse = {
  status: 'pass' | 'fail';
  materialId?: string;
  error?: string;
};
