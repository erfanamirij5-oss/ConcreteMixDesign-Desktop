import { useEffect, useState } from 'react';

type RevisionRow = { revisionNumber?: number; revision_number?: number };
type Stats = { count: number; mean: number | null; sampleStandardDeviation: number | null; sampleCoefficientOfVariationPercent: number | null };
type AnalyticsPoint = { revisionNumber?: number };
type Analytics = {
  status?: string;
  overall?: Stats;
  byRevision?: Array<{ revisionNumber: number; statistics: Stats }>;
  points?: AnalyticsPoint[];
  method?: { version?: string; acceptanceCriteriaApplied?: boolean; passFailApplied?: boolean; standardComplianceInferred?: boolean };
  error?: string;
};
type CostInputSet = { id: string; currency: string; effectiveAt: string; sourceReference?: string | null };
type CostResult = { status?: string; revisionNumber?: number; totalCostPerM3?: number; currency?: string; complete?: boolean; missingCostRoles?: string[]; missingQuantityRoles?: string[]; methodVersion?: string; error?: string };
type Batch = { id: string; revisionNumber: number };

const fmt = (value: number | null | undefined, digits = 2) => value == null ? '—' : new Intl.NumberFormat('fa-IR', { maximumFractionDigits: digits }).format(value);
const boolLabel = (value: boolean | undefined) => value === true ? 'TRUE' : value === false ? 'FALSE' : 'UNSPECIFIED';

