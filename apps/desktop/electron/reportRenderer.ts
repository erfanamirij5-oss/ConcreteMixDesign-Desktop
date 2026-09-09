import type { ReportSnapshot } from './reportCenterStore';

export function renderReportHtml(snapshot: ReportSnapshot): string {
  const fa = snapshot.language === 'fa';
  const i = snapshot.identity;
  const body = reportBody(snapshot, fa);
  const standards = snapshot.standards.map(escapeHtml).join(' • ') || '-';
  return `<!doctype html><html dir="${fa ? 'rtl' : 'ltr'}" lang="${fa ? 'fa' : 'en'}"><head><meta charset="utf-8"><style>
@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,'Segoe UI',sans-serif;color:#1f2937;font-size:10pt;line-height:1.45;margin:0}.header{border-bottom:2px solid #374151;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;gap:20px}.brand{font-size:17pt;font-weight:700}.muted{color:#6b7280}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 20px;margin:12px 0}.section{margin:15px 0;break-inside:avoid}.section h2{font-size:11.5pt;margin:0 0 7px;border-bottom:1px solid #d1d5db;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:8.8pt}th,td{border:1px solid #d1d5db;padding:5px 6px;text-align:${fa ? 'right' : 'left'}}th{background:#f3f4f6}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:28px}.sig{border-top:1px solid #9ca3af;padding-top:7px;text-align:center}.footer{margin-top:20px;border-top:1px solid #d1d5db;padding-top:7px;font-size:8.2pt;color:#6b7280}.mono{font-family:Consolas,monospace}.warning{border:1px solid #d1d5db;padding:7px;margin:5px 0}
</style></head><body>
<div class="header"><div><div class="brand">${escapeHtml(text(i.laboratoryName) || (fa ? 'طلوع بتن' : 'Tolou Concrete'))}</div><div class="muted">${escapeHtml(text(i.laboratoryLicenseNumber))}</div></div><div><strong>${escapeHtml(reportTitle(snapshot.reportType, fa))}</strong><br><span class="muted">${fa ? 'تاریخ صدور' : 'Generated'}: ${escapeHtml(new Date(snapshot.generatedAt).toLocaleString(fa ? 'fa-IR' : 'en-US'))}</span></div></div>
${identitySection(snapshot, fa)}
<div class="section"><h2>${fa ? 'استاندارد و قابلیت ردیابی' : 'Standards & traceability'}</h2><div>${standards}</div><div class="muted">Engine: ${escapeHtml(text(i.engineVersion))} | Standards: ${escapeHtml(text(i.standardsVersion))}</div></div>
${body}
${signatureSection(snapshot, fa)}
<div class="footer"><span class="mono">${escapeHtml(text(i.mixDesignId))} / R${escapeHtml(text(i.revisionNumber))}</span> — ${fa ? 'این گزارش از Snapshot غیرقابل‌تغییر داده‌های ثبت‌شده تولید شده است.' : 'Generated from an immutable persisted report snapshot.'}</div>
</body></html>`;
}

function reportBody(s: ReportSnapshot, fa: boolean) {
  switch (s.reportType) {
    case 'mix_design': return mixResultSection(s, fa) + materialsSection(s, fa) + trialSection(s, fa) + traceabilitySection(s, fa);
    case 'engineering_calculation': return mixResultSection(s, fa) + traceabilitySection(s, fa);
    case 'material_summary': return materialsSection(s, fa);
    case 'durability_compliance': return durabilitySection(s, fa) + traceabilitySection(s, fa);
    case 'gradation_blend': return gradationSection(s, fa) + blendSection(s, fa);
    case 'revision_identity': return revisionSection(s, fa);
    case 'production_sheet': return productionSheetSection(s, fa) + productionQcSection(s, fa);
  }
}

