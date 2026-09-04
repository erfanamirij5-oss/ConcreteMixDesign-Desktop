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
type PersistedResult = { cementitiousContentKgM3?: number | null; waterContentKgM3?: number | null; wCmRatio?: number | null; fineAggregateKgM3?: number | null; coarseAggregateKgM3?: number | null; airContentPercent?: number | null; traceability?: { calculationMethod?: string | null; standardReferences?: string[]; warnings?: EngineWarning[]; assumptions?: string[]; limitations?: string[] } | null };
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
      if (result.status === 'fail') throw new Error(result.message ?? 'موتور محاسبات نتیجه نامعتبر برگرداند.');
      setEngineResult(result); setCalculationState('done'); setEngineState('ready');
    } catch (error) { setCalculationError(error instanceof Error ? error.message : 'خطای ناشناخته در محاسبه طرح ذخیره‌شده'); setCalculationState('error'); }
  }

  async function restoreSavedCalculation(mixDesignId: string) {
    try {
      if (!window.tolouEngine?.getSavedResult) return;
      const response = await window.tolouEngine.getSavedResult(mixDesignId) as { status?: string; result?: PersistedResult | null };
      if (response.status !== 'pass' || !response.result) return;
      const saved = response.result;
      const trace = saved.traceability ?? {};
      setEngineResult({
        status: 'pass',
        calculation_method: trace.calculationMethod ?? undefined,
        mix_proportions: {
          cementitious_kg_m3: saved.cementitiousContentKgM3,
          water_kg_m3: saved.waterContentKgM3,
          w_cm_ratio: saved.wCmRatio,
          fine_aggregate_kg_m3: saved.fineAggregateKgM3,
          coarse_aggregate_kg_m3: saved.coarseAggregateKgM3,
          air_content_percent: saved.airContentPercent ?? undefined
        },
        standard_references: trace.standardReferences ?? [],
        warnings: trace.warnings ?? [],
        assumptions: trace.assumptions ?? [],
        limitations: trace.limitations ?? []
      });
      setCalculationState('done');
    } catch { /* A missing legacy result must not prevent opening the engineering file. */ }
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

  function openProject(id: string) { setActiveMixDesignId(id); setEngineResult(null); setCalculationState('idle'); setWorkspaceSection('overview'); setActiveView('workspace'); void restoreSavedCalculation(id); }

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
      {workspaceSection === 'durability' && <DurabilityView mixDesignId={activeMixDesignId} />}
      {workspaceSection === 'results' && <ResultsView mixDesignId={activeMixDesignId} result={engineResult} state={calculationState} error={calculationError} onCalculate={calculateSavedMix} />}
    </>;
  }

  return <div className="app-shell">
    <header className="header"><div className="header-top"><div className="brand"><div className="brand-icon">ط</div><div><strong>طلوع بتن</strong><small>TOLOU CONCRETE MIX DESIGN</small></div></div><div className="module-title"><h1>سامانه مهندسی و مدیریت طرح اختلاط بتن</h1><p>مدیریت پرونده طرح، مصالح، دوام، محاسبات و کنترل مهندسی</p></div><div className="header-actions"><button disabled>راهنما — در دست توسعه</button></div></div><div className="header-bottom"><span>ConcreteMixDesign-Desktop / Management v0.4 Development</span><div className="badges"><span className="badge green">Python Engine</span><span className="badge blue">SQLite</span><span className="badge orange">Core 0.3.0</span></div></div></header>
    <nav className="top-nav"><button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => setActiveView('dashboard')}>داشبورد</button><button className={activeView === 'mix-designs' ? 'active' : ''} onClick={() => setActiveView('mix-designs')}>طرح‌های اختلاط</button><button className={activeView === 'new-project' ? 'active' : ''} onClick={() => setActiveView('new-project')}>ثبت طرح جدید</button><button className={activeView === 'workspace' ? 'active' : ''} disabled={!activeProject} onClick={() => setActiveView('workspace')}>پرونده فعال</button></nav>
    <div className="page-grid"><aside className="sidebar"><div className="sidebar-title">مرکز عملیات</div>{modules.map((item, index) => <button className={sidebarClass(index, activeView)} key={item} disabled={index >= 4}><span><b className="ico">{index + 1}</b>{item}</span><span>›</span></button>)}<div className="note"><b>اصل مهندسی</b><br />هیچ خروجی بدون استاندارد، فرضیه، هشدار و قابلیت ردیابی معتبر نیست.</div></aside><main className="workspace">
      {activeView === 'dashboard' && <DashboardHome projects={recentProjects} engineState={engineState} activeMixDesignId={activeMixDesignId} onCheckEngine={checkEngine} onNewProject={() => setActiveView('new-project')} onOpenProject={openProject} />}
      {activeView === 'mix-designs' && <MixDesignManager projects={recentProjects} activeMixDesignId={activeMixDesignId} onNewProject={() => setActiveView('new-project')} onOpenProject={openProject} onRefresh={refreshProjects} />}
      {activeView === 'new-project' && <ProjectForm projectIntake={projectIntake} saveStatus={saveStatus} saveMessage={saveMessage} onUpdate={updateProject} onSave={saveProject} />}
      {activeView === 'workspace' && renderWorkspaceBody()}
      {activeView === 'materials' && <MaterialsView mixDesignId={activeMixDesignId} />}
      {activeView === 'gradation' && <GradationView mixDesignId={activeMixDesignId} />}
      {activeView === 'aggregate-blend' && <AggregateBlendOptimizerView mixDesignId={activeMixDesignId} />}
      {activeView === 'durability' && <DurabilityView mixDesignId={activeMixDesignId} />}
      {activeView === 'results' && <ResultsView mixDesignId={activeMixDesignId} result={engineResult} state={calculationState} error={calculationError} onCalculate={calculateSavedMix} />}
    </main></div>
  </div>;
}

