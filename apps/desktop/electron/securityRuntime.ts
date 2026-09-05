import type { WebContents } from 'electron';
import type Database from 'better-sqlite3';
import { SecurityService, type SecuritySession } from './securityService';
import type { SecurityPermission } from './securityMigration';
import { requireProductAccess } from './productAccessRuntime';

let securityService: SecurityService | null = null;
const rendererSessions = new Map<number, string>();
const boundRenderers = new Set<number>();

export function initializeSecurityRuntime(database: Database.Database) {
  if (!securityService) securityService = new SecurityService(database);
  return securityService;
}

export function getSecurityService() {
  if (!securityService) throw new Error('Security runtime has not been initialized.');
  return securityService;
}

export function bindRendererSession(sender: WebContents, session: SecuritySession) {
  rendererSessions.set(sender.id, session.id);
  if (boundRenderers.has(sender.id)) return;
  boundRenderers.add(sender.id);
  sender.once('destroyed', () => {
    const sessionId = rendererSessions.get(sender.id);
    if (sessionId) getSecurityService().logout(sessionId);
    rendererSessions.delete(sender.id);
    boundRenderers.delete(sender.id);
  });
}

export function clearRendererSession(sender: WebContents) {
  const sessionId = rendererSessions.get(sender.id);
  if (sessionId) getSecurityService().logout(sessionId);
  rendererSessions.delete(sender.id);
}

export function requireRendererPermission(sender: WebContents, permission: SecurityPermission) {
  const sessionId = rendererSessions.get(sender.id);
  if (!sessionId) throw new Error('Authentication required.');
  const session = getSecurityService().requirePermission(sessionId, permission);
  const feature = featureForPermission(permission);
  if (feature) requireProductAccess(feature);
  return session;
}

export function getRendererSession(sender: WebContents): SecuritySession | null {
  const sessionId = rendererSessions.get(sender.id);
  if (!sessionId) return null;
  try {
    return getSecurityService().requirePermission(sessionId, 'engineering.read');
  } catch {
    rendererSessions.delete(sender.id);
    return null;
  }
}

function featureForPermission(permission: SecurityPermission): string | null {
  if (permission === 'engineering.report.generate') return 'reports';
  if (permission === 'engineering.trial.manage') return 'trial-mix';
  return permission.startsWith('engineering.') ? 'engineering' : null;
}
