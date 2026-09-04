import type Database from 'better-sqlite3';
import { getDatabase } from './database';

const LOCKED_STATUSES = new Set(['approved', 'production', 'superseded', 'archived']);

export function canonicalMixDesignStatus(status: unknown) {
  const value = String(status ?? 'draft').trim().toLowerCase();
  if (value === 'trial') return 'trial_required';
  if (value === 'review' || value === 'needs_review') return 'under_review';
  return value;
}

export function assertMixDesignEngineeringEditable(database: Database.Database, mixDesignId: string) {
  if (!mixDesignId?.trim()) throw new Error('شناسه طرح اختلاط برای ویرایش مهندسی الزامی است.');
  const row = database.prepare('SELECT status, revision_number AS revisionNumber FROM mix_designs WHERE id = ?').get(mixDesignId) as { status?: string; revisionNumber?: number } | undefined;
  if (!row) throw new Error('طرح اختلاط برای ویرایش مهندسی پیدا نشد.');
  const status = canonicalMixDesignStatus(row.status);
  if (LOCKED_STATUSES.has(status)) {
    throw new Error(`Revision R${String(row.revisionNumber ?? 0).padStart(2, '0')} با وضعیت ${status} قفل است. برای تغییر مهندسی ابتدا Revision جدید ایجاد کنید.`);
  }
  return { status, revisionNumber: Number(row.revisionNumber ?? 0) };
}

export function assertMaterialEngineeringEditable(database: Database.Database, materialId: string) {
  if (!materialId?.trim()) throw new Error('شناسه مصالح برای ویرایش مهندسی الزامی است.');
  const row = database.prepare('SELECT mix_design_id AS mixDesignId FROM materials WHERE id = ?').get(materialId) as { mixDesignId?: string } | undefined;
  if (!row?.mixDesignId) throw new Error('مصالح موردنظر برای ویرایش پیدا نشد.');
  return assertMixDesignEngineeringEditable(database, row.mixDesignId);
}

export function requireEditableMixDesign(mixDesignId: string) {
  return assertMixDesignEngineeringEditable(getDatabase(), mixDesignId);
}

export function requireEditableMaterial(materialId: string) {
  return assertMaterialEngineeringEditable(getDatabase(), materialId);
}
