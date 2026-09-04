import { useEffect, useMemo, useState } from 'react';

type Material = { id: string; materialType: string; name: string; aggregateRole?: string | null };
type Constraint = { materialId: string; minPercent: number | null; maxPercent: number | null };
type Limit = { sieveSizeMm: number; lowerPercent: number | null; upperPercent: number | null };
type OptimizerState = { enabled: boolean; stepPercent: number; fineShareMinPercent: number | null; fineShareMaxPercent: number | null; constraints: Constraint[]; combinedGradationLimits: Limit[] };

const COMMON_SIEVES = [37.5, 25, 19, 12.5, 9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15, 0.075];
const emptyState: OptimizerState = { enabled: false, stepPercent: 5, fineShareMinPercent: null, fineShareMaxPercent: null, constraints: [], combinedGradationLimits: [] };

export function AggregateBlendOptimizerView({ mixDesignId }: { mixDesignId: string | null }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [state, setState] = useState<OptimizerState>(emptyState);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => { void load(); }, [mixDesignId]);

  async function load() {
    if (!mixDesignId) { setMaterials([]); setState(emptyState); return; }
    setStatus('loading'); setMessage('');
    try {
      if (!window.tolouMaterials || !window.tolouAggregateBlendOptimizer) throw new Error('API تنظیمات Blend Optimizer در Electron در دسترس نیست.');
      const materialResponse = await window.tolouMaterials.listByMixDesign(mixDesignId) as { status: string; materials?: Material[]; error?: string };
      if (materialResponse.status === 'fail') throw new Error(materialResponse.error ?? 'خواندن مصالح ناموفق بود.');
      const aggregateMaterials = (materialResponse.materials ?? []).filter(item => item.materialType === 'fine_aggregate' || item.materialType === 'coarse_aggregate');
      const optimizerResponse = await window.tolouAggregateBlendOptimizer.get(mixDesignId) as { status: string; input?: OptimizerState | null; error?: string };
      if (optimizerResponse.status === 'fail') throw new Error(optimizerResponse.error ?? 'خواندن تنظیمات Optimizer ناموفق بود.');
      const stored = optimizerResponse.input;
      setMaterials(aggregateMaterials);
      setState(stored ? {
        ...stored,
        constraints: aggregateMaterials.map(material => stored.constraints.find(row => row.materialId === material.id) ?? { materialId: material.id, minPercent: null, maxPercent: null }),
      } : { ...emptyState, constraints: aggregateMaterials.map(material => ({ materialId: material.id, minPercent: null, maxPercent: null })) });
      setStatus('idle');
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'خطای ناشناخته'); }
  }

  const constraintTotal = useMemo(() => ({
    min: state.constraints.reduce((sum, row) => sum + (row.minPercent ?? 0), 0),
    max: state.constraints.reduce((sum, row) => sum + (row.maxPercent ?? 100), 0),
  }), [state.constraints]);

  function updateConstraint(materialId: string, key: 'minPercent' | 'maxPercent', value: string) {
    const parsed = value === '' ? null : Number(value);
    setState(previous => ({ ...previous, constraints: previous.constraints.map(row => row.materialId === materialId ? { ...row, [key]: parsed } : row) }));
  }

  function updateLimit(sieveSizeMm: number, key: 'lowerPercent' | 'upperPercent', value: string) {
    const parsed = value === '' ? null : Number(value);
    setState(previous => {
      const existing = previous.combinedGradationLimits.find(row => row.sieveSizeMm === sieveSizeMm) ?? { sieveSizeMm, lowerPercent: null, upperPercent: null };
      const next = { ...existing, [key]: parsed };
      const rest = previous.combinedGradationLimits.filter(row => row.sieveSizeMm !== sieveSizeMm);
      return { ...previous, combinedGradationLimits: [...rest, next].sort((a, b) => b.sieveSizeMm - a.sieveSizeMm) };
    });
  }

  async function save() {
    if (!mixDesignId) { setStatus('error'); setMessage('ابتدا یک طرح اختلاط ذخیره‌شده را انتخاب کنید.'); return; }
    setStatus('saving'); setMessage('');
    try {
      if (!window.tolouAggregateBlendOptimizer) throw new Error('API ذخیره Blend Optimizer در دسترس نیست.');
      const result = await window.tolouAggregateBlendOptimizer.save({ mixDesignId, ...state }) as { status: string; error?: string };
      if (result.status !== 'pass') throw new Error(result.error ?? 'ذخیره تنظیمات ناموفق بود.');
      setStatus('saved'); setMessage('تنظیمات Blend Optimizer ذخیره شد و در محاسبه بعدی طرح اعمال می‌شود.');
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'خطای ناشناخته'); }
  }

  if (!mixDesignId) return <section className="panel"><h2>Blend Optimizer سنگدانه</h2><div className="alert warning">برای تنظیم Optimizer ابتدا یک طرح اختلاط ذخیره یا انتخاب کنید.</div></section>;

  return <section className="panel">
    <div className="titlebar"><div><h2>Blend Optimizer سنگدانه</h2><p>تعریف محدودیت سهم منابع و Envelope مستقل منحنی ترکیبی؛ بدون interpolation پنهان و با الزام Trial Mix.</p></div><button className="btn primary" disabled={status === 'saving'} onClick={save}>{status === 'saving' ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}</button></div>
    {message && <div className={`alert ${status === 'error' ? 'danger' : 'success'}`}>{message}</div>}

    <div className="form-grid">
      <label className="field"><span>فعال‌سازی Auto Optimizer</span><select value={state.enabled ? 'yes' : 'no'} onChange={event => setState(previous => ({ ...previous, enabled: event.target.value === 'yes' }))}><option value="no">غیرفعال — سهم دستی/ACI حفظ شود</option><option value="yes">فعال — Candidateهای رتبه‌بندی‌شده تولید شود</option></select></label>
      <label className="field"><span>گام جست‌وجو (%)</span><select value={state.stepPercent} onChange={event => setState(previous => ({ ...previous, stepPercent: Number(event.target.value) }))}><option value={10}>10</option><option value={5}>5</option><option value={2.5}>2.5</option><option value={2}>2</option><option value={1}>1</option><option value={0.5}>0.5</option></select></label>
      <label className="field"><span>حداقل سهم Fine Aggregate (%)</span><input type="number" min="0" max="100" step="0.1" value={state.fineShareMinPercent ?? ''} onChange={event => setState(previous => ({ ...previous, fineShareMinPercent: event.target.value === '' ? null : Number(event.target.value) }))} /></label>
      <label className="field"><span>حداکثر سهم Fine Aggregate (%)</span><input type="number" min="0" max="100" step="0.1" value={state.fineShareMaxPercent ?? ''} onChange={event => setState(previous => ({ ...previous, fineShareMaxPercent: event.target.value === '' ? null : Number(event.target.value) }))} /></label>
    </div>

    <h3>محدودیت سهم هر منبع</h3>
    <div className="table-wrap"><table><thead><tr><th>منبع</th><th>نوع</th><th>Min %</th><th>Max %</th></tr></thead><tbody>{materials.map(material => { const row = state.constraints.find(item => item.materialId === material.id); return <tr key={material.id}><td>{material.name}</td><td>{material.materialType === 'fine_aggregate' ? 'Fine' : 'Coarse'}</td><td><input type="number" min="0" max="100" step="0.1" value={row?.minPercent ?? ''} onChange={event => updateConstraint(material.id, 'minPercent', event.target.value)} /></td><td><input type="number" min="0" max="100" step="0.1" value={row?.maxPercent ?? ''} onChange={event => updateConstraint(material.id, 'maxPercent', event.target.value)} /></td></tr>; })}</tbody></table></div>
    <p className={constraintTotal.min > 100 || constraintTotal.max < 100 ? 'alert danger' : 'muted'}>جمع Min = {constraintTotal.min.toFixed(1)}٪ | ظرفیت Max = {constraintTotal.max.toFixed(1)}٪ {constraintTotal.min > 100 || constraintTotal.max < 100 ? '— قیود فعلی نمی‌توانند یک Blend صددرصدی بسازند.' : ''}</p>

    <h3>Combined Gradation Envelope</h3>
    <p className="muted">این حدود مستقل از حدود دانه‌بندی تک‌منبع هستند. خالی گذاشتن یک الک یعنی برای آن الک Criterion پروژه تعریف نشده است.</p>
    <div className="table-wrap"><table><thead><tr><th>الک (mm)</th><th>Lower % Passing</th><th>Upper % Passing</th></tr></thead><tbody>{COMMON_SIEVES.map(sieve => { const row = state.combinedGradationLimits.find(item => item.sieveSizeMm === sieve); return <tr key={sieve}><td>{sieve}</td><td><input type="number" min="0" max="100" step="0.1" value={row?.lowerPercent ?? ''} onChange={event => updateLimit(sieve, 'lowerPercent', event.target.value)} /></td><td><input type="number" min="0" max="100" step="0.1" value={row?.upperPercent ?? ''} onChange={event => updateLimit(sieve, 'upperPercent', event.target.value)} /></td></tr>; })}</tbody></table></div>

    <div className="note"><b>محدودیت مهندسی:</b> Optimizer فقط Candidateها را با معیارهای ثبت‌شده پروژه رتبه‌بندی می‌کند. Score معادل Packing Density یا تأیید Pumpability نیست و ترکیب منتخب باید با Trial Mix و کنترل آزمایشگاهی تأیید شود.</div>
  </section>;
}
