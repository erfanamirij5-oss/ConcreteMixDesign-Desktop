import { useEffect, useMemo, useState } from 'react';
import type { DashboardProject } from './DashboardHome';

type WorkspaceSection = 'overview' | 'materials' | 'gradation' | 'blend' | 'durability' | 'results';
type ManagementMode = 'overview' | 'edit' | 'revisions';

type ManagementRecord = {
  mixDesignId: string;
  projectName: string;
  city: string;
  concreteType: string;
  targetStrengthMpa: number;
  requiredSlumpMm: number;
  maxAggregateSizeMm: number;
  exposureSummary: string;
  status: string;
  revisionNumber: number;
  engineVersion?: string;
  standardsVersion?: string;
  createdAt?: string;
  updatedAt?: string;
};

type RevisionHistory = {
  current?: Record<string, unknown>;
  snapshots?: Array<{ id: string; revisionNumber: number; changeReason: string; createdBy?: string | null; createdAt: string }>;
  audit?: Array<{ id: string; action: string; detailsJson?: string; actorName?: string | null; createdAt: string }>;
};

type Props = {
  project: DashboardProject;
  activeSection: WorkspaceSection;
  onSectionChange: (section: WorkspaceSection) => void;
  onBackToManager: () => void;
};

function concreteTypeLabel(type: string) {
  return type === 'pumped' ? 'بتن پمپی' : type === 'normal_weight' ? 'بتن معمولی' : type || '-';
}

function normalizedStatus(status: string) {
  const value = (status || 'draft').toLowerCase();
  if (value === 'trial') return 'trial_required';
  if (value === 'review' || value === 'needs_review') return 'under_review';
  return value;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'پیش‌نویس',
    trial_required: 'Trial موردنیاز',
    trial_completed: 'Trial تکمیل',
    under_review: 'در بازبینی',
    approved: 'تأییدشده',
    production: 'تولید',
    superseded: 'جایگزین‌شده',
    archived: 'بایگانی'
  };
  const normalized = normalizedStatus(status);
  return labels[normalized] ?? normalized;
}

const sections: Array<{ key: WorkspaceSection; label: string }> = [
  { key: 'overview', label: 'خلاصه' },
  { key: 'materials', label: 'مصالح' },
  { key: 'gradation', label: 'دانه‌بندی' },
  { key: 'blend', label: 'Blend' },
  { key: 'durability', label: 'دوام' },
  { key: 'results', label: 'محاسبات' }
];

