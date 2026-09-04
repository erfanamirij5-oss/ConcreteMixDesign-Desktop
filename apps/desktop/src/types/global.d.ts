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
    tolouProjects?: {
      saveIntake: (payload: unknown) => Promise<unknown>;
      listRecent: () => Promise<unknown>;
    };
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
    tolouMaterials?: {
      save: (payload: unknown) => Promise<unknown>;
      listByMixDesign: (mixDesignId: string) => Promise<unknown>;
    };
    tolouMaterialLibrary?: {
      save: (payload: unknown) => Promise<unknown>;
      list: (materialType?: string) => Promise<unknown>;
      attach: (mixDesignId: string, libraryMaterialId: string) => Promise<unknown>;
      setStatus: (id: string, status: 'active' | 'expired' | 'inactive') => Promise<unknown>;
    };
    tolouGradation?: {
      save: (payload: unknown) => Promise<unknown>;
      listByMaterial: (materialId: string) => Promise<unknown>;
    };
    tolouBlendOptimizer?: {
      save: (payload: unknown) => Promise<unknown>;
      get: (mixDesignId: string) => Promise<unknown>;
    };
    tolouDurability?: {
      save: (payload: unknown) => Promise<unknown>;
      get: (mixDesignId: string) => Promise<unknown>;
    };
  }
}