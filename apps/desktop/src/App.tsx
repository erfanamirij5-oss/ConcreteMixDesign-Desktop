import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AggregateBlendOptimizerView } from './AggregateBlendOptimizerView';
import { AggregateBlendResults } from './AggregateBlendResults';
import { DashboardHome } from './DashboardHome';
import { DurabilityView } from './DurabilityView';
import { EngineeringSystemsResults } from './EngineeringSystemsResults';
import { GradationView } from './GradationView';
import { MaterialsView } from './MaterialsView';
import { MixDesignManager } from './MixDesignManager';
import { MixDesignWorkspace } from './MixDesignWorkspace';
import type { ProjectIntake, SaveProjectResponse } from './types/project';

type EngineState = 'idle' | 'checking' | 'ready' | 'error';
type ActiveView = 'dashboard' | 'mix-designs' | 'workspace' | 'new-project' | 'materials' | 'gradation' | 'aggregate-blend' | 'durability' | 'results';
type WorkspaceSection = 'overview' | 'materials' | 'gradation' | 'blend' | 'durability' | 'results';
type CalculationState = 'idle' | 'calculating' | 'done' | 'error';
type AggregateAnalysisRow = { material_id?: string; material_name?: string; material_type?: string; share_percent?: number; specific_gravity_ssd?: number; ssd_mass_kg_m3?: number; batch_mass_kg_m3?: number; absorption_percent?: number; moisture_percent?: number; water_adjustment_kg_m3?: number; };
type EngineWarning = { code?: string; severity?: 'needs_review' | 'warning' | 'fail' | string; message?: string; reference?: string; };
type EngineeringSystemsProps = Parameters<typeof EngineeringSystemsResults>[0];
type AggregateBlendResultProps = Parameters<typeof AggregateBlendResults>[0];
type EngineResult = {
  status?: string; engine?: string; version?: string; engine_version?: string; message?: string; calculation_method?: string;
  mix_proportions?: { water_kg_m3?: number; cementitious_kg_m3?: number | null; w_cm_ratio?: number | null; fine_aggregate_kg_m3?: number | null; coarse_aggregate_kg_m3?: number | null; aggregate_ssd_kg_m3?: number | null; aggregate_batch_kg_m3?: number | null; batch_water_adjustment_kg_m3?: number | null; water_to_add_kg_m3?: number | null; air_content_percent?: number; durability_governing_max_w_cm?: number | null; durability_min_strength_mpa?: number | null; durability_target_air_percent?: number | null; };
  aggregate_analysis?: AggregateAnalysisRow[]; aggregate_compliance?: EngineeringSystemsProps['aggregateCompliance']; combined_aggregate_system?: AggregateBlendResultProps['combined']; aggregate_blend_optimizer?: AggregateBlendResultProps['optimizer']; engineering_notes?: string[]; warnings?: EngineWarning[]; standard_references?: string[]; assumptions?: string[]; limitations?: string[]; durability?: { exposure_classes?: { freeze_thaw?: string; sulfate?: string; water?: string; corrosion?: string } }; cementitious_system?: EngineeringSystemsProps['cementitiousSystem']; cementitious_compliance?: EngineeringSystemsProps['cementitiousCompliance']; asr_compliance?: EngineeringSystemsProps['asrCompliance']; water_compliance?: EngineeringSystemsProps['waterCompliance']; admixture_system?: EngineeringSystemsProps['admixtureSystem']; admixture_compliance?: EngineeringSystemsProps['admixtureCompliance']; chloride_compliance?: EngineeringSystemsProps['chlorideCompliance'];
};
type RecentProject = { id: string; projectName: string; city: string; mixDesignId: string; concreteType: string; targetStrengthMpa: number; status: string; createdAt: string; };

