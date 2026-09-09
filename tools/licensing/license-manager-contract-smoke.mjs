import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { canonicalize: managerCanonicalize, createPersianLicenseDocument, toPersianPayload } = require('../../apps/license-manager/licenseContract.js');
const { canonicalize: runtimeCanonicalize, parseLicenseDocument, verifyLicenseDocument } = require('../../dist/electron/licensingService.js');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const machineFingerprint = 'c'.repeat(64);
const now = new Date('2026-09-05T12:00:00.000Z');

const payload = {
  schemaVersion: 2,
  productId: 'tolou-concrete-mix-design',
  licenseId: 'LM-CONTRACT-SMOKE-001',
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

const persianPayload = toPersianPayload(payload);
assert.equal(managerCanonicalize(persianPayload), runtimeCanonicalize(persianPayload), 'License Manager and runtime Persian canonicalization must be byte-identical.');

const persianDocument = createPersianLicenseDocument(payload, privateKeyPem);
assert.equal(persianDocument['نام_مشتری'], payload.customerName);
assert.equal(persianDocument['مدت_اشتراک_روز'], 365);
assert.equal(typeof persianDocument['امضا'], 'string');
assert.ok(!('payload' in persianDocument));
assert.ok(!('signature' in persianDocument));

const parsed = parseLicenseDocument(JSON.stringify(persianDocument));
const status = verifyLicenseDocument(parsed, { publicKeyPem, machineFingerprint, now });
assert.equal(status.state, 'active');
assert.equal(status.licensed, true);
assert.equal(status.licenseId, payload.licenseId);
assert.equal(status.customerName, payload.customerName);
assert.equal(status.durationDays, 365);
assert.equal(status.remainingDays, 365);
assert.deepEqual(status.features, payload.features);

const tamperedDocument = { ...persianDocument, 'نام_مشتری': 'دستکاری شده' };
const tamperedStatus = verifyLicenseDocument(parseLicenseDocument(JSON.stringify(tamperedDocument)), { publicKeyPem, machineFingerprint, now });
assert.equal(tamperedStatus.state, 'invalid');
assert.equal(tamperedStatus.licensed, false);

console.log('License Manager Persian contract smoke passed: Persian schema v2 document, shared canonicalization, Ed25519 verification, duration/remaining-days mapping and tamper rejection are compatible with the Tolou runtime.');
