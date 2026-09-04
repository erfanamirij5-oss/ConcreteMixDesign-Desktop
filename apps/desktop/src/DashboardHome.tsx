type EngineState = 'idle' | 'checking' | 'ready' | 'error';

export type DashboardProject = {
  id: string;
  projectName: string;
  city: string;
  mixDesignId: string;
  concreteType: string;
  targetStrengthMpa: number;
  status: string;
  createdAt: string;
};

type Props = {
  projects: DashboardProject[];
  engineState: EngineState;
  activeMixDesignId: string | null;
  onNewProject: () => void;
  onOpenProject: (mixDesignId: string) => void;
  onCheckEngine: () => void;
};

function statusLabel(status: string) {
  const normalized = status?.toLowerCase();
  if (normalized === 'approved') return 'تأییدشده';
  if (normalized === 'archived') return 'بایگانی';
  if (normalized === 'trial') return 'در انتظار Trial';
  return status || 'پیش‌نویس';
}

function concreteTypeLabel(type: string) {
  return type === 'pumped' ? 'پمپی' : type === 'normal_weight' ? 'معمولی' : type || '-';
}

export function DashboardHome(props: Props) {
  const approved = props.projects.filter(item => item.status?.toLowerCase() === 'approved').length;
  const review = props.projects.filter(item => ['review', 'needs_review', 'trial'].includes(item.status?.toLowerCase())).length;
  const latest = props.projects.slice(0, 8);

  return <>
    <section className="management-hero">
      <div>
        <span className="eyebrow">TOLOU ENGINEERING WORKSPACE</span>
        <h2>مرکز مدیریت طرح‌های اختلاط</h2>
        <p>ثبت، پیگیری و دسترسی سریع به پرونده مهندسی هر طرح؛ هسته محاسباتی v0.3.0 بدون تغییر در این لایه استفاده می‌شود.</p>
      </div>
      <div className="toolbar">
        <button className="btn primary strong-action" onClick={props.onNewProject}>＋ ثبت طرح اختلاط جدید</button>
        <button className="btn ghost" disabled={props.engineState === 'checking'} onClick={props.onCheckEngine}>{props.engineState === 'checking' ? 'در حال بررسی...' : 'بررسی سلامت موتور'}</button>
      </div>
    </section>

    <section className="kpis management-kpis">
      <article className="kpi blue"><label>کل طرح‌های ثبت‌شده</label><strong>{props.projects.length}</strong><small>پرونده‌های موجود در SQLite</small></article>
      <article className="kpi green"><label>طرح‌های تأییدشده</label><strong>{approved}</strong><small>آماده استفاده طبق وضعیت ثبت‌شده</small></article>
      <article className="kpi orange"><label>نیازمند پیگیری</label><strong>{review}</strong><small>Trial / Review / Needs Review</small></article>
      <article className={`kpi ${props.activeMixDesignId ? 'purple' : 'red'}`}><label>پرونده فعال</label><strong>{props.activeMixDesignId ? 'فعال' : 'انتخاب نشده'}</strong><small>{props.activeMixDesignId ?? 'یک طرح را از فهرست باز کنید'}</small></article>
    </section>

    <section className="quick-actions">
      <button onClick={props.onNewProject}><b>＋</b><span><strong>طرح جدید</strong><small>شروع پرونده مهندسی</small></span></button>
      <button disabled><b>◫</b><span><strong>Trial Mix</strong><small>در Sprint بعد فعال می‌شود</small></span></button>
      <button disabled><b>▤</b><span><strong>مرکز گزارش</strong><small>پس از تکمیل Workspace</small></span></button>
      <button disabled><b>↺</b><span><strong>Revision</strong><small>کنترل نسخه طرح</small></span></button>
    </section>

    <section className="dashboard-main-grid">
      <article className="panel mix-manager-panel">
        <div className="panel-head">
          <div><h3>آخرین طرح‌های اختلاط</h3><span>ورود مستقیم به پرونده و ادامه فرآیند مهندسی</span></div>
          <span className="badge blue">{props.projects.length} طرح</span>
        </div>
        <div className="panel-body table-wrap">
          {latest.length === 0 ? <div className="empty-state"><b>هنوز طرحی ثبت نشده است.</b><span>اولین طرح اختلاط را ایجاد کنید تا داشبورد مدیریتی شکل بگیرد.</span><button className="btn primary" onClick={props.onNewProject}>ثبت اولین طرح</button></div> :
          <table className="mix-table">
            <thead><tr><th>کد طرح</th><th>نام / پروژه</th><th>نوع</th><th>مقاومت</th><th>شهر</th><th>وضعیت</th><th></th></tr></thead>
            <tbody>{latest.map(project => <tr key={project.mixDesignId} className={props.activeMixDesignId === project.mixDesignId ? 'selected-row' : ''}>
              <td className="mono-cell">{project.mixDesignId}</td>
              <td><strong>{project.projectName}</strong><small>{project.createdAt || '-'}</small></td>
              <td>{concreteTypeLabel(project.concreteType)}</td>
              <td>{project.targetStrengthMpa} MPa</td>
              <td>{project.city || '-'}</td>
              <td><span className="status-chip">{statusLabel(project.status)}</span></td>
              <td><button className="row-action" onClick={() => props.onOpenProject(project.mixDesignId)}>باز کردن ←</button></td>
            </tr>)}</tbody>
          </table>}
        </div>
      </article>

      <aside className="dashboard-side-stack">
        <article className="panel">
          <div className="panel-head"><div><h3>وضعیت سیستم</h3><span>کنترل سریع محیط اجرایی</span></div></div>
          <div className="panel-body system-health">
            <div><span>Engineering Engine</span><b className={props.engineState === 'error' ? 'health-bad' : 'health-good'}>{props.engineState === 'ready' ? 'متصل' : props.engineState === 'error' ? 'خطا' : 'آماده بررسی'}</b></div>
            <div><span>پایگاه داده</span><b className="health-good">SQLite</b></div>
            <div><span>نسخه هسته</span><b>0.3.0</b></div>
            <div><span>نسخه مدیریتی</span><b>v0.4 Dev</b></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head"><div><h3>گردش کار طرح</h3><span>مسیر هدف داشبورد مدیریتی</span></div></div>
          <div className="panel-body workflow-rail">
            <span className="done">ثبت طرح</span><span>محاسبه</span><span>Trial Mix</span><span>بازبینی</span><span>تأیید</span><span>گزارش</span>
          </div>
        </article>
      </aside>
    </section>
  </>;
}
