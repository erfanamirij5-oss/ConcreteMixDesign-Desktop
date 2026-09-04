import { useEffect, useState } from 'react';

type FreezeWaterExposure = 'limited' | 'frequent';

type DurabilityForm = {
  freezeThawExposure: boolean;
  freezeWaterExposure: FreezeWaterExposure;
  soilWaterSolubleSulfatePercent: number | null;
  waterDissolvedSulfatePpm: number | null;
  seawaterExposure: boolean;
  waterContact: boolean;
  lowPermeabilityRequired: boolean;
  moistureExposure: boolean;
  externalChlorideExposure: boolean;
  reinforcedOrEmbeddedMetal: boolean;
  prestressedConcrete: boolean;
};

type DurabilityResult = {
  status?: string;
  standard?: string;
  exposure_classes?: { freeze_thaw?: string; sulfate?: string; water?: string; corrosion?: string };
  governing_requirements?: {
    max_w_cm?: number | null;
    min_strength_mpa?: number;
    target_air_percent?: number | null;
    chloride_limit_percent?: { nonprestressed_percent?: number; prestressed_percent?: number };
  };
  sulfate_requirements?: { cementitious_material_restriction?: string; calcium_chloride?: string; astm_c1012_verification?: string };
  warnings?: Array<{ code?: string; severity?: string; message?: string; reference?: string }>;
};

const initialForm: DurabilityForm = {
  freezeThawExposure: false,
  freezeWaterExposure: 'limited',
  soilWaterSolubleSulfatePercent: null,
  waterDissolvedSulfatePpm: null,
  seawaterExposure: false,
  waterContact: false,
  lowPermeabilityRequired: false,
  moistureExposure: false,
  externalChlorideExposure: false,
  reinforcedOrEmbeddedMetal: true,
  prestressedConcrete: false
};

