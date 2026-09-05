const crypto = require('node:crypto');

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(',')}}`;
}

function signPayload(payload, privateKeyPem) {
  return crypto.sign(null, Buffer.from(canonicalize(payload), 'utf8'), privateKeyPem).toString('base64');
}

module.exports = { canonicalize, signPayload };
