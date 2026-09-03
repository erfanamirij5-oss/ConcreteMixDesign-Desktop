export {};

declare global {
  interface Window {
    tolouEngine?: {
      health: () => Promise<unknown>;
      calculateNormalMix: (payload: unknown) => Promise<unknown>;
    };
  }
}
