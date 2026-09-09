import crypto from 'node:crypto';
import { getDatabase } from './database';
import { getMixDesignManagementRecord } from './mixDesignRevisionStore';
import { resolveTrialRevisionDesignResult } from './trialMixV2RevisionDesignResolver';
import { buildDeterministicCostLines } from './costEngineDeterminism';
import type { CostRole } from './costEngineDeterminism';

export { buildDeterministicCostLines } from './costEngineDeterminism';
export type { CostRole } from './costEngineDeterminism';

export const COST_METHOD_VERSION = 'mix-cost-foundation-v1';

export type SaveCostInputSetInput = {
  mixDesignId: string;
  currency: string;
  sourceReference?: string | null;
  effectiveAt: string;
  items: Array<{ role: CostRole; unitCostPerKg: number }>;
  actorName?: string | null;
};

type CostInputSetRow = {
  id: string;
  mixDesignId: string;
  revisionNumber: number;
  currency: string;
  sourceReference: string | null;
  effectiveAt: string;
  createdBy: string | null;
  createdAt: string;
};

const ROLE_ORDER: CostRole[] = ['cementitious', 'water', 'fine_aggregate', 'coarse_aggregate'];

function assertFiniteNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} باید عدد نامنفی معتبر باشد.`);
}

function normalizeCurrency(value: string) {
  const currency = value.trim().toUpperCase();
  if (currency.length < 3 || currency.length > 12) throw new Error('Currency باید بین 3 تا 12 کاراکتر باشد.');
  return currency;
}

export function saveCostInputSet(input: SaveCostInputSetInput) {
  if (!input.mixDesignId?.trim()) throw new Error('شناسه Mix Design الزامی است.');
  if (!input.effectiveAt?.trim() || Number.isNaN(Date.parse(input.effectiveAt))) throw new Error('Effective date معتبر الزامی است.');
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('حداقل یک Cost Input الزامی است.');

  const currency = normalizeCurrency(input.currency);
  const seen = new Set<CostRole>();
  for (const item of input.items) {
    if (!ROLE_ORDER.includes(item.role)) throw new Error(`Cost role نامعتبر است: ${String(item.role)}`);
    if (seen.has(item.role)) throw new Error(`Cost role تکراری است: ${item.role}`);
    seen.add(item.role);
    assertFiniteNonNegative(item.unitCostPerKg, `Unit cost برای ${item.role}`);
  }

  const management = getMixDesignManagementRecord(input.mixDesignId) as { revisionNumber: number };
  const database = getDatabase();
  const now = new Date().toISOString();
  const setId = crypto.randomUUID();

  database.transaction(() => {
    database.prepare(`
      INSERT INTO mix_cost_input_sets
        (id, mix_design_id, revision_number, currency, source_reference, effective_at, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      setId,
      input.mixDesignId.trim(),
      Number(management.revisionNumber),
      currency,
      input.sourceReference?.trim() || null,
      new Date(input.effectiveAt).toISOString(),
      input.actorName?.trim() || null,
      now
    );

    const insertItem = database.prepare(`
      INSERT INTO mix_cost_input_items (id, input_set_id, cost_role, unit_cost_per_kg)
      VALUES (?, ?, ?, ?)
    `);
    for (const item of input.items) insertItem.run(crypto.randomUUID(), setId, item.role, item.unitCostPerKg);
  })();

  return { status: 'pass' as const, inputSetId: setId, revisionNumber: Number(management.revisionNumber), currency };
}

export function listCostInputSets(mixDesignId: string, revisionNumber?: number) {
  if (!mixDesignId?.trim()) throw new Error('شناسه Mix Design الزامی است.');
  const database = getDatabase();
  const rows = (revisionNumber == null
    ? database.prepare(`
        SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber, currency,
          source_reference AS sourceReference, effective_at AS effectiveAt,
          created_by AS createdBy, created_at AS createdAt
        FROM mix_cost_input_sets WHERE mix_design_id = ? ORDER BY created_at DESC
      `).all(mixDesignId)
    : database.prepare(`
        SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber, currency,
          source_reference AS sourceReference, effective_at AS effectiveAt,
          created_by AS createdBy, created_at AS createdAt
        FROM mix_cost_input_sets WHERE mix_design_id = ? AND revision_number = ? ORDER BY created_at DESC
      `).all(mixDesignId, revisionNumber)) as CostInputSetRow[];
  return rows;
}

export function calculateRevisionCost(mixDesignId: string, revisionNumber: number, inputSetId?: string | null) {
  if (!mixDesignId?.trim()) throw new Error('شناسه Mix Design الزامی است.');
  if (!Number.isInteger(revisionNumber) || revisionNumber < 0) throw new Error('Revision Number نامعتبر است.');

  const management = getMixDesignManagementRecord(mixDesignId) as { revisionNumber: number };
  const database = getDatabase();
  const design = resolveTrialRevisionDesignResult(database, mixDesignId, revisionNumber, Number(management.revisionNumber));

  const set = (inputSetId
    ? database.prepare(`
        SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber, currency,
          source_reference AS sourceReference, effective_at AS effectiveAt,
          created_by AS createdBy, created_at AS createdAt
        FROM mix_cost_input_sets WHERE id = ? AND mix_design_id = ? AND revision_number = ?
      `).get(inputSetId, mixDesignId, revisionNumber)
    : database.prepare(`
        SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber, currency,
          source_reference AS sourceReference, effective_at AS effectiveAt,
          created_by AS createdBy, created_at AS createdAt
        FROM mix_cost_input_sets WHERE mix_design_id = ? AND revision_number = ?
        ORDER BY created_at DESC LIMIT 1
      `).get(mixDesignId, revisionNumber)) as CostInputSetRow | undefined;

  if (!set) throw new Error(`Cost Input Set برای Revision ${revisionNumber} پیدا نشد.`);

  const itemRows = database.prepare(`
    SELECT cost_role AS role, unit_cost_per_kg AS unitCostPerKg
    FROM mix_cost_input_items WHERE input_set_id = ?
  `).all(set.id) as Array<{ role: CostRole; unitCostPerKg: number }>;
  const unitCostByRole = Object.fromEntries(itemRows.map(row => [row.role, Number(row.unitCostPerKg)])) as Partial<Record<CostRole, number>>;

  const quantities: Record<CostRole, number | null> = {
    cementitious: design.cementitiousKgM3,
    water: design.waterKgM3,
    fine_aggregate: design.fineAggregateKgM3,
    coarse_aggregate: design.coarseAggregateKgM3
  };
  const calculation = buildDeterministicCostLines(quantities, unitCostByRole);

  return {
    status: 'pass' as const,
    methodVersion: COST_METHOD_VERSION,
    mixDesignId,
    revisionNumber,
    designSource: design.source,
    designSnapshotId: design.snapshotId,
    inputSet: set,
    currency: set.currency,
    ...calculation,
    assumptions: [
      'Cost v1 uses persisted design-result summary quantities only.',
      'No detailed cement/SCM/admixture/fiber split is inferred.',
      'No standards acceptance, pass/fail, or compliance inference is applied.'
    ]
  };
}
