type BinderComponent = {
  material_id?: string; name?: string; material_type?: string; material_subtype?: string; standard_designation?: string | null; share_percent?: number; mass_kg_m3?: number; specific_gravity?: number; replacement_percent?: number | null;
};
type AdmixtureAnalysis = {
  material_id?: string; name?: string; material_subtype?: string; standard_designation?: string | null; manufacturer?: string | null; product_code?: string | null; dosage_value?: number | null; dosage_unit?: string | null; mass_kg_m3?: number; density_kg_m3?: number | null; solids_percent?: number | null; carrier_water_kg_m3?: number; nonwater_absolute_volume_m3?: number;
};
type StandardCheck = { product_name?: string; material_subtype?: string; standard_designation?: string | null; expected_standard?: string; status?: string; };
type Compliance = {
  status?: string;
  standard_checks?: StandardCheck[];
  chloride?: {
    corrosion_exposure_class?: string; prestressed_concrete?: boolean; aci_limit_percent_by_mass_cementitious?: number | null; admixture_chloride_kg_m3?: number; admixture_chloride_percent_by_mass_cementitious?: number | null; admixture_chloride_data_complete?: boolean; scope?: string; status?: string;
  };
};
type Props = {
  cementitiousSystem?: { weighted_specific_gravity?: number; absolute_volume_m3?: number; components?: BinderComponent[]; };
  admixtureSystem?: { analysis?: AdmixtureAnalysis[]; totals?: { mass_kg_m3?: number; carrier_water_kg_m3?: number; nonwater_absolute_volume_m3?: number; }; };
  admixtureCompliance?: Compliance;
  waterToAddKgM3?: number | null;
};

export function EngineeringSystemsResults(props: Props) {
  const binders = props.cementitiousSystem?.components ?? [];
  const admixtures = props.admixtureSystem?.analysis ?? [];
  const totals = props.admixtureSystem?.totals;
  const checks = props.admixtureCompliance?.standard_checks ?? [];
  const chloride = props.admixtureCompliance?.chloride;

  return <>
    <article className="panel wide-panel">
      <div className="panel-head"><div><h3>سیستم مواد سیمانی</h3><span>تفکیک جرم، سهم و وزن مخصوص هر Binder / SCM</span></div><span className="badge orange">SG موثر {show(props.cementitiousSystem?.weighted_specific_gravity)}</span></div>
      <div className="panel-body"><div className="result-grid"><div><label>تعداد اجزای Binder</label><strong>{binders.length}</strong></div><div><label>SG موثر سیستم</label><strong>{show(props.cementitiousSystem?.weighted_specific_gravity)}</strong></div><div><label>حجم مطلق مواد سیمانی</label><strong>{show(props.cementitiousSystem?.absolute_volume_m3)} m³/m³</strong></div></div><div className="standards-list">{binders.length === 0 && <div className="alert warn">جزء سیمانی ثبت‌شده‌ای برای تفکیک وجود ندارد.</div>}{binders.map((item, index) => <div key={item.material_id ?? index}><b>{item.name ?? `Binder ${index + 1}`}</b> — {item.material_subtype ?? item.material_type ?? '-'} | سهم: {show(item.share_percent)}٪ | جرم: {show(item.mass_kg_m3)} kg/m³ | SG: {show(item.specific_gravity)}{item.replacement_percent !== null && item.replacement_percent !== undefined ? ` | جایگزینی: ${show(item.replacement_percent)}٪` : ''}{item.standard_designation ? ` | ${item.standard_designation}` : ''}</div>)}</div></div>
    </article>

    <article className="panel wide-panel">
      <div className="panel-head"><div><h3>سیستم افزودنی‌های شیمیایی</h3><span>دوز واقعی، آب حامل و حجم غیرآبی هر محصول</span></div><span className="badge blue">{admixtures.length} محصول</span></div>
      <div className="panel-body"><div className="result-grid"><div><label>جرم کل افزودنی</label><strong>{show(totals?.mass_kg_m3)} kg/m³</strong></div><div><label>آب حامل افزودنی‌ها</label><strong>{show(totals?.carrier_water_kg_m3)} kg/m³</strong></div><div><label>حجم غیرآبی افزودنی</label><strong>{show(totals?.nonwater_absolute_volume_m3)} m³/m³</strong></div><div><label>آب نهایی قابل تزریق</label><strong>{show(props.waterToAddKgM3)} kg/m³</strong></div></div><div className="standards-list">{admixtures.length === 0 && <div className="alert info">افزودنی شیمیایی برای این طرح ثبت نشده است.</div>}{admixtures.map((item, index) => <div key={item.material_id ?? index}><b>{item.name ?? `Admixture ${index + 1}`}</b> — {item.material_subtype ?? '-'} | دوز: {show(item.dosage_value)} {item.dosage_unit ?? ''} | جرم: {show(item.mass_kg_m3)} kg/m³ | جامد: {show(item.solids_percent)}٪ | آب حامل: {show(item.carrier_water_kg_m3)} kg/m³ | حجم غیرآبی: {show(item.nonwater_absolute_volume_m3)} m³{item.manufacturer ? ` | سازنده: ${item.manufacturer}` : ''}{item.product_code ? ` | کد: ${item.product_code}` : ''}</div>)}</div></div>
    </article>

    <article className="panel wide-panel">
      <div className="panel-head"><div><h3>انطباق افزودنی و کلراید</h3><span>ASTM C494/C494M، ASTM C260/C260M و کنترل جزئی کلراید ACI 318-25</span></div><span className={`badge ${props.admixtureCompliance?.status === 'fail' ? 'red' : 'orange'}`}>{props.admixtureCompliance?.status ?? 'not_checked'}</span></div>
      <div className="panel-body">
        <div className="result-grid">
          <div><label>کلاس خوردگی</label><strong>{chloride?.corrosion_exposure_class ?? '-'}</strong></div>
          <div><label>حد کلراید ACI</label><strong>{show(chloride?.aci_limit_percent_by_mass_cementitious)} % Binder</strong></div>
          <div><label>کلراید ناشی از افزودنی</label><strong>{show(chloride?.admixture_chloride_percent_by_mass_cementitious)} % Binder</strong></div>
          <div><label>جرم کلراید افزودنی</label><strong>{show(chloride?.admixture_chloride_kg_m3)} kg/m³</strong></div>
          <div><label>بتن پیش‌تنیده</label><strong>{chloride?.prestressed_concrete ? 'بله' : 'خیر'}</strong></div>
          <div><label>وضعیت کنترل کلراید</label><strong>{chloride?.status ?? '-'}</strong></div>
        </div>
        <div className="standards-list">
          {checks.length === 0 && <div className="alert info">برای افزودنی ثبت‌شده کنترل استانداردی وجود ندارد.</div>}
          {checks.map((check, index) => <div key={`${check.product_name ?? 'product'}-${index}`}><b>{check.product_name ?? `محصول ${index + 1}`}</b> — {check.status ?? '-'} | انتظار: {check.expected_standard ?? '-'}{check.standard_designation ? ` | ثبت‌شده: ${check.standard_designation}` : ''}</div>)}
          <div className="alert warn">این کنترل کلراید فعلاً فقط سهم افزودنی‌های شیمیایی را پوشش می‌دهد؛ برای تأیید نهایی ACI باید کلراید آب، سنگدانه و مواد سیمانی نیز وارد محاسبه شود.</div>
        </div>
      </div>
    </article>
  </>;
}

function show(value: number | null | undefined) { return value === null || value === undefined ? '-' : String(value); }
