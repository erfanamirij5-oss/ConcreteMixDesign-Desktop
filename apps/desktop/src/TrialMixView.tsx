import { useEffect, useState } from 'react';

type TrialSessionStatus = 'planned' | 'in_progress' | 'completed' | 'void';

type TrialSessionSummary = {
  id: string;
  mixDesignId: string;
  revisionNumber: number;
  sessionCode: string;
  trialDate: string;
  status: TrialSessionStatus;
  objective?: string | null;
  location?: string | null;
  leadEngineer?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  batchCount?: number;
};

type TrialSessionDetail = TrialSessionSummary & {
  batches?: unknown[];
  materialActuals?: unknown[];
  specimens?: unknown[];
  strengthResults?: unknown[];
};

type SessionFormState = {
  sessionCode: string;
  trialDate: string;
  status: TrialSessionStatus;
  objective: string;
  location: string;
  leadEngineer: string;
};

type TrialMixRecord = {
  id: string;
  trialDate: string;
  batchQuantityM3: number;
  actualSlumpMm: number;
  airContentPercent: number;
  concreteTemperatureC: number;
  freshDensityKgM3: number;
  strength7dMpa?: number | null;
  strength28dMpa?: number | null;
  notes?: string | null;
  createdBy?: string | null;
};

type FormState = {
  trialDate: string;
  batchQuantityM3: string;
  actualSlumpMm: string;
  airContentPercent: string;
  concreteTemperatureC: string;
  freshDensityKgM3: string;
  strength7dMpa: string;
  strength28dMpa: string;
  notes: string;
  actorName: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const initialSessionForm: SessionFormState = {
  sessionCode: '',
  trialDate: today(),
  status: 'planned',
  objective: '',
  location: '',
  leadEngineer: ''
};

const initialForm: FormState = {
  trialDate: today(),
  batchQuantityM3: '0.08',
  actualSlumpMm: '',
  airContentPercent: '',
  concreteTemperatureC: '',
  freshDensityKgM3: '',
  strength7dMpa: '',
  strength28dMpa: '',
  notes: '',
  actorName: ''
};

const sessionStatusLabel: Record<TrialSessionStatus, string> = {
  planned: 'برنامه‌ریزی‌شده',
  in_progress: 'در حال اجرا',
  completed: 'تکمیل‌شده',
  void: 'باطل‌شده'
};

export function TrialMixView(props: { mixDesignId: string | null }) {
  const [sessionForm, setSessionForm] = useState<SessionFormState>(initialSessionForm);
  const [sessions, setSessions] = useState<TrialSessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<TrialSessionDetail | null>(null);
  const [sessionState, setSessionState] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [sessionMessage, setSessionMessage] = useState('');

  const [form, setForm] = useState<FormState>(initialForm);
  const [records, setRecords] = useState<TrialMixRecord[]>([]);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setSelectedSession(null);
    setSessionMessage('');
    void loadSessions();
    void loadRecords();
  }, [props.mixDesignId]);

  async function loadSessions(selectSessionId?: string) {
    if (!props.mixDesignId) {
      setSessions([]);
      setSelectedSession(null);
      return;
    }
    try {
      if (!window.tolouTrialMixV2?.listSessions) throw new Error('API Trial Mix v2 در دسترس نیست.');
      setSessionState('loading');
      const response = await window.tolouTrialMixV2.listSessions(props.mixDesignId) as { status?: string; sessions?: TrialSessionSummary[]; error?: string };
      if (response.status !== 'pass') throw new Error(response.error ?? 'خواندن Trial Sessionها ناموفق بود.');
      const nextSessions = response.sessions ?? [];
      setSessions(nextSessions);
      setSessionState('idle');
      if (selectSessionId) await openSession(selectSessionId);
    } catch (error) {
      setSessionState('error');
      setSessionMessage(error instanceof Error ? error.message : 'خطا در خواندن Trial Sessionها');
    }
  }

  async function openSession(sessionId: string) {
    try {
      if (!window.tolouTrialMixV2?.getSession) throw new Error('API جزئیات Trial Session در دسترس نیست.');
      setSessionState('loading');
      const response = await window.tolouTrialMixV2.getSession(sessionId) as { status?: string; session?: TrialSessionDetail | null; error?: string };
      if (response.status !== 'pass' || !response.session) throw new Error(response.error ?? 'جزئیات Trial Session پیدا نشد.');
      setSelectedSession(response.session);
      setSessionState('idle');
      setSessionMessage('');
    } catch (error) {
      setSessionState('error');
      setSessionMessage(error instanceof Error ? error.message : 'خطا در بازکردن Trial Session');
    }
  }

  async function createSession() {
    if (!props.mixDesignId) {
      setSessionState('error');
      setSessionMessage('ابتدا یک طرح اختلاط فعال را انتخاب کنید.');
      return;
    }
    if (!sessionForm.sessionCode.trim()) {
      setSessionState('error');
      setSessionMessage('کد Trial Session الزامی است.');
      return;
    }
    setSessionState('saving');
    setSessionMessage('');
    try {
      if (!window.tolouTrialMixV2?.createSession) throw new Error('API ایجاد Trial Session در دسترس نیست.');
      const response = await window.tolouTrialMixV2.createSession({
        mixDesignId: props.mixDesignId,
        sessionCode: sessionForm.sessionCode.trim(),
        trialDate: sessionForm.trialDate,
        status: sessionForm.status,
        objective: sessionForm.objective.trim() || null,
        location: sessionForm.location.trim() || null,
        leadEngineer: sessionForm.leadEngineer.trim() || null
      }) as { status?: string; session?: TrialSessionDetail; error?: string };
      if (response.status !== 'pass' || !response.session) throw new Error(response.error ?? 'ایجاد Trial Session ناموفق بود.');
      setSessionForm({ ...initialSessionForm, trialDate: today() });
      setSessionState('saved');
      setSessionMessage(`Trial Session ${response.session.sessionCode} ایجاد شد.`);
      await loadSessions(response.session.id);
    } catch (error) {
      setSessionState('error');
      setSessionMessage(error instanceof Error ? error.message : 'خطا در ایجاد Trial Session');
    }
  }

  async function loadRecords() {
    if (!props.mixDesignId) { setRecords([]); return; }
    try {
      const response = await window.tolouTrialMix?.list(props.mixDesignId) as { status?: string; records?: TrialMixRecord[]; error?: string } | undefined;
      if (!response || response.status !== 'pass') throw new Error(response?.error ?? 'خواندن Trial Mix ناموفق بود.');
      setRecords(response.records ?? []);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'خطا در خواندن Trial Mix');
    }
  }

  async function saveRecord() {
    if (!props.mixDesignId) { setState('error'); setMessage('ابتدا یک طرح اختلاط فعال را انتخاب کنید.'); return; }
    setState('saving'); setMessage('');
    try {
      if (!window.tolouTrialMix?.save) throw new Error('API ثبت Trial Mix در دسترس نیست.');
      const response = await window.tolouTrialMix.save({
        mixDesignId: props.mixDesignId,
        trialDate: form.trialDate,
        batchQuantityM3: Number(form.batchQuantityM3),
        actualSlumpMm: Number(form.actualSlumpMm),
        airContentPercent: Number(form.airContentPercent),
        concreteTemperatureC: Number(form.concreteTemperatureC),
        freshDensityKgM3: Number(form.freshDensityKgM3),
        strength7dMpa: form.strength7dMpa.trim() ? Number(form.strength7dMpa) : null,
        strength28dMpa: form.strength28dMpa.trim() ? Number(form.strength28dMpa) : null,
        notes: form.notes,
        actorName: form.actorName
      }) as { status?: string; error?: string };
      if (response.status !== 'pass') throw new Error(response.error ?? 'ثبت Trial Mix ناموفق بود.');
      await loadRecords();
      setState('saved');
      setMessage('Trial Mix با موفقیت ذخیره شد و اکنون می‌تواند مبنای تکمیل مرحله Trial باشد.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'خطا در ثبت Trial Mix');
    }
  }

  function sessionField(key: keyof Omit<SessionFormState, 'status'>, label: string, type = 'text') {
    return <label className="field"><span>{label}</span><input type={type} value={sessionForm[key]} onChange={event => setSessionForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>;
  }

  function field(key: keyof FormState, label: string, type = 'number') {
    return <label className="field"><span>{label}</span><input type={type} step={type === 'number' ? 'any' : undefined} value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>;
  }

  return <>
    <section className="titlebar"><div><h2>Trial Mix & Validation</h2><p>مدیریت Session، بچ آزمایشی، داده‌های واقعی و نتایج آزمایشگاهی با حفظ workflow پایدار Trial Mix</p></div></section>
    {!props.mixDesignId && <div className="alert warn">برای کار با Trial Mix ابتدا یک پرونده طرح اختلاط را فعال کنید.</div>}

    <div aria-live="polite" aria-atomic="true">
      {sessionMessage && <div className={`alert ${sessionState === 'error' ? 'danger' : 'ok'}`}>{sessionMessage}</div>}
    </div>

    <section className="form-grid">
      <article className="panel form-panel">
        <div className="panel-head"><div><h3>Trial Session جدید</h3><span>Revision-bound laboratory session</span></div></div>
        <div className="panel-body form-body">
          {sessionField('sessionCode', 'کد Session')}
          {sessionField('trialDate', 'تاریخ Session', 'date')}
          <label className="field"><span>وضعیت اولیه</span><select value={sessionForm.status} onChange={event => setSessionForm(previous => ({ ...previous, status: event.target.value as TrialSessionStatus }))}><option value="planned">برنامه‌ریزی‌شده</option><option value="in_progress">در حال اجرا</option></select></label>
          {sessionField('leadEngineer', 'مهندس مسئول')}
          {sessionField('location', 'محل آزمایش')}
          <label className="field"><span>هدف Session</span><textarea value={sessionForm.objective} onChange={event => setSessionForm(previous => ({ ...previous, objective: event.target.value }))} /></label>
        </div>
        <div className="toolbar"><button className="btn success" disabled={!props.mixDesignId || sessionState === 'saving'} onClick={createSession}>{sessionState === 'saving' ? 'در حال ایجاد...' : 'ایجاد Trial Session'}</button></div>
      </article>

      <article className="panel form-panel">
        <div className="panel-head"><div><h3>Session فعال</h3><span>Current laboratory context</span></div>{selectedSession && <span className="badge blue">Rev {selectedSession.revisionNumber}</span>}</div>
        <div className="panel-body">
          {!selectedSession ? <div className="alert warn">یک Session از جدول انتخاب کنید یا Session جدید بسازید.</div> : <div className="form-body">
            <div><b>کد:</b> {selectedSession.sessionCode}</div>
            <div><b>تاریخ:</b> {selectedSession.trialDate}</div>
            <div><b>وضعیت:</b> {sessionStatusLabel[selectedSession.status]}</div>
            <div><b>Revision:</b> {selectedSession.revisionNumber}</div>
            <div><b>مهندس مسئول:</b> {selectedSession.leadEngineer ?? '-'}</div>
            <div><b>محل:</b> {selectedSession.location ?? '-'}</div>
            <div><b>هدف:</b> {selectedSession.objective ?? '-'}</div>
            <div><b>تعداد Batch:</b> {selectedSession.batchCount ?? selectedSession.batches?.length ?? 0}</div>
          </div>}
        </div>
      </article>
    </section>

    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-head"><div><h3>Trial Sessions</h3><span>Sessions persisted for active mix design</span></div><span className="badge blue">{sessions.length}</span></div>
        <div className="table-wrap"><table><caption className="sr-only">فهرست Trial Sessionهای طرح اختلاط فعال</caption><thead><tr><th scope="col">کد</th><th scope="col">Revision</th><th scope="col">تاریخ</th><th scope="col">وضعیت</th><th scope="col">Batch</th><th scope="col">مهندس مسئول</th><th scope="col">عملیات</th></tr></thead><tbody>{sessions.length === 0 ? <tr><td colSpan={7}>{sessionState === 'loading' ? 'در حال خواندن Sessionها...' : 'هنوز Trial Session ثبت نشده است.'}</td></tr> : sessions.map(session => <tr key={session.id}><td>{session.sessionCode}</td><td>{session.revisionNumber}</td><td>{session.trialDate}</td><td>{sessionStatusLabel[session.status]}</td><td>{session.batchCount ?? 0}</td><td>{session.leadEngineer ?? '-'}</td><td><button className="btn" onClick={() => void openSession(session.id)} aria-label={`باز کردن Trial Session ${session.sessionCode}`}>باز کردن</button></td></tr>)}</tbody></table></div>
      </article>
    </section>

    <section className="titlebar"><div><h2>Legacy Trial Batch</h2><p>مسیر پایدار Gate 06 برای ثبت رکورد بچ آزمایشی؛ بدون تغییر در API موجود</p></div><div className="toolbar"><button className="btn success" disabled={!props.mixDesignId || state === 'saving'} onClick={saveRecord}>{state === 'saving' ? 'در حال ذخیره...' : 'ثبت Trial Mix'}</button></div></section>
    <div aria-live="polite" aria-atomic="true">{message && <div className={`alert ${state === 'error' ? 'danger' : 'ok'}`}>{message}</div>}</div>
    <section className="form-grid">
      <article className="panel form-panel"><div className="panel-head"><div><h3>مشخصات Trial</h3><span>Fresh concrete measurements</span></div></div><div className="panel-body form-body">
        {field('trialDate', 'تاریخ Trial', 'date')}{field('batchQuantityM3', 'حجم بچ (m³)')}{field('actualSlumpMm', 'اسلامپ واقعی (mm)')}{field('airContentPercent', 'هوای واقعی (%)')}{field('concreteTemperatureC', 'دمای بتن تازه (°C)')}{field('freshDensityKgM3', 'چگالی بتن تازه (kg/m³)')}
      </div></article>
      <article className="panel form-panel"><div className="panel-head"><div><h3>مقاومت و Traceability</h3><span>Strength results & audit</span></div></div><div className="panel-body form-body">
        {field('strength7dMpa', 'مقاومت ۷ روزه (MPa)')}{field('strength28dMpa', 'مقاومت ۲۸ روزه (MPa)')}{field('actorName', 'مسئول ثبت', 'text')}<label className="field"><span>یادداشت‌ها</span><textarea value={form.notes} onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))} /></label>
      </div></article>
    </section>
    <section className="content-grid"><article className="panel wide-panel"><div className="panel-head"><div><h3>سوابق Trial Mix</h3><span>Persisted records for active mix design</span></div><span className="badge blue">{records.length}</span></div><div className="table-wrap"><table><caption className="sr-only">سوابق Trial Mix ثبت‌شده برای طرح فعال</caption><thead><tr><th scope="col">تاریخ</th><th scope="col">Batch m³</th><th scope="col">Slump mm</th><th scope="col">Air %</th><th scope="col">Temp °C</th><th scope="col">Density kg/m³</th><th scope="col">7d MPa</th><th scope="col">28d MPa</th><th scope="col">مسئول</th></tr></thead><tbody>{records.length === 0 ? <tr><td colSpan={9}>هنوز Trial Mix ثبت نشده است.</td></tr> : records.map(record => <tr key={record.id}><td>{record.trialDate}</td><td>{record.batchQuantityM3}</td><td>{record.actualSlumpMm}</td><td>{record.airContentPercent}</td><td>{record.concreteTemperatureC}</td><td>{record.freshDensityKgM3}</td><td>{record.strength7dMpa ?? '-'}</td><td>{record.strength28dMpa ?? '-'}</td><td>{record.createdBy ?? '-'}</td></tr>)}</tbody></table></div></article></section>
  </>;
}
