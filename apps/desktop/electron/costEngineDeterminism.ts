export type CostRole = 'cementitious' | 'water' | 'fine_aggregate' | 'coarse_aggregate';

const ROLE_ORDER: CostRole[] = ['cementitious', 'water', 'fine_aggregate', 'coarse_aggregate'];

export function buildDeterministicCostLines(
  quantities: Record<CostRole, number | null>,
  unitCosts: Partial<Record<CostRole, number | null>>
) {
  let totalCostPerM3 = 0;
  const lines = ROLE_ORDER.map(role => {
    const quantityKgM3 = quantities[role];
    const unitCostPerKg = unitCosts[role] ?? null;
    const comparable = quantityKgM3 != null && unitCostPerKg != null;
    const lineCostPerM3 = comparable ? quantityKgM3 * unitCostPerKg : null;
    if (lineCostPerM3 != null) totalCostPerM3 += lineCostPerM3;
    return { role, quantityKgM3, unitCostPerKg, lineCostPerM3, comparable };
  });

  const missingCostRoles = lines
    .filter(line => line.quantityKgM3 != null && line.unitCostPerKg == null)
    .map(line => line.role);
  const missingQuantityRoles = lines
    .filter(line => line.quantityKgM3 == null)
    .map(line => line.role);

  return {
    lines,
    totalCostPerM3,
    complete: missingCostRoles.length === 0 && missingQuantityRoles.length === 0,
    missingCostRoles,
    missingQuantityRoles
  };
}
