import { useEffect, useMemo, useState } from 'react';

type StrengthStatistics = {
  count: number;
  minimumMpa: number | null;
  maximumMpa: number | null;
  meanMpa: number | null;
  populationStandardDeviationMpa: number | null;
  sampleStandardDeviationMpa: number | null;
  sampleCoefficientOfVariationPercent: number | null;
};

type StrengthAgeGroup = StrengthStatistics & {
  testAgeDays: number;
};

type StrengthAnalyticsPoint = {
  resultId: string;
  specimenId: string;
  specimenCode: string;
  batchId: string;
  batchSequence: number;
  testedAt: string;
  testAgeDays: number;
  strengthMpa: number;
};

type StrengthAnalytics = {
  session: {
    id: string;
    mixDesignId: string;
    revisionNumber: number;
    sessionCode: string;
    status: string;
  };
  method: {
    version: string;
    populationStandardDeviation: string;
    sampleStandardDeviation: string;
    sampleCoefficientOfVariationPercent: string;
    acceptanceCriteriaApplied: boolean;
  };
  overall: StrengthStatistics;
  byTestAge: StrengthAgeGroup[];
  points: StrengthAnalyticsPoint[];
};

type Props = {
  sessionId: string | null;
  refreshKey?: string | number;
};

function value(value: number | null, suffix = '') {
  return value == null ? '-' : `${Number(value).toFixed(2)}${suffix}`;
}

