import { app } from 'electron';
import path from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

type ProjectIntake = {
  project: { projectName: string; city: string; locationDescription: string; structureType: string; elementType: string; clientName: string; contractorName: string; consultantName: string; };
  laboratory: { labName: string; licenseNumber: string; address: string; phone: string; logoPath?: string; };
  designer: { fullName: string; role: string; licenseOrMembershipNumber: string; phone: string; email: string; };
  mixDesign: { concreteType: string; targetStrengthMpa: number; requiredSlumpMm: number; maxAggregateSizeMm: number; exposureSummary: string; };
};

type MaterialInput = {
  mixDesignId: string;
  materialType: string;
  name: string;
  source: string;
  specificGravity: number | null;
  absorptionPercent: number | null;
  moisturePercent: number | null;
  unitWeightKgM3: number | null;
  notes: string;
};

let db: Database.Database | null = null;

export function getDatabasePath(): string {
  const dir = path.join(app.getPath('userData'), 'data');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, 'tolou-concrete-mix.sqlite');
}

export function getDatabase(): Database.Database {
  if (db) return db;
  db = new Database(getDatabasePath());
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

export function saveProjectIntake(intake: ProjectIntake) {
  validateProjectIntake(intake);
  const database = getDatabase();
  const now = new Date().toISOString();
  const projectId = crypto.randomUUID();
  const labId = crypto.randomUUID();
  const designerId = crypto.randomUUID();
  const mixDesignId = crypto.randomUUID();

  const transaction = database.transaction(() => {
    database.prepare(`INSERT INTO projects (id, project_name, city, location_description, structure_type, element_type, client_name, contractor_name, consultant_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(projectId, intake.project.projectName, intake.project.city, intake.project.locationDescription, intake.project.structureType, intake.project.elementType, intake.project.clientName, intake.project.contractorName, intake.project.consultantName, now, now);
    database.prepare(`INSERT INTO laboratories (id, lab_name, license_number, address, phone, logo_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(labId, intake.laboratory.labName, intake.laboratory.licenseNumber, intake.laboratory.address, intake.laboratory.phone, intake.laboratory.logoPath ?? '', now, now);
    database.prepare(`INSERT INTO designers (id, full_name, role, license_or_membership_number, phone, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(designerId, intake.designer.fullName, intake.designer.role, intake.designer.licenseOrMembershipNumber, intake.designer.phone, intake.designer.email, now, now);
    database.prepare(`INSERT INTO mix_designs (id, project_id, laboratory_id, designer_id, concrete_type, target_strength_mpa, required_slump_mm, max_aggregate_size_mm, exposure_summary, status, engine_version, standards_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(mixDesignId, projectId, labId, designerId, intake.mixDesign.concreteType, intake.mixDesign.targetStrengthMpa, intake.mixDesign.requiredSlumpMm, intake.mixDesign.maxAggregateSizeMm, intake.mixDesign.exposureSummary, 'draft', '0.1.0', 'ACI/ASTM/EN/ISIRI registry draft', now, now);
  });

  transaction();
  return { status: 'pass' as const, projectId, mixDesignId, databasePath: getDatabasePath() };
}

export function saveMaterial(input: MaterialInput) {
  validateMaterial(input);
  const database = getDatabase();
  const materialId = crypto.randomUUID();

  database.prepare(`
    INSERT INTO materials (
      id, mix_design_id, material_type, name, source, specific_gravity,
      absorption_percent, moisture_percent, unit_weight_kg_m3, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    materialId,
    input.mixDesignId,
    input.materialType,
    input.name,
    input.source,
    input.specificGravity,
    input.absorptionPercent,
    input.moisturePercent,
    input.unitWeightKgM3,
    input.notes
  );

  return { status: 'pass' as const, materialId };
}

export function listMaterialsByMixDesign(mixDesignId: string) {
  if (!mixDesignId.trim()) return [];
  const database = getDatabase();
  return database.prepare(`
    SELECT
      id,
      mix_design_id AS mixDesignId,
      material_type AS materialType,
      name,
      source,
      specific_gravity AS specificGravity,
      absorption_percent AS absorptionPercent,
      moisture_percent AS moisturePercent,
      unit_weight_kg_m3 AS unitWeightKgM3,
      notes
    FROM materials
    WHERE mix_design_id = ?
    ORDER BY rowid DESC
  `).all(mixDesignId);
}

export function listRecentProjects() {
  const database = getDatabase();
  return database.prepare(`SELECT projects.id, projects.project_name AS projectName, projects.city, mix_designs.id AS mixDesignId, mix_designs.concrete_type AS concreteType, mix_designs.target_strength_mpa AS targetStrengthMpa, mix_designs.status, mix_designs.created_at AS createdAt FROM projects INNER JOIN mix_designs ON mix_designs.project_id = projects.id ORDER BY mix_designs.created_at DESC LIMIT 20`).all();
}

function runMigrations(database: Database.Database) {
  database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);`);
  const migrationId = '001_initial_schema';
  const applied = database.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(migrationId);
  if (applied) return;
  const migrationPath = path.join(process.cwd(), 'database/migrations/001_initial_schema.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  database.exec(sql);
  database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(migrationId, new Date().toISOString());
}

function validateProjectIntake(intake: ProjectIntake) {
  if (!intake.project.projectName.trim()) throw new Error('نام پروژه الزامی است.');
  if (!intake.laboratory.labName.trim()) throw new Error('نام آزمایشگاه الزامی است.');
  if (!intake.designer.fullName.trim()) throw new Error('نام طراح طرح اختلاط الزامی است.');
  if (!Number.isFinite(intake.mixDesign.targetStrengthMpa) || intake.mixDesign.targetStrengthMpa <= 0) throw new Error('مقاومت هدف باید عدد مثبت باشد.');
}

function validateMaterial(input: MaterialInput) {
  if (!input.mixDesignId.trim()) throw new Error('برای ثبت مصالح، ابتدا باید یک طرح اختلاط ذخیره شود.');
  if (!input.name.trim()) throw new Error('نام مصالح الزامی است.');
  if (!input.materialType.trim()) throw new Error('نوع مصالح الزامی است.');
}