function sidebarClass(index: number, activeView: ActiveView) { if (activeView === 'dashboard' && index === 0) return 'side active'; if (activeView === 'mix-designs' && index === 1) return 'side active'; if (activeView === 'new-project' && index === 2) return 'side active'; if (activeView === 'workspace' && index === 3) return 'side active'; return 'side'; }

function ResultsView(props: { mixDesignId: string | null; result: EngineResult | null; state: CalculationState; error: string | null; onCalculate: () => void; }) {
  const mix = props.result?.mix_proportions; const warnings = props.result?.warnings ?? []; const aggregateRows = props.result?.aggregate_analysis ?? []; const exposure = props.result?.durability?.exposure_classes;
  return <><section className="titlebar"><div><h2>نتایج محاسبات طرح اختلاط</h2><p>اجرای واقعی موتور Python بر روی داده‌های ذخیره‌شده SQLite</p></div><div className="toolbar"><button className="btn primary" disabled={!props.mixDesignId || props.state === 'calculating'} onClick={props.onCalculate}>{props.state === 'calculating' ? 'در حال محاسبه...' : 'محاسبه طرح ذخیره‌شده'}</button></div></section>
    {props.error && <div className="alert danger">{props.error}</div>}
    {!props.result && <div className="alert info">برای مشاهده خروجی مهندسی، محاسبه طرح ذخیره‌شده را اجرا کنید.</div>}
    {props.result && <><section className="kpis"><article className="kpi blue"><label>آب اختلاط</label><strong>{show(mix?.water_kg_m3)} kg/m³</strong><small>ACI 211</small></article><article className="kpi green"><label>مواد سیمانی</label><strong>{show(mix?.cementitious_kg_m3)} kg/m³</strong><small>w/cm governed</small></article><article className="kpi purple"><label>w/cm</label><strong>{show(mix?.w_cm_ratio)}</strong><small>Durability + strength</small></article><article className="kpi orange"><label>هوای هدف</label><strong>{show(mix?.air_content_percent)} %</strong><small>ACI 318 / ACI 211</small></article></section>
      <section className="content-grid"><article className="panel wide-panel"><div className="panel-head"><div><h3>خروجی حجمی و جرمی</h3><span>{props.result.calculation_method ?? 'روش محاسباتی ثبت نشده'}</span></div><span className="badge blue">Engine {props.result.engine_version ?? props.result.version ?? '-'}</span></div><div className="panel-body"><div className="result-grid"><div><label>Fine Aggregate</label><strong>{show(mix?.fine_aggregate_kg_m3)} kg/m³</strong></div><div><label>Coarse Aggregate</label><strong>{show(mix?.coarse_aggregate_kg_m3)} kg/m³</strong></div><div><label>Aggregate SSD</label><strong>{show(mix?.aggregate_ssd_kg_m3)} kg/m³</strong></div><div><label>Aggregate Batch</label><strong>{show(mix?.aggregate_batch_kg_m3)} kg/m³</strong></div><div><label>Water Adjustment</label><strong>{show(mix?.batch_water_adjustment_kg_m3)} kg/m³</strong></div><div><label>Water to Add</label><strong>{show(mix?.water_to_add_kg_m3)} kg/m³</strong></div><div><label>Durability max w/cm</label><strong>{show(mix?.durability_governing_max_w_cm)}</strong></div><div><label>Durability min f'c</label><strong>{show(mix?.durability_min_strength_mpa)} MPa</strong></div></div></div></article>
        <article className="panel"><div className="panel-head"><div><h3>کلاس‌های مواجهه</h3><span>ACI CODE-318-25</span></div></div><div className="panel-body standards-list"><div>F: {exposure?.freeze_thaw ?? '-'}</div><div>S: {exposure?.sulfate ?? '-'}</div><div>W: {exposure?.water ?? '-'}</div><div>C: {exposure?.corrosion ?? '-'}</div></div></article>
        <article className="panel"><div className="panel-head"><div><h3>هشدارهای موتور</h3><span>نیازمند بازبینی مهندس</span></div><span className={`badge ${warnings.length ? 'orange' : 'green'}`}>{warnings.length}</span></div><div className="panel-body alerts">{warnings.length === 0 && <div className="alert ok">هشدار مهندسی ثبت نشده است.</div>}{warnings.map((warning, index) => <div className={`alert ${warning.severity === 'fail' ? 'danger' : 'warn'}`} key={`${warning.code}-${index}`}><b>{warning.code ?? 'WARNING'}</b> — {warning.message}{warning.reference ? ` | ${warning.reference}` : ''}</div>)}</div></article>
      </section>
      <AggregateBlendResults combined={props.result.combined_aggregate_system} optimizer={props.result.aggregate_blend_optimizer} />
      <EngineeringSystemsResults cementitiousSystem={props.result.cementitious_system} cementitiousCompliance={props.result.cementitious_compliance} asrCompliance={props.result.asr_compliance} waterCompliance={props.result.water_compliance} admixtureSystem={props.result.admixture_system} admixtureCompliance={props.result.admixture_compliance} chlorideCompliance={props.result.chloride_compliance} aggregateCompliance={props.result.aggregate_compliance} />
      <section className="content-grid"><article className="panel wide-panel"><div className="panel-head"><div><h3>تحلیل سنگدانه‌های ذخیره‌شده</h3><span>SSD، Batch، رطوبت و جذب</span></div><span className="badge blue">{aggregateRows.length}</span></div><div className="table-wrap"><table><thead><tr><th>مصالح</th><th>نوع</th><th>Share</th><th>SG SSD</th><th>SSD kg/m³</th><th>Batch kg/m³</th><th>Abs %</th><th>Moist %</th><th>ΔWater</th></tr></thead><tbody>{aggregateRows.map((row, index) => <tr key={`${row.material_id}-${index}`}><td>{row.material_name ?? row.material_id ?? '-'}</td><td>{row.material_type ?? '-'}</td><td>{show(row.share_percent)}%</td><td>{show(row.specific_gravity_ssd)}</td><td>{show(row.ssd_mass_kg_m3)}</td><td>{show(row.batch_mass_kg_m3)}</td><td>{show(row.absorption_percent)}</td><td>{show(row.moisture_percent)}</td><td>{show(row.water_adjustment_kg_m3)}</td></tr>)}</tbody></table></div></article><article className="panel"><div className="panel-head"><div><h3>استانداردها</h3><span>Traceability</span></div></div><div className="panel-body standards-list">{(props.result.standard_references ?? []).map(item => <div key={item}>{item}</div>)}</div></article><article className="panel"><div className="panel-head"><div><h3>فرضیات و محدودیت‌ها</h3><span>Engineering record</span></div></div><div className="panel-body standards-list">{(props.result.assumptions ?? []).map(item => <div key={item}>فرض: {item}</div>)}{(props.result.limitations ?? []).map(item => <div key={item}>محدودیت: {item}</div>)}</div></article></section>
    </>}
  </>;
}

