import { getDatabase } from './database';

export type ManagementSummary = {
  totalDesigns: number;
  draft: number;
  review: number;
  trial: number;
  approved: number;
  production: number;
  archived: number;
};

export type ManagementActivity = {
  action: string;
  mixDesignId: string;
  projectName: string;
  actorName: string | null;
  createdAt: string;
};

export function getManagementSummary(): ManagementSummary {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM mix_designs
    GROUP BY status
  `).all() as Array<{ status: string; count: number }>;

  const summary: ManagementSummary = {
    totalDesigns: 0,
    draft: 0,
    review: 0,
    trial: 0,
    approved: 0,
    production: 0,
    archived: 0
  };

  for (const row of rows) {
    const count = Number(row.count ?? 0);
    summary.totalDesigns += count;
    const status = (row.status || '').toLowerCase();
    if (status === 'draft') summary.draft += count;
    if (status === 'review' || status === 'needs_review' || status === 'under_review') summary.review += count;
    if (status === 'trial' || status === 'trial_required' || status === 'trial_completed') summary.trial += count;
    if (status === 'approved') summary.approved += count;
    if (status === 'production') summary.production += count;
    if (status === 'archived') summary.archived += count;
  }

  return summary;
}

export function getRecentManagementActivity(limit = 20): ManagementActivity[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      a.action,
      a.mix_design_id as mixDesignId,
      COALESCE(p.project_name, '-') as projectName,
      a.actor_name as actorName,
      a.created_at as createdAt
    FROM mix_design_audit_log a
    LEFT JOIN mix_designs m ON m.id = a.mix_design_id
    LEFT JOIN projects p ON p.id = m.project_id
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(limit) as ManagementActivity[];
}