export function MixDesignWorkspace({ project, activeSection, onSectionChange, onBackToManager }: Props) {
  const [mode, setMode] = useState<ManagementMode>('overview');
  const [record, setRecord] = useState<ManagementRecord | null>(null);
  const [history, setHistory] = useState<RevisionHistory | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [actorName, setActorName] = useState('');

  useEffect(() => { void loadRecord(); }, [project.mixDesignId]);

  const current = record ?? {
    mixDesignId: project.mixDesignId,
    projectName: project.projectName,
    city: project.city,
    concreteType: project.concreteType,
    targetStrengthMpa: project.targetStrengthMpa,
    requiredSlumpMm: 0,
    maxAggregateSizeMm: 0,
    exposureSummary: '',
    status: project.status,
    revisionNumber: 0
  };

  const locked = useMemo(() => ['approved', 'production', 'superseded', 'archived'].includes(normalizedStatus(current.status)), [current.status]);

  async function loadRecord() {
    try {
      if (!window.tolouMixDesigns?.getManagementRecord) return;
      const response = await window.tolouMixDesigns.getManagementRecord(project.mixDesignId) as { status?: string; record?: ManagementRecord; error?: string };
      if (response.status === 'pass' && response.record) setRecord(response.record);
      else if (response.error) setMessage(response.error);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطا در خواندن پرونده مدیریتی طرح'); }
  }

  async function loadHistory() {
    setMode('revisions'); setMessage('');
    try {
      if (!window.tolouMixDesigns?.listRevisions) throw new Error('API تاریخچه Revision در دسترس نیست.');
      const response = await window.tolouMixDesigns.listRevisions(project.mixDesignId) as { status?: string; history?: RevisionHistory; error?: string };
      if (response.status !== 'pass') throw new Error(response.error ?? 'خواندن تاریخچه Revision ناموفق بود.');
      setHistory(response.history ?? null);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطای ناشناخته در خواندن Revisionها'); }
  }

  async function saveBasics() {
    if (!record) return;
    setBusy(true); setMessage('');
    try {
      if (!window.tolouMixDesigns?.updateBasics) throw new Error('API ویرایش طرح در دسترس نیست.');
      const response = await window.tolouMixDesigns.updateBasics({ ...record, actorName }) as { status?: string; record?: ManagementRecord; error?: string };
      if (response.status !== 'pass' || !response.record) throw new Error(response.error ?? 'ویرایش مشخصات طرح ناموفق بود.');
      setRecord(response.record); setMode('overview'); setMessage('مشخصات نسخه جاری ذخیره شد و رویداد آن در Audit Log ثبت شد.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطای ناشناخته در ویرایش طرح'); }
    finally { setBusy(false); }
  }

  async function createRevision() {
    if (!revisionReason.trim()) { setMessage('برای ایجاد Revision، دلیل تغییر را وارد کنید.'); return; }
    setBusy(true); setMessage('');
    try {
      if (!window.tolouMixDesigns?.createRevision) throw new Error('API Revision در دسترس نیست.');
      const response = await window.tolouMixDesigns.createRevision({ mixDesignId: project.mixDesignId, changeReason: revisionReason, actorName }) as { status?: string; record?: ManagementRecord; revisionNumber?: number; error?: string };
      if (response.status !== 'pass' || !response.record) throw new Error(response.error ?? 'ایجاد Revision ناموفق بود.');
      setRecord(response.record); setRevisionReason(''); setMessage(`Revision R${String(response.revisionNumber ?? response.record.revisionNumber).padStart(2, '0')} ایجاد شد. Snapshot نسخه قبل غیرقابل‌تغییر در تاریخچه ذخیره شد.`);
      await loadHistory();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطای ناشناخته در ایجاد Revision'); }
    finally { setBusy(false); }
  }

  return <>
    <section className="workspace-identity">
      <div>
        <button className="workspace-back" onClick={onBackToManager}>← بازگشت به لیست طرح‌ها</button>
        <span className="eyebrow">MIX DESIGN WORKSPACE</span>
        <h2>{current.projectName}</h2>
        <div className="workspace-meta">
          <span className="mono-cell">{current.mixDesignId}</span>
          <span className="revision-badge">R{String(current.revisionNumber ?? 0).padStart(2, '0')}</span>
          <span>{concreteTypeLabel(current.concreteType)}</span>
          <span>{current.targetStrengthMpa} MPa</span>
          <span>{current.city || '-'}</span>
          <span className={`status-chip status-${normalizedStatus(current.status)}`}>{statusLabel(current.status)}</span>
        </div>
      </div>
      <div className="workspace-actions">
        <button onClick={() => { setMode('revisions'); setMessage(''); }}>Revision جدید</button>
        <button onClick={() => setMode('edit')} disabled={locked}>ویرایش مشخصات</button>
        <button disabled>چاپ</button>
        <button disabled>PDF</button>
      </div>
    </section>

    <nav className="workspace-tabs">
      {sections.map(section => <button key={section.key} className={activeSection === section.key && mode === 'overview' ? 'active' : ''} onClick={() => { setMode('overview'); onSectionChange(section.key); }}>{section.label}</button>)}
      <button disabled>Trial Mix</button>
      <button className={mode === 'revisions' ? 'active' : ''} onClick={() => void loadHistory()}>Revision History</button>
      <button disabled>گزارش</button>
    </nav>

    {message && <div className="alert info">{message}</div>}
    {locked && mode === 'edit' && <div className="alert warn">نسخه با وضعیت {statusLabel(current.status)} قفل است. برای تغییر مهندسی ابتدا Revision جدید بسازید.</div>}

    {mode === 'edit' && record && !locked && <section className="panel revision-editor">
      <div className="panel-head"><div><h3>ویرایش نسخه جاری R{String(record.revisionNumber).padStart(2, '0')}</h3><span>تغییرات در Audit Log ثبت می‌شوند؛ نسخه‌های قفل‌شده قابل ویرایش مستقیم نیستند.</span></div></div>
      <div className="panel-body revision-form-grid">
        <label><span>نام پروژه</span><input value={record.projectName} onChange={event => setRecord({ ...record, projectName: event.target.value })} /></label>
        <label><span>شهر</span><input value={record.city} onChange={event => setRecord({ ...record, city: event.target.value })} /></label>
        <label><span>نوع بتن</span><select value={record.concreteType} onChange={event => setRecord({ ...record, concreteType: event.target.value })}><option value="normal_weight">بتن معمولی</option><option value="pumped">بتن پمپی</option></select></label>
        <label><span>مقاومت هدف MPa</span><input type="number" value={record.targetStrengthMpa} onChange={event => setRecord({ ...record, targetStrengthMpa: Number(event.target.value) })} /></label>
        <label><span>اسلامپ mm</span><input type="number" value={record.requiredSlumpMm} onChange={event => setRecord({ ...record, requiredSlumpMm: Number(event.target.value) })} /></label>
        <label><span>NMSA mm</span><input type="number" value={record.maxAggregateSizeMm} onChange={event => setRecord({ ...record, maxAggregateSizeMm: Number(event.target.value) })} /></label>
        <label className="revision-field-wide"><span>شرایط دوام / مواجهه</span><textarea value={record.exposureSummary} onChange={event => setRecord({ ...record, exposureSummary: event.target.value })} /></label>
        <label><span>نام ویرایش‌کننده</span><input value={actorName} onChange={event => setActorName(event.target.value)} placeholder="برای Audit Trail" /></label>
      </div>
      <div className="revision-form-actions"><button className="btn ghost" onClick={() => { void loadRecord(); setMode('overview'); }}>انصراف</button><button className="btn success" disabled={busy} onClick={() => void saveBasics()}>{busy ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</button></div>
    </section>}

    {mode === 'revisions' && <section className="revision-control-grid">
      <article className="panel">
        <div className="panel-head"><div><h3>ایجاد Revision جدید</h3><span>قبل از تغییر نسخه قفل‌شده یا تغییر عمده مهندسی</span></div></div>
        <div className="panel-body revision-create-form">
          <div className="revision-current"><span>نسخه جاری</span><b>R{String(current.revisionNumber ?? 0).padStart(2, '0')}</b><small>{statusLabel(current.status)}</small></div>
          <label><span>دلیل Revision</span><textarea value={revisionReason} onChange={event => setRevisionReason(event.target.value)} placeholder="مثلاً تغییر منبع ماسه، اصلاح مقاومت هدف یا تغییر الزامات پروژه" /></label>
          <label><span>ایجادکننده</span><input value={actorName} onChange={event => setActorName(event.target.value)} placeholder="نام مهندس / مسئول فنی" /></label>
          <button className="btn primary" disabled={busy} onClick={() => void createRevision()}>{busy ? 'در حال ایجاد...' : `ایجاد R${String((current.revisionNumber ?? 0) + 1).padStart(2, '0')}`}</button>
        </div>
      </article>
      <article className="panel">
        <div className="panel-head"><div><h3>Revision History</h3><span>Snapshotهای غیرقابل‌ویرایش نسخه‌های قبلی</span></div><span className="badge blue">{history?.snapshots?.length ?? 0}</span></div>
        <div className="panel-body revision-history-list">
          {(history?.snapshots ?? []).length === 0 && <div className="empty-revision">هنوز Snapshot نسخه قبلی وجود ندارد.</div>}
          {(history?.snapshots ?? []).map(item => <div key={item.id}><span className="revision-badge">R{String(item.revisionNumber).padStart(2, '0')}</span><div><b>{item.changeReason}</b><small>{item.createdBy || 'ثبت‌کننده نامشخص'} · {item.createdAt}</small></div></div>)}
        </div>
      </article>
      <article className="panel workspace-wide-card">
        <div className="panel-head"><div><h3>Audit Trail</h3><span>آخرین رویدادهای مدیریتی این پرونده</span></div><span className="badge orange">{history?.audit?.length ?? 0}</span></div>
        <div className="panel-body audit-list">
          {(history?.audit ?? []).length === 0 && <div className="empty-revision">رویداد مدیریتی ثبت نشده است.</div>}
          {(history?.audit ?? []).slice(0, 12).map(item => <div key={item.id}><b>{item.action}</b><span>{item.actorName || 'System'}</span><small>{item.createdAt}</small></div>)}
        </div>
      </article>
    </section>}

    {mode === 'overview' && activeSection === 'overview' && <section className="workspace-overview-grid">
      <article className="panel">
        <div className="panel-head"><div><h3>شناسنامه طرح</h3><span>اطلاعات پایه پرونده جاری</span></div></div>
        <div className="panel-body workspace-facts">
          <div><span>کد طرح</span><b className="mono-cell">{current.mixDesignId}</b></div>
          <div><span>Revision</span><b>R{String(current.revisionNumber ?? 0).padStart(2, '0')}</b></div>
          <div><span>نام پروژه</span><b>{current.projectName}</b></div>
          <div><span>نوع بتن</span><b>{concreteTypeLabel(current.concreteType)}</b></div>
          <div><span>مقاومت هدف</span><b>{current.targetStrengthMpa} MPa</b></div>
          <div><span>اسلامپ</span><b>{current.requiredSlumpMm || '-'} mm</b></div>
          <div><span>NMSA</span><b>{current.maxAggregateSizeMm || '-'} mm</b></div>
          <div><span>شهر</span><b>{current.city || '-'}</b></div>
          <div><span>وضعیت</span><b>{statusLabel(current.status)}</b></div>
        </div>
      </article>
      <article className="panel">
        <div className="panel-head"><div><h3>گردش کار مهندسی</h3><span>وضعیت تکمیل پرونده</span></div></div>
        <div className="panel-body workflow-checklist">
          <button onClick={() => onSectionChange('materials')}><span>01</span><b>مصالح و منابع</b><small>تعریف سیمان، آب، افزودنی و سنگدانه‌ها</small></button>
          <button onClick={() => onSectionChange('gradation')}><span>02</span><b>دانه‌بندی</b><small>ثبت نتایج و منحنی‌های هر منبع</small></button>
          <button onClick={() => onSectionChange('blend')}><span>03</span><b>ترکیب سنگدانه</b><small>Manual Blend و Optimizer</small></button>
          <button onClick={() => onSectionChange('durability')}><span>04</span><b>دوام</b><small>کلاس‌های مواجهه و الزامات حاکم</small></button>
          <button onClick={() => onSectionChange('results')}><span>05</span><b>محاسبات</b><small>اجرای موتور و بررسی نتایج</small></button>
        </div>
      </article>
      <article className="panel workspace-wide-card">
        <div className="panel-head"><div><h3>کنترل مدیریتی پرونده</h3><span>Revision Control اکنون فعال است</span></div></div>
        <div className="panel-body future-capabilities">
          <span className="capability-active">Revision Control</span><span>Trial Mix</span><span>Engineering Approval</span><span>Print / PDF</span><span className="capability-active">Audit Trail</span><span>Production Release</span>
        </div>
      </article>
    </section>}
  </>;
}
