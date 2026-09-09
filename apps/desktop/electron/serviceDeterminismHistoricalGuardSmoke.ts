import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildDeterministicCostLines } from './costEngineDeterminism';

const complete = buildDeterministicCostLines(
  {
    cementitious: 400,
    water: 180,
    fine_aggregate: 700,
    coarse_aggregate: 1050
  },
  {
    cementitious: 10,
    water: 1,
    fine_aggregate: 2,
    coarse_aggregate: 3
  }
);

if (!complete.complete) throw new Error('Complete Cost Engine input unexpectedly reported incomplete.');
if (complete.totalCostPerM3 !== 8730) throw new Error(`Deterministic total cost mismatch: ${complete.totalCostPerM3}`);
if (complete.lines.map(line => line.role).join('|') !== 'cementitious|water|fine_aggregate|coarse_aggregate') {
  throw new Error('Cost Engine role ordering changed unexpectedly.');
}

const partial = buildDeterministicCostLines(
  {
    cementitious: 400,
    water: 180,
    fine_aggregate: null,
    coarse_aggregate: 1050
  },
  {
    cementitious: 10,
    water: null,
    fine_aggregate: 2,
    coarse_aggregate: 3
  }
);

if (partial.complete) throw new Error('Incomplete Cost Engine evidence unexpectedly reported complete.');
if (partial.totalCostPerM3 !== 7150) throw new Error(`Partial deterministic total cost mismatch: ${partial.totalCostPerM3}`);
if (partial.missingCostRoles.join('|') !== 'water') throw new Error('Missing cost-role traceability changed unexpectedly.');
if (partial.missingQuantityRoles.join('|') !== 'fine_aggregate') throw new Error('Missing quantity-role traceability changed unexpectedly.');

const productionSource = readFileSync(
  path.join(process.cwd(), 'apps/desktop/electron/productionQcService.ts'),
  'utf8'
);

const requiredHistoricalWriteContract = [
  'Number(row.revisionNumber) !== Number(row.currentRevisionNumber)',
  'Production Batch تاریخی فقط‌خواندنی است.',
  "String(row.status).toLowerCase() !== 'production'",
  'assertProductionBatchWritable(productionBatchId)',
  'assertProductionBatchWritable(row.productionBatchId)'
];

for (const contract of requiredHistoricalWriteContract) {
  if (!productionSource.includes(contract)) {
    throw new Error(`Production/QC historical-write guard contract is missing: ${contract}`);
  }
}

console.log('Service determinism and historical-write guard smoke passed.');
