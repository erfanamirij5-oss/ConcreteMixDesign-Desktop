import { ipcMain } from 'electron';
import { bindRendererSession, clearRendererSession, getRendererSession, getSecurityService, requireRendererPermission } from './securityRuntime';

let registered = false;

type BootstrapPayload = { username?: string; displayName?: string; password?: string };
type LoginPayload = { username?: string; password?: string };
type CreateUserPayload = { username?: string; displayName?: string; password?: string; roleId?: 'administrator' | 'engineer' | 'viewer' };
type UserRolePayload = { userId?: string; roleId?: 'administrator' | 'engineer' | 'viewer' };
type UserActivePayload = { userId?: string; active?: boolean };

export function registerSecurityIpc() {
  if (registered) return;
  registered = true;

  ipcMain.handle('security:status', event => safeCall(() => ({
    status: 'pass' as const,
    bootstrapRequired: !getSecurityService().hasUsers(),
    session: publicSession(getRendererSession(event.sender))
  })));

  ipcMain.handle('security:bootstrap', (event, payload: BootstrapPayload) => safeCall(() => {
    clearRendererSession(event.sender);
    const username = requireString(payload?.username, 'Username is required.');
    const displayName = requireString(payload?.displayName, 'Display name is required.');
    const password = requireString(payload?.password, 'Password is required.');
    const user = getSecurityService().bootstrapFirstAdministrator(username, displayName, password);
    const session = getSecurityService().authenticate(username, password);
    bindRendererSession(event.sender, session);
    return { status: 'pass' as const, user, session: publicSession(session) };
  }));

  ipcMain.handle('security:login', (event, payload: LoginPayload) => safeCall(() => {
    clearRendererSession(event.sender);
    const username = requireString(payload?.username, 'Username is required.');
    const password = requireString(payload?.password, 'Password is required.');
    const session = getSecurityService().authenticate(username, password);
    bindRendererSession(event.sender, session);
    return { status: 'pass' as const, session: publicSession(session) };
  }));

  ipcMain.handle('security:logout', event => safeCall(() => {
    clearRendererSession(event.sender);
    return { status: 'pass' as const };
  }));

  ipcMain.handle('security:list-users', event => safeCall(() => {
    const session = requireRendererPermission(event.sender, 'security.users.manage');
    return { status: 'pass' as const, users: getSecurityService().listUsers(session.id) };
  }));

  ipcMain.handle('security:create-user', (event, payload: CreateUserPayload) => safeCall(() => {
    const session = requireRendererPermission(event.sender, 'security.users.manage');
    const username = requireString(payload?.username, 'Username is required.');
    const displayName = requireString(payload?.displayName, 'Display name is required.');
    const password = requireString(payload?.password, 'Password is required.');
    const roleId = requireRole(payload?.roleId);
    return { status: 'pass' as const, user: getSecurityService().createUser(session.id, username, displayName, password, roleId) };
  }));

  ipcMain.handle('security:set-user-active', (event, payload: UserActivePayload) => safeCall(() => {
    const session = requireRendererPermission(event.sender, 'security.users.manage');
    const userId = requireString(payload?.userId, 'User id is required.');
    if (typeof payload?.active !== 'boolean') throw new Error('Active state is required.');
    getSecurityService().setUserActive(session.id, userId, payload.active);
    return { status: 'pass' as const };
  }));

  ipcMain.handle('security:assign-role', (event, payload: UserRolePayload) => safeCall(() => {
    const session = requireRendererPermission(event.sender, 'security.users.manage');
    const userId = requireString(payload?.userId, 'User id is required.');
    const roleId = requireRole(payload?.roleId);
    getSecurityService().assignRole(session.id, userId, roleId);
    return { status: 'pass' as const };
  }));

  ipcMain.handle('security:list-audit', (event, limit?: number) => safeCall(() => {
    const session = requireRendererPermission(event.sender, 'security.audit.view');
    return { status: 'pass' as const, events: getSecurityService().listAudit(session.id, limit) };
  }));
}

function publicSession(session: { username: string; displayName: string; authenticatedAt: string } | null) {
  return session ? { username: session.username, displayName: session.displayName, authenticatedAt: session.authenticatedAt } : null;
}

function requireString(value: unknown, message: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value;
}

function requireRole(value: unknown): 'administrator' | 'engineer' | 'viewer' {
  if (value === 'administrator' || value === 'engineer' || value === 'viewer') return value;
  throw new Error('Role is invalid.');
}

function safeCall<T>(callback: () => T): T | { status: 'fail'; error: string } {
  try { return callback(); }
  catch (error) { return { status: 'fail', error: error instanceof Error ? error.message : 'Security operation failed.' }; }
}