export function TrialStrengthAnalyticsPanel(props: Props) {
  const [analytics, setAnalytics] = useState<StrengthAnalytics | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!props.sessionId) {
      setAnalytics(null);
      setState('idle');
      setMessage('');
      return;
    }

    let cancelled = false;
    void (async () => {
      setState('loading');
      setMessage('');
      try {
        if (!window.tolouTrialMixV2?.getStrengthAnalytics) throw new Error('API تحلیل مقاومت Trial Mix v2 در دسترس نیست.');
        const response = await window.tolouTrialMixV2.getStrengthAnalytics(props.sessionId) as { status?: string; analytics?: StrengthAnalytics; error?: string };
        if (response.status !== 'pass' || !response.analytics) throw new Error(response.error ?? 'خواندن تحلیل مقاومت ناموفق بود.');
        if (!cancelled) {
          setAnalytics(response.analytics);
          setState('idle');
        }
      } catch (error) {
        if (!cancelled) {
          setAnalytics(null);
          setState('error');
          setMessage(error instanceof Error ? error.message : 'خطا در خواندن تحلیل مقاومت');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [props.sessionId, props.refreshKey]);

  const trendPoints = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.points].sort((left, right) => {
      if (left.testAgeDays !== right.testAgeDays) return left.testAgeDays - right.testAgeDays;
      return Date.parse(left.testedAt) - Date.parse(right.testedAt);
    });
  }, [analytics]);

  const maxStrength = useMemo(() => trendPoints.reduce((max, point) => Math.max(max, Number(point.strengthMpa)), 0), [trendPoints]);

  if (!props.sessionId) {
    return <section className="content-grid"><article className="panel wide-panel"><div className="panel-head"><div><h3>Strength Analytics</h3><span>Descriptive laboratory analytics</span></div></div><div className="panel-body"><div className="alert warn">برای مشاهده تحلیل، ابتدا یک Trial Session را باز کنید.</div></div></article></section>;
  }

  return <>
    <div aria-live="polite" aria-atomic="true">{message && <div className="alert danger">{message}</div>}</div>
    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-head">
          <div><h3>Strength Analytics</h3><span>Read-only descriptive statistics — no acceptance criteria</span></div>
          <span className="badge blue">{analytics?.overall.count ?? 0} results</span>
        </div>
        <div className="panel-body">
          {state === 'loading' ? <div className="alert warn">در حال محاسبه آمار مقاومت...</div> : !analytics ? <div className="alert warn">داده تحلیلی در دسترس نیست.</div> : <>
            <div className="form-grid">
              <div><b>Mean:</b> {value(analytics.overall.meanMpa, ' MPa')}</div>
              <div><b>Min:</b> {value(analytics.overall.minimumMpa, ' MPa')}</div>
              <div><b>Max:</b> {value(analytics.overall.maximumMpa, ' MPa')}</div>
              <div><b>Population SD:</b> {value(analytics.overall.populationStandardDeviationMpa, ' MPa')}</div>
              <div><b>Sample SD:</b> {value(analytics.overall.sampleStandardDeviationMpa, ' MPa')}</div>
              <div><b>Sample CV:</b> {value(analytics.overall.sampleCoefficientOfVariationPercent, ' %')}</div>
            </div>
            <p><b>Method:</b> {analytics.method.version}</p>
            <p><b>Acceptance criteria applied:</b> خیر</p>
          </>}
        </div>
      </article>
    </section>

    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-head"><div><h3>Strength by Test Age</h3><span>Grouped descriptive statistics</span></div><span className="badge blue">{analytics?.byTestAge.length ?? 0}</span></div>
        <div className="table-wrap"><table><caption className="sr-only">آمار مقاومت فشاری بر حسب سن آزمون</caption><thead><tr><th scope="col">Age day</th><th scope="col">n</th><th scope="col">Mean MPa</th><th scope="col">Min</th><th scope="col">Max</th><th scope="col">Sample SD</th><th scope="col">Sample CV %</th></tr></thead><tbody>{!analytics || analytics.byTestAge.length === 0 ? <tr><td colSpan={7}>هنوز داده کافی برای گروه‌بندی سنی وجود ندارد.</td></tr> : analytics.byTestAge.map(group => <tr key={group.testAgeDays}><td>{group.testAgeDays}</td><td>{group.count}</td><td>{value(group.meanMpa)}</td><td>{value(group.minimumMpa)}</td><td>{value(group.maximumMpa)}</td><td>{value(group.sampleStandardDeviationMpa)}</td><td>{value(group.sampleCoefficientOfVariationPercent)}</td></tr>)}</tbody></table></div>
      </article>
    </section>

    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-head"><div><h3>Compressive Strength Trend</h3><span>Raw traceable points ordered by test age</span></div><span className="badge blue">{trendPoints.length}</span></div>
        <div className="panel-body">
          {trendPoints.length === 0 ? <div className="alert warn">هنوز نتیجه مقاومت فشاری ثبت نشده است.</div> : <div style={{ display: 'grid', gap: 8 }} aria-label="Strength trend plot">
            {trendPoints.map(point => {
              const width = maxStrength > 0 ? Math.max(2, Math.min(100, Number(point.strengthMpa) / maxStrength * 100)) : 2;
              return <div key={point.resultId} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px', gap: 10, alignItems: 'center' }}>
                <span>{point.testAgeDays} d · B{point.batchSequence}</span>
                <div style={{ border: '1px solid currentColor', borderRadius: 6, overflow: 'hidden', minHeight: 16 }}><div style={{ width: `${width}%`, minHeight: 16, background: 'currentColor', opacity: 0.28 }} /></div>
                <strong>{Number(point.strengthMpa).toFixed(2)} MPa</strong>
              </div>;
            })}
          </div>}
        </div>
        <div className="table-wrap"><table><caption className="sr-only">نقاط خام روند مقاومت فشاری</caption><thead><tr><th scope="col">Age</th><th scope="col">Batch</th><th scope="col">Specimen</th><th scope="col">Tested At</th><th scope="col">Strength MPa</th></tr></thead><tbody>{trendPoints.length === 0 ? <tr><td colSpan={5}>داده‌ای موجود نیست.</td></tr> : trendPoints.map(point => <tr key={point.resultId}><td>{point.testAgeDays}</td><td>{point.batchSequence}</td><td>{point.specimenCode}</td><td>{point.testedAt}</td><td>{Number(point.strengthMpa).toFixed(2)}</td></tr>)}</tbody></table></div>
      </article>
    </section>
  </>;
}
