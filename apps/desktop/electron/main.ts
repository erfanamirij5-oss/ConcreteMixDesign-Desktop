import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { getAggregateBlendOptimizer, getDatabase, listGradationByMaterial, listMaterialsByMixDesign, listRecentProjects, saveAggregateBlendOptimizer, saveGradation, saveMaterial, saveProjectIntake } from './database';
import { assertDatabaseReadyForRuntime } from './databaseCompatibility';
import { archiveMixDesign, createNewMixDesignRevision, duplicateMixDesign, getAllowedNextStatuses, getMixDesignManagementRecord, listMixDesignRevisionHistory, restoreMixDesign, transitionMixDesignStatus, updateMixDesignBasics } from './mixDesignRevisionStore';
import { getDurabilityInput, saveDurabilityInput } from './durabilityStore';
import { buildNormalMixPayload } from './enginePayload';
import { getManagementSummary, getRecentManagementActivity } from './managementAnalytics';
import { loadCalculatedMixResult, saveCalculatedMixResult, type PersistedCalculationInput } from './calculationResultStore';
import { requireEditableMaterial, requireEditableMixDesign } from './mixDesignEditGuard';
import { attachLibraryMaterial, changeLibraryMaterialStatus, listLibraryMaterials, saveLibraryMaterial } from './materialLibraryStore';

const isDev = process.env.NODE_ENV === 'development';
type DurabilityEvaluationPayload = { mix_design_id?: string; max_aggregate_size_mm?: number; conditions?: unknown };
type EngineLaunch = { executable: string; prefixArgs: string[] };

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
      nodeIntegration: false
    }
  });

  if (isDev) mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

function requireAuditActor(actorName?: string) {
  if (!actorName?.trim()) throw new Error('نام مسئول عملیات برای Audit Trail الزامی است.');
}

function requireTransitionReason(reason?: string) {
  if (!reason?.trim()) throw new Error('دلیل تغییر وضعیت باید برای Audit Trail ثبت شود.');
}

ipcMain.handle('management:get-summary', async () => safeCall(() => getManagementSummary(), 'خطا در خواندن خلاصه مدیریتی'));
ipcMain.handle('management:get-activity', async () => safeCall(() => getRecentManagementActivity(), 'خطا در خواندن فعالیت‌های مدیریتی'));

ipcMain.handle('mix-design:get-management-record', async (_event, mixDesignId: string) => safeCall(() => ({ status: 'pass' as const, record: getMixDesignManagementRecord(mixDesignId) }), 'خطا در خواندن پرونده مدیریتی طرح اختلاط'));
ipcMain.handle('mix-design:update-basics', async (_event, payload) => safeCall(() => { requireAuditActor(payload?.actorName); return updateMixDesignBasics(payload); }, 'خطا در ویرایش اطلاعات طرح اختلاط'));
ipcMain.handle('mix-design:create-revision', async (_event, payload) => safeCall(() => { requireAuditActor(payload?.actorName); return createNewMixDesignRevision(payload); }, 'خطا در ایجاد Revision جدید'));
ipcMain.handle('mix-design:list-revisions', async (_event, mixDesignId: string) => safeCall(() => ({ status: 'pass' as const, history: listMixDesignRevisionHistory(mixDesignId) }), 'خطا در خواندن تاریخچه Revision'));
ipcMain.handle('mix-design:allowed-statuses', async (_event, mixDesignId: string) => safeCall(() => ({ status: 'pass' as const, ...getAllowedNextStatuses(mixDesignId) }), 'خطا در خواندن وضعیت‌های مجاز'));
ipcMain.handle('mix-design:transition-status', async (_event, payload) => safeCall(() => { requireAuditActor(payload?.actorName); requireTransitionReason(payload?.reason); return transitionMixDesignStatus(payload); }, 'خطا در تغییر وضعیت طرح اختلاط'));
ipcMain.handle('mix-design:duplicate', async (_event, payload) => safeCall(() => { requireAuditActor(payload?.actorName); return duplicateMixDesign(payload); }, 'خطا در Duplicate طرح اختلاط'));
ipcMain.handle('mix-design:archive', async (_event, mixDesignId: string, actorName?: string) => safeCall(() => { requireAuditActor(actorName); return archiveMixDesign(mixDesignId, actorName); }, 'خطا در بایگانی طرح اختلاط'));
ipcMain.handle('mix-design:restore', async (_event, mixDesignId: string, actorName?: string) => safeCall(() => { requireAuditActor(actorName); return restoreMixDesign(mixDesignId, actorName); }, 'خطا در بازیابی طرح اختلاط'));

