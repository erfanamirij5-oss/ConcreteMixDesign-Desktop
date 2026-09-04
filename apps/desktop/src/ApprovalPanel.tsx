import { useState } from 'react';

type ApprovalStatus = 'draft' | 'review' | 'approved' | 'production';

type Props = {
  status: string;
  onStatusChange?: (status: ApprovalStatus, approver: string, note: string) => void;
};

const steps: Array<{ key: ApprovalStatus; label: string }> = [
  { key: 'draft', label: 'پیش‌نویس' },
  { key: 'review', label: 'بازبینی فنی' },
  { key: 'approved', label: 'تأیید شده' },
  { key: 'production', label: 'تولید' }
];

export function ApprovalPanel({ status, onStatusChange }: Props) {
  const [approver, setApprover] = useState('');
  const [note, setNote] = useState('');
  const normalized = (status || 'draft').toLowerCase() as ApprovalStatus;

  return <section className="panel approval-panel">
    <div className="panel-head">
      <div><h3>Approval Workflow</h3><span>کنترل مسیر تأیید مهندسی طرح</span></div>
    </div>
    <div className="panel-body">
      <div className="workflow-rail">
        {steps.map(step => <span key={step.key} className={step.key === normalized ? 'done' : ''}>{step.label}</span>)}
      </div>
      <div className="approval-form">
        <label><span>تأییدکننده</span><input value={approver} onChange={e => setApprover(e.target.value)} placeholder="نام مهندس مسئول" /></label>
        <label><span>یادداشت</span><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="توضیحات تأیید یا بازبینی" /></label>
        <button className="btn primary" onClick={() => onStatusChange?.('approved', approver, note)}>ثبت تأیید</button>
      </div>
    </div>
  </section>;
}
