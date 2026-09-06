const crypto = require('node:crypto');

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(',')}}`;
}

function toPersianPayload(payload) {
  return {
    'نسخه': payload.schemaVersion,
    'شناسه_محصول': payload.productId,
    'شناسه_لایسنس': payload.licenseId,
    'نام_مشتری': payload.customerName,
    'ویرایش': payload.edition,
    'نوع_لایسنس': payload.licenseType,
    'تاریخ_صدور': payload.issuedAt,
    'مدت_اشتراک_روز': payload.durationDays,
    'تاریخ_پایان': payload.expiresAt,
    'دائمی': payload.perpetual,
    'کد_دستگاه': payload.machineFingerprint,
    'قابلیت‌ها': [...payload.features]
  };
}

function signPayload(payload, privateKeyPem) {
  return crypto.sign(null, Buffer.from(canonicalize(payload), 'utf8'), privateKeyPem).toString('base64');
}

function createPersianLicenseDocument(payload, privateKeyPem) {
  const persianPayload = toPersianPayload(payload);
  return { ...persianPayload, 'امضا': signPayload(persianPayload, privateKeyPem) };
}

module.exports = { canonicalize, signPayload, toPersianPayload, createPersianLicenseDocument };
