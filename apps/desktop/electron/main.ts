import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { getAggregateBlendOptimizer, getDatabase, listGradationByMaterial, listMaterialsByMixDesign, listRecentProjects, saveAggregateBlendOptimizer, saveGradation, saveMaterial, saveProjectIntake } from './database';
import { assertDatabaseReadyForRuntime } from './databaseCompatibility';
import { archiveMixDesign, createNewMixDesignRevision, duplicateMixDesign, getAllowedNextStatuses, getMixDesignManagementRecord, listMixDesignRevisionHistory, restoreMixDesign, transitionMixDesignStatus, updateMixDesignBasics } from './mixDesignRevisionStore';
import { getDurabilityInput, saveDurabilityInput } from './durabilityStore';
import { buildNormalMixPayload } from './enginePayload';
import { getManagementSummary, getRecentManagementActivity } from './managementAnalytics';
import { loadCalculatedMixResult, saveCalculatedMixResult, type PersistedCalculationInput } from './calculationResultStore';
import { requireEditableMaterial, requireEditableMixDesign } from './mixDesignEditGuard';
import { attachLibraryMaterial, changeLibraryMaterialStatus, listLibraryMaterials, listMaterialProvenance, saveLibraryMaterial } from './materialLibraryStore';
import { saveMaterialChlorideProvenance } from './chlorideProvenanceStore';
import { ensureTrialMixMigration, hasCompletedTrialMixRecord, listTrialMixRecords, saveTrialMixRecord } from './trialMixStore';
import { registerTrialMixV2Ipc } from './trialMixV2Ipc';
import { registerReportCenterIpc } from './reportIpc';
import { registerBackupRestoreIpc } from './backupRestoreIpc';
import { registerCostEngineIpc } from './costEngineIpc';
import { initializeSecurityRuntime, requireRendererPermission } from './securityRuntime';
import { registerSecurityIpc } from './securityIpc';
import { initializeLicensingRuntime } from './licensingRuntime';
import { registerLicensingIpc } from './licensingIpc';
import { runBoundedEngineCommand, type EngineLaunch } from './engineProcess';
import { closeDatabaseSafely, runStartupSequence, type ClosableDatabase } from './runtimeLifecycle';

const isDev = process.env.NODE_ENV === 'development';
type DurabilityEvaluationPayload = { mix_design_id?: string; max_aggregate_size_mm?: number; conditions?: unknown };
let runtimeDatabase: ClosableDatabase | null = null;
let shutdownStarted = false;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: 'طلوع بتن | نرم‌افزار جامع طرح اختلاط',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());

  if (isDev) mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

function requireTransitionReason(reason?: string) {
  if (!reason?.trim()) throw new Error('دلیل تغییر وضعیت باید برای Audit Trail ثبت شود.');
}

ipcMain.handle('management:get-summary', async event => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return getManagementSummary(); }, 'خطا در خواندن خلاصه مدیریتی'));
ipcMain.handle('management:get-activity', async event => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return getRecentManagementActivity(); }, 'خطا در خواندن فعالیت‌های مدیریتی'));

