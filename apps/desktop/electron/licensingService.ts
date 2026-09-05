import crypto from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { TOLOU_LICENSE_PRODUCT_ID, TOLOU_LICENSE_PUBLIC_KEY_PEM, TOLOU_LICENSE_SCHEMA_VERSION } from './licensePublicKey';

export type LicenseState = 'unlicensed' | 'active' | 'trial' | 'grace' | 'expired' | 'invalid' | 'wrong_machine' | 'incompatible' | 'clock_rollback';

export type LicensePayload = {
  schemaVersion: number;
  productId: string;
  licenseId: string;
  customerName: string;
  edition: string;
  issuedAt: string;
  expiresAt: string | null;
  perpetual: boolean;
  machineFingerprint: string;
  features: string[];
};

export type SignedLicenseDocument = {
  payload: LicensePayload;
  signature: string;
};

export type LicenseStatus = {
  state: LicenseState;
  licensed: boolean;
  reason?: string;
  licenseId?: string;
  customerName?: string;
  edition?: string;
  expiresAt?: string | null;
  perpetual?: boolean;
  features?: string[];
};

type ClockState = { lastSeenAt: string };

type LicensingServiceOptions = {
  licensePath: string;
  clockStatePath: string;
  machineFingerprint: () => string;
  publicKeyPem?: string;
  now?: () => Date;
  rollbackToleranceMs?: number;
};

export class LicensingService {
  private readonly publicKeyPem: string;
  private readonly now: () => Date;
  private readonly rollbackToleranceMs: number;

  constructor(private readonly options: LicensingServiceOptions) {
    this.publicKeyPem = options.publicKeyPem ?? TOLOU_LICENSE_PUBLIC_KEY_PEM;
    this.now = options.now ?? (() => new Date());
    this.rollbackToleranceMs = options.rollbackToleranceMs ?? 5 * 60 * 1000;
  }

  getLicensePath() {
    return this.options.licensePath;
  }

  getStatus(): LicenseStatus {
    if (!existsSync(this.options.licensePath)) return { state: 'unlicensed', licensed: false, reason: 'No license is installed.' };
    let document: SignedLicenseDocument;
    try {
      document = parseLicenseDocument(readFileSync(this.options.licensePath, 'utf8'));
    } catch (error) {
      return { state: 'invalid', licensed: false, reason: error instanceof Error ? error.message : 'License file is invalid.' };
    }
    const status = verifyLicenseDocument(document, {
      publicKeyPem: this.publicKeyPem,
      machineFingerprint: this.options.machineFingerprint(),
      now: this.now()
    });
    if (!status.licensed) return status;
    const clockStatus = this.checkAndAdvanceClock();
    if (clockStatus) return clockStatus;
    return status;
  }

  importLicense(raw: string): LicenseStatus {
    const document = parseLicenseDocument(raw);
    const status = verifyLicenseDocument(document, {
      publicKeyPem: this.publicKeyPem,
      machineFingerprint: this.options.machineFingerprint(),
      now: this.now()
    });
    if (!status.licensed) throw new Error(status.reason ?? `License cannot be activated: ${status.state}`);
    this.assertClockNotRolledBack();
    atomicWrite(this.options.licensePath, `${JSON.stringify(document, null, 2)}\n`);
    this.advanceClock(this.now());
    return status;
  }

  removeLicense() {
    if (existsSync(this.options.licensePath)) rmSync(this.options.licensePath, { force: true });
  }

  requireActiveLicense() {
    const status = this.getStatus();
    if (!status.licensed) throw new Error(`Active product license required (${status.state}).`);
    return status;
  }

  private checkAndAdvanceClock(): LicenseStatus | null {
    try {
      this.assertClockNotRolledBack();
    } catch (error) {
      return { state: 'clock_rollback', licensed: false, reason: error instanceof Error ? error.message : 'System clock rollback detected.' };
    }
    this.advanceClock(this.now());
    return null;
  }

  private assertClockNotRolledBack() {
    if (!existsSync(this.options.clockStatePath)) return;
    let parsed: ClockState;
    try { parsed = JSON.parse(readFileSync(this.options.clockStatePath, 'utf8')) as ClockState; }
    catch { throw new Error('License clock state is corrupted.'); }
    const lastSeen = Date.parse(parsed.lastSeenAt);
    if (!Number.isFinite(lastSeen)) throw new Error('License clock state is invalid.');
    const current = this.now().getTime();
    if (current + this.rollbackToleranceMs < lastSeen) throw new Error('System clock rollback exceeds the allowed tolerance.');
  }

