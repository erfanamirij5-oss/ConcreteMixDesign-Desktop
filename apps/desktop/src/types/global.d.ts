export {};

declare global {
  interface Window {
    tolouEngine?: {
      health: () => Promise<unknown>;
      calculateNormalMix: (payload: unknown) => Promise<unknown>;
    };
    tolouProjects?: {
      saveIntake: (payload: unknown) => Promise<unknown>;
      listRecent: () => Promise<unknown>;
    };
  }
}
