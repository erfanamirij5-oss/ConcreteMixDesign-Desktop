import { useEffect, useState } from 'react';

type LibraryType = 'cement' | 'scm' | 'fine_aggregate' | 'coarse_aggregate' | 'water' | 'admixture';
type LibraryStatus = 'active' | 'expired' | 'inactive';
type LibraryRecord = {
  id: string;
  materialType: LibraryType;
  name: string;
  materialSubtype?: string | null;
  manufacturer?: string | null;
  source?: string | null;
  productCode?: string | null;
  standardDesignation?: string | null;
  status: LibraryStatus;
  testDate?: string | null;
  validUntil?: string | null;
  laboratoryName?: string | null;
  laboratoryReportNumber?: string | null;
  properties?: Record<string, unknown>;
  notes?: string | null;
};
type Draft = Omit<LibraryRecord, 'id'>;

const materialTypes: Array<{ value: LibraryType; label: string }> = [
  { value: 'cement', label: 'سیمان' }, { value: 'scm', label: 'SCM' }, { value: 'fine_aggregate', label: 'سنگدانه ریز' },
  { value: 'coarse_aggregate', label: 'سنگدانه درشت' }, { value: 'water', label: 'آب' }, { value: 'admixture', label: 'افزودنی' }
];

const initialDraft: Draft = {
  materialType: 'cement', name: '', materialSubtype: '', manufacturer: '', source: '', productCode: '', standardDesignation: '',
  status: 'active', testDate: '', validUntil: '', laboratoryName: '', laboratoryReportNumber: '', properties: {}, notes: ''
};

