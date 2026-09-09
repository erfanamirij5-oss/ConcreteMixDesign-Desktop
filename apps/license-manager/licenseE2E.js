const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { canonicalize, createPersianLicenseDocument } = require('./licenseContract');

const DAY_MS = 24 * 60 * 60 * 1000;
const PRODUCT_ID = 'tolou-concrete-mix-design';
const MACHINE = 'a'.repeat(64);
const issuedAt = '2026-09-07T12:00:00.000Z';
const keys = crypto.generateKeyPairSync('ed25519');
const privateKeyPem = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicKeyPem = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();

function issue(durationDays = 365) {
  const issued = Date.parse(issuedAt);
  return createPersianLicenseDocument({
    schemaVersion: 2,
    productId: PRODUCT_ID,
    licenseId: 'LIC-E2E-365',
    customerName: 'مشتری آزمایشی طلوع',
    edition: 'professional',
    licenseType: 'commercial',
    issuedAt,
    durationDays,
    expiresAt: new Date(issued + durationDays * DAY_MS).toISOString(),
    perpetual: false,
    machineFingerprint: MACHINE,
    features: ['engineering', 'reports', 'trial-mix']
  }, privateKeyPem);
}

function verifyPersian(document, machine, now) {
  const signed = { ...document };
  const signature = signed['امضا'];
  delete signed['امضا'];
  assert.equal(signed['نسخه'], 2);
  assert.equal(signed['شناسه_محصول'], PRODUCT_ID);
  assert.equal(signed['کد_دستگاه'], machine);
  assert.ok(crypto.verify(null, Buffer.from(canonicalize(signed), 'utf8'), publicKeyPem, Buffer.from(signature, 'base64')));
  const issued = Date.parse(signed['تاریخ_صدور']);
  const expires = Date.parse(signed['تاریخ_پایان']);
  assert.equal(expires, issued + signed['مدت_اشتراک_روز'] * DAY_MS);
  return { customerName: signed['نام_مشتری'], remainingDays: Math.max(0, Math.ceil((expires - now.getTime()) / DAY_MS)), licensed: now.getTime() < expires };
}

const document = issue();
assert.equal(document['نام_مشتری'], 'مشتری آزمایشی طلوع');
assert.equal(document['مدت_اشتراک_روز'], 365);
assert.ok(!('payload' in document));
const active = verifyPersian(document, MACHINE, new Date(issuedAt));
assert.equal(active.licensed, true);
assert.equal(active.remainingDays, 365);
assert.equal(active.customerName, 'مشتری آزمایشی طلوع');
const expiry = new Date(Date.parse(issuedAt) + 365 * DAY_MS);
assert.equal(verifyPersian(document, MACHINE, expiry).licensed, false);
const tampered = structuredClone(document);
tampered['نام_مشتری'] = 'دستکاری';
assert.throws(() => verifyPersian(tampered, MACHINE, new Date(issuedAt)));
assert.throws(() => verifyPersian(document, 'b'.repeat(64), new Date(issuedAt)));
console.log('Licensing v2 E2E contract passed: Persian issuer -> signature -> machine -> remaining days -> expiry lock.');
