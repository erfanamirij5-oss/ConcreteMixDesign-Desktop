import { useMemo, useState } from 'react';
import type { DashboardProject } from './DashboardHome';

type Props = {
  projects: DashboardProject[];
  activeMixDesignId: string | null;
  onNewProject: () => void;
  onOpenProject: (mixDesignId: string) => void;
};

type SortKey = 'created' | 'strength' | 'name';

function concreteTypeLabel(type: string) {
  if (type === 'pumped') return 'پمپی';
  if (type === 'normal_weight') return 'معمولی';
  return type || '-';
}

function statusLabel(status: string) {
  const value = (status || 'draft').toLowerCase();
  if (value === 'approved') return 'تأییدشده';
  if (value === 'trial') return 'Trial';
  if (value === 'needs_review' || value === 'review') return 'نیازمند بازبینی';
  if (value === 'archived') return 'بایگانی';
  return 'پیش‌نویس';
}

export function MixDesignManager({ projects, activeMixDesignId, onNewProject, onOpenProject }: Props) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('created');

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rows = projects.filter(project => {
      const haystack = `${project.mixDesignId} ${project.projectName} ${project.city}`.toLowerCase();
      const queryMatch = !normalizedQuery || haystack.includes(normalizedQuery);
      const typeMatch = typeFilter === 'all' || project.concreteType === typeFilter;
      const normalizedStatus = (project.status || 'draft').toLowerCase();
      const statusMatch = statusFilter === 'all' || normalizedStatus === statusFilter;
      return queryMatch && typeMatch && statusMatch;
    });
    return [...rows].sort((a, b) => {
      if (sortKey === 'strength') return b.targetStrengthMpa - a.targetStrengthMpa;
      if (sortKey === 'name') return a.projectName.localeCompare(b.projectName, 'fa');
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }, [projects, query, sortKey, statusFilter, typeFilter]);

  return <>
    <section className="titlebar manager-titlebar">
      <div><span className="eyebrow">MIX DESIGN MANAGER</span><h2>مدیریت طرح‌های اختلاط</h2><p>جستجو، فیلتر و دسترسی به پرونده‌های مهندسی ذخیره‌شده</p></div>
      <div className="toolbar"><button className="btn primary strong-action" onClick={onNewProject}>＋ ثبت طرح جدید</button></div>
    </section>

    <section className="panel manager-filter-panel">
      <div className="manager-filters">
        <label className="manager-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="جستجو بر اساس کد طرح، نام پروژه یا شهر..." /></label>
        <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="all">همه انواع بتن</option><option value="normal_weight">بتن معمولی</option><option value="pumped">بتن پمپی</option></select>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">همه وضعیت‌ها</option><option value="draft">پیش‌نویس</option><option value="trial">Trial</option><option value="review">بازبینی</option><option value="approved">تأییدشده</option><option value="archived">بایگانی</option></select>
        <select value={sortKey} onChange={event => setSortKey(event.target.value as SortKey)}><option value="created">جدیدترین</option><option value="strength">بیشترین مقاومت</option><option value="name">نام پروژه</option></select>
      </div>
      <div className="manager-filter-summary"><b>{filtered.length}</b> طرح از {projects.length} پرونده نمایش داده می‌شود.</div>
    </section>

    <section className="panel mix-manager-panel">
      <div className="panel-head"><div><h3>فهرست طرح‌های مخلوط</h3><span>هر ردیف یک پرونده مستقل مهندسی است.</span></div><span className="badge blue">SQLite</span></div>
      <div className="panel-body table-wrap">
        {filtered.length === 0 ? <div className="empty-state"><b>طرحی مطابق فیلتر پیدا نشد.</b><span>فیلترها را تغییر دهید یا یک طرح جدید ثبت کنید.</span></div> :
        <table className="mix-table manager-table">
          <thead><tr><th>کد طرح</th><th>پروژه</th><th>نوع بتن</th><th>مقاومت هدف</th><th>شهر</th><th>تاریخ</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody>{filtered.map(project => <tr key={project.mixDesignId} className={activeMixDesignId === project.mixDesignId ? 'selected-row' : ''}>
            <td className="mono-cell">{project.mixDesignId}</td>
            <td><strong>{project.projectName}</strong><small>پرونده طرح اختلاط</small></td>
            <td>{concreteTypeLabel(project.concreteType)}</td>
            <td><strong>{project.targetStrengthMpa} MPa</strong></td>
            <td>{project.city || '-'}</td>
            <td>{project.createdAt || '-'}</td>
            <td><span className={`status-chip status-${(project.status || 'draft').toLowerCase()}`}>{statusLabel(project.status)}</span></td>
            <td><div className="row-actions"><button className="row-action" onClick={() => onOpenProject(project.mixDesignId)}>باز کردن</button><button className="row-more" title="عملیات بیشتر در Sprint بعد" disabled>•••</button></div></td>
          </tr>)}</tbody>
        </table>}
      </div>
    </section>
    <div className="manager-roadmap-note">عملیات <b>ویرایش، Duplicate، Revision، Archive، Print و PDF</b> بعد از تکمیل مدل داده و کنترل Revision فعال می‌شوند؛ تا آن زمان دکمه جعلی برای این عملیات ارائه نمی‌شود.</div>
  </>;
}