const initialProject: ProjectIntake = {
  project: { projectName: 'طرح اختلاط نمونه پروژه صنعتی یزد', city: 'یزد', locationDescription: 'محل پروژه، شرایط تماس با خاک/آب و توضیحات اجرایی', structureType: 'ساختمان بتن‌آرمه', elementType: 'فونداسیون', clientName: '', contractorName: '', consultantName: '' },
  laboratory: { labName: 'مرکز سنجش و تحقیقات بتن و مصالح سنگی یزد', licenseNumber: '', address: 'یزد', phone: '09133240205', logoPath: '' },
  designer: { fullName: 'مهندس عرفان امیری', role: 'طراح طرح اختلاط / مسئول فنی', licenseOrMembershipNumber: '', phone: '09133240205', email: '' },
  mixDesign: { concreteType: 'normal_weight', targetStrengthMpa: 35, requiredSlumpMm: 100, maxAggregateSizeMm: 19, exposureSummary: 'شرایط دوام با ماژول ACI 318-25 تکمیل شود.' }
};

const modules = ['داشبورد مدیریت', 'طرح‌های اختلاط', 'ثبت طرح جدید', 'پرونده طرح فعال', 'Trial Mix (بعدی)', 'گزارش (بعدی)', 'پشتیبان‌گیری (بعدی)'];

