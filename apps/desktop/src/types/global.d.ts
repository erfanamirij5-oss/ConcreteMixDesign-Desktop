export {};

declare global {
  interface Window {
    tolouEngine?: {
      health: () => Promise<unknown>;
      calculateNormalMix: (payload: unknown) => Promise<unknown>;
      calculateSavedMix: (mixDesignId: string) => Promise<unknown>;
      getSavedResult: (mixDesignId: string) => Promise<unknown>;
      evaluateDurability: (payload: unknown) => Promise<unknown>;
    };
    tolouProjects?: { saveIntake: (payload: unknown) => Promise<unknown>; listRecent: () => Promise<unknown>; };
    tolouMixDesigns?: {
      getManagementRecord: (mixDesignId: string) => Promise<unknown>;
      updateBasics: (payload: unknown) => Promise<unknown>;
      createRevision: (payload: unknown) => Promise<unknown>;
      listRevisions: (mixDesignId: string) => Promise<unknown>;
      allowedStatuses: (mixDesignId: string) => Promise<unknown>;
      transitionStatus: (payload: unknown) => Promise<unknown>;
      duplicate: (payload: unknown) => Promise<unknown>;
      archive: (mixDesignId: string, actorName?: string) => Promise<unknown>;
      restore: (mixDesignId: string, actorName?: string) => Promise<unknown>;
    };
    tolouMaterials?: { save: (payload: unknown) => Promise<unknown>; listByMixDesign: (mixDesignId: string) => Promise<unknown>; };
    tolouMaterialLibrary?: { save: (payload: unknown) => Promise<unknown>; list: (materialType?: string) => Promise<unknown>; attach: (mixDesignId: string, libraryMaterialId: string) => Promise<unknown>; setStatus: (id: string, status: 'active' | 'expired' | 'inactive') => Promise<unknown>; listProvenance: (mixDesignId: string) => Promise<unknown>; };
    tolouGradation?: { save: (payload: unknown) => Promise<unknown>; listByMaterial: (materialId: string) => Promise<unknown>; };
    tolouBlendOptimizer?: { save: (payload: unknown) => Promise<unknown>; get: (mixDesignId: string) => Promise<unknown>; };
    tolouDurability?: { save: (payload: unknown) => Promise<unknown>; get: (mixDesignId: string) => Promise<unknown>; };
    tolouTrialMix?: { save: (payload: unknown) => Promise<unknown>; list: (mixDesignId: string) => Promise<unknown>; hasCompleted: (mixDesignId: string) => Promise<unknown>; };
    tolouTrialMixV2?: {
      createSession: (payload: unknown) => Promise<unknown>;
      listSessions: (mixDesignId: string) => Promise<unknown>;
      getSession: (sessionId: string) => Promise<unknown>;
      getStrengthAnalytics: (sessionId: string) => Promise<unknown>;
      getCalibrationComparison: (sessionId: string) => Promise<unknown>;
      getMoistureCorrection: (sessionId: string) => Promise<unknown>;
      getRevisionFeedback: (sessionId: string) => Promise<unknown>;
      transitionSessionStatus: (payload: unknown) => Promise<unknown>;
      linkRecord: (payload: unknown) => Promise<unknown>;
      saveMaterialActual: (payload: unknown) => Promise<unknown>;
      saveSpecimen: (payload: unknown) => Promise<unknown>;
      saveStrengthResult: (payload: unknown) => Promise<unknown>;
    };
    tolouProductionQc?: {
      createBatch: (payload: unknown) => Promise<unknown>;
      listBatches: (mixDesignId: string) => Promise<unknown>;
      getBatch: (productionBatchId: string) => Promise<unknown>;
      getStrengthAnalytics: (mixDesignId: string) => Promise<unknown>;
      saveMaterialActual: (payload: unknown) => Promise<unknown>;
      saveSpecimen: (payload: unknown) => Promise<unknown>;
      saveStrengthResult: (payload: unknown) => Promise<unknown>;
    };
    tolouCostEngine?: {
      saveInputSet: (payload: unknown) => Promise<unknown>;
      listInputSets: (mixDesignId: string, revisionNumber?: number) => Promise<unknown>;
      calculateRevision: (mixDesignId: string, revisionNumber: number, inputSetId?: string) => Promise<unknown>;
    };
    tolouReports?: { create: (payload: unknown) => Promise<unknown>; list: (mixDesignId: string) => Promise<unknown>; get: (snapshotId: string) => Promise<unknown>; exportPdf: (snapshotId: string) => Promise<unknown>; print: (snapshotId: string) => Promise<unknown>; };
    tolouDataSafety?: { backup: () => Promise<unknown>; restore: () => Promise<unknown>; };
  }
}
