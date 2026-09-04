import { app, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { getDatabase, getDatabasePath } from './database';
import { createValidatedBackup, restoreValidatedBackup, validateBackupCandidate } from './backupRestoreService';

let registered = false;

export function registerBackupRestoreIpc() {
  if (registered) return;
  registered = true;

  ipcMain.handle('data-safety:backup', async () => {
    try {
      const suggested = `tolou-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
      const selection = await dialog.showSaveDialog({
        title: 'ایجاد نسخه پشتیبان طلوع بتن',
        defaultPath: path.join(app.getPath('documents'), suggested),
        filters: [{ name: 'Tolou SQLite Backup', extensions: ['sqlite'] }]
      });
      if (selection.canceled || !selection.filePath) return { status: 'cancelled' as const };

      const manifest = await createValidatedBackup(getDatabase(), selection.filePath);
      return { status: 'pass' as const, backupPath: selection.filePath, manifestPath: `${selection.filePath}.manifest.json`, manifest };
    } catch (error) {
      return { status: 'fail' as const, error: messageOf(error, 'خطا در ایجاد نسخه پشتیبان') };
    }
  });

  ipcMain.handle('data-safety:restore', async () => {
    try {
      const selection = await dialog.showOpenDialog({
        title: 'انتخاب نسخه پشتیبان طلوع بتن',
        properties: ['openFile'],
        filters: [{ name: 'Tolou SQLite Backup', extensions: ['sqlite'] }]
      });
      if (selection.canceled || selection.filePaths.length !== 1) return { status: 'cancelled' as const };

      const candidate = selection.filePaths[0];
      const manifest = validateBackupCandidate(candidate);
      const confirmation = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['انصراف', 'بازیابی و راه‌اندازی مجدد'],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
        title: 'تأیید بازیابی اطلاعات',
        message: 'بازیابی، پایگاه داده فعلی را با نسخه پشتیبان انتخاب‌شده جایگزین می‌کند.',
        detail: `پیش از جایگزینی، یک Recovery Copy خودکار ساخته می‌شود.\nتاریخ Backup: ${manifest.createdAt}\nپس از بازیابی نرم‌افزار مجدداً راه‌اندازی می‌شود.`
      });
      if (confirmation.response !== 1) return { status: 'cancelled' as const };

      const database = getDatabase();
      const result = await restoreValidatedBackup(candidate, getDatabasePath(), database);
      app.relaunch();
      app.exit(0);
      return { status: 'pass' as const, ...result };
    } catch (error) {
      return { status: 'fail' as const, error: messageOf(error, 'خطا در بازیابی نسخه پشتیبان') };
    }
  });
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
