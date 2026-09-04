import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import type { WebContents } from 'electron';
import { bindRendererSession, getRendererSession, initializeSecurityRuntime, requireRendererPermission } from './securityRuntime';

function fakeSender(id: number): WebContents {
  const listeners = new Map<string, () => void>();
  return {
    id,
    once(event: string, listener: () => void) { listeners.set(event, listener); return this; }
  } as unknown as WebContents;
}

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
const security = initializeSecurityRuntime(database);
const admin = security.bootstrapFirstAdministrator('runtime.admin', 'Runtime Administrator', 'Runtime-Admin-Password-2026');
assert.equal(admin.username, 'runtime.admin');
const session = security.authenticate('runtime.admin', 'Runtime-Admin-Password-2026');

const authorizedRenderer = fakeSender(1001);
const otherRenderer = fakeSender(2002);
bindRendererSession(authorizedRenderer, session);

assert.equal(getRendererSession(authorizedRenderer)?.username, 'runtime.admin');
assert.equal(getRendererSession(otherRenderer), null);
assert.throws(() => requireRendererPermission(otherRenderer, 'engineering.read'), /Authentication required/i, 'A different renderer must not inherit another renderer session.');
assert.doesNotThrow(() => requireRendererPermission(authorizedRenderer, 'security.users.manage'));

const viewer = security.createUser(session.id, 'runtime.viewer', 'Runtime Viewer', 'Runtime-Viewer-Password-2026', 'viewer');
assert.equal(viewer.username, 'runtime.viewer');
const viewerSession = security.authenticate('runtime.viewer', 'Runtime-Viewer-Password-2026');
const viewerRenderer = fakeSender(3003);
bindRendererSession(viewerRenderer, viewerSession);
assert.doesNotThrow(() => requireRendererPermission(viewerRenderer, 'engineering.read'));
assert.throws(() => requireRendererPermission(viewerRenderer, 'engineering.write'), /Permission denied/i, 'Viewer renderer must not bypass write authorization.');
assert.throws(() => requireRendererPermission(viewerRenderer, 'security.users.manage'), /Permission denied/i, 'Viewer renderer must not bypass administrator authorization.');

assert.equal(database.pragma('quick_check', { simple: true }), 'ok');
assert.equal((database.pragma('foreign_key_check') as unknown[]).length, 0);
database.close();
console.log('Gate 09 renderer session isolation smoke passed: renderer binding and direct authorization bypass protection verified.');
