import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const requiredMigrations = [
  '023_trial_mix_v2_foundation.sql',
  '024_production_qc_foundation.sql',
  '025_cost_engine_foundation.sql'
];

for (const migration of requiredMigrations) {
  const path = `release/win-unpacked/database/migrations/${migration}`;
  if (!existsSync(path)) {
    throw new Error(`Required v1.1 migration is missing from packaged application: ${path}`);
  }
}

const asar = 'release/win-unpacked/resources/app.asar';
if (!existsSync(asar)) throw new Error('Packaged app.asar is missing.');

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const asarList = execFileSync(npx, ['--yes', 'asar', 'list', asar], { encoding: 'utf8' });
const requiredRuntimeModules = [
  'dist/electron/trialMixV2Service.js',
  'dist/electron/trialMixV2RevisionFeedbackService.js',
  'dist/electron/productionQcService.js',
  'dist/electron/productionQcAnalyticsService.js',
  'dist/electron/costEngineService.js',
  'dist/electron/reportCenterStore.js'
];

const normalized = asarList.replaceAll('\\\\', '/').replaceAll('\\', '/');
for (const modulePath of requiredRuntimeModules) {
  if (!normalized.includes(modulePath)) {
    throw new Error(`Required v1.1 runtime module is missing from app.asar: ${modulePath}`);
  }
}

console.log('v1.1 packaging contract passed: migrations 023-025 and required Trial/QC/Cost/Report runtime modules are packaged.');
