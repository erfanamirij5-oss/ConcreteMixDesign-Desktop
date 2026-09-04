import { useEffect, useState } from 'react';

type LibraryType = 'cement' | 'scm' | 'fine_aggregate' | 'coarse_aggregate' | 'water' | 'admixture';
type LibraryRecord = {
  id: string;
  materialType: LibraryType;
  name: string;
  materialSubtype?: string | null;
  manufacturer?: string | null;
  source?: string | null;
  productCode?: string | null;
  standardDesignation?: string | null;
  status: 'active' | 'expired' | 'inactive';
  testDate?: string | null;
  validUntil?: string | null;
  laboratoryName?: string | null;
  laboratoryReportNumber?: string | null;
  properties?: Record<string, unknown>;
  notes?: string | null;
};

type Draft = Omit<LibraryRecord, 'id'>;

const materialTypes: Array<{ value: LibraryType; label: string }> = [
  { value: 'cement', label: 'سیمان' },
  { value: 'scm', label: 'SCM' },
  { value: 'fine_aggregate', label: 'سنگدانه ریز' },
  { value: 'coarse_aggregate', label: 'سنگدانه درشت' },
  { value: 'water', label: 'آب' },
  { value: 'admixture', label: 'افزودنی' }
];

const initialDraft: Draft = {
  materialType: 'cement',
  name: '',
  materialSubtype: '',
  manufacturer: '',
  source: '',
  productCode: '',
  standardDesignation: '',
  status: 'active',
  testDate: '',
  validUntil: '',
  laboratoryName: '',
  laboratoryReportNumber: '',
  properties: {},
  notes: ''
};

export function MaterialLibraryView(props: { activeMixDesignId: string | null; onAttached?: () => void }) {
  const [records, setRecords] = useState<LibraryRecord[]>([]);
  const [filter, setFilter] = useState<LibraryType | 'all'>('all');
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [propertiesText, setPropertiesText] = useState('{}');
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
      let properties: Record<string, unknown> = {};
      try { properties = JSON.parse(propertiesText) as Record<string, unknown>; } catch { throw new Error('خواص مهندسی باید JSON معتبر باشند.'); }
      const response = await window.tolouMaterialLibrary.save({ ...draft, properties }) as { status?: string; error?: string };
      if (response.status !== 'pass') throw new Error(response.error ?? 'ذخیره رکورد Library ناموفق بود.');
      setDraft(initialDraft); setPropertiesText('{}'); setMessage('رکورد Library ذخیره شد.'); await refresh();
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

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(previous => ({ ...previous, [key]: value })); }

  return <>
    <section className="titlebar"><div><h2>کتابخانه حرفه‌ای مصالح</h2><p>منابع قابل‌استفاده مجدد با Traceability آزمایشگاهی و Snapshot مستقل برای هر Mix Design</p></div></section>
    {message && <div className="alert info">{message}</div>}
    <section className="content-grid">
      <article className="panel">
        <div className="panel-head"><div><h3>ثبت ماده در Library</h3><span>Master Material Record</span></div></div>
        <div className="panel-body revision-form-grid">
          <label><span>نوع ماده</span><select value={draft.materialType} onChange={event => setField('materialType', event.target.value as LibraryType)}>{materialTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
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
          <label className="revision-field-wide"><span>خواص مهندسی JSON</span><textarea value={propertiesText} onChange={event => setPropertiesText(event.target.value)} placeholder='{"specificGravity":3.15}' /></label>
          <label className="revision-field-wide"><span>یادداشت</span><textarea value={draft.notes ?? ''} onChange={event => setField('notes', event.target.value)} /></label>
        </div>
        <div className="revision-form-actions"><button className="btn success" disabled={busy} onClick={() => void save()}>{busy ? 'در حال ذخیره...' : 'ذخیره در Library'}</button></div>
      </article>

      <article className="panel wide-panel">
        <div className="panel-head"><div><h3>مواد ثبت‌شده</h3><span>Reusable Sources</span></div><select value={filter} onChange={event => setFilter(event.target.value as LibraryType | 'all')}><option value="all">همه انواع</option>{materialTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="table-wrap"><table><thead><tr><th>نام</th><th>نوع</th><th>منبع / تولیدکننده</th><th>استاندارد</th><th>آزمایش</th><th>اعتبار</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>
          {records.map(record => <tr key={record.id}><td><b>{record.name}</b><br /><small>{record.productCode || '-'}</small></td><td>{materialTypes.find(item => item.value === record.materialType)?.label ?? record.materialType}</td><td>{record.source || record.manufacturer || '-'}</td><td>{record.standardDesignation || '-'}</td><td>{record.laboratoryReportNumber || record.testDate || '-'}</td><td>{record.validUntil || '-'}</td><td>{record.status}</td><td><button className="btn ghost" disabled={busy || record.status !== 'active' || !props.activeMixDesignId} onClick={() => void attach(record)}>افزودن به طرح</button></td></tr>)}
          {records.length === 0 && <tr><td colSpan={8}>رکوردی در Library ثبت نشده است.</td></tr>}
        </tbody></table></div>
      </article>
    </section>
  </>;
}
