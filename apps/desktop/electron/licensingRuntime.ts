import { app } from 'electron';
import { getMachineFingerprint } from './machineFingerprint';
import { buildLicensingPaths } from './licensingPaths';
import { LicensingService } from './licensingService';
import { installProductAccessGuard } from './productAccessRuntime';

let licensingService: LicensingService | null = null;

export function initializeLicensingRuntime() {
  if (!licensingService) {
    const paths = buildLicensingPaths(app.getPath('userData'));
    licensingService = new LicensingService({
      licensePath: paths.licensePath,
      clockStatePath: paths.clockStatePath,
      machineFingerprint: getMachineFingerprint
    });
    installProductAccessGuard(feature => licensingService!.requireFeature(feature));
  }
  return licensingService;
}

export function getLicensingService() {
  if (!licensingService) throw new Error('Licensing runtime has not been initialized.');
  return licensingService;
}
