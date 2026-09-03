import { useMemo, useState } from 'react';

type EngineState = 'idle' | 'checking' | 'ready' | 'error';

type EngineResult = {
  status?: string;
  engine?: string;
  version?: string;
  message?: string;
  mix_proportions?: {
    water_kg_m3?: number;
    cementitious_kg_m3?: number;
    w_cm_ratio?: number;
  };
  warnings?: Array<{ code: string; message: string }>;
  standard_references?: string[];
};

const modules = [
  'مشخصات پروژه',
  'آزمایشگاه و طراح',
  'انتخاب نوع بتن',
  'مصالح و منابع',
  'دانه‌بندی سنگدانه',
  'دوام و پایایی',
  'محاسبات طرح اختلاط',
  'گزارش و مگاپرامپت'
];

const standards = [
  'ACI 211.1 - بتن معمولی، سنگین و حجیم',
  'ACI 211.4 - بتن پرمقاومت',
  'ACI 201.2R - دوام بتن',
  'ACI 318 / ACI 301 - کلاس مواجهه و الزامات اجرایی',
  'ASTM C33 / C136 - سنگدانه و دانه‌بندی'
];

export function App() {
  const [engineState, setEngineState] = useState<EngineState>('idle');
  const [engineResult, setEngineResult] = useState<EngineResult | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  const kpis = useMemo(() => [
    { label: 'طرح‌های ذخیره‌شده', value: '0', hint: 'آرشیو محلی SQLite', tone: 'blue' },
    {
      label: 'وضعیت موتور مهندسی',
      value: engineState === 'ready' ? 'متصل' : engineState === 'error' ? 'خطا' : 'آماده تست',
      hint: 'Python Engine',
      tone: engineState === 'error' ? 'red' : 'green'
    },
    { label: 'استانداردهای فعال', value: 'ACI', hint: 'قابل توسعه به ASTM/EN/ISIRI', tone: 'orange' },
    { label: 'گزارش‌ها', value: 'PDF', hint: 'خروجی چاپ حرفه‌ای', tone: 'purple' }
  ], [engineState]);

  async function checkEngine() {
    setEngineState('checking');
    setEngineError(null);

    try {
      if (!window.tolouEngine) {
        throw new Error('Electron preload API در دسترس نیست. برنامه باید داخل Electron اجرا شود.');
      }

      const health = await window.tolouEngine.health() as EngineResult;
      const sampleMix = await window.tolouEngine.calculateNormalMix({
        requirements: {
          target_strength_mpa: 35,
          slump_mm: 100,
          max_aggregate_size_mm: 19,
          w_cm_ratio: 0.45
        }
      }) as EngineResult;

      setEngineResult({ ...sampleMix, engine: health.engine, version: health.version, message: health.message });
      setEngineState('ready');
    } catch (error) {
      setEngineError(error instanceof Error ? error.message : 'خطای ناشناخته در ارتباط با موتور Python');
      setEngineState('error');
    }
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-top">
          <div className="brand">
            <div className="brand-icon">ط</div>
            <div>
              <strong>طلوع بتن</strong>
              <small>TOLOU CONCRETE MIX DESIGN</small>
            </div>
          </div>
          <div className="module-title">
            <h1>نرم‌افزار جامع طرح اختلاط انواع بتن</h1>
            <p>طراحی، کنترل دوام، تحلیل دانه‌بندی، گزارش PDF و مگاپرامپت مهندسی</p>
          </div>
          <div className="header-actions">
            <button>راهنما</button>
            <button>گزارش</button>
          </div>
        </div>
        <div className="header-bottom">
          <span>ConcreteMixDesign-Desktop / فاز اجرایی اولیه</span>
          <div className="badges">
            <span className="badge green">Python Engine</span>
            <span className="badge blue">Electron</span>
            <span className="badge orange">نسخه 0.1.0</span>
          </div>
        </div>
      </header>

      <nav className="top-nav">
        <button className="active">داشبورد</button>
        <button>پروژه جدید</button>
        <button>مصالح</button>
        <button>دانه‌بندی</button>
        <button>دوام</button>
        <button>نتایج</button>
        <button>گزارش</button>
      </nav>

      <div className="page-grid">
        <aside className="sidebar">
          <div className="sidebar-title">ساختار نرم‌افزار</div>
          {modules.map((item, index) => (
            <button className={index === 0 ? 'side active' : 'side'} key={item}>
              <span><b className="ico">{index + 1}</b>{item}</span>
              <span>›</span>
            </button>
          ))}
          <div className="note">
            <b>اصل مهندسی</b>
            <br />
            هیچ خروجی بدون استاندارد، فرضیه، هشدار و قابلیت ردیابی معتبر نیست.
          </div>
        </aside>

        <main className="workspace">
          <section className="titlebar">
            <div>
              <h2>داشبورد مدیریتی طرح‌های اختلاط</h2>
              <p>نمای اولیه برای مدیریت پروژه‌ها، وضعیت محاسبات، دوام، گزارش‌ها و موتور مهندسی</p>
            </div>
            <div className="toolbar">
              <button className="btn ghost">ورود داده نمونه</button>
              <button className="btn primary">طرح جدید</button>
              <button className="btn success" disabled={engineState === 'checking'} onClick={checkEngine}>
                {engineState === 'checking' ? 'در حال تست...' : 'تست موتور Python'}
              </button>
            </div>
          </section>

          <section className="kpis">
            {kpis.map(kpi => (
              <article className={`kpi ${kpi.tone}`} key={kpi.label}>
                <label>{kpi.label}</label>
                <strong>{kpi.value}</strong>
                <small>{kpi.hint}</small>
              </article>
            ))}
          </section>

          <section className="content-grid">
            <article className="panel wide">
              <div className="panel-head">
                <div>
                  <h3>فرآیند طرح اختلاط</h3>
                  <span>جریان اصلی نرم‌افزار صنعتی</span>
                </div>
                <span className="badge blue">Workflow</span>
              </div>
              <div className="panel-body flow-list">
                <div>۱. ثبت مشخصات پروژه، شهر، سازه و شرایط اجرا</div>
                <div>۲. ثبت آزمایشگاه، طراح، شماره مجوز و لوگو</div>
                <div>۳. ورود مشخصات مصالح، رطوبت، جذب آب و دانه‌بندی</div>
                <div>۴. انتخاب نوع بتن و استاندارد مرجع</div>
                <div>۵. محاسبه، کنترل دوام، هشدارها و پیشنهاد اصلاح</div>
                <div>۶. تولید گزارش PDF، خروجی چاپ و مگاپرامپت AI</div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <h3>استانداردهای هسته اولیه</h3>
                  <span>قابل توسعه و قابل ردیابی</span>
                </div>
              </div>
              <div className="panel-body standards-list">
                {standards.map(item => <div key={item}>✓ {item}</div>)}
              </div>
            </article>

            <article className="panel wide">
              <div className="panel-head">
                <div>
                  <h3>وضعیت اتصال به موتور Python</h3>
                  <span>خروجی واقعی از IPC و Engine</span>
                </div>
                <span className={`badge ${engineState === 'ready' ? 'green' : engineState === 'error' ? 'red' : 'orange'}`}>
                  {engineState === 'ready' ? 'Connected' : engineState === 'error' ? 'Error' : 'Ready to test'}
                </span>
              </div>
              <div className="panel-body alerts">
                {engineError && <div className="alert danger">{engineError}</div>}
                {!engineResult && !engineError && <div className="alert info">برای تست ارتباط، روی دکمه «تست موتور Python» کلیک کنید.</div>}
                {engineResult && (
                  <>
                    <div className="alert ok">{engineResult.message ?? 'موتور Python پاسخ معتبر داد.'}</div>
                    <div className="result-grid">
                      <div><label>آب تخمینی</label><strong>{engineResult.mix_proportions?.water_kg_m3 ?? '-'} kg/m³</strong></div>
                      <div><label>مواد سیمانی</label><strong>{engineResult.mix_proportions?.cementitious_kg_m3 ?? '-'} kg/m³</strong></div>
                      <div><label>w/cm</label><strong>{engineResult.mix_proportions?.w_cm_ratio ?? '-'}</strong></div>
                    </div>
                    <div className="alert warn">این فقط تست مسیر محاسبات است؛ پیاده‌سازی کامل ACI 211.1 در مرحله بعد انجام می‌شود.</div>
                  </>
                )}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
