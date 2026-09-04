import { BrowserWindow, dialog } from 'electron';
import { writeFile } from 'node:fs/promises';
import { getReportSnapshot } from './reportCenterStore';
import { renderReportHtml } from './reportRenderer';

export async function exportReportSnapshotPdf(snapshotId: string) {
  const record = getReportSnapshot(snapshotId) as { snapshot?: Parameters<typeof renderReportHtml>[0]; reportType?: string; revisionNumber?: number } | null;
  if (!record?.snapshot) throw new Error('Report snapshot not found.');
  const html = renderReportHtml(record.snapshot);
  const window = await loadReportWindow(html);
  try {
    const buffer = await window.webContents.printToPDF({ printBackground: true, pageSize: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    const defaultPath = `Tolou-${record.reportType ?? 'Report'}-R${record.revisionNumber ?? 0}.pdf`;
    const selected = await dialog.showSaveDialog({ title: 'ذخیره PDF گزارش', defaultPath, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (selected.canceled || !selected.filePath) return { status: 'cancelled' as const };
    await writeFile(selected.filePath, buffer);
    return { status: 'pass' as const, filePath: selected.filePath };
  } finally { window.destroy(); }
}

export async function printReportSnapshot(snapshotId: string) {
  const record = getReportSnapshot(snapshotId) as { snapshot?: Parameters<typeof renderReportHtml>[0] } | null;
  if (!record?.snapshot) throw new Error('Report snapshot not found.');
  const window = await loadReportWindow(renderReportHtml(record.snapshot));
  return new Promise<{ status: 'pass' | 'fail'; error?: string }>(resolve => {
    window.webContents.print({ printBackground: true }, (success, failureReason) => {
      window.destroy();
      resolve(success ? { status: 'pass' } : { status: 'fail', error: failureReason || 'Print failed.' });
    });
  });
}

async function loadReportWindow(html: string) {
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await window.webContents.executeJavaScript('document.fonts ? document.fonts.ready : Promise.resolve()');
  return window;
}
