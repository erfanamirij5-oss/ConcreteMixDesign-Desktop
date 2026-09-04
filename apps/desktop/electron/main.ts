import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { getAggregateBlendOptimizer, listGradationByMaterial, listMaterialsByMixDesign, listRecentProjects, saveAggregateBlendOptimizer, saveGradation, saveMaterial, saveProjectIntake } from './database';
import { archiveMixDesign, createNewMixDesignRevision, duplicateMixDesign, getAllowedNextStatuses, getMixDesignManagementRecord, listMixDesignRevisionHistory, restoreMixDesign, transitionMixDesignStatus, updateMixDesignBasics } from './mixDesignRevisionStore';
import { getDurabilityInput, saveDurabilityInput } from './durabilityStore';
import { buildNormalMixPayload } from './enginePayload';
import { getManagementSummary, getRecentManagementActivity } from './managementAnalytics';

const isDev = process.env.NODE_ENV === 'development';
type DurabilityEvaluationPayload = { mix_design_id?: string; max_aggregate_size_mm?: number; conditions?: unknown };
type EngineLaunch = { executable: string; prefixArgs: string[] };

function createWindow() {
  const mainWindow = new BrowserWindow({ width: 1440, height: 920, minWidth: 1180, minHeight: 760, title: 'طلوع بتن | نرم‌افزار جامع طرح اختلاط', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  if (isDev) mainWindow.loadURL('http://localhost:5173'); else mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

ipcMain.handle('management:get-summary', async () => safeCall(() => getManagementSummary(), 'خطا در خواندن خلاصه مدیریتی'));
ipcMain.handle('management:get-activity', async () => safeCall(() => getRecentManagementActivity(), 'خطا در خواندن فعالیت‌های مدیریتی'));

ipcMain.handle('engine:health', async () => runPythonCommand('health'));

function safeCall<T>(callback: () => T, fallbackMessage: string): T | { status: 'fail'; error: string } { try { return callback(); } catch (error) { return { status: 'fail', error: error instanceof Error ? error.message : fallbackMessage }; } }

function getEngineLaunch(): EngineLaunch { const bundledExecutable = path.join(process.resourcesPath, 'engine/tolou-mix-engine.exe'); if (app.isPackaged && existsSync(bundledExecutable)) return { executable: bundledExecutable, prefixArgs: [] }; return { executable: 'python', prefixArgs: [] }; }
function runPythonCommand(command: string, payload?: unknown): Promise<unknown> { return new Promise((resolve) => resolve({ command, payload })); }

app.whenReady().then(() => { createWindow(); });
