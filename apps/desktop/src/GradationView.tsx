import { useEffect, useMemo, useState } from 'react';
import { GradationChart } from './GradationChart';
import type { MaterialRecord } from './types/material';
import type { AggregateBlendShare, GradationSummary, SaveGradationResponse, SieveRow } from './types/gradation';

const fineAggregateTemplate: SieveRow[] = [
  { label: '9.5 mm', sieveSizeMm: 9.5, percentPassing: 100, standardMin: 100, standardMax: 100, status: 'not_checked' },
  { label: '4.75 mm', sieveSizeMm: 4.75, percentPassing: 95, standardMin: 95, standardMax: 100, status: 'not_checked' },
  { label: '2.36 mm', sieveSizeMm: 2.36, percentPassing: 85, standardMin: 80, standardMax: 100, status: 'not_checked' },
  { label: '1.18 mm', sieveSizeMm: 1.18, percentPassing: 65, standardMin: 50, standardMax: 85, status: 'not_checked' },
  { label: '600 µm', sieveSizeMm: 0.6, percentPassing: 42, standardMin: 25, standardMax: 60, status: 'not_checked' },
  { label: '300 µm', sieveSizeMm: 0.3, percentPassing: 18, standardMin: 5, standardMax: 30, status: 'not_checked' },
  { label: '150 µm', sieveSizeMm: 0.15, percentPassing: 5, standardMin: 0, standardMax: 10, status: 'not_checked' }
];

