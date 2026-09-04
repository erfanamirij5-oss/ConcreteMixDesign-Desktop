type BinderComponent = {
  material_id?: string; name?: string; material_type?: string; material_subtype?: string; standard_designation?: string | null; share_percent?: number; mass_kg_m3?: number; specific_gravity?: number; replacement_percent?: number | null;
};
type CementitiousProductCheck = { material_id?: string; name?: string; material_subtype?: string; standard_designation?: string | null; expected_standard?: string; status?: string; };
type CementitiousCompliance = { status?: string; sulfate_exposure_class?: string; compliance_route?: string | null; product_standard_checks?: CementitiousProductCheck[]; qualification_evidence?: unknown; };
type AggregateComplianceSource = { material_id?: string; name?: string; material_type?: string; aggregate_role?: string | null; standard?: string; status?: string; gradation?: { status?: string; checked_sieve_count?: number; failure_count?: number; fineness_modulus?: number | null; }; fines_75um?: { status?: string; astm_c117_percent?: number | null; limit_percent?: number | null; }; physical_properties?: { data_complete?: boolean; ssd_specific_gravity?: number | null; absorption_percent?: number | null; rodded_unit_weight_kg_m3?: number | null; }; fractured_face_percent?: number | null; evidence_ref?: string | null; };
type AggregateCompliance = { status?: string; data_complete?: boolean; sources?: AggregateComplianceSource[]; };
type AsrBinderRow = { material_id?: string; name?: string; mass_kg_m3?: number; na2oeq_percent?: number | null; na2oeq_kg_m3?: number | null; };
type AsrAggregateRow = { material_id?: string; name?: string; status?: string; basis?: string; declared_class?: string | null; astm_c1260_expansion_14d_percent?: number | null; astm_c1293_expansion_1y_percent?: number | null; qualification_method?: string | null; evidence_ref?: string | null; };
type AsrCompliance = { status?: string; binder_alkali?: { data_complete?: boolean; total_na2oeq_kg_m3?: number; components?: AsrBinderRow[]; }; aggregate_reactivity?: { data_complete?: boolean; any_reactive?: boolean; sources?: AsrAggregateRow[]; }; mitigation?: { status?: string; qualified?: boolean; best_c1567_expansion_14d_percent?: number | null; }; };
type WaterMonitoringRow = { material_id?: string; name?: string; source_class?: string; status?: string; density_kg_m3?: number | null; density_check_required_daily?: boolean; last_density_check_date?: string | null; density_check_due?: boolean; density_monitoring_method?: string | null; last_qualification_date?: string | null; qualification_frequency?: string; qualification_interval_days?: number | null; next_qualification_due_date?: string | null; qualification_due?: boolean; };
type WaterSourceRow = { material_id?: string; name?: string; material_subtype?: string; source_class?: string; share_percent?: number | null; density_kg_m3?: number | null; chloride_mg_l?: number | null; sulfate_mg_l?: number | null; alkalis_na2oeq_mg_l?: number | null; total_solids_mg_l?: number | null; performance_required?: boolean; strength_ratio_7d_percent?: number | null; setting_time_deviation_min?: number | null; performance_pass?: boolean | null; };
type WaterCompliance = { status?: string; data_complete?: boolean; source_count?: number; sources?: WaterSourceRow[]; monitoring?: { status?: string; sources?: WaterMonitoringRow[]; note?: string; }; combined_water?: { share_total_percent?: number; chloride_mg_l?: number | null; sulfate_mg_l?: number | null; alkalis_na2oeq_mg_l?: number | null; total_solids_mg_l?: number | null; chemical_data_complete?: boolean; performance_qualified?: boolean; }; };
type AdmixtureAnalysis = {
  material_id?: string; name?: string; material_subtype?: string; standard_designation?: string | null; manufacturer?: string | null; product_code?: string | null; dosage_value?: number | null; dosage_unit?: string | null; mass_kg_m3?: number; density_kg_m3?: number | null; solids_percent?: number | null; carrier_water_kg_m3?: number; nonwater_absolute_volume_m3?: number;
};
type StandardCheck = { product_name?: string; material_subtype?: string; standard_designation?: string | null; expected_standard?: string; status?: string; };
type Compliance = {
  status?: string;
  standard_checks?: StandardCheck[];
  chloride?: { corrosion_exposure_class?: string; prestressed_concrete?: boolean; aci_limit_percent_by_mass_cementitious?: number | null; admixture_chloride_kg_m3?: number; admixture_chloride_percent_by_mass_cementitious?: number | null; admixture_chloride_data_complete?: boolean; scope?: string; status?: string; };
};
type ChlorideSource = { source_category?: string; material_id?: string; name?: string; mass_kg_m3?: number; water_kg_m3?: number; share_percent?: number; chloride_percent?: number | null; chloride_mg_l?: number | null; chloride_kg_m3?: number | null; data_complete?: boolean; };
type FullChloride = {
  status?: string; corrosion_exposure_class?: string; prestressed_concrete?: boolean; aci_limit_percent_by_mass_cementitious?: number | null; total_chloride_kg_m3?: number; total_chloride_percent_by_mass_cementitious?: number | null; data_complete?: boolean; source_breakdown?: ChlorideSource[]; calcium_chloride_detected?: boolean; calcium_chloride_prohibited?: boolean;
};
type Props = {
  cementitiousSystem?: { weighted_specific_gravity?: number; absolute_volume_m3?: number; components?: BinderComponent[]; durability_compliance?: CementitiousCompliance; asr_compliance?: AsrCompliance; };
  cementitiousCompliance?: CementitiousCompliance;
  aggregateCompliance?: AggregateCompliance;
  asrCompliance?: AsrCompliance;
  waterCompliance?: WaterCompliance;
  admixtureSystem?: { analysis?: AdmixtureAnalysis[]; totals?: { mass_kg_m3?: number; carrier_water_kg_m3?: number; nonwater_absolute_volume_m3?: number; }; compliance?: Compliance; chloride_compliance?: FullChloride; };
  admixtureCompliance?: Compliance;
  chlorideCompliance?: FullChloride;
  waterToAddKgM3?: number | null;
};

