import { useEffect, useState } from 'react';

type TrialMixRecord = {
  id: string;
  trialDate: string;
  batchQuantityM3: number;
  actualSlumpMm: number;
  airContentPercent: number;
  concreteTemperatureC: number;
  freshDensityKgM3: number;
  strength7dMpa?: number | null;
  strength28dMpa?: number | null;
  notes?: string | null;
  createdBy?: string | null;
};

type FormState = {
  trialDate: string;
  batchQuantityM3: string;
  actualSlumpMm: string;
  airContentPercent: string;
  concreteTemperatureC: string;
  freshDensityKgM3: string;
  strength7dMpa: string;
  strength28dMpa: string;
  notes: string;
  actorName: string;
};

const initialForm: FormState = {
  trialDate: new Date().toISOString().slice(0, 10),
  batchQuantityM3: '0.08',
  actualSlumpMm: '',
  airContentPercent: '',
  concreteTemperatureC: '',
  freshDensityKgM3: '',
  strength7dMpa: '',
  strength28dMpa: '',
  notes: '',
  actorName: ''
};

export function TrialMixView(props: { mixDesignId: string | null }) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [records, setRecords] = useState<TrialMixRecord[]>([]);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => { void loadRecords(); }, [props.mixDesignId]);

  async function loadRecords() {
    if (!props.mixDesignId) { setRecords([]); return; }
    try {
      const response = await window.tolouTrialMix?.list(props.mixDesignId) as { status?: string; records?: TrialMixRecord[]; error?: string } | undefined;
      if (!response || response.status !== 'pass') throw new Error(response?.error ?? 'خواندن Trial Mix ناموفق بود.');
      setRecords(response.records ?? []);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'خطا در خواندن Trial Mix');
    }
  }

  async function saveRecord() {
    if (!props.mixDesignId) { setState('error'); setMessage('ابتدا یک طرح اختلاط فعال را انتخاب کنید.'); return; }
    setState('saving'); setMessage('');
    try {
      if (!window.tolouTrialMix?.save) throw new Error('API ثبت Trial Mix در دسترس نیست.');
      const response = await window.tolouTrialMix.save({
        mixDesignId: props.mixDesignId,
        trialDate: form.trialDate,
        batchQuantityM3: Number(form.batchQuantityM3),
        actualSlumpMm: Number(form.actualSlumpMm),
        airContentPercent: Number(form.airContentPercent),
        concreteTemperatureC: Number(form.concreteTemperatureC),
        freshDensityKgM3: Number(form.freshDensityKgM3),
        strength7dMpa: form.strength7dMpa.trim() ? Number(form.strength7dMpa) : null,
        strength28dMpa: form.strength28dMpa.trim() ? Number(form.strength28dMpa) : null,
        notes: form.notes,
        actorName: form.actorName
      }) as { status?: string; error?: string };
      if (response.status !== 'pass') throw new Error(response.error ?? 'ثبت Trial Mix ناموفق بود.');
      await loadRecords();
      setState('saved');
      setMessage('Trial Mix با موفقیت ذخیره شد و اکنون می‌تواند مبنای تکمیل مرحله Trial باشد.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'خطا در ثبت Trial Mix');
    }
  }

  function field(key: keyof FormState, label: string, type = 'number') {
    return <label className="field"><span>{label}</span><input type={type} step={type === 'number' ? 'any' : undefined} value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>;
  }

  return <>
    <section className="titlebar"><div><h2>Trial Mix & Validation</h2><p>ثبت واقعی نتایج بچ آزمایشی برای Gate 06 و کنترل workflow</p></div><div className="toolbar"><button className="btn success" disabled={!props.mixDesignId || state === 'saving'} onClick={saveRecord}>{state === 'saving' ? 'در حال ذخیره...' : 'ثبت Trial Mix'}</button></div></section>
    {!props.mixDesignId && <div className="alert warn">برای ثبت Trial Mix ابتدا یک پرونده طرح اختلاط را فعال کنید.</div>}
    {message && <div className={`alert ${state === 'error' ? 'danger' : 'ok'}`}>{message}</div>}
    <section className="form-grid">
      <article className="panel form-panel"><div className="panel-head"><div><h3>مشخصات Trial</h3><span>Fresh concrete measurements</span></div></div><div className="panel-body form-body">
        {field('trialDate', 'تاریخ Trial', 'date')}{field('batchQuantityM3', 'حجم بچ (m³)')}{field('actualSlumpMm', 'اسلامپ واقعی (mm)')}{field('airContentPercent', 'هوای واقعی (%)')}{field('concreteTemperatureC', 'دمای بتن تازه (°C)')}{field('freshDensityKgM3', 'چگالی بتن تازه (kg/m³)')}
      </div></article>
      <article className="panel form-panel"><div className="panel-head"><div><h3>مقاومت و Traceability</h3><span>Strength results & audit</span></div></div><div className="panel-body form-body">
        {field('strength7dMpa', 'مقاومت ۷ روزه (MPa)')}{field('strength28dMpa', 'مقاومت ۲۸ روزه (MPa)')}{field('actorName', 'مسئول ثبت', 'text')}<label className="field"><span>یادداشت‌ها</span><textarea value={form.notes} onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))} /></label>
      </div></article>
    </section>
    <section className="content-grid"><article className="panel wide-panel"><div className="panel-head"><div><h3>سوابق Trial Mix</h3><span>Persisted records for active mix design</span></div><span className="badge blue">{records.length}</span></div><div className="table-wrap"><table><thead><tr><th>تاریخ</th><th>Batch m³</th><th>Slump mm</th><th>Air %</th><th>Temp °C</th><th>Density kg/m³</th><th>7d MPa</th><th>28d MPa</th><th>مسئول</th></tr></thead><tbody>{records.length === 0 ? <tr><td colSpan={9}>هنوز Trial Mix ثبت نشده است.</td></tr> : records.map(record => <tr key={record.id}><td>{record.trialDate}</td><td>{record.batchQuantityM3}</td><td>{record.actualSlumpMm}</td><td>{record.airContentPercent}</td><td>{record.concreteTemperatureC}</td><td>{record.freshDensityKgM3}</td><td>{record.strength7dMpa ?? '-'}</td><td>{record.strength28dMpa ?? '-'}</td><td>{record.createdBy ?? '-'}</td></tr>)}</tbody></table></div></article></section>
  </>;
}
