import { useEffect, useState } from 'react';
import { App } from './App';
import { DataSafetyView } from './DataSafetyView';
import { ReportCenterView } from './ReportCenterView';
import { SecurityGate, type SecuritySession } from './SecurityGate';

type RootView = 'application' | 'reports' | 'data-safety';
type RecentProject = { mixDesignId: string; projectName: string; status: string; targetStrengthMpa: number };

export function RootApp() {
  const [session, setSession] = useState<SecuritySession | null>(null);
  const [view, setView] = useState<RootView>('application');
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [mixDesignId, setMixDesignId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (session && view === 'reports') void loadProjects();
  }, [session, view]);

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

  async function logout() {
    setLoggingOut(true);
    try {
      const api = (window as typeof window & { tolouSecurity?: { logout: () => Promise<unknown> } }).tolouSecurity;
      if (!api) throw new Error('Security API در دسترس نیست.');
      await api.logout();
      setSession(null);
      setView('application');
      setProjects([]);
      setMixDesignId(null);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'خروج از حساب ناموفق بود.');
    } finally {
      setLoggingOut(false);
    }
  }

  if (!session) return <SecurityGate onAuthenticated={setSession} />;

  const navigation = <div className="root-module-nav">
    <button className={view === 'application' ? 'active' : ''} onClick={() => setView('application')}>سامانه مهندسی</button>
    <button className={view === 'reports' ? 'active' : ''} onClick={() => setView('reports')}>Report Center</button>
    <button className={view === 'data-safety' ? 'active' : ''} onClick={() => setView('data-safety')}>Data Safety</button>
    <span style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="badge green">{session.displayName} · {session.username}</span>
      <button onClick={() => void logout()} disabled={loggingOut}>{loggingOut ? 'خروج...' : 'خروج امن'}</button>
    </span>
  </div>;

  if (view === 'application') {
    return <div>{navigation}<App /></div>;
  }

  if (view === 'data-safety') {
    return <div className="app-shell">{navigation}{message && <div className="alert danger">{message}</div>}<DataSafetyView /></div>;
  }

  return <div className="app-shell">
    {navigation}
    <main className="workspace report-center-root">
      <section className="titlebar"><div><h2>Report Center</h2><p>صدور، PDF، Print و تاریخچه گزارش‌های immutable بر اساس داده‌های ثبت‌شده SQLite</p></div><div className="toolbar"><button onClick={() => void loadProjects()}>بازخوانی طرح‌ها</button></div></section>
      {message && <div className="alert danger">{message}</div>}
      <section className="panel"><div className="panel-body"><label className="field"><span>طرح اختلاط</span><select value={mixDesignId ?? ''} onChange={event => setMixDesignId(event.target.value || null)}><option value="">انتخاب طرح</option>{projects.map(project => <option key={project.mixDesignId} value={project.mixDesignId}>{project.projectName} — {project.targetStrengthMpa} MPa — {project.status}</option>)}</select></label></div></section>
      <ReportCenterView mixDesignId={mixDesignId} />
    </main>
  </div>;
}
