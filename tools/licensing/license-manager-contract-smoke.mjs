import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { canonicalize: managerCanonicalize, signPayload } = require('../../apps/license-manager/licenseContract.js');
const { canonicalize: runtimeCanonicalize, verifyLicenseDocument } = require('../../dist/electron/licensingService.js');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const machineFingerprint = 'c'.repeat(64);
const now = new Date('2026-09-05T12:00:00.000Z');

const payload = {
  schemaVersion: 1,
  productId: 'tolou-concrete-mix-design',
  licenseId: 'LM-CONTRACT-SMOKE-001',
  customerName: 'License Manager Contract Smoke',
  edition: 'professional',
  licenseType: 'commercial',
  issuedAt: '2026-09-05T11:00:00.000Z',
  expiresAt: '2027-09-05T11:00:00.000Z',
  perpetual: false,
  machineFingerprint,
  features: ['engineering', 'reports', 'trial-mix']
};

assert.equal(
  managerCanonicalize(payload),
  runtimeCanonicalize(payload),
  'License Manager and runtime canonicalization must be byte-identical.'
);

const signature = signPayload(payload, privateKeyPem);
const status = verifyLicenseDocument(
  { payload, signature },
  { publicKeyPem, machineFingerprint, now }
);

assert.equal(status.state, 'active');
assert.equal(status.licensed, true);
assert.equal(status.licenseId, payload.licenseId);
assert.deepEqual(status.features, payload.features);

const tamperedPayload = { ...payload, customerName: 'Tampered' };
const tamperedStatus = verifyLicenseDocument(
  { payload: tamperedPayload, signature },
  { publicKeyPem, machineFingerprint, now }
);
assert.equal(tamperedStatus.state, 'invalid');
assert.equal(tamperedStatus.licensed, false);

console.log('License Manager contract smoke passed: shared canonicalization and Ed25519 output are accepted by the Tolou runtime verifier; tampering is rejected.');
