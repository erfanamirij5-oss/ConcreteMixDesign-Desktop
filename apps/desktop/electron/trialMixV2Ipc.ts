import { ipcMain } from 'electron';
import { requireRendererPermission } from './securityRuntime';
import {
  createTrialSession,
  getTrialSessionDetail,
  linkTrialRecordToSession,
  listTrialSessions,
  saveCompressiveStrengthResult,
  saveTrialMaterialActual,
  saveTrialSpecimen,
  type CreateTrialSessionInput,
  type LinkTrialRecordInput,
  type SaveCompressiveStrengthResultInput,
  type SaveTrialMaterialActualInput,
  type SaveTrialSpecimenInput
} from './trialMixV2Service';
import { transitionTrialSessionStatus, type TransitionTrialSessionInput } from './trialMixV2LifecycleService';

function safeCall<T>(callback: () => T, fallbackMessage: string): T | { status: 'fail'; error: string } {
  try {
    return callback();
  } catch (error) {
    return { status: 'fail', error: error instanceof Error ? error.message : fallbackMessage };
  }
}

export function registerTrialMixV2Ipc() {
  ipcMain.handle('trial-mix-v2:create-session', async (event, payload: CreateTrialSessionInput) => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'engineering.trial.manage');
    const status = payload?.status ?? 'planned';
    if (!['planned', 'in_progress'].includes(status)) throw new Error('Trial Session جدید فقط می‌تواند با وضعیت planned یا in_progress ایجاد شود.');
    return createTrialSession({ ...payload, status, actorName: actor.displayName });
  }, 'خطا در ایجاد Trial Session'));

  ipcMain.handle('trial-mix-v2:list-sessions', async (event, mixDesignId: string) => safeCall(() => {
    requireRendererPermission(event.sender, 'engineering.read');
    return { status: 'pass' as const, sessions: listTrialSessions(mixDesignId) };
  }, 'خطا در خواندن Trial Sessionها'));

  ipcMain.handle('trial-mix-v2:get-session', async (event, sessionId: string) => safeCall(() => {
    requireRendererPermission(event.sender, 'engineering.read');
    return { status: 'pass' as const, session: getTrialSessionDetail(sessionId) };
  }, 'خطا در خواندن جزئیات Trial Session'));

  ipcMain.handle('trial-mix-v2:transition-session-status', async (event, payload: TransitionTrialSessionInput) => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'engineering.trial.manage');
    return transitionTrialSessionStatus({ ...payload, actorName: actor.displayName });
  }, 'خطا در تغییر وضعیت Trial Session'));

  ipcMain.handle('trial-mix-v2:link-record', async (event, payload: LinkTrialRecordInput) => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'engineering.trial.manage');
    return linkTrialRecordToSession({ ...payload, actorName: actor.displayName });
  }, 'خطا در اتصال Trial Mix record به Session'));

  ipcMain.handle('trial-mix-v2:save-material-actual', async (event, payload: SaveTrialMaterialActualInput) => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'engineering.trial.manage');
    return saveTrialMaterialActual({ ...payload, actorName: actor.displayName });
  }, 'خطا در ثبت مقدار واقعی مصالح Trial'));

  ipcMain.handle('trial-mix-v2:save-specimen', async (event, payload: SaveTrialSpecimenInput) => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'engineering.trial.manage');
    return saveTrialSpecimen({ ...payload, actorName: actor.displayName });
  }, 'خطا در ثبت نمونه آزمایشگاهی'));

  ipcMain.handle('trial-mix-v2:save-strength-result', async (event, payload: SaveCompressiveStrengthResultInput) => safeCall(() => {
    const actor = requireRendererPermission(event.sender, 'engineering.trial.manage');
    return saveCompressiveStrengthResult({ ...payload, actorName: actor.displayName });
  }, 'خطا در ثبت نتیجه مقاومت فشاری'));
}
