import { useEffect, useState } from 'react';

type LicenseState = 'unlicensed' | 'active' | 'trial' | 'grace' | 'expired' | 'invalid' | 'wrong_machine' | 'incompatible' | 'clock_rollback';
export type LicenseStatus = {
  state: LicenseState;
  licensed: boolean;
  reason?: string;
  licenseId?: string;
  customerName?: string;
  edition?: string;
  expiresAt?: string | null;
  perpetual?: boolean;
  features?: string[];
};

type Props = { onActivated?: (status: LicenseStatus) => void; gateMode?: boolean };

export function LicensingView({ onActivated, gateMode = false }: Props) {
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [machineCode, setMachineCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { void reload(); }, []);

  async function reload() {
    setMessage('');
    try {
      const api = licensingApi();
      const response = await api.status() as { status?: string; license?: LicenseStatus; machineCode?: string; error?: string };
      if (response.status !== 'pass' || !response.license) throw new Error(response.error || 'خواندن وضعیت لایسنس ناموفق بود.');
      setLicense(response.license);
      setMachineCode(response.machineCode ?? '');
      if (response.license.licensed) onActivated?.(response.license);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'خطا در خواندن وضعیت لایسنس');
    }
  }

  async function importLicense() {
    setBusy(true); setMessage('');
    try {
      const response = await licensingApi().importLicense() as { status?: string; canceled?: boolean; license?: LicenseStatus; error?: string };
      if (response.status !== 'pass') throw new Error(response.error || 'فعال‌سازی لایسنس ناموفق بود.');
      if (!response.canceled) await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطا در فعال‌سازی لایسنس'); }
    finally { setBusy(false); }
  }

  async function removeLicense() {
    if (!confirm('لایسنس فعال از این دستگاه حذف شود؟')) return;
    setBusy(true); setMessage('');
    try {
      const response = await licensingApi().removeLicense() as { status?: string; license?: LicenseStatus; error?: string };
      if (response.status !== 'pass') throw new Error(response.error || 'حذف لایسنس ناموفق بود.');
      setLicense(response.license ?? { state: 'unlicensed', licensed: false });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطا در حذف لایسنس'); }
    finally { setBusy(false); }
  }

  const stateLabel = stateLabels[license?.state ?? 'unlicensed'];
  return <main className={gateMode ? 'workspace licensing-gate-root' : 'workspace licensing-root'}>
    <section className="titlebar">
      <div><h2>لایسنس تجاری نرم‌افزار طلوع</h2><p>فعال‌سازی آفلاین، اتصال به دستگاه و کنترل اعتبار نسخه تجاری</p></div>
      <div className="toolbar"><button className="btn ghost" onClick={() => void reload()} disabled={busy}>بازخوانی</button></div>
    </section>
    {message && <div className="alert danger">{message}</div>}
    <section className="panel" style={{ marginBottom: 12 }}>
      <div className="panel-head"><h3>وضعیت لایسنس</h3><span className={`status-chip ${license?.licensed ? 'status-approved' : 'status-needs_review'}`}>{stateLabel}</span></div>
      <div className="panel-body">
        {license?.reason && !license.licensed && <div className="alert warn">{license.reason}</div>}
        <div className="manager-summary-grid">
          <div><small>دارنده لایسنس</small><strong>{license?.customerName ?? '-'}</strong></div>
          <div><small>شناسه لایسنس</small><strong>{license?.licenseId ?? '-'}</strong></div>
          <div><small>Edition</small><strong>{license?.edition ?? '-'}</strong></div>
          <div><small>اعتبار</small><strong>{license?.perpetual ? 'دائمی' : license?.expiresAt ?? '-'}</strong></div>
        </div>
        {license?.features?.length ? <div className="alert info" style={{ marginTop: 12 }}>قابلیت‌ها: {license.features.join(' · ')}</div> : null}
      </div>
    </section>
    <section className="panel">
      <div className="panel-head"><h3>کد این دستگاه</h3><span>SHA-256 Machine Binding</span></div>
      <div className="panel-body">
        <p>برای صدور لایسنس آفلاین، این کد را برای صادرکننده لایسنس ارسال کنید. شناسه خام سخت‌افزار نمایش داده نمی‌شود.</p>
        <textarea readOnly value={machineCode} rows={3} style={{ width: '100%', direction: 'ltr' }} />
        <div className="toolbar" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => void importLicense()} disabled={busy}>انتخاب و فعال‌سازی فایل لایسنس</button>
          {license?.licensed && <button className="btn ghost" onClick={() => void removeLicense()} disabled={busy}>حذف لایسنس این دستگاه</button>}
        </div>
        <div className="alert info" style={{ marginTop: 12 }}>فایل لایسنس با امضای Ed25519 بررسی می‌شود. کلید خصوصی صدور لایسنس داخل نرم‌افزار یا مخزن کد قرار نمی‌گیرد.</div>
      </div>
    </section>
  </main>;
}

const stateLabels: Record<LicenseState, string> = {
  unlicensed: 'بدون لایسنس', active: 'فعال', trial: 'آزمایشی', grace: 'مهلت', expired: 'منقضی', invalid: 'نامعتبر', wrong_machine: 'دستگاه نامطابق', incompatible: 'ناسازگار', clock_rollback: 'خطای ساعت سیستم'
};

function licensingApi() {
  const api = (window as typeof window & { tolouLicensing?: { status: () => Promise<unknown>; importLicense: () => Promise<unknown>; removeLicense: () => Promise<unknown> } }).tolouLicensing;
  if (!api) throw new Error('Licensing API در دسترس نیست.');
  return api;
}
