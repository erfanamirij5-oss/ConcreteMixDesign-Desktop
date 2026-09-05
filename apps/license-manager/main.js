const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const crypto = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(',')}}`;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 920,
    height: 760,
    minWidth: 820,
    minHeight: 680,
    title: 'Tolou License Manager',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('license:choose-key', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'PEM private key', extensions: ['pem'] }] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('license:issue', async (_event, input) => {
  const machine = String(input.machine || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(machine)) throw new Error('Machine code must be a 64-character SHA-256 value.');
  if (!input.privateKeyPath) throw new Error('Select the private signing key.');
  if (!input.licenseId || !input.customer || !input.edition) throw new Error('License ID, customer and edition are required.');
  if (!['commercial', 'trial', 'grace'].includes(input.licenseType)) throw new Error('Invalid license type.');
  const perpetual = Boolean(input.perpetual);
  if (perpetual && input.licenseType !== 'commercial') throw new Error('Only commercial licenses may be perpetual.');
  if (!perpetual && (!input.expiresAt || !Number.isFinite(Date.parse(input.expiresAt)))) throw new Error('A valid expiry is required.');

  const payload = {
    schemaVersion: 1,
    productId: 'tolou-concrete-mix-design',
    licenseId: String(input.licenseId).trim(),
    customerName: String(input.customer).trim(),
    edition: String(input.edition).trim(),
    licenseType: input.licenseType,
    issuedAt: new Date().toISOString(),
    expiresAt: perpetual ? null : new Date(input.expiresAt).toISOString(),
    perpetual,
    machineFingerprint: machine,
    features: Array.isArray(input.features) ? input.features.filter(Boolean) : []
  };
  const privateKeyPem = readFileSync(input.privateKeyPath, 'utf8');
  const signature = crypto.sign(null, Buffer.from(canonicalize(payload), 'utf8'), privateKeyPem).toString('base64');
  const save = await dialog.showSaveDialog({
    defaultPath: `${payload.licenseId}.license.json`,
    filters: [{ name: 'Tolou License', extensions: ['json'] }]
  });
  if (save.canceled || !save.filePath) return { canceled: true };
  writeFileSync(save.filePath, `${JSON.stringify({ payload, signature }, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return { canceled: false, filePath: save.filePath, licenseId: payload.licenseId };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