function identitySection(s: ReportSnapshot, fa: boolean) {
  const i = s.identity;
  return `<div class="meta"><div><b>${fa ? 'پروژه' : 'Project'}:</b> ${esc(i.projectName)}</div><div><b>Revision:</b> R${esc(i.revisionNumber)}</div><div><b>${fa ? 'نوع بتن' : 'Concrete'}:</b> ${esc(i.concreteType)}</div><div><b>${fa ? 'وضعیت' : 'Status'}:</b> ${esc(i.status)}</div><div><b>${fa ? 'مقاومت هدف' : 'Target strength'}:</b> ${esc(i.targetStrengthMpa)} MPa</div><div><b>${fa ? 'اسلامپ' : 'Slump'}:</b> ${esc(i.requiredSlumpMm)} mm</div></div>`;
}

function mixResultSection(s: ReportSnapshot, fa: boolean) {
  const c = s.calculation ?? {};
  return `<div class="section"><h2>${fa ? 'نتیجه طرح اختلاط' : 'Mix proportions'}</h2><table><tbody><tr><th>Cementitious</th><td>${esc(c.cementitious_content_kg_m3)} kg/m³</td><th>Water</th><td>${esc(c.water_content_kg_m3)} kg/m³</td></tr><tr><th>w/cm</th><td>${esc(c.w_cm_ratio)}</td><th>Air</th><td>${esc(c.air_content_percent)} %</td></tr><tr><th>Fine Aggregate</th><td>${esc(c.fine_aggregate_kg_m3)} kg/m³</td><th>Coarse Aggregate</th><td>${esc(c.coarse_aggregate_kg_m3)} kg/m³</td></tr></tbody></table></div>`;
}

function productionSheetSection(s: ReportSnapshot, fa: boolean) {
  const c = s.calculation ?? {};
  const engineering = isRecord(c.traceability) && isRecord(c.traceability.engineeringOutput) ? c.traceability.engineeringOutput : {};
  const mix = isRecord(engineering.mix_proportions) ? engineering.mix_proportions : {};
  const aggregateRows = asRecords(engineering.aggregate_analysis);
  const recorded = (value: unknown, unit = '') => `${escRecorded(value, fa)}${hasRecordedValue(value) && unit ? ` ${unit}` : ''}`;
  const aggregates = aggregateRows.map(row => `<tr><td>${escRecorded(row.material_name ?? row.material_id, fa)}</td><td>${recorded(row.ssd_mass_kg_m3, 'kg/m³')}</td><td>${recorded(row.moisture_percent, '%')}</td><td>${recorded(row.absorption_percent, '%')}</td><td>${recorded(row.batch_mass_kg_m3, 'kg/m³')}</td><td>${recorded(row.water_adjustment_kg_m3, 'kg/m³')}</td></tr>`).join('');
  return `<div class="section"><h2>${fa ? 'مقادیر مبنای تولید ثبت‌شده' : 'Persisted production basis'}</h2><table><tbody><tr><th>Cementitious</th><td>${recorded(c.cementitious_content_kg_m3, 'kg/m³')}</td><th>Design Water</th><td>${recorded(c.water_content_kg_m3, 'kg/m³')}</td></tr><tr><th>Fine Aggregate SSD</th><td>${recorded(c.fine_aggregate_kg_m3, 'kg/m³')}</td><th>Coarse Aggregate SSD</th><td>${recorded(c.coarse_aggregate_kg_m3, 'kg/m³')}</td></tr><tr><th>Aggregate Batch Total</th><td>${recorded(mix.aggregate_batch_kg_m3, 'kg/m³')}</td><th>Water Adjustment</th><td>${recorded(mix.batch_water_adjustment_kg_m3, 'kg/m³')}</td></tr><tr><th>Water to Add</th><td>${recorded(mix.water_to_add_kg_m3, 'kg/m³')}</td><th>w/cm</th><td>${recorded(c.w_cm_ratio)}</td></tr></tbody></table></div>
  <div class="section"><h2>${fa ? 'اصلاح رطوبت سنگدانه — فقط داده ثبت‌شده' : 'Aggregate moisture correction — persisted values only'}</h2><table><thead><tr><th>${fa ? 'سنگدانه' : 'Aggregate'}</th><th>SSD</th><th>Moisture</th><th>Absorption</th><th>Batch</th><th>ΔWater</th></tr></thead><tbody>${aggregates || emptyRecordedRow(6, fa)}</tbody></table><div class="muted">${fa ? 'هیچ مقدار اصلاح رطوبت یا آب در این برگه از روی داده‌های دیگر تخمین زده نمی‌شود؛ مقدار ثبت‌نشده صریحاً «ثبت نشده» نمایش داده می‌شود.' : 'No moisture or water adjustment is inferred in this sheet. Missing persisted values are explicitly shown as Not recorded.'}</div></div>`;
}

