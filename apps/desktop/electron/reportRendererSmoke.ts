import assert from 'node:assert/strict';
import { renderReportHtml } from './reportRenderer';
import type { ReportSnapshot, ReportType } from './reportCenterStore';

const types: ReportType[] = ['mix_design','engineering_calculation','material_summary','durability_compliance','gradation_blend','revision_identity','production_sheet'];
const expected: Record<ReportType, string> = {
  mix_design: 'Concrete Mix Design Report',
  engineering_calculation: 'Engineering Calculation Report',
  material_summary: 'Material Summary',
  durability_compliance: 'Durability Compliance Report',
  gradation_blend: 'Gradation & Blend Report',
  revision_identity: 'Revision Identity Report',
  production_sheet: 'Concrete Production Sheet'
};

for (const reportType of types) {
  const snapshot: ReportSnapshot = {
    schemaVersion: 1,
    reportType,
    language: 'en',
    generatedAt: '2026-09-04T12:00:00.000Z',
    identity: { mixDesignId: 'mix-1', revisionNumber: 2, projectName: 'Reference Project', status: 'approved', targetStrengthMpa: 35, requiredSlumpMm: 100, designStandard: 'ACI 211.1', engineVersion: '0.3.0', standardsVersion: '2025' },
    materials: [{ name: 'Cement A', material_type: 'cement', source: 'Plant', specific_gravity: 3.15, absorption_percent: 0, moisture_percent: 0 }],
    gradation: [{ material_name: 'Fine Aggregate', sieve_size_mm: 4.75, percent_passing: 96 }],
    durability: { exposure_class: 'C1', max_w_cm: 0.45 },
    blend: { shares: [{ material_name: 'Fine Aggregate', share_percent: 42 }], combinedLimits: [{ sieve_size_mm: 4.75, min_percent_passing: 35, max_percent_passing: 55 }] },
    calculation: { cementitious_content_kg_m3: 400, water_content_kg_m3: 180, w_cm_ratio: 0.45, traceability: { calculationMethod: 'Absolute volume', standardReferences: ['ACI 211.1'], assumptions: ['SSD basis'], limitations: ['Normal-weight concrete only'], warnings: [] } },
    trialMix: [{ trial_date: '2026-09-04', batch_quantity_m3: 0.05, actual_slump_mm: 95, air_content_percent: 2, fresh_density_kg_m3: 2380, strength_7d_mpa: 28, strength_28d_mpa: 40 }],
    standards: ['ACI 211.1'],
    signatures: { preparedBy: 'Engineer', reviewedBy: null, approvedBy: null }
  };
  const html = renderReportHtml(snapshot);
  assert.ok(html.includes(escapeHtml(expected[reportType])), `${reportType} title must be present in escaped HTML output.`);
  assert.match(html, /Reference Project/);
  assert.match(html, /R2/);
  assert.match(html, /immutable persisted report snapshot/);
  assert.doesNotMatch(html, /text-align:(?:left|right)th\{/);
  if (reportType === 'material_summary') assert.match(html, /Cement A/);
  if (reportType === 'durability_compliance') assert.match(html, /max_w_cm/);
  if (reportType === 'gradation_blend') assert.match(html, /Fine Aggregate/);
  if (reportType === 'engineering_calculation') assert.match(html, /Absolute volume/);
  if (reportType === 'production_sheet') {
    assert.match(html, /Persisted production basis/);
    assert.match(html, /Aggregate moisture correction — persisted values only/);
    assert.match(html, /Not recorded/);
    assert.match(html, /No moisture or water adjustment is inferred/);
    assert.doesNotMatch(html, /Trial Mix/);
  }
}

console.log('Report Center renderer contract smoke passed for all seven report types.');

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] ?? ch));
}
