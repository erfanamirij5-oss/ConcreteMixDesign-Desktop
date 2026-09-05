import path from 'node:path';

export function buildLicensingPaths(userDataPath: string) {
  const licensingDir = path.join(userDataPath, 'licensing');
  return {
    licensingDir,
    licensePath: path.join(licensingDir, 'license.json'),
    clockStatePath: path.join(licensingDir, 'clock-state.json')
  };
}