function productionQcSection(s: ReportSnapshot, fa: boolean) {
  const q = s.productionQc;
  const batchRows = q.batches.map(row => `<tr><td>${esc(row.batchCode)}</td><td>R${esc(row.revisionNumber)}</td><td>${esc(row.producedAt)}</td><td>${esc(row.batchQuantityM3)}</td><td>${esc(row.slumpMm)}</td><td>${esc(row.airContentPercent)}</td><td>${esc(row.concreteTemperatureC)}</td><td>${esc(row.freshDensityKgM3)}</td></tr>`).join('');
  const strengthRows = q.strengthResults.map(row => `<tr><td>${esc(row.specimenId)}</td><td>${esc(row.testAgeDays)}</td><td>${esc(row.maximumLoadKn)}</td><td>${esc(row.loadedAreaMm2)}</td><td>${esc(row.strengthMpa)}</td><td>${esc(row.calculationMethod)}</td></tr>`).join('');
  const st = q.overallStrength;
  return `<div class="section"><h2>${fa ? 'داده‌های واقعی Production / QC' : 'Actual Production / QC evidence'}</h2><table><thead><tr><th>Batch</th><th>Revision</th><th>${fa ? 'زمان تولید' : 'Produced'}</th><th>m³</th><th>Slump</th><th>Air %</th><th>Temp °C</th><th>Density kg/m³</th></tr></thead><tbody>${batchRows || emptyRow(8)}</tbody></table></div>
  <div class="section"><h2>${fa ? 'نتایج مقاومت فشاری ثبت‌شده' : 'Persisted compressive strength results'}</h2><table><thead><tr><th>Specimen ID</th><th>Age d</th><th>Load kN</th><th>Area mm²</th><th>Strength MPa</th><th>Method</th></tr></thead><tbody>${strengthRows || emptyRow(6)}</tbody></table></div>
  <div class="section"><h2>${fa ? 'آمار توصیفی مقاومت' : 'Descriptive strength statistics'}</h2><table><tbody><tr><th>n</th><td>${esc(st.count)}</td><th>Mean</th><td>${esc(st.mean)} MPa</td></tr><tr><th>Min</th><td>${esc(st.min)} MPa</td><th>Max</th><td>${esc(st.max)} MPa</td></tr><tr><th>Sample SD</th><td>${esc(st.sampleStandardDeviation)} MPa</td><th>Sample CV</th><td>${esc(st.sampleCoefficientOfVariationPercent)} %</td></tr></tbody></table><div class="muted">${fa ? 'Acceptance criteria: اعمال نشده · Pass/Fail: اعمال نشده · Standard compliance: استنتاج نشده' : 'Acceptance criteria: not applied · Pass/Fail: not applied · Standard compliance: not inferred'}</div><div class="muted">${esc(q.method.version)}</div></div>`;
}

