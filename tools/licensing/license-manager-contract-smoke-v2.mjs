import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { canonicalize: managerCanonicalize, signPayload } = require('../../apps/license-manager/licenseContract.js');
const { canonicalize: runtimeCanonicalize, verifyLicenseDocument } = require('../../dist/electron/licensingService.js');

const keys = crypto.generateKeyPairSync('ed25519');
const verificationKey = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const signingKey = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const machineFingerprint = 'c'.repeat(64);
const now = new Date('2026-09-05T12:00:00.000Z');

const payload = {
  schemaVersion: 2,
  productId: 'tolou-concrete-mix-design',
  licenseId: 'LM-CONTRACT-SMOKE-002',
  customerName: 'License Manager Contract Smoke',
  edition: 'professional',
  licenseType: 'commercial',
  issuedAt: '2026-09-05T11:00:00.000Z',
  durationDays: 365,
  expiresAt: '2027-09-05T11:00:00.000Z',
  perpetual: false,
  machineFingerprint,
  features: ['engineering', 'reports', 'trial-mix']
};

assert.equal(managerCanonicalize(payload), runtimeCanonicalize(payload));
const signature = signPayload(payload, signingKey);
const status = verifyLicenseDocument({ payload, signature }, { publicKeyPem: verificationKey, machineFingerprint, now });
assert.equal(status.state, 'active');
assert.equal(status.licensed, true);
assert.equal(status.durationDays, 365);
assert.equal(status.remainingDays, 365);

const tamperedPayload = { ...payload, customerName: 'Tampered' };
const tamperedStatus = verifyLicenseDocument({ payload: tamperedPayload, signature }, { publicKeyPem: verificationKey, machineFingerprint, now });
assert.equal(tamperedStatus.state, 'invalid');
assert.equal(tamperedStatus.licensed, false);

console.log('License Manager v2 contract smoke passed.');