ipcMain.handle('engine:health', async () => runPythonCommand('health'));
ipcMain.handle('engine:calculate-normal-mix', async (_event, payload) => runPythonCommand('calculate-normal-mix', payload));
ipcMain.handle('engine:evaluate-durability', async (_event, payload: DurabilityEvaluationPayload) => {
  try {
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
ipcMain.handle('engine:calculate-saved-mix', async (_event, mixDesignId: string) => {
  try {
    requireEditableMixDesign(mixDesignId);
    const payload = buildNormalMixPayload(mixDesignId);
    const result = await runPythonCommand('calculate-normal-mix', payload) as PersistedCalculationInput;
    if (result.status === 'pass') saveCalculatedMixResult(mixDesignId, result);
    return result;
  } catch (error) {
    return { status: 'fail', error: error instanceof Error ? error.message : 'خطای ناشناخته در محاسبه طرح ذخیره‌شده' };
  }
});
ipcMain.handle('engine:get-saved-result', async (_event, mixDesignId: string) => safeCall(() => ({ status: 'pass' as const, result: loadCalculatedMixResult(mixDesignId) }), 'خطا در خواندن آخرین نتیجه ذخیره‌شده'));

ipcMain.handle('projects:save-intake', async (_event, payload) => safeCall(() => saveProjectIntake(payload), 'خطای ناشناخته در ذخیره پروژه'));
ipcMain.handle('projects:list-recent', async () => safeCall(() => ({ status: 'pass', projects: listRecentProjects() }), 'خطای ناشناخته در خواندن پروژه‌ها'));
ipcMain.handle('materials:save', async (_event, payload) => safeCall(() => { requireEditableMixDesign(payload?.mixDesignId); return saveMaterial(payload); }, 'خطای ناشناخته در ذخیره مصالح'));
ipcMain.handle('materials:list-by-mix-design', async (_event, mixDesignId: string) => safeCall(() => ({ status: 'pass', materials: listMaterialsByMixDesign(mixDesignId) }), 'خطای ناشناخته در خواندن مصالح'));
ipcMain.handle('material-library:save', async (_event, payload) => safeCall(() => ({ status: 'pass' as const, record: saveLibraryMaterial(payload) }), 'خطا در ذخیره رکورد کتابخانه مصالح'));
ipcMain.handle('material-library:list', async (_event, materialType?: Parameters<typeof listLibraryMaterials>[0]) => safeCall(() => ({ status: 'pass' as const, materials: listLibraryMaterials(materialType) }), 'خطا در خواندن کتابخانه مصالح'));
ipcMain.handle('material-library:attach', async (_event, mixDesignId: string, libraryMaterialId: string) => safeCall(() => { requireEditableMixDesign(mixDesignId); return attachLibraryMaterial(mixDesignId, libraryMaterialId); }, 'خطا در افزودن ماده Library به طرح اختلاط'));
ipcMain.handle('material-library:set-status', async (_event, id: string, status) => safeCall(() => ({ status: 'pass' as const, record: changeLibraryMaterialStatus(id, status) }), 'خطا در تغییر وضعیت رکورد کتابخانه مصالح'));
ipcMain.handle('gradation:save', async (_event, payload) => safeCall(() => { requireEditableMaterial(payload?.materialId); return saveGradation(payload); }, 'خطای ناشناخته در ذخیره دانه‌بندی'));
ipcMain.handle('gradation:list-by-material', async (_event, materialId: string) => safeCall(() => ({ status: 'pass', rows: listGradationByMaterial(materialId) }), 'خطای ناشناخته در خواندن دانه‌بندی'));
ipcMain.handle('blend-optimizer:save', async (_event, payload) => safeCall(() => { requireEditableMixDesign(payload?.mixDesignId); return saveAggregateBlendOptimizer(payload); }, 'خطای ناشناخته در ذخیره تنظیمات Blend Optimizer'));
ipcMain.handle('blend-optimizer:get', async (_event, mixDesignId: string) => safeCall(() => ({ status: 'pass', input: getAggregateBlendOptimizer(mixDesignId) }), 'خطای ناشناخته در خواندن تنظیمات Blend Optimizer'));
ipcMain.handle('durability:save', async (_event, payload) => safeCall(() => { requireEditableMixDesign(payload?.mixDesignId); return saveDurabilityInput(payload); }, 'خطای ناشناخته در ذخیره دوام'));
ipcMain.handle('durability:get', async (_event, mixDesignId: string) => safeCall(() => ({ status: 'pass', input: getDurabilityInput(mixDesignId) }), 'خطای ناشناخته در خواندن دوام'));

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
  return new Promise((resolve, reject) => {
    let launch: EngineLaunch;
    try { launch = getEngineLaunch(); } catch (error) { reject(error); return; }

    const child = spawn(launch.executable, [...launch.prefixArgs, command], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) { reject(new Error(stderr || `Engineering engine exited with code ${code}`)); return; }
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error('Engineering engine returned invalid JSON')); }
    });
    child.stdin.write(JSON.stringify(payload ?? {}));
    child.stdin.end();
  });
}

app.whenReady().then(() => {
  if (app.isPackaged) process.chdir(path.dirname(app.getPath('exe')));
  const database = getDatabase();
  assertDatabaseReadyForRuntime(database);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