  private advanceClock(now: Date) {
    const current = now.getTime();
    let lastSeen = 0;
    if (existsSync(this.options.clockStatePath)) {
      try {
        const parsed = JSON.parse(readFileSync(this.options.clockStatePath, 'utf8')) as ClockState;
        const value = Date.parse(parsed.lastSeenAt);
        if (Number.isFinite(value)) lastSeen = value;
      } catch {
        // Replaced below with a valid state after successful license validation.
      }
    }
    const next = new Date(Math.max(current, lastSeen)).toISOString();
    atomicWrite(this.options.clockStatePath, `${JSON.stringify({ lastSeenAt: next }, null, 2)}\n`);
  }
}

export function verifyLicenseDocument(document: SignedLicenseDocument, input: { publicKeyPem: string; machineFingerprint: string; now: Date }): LicenseStatus {
  const payload = document.payload;
  if (!payload || typeof payload !== 'object') return invalid('License payload is missing.');
  if (payload.schemaVersion !== TOLOU_LICENSE_SCHEMA_VERSION) return { state: 'incompatible', licensed: false, reason: 'License schema version is not supported.' };
  if (payload.productId !== TOLOU_LICENSE_PRODUCT_ID) return { state: 'incompatible', licensed: false, reason: 'License belongs to another product.' };
  if (!payload.licenseId?.trim() || !payload.customerName?.trim() || !payload.edition?.trim()) return invalid('License identity fields are incomplete.');
  if (!Array.isArray(payload.features) || !payload.features.every(value => typeof value === 'string')) return invalid('License feature list is invalid.');
  if (!/^[a-f0-9]{64}$/i.test(payload.machineFingerprint ?? '')) return invalid('License machine binding is invalid.');
  if (payload.machineFingerprint.toLowerCase() !== input.machineFingerprint.toLowerCase()) return { state: 'wrong_machine', licensed: false, reason: 'License is bound to another machine.' };
  if (!Number.isFinite(Date.parse(payload.issuedAt))) return invalid('License issue timestamp is invalid.');
  if (payload.perpetual) {
    if (payload.expiresAt !== null) return invalid('Perpetual license must not contain an expiry timestamp.');
  } else {
    if (!payload.expiresAt || !Number.isFinite(Date.parse(payload.expiresAt))) return invalid('License expiry timestamp is invalid.');
  }
  let signature: Buffer;
  try { signature = Buffer.from(document.signature, 'base64'); }
  catch { return invalid('License signature encoding is invalid.'); }
  if (!signature.length) return invalid('License signature is missing.');
  let signatureValid = false;
  try { signatureValid = crypto.verify(null, Buffer.from(canonicalize(payload), 'utf8'), input.publicKeyPem, signature); }
  catch { return invalid('License signature verification failed.'); }
  if (!signatureValid) return invalid('License signature is invalid.');
  if (!payload.perpetual && input.now.getTime() > Date.parse(payload.expiresAt as string)) return { state: 'expired', licensed: false, reason: 'License has expired.', ...publicFields(payload) };
  return { state: 'active', licensed: true, ...publicFields(payload) };
}

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(',')}}`;
}

export function parseLicenseDocument(raw: string): SignedLicenseDocument {
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new Error('License file is not valid JSON.'); }
  if (!value || typeof value !== 'object') throw new Error('License document is invalid.');
  const document = value as Partial<SignedLicenseDocument>;
  if (!document.payload || typeof document.signature !== 'string') throw new Error('License payload or signature is missing.');
  return document as SignedLicenseDocument;
}

function publicFields(payload: LicensePayload) {
  return {
    licenseId: payload.licenseId,
    customerName: payload.customerName,
    edition: payload.edition,
    expiresAt: payload.expiresAt,
    perpetual: payload.perpetual,
    features: [...payload.features]
  };
}

function invalid(reason: string): LicenseStatus {
  return { state: 'invalid', licensed: false, reason };
}

function atomicWrite(destination: string, content: string) {
  mkdirSync(path.dirname(destination), { recursive: true });
  const temp = `${destination}.tmp`;
  writeFileSync(temp, content, 'utf8');
  if (existsSync(destination)) rmSync(destination, { force: true });
  renameSync(temp, destination);
}