function ProjectForm(props: { projectIntake: ProjectIntake; saveStatus: string; saveMessage: string; onUpdate: <K extends keyof ProjectIntake>(section: K, key: keyof ProjectIntake[K], value: string | number) => void; onSave: () => void; }) {
  const p = props.projectIntake;
  return <><section className="titlebar"><div><h2>ثبت پروژه و طرح اختلاط جدید</h2><p>اطلاعات پروژه، آزمایشگاه، طراح و الزامات اولیه بتن</p></div><div className="toolbar"><button className="btn success" onClick={props.onSave} disabled={props.saveStatus === 'saving'}>{props.saveStatus === 'saving' ? 'در حال ذخیره...' : 'ذخیره پروژه در SQLite'}</button></div></section>{props.saveMessage && <div className={`alert ${props.saveStatus === 'error' ? 'danger' : 'ok'}`}>{props.saveMessage}</div>}<section className="form-grid"><FormPanel title="مشخصات پروژه" subtitle="Project Identity"><TextField label="نام پروژه" value={p.project.projectName} onChange={value => props.onUpdate('project', 'projectName', value)} /><TextField label="شهر" value={p.project.city} onChange={value => props.onUpdate('project', 'city', value)} /><TextField label="نوع سازه" value={p.project.structureType} onChange={value => props.onUpdate('project', 'structureType', value)} /><TextField label="عضو سازه‌ای" value={p.project.elementType} onChange={value => props.onUpdate('project', 'elementType', value)} /><TextArea label="شرح موقعیت و شرایط پروژه" value={p.project.locationDescription} onChange={value => props.onUpdate('project', 'locationDescription', value)} /></FormPanel><FormPanel title="طرفین پروژه" subtitle="Traceability"><TextField label="کارفرما" value={p.project.clientName} onChange={value => props.onUpdate('project', 'clientName', value)} /><TextField label="پیمانکار" value={p.project.contractorName} onChange={value => props.onUpdate('project', 'contractorName', value)} /><TextField label="مشاور" value={p.project.consultantName} onChange={value => props.onUpdate('project', 'consultantName', value)} /></FormPanel><FormPanel title="آزمایشگاه" subtitle="Laboratory"><TextField label="نام آزمایشگاه" value={p.laboratory.labName} onChange={value => props.onUpdate('laboratory', 'labName', value)} /><TextField label="شماره مجوز" value={p.laboratory.licenseNumber} onChange={value => props.onUpdate('laboratory', 'licenseNumber', value)} /><TextField label="آدرس" value={p.laboratory.address} onChange={value => props.onUpdate('laboratory', 'address', value)} /><TextField label="تلفن" value={p.laboratory.phone} onChange={value => props.onUpdate('laboratory', 'phone', value)} /></FormPanel><FormPanel title="طراح طرح اختلاط" subtitle="Designer"><TextField label="نام و نام خانوادگی" value={p.designer.fullName} onChange={value => props.onUpdate('designer', 'fullName', value)} /><TextField label="سمت / نقش" value={p.designer.role} onChange={value => props.onUpdate('designer', 'role', value)} /><TextField label="شماره عضویت / پروانه" value={p.designer.licenseOrMembershipNumber} onChange={value => props.onUpdate('designer', 'licenseOrMembershipNumber', value)} /><TextField label="تلفن" value={p.designer.phone} onChange={value => props.onUpdate('designer', 'phone', value)} /><TextField label="ایمیل" value={p.designer.email} onChange={value => props.onUpdate('designer', 'email', value)} /></FormPanel><FormPanel title="الزامات اولیه بتن" subtitle="Mix Requirements"><label className="field"><span>نوع بتن</span><select value={p.mixDesign.concreteType} onChange={event => props.onUpdate('mixDesign', 'concreteType', event.target.value)}><option value="normal_weight">بتن معمولی</option><option value="pumped">بتن پمپی</option></select></label><NumberField label="مقاومت هدف (MPa)" value={p.mixDesign.targetStrengthMpa} onChange={value => props.onUpdate('mixDesign', 'targetStrengthMpa', value)} /><NumberField label="اسلامپ موردنیاز (mm)" value={p.mixDesign.requiredSlumpMm} onChange={value => props.onUpdate('mixDesign', 'requiredSlumpMm', value)} /><NumberField label="حداکثر اندازه سنگدانه (mm)" value={p.mixDesign.maxAggregateSizeMm} onChange={value => props.onUpdate('mixDesign', 'maxAggregateSizeMm', value)} /><TextArea label="خلاصه شرایط مواجهه" value={p.mixDesign.exposureSummary} onChange={value => props.onUpdate('mixDesign', 'exposureSummary', value)} /></FormPanel></section></>;
}

function FormPanel(props: { title: string; subtitle: string; children: ReactNode }) { return <article className="panel form-panel"><div className="panel-head"><div><h3>{props.title}</h3><span>{props.subtitle}</span></div></div><div className="panel-body form-body">{props.children}</div></article>; }
function TextField(props: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field"><span>{props.label}</span><input value={props.value} onChange={event => props.onChange(event.target.value)} /></label>; }
function TextArea(props: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field"><span>{props.label}</span><textarea value={props.value} onChange={event => props.onChange(event.target.value)} /></label>; }
function NumberField(props: { label: string; value: number; onChange: (value: number) => void }) { return <label className="field"><span>{props.label}</span><input type="number" step="any" value={props.value} onChange={event => props.onChange(Number(event.target.value))} /></label>; }
function show(value: number | null | undefined) { return value === null || value === undefined ? '-' : String(value); }
