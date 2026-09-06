import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalize, LicensingService, type LicensePayload, type SignedLicenseDocument, verifyLicenseDocument } from './licensingService';
import { TOLOU_LICENSE_PRODUCT_ID, TOLOU_LICENSE_PUBLIC_KEY_PEM, TOLOU_LICENSE_SCHEMA_VERSION } from './licensePublicKey';

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tolou-licensing-'));
const licensePath = path.join(tempDir, 'licensing', 'license.json');
const clockStatePath = path.join(tempDir, 'licensing', 'clock-state.json');
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const machine = 'a'.repeat(64);
let now = new Date('2026-09-05T00:00:00.000Z');

function payload(overrides: Partial<LicensePayload> = {}): LicensePayload {
  return {
    schemaVersion: TOLOU_LICENSE_SCHEMA_VERSION,
    productId: TOLOU_LICENSE_PRODUCT_ID,
    licenseId: 'LIC-GATE10-001', customerName: 'Tolou Commercial Customer', edition: 'professional', licenseType: 'commercial',
    issuedAt: '2026-09-01T00:00:00.000Z', durationDays: 365, expiresAt: '2027-09-01T00:00:00.000Z', perpetual: false,
    machineFingerprint: machine, features: ['engineering', 'reports', 'trial-mix'], ...overrides
  };
}
function sign(value: LicensePayload): SignedLicenseDocument {
  return { payload: value, signature: crypto.sign(null, Buffer.from(canonicalize(value), 'utf8'), privateKeyPem).toString('base64') };
}

try {
  assert.doesNotThrow(() => crypto.createPublicKey(TOLOU_LICENSE_PUBLIC_KEY_PEM), 'Embedded production verification key must be a valid public key.');

  const active = sign(payload());
  const activeStatus = verifyLicenseDocument(active, { publicKeyPem, machineFingerprint: machine, now });
  assert.equal(activeStatus.state, 'active'); assert.equal(activeStatus.licensed, true); assert.equal(activeStatus.customerName, 'Tolou Commercial Customer');
  assert.equal(activeStatus.durationDays, 365); assert.ok((activeStatus.remainingDays ?? 0) > 0);
  assert.equal(verifyLicenseDocument(sign(payload({ licenseId: 'LIC-TRIAL-001', licenseType: 'trial', edition: 'trial' })), { publicKeyPem, machineFingerprint: machine, now }).state, 'trial');
  assert.equal(verifyLicenseDocument(sign(payload({ licenseId: 'LIC-GRACE-001', licenseType: 'grace', edition: 'grace' })), { publicKeyPem, machineFingerprint: machine, now }).state, 'grace');

  const tampered = structuredClone(active); tampered.payload.customerName = 'Tampered Customer';
  assert.equal(verifyLicenseDocument(tampered, { publicKeyPem, machineFingerprint: machine, now }).state, 'invalid');
  assert.equal(verifyLicenseDocument(sign(payload({ productId: 'other-product' })), { publicKeyPem, machineFingerprint: machine, now }).state, 'incompatible');
  assert.equal(verifyLicenseDocument(sign(payload({ machineFingerprint: 'b'.repeat(64) })), { publicKeyPem, machineFingerprint: machine, now }).state, 'wrong_machine');
  assert.equal(verifyLicenseDocument(sign(payload({ durationDays: 2, expiresAt: '2026-09-03T00:00:00.000Z' })), { publicKeyPem, machineFingerprint: machine, now }).state, 'expired');
  assert.equal(verifyLicenseDocument(sign(payload({ perpetual: true, durationDays: null, expiresAt: null })), { publicKeyPem, machineFingerprint: machine, now }).state, 'active');
  assert.equal(verifyLicenseDocument(sign(payload({ licenseType: 'trial', perpetual: true, durationDays: null, expiresAt: null })), { publicKeyPem, machineFingerprint: machine, now }).state, 'invalid');
  assert.equal(verifyLicenseDocument(sign(payload({ schemaVersion: TOLOU_LICENSE_SCHEMA_VERSION + 1 })), { publicKeyPem, machineFingerprint: machine, now }).state, 'incompatible');
  assert.equal(verifyLicenseDocument(sign(payload({ durationDays: 30, expiresAt: '2027-09-01T00:00:00.000Z' })), { publicKeyPem, machineFingerprint: machine, now }).state, 'invalid');

  const service = new LicensingService({ licensePath, clockStatePath, machineFingerprint: () => machine, publicKeyPem, now: () => new Date(now), rollbackToleranceMs: 60_000 });
  assert.equal(service.getStatus().state, 'unlicensed');
  assert.equal(service.importLicense(JSON.stringify(active)).state, 'active');
  assert.doesNotThrow(() => service.requireFeature('engineering'));
  assert.doesNotThrow(() => service.requireFeature('reports'));
  assert.doesNotThrow(() => service.requireFeature('trial-mix'));
  assert.ok(existsSync(licensePath)); assert.ok(existsSync(clockStatePath));

  const engineeringOnly = sign(payload({ licenseId: 'LIC-ENGINEERING-ONLY', features: ['engineering'] }));
  service.importLicense(JSON.stringify(engineeringOnly));
  assert.doesNotThrow(() => service.requireFeature('engineering'));
  assert.throws(() => service.requireFeature('reports'), /feature required: reports/i);
  assert.throws(() => service.requireFeature('trial-mix'), /feature required: trial-mix/i);

  const noEngineering = sign(payload({ licenseId: 'LIC-NO-ENGINEERING', features: ['reports'] }));
  service.importLicense(JSON.stringify(noEngineering));
  assert.throws(() => service.requireFeature('engineering'), /feature required: engineering/i);

  const replacement = sign(payload({ licenseId: 'LIC-GATE10-002', customerName: 'Replacement Customer' }));
  assert.equal(service.importLicense(JSON.stringify(replacement)).licenseId, 'LIC-GATE10-002');
  assert.equal(JSON.parse(readFileSync(licensePath, 'utf8')).payload.customerName, 'Replacement Customer');
  const bytesBeforeRejectedImport = readFileSync(licensePath);
  assert.throws(() => service.importLicense(JSON.stringify(tampered)), /signature/i);
  assert.deepEqual(readFileSync(licensePath), bytesBeforeRejectedImport, 'Rejected license replacement must not modify the installed license.');

  now = new Date('2026-09-05T02:00:00.000Z'); assert.equal(service.getStatus().state, 'active');
  now = new Date('2026-09-05T01:50:00.000Z'); assert.equal(service.getStatus().state, 'clock_rollback');
  assert.throws(() => service.requireActiveLicense(), /clock_rollback/i);
  service.removeLicense(); assert.equal(service.getStatus().state, 'unlicensed'); assert.ok(!existsSync(licensePath));

  console.log('Gate 10 licensing smoke passed: production public key, Ed25519 verification, duration/remaining-days contract, license states, feature enforcement, tamper/product/machine/expiry/schema rejection, safe replacement and clock rollback protection verified.');
} finally { rmSync(tempDir, { recursive: true, force: true }); }
