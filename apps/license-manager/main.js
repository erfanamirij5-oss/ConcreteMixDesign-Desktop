const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { signPayload } = require('./licenseContract');

const DAY_MS = 24 * 60 * 60 * 1000;

function createWindow() {
  const win = new BrowserWindow({
    width: 920, height: 760, minWidth: 820, minHeight: 680,
    title: 'مدیریت لایسنس طلوع',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('license:choose-key', async () => {
  const result = await dialog.showOpenDialog({ title: 'انتخاب کلید خصوصی صدور لایسنس', properties: ['openFile'], filters: [{ name: 'کلید خصوصی PEM', extensions: ['pem'] }] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('license:issue', async (_event, input) => {
  const machine = String(input.machine || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(machine)) throw new Error('کد دستگاه باید دقیقاً ۶۴ کاراکتر SHA-256 باشد.');
  if (!input.privateKeyPath) throw new Error('کلید خصوصی صدور لایسنس را انتخاب کنید.');
  if (!input.licenseId || !input.customer || !input.edition) throw new Error('شناسه لایسنس، نام مشتری و نسخه الزامی است.');
  if (!['commercial', 'trial', 'grace'].includes(input.licenseType)) throw new Error('نوع لایسنس معتبر نیست.');
  const perpetual = Boolean(input.perpetual);
  if (perpetual && input.licenseType !== 'commercial') throw new Error('فقط لایسنس تجاری می‌تواند دائمی باشد.');
  const durationDays = perpetual ? null : Number(input.durationDays);
  if (!perpetual && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 36500)) throw new Error('مدت اشتراک باید تعداد صحیح روز بین ۱ تا ۳۶۵۰۰ باشد.');

  const issued = new Date();
  const payload = {
    schemaVersion: 2,
    productId: 'tolou-concrete-mix-design',
    licenseId: String(input.licenseId).trim(),
    customerName: String(input.customer).trim(),
    edition: String(input.edition).trim(),
    licenseType: input.licenseType,
    issuedAt: issued.toISOString(),
    durationDays,
    expiresAt: perpetual ? null : new Date(issued.getTime() + durationDays * DAY_MS).toISOString(),
    perpetual,
    machineFingerprint: machine,
    features: Array.isArray(input.features) ? input.features.filter(Boolean) : []
  };
  const privateKeyPem = readFileSync(input.privateKeyPath, 'utf8');
  const signature = signPayload(payload, privateKeyPem);
  const save = await dialog.showSaveDialog({ defaultPath: `${payload.licenseId}.license.json`, filters: [{ name: 'فایل لایسنس طلوع', extensions: ['json'] }] });
  if (save.canceled || !save.filePath) return { canceled: true };
  writeFileSync(save.filePath, `${JSON.stringify({ payload, signature }, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return { canceled: false, filePath: save.filePath, licenseId: payload.licenseId, issuedAt: payload.issuedAt, expiresAt: payload.expiresAt, durationDays };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
