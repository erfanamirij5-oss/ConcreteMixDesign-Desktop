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
