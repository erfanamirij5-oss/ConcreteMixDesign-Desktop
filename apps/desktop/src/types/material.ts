export type MaterialInput = {
  mixDesignId: string;
  materialType: 'cement' | 'water' | 'fine_aggregate' | 'coarse_aggregate' | 'admixture' | 'scm' | 'fiber';
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
