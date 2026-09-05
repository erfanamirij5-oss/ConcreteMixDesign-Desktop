import path from 'node:path';
import { app } from 'electron';
import { getMachineFingerprint } from './machineFingerprint';
import { LicensingService } from './licensingService';

let licensingService: LicensingService | null = null;

export function initializeLicensingRuntime() {
  if (licensingService) return licensingService;
  const licensingDir = path.join(app.getPath('userData'), 'licensing');
  licensingService = new LicensingService({
    licensePath: path.join(licensingDir, 'license.json'),
    clockStatePath: path.join(licensingDir, 'clock-state.json'),
    machineFingerprint: getMachineFingerprint
  });
  return licensingService;
}

export function getLicensingService() {
  if (!licensingService) throw new Error('Licensing runtime has not been initialized.');
  return licensingService;
}

export function requireProductLicense() {
  return getLicensingService().requireActiveLicense();
}
