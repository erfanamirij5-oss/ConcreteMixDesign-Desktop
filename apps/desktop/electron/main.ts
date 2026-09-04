import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { getAggregateBlendOptimizer, listGradationByMaterial, listMaterialsByMixDesign, listRecentProjects, saveAggregateBlendOptimizer, saveGradation, saveMaterial, saveProjectIntake } from './database';
import { getDurabilityInput, saveDurabilityInput } from './durabilityStore';
import { buildNormalMixPayload } from './enginePayload';

const isDev = process.env.NODE_ENV === 'development';
type DurabilityEvaluationPayload = { mix_design_id?: string; max_aggregate_size_mm?: number; conditions?: unknown };

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
    const payload = buildNormalMixPayload(mixDesignId);
    return await runPythonCommand('calculate-normal-mix', payload);
  } catch (error) {
    return { status: 'fail', error: error instanceof Error ? error.message : 'خطای ناشناخته در محاسبه طرح ذخیره‌شده' };
  }
});

ipcMain.handle('projects:save-intake', async (_event, payload) => safeCall(() => saveProjectIntake(payload), 'خطای ناشناخته در ذخیره پروژه'));
ipcMain.handle('projects:list-recent', async () => safeCall(() => ({ status: 'pass', projects: listRecentProjects() }), 'خطای ناشناخته در خواندن پروژه‌ها'));
ipcMain.handle('materials:save', async (_event, payload) => safeCall(() => saveMaterial(payload), 'خطای ناشناخته در ذخیره مصالح'));
ipcMain.handle('materials:list-by-mix-design', async (_event, mixDesignId: string) => safeCall(() => ({ status: 'pass', materials: listMaterialsByMixDesign(mixDesignId) }), 'خطای ناشناخته در خواندن مصالح'));
ipcMain.handle('gradation:save', async (_event, payload) => safeCall(() => saveGradation(payload), 'خطای ناشناخته در ذخیره دانه‌بندی'));
ipcMain.handle('gradation:list-by-material', async (_event, materialId: string) => safeCall(() => ({ status: 'pass', rows: listGradationByMaterial(materialId) }), 'خطای ناشناخته در خواندن دانه‌بندی'));
ipcMain.handle('blend-optimizer:save', async (_event, payload) => safeCall(() => saveAggregateBlendOptimizer(payload), 'خطای ناشناخته در ذخیره تنظیمات Blend Optimizer'));
ipcMain.handle('blend-optimizer:get', async (_event, mixDesignId: string) => safeCall(() => ({ status: 'pass', input: getAggregateBlendOptimizer(mixDesignId) }), 'خطای ناشناخته در خواندن تنظیمات Blend Optimizer'));
ipcMain.handle('durability:save', async (_event, payload) => safeCall(() => saveDurabilityInput(payload), 'خطای ناشناخته در ذخیره دوام'));
ipcMain.handle('durability:get', async (_event, mixDesignId: string) => safeCall(() => ({ status: 'pass', input: getDurabilityInput(mixDesignId) }), 'خطای ناشناخته در خواندن دوام'));

function safeCall<T>(callback: () => T, fallbackMessage: string): T | { status: 'fail'; error: string } {
  try {
    return callback();
  } catch (error) {
    return { status: 'fail', error: error instanceof Error ? error.message : fallbackMessage };
  }
}

function getEnginePath(): string {
  const candidates = [
    path.join(process.cwd(), 'engine/python/src/tolou_mix_engine/cli.py'),
    path.join(app.getAppPath(), 'engine/python/src/tolou_mix_engine/cli.py'),
    path.join(process.resourcesPath, 'engine/python/src/tolou_mix_engine/cli.py')
  ];
  const found = candidates.find(candidate => existsSync(candidate));
  if (!found) throw new Error(`Python engine CLI was not found. Checked: ${candidates.join(' | ')}`);
  return found;
}

function runPythonCommand(command: string, payload?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let enginePath: string;
    try { enginePath = getEnginePath(); } catch (error) { reject(error); return; }

    const child = spawn('python', [enginePath, command], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) { reject(new Error(stderr || `Python engine exited with code ${code}`)); return; }
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error('Python engine returned invalid JSON')); }
    });
    child.stdin.write(JSON.stringify(payload ?? {}));
    child.stdin.end();
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
