export {};

declare global {
  interface Window {
    tolouEngine?: {
      health: () => Promise<unknown>;
      calculateNormalMix: (payload: unknown) => Promise<unknown>;
      calculateSavedMix: (mixDesignId: string) => Promise<unknown>;
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
      archive: (mixDesignId: string, actorName?: string) => Promise<unknown>;
    };
    tolouMaterials?: {
      save: (payload: unknown) => Promise<unknown>;
      listByMixDesign: (mixDesignId: string) => Promise<unknown>;
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