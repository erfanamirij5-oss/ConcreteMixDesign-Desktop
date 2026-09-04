import { useMemo } from 'react';

type CombinedCurveRow = { sieve_size_mm?: number; percent_passing?: number };
type SourceShareRow = { material_id?: string; name?: string; material_name?: string; share_percent?: number };
type WarningRow = { code?: string; severity?: string; message?: string };
type CombinedAggregateSystem = {
  status?: string;
  share_basis?: string;
  share_total_percent?: number;
  fine_aggregate_share_percent?: number;
  coarse_aggregate_share_percent?: number;
  common_sieve_count?: number;
  source_shares?: SourceShareRow[];
  combined_curve?: CombinedCurveRow[];
  continuity?: {
    zero_retained_interval_count?: number;
    nonmonotonic_interval_count?: number;
  };
  packing?: { status?: string; note?: string; message?: string };
  pumpability?: { status?: string; pumped_concrete?: boolean; messages?: string[]; message?: string };
  warnings?: WarningRow[];
};
type OptimizerCandidate = {
  score?: number;
  shares?: SourceShareRow[];
  fine_aggregate_share_percent?: number;
  coarse_aggregate_share_percent?: number;
  combined_curve?: CombinedCurveRow[];
  metrics?: {
    combined_limit_failure_count?: number;
    zero_retained_interval_count?: number;
    low_retained_interval_count?: number;
    envelope_penalty?: number;
    continuity_penalty?: number;
    fine_share_penalty?: number;
  };
};
type AggregateBlendOptimizer = {
  status?: string;
  search_step_percent?: number | null;
  evaluated_candidate_count?: number;
  estimated_candidate_count?: number;
  candidate_limit?: number | null;
  common_sieve_count?: number;
  constraints_applied?: boolean;
  combined_limits_applied?: boolean;
  candidates?: OptimizerCandidate[];
  warnings?: WarningRow[];
  note?: string;
};

