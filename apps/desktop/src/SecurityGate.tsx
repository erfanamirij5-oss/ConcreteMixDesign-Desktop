import { FormEvent, useEffect, useState } from 'react';

type SecuritySession = { username: string; displayName: string; authenticatedAt: string };
type SecurityStatus = { status?: string; bootstrapRequired?: boolean; session?: SecuritySession | null; error?: string };
type SecurityResponse = { status?: string; session?: SecuritySession | null; error?: string };

type Props = {
  onAuthenticated: (session: SecuritySession) => void;
};

export function SecurityGate({ onAuthenticated }: Props) {
  const [loading, setLoading] = useState(true);
  const [bootstrapRequired, setBootstrapRequired] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { void loadStatus(); }, []);

  async function loadStatus() {
    setLoading(true);
    setMessage('');
    try {
      const api = securityApi();
      const response = await api.status() as SecurityStatus;
      if (response.status === 'fail') throw new Error(response.error || 'خواندن وضعیت امنیتی ناموفق بود.');
      if (response.session) { onAuthenticated(response.session); return; }
      setBootstrapRequired(Boolean(response.bootstrapRequired));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'خطا در راه‌اندازی لایه امنیتی');
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const api = securityApi();
      const response = bootstrapRequired
        ? await api.bootstrap({ username, displayName, password }) as SecurityResponse
        : await api.login({ username, password }) as SecurityResponse;
      if (response.status === 'fail' || !response.session) throw new Error(response.error || 'احراز هویت ناموفق بود.');
      setPassword('');
      onAuthenticated(response.session);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'احراز هویت ناموفق بود.');
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="app-shell" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', alignContent: 'center' }}>
    <section className="panel" style={{ width: 'min(520px, 94vw)' }}>
      <div className="panel-head">
        <div>
          <div className="eyebrow">TOLOU SECURITY</div>
          <h3 style={{ marginTop: 6 }}>{bootstrapRequired ? 'راه‌اندازی مدیر اصلی نرم‌افزار' : 'ورود امن به نرم‌افزار تراکم بتن طلوع'}</h3>
        </div>
        <span className="badge blue">Gate 09</span>
      </div>
      <div className="panel-body">
        {loading ? <div className="alert info">در حال بررسی وضعیت امنیتی پایگاه داده...</div> : <form onSubmit={submit}>
          {bootstrapRequired && <div className="alert warn">این نصب هنوز کاربر ندارد. اولین حساب به‌عنوان Administrator اصلی ساخته می‌شود. این مرحله فقط یک‌بار قابل انجام است.</div>}
          {message && <div className="alert danger">{message}</div>}
          <label className="field"><span>نام کاربری</span><input autoFocus autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="مثال: erfan.amiri" /></label>
          {bootstrapRequired && <label className="field"><span>نام نمایشی</span><input autoComplete="name" value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="نام مسئول یا مهندس" /></label>}
          <label className="field"><span>رمز عبور</span><input type="password" autoComplete={bootstrapRequired ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder={bootstrapRequired ? 'حداقل ۱۰ کاراکتر' : 'رمز عبور'} /></label>
          <div className="alert info">هویت ورود در Main Process نگهداری می‌شود و به همان پنجره نرم‌افزار متصل است. Renderer به password verifier یا session token داخلی دسترسی ندارد.</div>
          <button className="btn primary strong-action" type="submit" disabled={submitting || !username.trim() || !password || (bootstrapRequired && !displayName.trim())} style={{ width: '100%', marginTop: 8 }}>
            {submitting ? 'در حال بررسی...' : bootstrapRequired ? 'ایجاد Administrator و ورود' : 'ورود به نرم‌افزار'}
          </button>
        </form>}
      </div>
    </section>
  </div>;
}

function securityApi() {
  const api = (window as typeof window & { tolouSecurity?: {
    status: () => Promise<unknown>;
    bootstrap: (payload: unknown) => Promise<unknown>;
    login: (payload: unknown) => Promise<unknown>;
  } }).tolouSecurity;
  if (!api) throw new Error('Security API در دسترس نیست.');
  return api;
}

export type { SecuritySession };
