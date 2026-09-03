const kpis = [
  { label: 'طرح‌های ذخیره‌شده', value: '0', hint: 'آرشیو محلی SQLite', tone: 'blue' },
  { label: 'وضعیت موتور مهندسی', value: 'آماده', hint: 'Python Engine', tone: 'green' },
  { label: 'استانداردهای فعال', value: 'ACI', hint: 'قابل توسعه به ASTM/EN/ISIRI', tone: 'orange' },
  { label: 'گزارش‌ها', value: 'PDF', hint: 'خروجی چاپ حرفه‌ای', tone: 'purple' }
];

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
              <button className="btn success">تست موتور Python</button>
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
                  <h3>نمونه کارت تحلیل مهندسی</h3>
                  <span>در نسخه بعد با خروجی واقعی Python پر می‌شود</span>
                </div>
                <span className="badge orange">Needs Review</span>
              </div>
              <div className="panel-body alerts">
                <div className="alert info">اطلاعات پروژه هنوز وارد نشده است؛ تحلیل دوام قطعی ممکن نیست.</div>
                <div className="alert warn">برای خروجی صنعتی، نتایج باید با داده آزمایشگاهی مصالح کنترل شود.</div>
                <div className="alert ok">ساختار نرم‌افزار آماده اتصال به موتور Python و دیتابیس SQLite است.</div>
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