ipcMain.handle('mix-design:get-management-record', async (event, mixDesignId: string) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return { status: 'pass' as const, record: getMixDesignManagementRecord(mixDesignId) }; }, 'خطا در خواندن پرونده مدیریتی طرح اختلاط'));
ipcMain.handle('mix-design:update-basics', async (event, payload) => safeCall(() => { const actor = requireRendererPermission(event.sender, 'engineering.write'); return updateMixDesignBasics({ ...payload, actorName: actor.displayName }); }, 'خطا در ویرایش اطلاعات طرح اختلاط'));
ipcMain.handle('mix-design:create-revision', async (event, payload) => safeCall(() => { const actor = requireRendererPermission(event.sender, 'engineering.write'); return createNewMixDesignRevision({ ...payload, actorName: actor.displayName }); }, 'خطا در ایجاد Revision جدید'));
ipcMain.handle('mix-design:list-revisions', async (event, mixDesignId: string) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return { status: 'pass' as const, history: listMixDesignRevisionHistory(mixDesignId) }; }, 'خطا در خواندن تاریخچه Revision'));
ipcMain.handle('mix-design:allowed-statuses', async (event, mixDesignId: string) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return { status: 'pass' as const, ...getAllowedNextStatuses(mixDesignId) }; }, 'خطا در خواندن وضعیت‌های مجاز'));
ipcMain.handle('mix-design:transition-status', async (event, payload) => safeCall(() => { const actor = requireRendererPermission(event.sender, 'engineering.write'); requireTransitionReason(payload?.reason); return transitionMixDesignStatus({ ...payload, actorName: actor.displayName }); }, 'خطا در تغییر وضعیت طرح اختلاط'));
ipcMain.handle('mix-design:duplicate', async (event, payload) => safeCall(() => { const actor = requireRendererPermission(event.sender, 'engineering.write'); return duplicateMixDesign({ ...payload, actorName: actor.displayName }); }, 'خطا در Duplicate طرح اختلاط'));
ipcMain.handle('mix-design:archive', async (event, mixDesignId: string) => safeCall(() => { const actor = requireRendererPermission(event.sender, 'engineering.write'); return archiveMixDesign(mixDesignId, actor.displayName); }, 'خطا در بایگانی طرح اختلاط'));
ipcMain.handle('mix-design:restore', async (event, mixDesignId: string) => safeCall(() => { const actor = requireRendererPermission(event.sender, 'engineering.write'); return restoreMixDesign(mixDesignId, actor.displayName); }, 'خطا در بازیابی طرح اختلاط'));

ipcMain.handle('trial-mix:save', async (event, payload) => safeCall(() => { const actor = requireRendererPermission(event.sender, 'engineering.trial.manage'); return saveTrialMixRecord({ ...payload, actorName: actor.displayName }); }, 'خطا در ثبت Trial Mix'));
ipcMain.handle('trial-mix:list', async (event, mixDesignId: string) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return { status: 'pass' as const, records: listTrialMixRecords(mixDesignId) }; }, 'خطا در خواندن Trial Mix'));
ipcMain.handle('trial-mix:has-completed', async (event, mixDesignId: string) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return { status: 'pass' as const, completed: hasCompletedTrialMixRecord(mixDesignId) }; }, 'خطا در بررسی تکمیل Trial Mix'));

ipcMain.handle('engine:health', async event => { requireRendererPermission(event.sender, 'engineering.read'); return runPythonCommand('health'); });
ipcMain.handle('engine:calculate-normal-mix', async (event, payload) => { requireRendererPermission(event.sender, 'engineering.calculate'); return runPythonCommand('calculate-normal-mix', payload); });
ipcMain.handle('engine:evaluate-durability', async (event, payload: DurabilityEvaluationPayload) => {
  try {
    requireRendererPermission(event.sender, 'engineering.calculate');
    const normalized: DurabilityEvaluationPayload = { ...(payload ?? {}) };
    const mixDesignId = typeof normalized.mix_design_id === 'string' ? normalized.mix_design_id.trim() : '';
    if (mixDesignId) {
      const savedPayload = buildNormalMixPayload(mixDesignId);
      normalized.max_aggregate_size_mm = savedPayload.requirements.max_aggregate_size_mm;
    }
    return await runPythonCommand('evaluate-durability', normalized);
  } catch (error) {
    return { status: 'fail', error: error instanceof Error ? error.message : 'خطای ناشناخته در تحلیل دوام طرح ذخیره‌شده' };
  }
});
ipcMain.handle('engine:calculate-saved-mix', async (event, mixDesignId: string) => {
  try {
    requireRendererPermission(event.sender, 'engineering.calculate');
    requireEditableMixDesign(mixDesignId);
    const payload = buildNormalMixPayload(mixDesignId);
    const result = await runPythonCommand('calculate-normal-mix', payload) as PersistedCalculationInput;
    if (result.status === 'pass') saveCalculatedMixResult(mixDesignId, result);
    return result;
  } catch (error) {
    return { status: 'fail', error: error instanceof Error ? error.message : 'خطای ناشناخته در محاسبه طرح ذخیره‌شده' };
  }
});
ipcMain.handle('engine:get-saved-result', async (event, mixDesignId: string) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return { status: 'pass' as const, result: loadCalculatedMixResult(mixDesignId) }; }, 'خطا در خواندن آخرین نتیجه ذخیره‌شده'));