export function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>('overview');
  const [activeMixDesignId, setActiveMixDesignId] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<EngineState>('idle');
  const [engineResult, setEngineResult] = useState<EngineResult | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [calculationState, setCalculationState] = useState<CalculationState>('idle');
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [projectIntake, setProjectIntake] = useState<ProjectIntake>(initialProject);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => { void refreshProjects(); }, []);

  const activeProject = useMemo(() => recentProjects.find(item => item.mixDesignId === activeMixDesignId) ?? null, [activeMixDesignId, recentProjects]);

  async function refreshProjects() {
    try {
      if (!window.tolouProjects?.listRecent) return;
      const recent = await window.tolouProjects.listRecent() as { status: string; projects?: RecentProject[] };
      if (recent.status === 'pass') setRecentProjects(recent.projects ?? []);
    } catch { /* Dashboard stays usable even if project listing cannot be loaded yet. */ }
  }

  async function checkEngine() {
    setEngineState('checking'); setEngineError(null);
    try {
      if (!window.tolouEngine) throw new Error('Electron preload API در دسترس نیست. برنامه باید داخل Electron اجرا شود.');
      const health = await window.tolouEngine.health() as EngineResult;
      setEngineResult(health); setEngineState('ready');
    } catch (error) { setEngineError(error instanceof Error ? error.message : 'خطای ناشناخته در ارتباط با موتور Python'); setEngineState('error'); }
  }

  async function calculateSavedMix() {
    setCalculationState('calculating'); setCalculationError(null);
    try {
      if (!activeMixDesignId) throw new Error('ابتدا یک طرح ذخیره‌شده را انتخاب کنید.');
      if (!window.tolouEngine?.calculateSavedMix) throw new Error('مسیر محاسبه طرح ذخیره‌شده در Electron در دسترس نیست.');
      const result = await window.tolouEngine.calculateSavedMix(activeMixDesignId) as EngineResult;
      setEngineResult(result); setCalculationState('done'); setEngineState('ready');
    } catch (error) { setCalculationError(error instanceof Error ? error.message : 'خطای ناشناخته در محاسبه طرح ذخیره‌شده'); setCalculationState('error'); }
  }

  async function saveProject() {
    setSaveStatus('saving'); setSaveMessage('');
    try {
      if (!window.tolouProjects) throw new Error('API ذخیره پروژه در دسترس نیست. برنامه باید داخل Electron اجرا شود.');
      const result = await window.tolouProjects.saveIntake(projectIntake) as SaveProjectResponse;
      if (result.status !== 'pass' || !result.mixDesignId) throw new Error(result.error ?? 'ذخیره پروژه ناموفق بود.');
      await refreshProjects();
      setActiveMixDesignId(result.mixDesignId); setEngineResult(null); setCalculationState('idle'); setSaveStatus('saved'); setSaveMessage(`پروژه ذخیره شد. کد طرح: ${result.mixDesignId}`); setWorkspaceSection('overview'); setActiveView('workspace');
    } catch (error) { setSaveStatus('error'); setSaveMessage(error instanceof Error ? error.message : 'خطای ناشناخته در ذخیره پروژه'); }
  }

  function openProject(id: string) { setActiveMixDesignId(id); setEngineResult(null); setCalculationState('idle'); setWorkspaceSection('overview'); setActiveView('workspace'); }

  function openWorkspaceSection(section: WorkspaceSection) {
    setWorkspaceSection(section); setActiveView('workspace');
  }

  function updateProject<K extends keyof ProjectIntake>(section: K, key: keyof ProjectIntake[K], value: string | number) { setProjectIntake(previous => ({ ...previous, [section]: { ...previous[section], [key]: value } })); }

  function renderWorkspaceBody() {
    if (!activeProject) return <div className="alert warn">هیچ پرونده فعالی انتخاب نشده است. از بخش «طرح‌های اختلاط» یک طرح را باز کنید.</div>;
    return <>
      <MixDesignWorkspace project={activeProject} activeSection={workspaceSection} onSectionChange={openWorkspaceSection} onBackToManager={() => setActiveView('mix-designs')} />
      {workspaceSection === 'materials' && <MaterialsView mixDesignId={activeMixDesignId} />}
      {workspaceSection === 'gradation' && <GradationView mixDesignId={activeMixDesignId} />}
      {workspaceSection === 'blend' && <AggregateBlendOptimizerView mixDesignId={activeMixDesignId} />}
      {workspaceSection === 'durability' && <DurabilityView mixDesignId={activeMixDesignId} maxAggregateSizeMm={projectIntake.mixDesign.maxAggregateSizeMm} />}
      {workspaceSection === 'results' && <ResultsView mixDesignId={activeMixDesignId} result={engineResult} state={calculationState} error={calculationError} onCalculate={calculateSavedMix} />}
    </>;
  }

  return <div className="app-shell">
    <header className="header"><div className="header-top"><div className="brand"><div className="brand-icon">ط</div><div><strong>طلوع بتن</strong><small>TOLOU CONCRETE MIX DESIGN</small></div></div><div className="module-title"><h1>سامانه مهندسی و مدیریت طرح اختلاط بتن</h1><p>مدیریت پرونده طرح، مصالح، دوام، محاسبات و کنترل مهندسی</p></div><div className="header-actions"><button disabled>راهنما — در دست توسعه</button></div></div><div className="header-bottom"><span>ConcreteMixDesign-Desktop / Management v0.4 Development</span><div className="badges"><span className="badge green">Python Engine</span><span className="badge blue">SQLite</span><span className="badge orange">Core 0.3.0</span></div></div></header>
    <nav className="top-nav"><button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => setActiveView('dashboard')}>داشبورد</button><button className={activeView === 'mix-designs' ? 'active' : ''} onClick={() => setActiveView('mix-designs')}>طرح‌های اختلاط</button><button className={activeView === 'new-project' ? 'active' : ''} onClick={() => setActiveView('new-project')}>ثبت طرح جدید</button><button className={activeView === 'workspace' ? 'active' : ''} disabled={!activeProject} onClick={() => setActiveView('workspace')}>پرونده فعال</button></nav>
    <div className="page-grid"><aside className="sidebar"><div className="sidebar-title">مرکز عملیات</div>{modules.map((item, index) => <button className={sidebarClass(index, activeView)} key={item} disabled={index >= 4}><span><b className="ico">{index + 1}</b>{item}</span><span>›</span></button>)}<div className="note"><b>اصل مهندسی</b><br />هیچ خروجی بدون استاندارد، فرضیه، هشدار و قابلیت ردیابی معتبر نیست.</div></aside><main className="workspace">
      {activeView === 'dashboard' && <DashboardHome projects={recentProjects} engineState={engineState} activeMixDesignId={activeMixDesignId} onCheckEngine={checkEngine} onNewProject={() => setActiveView('new-project')} onOpenProject={openProject} />}
      {activeView === 'mix-designs' && <MixDesignManager projects={recentProjects} activeMixDesignId={activeMixDesignId} onNewProject={() => setActiveView('new-project')} onOpenProject={openProject} />}
      {activeView === 'new-project' && <ProjectForm projectIntake={projectIntake} saveStatus={saveStatus} saveMessage={saveMessage} onUpdate={updateProject} onSave={saveProject} />}
      {activeView === 'workspace' && renderWorkspaceBody()}
      {activeView === 'materials' && <MaterialsView mixDesignId={activeMixDesignId} />}
      {activeView === 'gradation' && <GradationView mixDesignId={activeMixDesignId} />}
      {activeView === 'aggregate-blend' && <AggregateBlendOptimizerView mixDesignId={activeMixDesignId} />}
      {activeView === 'durability' && <DurabilityView mixDesignId={activeMixDesignId} maxAggregateSizeMm={projectIntake.mixDesign.maxAggregateSizeMm} />}
      {activeView === 'results' && <ResultsView mixDesignId={activeMixDesignId} result={engineResult} state={calculationState} error={calculationError} onCalculate={calculateSavedMix} />}
    </main></div>
  </div>;
}

