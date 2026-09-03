import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { MaterialsView } from './MaterialsView';
import type { ProjectIntake, SaveProjectResponse } from './types/project';

type EngineState = 'idle' | 'checking' | 'ready' | 'error';
type ActiveView = 'dashboard' | 'new-project' | 'materials';

type EngineResult = {
  status?: string;
  engine?: string;
  version?: string;
  message?: string;
  mix_proportions?: { water_kg_m3?: number; cementitious_kg_m3?: number; w_cm_ratio?: number };
};

type RecentProject = {
  id: string;
  projectName: string;
  city: string;
  mixDesignId: string;
  concreteType: string;
  targetStrengthMpa: number;
  status: string;
  createdAt: string;
};

const initialProject: ProjectIntake = {
  project: {
    projectName: 'طرح اختلاط نمونه پروژه صنعتی یزد',
    city: 'یزد',
    locationDescription: 'محل پروژه، شرایط تماس با خاک/آب و توضیحات اجرایی',
    structureType: 'ساختمان بتن‌آرمه',
    elementType: 'فونداسیون',
    clientName: '',
    contractorName: '',
    consultantName: ''
  },
  laboratory: {
    labName: 'مرکز سنجش و تحقیقات بتن و مصالح سنگی یزد',
    licenseNumber: '',
    address: 'یزد',
    phone: '09133240205',
    logoPath: ''
  },
  designer: {
    fullName: 'مهندس عرفان امیری',
    role: 'طراح طرح اختلاط / مسئول فنی',
    licenseOrMembershipNumber: '',
    phone: '09133240205',
    email: ''
  },
  mixDesign: {
    concreteType: 'normal_weight',
    targetStrengthMpa: 35,
    requiredSlumpMm: 100,
    maxAggregateSizeMm: 19,
    exposureSummary: 'شرایط دوام در مرحله بعد با کلاس مواجهه ACI 318 تکمیل شود.'
  }
};

const modules = ['مشخصات پروژه', 'آزمایشگاه و طراح', 'انتخاب نوع بتن', 'مصالح و منابع', 'دانه‌بندی سنگدانه', 'دوام و پایایی', 'محاسبات طرح اختلاط', 'گزارش و مگاپرامپت'];
const standards = ['ACI 211.1 - بتن معمولی، سنگین و حجیم', 'ACI 211.4 - بتن پرمقاومت', 'ACI 201.2R - دوام بتن', 'ACI 318 / ACI 301 - کلاس مواجهه و الزامات اجرایی', 'ASTM C33 / C136 - سنگدانه و دانه‌بندی'];

