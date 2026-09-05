import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalize, LicensingService, type LicensePayload, type SignedLicenseDocument, verifyLicenseDocument } from './licensingService';
import { TOLOU_LICENSE_PRODUCT_ID, TOLOU_LICENSE_SCHEMA_VERSION } from './licensePublicKey';

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
    licenseId: 'LIC-GATE10-001',
    customerName: 'Tolou Commercial Customer',
    edition: 'professional',
    licenseType: 'commercial',
    issuedAt: '2026-09-01T00:00:00.000Z',
    expiresAt: '2027-09-01T00:00:00.000Z',
    perpetual: false,
    machineFingerprint: machine,
    features: ['engineering', 'reports', 'trial-mix'],
    ...overrides
  };
}

function sign(value: LicensePayload): SignedLicenseDocument {
  const signature = crypto.sign(null, Buffer.from(canonicalize(value), 'utf8'), privateKeyPem).toString('base64');
  return { payload: value, signature };
}

try {
  const active = sign(payload());
  const activeStatus = verifyLicenseDocument(active, { publicKeyPem, machineFingerprint: machine, now });
  assert.equal(activeStatus.state, 'active');
  assert.equal(activeStatus.licensed, true);
  assert.equal(activeStatus.customerName, 'Tolou Commercial Customer');

  const trial = sign(payload({ licenseId: 'LIC-TRIAL-001', licenseType: 'trial', edition: 'trial' }));
  assert.equal(verifyLicenseDocument(trial, { publicKeyPem, machineFingerprint: machine, now }).state, 'trial');

  const grace = sign(payload({ licenseId: 'LIC-GRACE-001', licenseType: 'grace', edition: 'grace' }));
  assert.equal(verifyLicenseDocument(grace, { publicKeyPem, machineFingerprint: machine, now }).state, 'grace');

  const tampered = structuredClone(active);
  tampered.payload.customerName = 'Tampered Customer';
  assert.equal(verifyLicenseDocument(tampered, { publicKeyPem, machineFingerprint: machine, now }).state, 'invalid');

  const wrongProduct = sign(payload({ productId: 'other-product' }));
  assert.equal(verifyLicenseDocument(wrongProduct, { publicKeyPem, machineFingerprint: machine, now }).state, 'incompatible');

  const wrongMachine = sign(payload({ machineFingerprint: 'b'.repeat(64) }));
  assert.equal(verifyLicenseDocument(wrongMachine, { publicKeyPem, machineFingerprint: machine, now }).state, 'wrong_machine');

  const expired = sign(payload({ expiresAt: '2026-01-01T00:00:00.000Z' }));
  assert.equal(verifyLicenseDocument(expired, { publicKeyPem, machineFingerprint: machine, now }).state, 'expired');

  const perpetual = sign(payload({ perpetual: true, expiresAt: null }));
  assert.equal(verifyLicenseDocument(perpetual, { publicKeyPem, machineFingerprint: machine, now }).state, 'active');
  assert.equal(verifyLicenseDocument(sign(payload({ licenseType: 'trial', perpetual: true, expiresAt: null })), { publicKeyPem, machineFingerprint: machine, now }).state, 'invalid');

  const futureSchema = sign(payload({ schemaVersion: TOLOU_LICENSE_SCHEMA_VERSION + 1 }));
  assert.equal(verifyLicenseDocument(futureSchema, { publicKeyPem, machineFingerprint: machine, now }).state, 'incompatible');

  const service = new LicensingService({
    licensePath,
    clockStatePath,
    machineFingerprint: () => machine,
    publicKeyPem,
    now: () => new Date(now),
    rollbackToleranceMs: 60_000
  });

  assert.equal(service.getStatus().state, 'unlicensed');
  assert.equal(service.importLicense(JSON.stringify(active)).state, 'active');
  assert.equal(service.getStatus().state, 'active');
  assert.ok(existsSync(licensePath));
  assert.ok(existsSync(clockStatePath));
  assert.equal(JSON.parse(readFileSync(licensePath, 'utf8')).payload.licenseId, 'LIC-GATE10-001');

  const replacement = sign(payload({ licenseId: 'LIC-GATE10-002', customerName: 'Replacement Customer' }));
  assert.equal(service.importLicense(JSON.stringify(replacement)).licenseId, 'LIC-GATE10-002');
  assert.equal(JSON.parse(readFileSync(licensePath, 'utf8')).payload.customerName, 'Replacement Customer');

  const bytesBeforeRejectedImport = readFileSync(licensePath);
  assert.throws(() => service.importLicense(JSON.stringify(tampered)), /signature/i);
  assert.deepEqual(readFileSync(licensePath), bytesBeforeRejectedImport, 'Rejected license replacement must not modify the installed license.');

  now = new Date('2026-09-05T02:00:00.000Z');
  assert.equal(service.getStatus().state, 'active');
  now = new Date('2026-09-05T01:50:00.000Z');
  assert.equal(service.getStatus().state, 'clock_rollback');
  assert.throws(() => service.requireActiveLicense(), /clock_rollback/i);

  service.removeLicense();
  assert.equal(service.getStatus().state, 'unlicensed');
  assert.ok(!existsSync(licensePath));

  console.log('Gate 10 licensing smoke passed: Ed25519 signature, active/trial/grace states, tamper/product/machine/expiry/schema rejection, perpetual license, safe replacement, persistence and clock rollback protection verified.');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