export function AggregateBlendResults(props: { combined?: CombinedAggregateSystem; optimizer?: AggregateBlendOptimizer }) {
  const combined = props.combined;
  const optimizer = props.optimizer;
  const candidates = optimizer?.candidates ?? [];
  const best = candidates[0];
  const combinedRows = combined?.combined_curve ?? [];
  const curveSummary = useMemo(() => combinedRows.slice(0, 12), [combinedRows]);
  const pumpMessages = combined?.pumpability?.messages ?? (combined?.pumpability?.message ? [combined.pumpability.message] : []);
  const packingNote = combined?.packing?.note ?? combined?.packing?.message;

  if (!combined && !optimizer) return null;

  return <>
    {combined && <article className="panel wide-panel"><div className="panel-head"><div><h3>Combined Aggregate Skeleton</h3><span>منحنی واقعی حاصل از سهم منابع فعال؛ فقط روی الک‌های مشترک و بدون interpolation پنهان</span></div><span className={`badge ${combined.status === 'pass' ? 'green' : combined.status === 'fail' ? 'red' : 'orange'}`}>{combined.status ?? 'needs_review'}</span></div><div className="panel-body">
      <div className="result-grid"><div><label>مبنای سهم</label><strong>{combined.share_basis ?? '-'}</strong></div><div><label>جمع سهم‌ها</label><strong>{value(combined.share_total_percent)}%</strong></div><div><label>Fine Aggregate</label><strong>{value(combined.fine_aggregate_share_percent)}%</strong></div><div><label>Coarse Aggregate</label><strong>{value(combined.coarse_aggregate_share_percent)}%</strong></div><div><label>الک‌های مشترک</label><strong>{value(combined.common_sieve_count)}</strong></div><div><label>Gap صفر</label><strong>{value(combined.continuity?.zero_retained_interval_count)}</strong></div><div><label>Non-monotonic</label><strong>{value(combined.continuity?.nonmonotonic_interval_count)}</strong></div></div>
      <div className="table-wrap"><table><thead><tr><th>منبع</th><th>سهم %</th></tr></thead><tbody>{(combined.source_shares ?? []).map((row, index) => <tr key={row.material_id ?? index}><td>{sourceName(row, index)}</td><td>{value(row.share_percent)}</td></tr>)}</tbody></table></div>
      {curveSummary.length > 0 && <div className="table-wrap"><table><thead><tr><th>الک mm</th><th>Combined Passing %</th></tr></thead><tbody>{curveSummary.map((row, index) => <tr key={`${row.sieve_size_mm}-${index}`}><td>{value(row.sieve_size_mm)}</td><td>{value(row.percent_passing)}</td></tr>)}</tbody></table></div>}
      {pumpMessages.length > 0 && <div className={`alert ${combined.pumpability?.status === 'needs_review' || combined.pumpability?.status === 'fail' ? 'danger' : 'warn'}`}><b>Pumpability:</b> {pumpMessages.join(' ')}</div>}
      {packingNote && <div className="alert info"><b>Packing:</b> {packingNote}</div>}
      <Warnings rows={combined.warnings} />
    </div></article>}

    {optimizer && <article className="panel wide-panel"><div className="panel-head"><div><h3>Aggregate Blend Optimizer</h3><span>رتبه‌بندی Candidateهای 100٪ با قیود پروژه و الزام Trial Mix</span></div><span className={`badge ${optimizer.status === 'pass' ? 'green' : optimizer.status === 'disabled' ? 'blue' : optimizer.status === 'fail' ? 'red' : 'orange'}`}>{optimizer.status ?? '-'}</span></div><div className="panel-body">
      <div className="result-grid"><div><label>Search Step</label><strong>{value(optimizer.search_step_percent)}%</strong></div><div><label>Candidate ارزیابی‌شده</label><strong>{value(optimizer.evaluated_candidate_count)}</strong></div><div><label>Candidate برآوردشده</label><strong>{value(optimizer.estimated_candidate_count)}</strong></div><div><label>سقف ایمن جست‌وجو</label><strong>{value(optimizer.candidate_limit)}</strong></div><div><label>الک مشترک</label><strong>{value(optimizer.common_sieve_count)}</strong></div><div><label>Source Constraints</label><strong>{optimizer.constraints_applied ? 'فعال' : 'ثبت نشده'}</strong></div><div><label>Combined Envelope</label><strong>{optimizer.combined_limits_applied ? 'فعال' : 'ثبت نشده'}</strong></div></div>
      {best && <div className="alert ok"><b>Candidate اول:</b> Score {value(best.score)} | Fine {value(best.fine_aggregate_share_percent)}٪ | Coarse {value(best.coarse_aggregate_share_percent)}٪</div>}
      {candidates.length > 0 && <div className="table-wrap"><table><thead><tr><th>رتبه</th><th>Score</th><th>ترکیب منابع</th><th>Envelope Fail</th><th>Zero Gap</th><th>Low Gap</th></tr></thead><tbody>{candidates.map((candidate, index) => <tr key={index}><td>{index + 1}</td><td>{value(candidate.score)}</td><td>{(candidate.shares ?? []).map((row, shareIndex) => `${sourceName(row, shareIndex)}: ${value(row.share_percent)}%`).join(' | ')}</td><td>{value(candidate.metrics?.combined_limit_failure_count)}</td><td>{value(candidate.metrics?.zero_retained_interval_count)}</td><td>{value(candidate.metrics?.low_retained_interval_count)}</td></tr>)}</tbody></table></div>}
      <Warnings rows={optimizer.warnings} />
      <div className="note"><b>محدودیت مهندسی:</b> {optimizer.note ?? 'Score فقط برای مقایسه Candidateها است و جایگزین Packing Density، Pumpability acceptance یا Trial Mix نیست.'}</div>
    </div></article>}
  </>;
}

function Warnings({ rows }: { rows?: WarningRow[] }) {
  if (!rows?.length) return null;
  return <div>{rows.map((row, index) => <div className={`alert ${row.severity === 'fail' ? 'danger' : 'warn'}`} key={`${row.code ?? 'warning'}-${index}`}><b>{row.code ?? 'Engineering warning'}:</b> {row.message ?? '-'}</div>)}</div>;
}

function sourceName(row: SourceShareRow, index: number) {
  return row.name ?? row.material_name ?? row.material_id ?? `منبع ${index + 1}`;
}

function value(input: number | null | undefined) { return input === null || input === undefined ? '-' : String(input); }