export function MaterialLibraryView(props: { activeMixDesignId: string | null; onAttached?: () => void }) {
  const [records, setRecords] = useState<LibraryRecord[]>([]);
  const [filter, setFilter] = useState<LibraryType | 'all'>('all');
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [properties, setProperties] = useState<Record<string, unknown>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { void refresh(); }, [filter]);

  async function refresh() {
    if (!window.tolouMaterialLibrary?.list) return;
    const response = await window.tolouMaterialLibrary.list(filter === 'all' ? undefined : filter) as { status?: string; materials?: LibraryRecord[]; error?: string };
    if (response.status === 'pass') setRecords(response.materials ?? []);
    else if (response.error) setMessage(response.error);
  }

  async function save() {
    setBusy(true); setMessage('');
    try {
      if (!window.tolouMaterialLibrary?.save) throw new Error('API کتابخانه مصالح در دسترس نیست.');
      const response = await window.tolouMaterialLibrary.save({ ...draft, id: editingId ?? undefined, properties }) as { status?: string; error?: string };
      if (response.status !== 'pass') throw new Error(response.error ?? 'ذخیره رکورد Library ناموفق بود.');
      resetEditor(); setMessage(editingId ? 'Master Material Record ویرایش شد؛ Snapshotهای قبلی طرح‌ها تغییر نکردند.' : 'Master Material Record در Library ذخیره شد.'); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطای ناشناخته در ذخیره Library'); }
    finally { setBusy(false); }
  }

  async function attach(record: LibraryRecord) {
    setBusy(true); setMessage('');
    try {
      if (!props.activeMixDesignId) throw new Error('ابتدا یک طرح اختلاط فعال انتخاب کنید.');
      if (!window.tolouMaterialLibrary?.attach) throw new Error('API اتصال Library در دسترس نیست.');
      const response = await window.tolouMaterialLibrary.attach(props.activeMixDesignId, record.id) as { status?: string; error?: string };
      if (response.status !== 'pass') throw new Error(response.error ?? 'افزودن ماده به طرح ناموفق بود.');
      setMessage(`${record.name} با Snapshot مستقل به طرح فعال اضافه شد.`); props.onAttached?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطای ناشناخته در اتصال Library'); }
    finally { setBusy(false); }
  }

  async function changeStatus(record: LibraryRecord, status: LibraryStatus) {
    setBusy(true); setMessage('');
    try {
      if (!window.tolouMaterialLibrary?.setStatus) throw new Error('API تغییر وضعیت Library در دسترس نیست.');
      const response = await window.tolouMaterialLibrary.setStatus(record.id, status) as { status?: string; error?: string };
      if (response.status !== 'pass') throw new Error(response.error ?? 'تغییر وضعیت Library ناموفق بود.');
      setMessage(`وضعیت ${record.name} به ${status} تغییر کرد. Snapshotهای قبلی بدون تغییر باقی می‌مانند.`); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطای ناشناخته در تغییر وضعیت Library'); }
    finally { setBusy(false); }
  }

  function edit(record: LibraryRecord) {
    setEditingId(record.id);
    setDraft({ materialType: record.materialType, name: record.name, materialSubtype: record.materialSubtype ?? '', manufacturer: record.manufacturer ?? '', source: record.source ?? '', productCode: record.productCode ?? '', standardDesignation: record.standardDesignation ?? '', status: record.status, testDate: record.testDate ?? '', validUntil: record.validUntil ?? '', laboratoryName: record.laboratoryName ?? '', laboratoryReportNumber: record.laboratoryReportNumber ?? '', properties: record.properties ?? {}, notes: record.notes ?? '' });
    setProperties(record.properties ?? {});
    setMessage(`در حال ویرایش Master Record: ${record.name}`);
  }

  function resetEditor() { setEditingId(null); setDraft(initialDraft); setProperties({}); }
  function setField<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(previous => ({ ...previous, [key]: value })); }
  function setProperty(key: string, value: string | number | null) { setProperties(previous => ({ ...previous, [key]: value })); }
  function numberProperty(key: string) { const value = properties[key]; return typeof value === 'number' ? value : null; }
  function stringProperty(key: string) { const value = properties[key]; return typeof value === 'string' ? value : ''; }
  const aggregate = draft.materialType === 'fine_aggregate' || draft.materialType === 'coarse_aggregate';
  const binder = draft.materialType === 'cement' || draft.materialType === 'scm';

  return <>
    <section className="titlebar"><div><h2>کتابخانه حرفه‌ای مصالح</h2><p>Master Material Records با Traceability آزمایشگاهی و Snapshot مستقل برای هر Revision</p></div></section>
    {message && <div className="alert info">{message}</div>}
    <section className="content-grid">
      <article className="panel">
        <div className="panel-head"><div><h3>{editingId ? 'ویرایش Master Material Record' : 'ثبت ماده در Library'}</h3><span>Controlled reusable engineering source</span></div></div>
        <div className="panel-body revision-form-grid">
          <label><span>نوع ماده</span><select value={draft.materialType} onChange={event => { setField('materialType', event.target.value as LibraryType); setProperties({}); }}>{materialTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span>نام</span><input value={draft.name} onChange={event => setField('name', event.target.value)} /></label>
          <label><span>Subtype</span><input value={draft.materialSubtype ?? ''} onChange={event => setField('materialSubtype', event.target.value)} /></label>
          <label><span>تولیدکننده</span><input value={draft.manufacturer ?? ''} onChange={event => setField('manufacturer', event.target.value)} /></label>
          <label><span>منبع</span><input value={draft.source ?? ''} onChange={event => setField('source', event.target.value)} /></label>
          <label><span>کد محصول</span><input value={draft.productCode ?? ''} onChange={event => setField('productCode', event.target.value)} /></label>
          <label><span>استاندارد</span><input value={draft.standardDesignation ?? ''} onChange={event => setField('standardDesignation', event.target.value)} /></label>
          <label><span>وضعیت</span><select value={draft.status} onChange={event => setField('status', event.target.value as Draft['status'])}><option value="active">فعال</option><option value="expired">منقضی</option><option value="inactive">غیرفعال</option></select></label>
          <label><span>تاریخ آزمون</span><input type="date" value={draft.testDate ?? ''} onChange={event => setField('testDate', event.target.value)} /></label>
          <label><span>اعتبار تا</span><input type="date" value={draft.validUntil ?? ''} onChange={event => setField('validUntil', event.target.value)} /></label>
          <label><span>آزمایشگاه</span><input value={draft.laboratoryName ?? ''} onChange={event => setField('laboratoryName', event.target.value)} /></label>
          <label><span>شماره گزارش</span><input value={draft.laboratoryReportNumber ?? ''} onChange={event => setField('laboratoryReportNumber', event.target.value)} /></label>

          {binder && <NumberProperty label="Specific Gravity" value={numberProperty('specificGravity')} onChange={value => setProperty('specificGravity', value)} />}
          {binder && <NumberProperty label="Na₂Oeq %" value={numberProperty('alkaliPercent')} onChange={value => setProperty('alkaliPercent', value)} />}
          {draft.materialType === 'scm' && <NumberProperty label="Activity Index %" value={numberProperty('activityIndexPercent')} onChange={value => setProperty('activityIndexPercent', value)} />}
          {draft.materialType === 'scm' && <NumberProperty label="LOI %" value={numberProperty('lossOnIgnitionPercent')} onChange={value => setProperty('lossOnIgnitionPercent', value)} />}

          {aggregate && <label><span>Aggregate Role</span><select value={stringProperty('aggregateRole')} onChange={event => setProperty('aggregateRole', event.target.value)}><option value="">انتخاب</option><option value="natural_sand">Natural Sand</option><option value="manufactured_sand">Manufactured Sand</option><option value="coarse_gravel">Coarse Gravel</option><option value="coarse_12_5">12.5 mm</option><option value="coarse_19">19 mm</option><option value="coarse_25">25 mm</option></select></label>}
          {aggregate && <NumberProperty label="Nominal Size mm" value={numberProperty('nominalSizeMm')} onChange={value => setProperty('nominalSizeMm', value)} />}
          {aggregate && <NumberProperty label="Specific Gravity SSD" value={numberProperty('specificGravity')} onChange={value => setProperty('specificGravity', value)} />}
          {aggregate && <NumberProperty label="Absorption %" value={numberProperty('absorptionPercent')} onChange={value => setProperty('absorptionPercent', value)} />}
          {aggregate && <NumberProperty label="Moisture %" value={numberProperty('moisturePercent')} onChange={value => setProperty('moisturePercent', value)} />}
          {aggregate && <NumberProperty label="Unit Weight kg/m³" value={numberProperty('unitWeightKgM3')} onChange={value => setProperty('unitWeightKgM3', value)} />}
          {aggregate && <label><span>Aggregate Standard</span><input value={stringProperty('aggregateQualityStandard')} onChange={event => setProperty('aggregateQualityStandard', event.target.value)} placeholder="ASTM C33/C33M-24a" /></label>}

          {draft.materialType === 'water' && <label><span>Water Source Class</span><select value={stringProperty('waterSourceClass')} onChange={event => setProperty('waterSourceClass', event.target.value)}><option value="potable">Potable</option><option value="nonpotable">Nonpotable</option><option value="concrete_production">Concrete Production</option></select></label>}
          {draft.materialType === 'water' && <NumberProperty label="Density kg/m³" value={numberProperty('densityKgM3')} onChange={value => setProperty('densityKgM3', value)} />}
          {draft.materialType === 'water' && <NumberProperty label="Chloride mg/L" value={numberProperty('chlorideMgL')} onChange={value => setProperty('chlorideMgL', value)} />}
          {draft.materialType === 'water' && <NumberProperty label="Sulfate mg/L" value={numberProperty('sulfateMgL')} onChange={value => setProperty('sulfateMgL', value)} />}
          {draft.materialType === 'water' && <NumberProperty label="Total Solids mg/L" value={numberProperty('totalSolidsMgL')} onChange={value => setProperty('totalSolidsMgL', value)} />}

          {draft.materialType === 'admixture' && <NumberProperty label="Density kg/m³" value={numberProperty('densityKgM3')} onChange={value => setProperty('densityKgM3', value)} />}
          {draft.materialType === 'admixture' && <NumberProperty label="Dosage" value={numberProperty('dosageValue')} onChange={value => setProperty('dosageValue', value)} />}
          {draft.materialType === 'admixture' && <label><span>Dosage Unit</span><input value={stringProperty('dosageUnit')} onChange={event => setProperty('dosageUnit', event.target.value)} /></label>}
          {draft.materialType === 'admixture' && <NumberProperty label="Solids %" value={numberProperty('solidsPercent')} onChange={value => setProperty('solidsPercent', value)} />}
          {draft.materialType === 'admixture' && <NumberProperty label="Chloride %" value={numberProperty('chloridePercent')} onChange={value => setProperty('chloridePercent', value)} />}

          <label className="revision-field-wide"><span>یادداشت</span><textarea value={draft.notes ?? ''} onChange={event => setField('notes', event.target.value)} /></label>
        </div>
        <div className="revision-form-actions"><button className="btn success" disabled={busy} onClick={() => void save()}>{busy ? 'در حال ذخیره...' : editingId ? 'ذخیره ویرایش Master Record' : 'ذخیره در Library'}</button>{editingId && <button className="btn ghost" disabled={busy} onClick={resetEditor}>لغو ویرایش</button>}</div>
      </article>

      <article className="panel wide-panel">
        <div className="panel-head"><div><h3>مواد ثبت‌شده</h3><span>Reusable Sources</span></div><select value={filter} onChange={event => setFilter(event.target.value as LibraryType | 'all')}><option value="all">همه انواع</option>{materialTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="table-wrap"><table><thead><tr><th>نام</th><th>نوع</th><th>منبع / تولیدکننده</th><th>استاندارد</th><th>آزمایش</th><th>اعتبار</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>
          {records.map(record => <tr key={record.id}><td><b>{record.name}</b><br /><small>{record.productCode || '-'}</small></td><td>{materialTypes.find(item => item.value === record.materialType)?.label ?? record.materialType}</td><td>{record.source || record.manufacturer || '-'}</td><td>{record.standardDesignation || '-'}</td><td>{record.laboratoryReportNumber || record.testDate || '-'}</td><td>{record.validUntil || '-'}</td><td><span className={`badge ${record.status === 'active' ? 'green' : record.status === 'expired' ? 'orange' : 'gray'}`}>{record.status}</span></td><td><div className="toolbar"><button className="btn ghost" disabled={busy} onClick={() => edit(record)}>ویرایش</button><button className="btn ghost" disabled={busy || record.status !== 'active' || !props.activeMixDesignId} onClick={() => void attach(record)}>افزودن به طرح</button>{record.status !== 'active' && <button className="btn ghost" disabled={busy} onClick={() => void changeStatus(record, 'active')}>فعال‌سازی</button>}{record.status === 'active' && <button className="btn ghost" disabled={busy} onClick={() => void changeStatus(record, 'inactive')}>غیرفعال</button>}<button className="btn ghost" disabled={busy || record.status === 'expired'} onClick={() => void changeStatus(record, 'expired')}>منقضی</button></div></td></tr>)}
          {records.length === 0 && <tr><td colSpan={8}>رکوردی در Library ثبت نشده است.</td></tr>}
        </tbody></table></div>
      </article>
    </section>
  </>;
}

function NumberProperty(props: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return <label><span>{props.label}</span><input type="number" step="any" value={props.value ?? ''} onChange={event => props.onChange(event.target.value === '' ? null : Number(event.target.value))} /></label>;
}
