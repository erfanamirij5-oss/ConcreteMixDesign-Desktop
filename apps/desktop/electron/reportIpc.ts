import { ipcMain } from 'electron';
import { createReportSnapshot, ensureReportCenterMigration, getReportSnapshot, listReportSnapshots } from './reportCenterStore';
import { getDatabase } from './database';
import { exportReportSnapshotPdf, printReportSnapshot } from './reportExport';

export function registerReportCenterIpc() {
  ensureReportCenterMigration(getDatabase());

  ipcMain.handle('report-center:create', async (_event, payload) => safeAsync(() => createReportSnapshot(payload), 'خطا در ایجاد Snapshot گزارش'));
  ipcMain.handle('report-center:list', async (_event, mixDesignId: string) => safeAsync(() => ({ status: 'pass' as const, reports: listReportSnapshots(mixDesignId) }), 'خطا در خواندن گزارش‌ها'));
  ipcMain.handle('report-center:get', async (_event, snapshotId: string) => safeAsync(() => ({ status: 'pass' as const, report: getReportSnapshot(snapshotId) }), 'خطا در خواندن Snapshot گزارش'));
  ipcMain.handle('report-center:export-pdf', async (_event, snapshotId: string) => safeAsync(() => exportReportSnapshotPdf(snapshotId), 'خطا در تولید PDF گزارش'));
  ipcMain.handle('report-center:print', async (_event, snapshotId: string) => safeAsync(() => printReportSnapshot(snapshotId), 'خطا در چاپ گزارش'));
}

async function safeAsync<T>(callback: () => T | Promise<T>, fallbackMessage: string): Promise<T | { status: 'fail'; error: string }> {
  try { return await callback(); }
  catch (error) { return { status: 'fail', error: error instanceof Error ? error.message : fallbackMessage }; }
}
