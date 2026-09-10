import type Database from 'better-sqlite3';

export type ChlorideProvenanceInput = {
  chlorideTestMethod?: string | null;
  chlorideTestEdition?: string | null;
  chlorideEvidenceRef?: string | null;
};

export type ChlorideProvenanceRecord = {
  chlorideTestMethod: string | null;
  chlorideTestEdition: string | null;
  chlorideEvidenceRef: string | null;
};

export function saveMaterialChlorideProvenance(
  database: Database.Database,
  materialId: string,
  input: ChlorideProvenanceInput
): ChlorideProvenanceRecord {
  if (!materialId.trim()) throw new Error('شناسه ماده برای ثبت منشأ کلراید الزامی است.');
  const exists = database.prepare('SELECT 1 FROM materials WHERE id = ?').get(materialId);
  if (!exists) throw new Error('ماده برای ثبت منشأ کلراید پیدا نشد.');

  const method = normalize(input.chlorideTestMethod);
  const edition = normalize(input.chlorideTestEdition);
  const evidenceRef = normalize(input.chlorideEvidenceRef);

  database.prepare(`
    UPDATE materials
    SET chloride_test_method = ?, chloride_test_edition = ?, chloride_evidence_ref = ?
    WHERE id = ?
  `).run(method, edition, evidenceRef, materialId);

  return {
    chlorideTestMethod: method,
    chlorideTestEdition: edition,
    chlorideEvidenceRef: evidenceRef
  };
}

export function getMaterialChlorideProvenance(
  database: Database.Database,
  materialId: string
): ChlorideProvenanceRecord {
  if (!materialId.trim()) throw new Error('شناسه ماده برای خواندن منشأ کلراید الزامی است.');
  const row = database.prepare(`
    SELECT
      chloride_test_method AS chlorideTestMethod,
      chloride_test_edition AS chlorideTestEdition,
      chloride_evidence_ref AS chlorideEvidenceRef
    FROM materials
    WHERE id = ?
  `).get(materialId) as ChlorideProvenanceRecord | undefined;
  if (!row) throw new Error('ماده برای خواندن منشأ کلراید پیدا نشد.');
  return row;
}

function normalize(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = value.trim();
  return normalized || null;
}
