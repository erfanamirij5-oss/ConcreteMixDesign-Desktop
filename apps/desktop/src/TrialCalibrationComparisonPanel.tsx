import { useEffect, useState } from 'react';

type Interpretation = 'actual_above_design' | 'actual_below_design' | 'matches_design' | 'not_comparable';

type CalibrationMetric = {
  metric: string;
  unit: string;
  designedValue: number | null;
  actualValue: number | null;
  absoluteDelta: number | null;
  relativeDeltaPercent: number | null;
  interpretation: Interpretation;
};

type CalibrationBatch = {
  batchId: string;
  batchSequence: number;
  batchQuantityM3: number;
  metrics: CalibrationMetric[];
};

type CalibrationResponse = {
  method: {
    version: string;
    scope: string;
    batchNormalization: string;
    rawBatchedWCm: string;
    recommendationEngineApplied: boolean;
    acceptanceCriteriaApplied: boolean;
  };
  session: {
    id: string;
    mixDesignId: string;
    revisionNumber: number;
    sessionCode: string;
    status: string;
  };
  design: {
    resultId: string;
    cementitiousKgM3: number | null;
    waterKgM3: number | null;
    wCmRatio: number | null;
    fineAggregateKgM3: number | null;
    coarseAggregateKgM3: number | null;
    airPercent: number | null;
  };
  batches: CalibrationBatch[];
};

type Props = {
  sessionId: string;
  refreshKey?: string | number;
};

const metricLabel: Record<string, string> = {
  cementitious_content: 'Cementitious',
  water_content_raw_batched: 'Water (raw batched)',
  w_cm_ratio_raw_batched: 'w/cm (raw batched)',
  fine_aggregate: 'Fine aggregate',
  coarse_aggregate: 'Coarse aggregate',
  air_content: 'Air content'
};

const interpretationLabel: Record<Interpretation, string> = {
  actual_above_design: 'Actual > Design',
  actual_below_design: 'Actual < Design',
  matches_design: 'Matches design',
  not_comparable: 'Not comparable'
};

function value(input: number | null, unit?: string) {
  return input == null ? '—' : `${Number(input).toFixed(3)}${unit ? ` ${unit}` : ''}`;
}

export function TrialCalibrationComparisonPanel(props: Props) {
  const [data, setData] = useState<CalibrationResponse | null>(null);
  const [state, setState] = useState<'loading' | 'idle' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [manualRefresh, setManualRefresh] = useState(0);

  useEffect(() => {
    const sessionId = props.sessionId;
    let cancelled = false;
    void (async () => {
      setState('loading');
      setMessage('');
      try {
        if (!window.tolouTrialMixV2?.getCalibrationComparison) throw new Error('API مقایسه Calibration در دسترس نیست.');
        const response = await window.tolouTrialMixV2.getCalibrationComparison(sessionId) as { status?: string; calibration?: CalibrationResponse; error?: string };
        if (response.status !== 'pass' || !response.calibration) throw new Error(response.error ?? 'خواندن Calibration ناموفق بود.');
        if (!cancelled) {
          setData(response.calibration);
          setState('idle');
        }
      } catch (error) {
        if (!cancelled) {
          setData(null);
          setState('error');
          setMessage(error instanceof Error ? error.message : 'خطا در خواندن Calibration');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [props.sessionId, props.refreshKey, manualRefresh]);

  return <section className="content-grid" aria-label="Trial Mix calibration comparison">
    <article className="panel wide-panel">
      <div className="panel-head">
        <div><h3>Designed vs Actual Calibration</h3><span>Descriptive comparison only — no acceptance criteria or recommendations</span></div>
        <div className="toolbar">
          <span className="badge blue">{data?.batches.length ?? 0} batches</span>
          <button className="btn" disabled={state === 'loading'} onClick={() => setManualRefresh(value => value + 1)}>{state === 'loading' ? 'در حال بروزرسانی...' : 'بروزرسانی Calibration'}</button>
        </div>
      </div>
      <div className="panel-body">
        {message && <div className="alert danger" aria-live="polite">{message}</div>}
        {state === 'loading' ? <div className="alert warn">در حال محاسبه مقایسه Design و Trial...</div> : null}
        {data ? <>
          <div className="form-grid">
            <div><b>Method:</b> {data.method.version}</div>
            <div><b>Revision:</b> {data.session.revisionNumber}</div>
            <div><b>Recommendation engine:</b> خیر</div>
            <div><b>Acceptance criteria:</b> خیر</div>
          </div>
          <div className="alert warn">w/cm این نسخه فقط از آب بچ‌شده خام و مجموع Cement + SCM محاسبه می‌شود؛ اصلاح رطوبت/جذب هنوز اعمال نشده است.</div>
        </> : null}
      </div>

      <div className="table-wrap">
        <table>
          <caption className="sr-only">مقایسه مقادیر طراحی‌شده و واقعی Trial Mix</caption>
          <thead><tr><th scope="col">Batch</th><th scope="col">Metric</th><th scope="col">Design</th><th scope="col">Actual</th><th scope="col">Δ</th><th scope="col">Δ %</th><th scope="col">Interpretation</th></tr></thead>
          <tbody>
            {!data || data.batches.length === 0 ? <tr><td colSpan={7}>Batch قابل مقایسه‌ای وجود ندارد.</td></tr> : data.batches.flatMap(batch => batch.metrics.map((metric, index) => <tr key={`${batch.batchId}:${metric.metric}`}>
              <td>{index === 0 ? `B${batch.batchSequence} · ${batch.batchQuantityM3} m³` : ''}</td>
              <td>{metricLabel[metric.metric] ?? metric.metric}</td>
              <td>{value(metric.designedValue, metric.unit)}</td>
              <td>{value(metric.actualValue, metric.unit)}</td>
              <td>{value(metric.absoluteDelta, metric.unit)}</td>
              <td>{metric.relativeDeltaPercent == null ? '—' : `${Number(metric.relativeDeltaPercent).toFixed(2)} %`}</td>
              <td>{interpretationLabel[metric.interpretation]}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </article>
  </section>;
}