function sidebarClass(index: number, activeView: ActiveView) { if (activeView === 'dashboard' && index === 0) return 'side active'; if (activeView === 'mix-designs' && index === 1) return 'side active'; if (activeView === 'new-project' && index === 2) return 'side active'; if (activeView === 'workspace' && index === 3) return 'side active'; return 'side'; }

function ResultsView(props: { mixDesignId: string | null; result: EngineResult | null; state: CalculationState; error: string | null; onCalculate: () => void; }) {
  const mix = props.result?.mix_proportions; const warnings = props.result?.warnings ?? []; const aggregateRows = props.result?.aggregate_analysis ?? []; const exposure = props.result?.durability?.exposure_classes;
  return <><section className="titlebar"><div><h2>نتایج محاسبات طرح اختلاط</h2><p>محاسبه مستقیم از پروژه، دوام، مصالح و سهم‌های ذخیره‌شده در SQLite توسط Python Engine</p></div><div className="toolbar"><button className="btn success" disabled={!props.mixDesignId || props.state === 'calculating'} onClick={props.onCalculate}>{props.state === 'calculating' ? 'در حال محاسبه...' : 'محاسبه طرح اختلاط'}</button></div></section>
    {!props.mixDesignId && <div className="alert warn">ابتدا یک پروژه ذخیره‌شده را انتخاب کنید.</div>}{props.error && <div className="alert danger">{props.error}</div>}{props.mixDesignId && !props.result && !props.error && <div className="alert info">طرح فعال آماده است. موتور ابتدا دوام ACI 318-25 و سپس تناسب اجزا ACI 211.1 را اجرا می‌کند.</div>}
    {props.result && <>{props.result.status === 'fail' && <div className="alert danger">محاسبه مهندسی با وضعیت FAIL پایان یافته است؛ مقادیر نمایش‌داده‌شده تا رفع خطاهای حاکم برای تولید قابل تأیید نیستند.</div>}<section className="kpis"><article className="kpi blue"><label>وضعیت محاسبه</label><strong>{props.result.status ?? '-'}</strong><small>Engine {props.result.engine_version ?? props.result.version ?? '0.3.0'}</small></article><article className="kpi green"><label>آب طراحی</label><strong>{displayValue(mix?.water_kg_m3)}</strong><small>kg/m³</small></article><article className="kpi orange"><label>مواد سیمانی</label><strong>{displayValue(mix?.cementitious_kg_m3)}</strong><small>kg/m³</small></article><article className="kpi purple"><label>آب قابل تزریق</label><strong>{displayValue(mix?.water_to_add_kg_m3)}</strong><small>kg/m³ پس از رطوبت و افزودنی</small></article></section><section className="content-grid"><article className="panel wide-panel"><div className="panel-head"><div><h3>الزامات دوام اعمال‌شده</h3><span>ACI CODE-318-25 → ACI PRC-211.1-22</span></div><span className="badge purple">{exposure ? `${exposure.freeze_thaw}/${exposure.sulfate}/${exposure.water}/${exposure.corrosion}` : 'No exposure data'}</span></div><div className="panel-body"><div className="result-grid"><div><label>حداکثر w/cm دوام</label><strong>{displayValue(mix?.durability_governing_max_w_cm)}</strong></div><div><label>حداقل مقاومت دوام</label><strong>{displayValue(mix?.durability_min_strength_mpa)} MPa</strong></div><div><label>هوای هدف دوام</label><strong>{displayValue(mix?.durability_target_air_percent)} %</strong></div><div><label>w/cm نهایی</label><strong>{displayValue(mix?.w_cm_ratio)}</strong></div></div></div></article><article className="panel wide-panel"><div className="panel-head"><div><h3>مقادیر محاسبه‌شده در مترمکعب</h3><span>مبنای SSD، اصلاح رطوبت و آب افزودنی</span></div><span className="badge blue">{props.result.calculation_method ?? 'Python Engine'}</span></div><div className="panel-body"><div className="result-grid"><div><label>سنگدانه ریز SSD</label><strong>{displayValue(mix?.fine_aggregate_kg_m3)} kg/m³</strong></div><div><label>سنگدانه درشت SSD</label><strong>{displayValue(mix?.coarse_aggregate_kg_m3)} kg/m³</strong></div><div><label>کل سنگدانه SSD</label><strong>{displayValue(mix?.aggregate_ssd_kg_m3)} kg/m³</strong></div><div><label>کل وزن بچینگ سنگدانه</label><strong>{displayValue(mix?.aggregate_batch_kg_m3)} kg/m³</strong></div><div><label>اصلاح آب سنگدانه</label><strong>{displayValue(mix?.batch_water_adjustment_kg_m3)} kg/m³</strong></div><div><label>هوای منظورشده</label><strong>{displayValue(mix?.air_content_percent)} %</strong></div></div></div></article><AggregateBlendResults combined={props.result.combined_aggregate_system} optimizer={props.result.aggregate_blend_optimizer} /><EngineeringSystemsResults cementitiousSystem={props.result.cementitious_system} cementitiousCompliance={props.result.cementitious_compliance} aggregateCompliance={props.result.aggregate_compliance} asrCompliance={props.result.asr_compliance} waterCompliance={props.result.water_compliance} admixtureSystem={props.result.admixture_system} admixtureCompliance={props.result.admixture_compliance} chlorideCompliance={props.result.chloride_compliance} waterToAddKgM3={mix?.water_to_add_kg_m3} /><article className="panel wide-panel"><div className="panel-head"><div><h3>آنالیز تفکیکی سنگدانه‌ها</h3><span>سهم، SSD، رطوبت و اصلاح آب هر منبع</span></div><span className="badge green">{aggregateRows.length} منبع</span></div><div className="panel-body standards-list">{aggregateRows.length === 0 && <div className="alert warn">هیچ سنگدانه قابل محاسبه‌ای به موتور نرسیده است.</div>}{aggregateRows.map((row, index) => <div key={row.material_id ?? index}><b>{row.material_name ?? `سنگدانه ${index + 1}`}</b> — سهم {displayValue(row.share_percent)}٪ | SSD: {displayValue(row.ssd_mass_kg_m3)} kg/m³ | بچینگ: {displayValue(row.batch_mass_kg_m3)} kg/m³ | جذب: {displayValue(row.absorption_percent)}٪ | رطوبت: {displayValue(row.moisture_percent)}٪ | اصلاح آب: {displayValue(row.water_adjustment_kg_m3)} kg/m³</div>)}</div></article><article className="panel"><div className="panel-head"><div><h3>هشدارهای مهندسی</h3><span>نباید در گزارش نهایی حذف شوند</span></div><span className={`badge ${warnings.length ? 'orange' : 'green'}`}>{warnings.length}</span></div><div className="panel-body alerts">{warnings.length === 0 && <div className="alert ok">هشدار ثبت‌شده‌ای از موتور وجود ندارد.</div>}{warnings.map((warning, index) => <div className={`alert ${warning.severity === 'fail' ? 'danger' : 'warn'}`} key={`${warning.code ?? 'warning'}-${index}`}><b>{warning.code ?? 'ENGINE_WARNING'}</b> — {warning.message ?? 'هشدار مهندسی'}{warning.reference ? ` | مرجع: ${warning.reference}` : ''}</div>)}</div></article><article className="panel"><div className="panel-head"><div><h3>ردیابی محاسبه</h3><span>استاندارد، فرضیات و محدودیت‌ها</span></div></div><div className="panel-body standards-list">{(props.result.standard_references ?? []).map(item => <div key={`ref-${item}`}>✓ {item}</div>)}{(props.result.engineering_notes ?? []).map(item => <div key={`note-${item}`}>• {item}</div>)}{(props.result.assumptions ?? []).map(item => <div key={`assumption-${item}`}>فرض: {item}</div>)}{(props.result.limitations ?? []).map(item => <div key={`limit-${item}`}>محدودیت: {item}</div>)}</div></article></section></>}
  </>;
}

