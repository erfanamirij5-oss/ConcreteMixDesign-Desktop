import { useState } from 'react';

type OperationResponse = {
  status?: 'pass' | 'fail' | 'cancelled';
  error?: string;
  backupPath?: string;
  manifestPath?: string;
  recoveryPath?: string;
  manifest?: { createdAt?: string; sizeBytes?: number; sha256?: string; schemaMigrations?: string[] };
};

export function DataSafetyView() {
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);
  const [message, setMessage] = useState('');
  const [danger, setDanger] = useState(false);
  const [details, setDetails] = useState<string[]>([]);

  async function createBackup() {
    setBusy('backup');
    setMessage('');
    setDanger(false);
    setDetails([]);
    try {
      if (!window.tolouDataSafety?.backup) throw new Error('Backup API در دسترس نیست.');
      const response = await window.tolouDataSafety.backup() as OperationResponse;
      if (response.status === 'cancelled') {
        setMessage('عملیات Backup لغو شد.');
        return;
      }
      if (response.status !== 'pass') throw new Error(response.error || 'ایجاد Backup ناموفق بود.');
      setMessage('نسخه پشتیبان با موفقیت ایجاد و اعتبارسنجی شد.');
      setDetails([
        response.backupPath ? `فایل Backup: ${response.backupPath}` : '',
        response.manifestPath ? `Manifest: ${response.manifestPath}` : '',
        response.manifest?.createdAt ? `زمان ایجاد: ${response.manifest.createdAt}` : '',
        typeof response.manifest?.sizeBytes === 'number' ? `حجم: ${response.manifest.sizeBytes} bytes` : '',
        response.manifest?.sha256 ? `SHA-256: ${response.manifest.sha256}` : ''
      ].filter(Boolean));
    } catch (error) {
      setDanger(true);
      setMessage(error instanceof Error ? error.message : 'خطا در ایجاد Backup');
    } finally {
      setBusy(null);
    }
  }

  async function restoreBackup() {
    setBusy('restore');
    setMessage('');
    setDanger(false);
    setDetails([]);
    try {
      if (!window.tolouDataSafety?.restore) throw new Error('Restore API در دسترس نیست.');
      const response = await window.tolouDataSafety.restore() as OperationResponse;
      if (response.status === 'cancelled') {
        setMessage('عملیات Restore لغو شد و داده فعلی تغییری نکرد.');
        return;
      }
      if (response.status !== 'pass') throw new Error(response.error || 'Restore ناموفق بود.');
      setMessage('Restore تأیید شد؛ نرم‌افزار برای بارگذاری دیتابیس بازیابی‌شده مجدداً راه‌اندازی می‌شود.');
      setDetails(response.recoveryPath ? [`Recovery Copy: ${response.recoveryPath}`] : []);
    } catch (error) {
      setDanger(true);
      setMessage(error instanceof Error ? error.message : 'خطا در Restore');
    } finally {
      setBusy(null);
    }
  }

  return <main className="workspace">
    <section className="titlebar">
      <div>
        <h2>Backup / Restore & Data Safety</h2>
        <p>نسخه پشتیبان SQLite-aware، کنترل سلامت، Manifest و بازیابی محافظت‌شده با Recovery Copy</p>
      </div>
    </section>

    {message && <div className={`alert ${danger ? 'danger' : ''}`}>{message}</div>}

    <section className="panel">
      <div className="panel-header"><h3>نسخه پشتیبان</h3></div>
      <div className="panel-body">
        <p>پیش از ایجاد فایل، سلامت دیتابیس بررسی می‌شود و Backup با SQLite Backup API تولید می‌شود. فایل Manifest شامل نسخه فرمت، migrationها، حجم و SHA-256 کنار Backup ذخیره می‌شود.</p>
        <div className="toolbar"><button disabled={busy !== null} onClick={() => void createBackup()}>{busy === 'backup' ? 'در حال ایجاد...' : 'ایجاد Backup اعتبارسنجی‌شده'}</button></div>
      </div>
    </section>

    <section className="panel">
      <div className="panel-header"><h3>بازیابی اطلاعات</h3></div>
      <div className="panel-body">
        <div className="alert danger">Restore یک عملیات مخرب است. فایل انتخاب‌شده قبل از هر تغییر اعتبارسنجی می‌شود و پس از تأیید شما، از دیتابیس فعلی Recovery Copy خودکار ساخته خواهد شد.</div>
        <p>در صورت تأیید، connection فعال به‌صورت کنترل‌شده بسته، دیتابیس جایگزین و برنامه مجدداً راه‌اندازی می‌شود.</p>
        <div className="toolbar"><button disabled={busy !== null} onClick={() => void restoreBackup()}>{busy === 'restore' ? 'در حال بازیابی...' : 'انتخاب Backup و Restore'}</button></div>
      </div>
    </section>

    {details.length > 0 && <section className="panel"><div className="panel-header"><h3>Provenance</h3></div><div className="panel-body">{details.map(item => <p key={item}>{item}</p>)}</div></section>}
  </main>;
}
