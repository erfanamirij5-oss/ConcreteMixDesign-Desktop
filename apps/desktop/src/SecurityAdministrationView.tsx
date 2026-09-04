import { useEffect, useState } from 'react';

type SecurityUser = { id: string; username: string; displayName: string; isActive: boolean; roleId: 'administrator' | 'engineer' | 'viewer' | null };
type AuditEvent = { id: string; occurredAt: string; actorUsername: string; action: string; targetType: string | null; targetId: string | null; outcome: string; detailJson: string };
type RoleId = 'administrator' | 'engineer' | 'viewer';

export function SecurityAdministrationView() {
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ username: '', displayName: '', password: '', roleId: 'viewer' as RoleId });

  useEffect(() => { void reload(); }, []);

  async function reload() {
    setMessage('');
    try {
      const api = (window as any).tolouSecurity;
      if (!api?.listUsers || !api?.listAudit) throw new Error('Security API در دسترس نیست.');
      const [userResponse, auditResponse] = await Promise.all([api.listUsers(), api.listAudit(200)]);
      if (userResponse.status !== 'pass') throw new Error(userResponse.error || 'دسترسی مدیریت کاربران مجاز نیست.');
      if (auditResponse.status !== 'pass') throw new Error(auditResponse.error || 'دسترسی Audit امنیتی مجاز نیست.');
      setUsers(userResponse.users ?? []);
      setAudit(auditResponse.events ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'خطا در خواندن اطلاعات امنیتی');
    }
  }

  async function createUser() {
    setBusy(true); setMessage('');
    try {
      const response = await (window as any).tolouSecurity.createUser(form);
      if (response.status !== 'pass') throw new Error(response.error || 'ایجاد کاربر ناموفق بود.');
      setForm({ username: '', displayName: '', password: '', roleId: 'viewer' });
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطا در ایجاد کاربر'); }
    finally { setBusy(false); }
  }

  async function setRole(userId: string, roleId: RoleId) {
    setBusy(true); setMessage('');
    try {
      const response = await (window as any).tolouSecurity.assignRole({ userId, roleId });
      if (response.status !== 'pass') throw new Error(response.error || 'تغییر نقش ناموفق بود.');
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطا در تغییر نقش'); }
    finally { setBusy(false); }
  }

  async function setActive(userId: string, active: boolean) {
    setBusy(true); setMessage('');
    try {
      const response = await (window as any).tolouSecurity.setUserActive({ userId, active });
      if (response.status !== 'pass') throw new Error(response.error || 'تغییر وضعیت کاربر ناموفق بود.');
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطا در تغییر وضعیت کاربر'); }
    finally { setBusy(false); }
  }

  return <main className="workspace security-admin-root">
    <section className="titlebar">
      <div><h2>امنیت، کاربران و Audit</h2><p>مدیریت حساب‌ها، نقش‌ها و رخدادهای امنیتی ثبت‌شده در پایگاه داده</p></div>
      <div className="toolbar"><button className="btn ghost" onClick={() => void reload()} disabled={busy}>بازخوانی</button></div>
    </section>
    {message && <div className="alert danger">{message}</div>}

    <section className="panel" style={{ marginBottom: 12 }}>
      <div className="panel-head"><h3>ایجاد کاربر</h3><span>رمز عبور به‌صورت متن ساده در پایگاه داده ذخیره نمی‌شود</span></div>
      <div className="panel-body manager-filters">
        <input className="manager-search" placeholder="نام کاربری انگلیسی" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
        <input className="manager-search" placeholder="نام نمایشی" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
        <input className="manager-search" type="password" placeholder="رمز عبور" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <select value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value as RoleId })}><option value="viewer">Viewer</option><option value="engineer">Engineer</option><option value="administrator">Administrator</option></select>
        <button className="btn primary" onClick={() => void createUser()} disabled={busy || !form.username || !form.displayName || form.password.length < 10}>ایجاد حساب</button>
      </div>
    </section>

    <section className="panel" style={{ marginBottom: 12 }}>
      <div className="panel-head"><h3>کاربران</h3><span>{users.length} حساب</span></div>
      <div className="table-wrap"><table className="mix-table"><thead><tr><th>کاربر</th><th>نقش</th><th>وضعیت</th><th>کنترل</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td><strong>{user.displayName}</strong><small>{user.username}</small></td><td><select value={user.roleId ?? 'viewer'} onChange={e => void setRole(user.id, e.target.value as RoleId)} disabled={busy}><option value="viewer">Viewer</option><option value="engineer">Engineer</option><option value="administrator">Administrator</option></select></td><td><span className={`status-chip ${user.isActive ? 'status-approved' : 'status-archived'}`}>{user.isActive ? 'فعال' : 'غیرفعال'}</span></td><td><button className="row-action" onClick={() => void setActive(user.id, !user.isActive)} disabled={busy}>{user.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button></td></tr>)}</tbody></table></div>
    </section>

    <section className="panel">
      <div className="panel-head"><h3>Security Audit Trail</h3><span>Append-only</span></div>
      <div className="table-wrap"><table className="mix-table"><thead><tr><th>زمان</th><th>Actor</th><th>Action</th><th>Target</th><th>Outcome</th></tr></thead><tbody>{audit.map(event => <tr key={event.id}><td className="mono-cell">{event.occurredAt}</td><td>{event.actorUsername}</td><td className="mono-cell">{event.action}</td><td className="mono-cell">{event.targetType ?? '-'} / {event.targetId ?? '-'}</td><td><span className={`status-chip ${event.outcome === 'success' ? 'status-approved' : 'status-needs_review'}`}>{event.outcome}</span></td></tr>)}</tbody></table></div>
    </section>
  </main>;
}
