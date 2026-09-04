import { readFileSync } from 'node:fs';
import path from 'node:path';

const builder = JSON.parse(readFileSync(path.join(process.cwd(), 'electron-builder.json'), 'utf-8')) as {
  appId?: string;
  productName?: string;
  nsis?: Record<string, unknown>;
};
const databaseSource = readFileSync(path.join(process.cwd(), 'apps/desktop/electron/database.ts'), 'utf-8');

if (builder.appId !== 'ir.tolou.concreteMixDesign') throw new Error('Commercial appId changed; this can break installed application identity and upgrade continuity.');
if (builder.productName !== 'Tolou Concrete Mix Design') throw new Error('Commercial productName changed; review userData continuity before changing it.');
if (!databaseSource.includes("app.getPath('userData')")) throw new Error('Database path must remain anchored to Electron userData, outside the installation directory.');
if (!databaseSource.includes("path.join(dir, 'tolou-concrete-mix.sqlite')")) throw new Error('Persistent database filename changed; a migration/relocation plan is required before changing it.');
if (databaseSource.includes("process.resourcesPath, 'data'")) throw new Error('Database must not be stored under packaged resources.');
if (databaseSource.includes("process.cwd(), 'data'")) throw new Error('Database must not be stored relative to the installation working directory.');
if (builder.nsis && builder.nsis['deleteAppDataOnUninstall'] === true) throw new Error('Installer must not delete user data automatically.');

console.log('Persistent database path and installer identity contract smoke validation passed.');