export function EngineeringDecisionSummaryPanel({ mixDesignId }: { mixDesignId: string | null }) {
  const [revision, setRevision] = useState<number | null>(null);
  const [batchCount, setBatchCount] = useState(0);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [cost, setCost] = useState<CostResult | null>(null);
  const [costInput, setCostInput] = useState<CostInputSet | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { void refresh(); }, [mixDesignId]);

  async function refresh() {
    setRevision(null); setBatchCount(0); setAnalytics(null); setCost(null); setCostInput(null); setError('');
    if (!mixDesignId) return;
    setBusy(true);
    try {
      const revisionsRaw = await window.tolouMixDesigns?.listRevisions(mixDesignId) as { status?: string; revisions?: RevisionRow[]; error?: string } | undefined;
      if (!revisionsRaw || revisionsRaw.status !== 'pass') throw new Error(revisionsRaw?.error ?? 'خواندن Revision جاری ناموفق بود.');
      const revisions = (revisionsRaw.revisions ?? []).map(item => Number(item.revisionNumber ?? item.revision_number)).filter(Number.isInteger);
      const currentRevision = revisions.length ? Math.max(...revisions) : null;
      setRevision(currentRevision);

      const [batchesRaw, analyticsRaw] = await Promise.all([
        window.tolouProductionQc?.listBatches(mixDesignId),
        window.tolouProductionQc?.getStrengthAnalytics(mixDesignId)
      ]);
      const batches = batchesRaw as { status?: string; batches?: Batch[] } | undefined;
      if (batches?.status === 'pass') setBatchCount((batches.batches ?? []).filter(item => currentRevision == null || Number(item.revisionNumber) === currentRevision).length);
      const strength = analyticsRaw as Analytics | undefined;
      if (strength?.status === 'pass') setAnalytics(strength);

      if (currentRevision != null && window.tolouCostEngine) {
        const inputsRaw = await window.tolouCostEngine.listInputSets(mixDesignId, currentRevision) as { status?: string; inputSets?: CostInputSet[]; error?: string };
        if (inputsRaw.status === 'pass' && (inputsRaw.inputSets ?? []).length) {
          const input = (inputsRaw.inputSets ?? [])[0];
          setCostInput(input);
          const calculated = await window.tolouCostEngine.calculateRevision(mixDesignId, currentRevision, input.id) as CostResult;
          if (calculated.status === 'pass') setCost(calculated);
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'خطا در Engineering Decision Summary');
    } finally { setBusy(false); }
  }

  if (!mixDesignId) return null;
  const revisionStats = revision == null
    ? undefined
    : analytics?.byRevision?.find(item => Number(item.revisionNumber) === revision)?.statistics;
  const evidenceCount = revision == null
    ? 0
    : (analytics?.points ?? []).filter(point => Number(point.revisionNumber) === revision).length || revisionStats?.count || 0;
  const stats = revisionStats;
  const method = analytics?.method;
  const methodGuardClear = method != null
    && method.acceptanceCriteriaApplied === false
    && method.passFailApplied === false
    && method.standardComplianceInferred === false;

  return <section className="panel form-panel">
    <div className="panel-head"><div><h3>Engineering Decision Summary</h3><span>Read-only factual synthesis · revision-scoped · no recommendation · no acceptance inference</span></div><button className="btn" disabled={busy} onClick={() => void refresh()}>{busy ? 'در حال بروزرسانی...' : 'بروزرسانی'}</button></div>
    <div className="panel-body">
      {error && <div className="alert danger">{error}</div>}
      {analytics && !methodGuardClear && <div className="alert danger">قرارداد روش Analytics به‌صورت صریح non-acceptance تأیید نشده است. این پنل هیچ نتیجه قبولی/ردی یا compliance از این داده استنتاج نمی‌کند.</div>}
      <div className="manager-summary-grid">
        <div><small>Revision جاری</small><strong>{revision == null ? '—' : `R${revision}`}</strong></div>
        <div><small>Production Batchهای Revision جاری</small><strong>{fmt(batchCount, 0)}</strong></div>
        <div><small>نتایج مقاومت Revision جاری</small><strong>{fmt(evidenceCount, 0)}</strong></div>
        <div><small>میانگین مقاومت Revision جاری</small><strong>{stats?.mean == null ? '—' : `${fmt(stats.mean)} MPa`}</strong></div>
        <div><small>Sample CV — Revision جاری</small><strong>{stats?.sampleCoefficientOfVariationPercent == null ? '—' : `${fmt(stats.sampleCoefficientOfVariationPercent)}%`}</strong></div>
        <div><small>هزینه Revision جاری</small><strong>{cost?.totalCostPerM3 == null ? '—' : `${fmt(cost.totalCostPerM3)} ${cost.currency ?? ''}/m³`}</strong></div>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Signal</th><th>Observed state</th><th>Traceability</th></tr></thead><tbody>
        <tr><td>Production evidence</td><td>{batchCount > 0 ? `${batchCount} Batch موجود` : 'Batch ثبت نشده'}</td><td>{revision == null ? 'No current revision' : `Revision R${revision} persisted records`}</td></tr>
        <tr><td>Strength evidence</td><td>{evidenceCount > 0 ? `${evidenceCount} نتیجه · Mean ${fmt(stats?.mean)} MPa` : 'نتیجه مقاومت برای Revision جاری ثبت نشده'}</td><td>{analytics?.method?.version ?? 'Production QC analytics'} · revision-scoped</td></tr>
        <tr><td>Cost evidence</td><td>{cost ? `${cost.complete ? 'Complete' : 'Partial'} · ${fmt(cost.totalCostPerM3)} ${cost.currency ?? ''}/m³` : 'Cost Input Set قابل محاسبه موجود نیست'}</td><td>{costInput ? `${costInput.sourceReference || cost?.methodVersion || 'بدون مرجع'} · effective ${new Date(costInput.effectiveAt).toLocaleDateString('fa-IR')}` : '—'}</td></tr>
        <tr><td>Analytics policy guard</td><td>{methodGuardClear ? 'Non-acceptance contract confirmed' : 'Contract not explicitly confirmed'}</td><td>acceptance={boolLabel(method?.acceptanceCriteriaApplied)} · pass/fail={boolLabel(method?.passFailApplied)} · compliance={boolLabel(method?.standardComplianceInferred)}</td></tr>
      </tbody></table></div>
      {cost && !cost.complete && <div className="alert warn">Cost coverage ناقص است. Missing cost roles: {(cost.missingCostRoles ?? []).join('، ') || '—'} | Missing quantity roles: {(cost.missingQuantityRoles ?? []).join('، ') || '—'}</div>}
      <div className="alert info">این پنل فقط شواهد Revision جاری را تجمیع می‌کند. Acceptance criteria، Pass/Fail، استاندارد compliance و recommendation engine اعمال نشده است.</div>
    </div>
  </section>;
}
