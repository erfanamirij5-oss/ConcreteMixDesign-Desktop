type TrialSessionStatus = 'planned' | 'in_progress' | 'completed' | 'void';

type Props = {
  sessionId: string;
  status: TrialSessionStatus;
  batchCount: number;
  busy?: boolean;
  onTransition: (targetStatus: TrialSessionStatus) => Promise<void> | void;
};

const statusLabel: Record<TrialSessionStatus, string> = {
  planned: 'برنامه‌ریزی‌شده',
  in_progress: 'در حال اجرا',
  completed: 'تکمیل‌شده',
  void: 'باطل‌شده'
};

export function TrialSessionLifecycleControls(props: Props) {
  const terminal = props.status === 'completed' || props.status === 'void';
  const canStart = props.status === 'planned';
  const canComplete = props.status === 'in_progress' && props.batchCount > 0;
  const canVoid = props.status === 'planned' || props.status === 'in_progress';

  return <section className="panel form-panel" aria-label="Trial Session lifecycle controls">
    <div className="panel-head">
      <div><h3>Lifecycle</h3><span>Controlled Session status transitions</span></div>
      <span className="badge blue">{statusLabel[props.status]}</span>
    </div>
    <div className="panel-body">
      <p><b>Session:</b> {props.sessionId}</p>
      <p><b>Batchهای متصل:</b> {props.batchCount}</p>
      {terminal
        ? <div className="alert warn">این Session در وضعیت نهایی است و مسیرهای ثبت/ویرایش Trial Mix v2 باید فقط‌خواندنی باشند.</div>
        : props.status === 'in_progress' && props.batchCount === 0
          ? <div className="alert warn">برای تکمیل Session حداقل یک Batch متصل لازم است.</div>
          : null}
    </div>
    <div className="toolbar">
      {canStart && <button className="btn success" disabled={props.busy} onClick={() => void props.onTransition('in_progress')}>شروع Session</button>}
      {props.status === 'in_progress' && <button className="btn success" disabled={props.busy || !canComplete} onClick={() => void props.onTransition('completed')}>تکمیل Session</button>}
      {canVoid && <button className="btn" disabled={props.busy} onClick={() => void props.onTransition('void')}>ابطال Session</button>}
      {terminal && <span className="badge blue">Read only</span>}
    </div>
  </section>;
}
