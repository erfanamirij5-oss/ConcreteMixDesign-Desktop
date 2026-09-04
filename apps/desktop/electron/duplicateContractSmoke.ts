import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.join(process.cwd(), 'apps/desktop/electron/mixDesignRevisionStore.ts'), 'utf-8');

const requiredCloneContracts = [
  "insertClonedRow(database, 'projects'",
  "insertClonedRow(database, 'laboratories'",
  "insertClonedRow(database, 'designers'",
  "insertClonedRow(database, 'mix_designs'",
  "insertClonedRow(database, 'materials'",
  "insertClonedRow(database, 'aggregate_sieve_results'",
  "insertClonedRow(database, 'aggregate_gradation_controls'",
  "insertClonedRow(database, 'durability_inputs'",
  "insertClonedRow(database, 'aggregate_blend_optimizer_settings'",
  "insertClonedRow(database, 'aggregate_blend_shares'",
  "insertClonedRow(database, 'aggregate_blend_constraints'",
  "insertClonedRow(database, 'combined_gradation_limits'",
  'source_mix_design_id: input.mixDesignId',
  "status: 'draft'",
  'revision_number: 0'
];

for (const contract of requiredCloneContracts) {
  if (!source.includes(contract)) throw new Error(`Duplicate contract is missing required engineering clone behavior: ${contract}`);
}

const duplicateStart = source.indexOf('export function duplicateMixDesign');
const duplicateEnd = source.indexOf('export function listMixDesignRevisionHistory', duplicateStart);
if (duplicateStart < 0 || duplicateEnd < 0) throw new Error('Unable to isolate duplicateMixDesign implementation.');
const duplicateSource = source.slice(duplicateStart, duplicateEnd);

const forbiddenCloneTables = [
  'mix_results',
  'durability_checks',
  'reports',
  'ai_prompts',
  'mix_design_revision_snapshots',
  'mix_design_audit_log',
  'mix_design_status_history'
];
for (const table of forbiddenCloneTables) {
  if (duplicateSource.includes(`insertClonedRow(database, '${table}'`)) {
    throw new Error(`Duplicate must not clone historical/output table: ${table}`);
  }
}

if (!duplicateSource.includes("insertAudit(database, newMixDesignId, 'mix_design_duplicated'")) {
  throw new Error('Duplicate must create a new audit entry on the new mix design.');
}
if (!duplicateSource.includes("insertStatusHistory(database, newMixDesignId, null, 'draft'")) {
  throw new Error('Duplicate must start an independent Draft status history.');
}

console.log('Duplicate contract smoke passed: engineering inputs are cloned, lineage is preserved, and historical/output records remain independent.');
