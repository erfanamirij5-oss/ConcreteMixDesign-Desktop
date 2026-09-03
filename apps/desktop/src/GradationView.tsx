import { useEffect, useMemo, useState } from 'react';
import { GradationChart } from './GradationChart';
import type { MaterialRecord } from './types/material';
import type { AggregateBlendShare, GradationSummary, SaveGradationResponse, SieveRow } from './types/gradation';

type PresetKey = 'fine_astm_c33_draft' | 'coarse_12_5_draft' | 'coarse_19_draft' | 'coarse_25_draft';
type GradationMap = Record<string, SieveRow[]>;
type BlendSuggestion = { shares: AggregateBlendShare[]; score: number; warningCount: number; rows: SieveRow[]; note: string; };
type GradationPreset = { key: PresetKey; label: string; description: string; rows: SieveRow[]; };

const presets: GradationPreset[] = [
  { key: 'fine_astm_c33_draft', label: 'ماسه - محدوده عمومی ASTM C33', description: 'برای سنگدانه ریز؛ اعداد فعلاً پیش‌نویس کاری هستند و باید با نسخه استاندارد پروژه کنترل شوند.', rows: [
    { label: '9.5 mm', sieveSizeMm: 9.5, percentPassing: 100, standardMin: 100, standardMax: 100, status: 'not_checked' },
    { label: '4.75 mm', sieveSizeMm: 4.75, percentPassing: 95, standardMin: 95, standardMax: 100, status: 'not_checked' },
    { label: '2.36 mm', sieveSizeMm: 2.36, percentPassing: 85, standardMin: 80, standardMax: 100, status: 'not_checked' },
    { label: '1.18 mm', sieveSizeMm: 1.18, percentPassing: 65, standardMin: 50, standardMax: 85, status: 'not_checked' },
    { label: '600 µm', sieveSizeMm: 0.6, percentPassing: 42, standardMin: 25, standardMax: 60, status: 'not_checked' },
    { label: '300 µm', sieveSizeMm: 0.3, percentPassing: 18, standardMin: 5, standardMax: 30, status: 'not_checked' },
    { label: '150 µm', sieveSizeMm: 0.15, percentPassing: 5, standardMin: 0, standardMax: 10, status: 'not_checked' }
  ] },
  { key: 'coarse_12_5_draft', label: 'شن 12.5 mm - پیش‌نویس کنترل', description: 'برای کنترل اولیه سنگدانه درشت با اندازه اسمی حدود 12.5 mm.', rows: [
    { label: '19 mm', sieveSizeMm: 19, percentPassing: 100, standardMin: 100, standardMax: 100, status: 'not_checked' },
    { label: '12.5 mm', sieveSizeMm: 12.5, percentPassing: 92, standardMin: 90, standardMax: 100, status: 'not_checked' },
    { label: '9.5 mm', sieveSizeMm: 9.5, percentPassing: 55, standardMin: 40, standardMax: 70, status: 'not_checked' },
    { label: '4.75 mm', sieveSizeMm: 4.75, percentPassing: 8, standardMin: 0, standardMax: 15, status: 'not_checked' },
    { label: '2.36 mm', sieveSizeMm: 2.36, percentPassing: 2, standardMin: 0, standardMax: 5, status: 'not_checked' }
  ] },
  { key: 'coarse_19_draft', label: 'شن 19 mm - پیش‌نویس کنترل', description: 'برای کنترل اولیه سنگدانه درشت با اندازه اسمی حدود 19 mm.', rows: [
    { label: '25 mm', sieveSizeMm: 25, percentPassing: 100, standardMin: 100, standardMax: 100, status: 'not_checked' },
    { label: '19 mm', sieveSizeMm: 19, percentPassing: 95, standardMin: 90, standardMax: 100, status: 'not_checked' },
    { label: '12.5 mm', sieveSizeMm: 12.5, percentPassing: 55, standardMin: 20, standardMax: 55, status: 'not_checked' },
    { label: '9.5 mm', sieveSizeMm: 9.5, percentPassing: 22, standardMin: 0, standardMax: 30, status: 'not_checked' },
    { label: '4.75 mm', sieveSizeMm: 4.75, percentPassing: 4, standardMin: 0, standardMax: 10, status: 'not_checked' }
  ] },
  { key: 'coarse_25_draft', label: 'شن 25 mm - پیش‌نویس کنترل', description: 'برای کنترل اولیه سنگدانه درشت با اندازه اسمی حدود 25 mm.', rows: [
    { label: '37.5 mm', sieveSizeMm: 37.5, percentPassing: 100, standardMin: 100, standardMax: 100, status: 'not_checked' },
    { label: '25 mm', sieveSizeMm: 25, percentPassing: 95, standardMin: 90, standardMax: 100, status: 'not_checked' },
    { label: '19 mm', sieveSizeMm: 19, percentPassing: 55, standardMin: 20, standardMax: 55, status: 'not_checked' },
    { label: '12.5 mm', sieveSizeMm: 12.5, percentPassing: 24, standardMin: 0, standardMax: 30, status: 'not_checked' },
    { label: '4.75 mm', sieveSizeMm: 4.75, percentPassing: 4, standardMin: 0, standardMax: 10, status: 'not_checked' }
  ] }
];