export function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [activeMixDesignId, setActiveMixDesignId] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<EngineState>('idle');
  const [engineResult, setEngineResult] = useState<EngineResult | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [projectIntake, setProjectIntake] = useState<ProjectIntake>(initialProject);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  const kpis = useMemo(() => [
    { label: 'طرح‌های ذخیره‌شده', value: String(recentProjects.length), hint: 'آرشیو محلی SQLite', tone: 'blue' },
    { label: 'وضعیت موتور مهندسی', value: engineState === 'ready' ? 'متصل' : engineState === 'error' ? 'خطا' : 'آماده تست', hint: 'Python Engine', tone: engineState === 'error' ? 'red' : 'green' },
    { label: 'استانداردهای فعال', value: 'ACI', hint: 'قابل توسعه به ASTM/EN/ISIRI', tone: 'orange' },
    { label: 'طرح فعال', value: activeMixDesignId ? 'انتخاب شد' : 'ندارد', hint: 'برای ثبت مصالح لازم است', tone: activeMixDesignId ? 'purple' : 'red' }
  ], [activeMixDesignId, engineState, recentProjects.length]);

  async function checkEngine() {
    setEngineState('checking');
    setEngineError(null);
    try {
      if (!window.tolouEngine) throw new Error('Electron preload API در دسترس نیست. برنامه باید داخل Electron اجرا شود.');
      const health = await window.tolouEngine.health() as EngineResult;
      const sampleMix = await window.tolouEngine.calculateNormalMix({ requirements: { target_strength_mpa: projectIntake.mixDesign.targetStrengthMpa, slump_mm: projectIntake.mixDesign.requiredSlumpMm, max_aggregate_size_mm: projectIntake.mixDesign.maxAggregateSizeMm, w_cm_ratio: 0.45 } }) as EngineResult;
      setEngineResult({ ...sampleMix, engine: health.engine, version: health.version, message: health.message });
      setEngineState('ready');
    } catch (error) {
      setEngineError(error instanceof Error ? error.message : 'خطای ناشناخته در ارتباط با موتور Python');
      setEngineState('error');
    }
  }

  async function saveProject() {
    setSaveStatus('saving');
    setSaveMessage('');
    try {
      if (!window.tolouProjects) throw new Error('API ذخیره پروژه در دسترس نیست. برنامه باید داخل Electron اجرا شود.');
      const result = await window.tolouProjects.saveIntake(projectIntake) as SaveProjectResponse;
      if (result.status !== 'pass' || !result.mixDesignId) throw new Error(result.error ?? 'ذخیره پروژه ناموفق بود.');
      const recent = await window.tolouProjects.listRecent() as { status: string; projects?: RecentProject[] };
      setRecentProjects(recent.projects ?? []);
      setActiveMixDesignId(result.mixDesignId);
      setSaveStatus('saved');
      setSaveMessage(`پروژه ذخیره شد. کد طرح: ${result.mixDesignId}`);
      setActiveView('materials');
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error instanceof Error ? error.message : 'خطای ناشناخته در ذخیره پروژه');
    }
  }

  function updateProject<K extends keyof ProjectIntake>(section: K, key: keyof ProjectIntake[K], value: string | number) {
    setProjectIntake(previous => ({ ...previous, [section]: { ...previous[section], [key]: value } }));
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-top">
          <div className="brand"><div className="brand-icon">ط</div><div><strong>طلوع بتن</strong><small>TOLOU CONCRETE MIX DESIGN</small></div></div>
          <div className="module-title"><h1>نرم‌افزار جامع طرح اختلاط انواع بتن</h1><p>طراحی، کنترل دوام، تحلیل دانه‌بندی، گزارش PDF و مگاپرامپت مهندسی</p></div>
          <div className="header-actions"><button>راهنما</button><button>گزارش</button></div>
        </div>
        <div className="header-bottom"><span>ConcreteMixDesign-Desktop / فاز اجرایی اولیه</span><div className="badges"><span className="badge green">Python Engine</span><span className="badge blue">SQLite</span><span className="badge orange">نسخه 0.1.0</span></div></div>
      </header>

      <nav className="top-nav">
        <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => setActiveView('dashboard')}>داشبورد</button>
        <button className={activeView === 'new-project' ? 'active' : ''} onClick={() => setActiveView('new-project')}>پروژه جدید</button>
        <button className={activeView === 'materials' ? 'active' : ''} onClick={() => setActiveView('materials')}>مصالح</button>
        <button>دانه‌بندی</button><button>دوام</button><button>نتایج</button><button>گزارش</button>
      </nav>

      <div className="page-grid">
        <aside className="sidebar">
          <div className="sidebar-title">ساختار نرم‌افزار</div>
          {modules.map((item, index) => <button className={index === 3 && activeView === 'materials' ? 'side active' : index === 0 && activeView !== 'materials' ? 'side active' : 'side'} key={item}><span><b className="ico">{index + 1}</b>{item}</span><span>›</span></button>)}
          <div className="note"><b>اصل مهندسی</b><br />هیچ خروجی بدون استاندارد، فرضیه، هشدار و قابلیت ردیابی معتبر نیست.</div>
        </aside>

        <main className="workspace">
          {activeView === 'dashboard' && <Dashboard kpis={kpis} engineState={engineState} engineResult={engineResult} engineError={engineError} recentProjects={recentProjects} onCheckEngine={checkEngine} onNewProject={() => setActiveView('new-project')} onSelectProject={(id) => { setActiveMixDesignId(id); setActiveView('materials'); }} />}
          {activeView === 'new-project' && <ProjectForm projectIntake={projectIntake} saveStatus={saveStatus} saveMessage={saveMessage} onUpdate={updateProject} onSave={saveProject} />}
          {activeView === 'materials' && <MaterialsView mixDesignId={activeMixDesignId} />}
        </main>
      </div>
    </div>
  );
}

