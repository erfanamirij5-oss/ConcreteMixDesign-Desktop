import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';

const PRODUCT_SALT = 'tolou-concrete-mix-design:machine-binding:v1';

export function getMachineFingerprint(): string {
  const raw = getStableMachineIdentifier();
  return crypto.createHash('sha256').update(`${PRODUCT_SALT}|${raw}`).digest('hex');
}

function getStableMachineIdentifier(): string {
  if (process.platform === 'win32') {
    try {
      const output = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { encoding: 'utf8', windowsHide: true });
      const match = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
      if (match?.[1]?.trim()) return `windows:${match[1].trim()}`;
    } catch {
      // Fall through to a stable local fallback.
    }
  }

  for (const candidate of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
    try {
      if (!existsSync(candidate)) continue;
      const value = readFileSync(candidate, 'utf8').trim();
      if (value) return `unix:${value}`;
    } catch {
      // Continue to next provider.
    }
  }

  if (process.platform === 'darwin') {
    try {
      const output = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf8' });
      const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (match?.[1]) return `mac:${match[1]}`;
    } catch {
      // Fall through to the local fallback.
    }
  }

  return `fallback:${os.hostname()}|${os.homedir()}`;
}
