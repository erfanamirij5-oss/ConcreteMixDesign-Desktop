import { existsSync } from 'node:fs';
import path from 'node:path';

const packagedMigrationDir = path.join(process.cwd(), 'release', 'win-unpacked', 'database', 'migrations');
const requiredMigrations = [
  '023_trial_mix_v2_foundation.sql',
  '024_production_qc_foundation.sql',
  '025_cost_engine_foundation.sql'
];

const missing = requiredMigrations.filter(name => !existsSync(path.join(packagedMigrationDir, name)));

if (missing.length > 0) {
  throw new Error(`Packaged application is missing required v1.1 migrations: ${missing.join(', ')}`);
}

console.log(`Packaged v1.1 migrations verified: ${requiredMigrations.join(', ')}`);