function Dashboard(props: { kpis: Array<{ label: string; value: string; hint: string; tone: string }>; engineState: EngineState; engineResult: EngineResult | null; engineError: string | null; recentProjects: RecentProject[]; onCheckEngine: () => void; onNewProject: () => void; onSelectProject: (mixDesignId: string) => void; }) {
  return <>
    <section className="titlebar"><div><h2>داشبورد مدیریتی طرح‌های اختلاط</h2><p>مدیریت پروژه‌ها، وضعیت محاسبات، دوام، گزارش‌ها و موتور مهندسی</p></div><div className="toolbar"><button className="btn primary" onClick={props.onNewProject}>طرح جدید</button><button className="btn success" disabled={props.engineState === 'checking'} onClick={props.onCheckEngine}>{props.engineState === 'checking' ? 'در حال تست...' : 'تست موتور Python'}</button></div></section>
    <section className="kpis">{props.kpis.map(kpi => <article className={`kpi ${kpi.tone}`} key={kpi.label}><label>{kpi.label}</label><strong>{kpi.value}</strong><small>{kpi.hint}</small></article>)}</section>
    <section className="content-grid">
      <article className="panel"><div className="panel-head"><div><h3>استانداردهای هسته اولیه</h3><span>قابل توسعه و قابل ردیابی</span></div></div><div className="panel-body standards-list">{standards.map(item => <div key={item}>✓ {item}</div>)}</div></article>
      <article className="panel"><div className="panel-head"><div><h3>آخرین پروژه‌های ذخیره‌شده</h3><span>برای افزودن مصالح روی پروژه کلیک کنید</span></div></div><div className="panel-body standards-list">{props.recentProjects.length === 0 && <div>هنوز پروژه‌ای ذخیره نشده است.</div>}{props.recentProjects.map(project => <button className="list-button" key={project.mixDesignId} onClick={() => props.onSelectProject(project.mixDesignId)}>✓ {project.projectName} - {project.city} - {project.targetStrengthMpa} MPa</button>)}</div></article>
      <article className="panel wide-panel"><div className="panel-head"><div><h3>وضعیت اتصال به موتور Python</h3><span>خروجی واقعی از IPC و Engine</span></div><span className={`badge ${props.engineState === 'ready' ? 'green' : props.engineState === 'error' ? 'red' : 'orange'}`}>{props.engineState === 'ready' ? 'Connected' : props.engineState === 'error' ? 'Error' : 'Ready to test'}</span></div><div className="panel-body alerts">{props.engineError && <div className="alert danger">{props.engineError}</div>}{!props.engineResult && !props.engineError && <div className="alert info">برای تست ارتباط، روی دکمه «تست موتور Python» کلیک کنید.</div>}{props.engineResult && <><div className="alert ok">{props.engineResult.message ?? 'موتور Python پاسخ معتبر داد.'}</div><div className="result-grid"><div><label>آب تخمینی</label><strong>{props.engineResult.mix_proportions?.water_kg_m3 ?? '-'} kg/m³</strong></div><div><label>مواد سیمانی</label><strong>{props.engineResult.mix_proportions?.cementitious_kg_m3 ?? '-'} kg/m³</strong></div><div><label>w/cm</label><strong>{props.engineResult.mix_proportions?.w_cm_ratio ?? '-'}</strong></div></div><div className="alert warn">این فقط تست مسیر محاسبات است؛ پیاده‌سازی کامل ACI 211.1 در مرحله بعد انجام می‌شود.</div></>}</div></article>
    </section>
  </>;
}

