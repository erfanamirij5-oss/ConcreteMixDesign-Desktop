let productAccessGuard: (() => unknown) | null = null;

export function installProductAccessGuard(guard: () => unknown) {
  productAccessGuard = guard;
}

export function requireProductAccess() {
  if (!productAccessGuard) throw new Error('Product licensing guard has not been initialized.');
  return productAccessGuard();
}