function materialsSection(s: ReportSnapshot, fa: boolean) {
  const rows = s.materials.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.material_type)}</td><td>${esc(r.source)}</td><td>${esc(r.specific_gravity)}</td><td>${esc(r.absorption_percent)}</td><td>${esc(r.moisture_percent)}</td></tr>`).join('');
  return `<div class="section"><h2>${fa ? 'خلاصه مصالح' : 'Material summary'}</h2><table><thead><tr><th>${fa ? 'نام' : 'Name'}</th><th>${fa ? 'نوع' : 'Type'}</th><th>${fa ? 'منبع' : 'Source'}</th><th>SG</th><th>Abs %</th><th>Moist %</th></tr></thead><tbody>${rows || emptyRow(6)}</tbody></table></div>`;
}

function durabilitySection(s: ReportSnapshot, fa: boolean) {
  const d = s.durability ?? {};
  const rows = Object.entries(d).map(([k,v]) => `<tr><th>${escapeHtml(k)}</th><td>${esc(v)}</td></tr>`).join('');
  return `<div class="section"><h2>${fa ? 'انطباق دوام' : 'Durability compliance'}</h2><table><tbody>${rows || emptyRow(2)}</tbody></table></div>`;
}

function gradationSection(s: ReportSnapshot, fa: boolean) {
  const rows = s.gradation.map(r => `<tr><td>${esc(r.material_name)}</td><td>${esc(r.sieve_size_mm)}</td><td>${esc(r.percent_passing)}</td></tr>`).join('');
  return `<div class="section"><h2>${fa ? 'دانه‌بندی سنگدانه' : 'Aggregate gradation'}</h2><table><thead><tr><th>${fa ? 'مصالح' : 'Material'}</th><th>Sieve mm</th><th>Passing %</th></tr></thead><tbody>${rows || emptyRow(3)}</tbody></table></div>`;
}

function blendSection(s: ReportSnapshot, fa: boolean) {
  const shares = asRecords((s.blend as Record<string, unknown>).shares).map(r => `<tr><td>${esc(r.material_name)}</td><td>${esc(r.share_percent)}</td></tr>`).join('');
  const limits = asRecords((s.blend as Record<string, unknown>).combinedLimits).map(r => `<tr><td>${esc(r.sieve_size_mm)}</td><td>${esc(r.min_percent_passing)}</td><td>${esc(r.max_percent_passing)}</td></tr>`).join('');
  return `<div class="section"><h2>${fa ? 'ترکیب سنگدانه' : 'Aggregate blend'}</h2><table><thead><tr><th>${fa ? 'مصالح' : 'Material'}</th><th>Share %</th></tr></thead><tbody>${shares || emptyRow(2)}</tbody></table></div><div class="section"><h2>${fa ? 'حدود دانه‌بندی ترکیبی' : 'Combined gradation limits'}</h2><table><thead><tr><th>Sieve mm</th><th>Min %</th><th>Max %</th></tr></thead><tbody>${limits || emptyRow(3)}</tbody></table></div>`;
}

function trialSection(s: ReportSnapshot, fa: boolean) {
  const rows = s.trialMix.map(r => `<tr><td>${esc(r.trial_date)}</td><td>${esc(r.batch_quantity_m3)}</td><td>${esc(r.actual_slump_mm)}</td><td>${esc(r.air_content_percent)}</td><td>${esc(r.fresh_density_kg_m3)}</td><td>${esc(r.strength_7d_mpa)}</td><td>${esc(r.strength_28d_mpa)}</td></tr>`).join('');
  return `<div class="section"><h2>Trial Mix</h2><table><thead><tr><th>${fa ? 'تاریخ' : 'Date'}</th><th>Batch m³</th><th>Slump mm</th><th>Air %</th><th>Density</th><th>7d MPa</th><th>28d MPa</th></tr></thead><tbody>${rows || emptyRow(7)}</tbody></table></div>`;
}

function revisionSection(s: ReportSnapshot, fa: boolean) {
  const i = s.identity;
  const fields = ['mixDesignId','revisionNumber','status','createdAt','updatedAt','projectName','clientName','contractorName','consultantName','designerFullName','designerRole','designStandard','engineVersion','standardsVersion'];
  return `<div class="section"><h2>${fa ? 'هویت و کنترل نسخه' : 'Revision identity & control'}</h2><table><tbody>${fields.map(k => `<tr><th>${escapeHtml(k)}</th><td>${esc(i[k])}</td></tr>`).join('')}</tbody></table></div>`;
}

function traceabilitySection(s: ReportSnapshot, fa: boolean) {
  const c = s.calculation ?? {};
  const trace = isRecord(c.traceability) ? c.traceability : {};
  const refs = asStrings(trace.standardReferences);
  const assumptions = asStrings(trace.assumptions);
  const limitations = asStrings(trace.limitations);
  const warnings = Array.isArray(trace.warnings) ? trace.warnings : [];
  return `<div class="section"><h2>${fa ? 'ردیابی محاسبات مهندسی' : 'Engineering traceability'}</h2><table><tbody><tr><th>${fa ? 'روش' : 'Method'}</th><td>${esc(trace.calculationMethod)}</td></tr><tr><th>${fa ? 'مراجع' : 'References'}</th><td>${escapeHtml(refs.join(' • ') || '-')}</td></tr><tr><th>${fa ? 'فرضیات' : 'Assumptions'}</th><td>${escapeHtml(assumptions.join(' • ') || '-')}</td></tr><tr><th>${fa ? 'محدودیت‌ها' : 'Limitations'}</th><td>${escapeHtml(limitations.join(' • ') || '-')}</td></tr><tr><th>${fa ? 'هشدارها' : 'Warnings'}</th><td>${escapeHtml(warnings.map(w => isRecord(w) ? text(w.message) : text(w)).join(' • ') || '-')}</td></tr></tbody></table></div>`;
}

function signatureSection(s: ReportSnapshot, fa: boolean) {
  return `<div class="signatures"><div class="sig">${fa ? 'تهیه‌کننده' : 'Prepared by'}<br>${esc(s.signatures.preparedBy)}</div><div class="sig">${fa ? 'بازبین' : 'Reviewed by'}<br>${esc(s.signatures.reviewedBy)}</div><div class="sig">${fa ? 'تأییدکننده' : 'Approved by'}<br>${esc(s.signatures.approvedBy)}</div></div>`;
}

function reportTitle(type: ReportSnapshot['reportType'], fa: boolean) {
  const titles: Record<ReportSnapshot['reportType'], [string,string]> = {
    mix_design:['گزارش طرح اختلاط بتن','Concrete Mix Design Report'], engineering_calculation:['گزارش محاسبات مهندسی','Engineering Calculation Report'], material_summary:['خلاصه مصالح','Material Summary'], durability_compliance:['گزارش انطباق دوام','Durability Compliance Report'], gradation_blend:['گزارش دانه‌بندی و ترکیب سنگدانه','Gradation & Blend Report'], revision_identity:['گزارش هویت Revision','Revision Identity Report'], production_sheet:['برگه تولید بتن','Concrete Production Sheet']
  }; return titles[type][fa ? 0 : 1];
}
function emptyRow(cols: number) { return `<tr><td colspan="${cols}">-</td></tr>`; }
function emptyRecordedRow(cols: number, fa: boolean) { return `<tr><td colspan="${cols}">${fa ? 'ثبت نشده' : 'Not recorded'}</td></tr>`; }
function hasRecordedValue(value: unknown) { return value !== null && value !== undefined && value !== ''; }
function escRecorded(value: unknown, fa: boolean) { return hasRecordedValue(value) ? esc(value) : escapeHtml(fa ? 'ثبت نشده' : 'Not recorded'); }
function asRecords(value: unknown) { return Array.isArray(value) ? value.filter(isRecord) : []; }
function asStrings(value: unknown) { return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : []; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function text(value: unknown) { return value === null || value === undefined || value === '' ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value); }
function esc(value: unknown) { return escapeHtml(text(value)); }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch] ?? ch)); }
