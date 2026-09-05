import crypto from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const args = parseArgs(process.argv.slice(2));
const required = ['private-key', 'machine', 'license-id', 'customer', 'edition', 'type', 'output'];
for (const key of required) if (!args[key]) fail(`Missing --${key}`);

if (!/^[a-f0-9]{64}$/i.test(args.machine)) fail('--machine must be the 64-character SHA-256 machine code shown by Tolou.');
if (!['commercial', 'trial', 'grace'].includes(args.type)) fail('--type must be commercial, trial or grace.');
const perpetual = args.perpetual === 'true';
if (perpetual && args.type !== 'commercial') fail('Only commercial licenses may be perpetual.');
if (!perpetual && !args.expires) fail('Time-limited licenses require --expires <ISO-8601>.');
if (args.expires && !Number.isFinite(Date.parse(args.expires))) fail('--expires must be a valid ISO-8601 timestamp.');

const payload = {
  schemaVersion: 1,
  productId: 'tolou-concrete-mix-design',
  licenseId: args['license-id'],
  customerName: args.customer,
  edition: args.edition,
  licenseType: args.type,
  issuedAt: new Date().toISOString(),
  expiresAt: perpetual ? null : args.expires,
  perpetual,
  machineFingerprint: args.machine.toLowerCase(),
  features: String(args.features ?? 'engineering,reports,trial-mix').split(',').map(value => value.trim()).filter(Boolean)
};

const privateKeyPem = readFileSync(args['private-key'], 'utf8');
const signature = crypto.sign(null, Buffer.from(canonicalize(payload), 'utf8'), privateKeyPem).toString('base64');
const document = { payload, signature };
writeFileSync(args.output, `${JSON.stringify(document, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
console.log(`Tolou license written to ${args.output}`);
console.log(`License ID: ${payload.licenseId}`);
console.log(`Customer: ${payload.customerName}`);
console.log(`Type: ${payload.licenseType}`);
console.log(`Edition: ${payload.edition}`);
console.log(`Expiry: ${payload.perpetual ? 'perpetual' : payload.expiresAt}`);

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(',')}}`;
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith('--')) fail(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith('--')) result[key] = 'true';
    else { result[key] = next; index += 1; }
  }
  return result;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
