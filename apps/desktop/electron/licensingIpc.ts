import { dialog, ipcMain } from 'electron';
import { readFileSync } from 'node:fs';
import { getLicensingService } from './licensingRuntime';
import { getMachineFingerprint } from './machineFingerprint';
import { getRendererSession, getSecurityService, requireRendererPermission } from './securityRuntime';

let registered = false;

export function registerLicensingIpc() {
  if (registered) return;
  registered = true;

  ipcMain.handle('licensing:status', async event => safeCall(() => {
    if (!getRendererSession(event.sender)) throw new Error('Authentication required.');
    return { status: 'pass' as const, license: getLicensingService().getStatus(), machineCode: getMachineFingerprint() };
  }));

  ipcMain.handle('licensing:import', async event => {
    try {
      const actor = requireRendererPermission(event.sender, 'security.users.manage');
      const selection = await dialog.showOpenDialog({ title: 'انتخاب فایل لایسنس طلوع', properties: ['openFile'], filters: [{ name: 'Tolou License', extensions: ['json', 'license'] }] });
      if (selection.canceled || !selection.filePaths[0]) return { status: 'pass' as const, canceled: true };
      const result = getLicensingService().importLicense(readFileSync(selection.filePaths[0], 'utf8'));
      getSecurityService().recordAuthenticatedAudit(actor.id, { action: 'licensing.import', targetType: 'license', targetId: result.licenseId ?? null, outcome: 'success', detail: { state: result.state, edition: result.edition ?? null } });
      return { status: 'pass' as const, canceled: false, license: result };
    } catch (error) {
      return { status: 'fail' as const, error: error instanceof Error ? error.message : 'License import failed.' };
    }
  });

  ipcMain.handle('licensing:remove', async event => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'security.users.manage');
    const current = getLicensingService().getStatus();
    getLicensingService().removeLicense();
    getSecurityService().recordAuthenticatedAudit(actor.id, { action: 'licensing.remove', targetType: 'license', targetId: current.licenseId ?? null, outcome: 'success', detail: { previousState: current.state } });
    return { status: 'pass' as const, license: getLicensingService().getStatus() };
  }));
}

function safeCall<T>(callback: () => T): T | { status: 'fail'; error: string } {
  try { return callback(); }
  catch (error) { return { status: 'fail', error: error instanceof Error ? error.message : 'Licensing operation failed.' }; }
}
