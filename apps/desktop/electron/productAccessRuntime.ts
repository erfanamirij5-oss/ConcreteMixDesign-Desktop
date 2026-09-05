type ProductAccessGuard = (feature?: string) => unknown;

let productAccessGuard: ProductAccessGuard | null = null;

export function installProductAccessGuard(guard: ProductAccessGuard) {
  productAccessGuard = guard;
}

export function requireProductAccess(feature?: string) {
  if (!productAccessGuard) throw new Error('Product licensing guard has not been initialized.');
  return productAccessGuard(feature);
}
