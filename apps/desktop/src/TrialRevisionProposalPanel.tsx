import { useEffect, useMemo, useState } from 'react';

type FeedbackObservation = { sourceIds: string[] };
type RevisionFeedback = {
  session: { id: string; mixDesignId: string; revisionNumber: number; sessionCode: string; status: string };
  sourceIdentity: { calibrationDesignResultId?: string | null; moistureDesignResultId?: string | null; sameDesignResult: boolean };
  observations: FeedbackObservation[];
};
type ProposalMetric = {
  key: string;
  unit: string;
  currentValue: number;
  proposedValue: number;
  delta: number;
  sourceIds: string[];
  rationale: string;
};
type TrialRevisionProposal = {
  method: { version: string; scope: string; automaticMixMutationApplied: false; acceptanceCriteriaApplied: false };
  source: { trialSessionId: string; mixDesignId: string; revisionNumber: number; evidenceIds: string[] };
  metrics: ProposalMetric[];
  warnings: string[];
};

type Props = { sessionId: string; status: string; refreshKey?: string };

export function TrialRevisionProposalPanel(props: Props) {
  const [feedback, setFeedback] = useState<RevisionFeedback | null>(null);
  const [proposal, setProposal] = useState<TrialRevisionProposal | null>(null);
  const [key, setKey] = useState('water_content');
  const [unit, setUnit] = useState('kg/m3');
  const [currentValue, setCurrentValue] = useState('');
  const [proposedValue, setProposedValue] = useState('');
  const [sourceIds, setSourceIds] = useState('');
  const [rationale, setRationale] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setProposal(null);
    setMessage('');
    setError('');
    window.tolouTrialMixV2?.getRevisionFeedback(props.sessionId).then(raw => {
      if (cancelled) return;
      const response = raw as { status?: string; feedback?: RevisionFeedback; error?: string };
      if (response.status === 'pass' && response.feedback) setFeedback(response.feedback);
      else setError(response.error ?? 'Revision Feedback در دسترس نیست.');
    }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'خطا در خواندن Revision Feedback'); });
    return () => { cancelled = true; };
  }, [props.sessionId, props.refreshKey]);

  const evidenceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const observation of feedback?.observations ?? []) for (const id of observation.sourceIds ?? []) if (id) ids.add(id);
    for (const id of [feedback?.sourceIdentity.calibrationDesignResultId, feedback?.sourceIdentity.moistureDesignResultId]) if (id) ids.add(id);
    return [...ids].sort();
  }, [feedback]);

  async function buildProposal() {
    setBusy(true); setError(''); setMessage('');
    try {
      if (props.status !== 'completed') throw new Error('Revision Proposal فقط از Session تکمیل‌شده ساخته می‌شود.');
      if (!window.tolouTrialMixV2?.buildRevisionProposal) throw new Error('API ساخت Revision Proposal در دسترس نیست.');
      const current = Number(currentValue); const proposed = Number(proposedValue);
      if (!Number.isFinite(current) || !Number.isFinite(proposed)) throw new Error('مقدار فعلی و پیشنهادی باید عدد معتبر باشند.');
      if (!key.trim() || !unit.trim() || !rationale.trim()) throw new Error('Metric key، واحد و منطق مهندسی الزامی هستند.');
      const sources = [...new Set(sourceIds.split(',').map(item => item.trim()).filter(Boolean))];
      if (sources.length === 0) throw new Error('حداقل یک Evidence ID از Revision Feedback انتخاب کنید.');
      const response = await window.tolouTrialMixV2.buildRevisionProposal({
        trialSessionId: props.sessionId,
        metrics: [{ key: key.trim(), unit: unit.trim(), currentValue: current, proposedValue: proposed, sourceIds: sources, rationale: rationale.trim() }]
      }) as { status?: string; proposal?: TrialRevisionProposal; error?: string };
      if (response.status !== 'pass' || !response.proposal) throw new Error(response.error ?? 'ساخت Revision Proposal ناموفق بود.');
      setProposal(response.proposal);
      setMessage('Proposal ساخته شد؛ هنوز هیچ Revision یا مقدار مهندسی تغییر نکرده است.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'خطا در ساخت Proposal'); }
    finally { setBusy(false); }
  }

  async function applyProposal() {
    if (!proposal) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (!changeReason.trim()) throw new Error('دلیل ایجاد Revision جدید الزامی است.');
      if (!window.tolouTrialMixV2?.applyRevisionProposal) throw new Error('API اعمال Revision Proposal در دسترس نیست.');
      const response = await window.tolouTrialMixV2.applyRevisionProposal({ proposal, changeReason: changeReason.trim() }) as { status?: string; revisionNumber?: number; error?: string };
      if (response.status !== 'pass' || response.revisionNumber == null) throw new Error(response.error ?? 'ایجاد Revision کنترل‌شده ناموفق بود.');
      setMessage(`Revision ${response.revisionNumber} ایجاد شد. مقادیر Proposal عمداً خودکار نوشته یا تأیید نشدند؛ ویرایش مهندسی باید روی Revision جدید انجام شود.`);
      setProposal(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'خطا در ایجاد Revision'); }
    finally { setBusy(false); }
  }

  return <section className="panel form-panel" aria-label="Trial revision proposal">
    <div className="panel-head"><div><h3>Revision Proposal</h3><span>Engineer-authored, evidence-bound controlled revision</span></div>{feedback && <span className="badge blue">Rev {feedback.session.revisionNumber}</span>}</div>
    <div className="panel-body">
      {props.status !== 'completed' && <div className="alert warn">برای ساخت Proposal، Session باید تکمیل‌شده باشد.</div>}
      {feedback && !feedback.sourceIdentity.sameDesignResult && <div className="alert warn">هویت Design Result بین Calibration و Moisture یکسان نیست؛ قبل از تصمیم مهندسی بررسی لازم است.</div>}
      {evidenceIds.length > 0 && <p className="muted"><b>Evidence IDs:</b> {evidenceIds.join(' · ')}</p>}
      <div className="form-body">
        <label className="field"><span>Metric key</span><input value={key} onChange={event => setKey(event.target.value)} /></label>
        <label className="field"><span>Unit</span><input value={unit} onChange={event => setUnit(event.target.value)} /></label>
        <label className="field"><span>Current value</span><input type="number" step="any" value={currentValue} onChange={event => setCurrentValue(event.target.value)} /></label>
        <label className="field"><span>Proposed value</span><input type="number" step="any" value={proposedValue} onChange={event => setProposedValue(event.target.value)} /></label>
        <label className="field"><span>Evidence IDs (comma separated)</span><input value={sourceIds} onChange={event => setSourceIds(event.target.value)} placeholder={evidenceIds.slice(0, 2).join(', ')} /></label>
        <label className="field"><span>Engineering rationale</span><textarea value={rationale} onChange={event => setRationale(event.target.value)} /></label>
      </div>
      <div className="toolbar"><button className="btn success" disabled={busy || props.status !== 'completed'} onClick={() => void buildProposal()}>{busy ? 'در حال پردازش...' : 'ساخت Proposal'}</button></div>
      {proposal && <>
        <div className="alert warn">Proposal فقط یک پیشنهاد قابل بازبینی است؛ Automatic mutation و Acceptance criteria هر دو غیرفعال‌اند.</div>
        <div className="table-wrap"><table><caption className="sr-only">Revision proposal metrics</caption><thead><tr><th>Metric</th><th>Current</th><th>Proposed</th><th>Delta</th><th>Evidence</th></tr></thead><tbody>{proposal.metrics.map(metric => <tr key={`${metric.key}:${metric.unit}`}><td>{metric.key} ({metric.unit})</td><td>{metric.currentValue}</td><td>{metric.proposedValue}</td><td>{metric.delta}</td><td>{metric.sourceIds.join(', ')}</td></tr>)}</tbody></table></div>
        {proposal.warnings.map((warning, index) => <div className="alert warn" key={`${warning}:${index}`}>{warning}</div>)}
        <label className="field"><span>دلیل ایجاد Revision جدید</span><textarea value={changeReason} onChange={event => setChangeReason(event.target.value)} /></label>
        <div className="toolbar"><button className="btn success" disabled={busy} onClick={() => void applyProposal()}>ایجاد Revision کنترل‌شده</button></div>
      </>}
      {error && <div className="alert danger">{error}</div>}
      {message && <div className="alert ok">{message}</div>}
    </div>
  </section>;
}