export function EngineeringSystemsResults(props: Props) {
  const binders = props.cementitiousSystem?.components ?? [];
  const binderCompliance = props.cementitiousCompliance ?? props.cementitiousSystem?.durability_compliance;
  const binderChecks = binderCompliance?.product_standard_checks ?? [];
  const aggregate = props.aggregateCompliance;
  const aggregateSources = aggregate?.sources ?? [];
  const asr = props.asrCompliance ?? props.cementitiousSystem?.asr_compliance;
  const asrBinders = asr?.binder_alkali?.components ?? [];
  const asrAggregates = asr?.aggregate_reactivity?.sources ?? [];
  const water = props.waterCompliance;
  const waterSources = water?.sources ?? [];
  const waterMonitoring = water?.monitoring?.sources ?? [];
  const admixtures = props.admixtureSystem?.analysis ?? [];
  const totals = props.admixtureSystem?.totals;
  const compliance = props.admixtureCompliance ?? props.admixtureSystem?.compliance;
  const checks = compliance?.standard_checks ?? [];
  const full = props.chlorideCompliance ?? props.admixtureSystem?.chloride_compliance;
  const sources = full?.source_breakdown ?? [];

  return <>
    <article className="panel wide-panel">
      <div className="panel-head"><div><h3>سیستم مواد سیمانی</h3><span>تفکیک جرم، سهم و وزن مخصوص هر Binder / SCM</span></div><span className="badge orange">SG موثر {show(props.cementitiousSystem?.weighted_specific_gravity)}</span></div>
      <div className="panel-body"><div className="result-grid"><div><label>تعداد اجزای Binder</label><strong>{binders.length}</strong></div><div><label>SG موثر سیستم</label><strong>{show(props.cementitiousSystem?.weighted_specific_gravity)}</strong></div><div><label>حجم مطلق مواد سیمانی</label><strong>{show(props.cementitiousSystem?.absolute_volume_m3)} m³/m³</strong></div></div><div className="standards-list">{binders.length === 0 && <div className="alert warn">جزء سیمانی ثبت‌شده‌ای برای تفکیک وجود ندارد.</div>}{binders.map((item, index) => <div key={item.material_id ?? index}><b>{item.name ?? `Binder ${index + 1}`}</b> — {item.material_subtype ?? item.material_type ?? '-'} | سهم: {show(item.share_percent)}٪ | جرم: {show(item.mass_kg_m3)} kg/m³ | SG: {show(item.specific_gravity)}{item.replacement_percent !== null && item.replacement_percent !== undefined ? ` | جایگزینی: ${show(item.replacement_percent)}٪` : ''}{item.standard_designation ? ` | ${item.standard_designation}` : ''}</div>)}</div></div>
    </article>

    <article className="panel wide-panel">
      <div className="panel-head"><div><h3>انطباق سولفاتی سیستم سیمانی</h3><span>ACI 318-25 + ASTM C150/C595/C1157/C989/C618/C1240/C1012</span></div><span className={`badge ${binderCompliance?.status === 'fail' ? 'red' : binderCompliance?.status === 'pass' ? 'green' : 'orange'}`}>{binderCompliance?.status ?? 'not_checked'}</span></div>
      <div className="panel-body"><div className="result-grid"><div><label>کلاس سولفات</label><strong>{binderCompliance?.sulfate_exposure_class ?? '-'}</strong></div><div><label>مسیر انطباق</label><strong>{binderCompliance?.compliance_route ?? '-'}</strong></div><div><label>تعداد کنترل محصول</label><strong>{binderChecks.length}</strong></div></div><div className="standards-list">{binderChecks.length === 0 && <div className="alert info">کنترل استاندارد محصول سیمانی هنوز انجام نشده است.</div>}{binderChecks.map((check, index) => <div key={`${check.material_id ?? 'binder'}-${index}`}><b>{check.name ?? `Binder ${index + 1}`}</b> — {check.status ?? '-'} | انتظار: {check.expected_standard ?? '-'}{check.standard_designation ? ` | ثبت‌شده: ${check.standard_designation}` : ''}</div>)}{binderCompliance?.sulfate_exposure_class === 'S3' && <div className="alert warn">S3 حتی با مدارک Qualification به انتخاب صریح گزینه ACI و تأیید مهندس نیاز دارد؛ نرم‌افزار آن را خودکار pass نمی‌کند.</div>}</div></div>
    </article>

    <article className="panel wide-panel">
      <div className="panel-head"><div><h3>کنترل کیفیت سنگدانه‌ها</h3><span>ASTM C33/C33M + C136/C136M + C117 + C127/C128 + C29/C29M</span></div><span className={`badge ${aggregate?.status === 'fail' ? 'red' : aggregate?.status === 'pass' ? 'green' : 'orange'}`}>{aggregate?.status ?? 'not_checked'}</span></div>
      <div className="panel-body"><div className="result-grid"><div><label>تعداد منابع</label><strong>{aggregateSources.length}</strong></div><div><label>کامل بودن داده‌های اصلی</label><strong>{aggregate?.data_complete ? 'کامل' : 'ناقص'}</strong></div><div><label>منابع مردود</label><strong>{aggregateSources.filter(item => item.status === 'fail').length}</strong></div><div><label>منابع نیازمند بررسی</label><strong>{aggregateSources.filter(item => item.status === 'needs_review').length}</strong></div></div>
        <div className="standards-list">{aggregateSources.length === 0 && <div className="alert warn">هیچ نتیجه Aggregate Compliance از موتور دریافت نشده است.</div>}{aggregateSources.map((item, index) => <div key={`${item.material_id ?? 'aggregate'}-${index}`}><b>{item.name ?? `Aggregate ${index + 1}`}</b> — {item.status ?? '-'} | {item.standard ?? 'ASTM C33/C33M'} | دانه‌بندی: {item.gradation?.status ?? '-'} ({item.gradation?.checked_sieve_count ?? 0} الک، {item.gradation?.failure_count ?? 0} خارج از حد){item.material_type === 'fine_aggregate' ? ` | FM: ${show(item.gradation?.fineness_modulus)}` : ''} | C117: {show(item.fines_75um?.astm_c117_percent)}% / حد {show(item.fines_75um?.limit_percent)}% | SG SSD: {show(item.physical_properties?.ssd_specific_gravity)} | جذب: {show(item.physical_properties?.absorption_percent)}% | C29: {show(item.physical_properties?.rodded_unit_weight_kg_m3)} kg/m³{item.fractured_face_percent !== null && item.fractured_face_percent !== undefined ? ` | شکستگی: ${show(item.fractured_face_percent)}%` : ''}{item.evidence_ref ? ` | گزارش: ${item.evidence_ref}` : ''}</div>)}{aggregate?.status === 'needs_review' && <div className="alert warn">یکی از حدود دانه‌بندی، نتیجه C117، حد پروژه یا خواص فیزیکی سنگدانه ناقص است؛ تا تکمیل داده‌ها pass کامل صادر نمی‌شود.</div>}</div>
      </div>
    </article>

    <article className="panel wide-panel">
      <div className="panel-head"><div><h3>کنترل ASR و قلیایی مخلوط</h3><span>Na₂Oeq + ASTM C1260/C1293/C1567 + ASTM C1778</span></div><span className={`badge ${asr?.status === 'fail' ? 'red' : asr?.status === 'pass' ? 'green' : 'orange'}`}>{asr?.status ?? 'not_checked'}</span></div>
      <div className="panel-body"><div className="result-grid"><div><label>Na₂Oeq کل Binder</label><strong>{show(asr?.binder_alkali?.total_na2oeq_kg_m3)} kg/m³</strong></div><div><label>داده قلیایی Binder</label><strong>{asr?.binder_alkali?.data_complete ? 'کامل' : 'ناقص'}</strong></div><div><label>سنگدانه واکنش‌زا</label><strong>{asr?.aggregate_reactivity?.any_reactive ? 'بله' : 'خیر/ثبت نشده'}</strong></div><div><label>داده واکنش‌زایی</label><strong>{asr?.aggregate_reactivity?.data_complete ? 'کامل' : 'ناقص'}</strong></div><div><label>وضعیت Mitigation</label><strong>{asr?.mitigation?.status ?? '-'}</strong></div><div><label>بهترین C1567</label><strong>{show(asr?.mitigation?.best_c1567_expansion_14d_percent)} %</strong></div></div>
        <div className="standards-list">{asrBinders.map((item, index) => <div key={`${item.material_id ?? 'binder'}-${index}`}><b>{item.name ?? `Binder ${index + 1}`}</b> — جرم {show(item.mass_kg_m3)} kg/m³ | Na₂Oeq: {show(item.na2oeq_percent)}% | سهم قلیا: {show(item.na2oeq_kg_m3)} kg/m³</div>)}{asrAggregates.map((item, index) => <div key={`${item.material_id ?? 'aggregate'}-${index}`}><b>{item.name ?? `Aggregate ${index + 1}`}</b> — {item.status ?? '-'} | مبنا: {item.basis ?? '-'}{item.astm_c1260_expansion_14d_percent !== null && item.astm_c1260_expansion_14d_percent !== undefined ? ` | C1260: ${show(item.astm_c1260_expansion_14d_percent)}%` : ''}{item.astm_c1293_expansion_1y_percent !== null && item.astm_c1293_expansion_1y_percent !== undefined ? ` | C1293: ${show(item.astm_c1293_expansion_1y_percent)}%` : ''}</div>)}{asr?.status === 'needs_review' && <div className="alert warn">ASR هنوز نیازمند تکمیل داده یا Qualification است؛ قلیای پایین Binder به‌تنهایی اثبات‌کننده ایمنی سنگدانه نیست.</div>}</div>
      </div>
    </article>

    <article className="panel wide-panel">
      <div className="panel-head"><div><h3>انطباق و پایش آب اختلاط</h3><span>ASTM C1602/C1602M-22 + ASTM C1603-23</span></div><span className={`badge ${water?.status === 'fail' ? 'red' : water?.status === 'pass' ? 'green' : 'orange'}`}>{water?.status ?? 'not_checked'}</span></div>
      <div className="panel-body"><div className="result-grid"><div><label>تعداد منابع آب</label><strong>{water?.source_count ?? 0}</strong></div><div><label>Qualification عملکردی</label><strong>{water?.combined_water?.performance_qualified ? 'تأیید' : 'نیازمند بررسی'}</strong></div><div><label>سهم کل منابع</label><strong>{show(water?.combined_water?.share_total_percent)} %</strong></div><div><label>Total Solids ترکیبی</label><strong>{show(water?.combined_water?.total_solids_mg_l)} mg/L</strong></div><div><label>سولفات ترکیبی</label><strong>{show(water?.combined_water?.sulfate_mg_l)} mg/L</strong></div><div><label>قلیایی آب</label><strong>{show(water?.combined_water?.alkalis_na2oeq_mg_l)} mg/L</strong></div></div>
        <div className="standards-list">{waterSources.length === 0 && <div className="alert warn">منبع آب برای کنترل C1602 ثبت نشده است.</div>}{waterSources.map((item, index) => <div key={`${item.material_id ?? 'water'}-${index}`}><b>{item.name ?? `Water ${index + 1}`}</b> — {item.source_class ?? '-'} | سهم {show(item.share_percent)}٪ | چگالی {show(item.density_kg_m3)} kg/m³ | مقاومت 7روزه {show(item.strength_ratio_7d_percent)}٪ | Δ گیرش {show(item.setting_time_deviation_min)} min | وضعیت عملکرد: {item.performance_required ? (item.performance_pass ? 'pass' : 'review/fail') : 'not required'}</div>)}{waterMonitoring.map((item, index) => <div key={`monitor-${item.material_id ?? index}`}><b>پایش {item.name ?? `Water ${index + 1}`}</b> — {item.qualification_frequency ?? '-'} | آخرین Qualification: {item.last_qualification_date ?? '-'} | سررسید بعدی: {item.next_qualification_due_date ?? '-'} | Qualification: {item.qualification_due ? 'سررسید/منقضی' : 'معتبر'}{item.density_check_required_daily ? ` | کنترل چگالی روزانه: ${item.density_check_due ? 'سررسید/منقضی' : 'ثبت‌شده'} | روش: ${item.density_monitoring_method ?? '-'}` : ''}</div>)}{water?.monitoring?.status === 'needs_review' && <div className="alert warn">پایش آب غیرآشامیدنی/بازیافتی کامل نیست یا یکی از آزمون‌های دوره‌ای سررسید شده است.</div>}</div>
      </div>
    </article>

    <article className="panel wide-panel">
      <div className="panel-head"><div><h3>سیستم افزودنی‌های شیمیایی</h3><span>دوز واقعی، آب حامل و حجم غیرآبی هر محصول</span></div><span className="badge blue">{admixtures.length} محصول</span></div>
      <div className="panel-body"><div className="result-grid"><div><label>جرم کل افزودنی</label><strong>{show(totals?.mass_kg_m3)} kg/m³</strong></div><div><label>آب حامل افزودنی‌ها</label><strong>{show(totals?.carrier_water_kg_m3)} kg/m³</strong></div><div><label>حجم غیرآبی افزودنی</label><strong>{show(totals?.nonwater_absolute_volume_m3)} m³/m³</strong></div><div><label>آب نهایی قابل تزریق</label><strong>{show(props.waterToAddKgM3)} kg/m³</strong></div></div><div className="standards-list">{admixtures.length === 0 && <div className="alert info">افزودنی شیمیایی برای این طرح ثبت نشده است.</div>}{admixtures.map((item, index) => <div key={item.material_id ?? index}><b>{item.name ?? `Admixture ${index + 1}`}</b> — {item.material_subtype ?? '-'} | دوز: {show(item.dosage_value)} {item.dosage_unit ?? ''} | جرم: {show(item.mass_kg_m3)} kg/m³ | جامد: {show(item.solids_percent)}٪ | آب حامل: {show(item.carrier_water_kg_m3)} kg/m³ | حجم غیرآبی: {show(item.nonwater_absolute_volume_m3)} m³{item.manufacturer ? ` | سازنده: ${item.manufacturer}` : ''}{item.product_code ? ` | کد: ${item.product_code}` : ''}</div>)}</div></div>
    </article>

    <article className="panel wide-panel">
      <div className="panel-head"><div><h3>انطباق استاندارد افزودنی‌ها</h3><span>ASTM C494/C494M و ASTM C260/C260M</span></div><span className={`badge ${compliance?.status === 'fail' ? 'red' : 'orange'}`}>{compliance?.status ?? 'not_checked'}</span></div>
      <div className="panel-body standards-list">{checks.length === 0 && <div className="alert info">برای افزودنی ثبت‌شده کنترل استانداردی وجود ندارد.</div>}{checks.map((check, index) => <div key={`${check.product_name ?? 'product'}-${index}`}><b>{check.product_name ?? `محصول ${index + 1}`}</b> — {check.status ?? '-'} | انتظار: {check.expected_standard ?? '-'}{check.standard_designation ? ` | ثبت‌شده: ${check.standard_designation}` : ''}</div>)}</div>
    </article>

    <article className="panel wide-panel">
      <div className="panel-head"><div><h3>کنترل کل کلراید مخلوط</h3><span>آب + Binder/SCM + سنگدانه + افزودنی؛ مبنای ACI 318-25 و ASTM C1218</span></div><span className={`badge ${full?.status === 'fail' ? 'red' : full?.status === 'pass' ? 'green' : 'orange'}`}>{full?.status ?? 'not_checked'}</span></div>
      <div className="panel-body"><div className="result-grid"><div><label>کلاس خوردگی</label><strong>{full?.corrosion_exposure_class ?? '-'}</strong></div><div><label>حد ACI</label><strong>{show(full?.aci_limit_percent_by_mass_cementitious)} % Binder</strong></div><div><label>کل کلراید</label><strong>{show(full?.total_chloride_percent_by_mass_cementitious)} % Binder</strong></div><div><label>جرم کلراید</label><strong>{show(full?.total_chloride_kg_m3)} kg/m³</strong></div><div><label>کامل بودن داده‌ها</label><strong>{full?.data_complete ? 'کامل' : 'ناقص'}</strong></div><div><label>CaCl₂</label><strong>{full?.calcium_chloride_detected ? (full.calcium_chloride_prohibited ? 'شناسایی شد — ممنوع' : 'شناسایی شد') : 'شناسایی نشد'}</strong></div></div>
        <div className="standards-list">{sources.length === 0 && <div className="alert info">تفکیک منبع کلراید هنوز موجود نیست.</div>}{sources.map((item, index) => <div key={`${item.source_category ?? 'source'}-${item.material_id ?? index}`}><b>{item.name ?? item.source_category ?? `منبع ${index + 1}`}</b> — {item.source_category ?? '-'} | کلراید: {item.chloride_kg_m3 === null || item.chloride_kg_m3 === undefined ? 'نامشخص' : `${show(item.chloride_kg_m3)} kg/m³`}{item.chloride_percent !== null && item.chloride_percent !== undefined ? ` | ${show(item.chloride_percent)}% جرمی` : ''}{item.chloride_mg_l !== null && item.chloride_mg_l !== undefined ? ` | ${show(item.chloride_mg_l)} mg/L` : ''} | داده: {item.data_complete ? 'کامل' : 'ناقص'}</div>)}</div>
      </div>
    </article>
  </>;
}

function show(value: number | null | undefined) { return value === null || value === undefined ? '-' : String(value); }
