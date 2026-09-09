import type Database from 'better-sqlite3';

export type TrialRevisionDesignResult = {
  id: string;
  cementitiousKgM3: number | null;
  waterKgM3: number | null;
  wCmRatio: number | null;
  fineAggregateKgM3: number | null;
  coarseAggregateKgM3: number | null;
  airPercent: number | null;
  notes: string | null;
  source: 'current_mix_results' | 'immutable_revision_snapshot';
  snapshotId: string | null;
  snapshotRevisionNumber: number | null;
};

type SnapshotPayload = {
  schema?: string;
  mixResults?: Array<Record<string, unknown>>;
};

function nullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizeResult(row: Record<string, unknown>, source: TrialRevisionDesignResult['source'], snapshotId: string | null, snapshotRevisionNumber: number | null): TrialRevisionDesignResult {
  const id = String(row.id ?? '').trim();
  if (!id) throw new Error('Design result فاقد شناسه معتبر است.');
  return {
    id,
    cementitiousKgM3: nullableNumber(row.cementitious_content_kg_m3),
    waterKgM3: nullableNumber(row.water_content_kg_m3),
    wCmRatio: nullableNumber(row.w_cm_ratio),
    fineAggregateKgM3: nullableNumber(row.fine_aggregate_kg_m3),
    coarseAggregateKgM3: nullableNumber(row.coarse_aggregate_kg_m3),
    airPercent: nullableNumber(row.air_content_percent),
    notes: nullableString(row.notes),
    source,
    snapshotId,
    snapshotRevisionNumber
  };
}

export function resolveTrialRevisionDesignResult(
  database: Database.Database,
  mixDesignId: string,
  revisionNumber: number,
  currentRevisionNumber: number
): TrialRevisionDesignResult {
  if (!mixDesignId.trim()) throw new Error('شناسه Mix Design الزامی است.');
  if (!Number.isInteger(revisionNumber) || revisionNumber < 0) throw new Error('Revision Number نامعتبر است.');

  if (revisionNumber === currentRevisionNumber) {
    const row = database.prepare(`
      SELECT * FROM mix_results
      WHERE mix_design_id = ?
      ORDER BY rowid DESC LIMIT 1
    `).get(mixDesignId) as Record<string, unknown> | undefined;
    if (!row) throw new Error('نتیجه طراحی ذخیره‌شده برای Revision فعلی پیدا نشد.');
    return normalizeResult(row, 'current_mix_results', null, null);
  }

  const snapshot = database.prepare(`
    SELECT id, revision_number AS revisionNumber, snapshot_json AS snapshotJson
    FROM mix_design_revision_snapshots
    WHERE mix_design_id = ? AND revision_number = ?
    LIMIT 1
  `).get(mixDesignId, revisionNumber) as {
    id: string;
    revisionNumber: number;
    snapshotJson: string;
  } | undefined;
  if (!snapshot) throw new Error(`Immutable snapshot برای Revision ${revisionNumber} پیدا نشد.`);

  let payload: SnapshotPayload;
  try {
    payload = JSON.parse(snapshot.snapshotJson) as SnapshotPayload;
  } catch {
    throw new Error(`Snapshot مربوط به Revision ${revisionNumber} JSON معتبر ندارد.`);
  }
  if (payload.schema !== 'tolou.mix-design.snapshot.v1') {
    throw new Error(`Snapshot schema برای Revision ${revisionNumber} پشتیبانی نمی‌شود.`);
  }
  if (!Array.isArray(payload.mixResults) || payload.mixResults.length === 0) {
    throw new Error(`Design result داخل immutable snapshot Revision ${revisionNumber} پیدا نشد.`);
  }

  const latest = payload.mixResults[payload.mixResults.length - 1];
  if (!latest || typeof latest !== 'object') throw new Error(`Design result داخل snapshot Revision ${revisionNumber} نامعتبر است.`);
  const normalized = normalizeResult(latest, 'immutable_revision_snapshot', snapshot.id, Number(snapshot.revisionNumber));
  const rowMixDesignId = String(latest.mix_design_id ?? '').trim();
  if (rowMixDesignId && rowMixDesignId !== mixDesignId) throw new Error('Snapshot design result متعلق به Mix Design دیگری است.');
  return normalized;
}
