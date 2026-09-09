import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const builder = JSON.parse(readFileSync('electron-builder.json', 'utf8'));

if (pkg.version !== '1.1.0') {
  throw new Error(`Release identity mismatch: expected package version 1.1.0, got ${pkg.version}.`);
}
if (builder?.win?.artifactName !== 'Tolou-Concrete-Mix-Design-${version}-Setup.${ext}') {
  throw new Error('Windows artifact naming contract no longer derives from package version.');
}
if (builder?.nsis?.uninstallDisplayName !== 'Tolou Concrete Mix Design ${version}') {
  throw new Error('Windows uninstall display name no longer derives from package version.');
}
console.log('v1.1 release identity contract passed: package and Windows installer metadata resolve from version 1.1.0.');