function ProjectForm(props: { projectIntake: ProjectIntake; saveStatus: 'idle' | 'saving' | 'saved' | 'error'; saveMessage: string; onUpdate: <K extends keyof ProjectIntake>(section: K, key: keyof ProjectIntake[K], value: string | number) => void; onSave: () => void; }) { const { projectIntake, onUpdate } = props; return <><section className="titlebar"><div><h2>ثبت طرح اختلاط جدید</h2><p>ایجاد پرونده پایه؛ پس از ذخیره، مصالح، دانه‌بندی، دوام و محاسبات همین طرح تکمیل می‌شود.</p></div><div className="toolbar"><button className="btn success" disabled={props.saveStatus === 'saving'} onClick={props.onSave}>{props.saveStatus === 'saving' ? 'در حال ذخیره...' : 'ذخیره و ایجاد پرونده'}</button></div></section>{props.saveMessage && <div className={`alert ${props.saveStatus === 'error' ? 'danger' : 'ok'}`}>{props.saveMessage}</div>}<section className="form-grid"><FormPanel title="مشخصات پروژه" subtitle="اطلاعات اجرایی و قراردادی پروژه"><Field label="نام پروژه" value={projectIntake.project.projectName} onChange={value => onUpdate('project', 'projectName', value)} /><Field label="شهر" value={projectIntake.project.city} onChange={value => onUpdate('project', 'city', value)} /><Field label="نوع سازه" value={projectIntake.project.structureType} onChange={value => onUpdate('project', 'structureType', value)} /><Field label="عضو بتنی" value={projectIntake.project.elementType} onChange={value => onUpdate('project', 'elementType', value)} /><Field label="کارفرما" value={projectIntake.project.clientName} onChange={value => onUpdate('project', 'clientName', value)} /><Field label="پیمانکار" value={projectIntake.project.contractorName} onChange={value => onUpdate('project', 'contractorName', value)} /><Field label="مشاور" value={projectIntake.project.consultantName} onChange={value => onUpdate('project', 'consultantName', value)} /><TextArea label="توضیحات موقعیت و شرایط پروژه" value={projectIntake.project.locationDescription} onChange={value => onUpdate('project', 'locationDescription', value)} /></FormPanel><FormPanel title="آزمایشگاه و طراح" subtitle="برای ردیابی مسئولیت فنی"><Field label="نام آزمایشگاه" value={projectIntake.laboratory.labName} onChange={value => onUpdate('laboratory', 'labName', value)} /><Field label="شماره مجوز آزمایشگاه" value={projectIntake.laboratory.licenseNumber} onChange={value => onUpdate('laboratory', 'licenseNumber', value)} /><Field label="آدرس آزمایشگاه" value={projectIntake.laboratory.address} onChange={value => onUpdate('laboratory', 'address', value)} /><Field label="تلفن آزمایشگاه" value={projectIntake.laboratory.phone} onChange={value => onUpdate('laboratory', 'phone', value)} /><Field label="نام طراح" value={projectIntake.designer.fullName} onChange={value => onUpdate('designer', 'fullName', value)} /><Field label="سمت طراح" value={projectIntake.designer.role} onChange={value => onUpdate('designer', 'role', value)} /><Field label="شماره نظام/عضویت" value={projectIntake.designer.licenseOrMembershipNumber} onChange={value => onUpdate('designer', 'licenseOrMembershipNumber', value)} /><Field label="موبایل طراح" value={projectIntake.designer.phone} onChange={value => onUpdate('designer', 'phone', value)} /></FormPanel><FormPanel title="مشخصات اولیه طرح" subtitle="ورودی‌های پایه برای موتور محاسبات"><SelectField label="نوع بتن" value={projectIntake.mixDesign.concreteType} onChange={value => onUpdate('mixDesign', 'concreteType', value)} /><NumberField label="مقاومت هدف MPa" value={projectIntake.mixDesign.targetStrengthMpa} onChange={value => onUpdate('mixDesign', 'targetStrengthMpa', value)} /><NumberField label="اسلامپ مورد نیاز mm" value={projectIntake.mixDesign.requiredSlumpMm} onChange={value => onUpdate('mixDesign', 'requiredSlumpMm', value)} /><NumberField label="حداکثر اندازه سنگدانه mm" value={projectIntake.mixDesign.maxAggregateSizeMm} onChange={value => onUpdate('mixDesign', 'maxAggregateSizeMm', value)} /><TextArea label="خلاصه شرایط دوام و مواجهه" value={projectIntake.mixDesign.exposureSummary} onChange={value => onUpdate('mixDesign', 'exposureSummary', value)} /></FormPanel></section></>; }
function FormPanel(props: { title: string; subtitle: string; children: ReactNode }) { return <article className="panel form-panel"><div className="panel-head"><div><h3>{props.title}</h3><span>{props.subtitle}</span></div></div><div className="panel-body form-body">{props.children}</div></article>; }
function Field(props: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field"><span>{props.label}</span><input value={props.value} onChange={event => props.onChange(event.target.value)} /></label>; }
function NumberField(props: { label: string; value: number; onChange: (value: number) => void }) { return <label className="field"><span>{props.label}</span><input type="number" value={props.value} onChange={event => props.onChange(Number(event.target.value))} /></label>; }
function TextArea(props: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field full"><span>{props.label}</span><textarea value={props.value} onChange={event => props.onChange(event.target.value)} /></label>; }
function SelectField(props: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field"><span>{props.label}</span><select value={props.value} onChange={event => props.onChange(event.target.value)}><option value="normal_weight">بتن معمولی</option><option value="pumped">بتن پمپی</option><option disabled>— انواع تخصصی در نسخه‌های بعد —</option><option value="high_strength" disabled>بتن پرمقاومت — در دست توسعه</option><option value="self_consolidating" disabled>بتن خودتراکم — در دست توسعه</option><option value="mass_concrete" disabled>بتن حجیم — در دست توسعه</option><option value="lightweight" disabled>بتن سبک — در دست توسعه</option><option value="heavyweight" disabled>بتن سنگین — در دست توسعه</option><option value="fiber_reinforced" disabled>بتن الیافی — در دست توسعه</option></select></label>; }
function displayValue(value: number | null | undefined) { return value === null || value === undefined ? '-' : String(value); }
