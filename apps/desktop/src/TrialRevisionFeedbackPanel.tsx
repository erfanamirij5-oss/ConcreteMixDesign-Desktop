import { useEffect, useState } from 'react';

type FeedbackObservation = {
  code: string;
  category: 'calibration' | 'moisture' | 'strength' | 'completeness';
  severity: 'info' | 'warning';
  message: string;
  sourceIds: string[];
};

type RevisionFeedback = {
  method: {
    version: string;
    scope: string;
    recommendationEngineApplied: boolean;
    automaticMixMutationApplied: boolean;
    acceptanceCriteriaApplied: boolean;
    sourceMethods: string[];
  };
  session: {
    id: string;
    mixDesignId: string;
    revisionNumber: number;
    sessionCode: string;
    status: string;
  };
  sourceIdentity: {
    calibrationDesignResultId: string;
    moistureDesignResultId: string;
    sameDesignResult: boolean;
  };
  completeness: {
    calibrationComparableBatchCount: number;
    calibrationBatchCount: number;
    moistureComparableBatchCount: number;
    moistureBatchCount: number;
    strengthResultCount: number;
    hasStrengthResults: boolean;
  };
  observations: FeedbackObservation[];
};

type ApiResponse =
  | { status: 'pass'; feedback: RevisionFeedback }
  | { status: 'fail'; error: string };

type Props = { sessionId: string; refreshKey?: string };

const categoryLabel: Record<FeedbackObservation['category'], string> = {
  calibration: 'Calibration',
  moisture: 'Moisture',
  strength: 'Strength',
  completeness: 'Completeness'
};

const policyFlag = (applied: boolean) => applied ? 'اعمال شده' : 'خیر';

export function TrialRevisionFeedbackPanel(props: Props) {
  const [data, setData] = useState<RevisionFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualRefresh, setManualRefresh] = useState(0);

  useEffect(() => {
    if (!props.sessionId) return;
    let cancelled = false;
    const sessionId = props.sessionId;
    setLoading(true);
    setError(null);
    window.tolouTrialMixV2?.getRevisionFeedback(sessionId)
      .then(raw => {
        if (cancelled) return;
        const response = raw as ApiResponse;
        if (response?.status === 'pass') setData(response.feedback);
        else {
          setData(null);
          setError(response?.status === 'fail' ? response.error : 'پاسخ Revision Feedback نامعتبر است.');
        }
      })
      .catch(reason => {
        if (!cancelled) {
          setData(null);
          setError(reason instanceof Error ? reason.message : 'خطا در خواندن Revision Feedback');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [props.sessionId, props.refreshKey, manualRefresh]);

  const policyContractViolated = Boolean(data && (
    data.method.recommendationEngineApplied ||
    data.method.automaticMixMutationApplied ||
    data.method.acceptanceCriteriaApplied
  ));

  return <section className="panel form-panel" aria-label="Trial revision feedback">
    <div className="panel-head">
      <div><h3>Revision Feedback</h3><span>Traceable factual aggregation for engineering review</span></div>
      <button className="btn" disabled={loading} onClick={() => setManualRefresh(value => value + 1)}>بروزرسانی</button>
    </div>
    <div className="panel-body">
      {loading && <p>در حال آماده‌سازی feedback package...</p>}
      {error && <div className="alert warn">{error}</div>}
      {data && <>
        <p><b>Session:</b> {data.session.sessionCode} · <b>Revision:</b> {data.session.revisionNumber}</p>
        <p><b>Method:</b> {data.method.version}</p>
        <p><b>Scope:</b> {data.method.scope}</p>
        <p><b>Recommendation engine:</b> {policyFlag(data.method.recommendationEngineApplied)} · <b>Automatic mix mutation:</b> {policyFlag(data.method.automaticMixMutationApplied)} · <b>Acceptance criteria:</b> {policyFlag(data.method.acceptanceCriteriaApplied)}</p>
        {policyContractViolated
          ? <div className="alert danger">Policy contract warning: backend این package را به‌صورت کاملاً read-only/non-acceptance گزارش نکرده است. قبل از استفاده مهندسی، منبع و method contract بررسی شود.</div>
          : <div className="alert warn">این بخش فقط شواهد و وضعیت کامل بودن داده‌ها را برای تصمیم مهندس جمع‌بندی می‌کند و هیچ اصلاحی را خودکار اعمال نمی‌کند.</div>}

        <div className="table-wrap">
          <table>
            <caption className="sr-only">Revision feedback completeness summary</caption>
            <thead><tr><th>Source</th><th>Available / Comparable</th><th>Total</th></tr></thead>
            <tbody>
              <tr><td>Calibration batches</td><td>{data.completeness.calibrationComparableBatchCount}</td><td>{data.completeness.calibrationBatchCount}</td></tr>
              <tr><td>Moisture batches</td><td>{data.completeness.moistureComparableBatchCount}</td><td>{data.completeness.moistureBatchCount}</td></tr>
              <tr><td>Strength results</td><td>{data.completeness.strengthResultCount}</td><td>{data.completeness.hasStrengthResults ? 'Available' : 'None'}</td></tr>
            </tbody>
          </table>
        </div>

        <p><b>Design source identity:</b> {data.sourceIdentity.sameDesignResult ? 'Matched' : 'Mismatch'}</p>
        {!data.sourceIdentity.sameDesignResult && <div className="alert warn">Calibration و Moisture به یک Design Result مشترک اشاره نمی‌کنند؛ این package برای تصمیم‌گیری مهندسی نیاز به بررسی دارد.</div>}

        <div className="table-wrap">
          <table>
            <caption className="sr-only">Revision feedback observations</caption>
            <thead><tr><th>Category</th><th>Observation</th><th>Severity</th><th>Traceability</th></tr></thead>
            <tbody>
              {data.observations.length === 0
                ? <tr><td colSpan={4}>Observation ثبت‌شده‌ای وجود ندارد.</td></tr>
                : data.observations.map((item, index) => <tr key={`${item.code}:${index}`}>
                    <td>{categoryLabel[item.category]}</td>
                    <td>{item.message}</td>
                    <td>{item.severity === 'warning' ? 'Warning' : 'Info'}</td>
                    <td>{item.sourceIds.length > 0 ? item.sourceIds.join(', ') : '—'}</td>
                  </tr>)}
            </tbody>
          </table>
        </div>

        <p className="muted">Source methods: {data.method.sourceMethods.join(' · ')}</p>
      </>}
    </div>
  </section>;
}
