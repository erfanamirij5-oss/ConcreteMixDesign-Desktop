import { useEffect, useMemo, useState } from 'react';

type ReportType = 'mix_design' | 'engineering_calculation' | 'material_summary' | 'durability_compliance' | 'gradation_blend' | 'revision_identity' | 'production_sheet';
type ReportLanguage = 'fa' | 'en';
type ReportRow = { id: string; revisionNumber: number; reportType: ReportType; language: ReportLanguage; generatedBy?: string | null; generatedAt: string };

const REPORTS: Array<{ value: ReportType; fa: string; en: string }> = [
  { value: 'mix_design', fa: 'گزارش طرح اختلاط', en: 'Mix Design Report' },
  { value: 'engineering_calculation', fa: 'گزارش محاسبات مهندسی', en: 'Engineering Calculation Report' },
  { value: 'material_summary', fa: 'خلاصه مصالح', en: 'Material Summary' },
  { value: 'durability_compliance', fa: 'انطباق دوام', en: 'Durability Compliance' },
  { value: 'gradation_blend', fa: 'دانه‌بندی و Blend', en: 'Gradation / Blend Report' },
  { value: 'revision_identity', fa: 'هویت Revision', en: 'Revision Identity' },
  { value: 'production_sheet', fa: 'برگه تولید', en: 'Production Sheet' }
];

export function ReportCenterView({ mixDesignId }: { mixDesignId: string | null }) {
  const [reportType, setReportType] = useState<ReportType>('mix_design');
  const [language, setLanguage] = useState<ReportLanguage>('fa');
  const [generatedBy, setGeneratedBy] = useState('');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const selected = useMemo(() => REPORTS.find(item => item.value === reportType) ?? REPORTS[0], [reportType]);

  useEffect(() => { void refresh(); }, [mixDesignId]);

  async function refresh() {
    if (!mixDesignId || !window.tolouReports?.list) { setReports([]); return; }
    try {
      const response = await window.tolouReports.list(mixDesignId) as { status?: string; reports?: ReportRow[]; error?: string };
      if (response.status === 'fail') throw new Error(response.error || 'خواندن گزارش‌ها ناموفق بود.');
      setReports(response.reports ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطا در خواندن گزارش‌ها'); }
  }

  async function createReport() {
    if (!mixDesignId) return;
    if (!generatedBy.trim()) { setMessage('نام مسئول صدور گزارش برای Traceability الزامی است.'); return; }
    setBusy(true); setMessage('');
    try {
      if (!window.tolouReports?.create) throw new Error('Report Center API در دسترس نیست.');
      const response = await window.tolouReports.create({ mixDesignId, reportType, language, generatedBy: generatedBy.trim() }) as { id?: string; status?: string; error?: string };
      if (response.status === 'fail' || !response.id) throw new Error(response.error || 'ساخت Snapshot گزارش ناموفق بود.');
      setMessage(`Snapshot گزارش ثبت شد: ${response.id}`);
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطا در ساخت گزارش'); }
    finally { setBusy(false); }
  }

  async function exportPdf(id: string) {
    setBusy(true); setMessage('');
    try {
      const response = await window.tolouReports?.exportPdf(id) as { status?: string; filePath?: string; error?: string } | undefined;
      if (!response) throw new Error('PDF API در دسترس نیست.');
      if (response.status === 'fail') throw new Error(response.error || 'تولید PDF ناموفق بود.');
      setMessage(response.status === 'cancelled' ? 'ذخیره PDF لغو شد.' : `PDF ذخیره شد${response.filePath ? `: ${response.filePath}` : ''}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطا در تولید PDF'); }
    finally { setBusy(false); }
  }

  async function printReport(id: string) {
    setBusy(true); setMessage('');
    try {
      const response = await window.tolouReports?.print(id) as { status?: string; error?: string } | undefined;
      if (!response) throw new Error('Print API در دسترس نیست.');
      if (response.status !== 'pass') throw new Error(response.error || 'چاپ گزارش ناموفق بود.');
      setMessage('گزارش برای چاپ ارسال شد.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'خطا در چاپ گزارش'); }
    finally { setBusy(false); }
  }

  if (!mixDesignId) return <div className="alert warn">برای استفاده از Report Center ابتدا یک طرح اختلاط فعال انتخاب کنید.</div>;

  return <section className="panel">
    <div className="section-heading"><div><h2>Report Center</h2><p>گزارش‌های کنترل‌شده بر پایه immutable snapshot همان Revision</p></div><button onClick={() => void refresh()} disabled={busy}>بازخوانی</button></div>
    <div className="form-grid three">
      <label>نوع گزارش<select value={reportType} onChange={event => setReportType(event.target.value as ReportType)}>{REPORTS.map(item => <option key={item.value} value={item.value}>{item.fa} — {item.en}</option>)}</select></label>
      <label>زبان<select value={language} onChange={event => setLanguage(event.target.value as ReportLanguage)}><option value="fa">فارسی</option><option value="en">English</option></select></label>
      <label>مسئول صدور *<input value={generatedBy} onChange={event => setGeneratedBy(event.target.value)} placeholder="نام تهیه‌کننده / مسئول فنی" /></label>
    </div>
    <div className="action-row"><button className="primary" onClick={() => void createReport()} disabled={busy || !generatedBy.trim()}>ایجاد {language === 'fa' ? selected.fa : selected.en}</button></div>
    {message && <div className="alert info">{message}</div>}
    <h3>تاریخچه گزارش‌های صادرشده</h3>
    {reports.length === 0 ? <div className="empty-state">هنوز Report Snapshot برای این طرح ثبت نشده است.</div> : <div className="table-wrap"><table><thead><tr><th>نوع</th><th>Revision</th><th>زبان</th><th>تهیه‌کننده</th><th>تاریخ صدور</th><th>خروجی</th></tr></thead><tbody>{reports.map(row => { const title = REPORTS.find(item => item.value === row.reportType); return <tr key={row.id}><td>{title?.fa ?? row.reportType}</td><td>R{row.revisionNumber}</td><td>{row.language.toUpperCase()}</td><td>{row.generatedBy || '-'}</td><td>{new Date(row.generatedAt).toLocaleString('fa-IR')}</td><td><div className="inline-actions"><button onClick={() => void exportPdf(row.id)} disabled={busy}>PDF</button><button onClick={() => void printReport(row.id)} disabled={busy}>Print</button></div></td></tr>; })}</tbody></table></div>}
  </section>;
}