ipcMain.handle('projects:save-intake', async (event, payload) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.write'); return saveProjectIntake(payload); }, 'خطای ناشناخته در ذخیره پروژه'));
ipcMain.handle('projects:list-recent', async event => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return { status: 'pass', projects: listRecentProjects() }; }, 'خطای ناشناخته در خواندن پروژه‌ها'));
ipcMain.handle('materials:save', async (event, payload) => safeCall(() => {
  requireRendererPermission(event.sender, 'engineering.write');
  requireEditableMixDesign(payload?.mixDesignId);
  const result = saveMaterial(payload);
  if (result?.id) saveMaterialChlorideProvenance(getDatabase(), result.id, payload ?? {});
  return result;
}, 'خطای ناشناخته در ذخیره مصالح'));
ipcMain.handle('materials:list-by-mix-design', async (event, mixDesignId: string) => safeCall(() => {
  requireRendererPermission(event.sender, 'engineering.read');
  const provenance = new Map(listMaterialProvenance(mixDesignId).map(item => [item.id, item]));
  const materials = (listMaterialsByMixDesign(mixDesignId) as Array<Record<string, unknown>>).map(item => {
    const identity = provenance.get(String(item.id));
    const source = typeof item.source === 'string' && item.source.trim() ? item.source : '-';
    const provenanceLabel = identity?.provenance === 'library_snapshot'
      ? `Library Snapshot${identity.librarySnapshotAt ? ` — ${identity.librarySnapshotAt}` : ''}`
      : 'Manual Entry';
    return { ...item, source: `${source} | ${provenanceLabel}`, provenance: identity?.provenance ?? 'manual', librarySnapshotAt: identity?.librarySnapshotAt ?? null, libraryMaterialId: identity?.libraryMaterialId ?? null };
  });
  return { status: 'pass', materials };
}, 'خطای ناشناخته در خواندن مصالح'));
ipcMain.handle('material-library:save', async (event, payload) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.write'); return { status: 'pass' as const, record: saveLibraryMaterial(payload) }; }, 'خطا در ذخیره رکورد کتابخانه مصالح'));
ipcMain.handle('material-library:list', async (event, materialType?: Parameters<typeof listLibraryMaterials>[0]) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return { status: 'pass' as const, materials: listLibraryMaterials(materialType) }; }, 'خطا در خواندن کتابخانه مصالح'));
ipcMain.handle('material-library:attach', async (event, mixDesignId: string, libraryMaterialId: string) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.write'); requireEditableMixDesign(mixDesignId); return attachLibraryMaterial(mixDesignId, libraryMaterialId); }, 'خطا در افزودن ماده Library به طرح اختلاط'));
ipcMain.handle('material-library:set-status', async (event, id: string, status) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.write'); return { status: 'pass' as const, record: changeLibraryMaterialStatus(id, status) }; }, 'خطا در تغییر وضعیت رکورد کتابخانه مصالح'));
ipcMain.handle('material-library:list-provenance', async (event, mixDesignId: string) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return { status: 'pass' as const, materials: listMaterialProvenance(mixDesignId) }; }, 'خطا در خواندن منشأ مصالح طرح اختلاط'));
ipcMain.handle('gradation:save', async (event, payload) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.write'); requireEditableMaterial(payload?.materialId); return saveGradation(payload); }, 'خطای ناشناخته در ذخیره دانه‌بندی'));
ipcMain.handle('gradation:list-by-material', async (event, materialId: string) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return { status: 'pass', rows: listGradationByMaterial(materialId) }; }, 'خطای ناشناخته در خواندن دانه‌بندی'));
ipcMain.handle('blend-optimizer:save', async (event, payload) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.write'); requireEditableMixDesign(payload?.mixDesignId); return saveAggregateBlendOptimizer(payload); }, 'خطای ناشناخته در ذخیره تنظیمات Blend Optimizer'));
ipcMain.handle('blend-optimizer:get', async (event, mixDesignId: string) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return { status: 'pass', input: getAggregateBlendOptimizer(mixDesignId) }; }, 'خطای ناشناخته در خواندن تنظیمات Blend Optimizer'));
ipcMain.handle('durability:save', async (event, payload) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.write'); requireEditableMixDesign(payload?.mixDesignId); return saveDurabilityInput(payload); }, 'خطای ناشناخته در ذخیره دوام'));
ipcMain.handle('durability:get', async (event, mixDesignId: string) => safeCall(() => { requireRendererPermission(event.sender, 'engineering.read'); return { status: 'pass', input: getDurabilityInput(mixDesignId) }; }, 'خطای ناشناخته در خواندن دوام'));

function safeCall<T>(callback: () => T, fallbackMessage: string): T | { status: 'fail'; error: string } {
  try {
    return callback();
  } catch (error) {
    return { status: 'fail', error: error instanceof Error ? error.message : fallbackMessage };
  }
}

function getEngineLaunch(): EngineLaunch {
  const bundledExecutable = path.join(process.resourcesPath, 'engine/tolou-mix-engine.exe');
  if (app.isPackaged && existsSync(bundledExecutable)) {
    return { executable: bundledExecutable, prefixArgs: [] };
  }

  const sourceCandidates = [
    path.join(process.cwd(), 'engine/python/src/tolou_mix_engine/cli.py'),
    path.join(app.getAppPath(), 'engine/python/src/tolou_mix_engine/cli.py'),
    path.join(process.resourcesPath, 'engine/python/src/tolou_mix_engine/cli.py')
  ];
  const sourcePath = sourceCandidates.find(candidate => existsSync(candidate));
  if (!sourcePath) {
    throw new Error(`Engineering engine was not found. Checked bundled executable and: ${sourceCandidates.join(' | ')}`);
  }
  return { executable: 'python', prefixArgs: [sourcePath] };
}

function runPythonCommand(command: string, payload?: unknown): Promise<unknown> {
  let launch: EngineLaunch;
  try { launch = getEngineLaunch(); }
  catch (error) { return Promise.reject(error); }
  return runBoundedEngineCommand(launch, command, payload);
}

function shutdownRuntime() {
  if (shutdownStarted) return;
  shutdownStarted = true;
  const result = closeDatabaseSafely(runtimeDatabase);
  runtimeDatabase = null;
  if (result.error) console.error(`Runtime database shutdown warning: ${result.error}`);
}

app.whenReady().then(async () => {
  try {
    if (app.isPackaged) process.chdir(path.dirname(app.getPath('exe')));
    await runStartupSequence([
      {
        name: 'database initialization and migrations',
        run: () => {
          runtimeDatabase = getDatabase();
          ensureTrialMixMigration(runtimeDatabase as ReturnType<typeof getDatabase>);
        }
      },
      { name: 'licensing runtime', run: () => { initializeLicensingRuntime(); } },
      { name: 'security runtime', run: () => { initializeSecurityRuntime(runtimeDatabase as ReturnType<typeof getDatabase>); } },
      {
        name: 'IPC registration',
        run: () => {
          registerSecurityIpc();
          registerLicensingIpc();
          registerTrialMixV2Ipc();
          registerCostEngineIpc();
          registerReportCenterIpc();
          registerBackupRestoreIpc();
        }
      },
      { name: 'database compatibility validation', run: () => { assertDatabaseReadyForRuntime(runtimeDatabase as ReturnType<typeof getDatabase>); } },
      { name: 'main window creation', run: () => { createWindow(); } }
    ]);
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  } catch (error) {
    shutdownRuntime();
    const message = error instanceof Error ? error.message : 'Unknown runtime startup failure.';
    console.error(message);
    dialog.showErrorBox('Tolou startup failure', `The application could not start safely.\n\n${message}`);
    app.exit(1);
  }
});

app.on('before-quit', shutdownRuntime);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
