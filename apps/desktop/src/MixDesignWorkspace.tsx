import type { DashboardProject } from './DashboardHome';

type WorkspaceSection = 'overview' | 'materials' | 'gradation' | 'blend' | 'durability' | 'results';

type Props = {
  project: DashboardProject;
  activeSection: WorkspaceSection;
  onSectionChange: (section: WorkspaceSection) => void;
  onBackToManager: () => void;
};

function concreteTypeLabel(type: string) {
  return type === 'pumped' ? 'بتن پمپی' : type === 'normal_weight' ? 'بتن معمولی' : type || '-';
}

function statusLabel(status: string) {
  const normalized = (status || 'draft').toLowerCase();
  if (normalized === 'approved') return 'تأییدشده';
  if (normalized === 'trial') return 'Trial';
  if (normalized === 'review' || normalized === 'needs_review') return 'نیازمند بازبینی';
  if (normalized === 'archived') return 'بایگانی';
  return 'پیش‌نویس';
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
  return <>
    <section className="workspace-identity">
      <div>
        <button className="workspace-back" onClick={onBackToManager}>← بازگشت به لیست طرح‌ها</button>
        <span className="eyebrow">MIX DESIGN WORKSPACE</span>
        <h2>{project.projectName}</h2>
        <div className="workspace-meta">
          <span className="mono-cell">{project.mixDesignId}</span>
          <span>{concreteTypeLabel(project.concreteType)}</span>
          <span>{project.targetStrengthMpa} MPa</span>
          <span>{project.city || '-'}</span>
          <span className={`status-chip status-${(project.status || 'draft').toLowerCase()}`}>{statusLabel(project.status)}</span>
        </div>
      </div>
      <div className="workspace-actions">
        <button disabled>Revision جدید</button>
        <button disabled>چاپ</button>
        <button disabled>PDF</button>
      </div>
    </section>

    <nav className="workspace-tabs">
      {sections.map(section => <button key={section.key} className={activeSection === section.key ? 'active' : ''} onClick={() => onSectionChange(section.key)}>{section.label}</button>)}
      <button disabled>Trial Mix</button>
      <button disabled>Revision History</button>
      <button disabled>گزارش</button>
    </nav>

    {activeSection === 'overview' && <section className="workspace-overview-grid">
      <article className="panel">
        <div className="panel-head"><div><h3>شناسنامه طرح</h3><span>اطلاعات پایه پرونده جاری</span></div></div>
        <div className="panel-body workspace-facts">
          <div><span>کد طرح</span><b className="mono-cell">{project.mixDesignId}</b></div>
          <div><span>نام پروژه</span><b>{project.projectName}</b></div>
          <div><span>نوع بتن</span><b>{concreteTypeLabel(project.concreteType)}</b></div>
          <div><span>مقاومت هدف</span><b>{project.targetStrengthMpa} MPa</b></div>
          <div><span>شهر</span><b>{project.city || '-'}</b></div>
          <div><span>وضعیت</span><b>{statusLabel(project.status)}</b></div>
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
        <div className="panel-head"><div><h3>کنترل مدیریتی پرونده</h3><span>قابلیت‌های بعدی این Workspace</span></div></div>
        <div className="panel-body future-capabilities">
          <span>Revision Control</span><span>Trial Mix</span><span>Engineering Approval</span><span>Print / PDF</span><span>Audit Trail</span><span>Production Release</span>
        </div>
      </article>
    </section>}
  </>;
}
