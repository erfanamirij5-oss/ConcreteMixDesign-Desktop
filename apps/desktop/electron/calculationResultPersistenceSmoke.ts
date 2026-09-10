import Database from 'better-sqlite3';
import { persistCalculatedMixResult } from './calculationResultStore';
import { LEGACY_V11_PROFILE } from './standardProfileEngineDispatch';

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE mix_designs (id TEXT PRIMARY KEY);
  CREATE TABLE mix_results (
    id TEXT PRIMARY KEY,
    mix_design_id TEXT NOT NULL,
    cementitious_content_kg_m3 REAL,
    water_content_kg_m3 REAL,
    w_cm_ratio REAL,
    fine_aggregate_kg_m3 REAL,
    coarse_aggregate_kg_m3 REAL,
    admixtures_json TEXT,
    air_content_percent REAL,
    density_kg_m3 REAL,
    notes TEXT,
    FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id)
  );
`);
database.prepare('INSERT INTO mix_designs (id) VALUES (?)').run('mix-1');

const first = persistCalculatedMixResult(database, 'mix-1', {
  status: 'pass',
  calculation_method: 'ACI PRC-211.1-22',
  standard_profile: {
    profile_id: LEGACY_V11_PROFILE.profileId,
    profile_version: LEGACY_V11_PROFILE.profileVersion,
    display_name: LEGACY_V11_PROFILE.displayName,
    selection_source: 'v1.1_legacy_compatibility_mapping'
  },
  mix_proportions: {
    cementitious_kg_m3: 400,
    water_kg_m3: 180,
    w_cm_ratio: 0.45,
    fine_aggregate_kg_m3: 720,
    coarse_aggregate_kg_m3: 1020,
    air_content_percent: 2
  },
  engineering_notes: ['Moisture corrections are included in batch water.'],
  aggregate_blend_optimizer: { status: 'pass', selected_shares: [{ material_id: 'sand-1', share_percent: 42 }] },
  durability: {
    exposure_classes: { sulfate: 'S1', corrosion: 'C1' },
    sulfate_evidence: {
      soil: {
        value: 0.15,
        unit: 'percent_by_mass',
        test_method: 'ASTM C1580',
        test_edition: '20',
        evidence_ref: 'LAB-SOIL-001'
      },
      water: null,
      seawater_exposure: false
    }
  },
  chloride_compliance: {
    status: 'pass',
    source_breakdown: [
      {
        source_category: 'binder',
        material_id: 'cement-1',
        chloride_percent: 0.01,
        chloride_kg_m3: 0.04,
        chloride_provenance: {
          test_method: 'ASTM C1218/C1218M',
          test_edition: '20',
          evidence_ref: 'LAB-CL-001'
        }
      }
    ]
  },
  cementitious_compliance: { status: 'pass', standard: 'ASTM C150' },
  standard_references: ['ACI PRC-211.1-22'],
  assumptions: ['SSD basis'],
  warnings: [{ code: 'TRACE', message: 'engineering traceability preserved' }],
  limitations: ['Trial validation pending']
});

if (!first || first.wCmRatio !== 0.45 || first.cementitiousContentKgM3 !== 400) throw new Error('Calculated mix result was not persisted correctly.');
const firstTrace = first.traceability as {
  calculationMethod?: string;
  engineeringNotes?: string[];
  standardReferences?: string[];
  standardProfile?: { profile_id?: string; profile_version?: string } | null;
  standardProfileState?: string;
  limitations?: string[];
  engineeringOutput?: Record<string, unknown>;
};
if (firstTrace.calculationMethod !== 'ACI PRC-211.1-22') throw new Error('Calculation method traceability was not persisted.');
if (!firstTrace.engineeringNotes?.includes('Moisture corrections are included in batch water.')) throw new Error('Engineering notes were not persisted.');
if (!firstTrace.standardReferences?.includes('ACI PRC-211.1-22')) throw new Error('Standard references were not persisted.');
if (!firstTrace.limitations?.includes('Trial validation pending')) throw new Error('Calculation limitations were not persisted.');
if (firstTrace.standardProfileState !== 'versioned') throw new Error('Versioned standard profile state was not persisted.');
if (firstTrace.standardProfile?.profile_id !== LEGACY_V11_PROFILE.profileId || firstTrace.standardProfile?.profile_version !== LEGACY_V11_PROFILE.profileVersion) {
  throw new Error('Standard profile identity/version was not persisted with calculation evidence.');
}
const output = firstTrace.engineeringOutput as {
  aggregate_blend_optimizer?: { status?: string };
  durability?: {
    exposure_classes?: { sulfate?: string };
    sulfate_evidence?: {
      soil?: { test_method?: string; test_edition?: string; evidence_ref?: string } | null;
    };
  };
  chloride_compliance?: {
    source_breakdown?: Array<{
      chloride_provenance?: { test_method?: string; test_edition?: string; evidence_ref?: string };
    }>;
  };
  cementitious_compliance?: { standard?: string };
} | undefined;
if (output?.aggregate_blend_optimizer?.status !== 'pass') throw new Error('Full Blend engineering output was not persisted for reopen.');
if (output?.durability?.exposure_classes?.sulfate !== 'S1') throw new Error('Full durability output was not persisted for reopen.');
if (output?.durability?.sulfate_evidence?.soil?.test_method !== 'ASTM C1580') throw new Error('Sulfate test method provenance was not persisted.');
if (output?.durability?.sulfate_evidence?.soil?.test_edition !== '20') throw new Error('Sulfate test edition provenance was not persisted.');
if (output?.durability?.sulfate_evidence?.soil?.evidence_ref !== 'LAB-SOIL-001') throw new Error('Sulfate evidence reference was not persisted.');
const chlorideProvenance = output?.chloride_compliance?.source_breakdown?.[0]?.chloride_provenance;
if (chlorideProvenance?.test_method !== 'ASTM C1218/C1218M') throw new Error('Chloride test method provenance was not persisted.');
if (chlorideProvenance?.test_edition !== '20') throw new Error('Chloride test edition provenance was not persisted.');
if (chlorideProvenance?.evidence_ref !== 'LAB-CL-001') throw new Error('Chloride evidence reference was not persisted.');
if (output?.cementitious_compliance?.standard !== 'ASTM C150') throw new Error('Full compliance output was not persisted for reopen.');

const second = persistCalculatedMixResult(database, 'mix-1', {
  status: 'pass',
  calculation_method: 'ACI PRC-211.1-22',
  mix_proportions: { cementitious_kg_m3: 420, water_kg_m3: 180, w_cm_ratio: 0.429 }
});
const count = database.prepare('SELECT COUNT(*) AS count FROM mix_results WHERE mix_design_id = ?').get('mix-1') as { count: number };
if (count.count !== 1) throw new Error('Current revision must keep exactly one current calculation result row.');
if (!second || second.cementitiousContentKgM3 !== 420 || second.wCmRatio !== 0.429) throw new Error('Recalculation did not replace the current revision result atomically.');
const legacyTrace = second.traceability as { standardProfile?: unknown; standardProfileState?: string };
if (legacyTrace.standardProfile !== null || legacyTrace.standardProfileState !== 'legacy_unversioned') {
  throw new Error('Unversioned historical calculation evidence must be explicitly classified as legacy_unversioned without silent profile assignment.');
}

let rejected = false;
try { persistCalculatedMixResult(database, 'mix-1', { status: 'fail', mix_proportions: { w_cm_ratio: 0.5 } }); }
catch { rejected = true; }
if (!rejected) throw new Error('Failed engine results must never be persisted as valid mix results.');

const afterReject = database.prepare('SELECT cementitious_content_kg_m3 AS cementitious FROM mix_results WHERE mix_design_id = ?').get('mix-1') as { cementitious: number };
if (afterReject.cementitious !== 420) throw new Error('Rejected engine result modified the last valid persisted calculation.');

database.close();
console.log('Calculation result persistence smoke validation passed with versioned standard-profile plus sulfate and chloride evidence provenance.');
