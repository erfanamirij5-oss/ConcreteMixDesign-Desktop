import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rendererDir = path.join(repoRoot, 'dist', 'renderer');
const indexPath = path.join(rendererDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Renderer build is missing: ${indexPath}`);
}

const html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('id="root"')) {
  throw new Error('Renderer index.html does not contain the React root element.');
}

const assetRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
const localAssets = assetRefs.filter(ref => !/^(?:https?:|data:|#)/i.test(ref));

if (localAssets.length === 0) {
  throw new Error('Renderer index.html does not reference any local built assets.');
}

for (const ref of localAssets) {
  if (ref.startsWith('/')) {
    throw new Error(
      `Packaged renderer contains an absolute asset path (${ref}). ` +
      'Electron file:// loading requires relative asset URLs.'
    );
  }

  const clean = ref.split(/[?#]/, 1)[0];
  const resolved = path.resolve(rendererDir, clean);
  if (!resolved.startsWith(rendererDir + path.sep) && resolved !== rendererDir) {
    throw new Error(`Renderer asset escapes build directory: ${ref}`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Renderer asset referenced by index.html is missing: ${ref}`);
  }
}

console.log(`Renderer build smoke passed: ${localAssets.length} relative local assets resolve under dist/renderer.`);