export function DurabilityView(props: { mixDesignId: string | null; maxAggregateSizeMm?: number }) {
  const [form, setForm] = useState<DurabilityForm>(initialForm);
  const [result, setResult] = useState<DurabilityResult | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'saving' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadExisting();
  }, [props.mixDesignId]);

  async function loadExisting() {
    setResult(null);
    setMessage('');
    if (!props.mixDesignId || !window.tolouDurability) {
      setForm(initialForm);
      return;
    }
    setState('loading');
    try {
      const response = await window.tolouDurability.get(props.mixDesignId) as { status?: string; input?: Partial<DurabilityForm> | null; error?: string };
      if (response.status === 'fail') throw new Error(response.error ?? 'خواندن اطلاعات دوام ناموفق بود.');
      const loaded = response.input ? { ...initialForm, ...response.input } : initialForm;
      setForm(loaded);
      setState('idle');
      if (response.input) await evaluate(loaded);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'خطای ناشناخته در خواندن دوام');
    }
  }

  async function saveAndEvaluate() {
    if (!props.mixDesignId) {
      setState('error');
      setMessage('ابتدا یک طرح اختلاط ذخیره‌شده را انتخاب کنید.');
      return;
    }
    if (!window.tolouDurability) {
      setState('error');
      setMessage('API دوام در Electron در دسترس نیست.');
      return;
    }
    setState('saving');
    setMessage('');
    try {
      const saved = await window.tolouDurability.save({ mixDesignId: props.mixDesignId, ...form }) as { status?: string; error?: string };
      if (saved.status !== 'pass') throw new Error(saved.error ?? 'ذخیره اطلاعات دوام ناموفق بود.');
      await evaluate(form);
      setState('done');
      setMessage('شرایط مواجهه ذخیره و تحلیل دوام به‌روزرسانی شد.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'خطای ناشناخته در تحلیل دوام');
    }
  }

  async function evaluate(values: DurabilityForm) {
    if (!window.tolouEngine?.evaluateDurability) throw new Error('موتور تحلیل دوام در دسترس نیست.');
    const response = await window.tolouEngine.evaluateDurability({
      max_aggregate_size_mm: props.maxAggregateSizeMm ?? 19,
      conditions: {
        freeze_thaw_exposure: values.freezeThawExposure,
        freeze_water_exposure: values.freezeWaterExposure,
        soil_water_soluble_sulfate_percent: values.soilWaterSolubleSulfatePercent,
        water_dissolved_sulfate_ppm: values.waterDissolvedSulfatePpm,
        seawater_exposure: values.seawaterExposure,
        water_contact: values.waterContact,
        low_permeability_required: values.lowPermeabilityRequired,
        moisture_exposure: values.moistureExposure,
        external_chloride_exposure: values.externalChlorideExposure,
        reinforced_or_embedded_metal: values.reinforcedOrEmbeddedMetal,
        prestressed_concrete: values.prestressedConcrete
      }
    }) as DurabilityResult;
    setResult(response);
  }

  function setBoolean(key: keyof DurabilityForm, value: boolean) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  function setNullableNumber(key: 'soilWaterSolubleSulfatePercent' | 'waterDissolvedSulfatePpm', value: string) {
    setForm(previous => ({ ...previous, [key]: value === '' ? null : Number(value) }));
  }

  const classes = result?.exposure_classes;
  const governing = result?.governing_requirements;
  const warnings = result?.warnings ?? [];

  return <>
    <section className="titlebar"><div><h2>دوام و پایایی بتن</h2><p>طبقه‌بندی مواجهه F/S/W/C و استخراج الزامات حاکم بر اساس ACI CODE-318-25</p></div><div className="toolbar"><button className="btn success" disabled={!props.mixDesignId || state === 'saving'} onClick={saveAndEvaluate}>{state === 'saving' ? 'در حال تحلیل...' : 'ذخیره و تحلیل دوام'}</button></div></section>
    {!props.mixDesignId && <div className="alert warn">ابتدا یک پروژه ذخیره‌شده را انتخاب کنید تا شرایط دوام به همان طرح متصل شود.</div>}
    {message && <div className={`alert ${state === 'error' ? 'danger' : 'ok'}`}>{message}</div>}

    <section className="form-grid">
      <ExposurePanel title="F — یخ‌زدگی و ذوب" subtitle="چرخه یخ‌زدگی و میزان تماس با آب">
        <Check label="بتن در معرض چرخه یخ‌زدگی/ذوب است" checked={form.freezeThawExposure} onChange={value => setBoolean('freezeThawExposure', value)} />
        <label className="field"><span>میزان تماس با آب هنگام یخ‌زدگی</span><select value={form.freezeWaterExposure} onChange={event => setForm(previous => ({ ...previous, freezeWaterExposure: event.target.value as FreezeWaterExposure }))}><option value="limited">محدود / گهگاهی</option><option value="frequent">مکرر / اشباع قابل توجه</option></select></label>
      </ExposurePanel>

      <ExposurePanel title="S — سولفات" subtitle="خاک، آب زیرزمینی و آب دریا">
        <NumberInput label="سولفات محلول خاک (%)" value={form.soilWaterSolubleSulfatePercent} onChange={value => setNullableNumber('soilWaterSolubleSulfatePercent', value)} />
        <NumberInput label="سولفات محلول آب (ppm)" value={form.waterDissolvedSulfatePpm} onChange={value => setNullableNumber('waterDissolvedSulfatePpm', value)} />
        <Check label="تماس مستقیم یا پایدار با آب دریا" checked={form.seawaterExposure} onChange={value => setBoolean('seawaterExposure', value)} />
      </ExposurePanel>

      <ExposurePanel title="W — تماس با آب" subtitle="کنترل نفوذپذیری و تماس طولانی با آب">
        <Check label="عضو در تماس با آب است" checked={form.waterContact} onChange={value => setBoolean('waterContact', value)} />
        <Check label="نفوذپذیری کم برای عملکرد عضو الزامی است" checked={form.lowPermeabilityRequired} onChange={value => setBoolean('lowPermeabilityRequired', value)} />
      </ExposurePanel>

      <ExposurePanel title="C — خوردگی" subtitle="رطوبت، کلراید و فولاد مدفون">
        <Check label="عضو در معرض رطوبت قرار دارد" checked={form.moistureExposure} onChange={value => setBoolean('moistureExposure', value)} />
        <Check label="منبع خارجی کلراید وجود دارد" checked={form.externalChlorideExposure} onChange={value => setBoolean('externalChlorideExposure', value)} />
        <Check label="آرماتور یا فلز مدفون در بتن وجود دارد" checked={form.reinforcedOrEmbeddedMetal} onChange={value => setBoolean('reinforcedOrEmbeddedMetal', value)} />
        <Check label="بتن پیش‌تنیده است" checked={form.prestressedConcrete} onChange={value => setBoolean('prestressedConcrete', value)} />
      </ExposurePanel>
    </section>

    {result && <>
      <section className="kpis">
        <ClassKpi label="Freeze" value={classes?.freeze_thaw ?? '-'} />
        <ClassKpi label="Sulfate" value={classes?.sulfate ?? '-'} />
        <ClassKpi label="Water" value={classes?.water ?? '-'} />
        <ClassKpi label="Corrosion" value={classes?.corrosion ?? '-'} />
      </section>
      <section className="content-grid">
        <article className="panel wide-panel"><div className="panel-head"><div><h3>الزامات حاکم دوام</h3><span>{result.standard ?? 'ACI CODE-318-25'}</span></div><span className="badge blue">Governing</span></div><div className="panel-body"><div className="result-grid"><div><label>حداکثر w/cm</label><strong>{show(governing?.max_w_cm)}</strong></div><div><label>حداقل مقاومت</label><strong>{show(governing?.min_strength_mpa)} MPa</strong></div><div><label>هوای هدف</label><strong>{show(governing?.target_air_percent)} %</strong></div><div><label>کلراید غیرپیش‌تنیده</label><strong>{show(governing?.chloride_limit_percent?.nonprestressed_percent)} %</strong></div></div></div></article>
        <article className="panel"><div className="panel-head"><div><h3>الزامات سولفات</h3><span>سیستم سیمانی و CaCl₂</span></div></div><div className="panel-body standards-list"><div>{result.sulfate_requirements?.cementitious_material_restriction ?? '-'}</div><div>Calcium chloride: {result.sulfate_requirements?.calcium_chloride ?? '-'}</div>{result.sulfate_requirements?.astm_c1012_verification && <div>ASTM C1012: {result.sulfate_requirements.astm_c1012_verification}</div>}</div></article>
        <article className="panel"><div className="panel-head"><div><h3>هشدارهای دوام</h3><span>نیازمند ثبت در گزارش نهایی</span></div><span className={`badge ${warnings.length ? 'orange' : 'green'}`}>{warnings.length}</span></div><div className="panel-body alerts">{warnings.length === 0 && <div className="alert ok">هشدار خاصی ثبت نشده است.</div>}{warnings.map((warning, index) => <div className={`alert ${warning.severity === 'fail' ? 'danger' : 'warn'}`} key={`${warning.code}-${index}`}><b>{warning.code}</b> — {warning.message}{warning.reference ? ` | ${warning.reference}` : ''}</div>)}</div></article>
      </section>
    </>}
  </>;
}

function ExposurePanel(props: { title: string; subtitle: string; children: React.ReactNode }) { return <article className="panel form-panel"><div className="panel-head"><div><h3>{props.title}</h3><span>{props.subtitle}</span></div></div><div className="panel-body form-body">{props.children}</div></article>; }
function Check(props: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="field"><span>{props.label}</span><input type="checkbox" checked={props.checked} onChange={event => props.onChange(event.target.checked)} /></label>; }
function NumberInput(props: { label: string; value: number | null; onChange: (value: string) => void }) { return <label className="field"><span>{props.label}</span><input type="number" step="any" value={props.value ?? ''} onChange={event => props.onChange(event.target.value)} /></label>; }
function ClassKpi(props: { label: string; value: string }) { return <article className="kpi purple"><label>{props.label}</label><strong>{props.value}</strong><small>ACI 318-25</small></article>; }
function show(value: number | null | undefined) { return value === null || value === undefined ? '-' : String(value); }
