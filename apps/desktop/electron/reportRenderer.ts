import type { ReportSnapshot } from './reportCenterStore';

export function renderReportHtml(snapshot: ReportSnapshot): string {
  const fa = snapshot.language === 'fa';
  const dir = fa ? 'rtl' : 'ltr';
  const i = snapshot.identity;
  const title = reportTitle(snapshot.reportType, fa);
  const project = text(i.projectName);
  const revision = text(i.revisionNumber);
  const standards = snapshot.standards.map(escapeHtml).join(' • ') || '-';
  const materials = snapshot.materials.map(row => `<tr><td>${escapeHtml(text(row.name))}</td><td>${escapeHtml(text(row.material_type))}</td><td>${escapeHtml(text(row.source))}</td><td>${escapeHtml(text(row.specific_gravity))}</td><td>${escapeHtml(text(row.absorption_percent))}</td></tr>`).join('');
  const calc = snapshot.calculation ?? {};
  const trials = snapshot.trialMix.map(row => `<tr><td>${escapeHtml(text(row.trial_date))}</td><td>${escapeHtml(text(row.actual_slump_mm))}</td><td>${escapeHtml(text(row.air_content_percent))}</td><td>${escapeHtml(text(row.fresh_density_kg_m3))}</td><td>${escapeHtml(text(row.strength_7d_mpa))}</td><td>${escapeHtml(text(row.strength_28d_mpa))}</td></tr>`).join('');
  return `<!doctype html><html dir="${dir}" lang="${fa ? 'fa' : 'en'}"><head><meta charset="utf-8"><style>
  @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,'Segoe UI',sans-serif;color:#1f2937;font-size:10.5pt;line-height:1.45;margin:0}.header{border-bottom:2px solid #374151;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;gap:20px}.brand{font-size:18pt;font-weight:700}.muted{color:#6b7280}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 20px;margin:12px 0}.section{margin:16px 0;break-inside:avoid}.section h2{font-size:12pt;margin:0 0 7px;border-bottom:1px solid #d1d5db;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:9pt}th,td{border:1px solid #d1d5db;padding:5px 6px;text-align:${fa ? 'right' : 'left'}th{background:#f3f4f6}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:28px}.sig{border-top:1px solid #9ca3af;padding-top:7px;text-align:center}.footer{margin-top:20px;border-top:1px solid #d1d5db;padding-top:7px;font-size:8.5pt;color:#6b7280}.mono{font-family:Consolas,monospace}
  </style></head><body>
  <div class="header"><div><div class="brand">${escapeHtml(text(i.laboratoryName) || (fa ? 'طلوع بتن' : 'Tolou Concrete'))}</div><div class="muted">${escapeHtml(text(i.laboratoryLicenseNumber))}</div></div><div><strong>${escapeHtml(title)}</strong><br><span class="muted">${fa ? 'تاریخ صدور' : 'Generated'}: ${escapeHtml(new Date(snapshot.generatedAt).toLocaleString(fa ? 'fa-IR' : 'en-US'))}</span></div></div>
  <div class="meta"><div><b>${fa ? 'پروژه' : 'Project'}:</b> ${escapeHtml(project)}</div><div><b>${fa ? 'Revision' : 'Revision'}:</b> ${escapeHtml(revision)}</div><div><b>${fa ? 'نوع بتن' : 'Concrete'}:</b> ${escapeHtml(text(i.concreteType))}</div><div><b>${fa ? 'وضعیت' : 'Status'}:</b> ${escapeHtml(text(i.status))}</div><div><b>${fa ? 'مقاومت هدف' : 'Target strength'}:</b> ${escapeHtml(text(i.targetStrengthMpa))} MPa</div><div><b>${fa ? 'اسلامپ' : 'Slump'}:</b> ${escapeHtml(text(i.requiredSlumpMm))} mm</div></div>
  <div class="section"><h2>${fa ? 'استاندارد و قابلیت ردیابی' : 'Standards & traceability'}</h2><div>${standards}</div><div class="muted">Engine: ${escapeHtml(text(i.engineVersion))} | Standards: ${escapeHtml(text(i.standardsVersion))}</div></div>
  <div class="section"><h2>${fa ? 'مصالح' : 'Materials'}</h2><table><thead><tr><th>${fa ? 'نام' : 'Name'}</th><th>${fa ? 'نوع' : 'Type'}</th><th>${fa ? 'منبع' : 'Source'}</th><th>SG</th><th>${fa ? 'جذب %' : 'Abs. %'}</th></tr></thead><tbody>${materials || `<tr><td colspan="5">-</td></tr>`}</tbody></table></div>
  <div class="section"><h2>${fa ? 'نتیجه طرح اختلاط' : 'Mix result'}</h2><table><tbody><tr><th>Cementitious</th><td>${escapeHtml(text(calc.cementitious_content_kg_m3))} kg/m³</td><th>Water</th><td>${escapeHtml(text(calc.water_content_kg_m3))} kg/m³</td></tr><tr><th>w/cm</th><td>${escapeHtml(text(calc.w_cm_ratio))}</td><th>Air</th><td>${escapeHtml(text(calc.air_content_percent))} %</td></tr><tr><th>Fine Aggregate</th><td>${escapeHtml(text(calc.fine_aggregate_kg_m3))} kg/m³</td><th>Coarse Aggregate</th><td>${escapeHtml(text(calc.coarse_aggregate_kg_m3))} kg/m³</td></tr></tbody></table></div>
  <div class="section"><h2>Trial Mix</h2><table><thead><tr><th>${fa ? 'تاریخ' : 'Date'}</th><th>Slump mm</th><th>Air %</th><th>Density kg/m³</th><th>7d MPa</th><th>28d MPa</th></tr></thead><tbody>${trials || `<tr><td colspan="6">-</td></tr>`}</tbody></table></div>
  <div class="signatures"><div class="sig">${fa ? 'تهیه‌کننده' : 'Prepared by'}<br>${escapeHtml(text(snapshot.signatures.preparedBy))}</div><div class="sig">${fa ? 'بازبین' : 'Reviewed by'}<br>${escapeHtml(text(snapshot.signatures.reviewedBy))}</div><div class="sig">${fa ? 'تأییدکننده' : 'Approved by'}<br>${escapeHtml(text(snapshot.signatures.approvedBy))}</div></div>
  <div class="footer"><span class="mono">${escapeHtml(text(i.mixDesignId))} / R${escapeHtml(revision)}</span> — ${fa ? 'این گزارش از Snapshot غیرقابل‌تغییر داده‌های ثبت‌شده تولید شده است.' : 'Generated from an immutable persisted report snapshot.'}</div>
  </body></html>`;
}

function reportTitle(type: ReportSnapshot['reportType'], fa: boolean) {
  const titles: Record<ReportSnapshot['reportType'], [string,string]> = {
    mix_design:['گزارش طرح اختلاط بتن','Concrete Mix Design Report'], engineering_calculation:['گزارش محاسبات مهندسی','Engineering Calculation Report'], material_summary:['خلاصه مصالح','Material Summary'], durability_compliance:['گزارش انطباق دوام','Durability Compliance Report'], gradation_blend:['گزارش دانه‌بندی و ترکیب سنگدانه','Gradation & Blend Report'], revision_identity:['گزارش هویت Revision','Revision Identity Report'], production_sheet:['برگه تولید بتن','Concrete Production Sheet']
  }; return titles[type][fa ? 0 : 1];
}
function text(value: unknown) { return value === null || value === undefined || value === '' ? '-' : String(value); }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch] ?? ch)); }