export function GradationView(props: { mixDesignId: string | null }) {
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [rows, setRows] = useState<SieveRow[]>(fineAggregateTemplate);
  const [manualLimitOverride, setManualLimitOverride] = useState(false);
  const [manualBlendEnabled, setManualBlendEnabled] = useState(false);
  const [blendShares, setBlendShares] = useState<AggregateBlendShare[]>([]);
  const [summary, setSummary] = useState<GradationSummary | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const aggregateMaterials = useMemo(() => materials.filter(item => item.materialType === 'fine_aggregate' || item.materialType === 'coarse_aggregate'), [materials]);
  const liveRows = useMemo(() => rows.map(row => ({ ...row, status: classify(row) })), [rows]);
  const liveWarningRows = liveRows.filter(row => row.status === 'low' || row.status === 'high');
  const totalBlendShare = blendShares.reduce((sum, share) => sum + share.sharePercent, 0);

  useEffect(() => { void loadMaterials(); }, [props.mixDesignId]);
  useEffect(() => {
    setBlendShares(aggregateMaterials.map((item, index) => ({ materialId: item.id, materialName: item.name, sharePercent: aggregateMaterials.length === 1 ? 100 : index === 0 ? 60 : index === 1 ? 40 : 0 })));
  }, [aggregateMaterials]);

  async function loadMaterials() {
    if (!props.mixDesignId || !window.tolouMaterials) return;
    setStatus('loading');
    const result = await window.tolouMaterials.listByMixDesign(props.mixDesignId) as { status: string; materials?: MaterialRecord[]; error?: string };
    const list = result.materials ?? [];
    setMaterials(list);
    const firstAggregate = list.find(item => item.materialType === 'fine_aggregate' || item.materialType === 'coarse_aggregate');
    setSelectedMaterialId(firstAggregate?.id ?? '');
    setStatus('idle');
  }

  async function saveGradation() {
    setStatus('saving');
    setMessage('');
    try {
      if (!selectedMaterialId) throw new Error('ابتدا یک مصالح سنگدانه ریز یا درشت انتخاب کنید.');
      if (!window.tolouGradation) throw new Error('API دانه‌بندی در دسترس نیست. برنامه باید داخل Electron اجرا شود.');
      const result = await window.tolouGradation.save({ materialId: selectedMaterialId, manualLimitOverride, manualBlendEnabled, blendShares, rows: liveRows }) as SaveGradationResponse;
      if (result.status !== 'pass') throw new Error(result.error ?? 'ذخیره دانه‌بندی ناموفق بود.');
      setRows(liveRows);
      setSummary(result.summary ?? null);
      setStatus('saved');
      setMessage('دانه‌بندی سنگدانه با موفقیت ذخیره و کنترل اولیه شد.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'خطای ناشناخته در ذخیره دانه‌بندی');
    }
  }

  function updateRow(index: number, key: keyof SieveRow, value: number) {
    setRows(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
    if (key === 'standardMin' || key === 'standardMax') setManualLimitOverride(true);
  }

  function updateBlendShare(materialId: string, sharePercent: number) {
    setBlendShares(previous => previous.map(share => share.materialId === materialId ? { ...share, sharePercent } : share));
  }

  return <>
    <section className="titlebar"><div><h2>دانه‌بندی سنگدانه‌ها</h2><p>کنترل استاندارد، نمودار منحنی، override دستی و سهم دستی سنگدانه‌ها</p></div><div className="toolbar"><button className="btn success" disabled={status === 'saving'} onClick={saveGradation}>{status === 'saving' ? 'در حال ذخیره...' : 'ذخیره و کنترل دانه‌بندی'}</button></div></section>
    {!props.mixDesignId && <div className="alert warn">برای ثبت دانه‌بندی، ابتدا پروژه و مصالح سنگدانه را ذخیره کنید.</div>}
    {props.mixDesignId && aggregateMaterials.length === 0 && <div className="alert warn">برای این طرح هنوز ماسه یا شن ثبت نشده است. ابتدا از بخش مصالح یک سنگدانه اضافه کنید.</div>}
    {manualLimitOverride && <div className="alert info">حالت تغییر دستی حدود دانه‌بندی فعال است؛ این موضوع در خروجی گزارش باید ثبت شود.</div>}
    {manualBlendEnabled && Math.abs(totalBlendShare - 100) > 0.01 && <div className="alert warn">جمع سهم دستی سنگدانه‌ها الان {Math.round(totalBlendShare * 100) / 100}٪ است و برای ذخیره باید ۱۰۰٪ شود.</div>}
    {message && <div className={`alert ${status === 'error' ? 'danger' : 'ok'}`}>{message}</div>}

    <section className="content-grid">
      <article className="panel wide-panel"><div className="panel-head"><div><h3>کنترل‌های مهندس‌محور</h3><span>مشابه حالت دستی نرم‌افزارهای صنعتی؛ تمام overrideها قابل ردیابی هستند</span></div><span className="badge orange">Manual Control</span></div><div className="panel-body control-strip"><label className="check-control"><input type="checkbox" checked={manualLimitOverride} onChange={event => setManualLimitOverride(event.target.checked)} /><span>فعال‌سازی تغییر دستی حد بالا و پایین</span></label><label className="check-control"><input type="checkbox" checked={manualBlendEnabled} onChange={event => setManualBlendEnabled(event.target.checked)} /><span>فعال‌سازی سهم دستی سنگدانه‌ها</span></label></div></article>

      <article className="panel wide-panel"><div className="panel-head"><div><h3>انتخاب سنگدانه</h3><span>دانه‌بندی به مصالح انتخاب‌شده متصل می‌شود</span></div><span className="badge blue">ASTM C136</span></div><div className="panel-body form-body"><label className="field full"><span>سنگدانه</span><select value={selectedMaterialId} onChange={event => setSelectedMaterialId(event.target.value)}><option value="">انتخاب کنید</option>{aggregateMaterials.map(item => <option value={item.id} key={item.id}>{item.name} - {item.source}</option>)}</select></label></div></article>

      {manualBlendEnabled && <article className="panel wide-panel"><div className="panel-head"><div><h3>سهم دستی سنگدانه‌ها</h3><span>جمع سهم‌ها باید ۱۰۰٪ باشد؛ این اعداد در طراحی نهایی طرح اختلاط استفاده می‌شوند</span></div><span className={`badge ${Math.abs(totalBlendShare - 100) <= 0.01 ? 'green' : 'red'}`}>جمع: {Math.round(totalBlendShare * 100) / 100}٪</span></div><div className="panel-body tablewrap"><table><thead><tr><th>مصالح</th><th>سهم دستی %</th></tr></thead><tbody>{blendShares.map(share => <tr key={share.materialId}><td>{share.materialName}</td><td><input className="table-input" type="number" value={share.sharePercent} onChange={event => updateBlendShare(share.materialId, Number(event.target.value))} /></td></tr>)}</tbody></table></div></article>}

      <article className="panel wide-panel"><div className="panel-head"><div><h3>نمودار منحنی دانه‌بندی</h3><span>منحنی مصالح با حد پایین و حد بالا مقایسه می‌شود</span></div><span className="badge orange">Live Chart</span></div><div className="panel-body"><GradationChart rows={liveRows} /></div></article>

      <article className="panel wide-panel"><div className="panel-head"><div><h3>جدول درصد عبوری الک‌ها</h3><span>{manualLimitOverride ? 'حدود بالا و پایین به‌صورت دستی قابل اصلاح هستند' : 'با تغییر حدود، حالت دستی خودکار فعال می‌شود'}</span></div></div><div className="panel-body tablewrap"><table><thead><tr><th>الک</th><th>اندازه mm</th><th>درصد عبوری</th><th>حد پایین</th><th>حد بالا</th><th>وضعیت</th></tr></thead><tbody>{liveRows.map((row, index) => <tr key={row.sieveSizeMm}><td>{row.label}</td><td>{row.sieveSizeMm}</td><td><input className="table-input" type="number" value={row.percentPassing} onChange={event => updateRow(index, 'percentPassing', Number(event.target.value))} /></td><td><input className="table-input" type="number" value={row.standardMin ?? ''} onChange={event => updateRow(index, 'standardMin', Number(event.target.value))} /></td><td><input className="table-input" type="number" value={row.standardMax ?? ''} onChange={event => updateRow(index, 'standardMax', Number(event.target.value))} /></td><td><span className={`status-pill ${row.status}`}>{statusLabel(row.status)}</span></td></tr>)}</tbody></table></div></article>

      <article className="panel"><div className="panel-head"><div><h3>خلاصه کنترل دانه‌بندی</h3><span>بعد از ذخیره، خلاصه رسمی ثبت می‌شود</span></div></div><div className="panel-body result-grid single-column"><div><label>مدول نرمی اولیه</label><strong>{summary?.finenessModulus ?? '-'}</strong></div><div><label>تعداد ردیف قبول</label><strong>{summary?.passedCount ?? '-'}</strong></div><div><label>تعداد هشدار</label><strong>{summary?.warningCount ?? liveWarningRows.length}</strong></div></div>{summary && <div className="panel-body"><div className="alert info">{summary.recommendation}</div></div>}</article>
      <article className="panel"><div className="panel-head"><div><h3>پیشنهاد اصلاح اولیه</h3><span>نسخه دقیق‌تر با ترکیب درصدی منابع اضافه می‌شود</span></div></div><div className="panel-body standards-list">{(summary?.correctionHints ?? buildLiveHints(liveWarningRows)).map(hint => <div key={hint}>✓ {hint}</div>)}{summary?.manualNotes.map(note => <div key={note}>✓ {note}</div>)}</div></article>
    </section>
  </>;
}

function classify(row: SieveRow): SieveRow['status'] {
  if (row.standardMin === null || row.standardMax === null) return 'not_checked';
  if (row.percentPassing < row.standardMin) return 'low';
  if (row.percentPassing > row.standardMax) return 'high';
  return 'pass';
}

function buildLiveHints(warningRows: SieveRow[]) {
  if (!warningRows.length) return ['منحنی فعلی در محدوده‌های واردشده است؛ کنترل نهایی با استاندارد پروژه و ریزدانه عبوری از 75 میکرون انجام شود.'];
  return warningRows.map(row => row.status === 'high' ? `عبوری الک ${row.label} بالاتر از محدوده است؛ مصالح در این بازه ریزتر از هدف است.` : `عبوری الک ${row.label} پایین‌تر از محدوده است؛ مصالح در این بازه درشت‌تر از هدف است.`);
}

function statusLabel(status: SieveRow['status']) {
  if (status === 'pass') return 'قبول';
  if (status === 'low') return 'کمتر از حد';
  if (status === 'high') return 'بیشتر از حد';
  return 'کنترل نشده';
}
