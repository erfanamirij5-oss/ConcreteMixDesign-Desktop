import { ipcMain } from 'electron';
import { createReportSnapshot, getReportSnapshot, listReportSnapshots } from './reportCenterStore';
import { ensureReportCenterMigration } from './reportCenterMigration';
import { getDatabase } from './database';
import { exportReportSnapshotPdf, printReportSnapshot } from './reportExport';
import { requireRendererPermission } from './securityRuntime';

export function registerReportCenterIpc() {
  ensureReportCenterMigration(getDatabase());

  ipcMain.handle('report-center:create', async (event, payload) => safeAsync(() => {
    requireRendererPermission(event.sender, 'engineering.report.generate');
    return createReportSnapshot(payload);
  }, 'خطا در ایجاد Snapshot گزارش'));
  ipcMain.handle('report-center:list', async (event, mixDesignId: string) => safeAsync(() => {
    requireRendererPermission(event.sender, 'engineering.read');
    return { status: 'pass' as const, reports: listReportSnapshots(mixDesignId) };
  }, 'خطا در خواندن گزارش‌ها'));
  ipcMain.handle('report-center:get', async (event, snapshotId: string) => safeAsync(() => {
    requireRendererPermission(event.sender, 'engineering.read');
    return { status: 'pass' as const, report: getReportSnapshot(snapshotId) };
  }, 'خطا در خواندن Snapshot گزارش'));
  ipcMain.handle('report-center:export-pdf', async (event, snapshotId: string) => safeAsync(() => {
    requireRendererPermission(event.sender, 'engineering.report.generate');
    return exportReportSnapshotPdf(snapshotId);
  }, 'خطا در تولید PDF گزارش'));
  ipcMain.handle('report-center:print', async (event, snapshotId: string) => safeAsync(() => {
    requireRendererPermission(event.sender, 'engineering.report.generate');
    return printReportSnapshot(snapshotId);
  }, 'خطا در چاپ گزارش'));
}

async function safeAsync<T>(callback: () => T | Promise<T>, fallbackMessage: string): Promise<T | { status: 'fail'; error: string }> {
  try { return await callback(); }
  catch (error) { return { status: 'fail', error: error instanceof Error ? error.message : fallbackMessage }; }
}