export function GradationView(props: { mixDesignId: string | null }) {
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [materialGradations, setMaterialGradations] = useState<GradationMap>({});
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('fine_astm_c33_draft');
  const [rows, setRows] = useState<SieveRow[]>(cloneRows(presets[0].rows));
  const [manualLimitOverride, setManualLimitOverride] = useState(false);
  const [manualBlendEnabled, setManualBlendEnabled] = useState(false);
  const [blendShares, setBlendShares] = useState<AggregateBlendShare[]>([]);
  const [summary, setSummary] = useState<GradationSummary | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const activePreset = presets.find(preset => preset.key === selectedPreset) ?? presets[0];
  const aggregateMaterials = useMemo(() => materials.filter(item => item.materialType === 'fine_aggregate' || item.materialType === 'coarse_aggregate'), [materials]);
  const liveRows = useMemo(() => rows.map(row => ({ ...row, status: classify(row) })), [rows]);
  const totalBlendShare = blendShares.reduce((sum, share) => sum + share.sharePercent, 0);
  const combinedRows = useMemo(() => buildCombinedRows(liveRows, selectedMaterialId, materialGradations, blendShares), [liveRows, selectedMaterialId, materialGradations, blendShares]);
  const blendSuggestions = useMemo(() => buildBlendSuggestions(liveRows, selectedMaterialId, materialGradations, blendShares), [liveRows, selectedMaterialId, materialGradations, blendShares]);
  const liveWarningRows = (combinedRows.length ? combinedRows : liveRows).filter(row => row.status === 'low' || row.status === 'high');
  const missingGradations = blendShares.filter(share => share.sharePercent > 0 && share.materialId !== selectedMaterialId && !(materialGradations[share.materialId]?.length));

  useEffect(() => { void loadMaterials(); }, [props.mixDesignId]);
  useEffect(() => { void loadAggregateGradations(); }, [aggregateMaterials, selectedMaterialId]);
  useEffect(() => { setBlendShares(aggregateMaterials.map((item, index) => ({ materialId: item.id, materialName: item.name, sharePercent: aggregateMaterials.length === 1 ? 100 : index === 0 ? 60 : index === 1 ? 40 : 0 }))); }, [aggregateMaterials]);

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

  async function loadAggregateGradations() {
    if (!window.tolouGradation || aggregateMaterials.length === 0) return;
    const entries = await Promise.all(aggregateMaterials.map(async item => {
      if (item.id === selectedMaterialId) return [item.id, liveRows] as const;
      const result = await window.tolouGradation!.listByMaterial(item.id) as { status: string; rows?: SieveRow[]; error?: string };
      return [item.id, result.rows ?? []] as const;
    }));
    setMaterialGradations(Object.fromEntries(entries));
  }

  function applyPreset(presetKey: PresetKey) {
    const preset = presets.find(item => item.key === presetKey) ?? presets[0];
    setSelectedPreset(preset.key);
    setRows(cloneRows(preset.rows));
    setManualLimitOverride(false);
    setSummary(null);
    setMessage(`Preset «${preset.label}» اعمال شد.`);
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
      setMaterialGradations(previous => ({ ...previous, [selectedMaterialId]: liveRows }));
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

  function applySuggestion(suggestion: BlendSuggestion) {
    setManualBlendEnabled(true);
    setBlendShares(previous => previous.map(share => suggestion.shares.find(item => item.materialId === share.materialId) ?? { ...share, sharePercent: 0 }));
    setMessage('سهم پیشنهادی روی جدول دستی اعمال شد؛ قبل از گزارش نهایی با بچ آزمایشی کنترل شود.');
  }

  return <>
    <section className="titlebar"><div><h2>دانه‌بندی سنگدانه‌ها</h2><p>کنترل هر منبع، سهم دستی، منحنی ترکیبی و پیشنهاد اصلاح اولیه</p></div><div className="toolbar"><button className="btn ghost" onClick={() => applyPreset(selectedPreset)}>بازنشانی Preset</button><button className="btn success" disabled={status === 'saving'} onClick={saveGradation}>{status === 'saving' ? 'در حال ذخیره...' : 'ذخیره و کنترل دانه‌بندی'}</button></div></section>
    {!props.mixDesignId && <div className="alert warn">برای ثبت دانه‌بندی، ابتدا پروژه و مصالح سنگدانه را ذخیره کنید.</div>}
    {props.mixDesignId && aggregateMaterials.length === 0 && <div className="alert warn">برای این طرح هنوز ماسه یا شن ثبت نشده است. ابتدا از بخش مصالح یک سنگدانه اضافه کنید.</div>}
    {manualLimitOverride && <div className="alert info">حالت تغییر دستی حدود دانه‌بندی فعال است؛ این موضوع در خروجی گزارش باید ثبت شود.</div>}
    {manualBlendEnabled && Math.abs(totalBlendShare - 100) > 0.01 && <div className="alert warn">جمع سهم دستی سنگدانه‌ها الان {round2(totalBlendShare)}٪ است و برای ذخیره باید ۱۰۰٪ شود.</div>}
    {manualBlendEnabled && missingGradations.length > 0 && <div className="alert warn">برای محاسبه دقیق منحنی ترکیبی، دانه‌بندی این منابع هم باید ذخیره شود: {missingGradations.map(item => item.materialName).join('، ')}</div>}
    {message && <div className={`alert ${status === 'error' ? 'danger' : 'ok'}`}>{message}</div>}

    <section className="content-grid">
      <article className="panel wide-panel"><div className="panel-head"><div><h3>Preset محدوده دانه‌بندی</h3><span>برای انواع سنگدانه؛ بعداً نسخه نهایی ASTM/ISIRI/EN قابل انتخاب می‌شود</span></div><span className="badge blue">Preset</span></div><div className="panel-body preset-grid">{presets.map(preset => <button className={preset.key === selectedPreset ? 'preset-card active' : 'preset-card'} key={preset.key} onClick={() => applyPreset(preset.key)}><strong>{preset.label}</strong><span>{preset.description}</span></button>)}</div></article>
      <article className="panel wide-panel"><div className="panel-head"><div><h3>کنترل‌های مهندس‌محور</h3><span>حالت دستی مثل تدین؛ همراه با محاسبه زنده منحنی ترکیبی</span></div><span className="badge orange">Manual Control</span></div><div className="panel-body control-strip"><label className="check-control"><input type="checkbox" checked={manualLimitOverride} onChange={event => setManualLimitOverride(event.target.checked)} /><span>فعال‌سازی تغییر دستی حد بالا و پایین</span></label><label className="check-control"><input type="checkbox" checked={manualBlendEnabled} onChange={event => setManualBlendEnabled(event.target.checked)} /><span>فعال‌سازی سهم دستی سنگدانه‌ها</span></label></div></article>
      <article className="panel wide-panel"><div className="panel-head"><div><h3>انتخاب سنگدانه</h3><span>داده‌های جدول برای همین منبع ذخیره می‌شود</span></div><span className="badge blue">ASTM C136</span></div><div className="panel-body form-body"><label className="field full"><span>سنگدانه</span><select value={selectedMaterialId} onChange={event => setSelectedMaterialId(event.target.value)}><option value="">انتخاب کنید</option>{aggregateMaterials.map(item => <option value={item.id} key={item.id}>{item.name} - {item.source}</option>)}</select></label><div className="preset-note"><strong>{activePreset.label}</strong><span>{activePreset.description}</span></div></div></article>
      <article className="panel wide-panel"><div className="panel-head"><div><h3>پیشنهاد خودکار سهم سنگدانه‌ها</h3><span>جست‌وجوی مرحله‌ای ۱۰٪ برای یافتن کمترین خروج از محدوده</span></div><span className="badge blue">Auto Blend</span></div><div className="panel-body tablewrap"><table><thead><tr><th>رتبه</th><th>امتیاز خروج</th><th>هشدار</th><th>ترکیب پیشنهادی</th><th>اعمال</th></tr></thead><tbody>{blendSuggestions.length === 0 && <tr><td colSpan={5}>برای پیشنهاد خودکار، حداقل دو سنگدانه با دانه‌بندی قابل استفاده لازم است.</td></tr>}{blendSuggestions.map((suggestion, index) => <tr key={suggestion.note}><td>{index + 1}</td><td>{round2(suggestion.score)}</td><td>{suggestion.warningCount}</td><td>{suggestion.note}</td><td><button className="btn ghost mini" onClick={() => applySuggestion(suggestion)}>اعمال</button></td></tr>)}</tbody></table></div></article>
      {manualBlendEnabled && <article className="panel wide-panel"><div className="panel-head"><div><h3>سهم دستی سنگدانه‌ها</h3><span>جمع سهم‌ها باید ۱۰۰٪ باشد؛ منحنی ترکیبی بر اساس همین سهم‌ها ساخته می‌شود</span></div><span className={`badge ${Math.abs(totalBlendShare - 100) <= 0.01 ? 'green' : 'red'}`}>جمع: {round2(totalBlendShare)}٪</span></div><div className="panel-body tablewrap"><table><thead><tr><th>مصالح</th><th>سهم دستی %</th><th>وضعیت دانه‌بندی</th></tr></thead><tbody>{blendShares.map(share => <tr key={share.materialId}><td>{share.materialName}</td><td><input className="table-input" type="number" value={share.sharePercent} onChange={event => updateBlendShare(share.materialId, Number(event.target.value))} /></td><td>{share.materialId === selectedMaterialId ? 'داده زنده فرم' : materialGradations[share.materialId]?.length ? 'ذخیره شده' : 'نیاز به ورود'}</td></tr>)}</tbody></table></div></article>}
      <article className="panel wide-panel"><div className="panel-head"><div><h3>نمودار منحنی دانه‌بندی</h3><span>خط بنفش منحنی ترکیبی چند سنگدانه را نشان می‌دهد</span></div><span className="badge orange">Live Chart</span></div><div className="panel-body"><GradationChart rows={liveRows} combinedRows={manualBlendEnabled ? combinedRows : []} /></div></article>
      {manualBlendEnabled && <article className="panel wide-panel"><div className="panel-head"><div><h3>کنترل منحنی ترکیبی</h3><span>هر ردیف با حدود استاندارد preset فعلی مقایسه می‌شود</span></div><span className={`badge ${liveWarningRows.length ? 'orange' : 'green'}`}>{liveWarningRows.length ? `${liveWarningRows.length} هشدار` : 'قبول اولیه'}</span></div><div className="panel-body tablewrap"><table><thead><tr><th>الک</th><th>عبوری ترکیبی</th><th>حد پایین</th><th>حد بالا</th><th>وضعیت</th></tr></thead><tbody>{combinedRows.map(row => <tr key={row.sieveSizeMm}><td>{row.label}</td><td>{round2(row.percentPassing)}٪</td><td>{row.standardMin ?? '-'}</td><td>{row.standardMax ?? '-'}</td><td><span className={`status-pill ${row.status}`}>{statusLabel(row.status)}</span></td></tr>)}</tbody></table></div></article>}
      <article className="panel wide-panel"><div className="panel-head"><div><h3>جدول درصد عبوری الک‌ها</h3><span>{manualLimitOverride ? 'حدود بالا و پایین به‌صورت دستی قابل اصلاح هستند' : 'با تغییر حدود، حالت دستی خودکار فعال می‌شود'}</span></div></div><div className="panel-body tablewrap"><table><thead><tr><th>الک</th><th>اندازه mm</th><th>درصد عبوری</th><th>حد پایین</th><th>حد بالا</th><th>وضعیت</th></tr></thead><tbody>{liveRows.map((row, index) => <tr key={row.sieveSizeMm}><td>{row.label}</td><td>{row.sieveSizeMm}</td><td><input className="table-input" type="number" value={row.percentPassing} onChange={event => updateRow(index, 'percentPassing', Number(event.target.value))} /></td><td><input className="table-input" type="number" value={row.standardMin ?? ''} onChange={event => updateRow(index, 'standardMin', Number(event.target.value))} /></td><td><input className="table-input" type="number" value={row.standardMax ?? ''} onChange={event => updateRow(index, 'standardMax', Number(event.target.value))} /></td><td><span className={`status-pill ${row.status}`}>{statusLabel(row.status)}</span></td></tr>)}</tbody></table></div></article>
      <article className="panel"><div className="panel-head"><div><h3>خلاصه کنترل دانه‌بندی</h3><span>بعد از ذخیره، خلاصه رسمی ثبت می‌شود</span></div></div><div className="panel-body result-grid single-column"><div><label>مدول نرمی اولیه</label><strong>{summary?.finenessModulus ?? '-'}</strong></div><div><label>تعداد ردیف قبول</label><strong>{summary?.passedCount ?? '-'}</strong></div><div><label>تعداد هشدار</label><strong>{summary?.warningCount ?? liveWarningRows.length}</strong></div></div>{summary && <div className="panel-body"><div className="alert info">{summary.recommendation}</div></div>}</article>
      <article className="panel"><div className="panel-head"><div><h3>پیشنهاد اصلاح اولیه</h3><span>بر اساس خروج منحنی انتخابی یا ترکیبی از محدوده</span></div></div><div className="panel-body standards-list">{(summary?.correctionHints ?? buildLiveHints(liveWarningRows, manualBlendEnabled)).map(hint => <div key={hint}>✓ {hint}</div>)}{summary?.manualNotes.map(note => <div key={note}>✓ {note}</div>)}</div></article>
    </section>
  </>;
}

function buildBlendSuggestions(liveRows: SieveRow[], selectedMaterialId: string, materialGradations: GradationMap, blendShares: AggregateBlendShare[]): BlendSuggestion[] {
  const usableShares = blendShares.filter(share => {
    const sourceRows = share.materialId === selectedMaterialId ? liveRows : materialGradations[share.materialId] ?? [];
    return sourceRows.length > 0;
  }).slice(0, 4);
  if (usableShares.length < 2) return [];

  const combinations = enumerateShareCombinations(usableShares.length, 10);
  return combinations.map(values => {
    const shares = usableShares.map((share, index) => ({ ...share, sharePercent: values[index] }));
    const rows = buildCombinedRows(liveRows, selectedMaterialId, materialGradations, shares);
    const score = scoreRows(rows);
    const warningCount = rows.filter(row => row.status === 'low' || row.status === 'high').length;
    const note = shares.filter(share => share.sharePercent > 0).map(share => `${share.materialName}: ${share.sharePercent}٪`).join(' + ');
    return { shares, rows, score, warningCount, note };
  }).sort((a, b) => a.score - b.score || a.warningCount - b.warningCount).slice(0, 5);
}

function enumerateShareCombinations(count: number, step: number) {
  const results: number[][] = [];
  function walk(index: number, remaining: number, current: number[]) {
    if (index === count - 1) { results.push([...current, remaining]); return; }
    for (let value = 0; value <= remaining; value += step) walk(index + 1, remaining - value, [...current, value]);
  }
  walk(0, 100, []);
  return results.filter(values => values.some(value => value > 0));
}

function scoreRows(rows: SieveRow[]) {
  return rows.reduce((score, row) => {
    if (row.standardMin === null || row.standardMax === null) return score;
    if (row.percentPassing < row.standardMin) return score + (row.standardMin - row.percentPassing) ** 2;
    if (row.percentPassing > row.standardMax) return score + (row.percentPassing - row.standardMax) ** 2;
    const center = (row.standardMin + row.standardMax) / 2;
    return score + Math.abs(row.percentPassing - center) * 0.02;
  }, 0);
}

function buildCombinedRows(liveRows: SieveRow[], selectedMaterialId: string, materialGradations: GradationMap, blendShares: AggregateBlendShare[]) {
  const selectedShareIds = blendShares.filter(share => share.sharePercent > 0).map(share => share.materialId);
  if (!selectedShareIds.length) return [];
  return liveRows.map(baseRow => {
    const weightedPassing = blendShares.reduce((sum, share) => {
      if (share.sharePercent <= 0) return sum;
      const sourceRows = share.materialId === selectedMaterialId ? liveRows : materialGradations[share.materialId] ?? [];
      const matched = sourceRows.find(row => row.sieveSizeMm === baseRow.sieveSizeMm);
      return sum + ((matched?.percentPassing ?? 0) * share.sharePercent / 100);
    }, 0);
    const combinedRow = { ...baseRow, percentPassing: round2(weightedPassing) };
    return { ...combinedRow, status: classify(combinedRow) };
  });
}

function cloneRows(rows: SieveRow[]) { return rows.map(row => ({ ...row })); }
function round2(value: number) { return Math.round(value * 100) / 100; }
function classify(row: SieveRow): SieveRow['status'] {
  if (row.standardMin === null || row.standardMax === null) return 'not_checked';
  if (row.percentPassing < row.standardMin) return 'low';
  if (row.percentPassing > row.standardMax) return 'high';
  return 'pass';
}
function buildLiveHints(warningRows: SieveRow[], isCombined: boolean) {
  const target = isCombined ? 'منحنی ترکیبی' : 'منحنی فعلی';
  if (!warningRows.length) return [`${target} در محدوده‌های واردشده است؛ کنترل نهایی با استاندارد پروژه و ریزدانه عبوری از 75 میکرون انجام شود.`];
  return warningRows.map(row => row.status === 'high' ? `عبوری الک ${row.label} در ${target} بالاتر از محدوده است؛ سهم منبع‌های ریزتر باید کاهش یا منبع درشت‌تر اضافه شود.` : `عبوری الک ${row.label} در ${target} پایین‌تر از محدوده است؛ سهم منبع‌های ریزتر یا اصلاحی باید افزایش یابد.`);
}
function statusLabel(status: SieveRow['status']) {
  if (status === 'pass') return 'قبول';
  if (status === 'low') return 'کمتر از حد';
  if (status === 'high') return 'بیشتر از حد';
  return 'کنترل نشده';
}