function ProjectForm(props: { projectIntake: ProjectIntake; saveStatus: 'idle' | 'saving' | 'saved' | 'error'; saveMessage: string; onUpdate: <K extends keyof ProjectIntake>(section: K, key: keyof ProjectIntake[K], value: string | number) => void; onSave: () => void; }) {
  const { projectIntake, onUpdate } = props;
  return <>
    <section className="titlebar"><div><h2>پروژه جدید طرح اختلاط</h2><p>ثبت اطلاعات پایه‌ای که در تمام محاسبات، گزارش PDF و آرشیو پروژه استفاده می‌شود</p></div><div className="toolbar"><button className="btn success" disabled={props.saveStatus === 'saving'} onClick={props.onSave}>{props.saveStatus === 'saving' ? 'در حال ذخیره...' : 'ذخیره و رفتن به مصالح'}</button></div></section>
    {props.saveMessage && <div className={`alert ${props.saveStatus === 'error' ? 'danger' : 'ok'}`}>{props.saveMessage}</div>}
    <section className="form-grid"><FormPanel title="مشخصات پروژه" subtitle="اطلاعات اجرایی و قراردادی پروژه"><Field label="نام پروژه" value={projectIntake.project.projectName} onChange={value => onUpdate('project', 'projectName', value)} /><Field label="شهر" value={projectIntake.project.city} onChange={value => onUpdate('project', 'city', value)} /><Field label="نوع سازه" value={projectIntake.project.structureType} onChange={value => onUpdate('project', 'structureType', value)} /><Field label="عضو بتنی" value={projectIntake.project.elementType} onChange={value => onUpdate('project', 'elementType', value)} /><Field label="کارفرما" value={projectIntake.project.clientName} onChange={value => onUpdate('project', 'clientName', value)} /><Field label="پیمانکار" value={projectIntake.project.contractorName} onChange={value => onUpdate('project', 'contractorName', value)} /><Field label="مشاور" value={projectIntake.project.consultantName} onChange={value => onUpdate('project', 'consultantName', value)} /><TextArea label="توضیحات موقعیت و شرایط پروژه" value={projectIntake.project.locationDescription} onChange={value => onUpdate('project', 'locationDescription', value)} /></FormPanel>
    <FormPanel title="آزمایشگاه و طراح" subtitle="برای امضا، گزارش و ردیابی مسئولیت فنی"><Field label="نام آزمایشگاه" value={projectIntake.laboratory.labName} onChange={value => onUpdate('laboratory', 'labName', value)} /><Field label="شماره مجوز آزمایشگاه" value={projectIntake.laboratory.licenseNumber} onChange={value => onUpdate('laboratory', 'licenseNumber', value)} /><Field label="آدرس آزمایشگاه" value={projectIntake.laboratory.address} onChange={value => onUpdate('laboratory', 'address', value)} /><Field label="تلفن آزمایشگاه" value={projectIntake.laboratory.phone} onChange={value => onUpdate('laboratory', 'phone', value)} /><Field label="نام طراح" value={projectIntake.designer.fullName} onChange={value => onUpdate('designer', 'fullName', value)} /><Field label="سمت طراح" value={projectIntake.designer.role} onChange={value => onUpdate('designer', 'role', value)} /><Field label="شماره نظام/عضویت" value={projectIntake.designer.licenseOrMembershipNumber} onChange={value => onUpdate('designer', 'licenseOrMembershipNumber', value)} /><Field label="موبایل طراح" value={projectIntake.designer.phone} onChange={value => onUpdate('designer', 'phone', value)} /></FormPanel>
    <FormPanel title="مشخصات اولیه طرح" subtitle="ورودی‌های پایه برای موتور محاسبات"><SelectField label="نوع بتن" value={projectIntake.mixDesign.concreteType} onChange={value => onUpdate('mixDesign', 'concreteType', value)} /><NumberField label="مقاومت هدف MPa" value={projectIntake.mixDesign.targetStrengthMpa} onChange={value => onUpdate('mixDesign', 'targetStrengthMpa', value)} /><NumberField label="اسلامپ مورد نیاز mm" value={projectIntake.mixDesign.requiredSlumpMm} onChange={value => onUpdate('mixDesign', 'requiredSlumpMm', value)} /><NumberField label="حداکثر اندازه سنگدانه mm" value={projectIntake.mixDesign.maxAggregateSizeMm} onChange={value => onUpdate('mixDesign', 'maxAggregateSizeMm', value)} /><TextArea label="خلاصه شرایط دوام و مواجهه" value={projectIntake.mixDesign.exposureSummary} onChange={value => onUpdate('mixDesign', 'exposureSummary', value)} /></FormPanel></section>
  </>;
}

function FormPanel(props: { title: string; subtitle: string; children: ReactNode }) { return <article className="panel form-panel"><div className="panel-head"><div><h3>{props.title}</h3><span>{props.subtitle}</span></div></div><div className="panel-body form-body">{props.children}</div></article>; }
function Field(props: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field"><span>{props.label}</span><input value={props.value} onChange={event => props.onChange(event.target.value)} /></label>; }
function NumberField(props: { label: string; value: number; onChange: (value: number) => void }) { return <label className="field"><span>{props.label}</span><input type="number" value={props.value} onChange={event => props.onChange(Number(event.target.value))} /></label>; }
function TextArea(props: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field full"><span>{props.label}</span><textarea value={props.value} onChange={event => props.onChange(event.target.value)} /></label>; }
function SelectField(props: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field"><span>{props.label}</span><select value={props.value} onChange={event => props.onChange(event.target.value)}><option value="normal_weight">بتن معمولی</option><option value="high_strength">بتن پرمقاومت</option><option value="self_consolidating">بتن خودتراکم</option><option value="mass_concrete">بتن حجیم</option><option value="lightweight">بتن سبک</option><option value="heavyweight">بتن سنگین</option><option value="fiber_reinforced">بتن الیافی</option><option value="pumped">بتن پمپی</option></select></label>; }
