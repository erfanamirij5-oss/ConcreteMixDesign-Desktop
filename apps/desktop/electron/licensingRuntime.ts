import path from 'node:path';
import { app } from 'electron';
import { getMachineFingerprint } from './machineFingerprint';
import { LicensingService } from './licensingService';
import { installProductAccessGuard } from './productAccessRuntime';

let licensingService: LicensingService | null = null;

export function initializeLicensingRuntime() {
  if (!licensingService) {
    const licensingDir = path.join(app.getPath('userData'), 'licensing');
    licensingService = new LicensingService({
      licensePath: path.join(licensingDir, 'license.json'),
      clockStatePath: path.join(licensingDir, 'clock-state.json'),
      machineFingerprint: getMachineFingerprint
    });
    installProductAccessGuard(() => licensingService!.requireActiveLicense());
  }
  return licensingService;
}

export function getLicensingService() {
  if (!licensingService) throw new Error('Licensing runtime has not been initialized.');
  return licensingService;
}
