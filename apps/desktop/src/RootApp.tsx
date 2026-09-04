import { useEffect, useState } from 'react';
import { App } from './App';
import { ReportCenterView } from './ReportCenterView';

type RootView = 'application' | 'reports';
type RecentProject = { mixDesignId: string; projectName: string; status: string; targetStrengthMpa: number };

export function RootApp() {
  const [view, setView] = useState<RootView>('application');
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [mixDesignId, setMixDesignId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (view === 'reports') void loadProjects();
  }, [view]);

  async function loadProjects() {
    setMessage('');
    try {
      if (!window.tolouProjects?.listRecent) throw new Error('Project API در دسترس نیست.');
      const response = await window.tolouProjects.listRecent() as { status?: string; projects?: RecentProject[]; error?: string };
      if (response.status === 'fail') throw new Error(response.error || 'خواندن طرح‌ها ناموفق بود.');
      const rows = response.projects ?? [];
      setProjects(rows);
      setMixDesignId(previous => previous && rows.some(row => row.mixDesignId === previous) ? previous : rows[0]?.mixDesignId ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'خطا در خواندن طرح‌ها');
    }
  }

  if (view === 'application') {
    return <div>
      <div className="root-module-nav"><button className="active">سامانه مهندسی</button><button onClick={() => setView('reports')}>Report Center</button></div>
      <App />
    </div>;
  }

  return <div className="app-shell">
    <div className="root-module-nav"><button onClick={() => setView('application')}>سامانه مهندسی</button><button className="active">Report Center</button></div>
    <main className="workspace report-center-root">
      <section className="titlebar"><div><h2>Report Center</h2><p>صدور، PDF، Print و تاریخچه گزارش‌های immutable بر اساس داده‌های ثبت‌شده SQLite</p></div><div className="toolbar"><button onClick={() => void loadProjects()}>بازخوانی طرح‌ها</button></div></section>
      {message && <div className="alert danger">{message}</div>}
      <section className="panel"><div className="panel-body"><label className="field"><span>طرح اختلاط</span><select value={mixDesignId ?? ''} onChange={event => setMixDesignId(event.target.value || null)}><option value="">انتخاب طرح</option>{projects.map(project => <option key={project.mixDesignId} value={project.mixDesignId}>{project.projectName} — {project.targetStrengthMpa} MPa — {project.status}</option>)}</select></label></div></section>
      <ReportCenterView mixDesignId={mixDesignId} />
    </main>
  </div>;
}
