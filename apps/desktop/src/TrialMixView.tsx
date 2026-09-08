import { useEffect, useState } from 'react';

type TrialSessionStatus = 'planned' | 'in_progress' | 'completed' | 'void';
type TrialMaterialRole = 'cement' | 'scm' | 'water' | 'fine_aggregate' | 'coarse_aggregate' | 'admixture' | 'fiber' | 'other';
type TrialSpecimenType = 'cube' | 'cylinder' | 'beam' | 'other';

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

type TrialMaterialActual = {
  id: string;
  materialRole: TrialMaterialRole;
  materialReferenceId?: string | null;
  materialName: string;
  targetMassKg?: number | null;
  batchedMassKg: number;
  moisturePercent?: number | null;
  absorptionPercent?: number | null;
  moistureCorrectionKg?: number | null;
  createdAt?: string;
};

type TrialStrengthResult = {
  id: string;
  testedAt: string;
  testAgeDays: number;
  maximumLoadKn: number;
  loadedAreaMm2: number;
  strengthMpa: number;
  calculationMethod?: string | null;
  standardReference?: string | null;
  machineReference?: string | null;
  failureMode?: string | null;
  testedBy?: string | null;
  notes?: string | null;
  createdAt?: string;
};

type TrialSpecimen = {
  id: string;
  specimenCode: string;
  specimenType: TrialSpecimenType;
  castAt: string;
  targetTestAgeDays?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  lengthMm?: number | null;
  diameterMm?: number | null;
  curingCondition?: string | null;
  notes?: string | null;
  createdAt?: string;
  results?: TrialStrengthResult[];
};

type TrialBatch = {
  id: string;
  batchSequence: number;
  linkedAt?: string;
  trialDate: string;
  batchQuantityM3: number;
  actualSlumpMm: number;
  airContentPercent: number;
  concreteTemperatureC: number;
  freshDensityKgM3: number;
  strength7dMpa?: number | null;
  strength28dMpa?: number | null;
  notes?: string | null;
  materials?: TrialMaterialActual[];
  specimens?: TrialSpecimen[];
};

type TrialSessionDetail = TrialSessionSummary & {
  batches?: TrialBatch[];
};

type SessionFormState = {
  sessionCode: string;
  trialDate: string;
  status: TrialSessionStatus;
  objective: string;
  location: string;
  leadEngineer: string;
};

type MaterialFormState = {
  materialRole: TrialMaterialRole;
  materialName: string;
  materialReferenceId: string;
  targetMassKg: string;
  batchedMassKg: string;
  moisturePercent: string;
  absorptionPercent: string;
  moistureCorrectionKg: string;
};

type SpecimenFormState = {
  specimenCode: string;
  specimenType: TrialSpecimenType;
  castAt: string;
  targetTestAgeDays: string;
  widthMm: string;
  heightMm: string;
  lengthMm: string;
  diameterMm: string;
  curingCondition: string;
  notes: string;
};

type StrengthFormState = {
  testedAt: string;
  testAgeDays: string;
  maximumLoadKn: string;
  loadedAreaMm2: string;
  standardReference: string;
  machineReference: string;
  failureMode: string;
  testedBy: string;
  notes: string;
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
const nowLocalInput = () => {
  const date = new Date();
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const initialSessionForm: SessionFormState = {
  sessionCode: '',
  trialDate: today(),
  status: 'planned',
  objective: '',
  location: '',
  leadEngineer: ''
};

const initialMaterialForm: MaterialFormState = {
  materialRole: 'cement',
  materialName: '',
  materialReferenceId: '',
  targetMassKg: '',
  batchedMassKg: '',
  moisturePercent: '',
  absorptionPercent: '',
  moistureCorrectionKg: ''
};

const newSpecimenForm = (): SpecimenFormState => ({
  specimenCode: '',
  specimenType: 'cube',
  castAt: nowLocalInput(),
  targetTestAgeDays: '',
  widthMm: '',
  heightMm: '',
  lengthMm: '',
  diameterMm: '',
  curingCondition: '',
  notes: ''
});

const newStrengthForm = (): StrengthFormState => ({
  testedAt: nowLocalInput(),
  testAgeDays: '',
  maximumLoadKn: '',
  loadedAreaMm2: '',
  standardReference: '',
  machineReference: '',
  failureMode: '',
  testedBy: '',
  notes: ''
});

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

const materialRoleLabel: Record<TrialMaterialRole, string> = {
  cement: 'سیمان',
  scm: 'ماده مکمل سیمانی',
  water: 'آب',
  fine_aggregate: 'سنگدانه ریز',
  coarse_aggregate: 'سنگدانه درشت',
  admixture: 'افزودنی شیمیایی',
  fiber: 'الیاف',
  other: 'سایر'
};

const specimenTypeLabel: Record<TrialSpecimenType, string> = {
  cube: 'مکعب',
  cylinder: 'استوانه',
  beam: 'تیر',
  other: 'سایر'
};

function optionalNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

export function TrialMixView(props: { mixDesignId: string | null }) {
  const [sessionForm, setSessionForm] = useState<SessionFormState>(initialSessionForm);
  const [sessions, setSessions] = useState<TrialSessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<TrialSessionDetail | null>(null);
  const [sessionState, setSessionState] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [sessionMessage, setSessionMessage] = useState('');
  const [linkingRecordId, setLinkingRecordId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState<MaterialFormState>(initialMaterialForm);
  const [materialState, setMaterialState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [materialMessage, setMaterialMessage] = useState('');
  const [specimenForm, setSpecimenForm] = useState<SpecimenFormState>(newSpecimenForm);
  const [specimenState, setSpecimenState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [specimenMessage, setSpecimenMessage] = useState('');
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string | null>(null);
  const [strengthForm, setStrengthForm] = useState<StrengthFormState>(newStrengthForm);
  const [strengthState, setStrengthState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [strengthMessage, setStrengthMessage] = useState('');

  const [form, setForm] = useState<FormState>(initialForm);
  const [records, setRecords] = useState<TrialMixRecord[]>([]);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setSelectedSession(null);
    setSessionMessage('');
    setLinkingRecordId(null);
    setSelectedBatchId(null);
    setMaterialForm(initialMaterialForm);
    setMaterialMessage('');
    setSpecimenForm(newSpecimenForm());
    setSpecimenMessage('');
    setSelectedSpecimenId(null);
    setStrengthForm(newStrengthForm());
    setStrengthMessage('');
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
      const batches = response.session.batches ?? [];
      const nextBatchId = selectedBatchId && batches.some(batch => batch.id === selectedBatchId) ? selectedBatchId : batches[0]?.id ?? null;
      setSelectedBatchId(nextBatchId);
      const nextBatch = batches.find(batch => batch.id === nextBatchId);
      const specimens = nextBatch?.specimens ?? [];
      setSelectedSpecimenId(previous => previous && specimens.some(specimen => specimen.id === previous) ? previous : specimens[0]?.id ?? null);
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
      setSelectedBatchId(null);
      setSelectedSpecimenId(null);
      setSessionState('saved');
      setSessionMessage(`Trial Session ${response.session.sessionCode} ایجاد شد.`);
      await loadSessions(response.session.id);
    } catch (error) {
      setSessionState('error');
      setSessionMessage(error instanceof Error ? error.message : 'خطا در ایجاد Trial Session');
    }
  }

  async function linkRecordToSelectedSession(recordId: string) {
    if (!selectedSession) {
      setSessionState('error');
      setSessionMessage('ابتدا یک Trial Session را باز کنید.');
      return;
    }
    if (selectedSession.status === 'void') {
      setSessionState('error');
      setSessionMessage('اتصال Batch به Session باطل‌شده مجاز نیست.');
      return;
    }
    const existingBatches = selectedSession.batches ?? [];
    if (existingBatches.some(batch => batch.id === recordId)) {
      setSessionState('error');
      setSessionMessage('این Trial Mix record قبلاً به Session فعال متصل شده است.');
      return;
    }
    const nextBatchSequence = existingBatches.reduce((max, batch) => Math.max(max, batch.batchSequence), 0) + 1;
    setLinkingRecordId(recordId);
    setSessionState('saving');
    setSessionMessage('');
    try {
      if (!window.tolouTrialMixV2?.linkRecord) throw new Error('API اتصال Batch به Trial Session در دسترس نیست.');
      const response = await window.tolouTrialMixV2.linkRecord({
        sessionId: selectedSession.id,
        trialMixRecordId: recordId,
        batchSequence: nextBatchSequence
      }) as { status?: string; session?: TrialSessionDetail; error?: string };
      if (response.status !== 'pass' || !response.session) throw new Error(response.error ?? 'اتصال Batch به Trial Session ناموفق بود.');
      setSelectedSession(response.session);
      setSelectedBatchId(recordId);
      setSelectedSpecimenId(null);
      await loadSessions(response.session.id);
      setSessionState('saved');
      setSessionMessage(`Batch ${nextBatchSequence} به Session ${response.session.sessionCode} متصل شد.`);
    } catch (error) {
      setSessionState('error');
      setSessionMessage(error instanceof Error ? error.message : 'خطا در اتصال Batch به Trial Session');
    } finally {
      setLinkingRecordId(null);
    }
  }

  async function saveMaterialActual() {
    if (!selectedSession || !selectedBatchId) {
      setMaterialState('error');
      setMaterialMessage('ابتدا یک Session و سپس یک Batch را انتخاب کنید.');
      return;
    }
    if (selectedSession.status === 'void') {
      setMaterialState('error');
      setMaterialMessage('ثبت مصالح برای Session باطل‌شده مجاز نیست.');
      return;
    }
    if (!materialForm.materialName.trim()) {
      setMaterialState('error');
      setMaterialMessage('نام ماده الزامی است.');
      return;
    }
    if (!materialForm.batchedMassKg.trim()) {
      setMaterialState('error');
      setMaterialMessage('جرم واقعی بچ‌شده الزامی است.');
      return;
    }
    const batchedMassKg = Number(materialForm.batchedMassKg);
    if (!Number.isFinite(batchedMassKg) || batchedMassKg < 0) {
      setMaterialState('error');
      setMaterialMessage('جرم واقعی بچ‌شده باید عدد معتبر و غیرمنفی باشد.');
      return;
    }
    setMaterialState('saving');
    setMaterialMessage('');
    try {
      if (!window.tolouTrialMixV2?.saveMaterialActual) throw new Error('API ثبت مصالح واقعی Trial در دسترس نیست.');
      const response = await window.tolouTrialMixV2.saveMaterialActual({
        trialMixRecordId: selectedBatchId,
        materialRole: materialForm.materialRole,
        materialReferenceId: materialForm.materialReferenceId.trim() || null,
        materialName: materialForm.materialName.trim(),
        targetMassKg: optionalNumber(materialForm.targetMassKg),
        batchedMassKg,
        moisturePercent: optionalNumber(materialForm.moisturePercent),
        absorptionPercent: optionalNumber(materialForm.absorptionPercent),
        moistureCorrectionKg: optionalNumber(materialForm.moistureCorrectionKg),
        snapshot: {}
      }) as { status?: string; error?: string };
      if (response.status !== 'pass') throw new Error(response.error ?? 'ثبت مصالح واقعی Trial ناموفق بود.');
      setMaterialForm(initialMaterialForm);
      await openSession(selectedSession.id);
      setMaterialState('saved');
      setMaterialMessage('مقدار واقعی مصالح برای Batch انتخاب‌شده ثبت شد.');
    } catch (error) {
      setMaterialState('error');
      setMaterialMessage(error instanceof Error ? error.message : 'خطا در ثبت مصالح واقعی Trial');
    }
  }

  async function saveSpecimen() {
    if (!selectedSession || !selectedBatchId) {
      setSpecimenState('error');
      setSpecimenMessage('ابتدا یک Session و سپس یک Batch را انتخاب کنید.');
      return;
    }
    if (selectedSession.status === 'void') {
      setSpecimenState('error');
      setSpecimenMessage('ثبت نمونه برای Session باطل‌شده مجاز نیست.');
      return;
    }
    if (!specimenForm.specimenCode.trim()) {
      setSpecimenState('error');
      setSpecimenMessage('کد نمونه الزامی است.');
      return;
    }
    if (!specimenForm.castAt.trim() || Number.isNaN(Date.parse(specimenForm.castAt))) {
      setSpecimenState('error');
      setSpecimenMessage('زمان ساخت نمونه معتبر نیست.');
      return;
    }
    const targetTestAgeDays = optionalNumber(specimenForm.targetTestAgeDays);
    if (targetTestAgeDays != null && (!Number.isInteger(targetTestAgeDays) || targetTestAgeDays <= 0)) {
      setSpecimenState('error');
      setSpecimenMessage('سن هدف آزمون باید عدد صحیح مثبت باشد.');
      return;
    }
    const dimensions = [
      [optionalNumber(specimenForm.widthMm), 'عرض'],
      [optionalNumber(specimenForm.heightMm), 'ارتفاع'],
      [optionalNumber(specimenForm.lengthMm), 'طول'],
      [optionalNumber(specimenForm.diameterMm), 'قطر']
    ] as const;
    const invalidDimension = dimensions.find(([value]) => value != null && (!Number.isFinite(value) || value <= 0));
    if (invalidDimension) {
      setSpecimenState('error');
      setSpecimenMessage(`${invalidDimension[1]} نمونه باید عدد مثبت باشد.`);
      return;
    }
    setSpecimenState('saving');
    setSpecimenMessage('');
    try {
      if (!window.tolouTrialMixV2?.saveSpecimen) throw new Error('API ثبت نمونه Trial در دسترس نیست.');
      const response = await window.tolouTrialMixV2.saveSpecimen({
        trialMixRecordId: selectedBatchId,
        specimenCode: specimenForm.specimenCode.trim(),
        specimenType: specimenForm.specimenType,
        castAt: specimenForm.castAt,
        targetTestAgeDays,
        widthMm: optionalNumber(specimenForm.widthMm),
        heightMm: optionalNumber(specimenForm.heightMm),
        lengthMm: optionalNumber(specimenForm.lengthMm),
        diameterMm: optionalNumber(specimenForm.diameterMm),
        curingCondition: specimenForm.curingCondition.trim() || null,
        notes: specimenForm.notes.trim() || null
      }) as { status?: string; specimen?: { id?: string }; error?: string };
      if (response.status !== 'pass') throw new Error(response.error ?? 'ثبت نمونه Trial ناموفق بود.');
      const createdSpecimenId = response.specimen?.id;
      setSpecimenForm(newSpecimenForm());
      await openSession(selectedSession.id);
      if (createdSpecimenId) setSelectedSpecimenId(createdSpecimenId);
      setSpecimenState('saved');
      setSpecimenMessage('نمونه برای Batch انتخاب‌شده ثبت شد.');
    } catch (error) {
      setSpecimenState('error');
      setSpecimenMessage(error instanceof Error ? error.message : 'خطا در ثبت نمونه Trial');
    }
  }

  async function saveStrengthResult() {
    if (!selectedSession || !selectedSpecimenId) {
      setStrengthState('error');
      setStrengthMessage('ابتدا یک نمونه آزمایشگاهی را انتخاب کنید.');
      return;
    }
    if (selectedSession.status === 'void') {
      setStrengthState('error');
      setStrengthMessage('ثبت نتیجه مقاومت برای Session باطل‌شده مجاز نیست.');
      return;
    }
    if (!strengthForm.testedAt.trim() || Number.isNaN(Date.parse(strengthForm.testedAt))) {
      setStrengthState('error');
      setStrengthMessage('زمان آزمون معتبر نیست.');
      return;
    }
    const testAgeDays = Number(strengthForm.testAgeDays);
    const maximumLoadKn = Number(strengthForm.maximumLoadKn);
    const loadedAreaMm2 = Number(strengthForm.loadedAreaMm2);
    if (!strengthForm.testAgeDays.trim() || !Number.isFinite(testAgeDays) || testAgeDays < 0) {
      setStrengthState('error');
      setStrengthMessage('سن آزمون باید عدد معتبر و غیرمنفی باشد.');
      return;
    }
    if (!strengthForm.maximumLoadKn.trim() || !Number.isFinite(maximumLoadKn) || maximumLoadKn <= 0) {
      setStrengthState('error');
      setStrengthMessage('بار بیشینه باید عدد مثبت باشد.');
      return;
    }
    if (!strengthForm.loadedAreaMm2.trim() || !Number.isFinite(loadedAreaMm2) || loadedAreaMm2 <= 0) {
      setStrengthState('error');
      setStrengthMessage('سطح بارگذاری باید عدد مثبت باشد.');
      return;
    }
    setStrengthState('saving');
    setStrengthMessage('');
    try {
      if (!window.tolouTrialMixV2?.saveStrengthResult) throw new Error('API ثبت نتیجه مقاومت فشاری در دسترس نیست.');
      const response = await window.tolouTrialMixV2.saveStrengthResult({
        specimenId: selectedSpecimenId,
        testedAt: strengthForm.testedAt,
        testAgeDays,
        maximumLoadKn,
        loadedAreaMm2,
        standardReference: strengthForm.standardReference.trim() || null,
        machineReference: strengthForm.machineReference.trim() || null,
        failureMode: strengthForm.failureMode.trim() || null,
        testedBy: strengthForm.testedBy.trim() || null,
        notes: strengthForm.notes.trim() || null
      }) as { status?: string; result?: { strengthMpa?: number; strength_mpa?: number }; error?: string };
      if (response.status !== 'pass') throw new Error(response.error ?? 'ثبت نتیجه مقاومت فشاری ناموفق بود.');
      const savedStrength = response.result?.strengthMpa ?? response.result?.strength_mpa;
      setStrengthForm(newStrengthForm());
      await openSession(selectedSession.id);
      setStrengthState('saved');
      setStrengthMessage(savedStrength == null ? 'نتیجه مقاومت فشاری ثبت شد.' : `نتیجه مقاومت فشاری ثبت شد: ${Number(savedStrength).toFixed(2)} MPa`);
    } catch (error) {
      setStrengthState('error');
      setStrengthMessage(error instanceof Error ? error.message : 'خطا در ثبت نتیجه مقاومت فشاری');
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

  function materialField(key: keyof Omit<MaterialFormState, 'materialRole'>, label: string, type = 'text') {
    return <label className="field"><span>{label}</span><input type={type} step={type === 'number' ? 'any' : undefined} value={materialForm[key]} onChange={event => setMaterialForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>;
  }

  function specimenField(key: keyof Omit<SpecimenFormState, 'specimenType'>, label: string, type = 'text') {
    return <label className="field"><span>{label}</span><input type={type} step={type === 'number' ? 'any' : undefined} value={specimenForm[key]} onChange={event => setSpecimenForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>;
  }

  function strengthField(key: keyof StrengthFormState, label: string, type = 'text') {
    return <label className="field"><span>{label}</span><input type={type} step={type === 'number' ? 'any' : undefined} value={strengthForm[key]} onChange={event => setStrengthForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>;
  }

  function field(key: keyof FormState, label: string, type = 'number') {
    return <label className="field"><span>{label}</span><input type={type} step={type === 'number' ? 'any' : undefined} value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>;
  }

  const linkedRecordIds = new Set((selectedSession?.batches ?? []).map(batch => batch.id));
  const selectedBatch = selectedSession?.batches?.find(batch => batch.id === selectedBatchId) ?? null;
  const selectedSpecimen = selectedBatch?.specimens?.find(specimen => specimen.id === selectedSpecimenId) ?? null;
  const strengthPreview = Number(strengthForm.maximumLoadKn) > 0 && Number(strengthForm.loadedAreaMm2) > 0
    ? Number(strengthForm.maximumLoadKn) * 1000 / Number(strengthForm.loadedAreaMm2)
    : null;

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
            <div><b>تعداد Batch:</b> {selectedSession.batches?.length ?? selectedSession.batchCount ?? 0}</div>
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

    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-head"><div><h3>Batchهای Session فعال</h3><span>Revision-bound linked Trial Mix records</span></div><span className="badge blue">{selectedSession?.batches?.length ?? 0}</span></div>
        <div className="table-wrap"><table><caption className="sr-only">Batchهای متصل به Trial Session فعال</caption><thead><tr><th scope="col">#</th><th scope="col">تاریخ</th><th scope="col">Batch m³</th><th scope="col">Slump mm</th><th scope="col">Air %</th><th scope="col">Temp °C</th><th scope="col">Density kg/m³</th><th scope="col">Materials</th><th scope="col">Specimens</th><th scope="col">عملیات</th></tr></thead><tbody>{!selectedSession ? <tr><td colSpan={10}>برای مشاهده Batchها ابتدا یک Session را باز کنید.</td></tr> : (selectedSession.batches?.length ?? 0) === 0 ? <tr><td colSpan={10}>هنوز Batch به این Session متصل نشده است.</td></tr> : selectedSession.batches!.map(batch => <tr key={batch.id}><td>{batch.batchSequence}</td><td>{batch.trialDate}</td><td>{batch.batchQuantityM3}</td><td>{batch.actualSlumpMm}</td><td>{batch.airContentPercent}</td><td>{batch.concreteTemperatureC}</td><td>{batch.freshDensityKgM3}</td><td>{batch.materials?.length ?? 0}</td><td>{batch.specimens?.length ?? 0}</td><td><button className="btn" aria-pressed={selectedBatchId === batch.id} onClick={() => { setSelectedBatchId(batch.id); setSelectedSpecimenId(batch.specimens?.[0]?.id ?? null); setMaterialMessage(''); setSpecimenMessage(''); setStrengthMessage(''); }}>انتخاب Batch</button></td></tr>)}</tbody></table></div>
      </article>
    </section>

    <div aria-live="polite" aria-atomic="true">{materialMessage && <div className={`alert ${materialState === 'error' ? 'danger' : 'ok'}`}>{materialMessage}</div>}</div>
    <section className="form-grid">
      <article className="panel form-panel">
        <div className="panel-head"><div><h3>Actual Materials</h3><span>{selectedBatch ? `Batch ${selectedBatch.batchSequence} — ${selectedBatch.trialDate}` : 'یک Batch را انتخاب کنید'}</span></div></div>
        <div className="panel-body form-body">
          <label className="field"><span>نقش ماده</span><select value={materialForm.materialRole} onChange={event => setMaterialForm(previous => ({ ...previous, materialRole: event.target.value as TrialMaterialRole }))}>{Object.entries(materialRoleLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {materialField('materialName', 'نام ماده')}
          {materialField('materialReferenceId', 'Traceability Reference')}
          {materialField('targetMassKg', 'جرم هدف (kg)', 'number')}
          {materialField('batchedMassKg', 'جرم واقعی بچ‌شده (kg)', 'number')}
          {materialField('moisturePercent', 'رطوبت (%)', 'number')}
          {materialField('absorptionPercent', 'جذب آب (%)', 'number')}
          {materialField('moistureCorrectionKg', 'تصحیح رطوبت ثبت‌شده (kg)', 'number')}
        </div>
        <div className="toolbar"><button className="btn success" disabled={!selectedBatch || selectedSession?.status === 'void' || materialState === 'saving'} onClick={saveMaterialActual}>{materialState === 'saving' ? 'در حال ثبت...' : 'ثبت مقدار واقعی ماده'}</button></div>
      </article>

      <article className="panel form-panel">
        <div className="panel-head"><div><h3>راهنمای داده</h3><span>Raw batching traceability</span></div><span className="badge blue">{selectedBatch?.materials?.length ?? 0}</span></div>
        <div className="panel-body">
          <p>این بخش داده واقعی بچ آزمایشی را ثبت می‌کند. مقدار «تصحیح رطوبت» در این مرحله محاسبه نمی‌شود و فقط همان مقدار ثبت‌شده توسط کاربر ذخیره خواهد شد.</p>
          <p><b>Batch فعال:</b> {selectedBatch ? `#${selectedBatch.batchSequence} / ${selectedBatch.id}` : '-'}</p>
        </div>
      </article>
    </section>

    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-head"><div><h3>مصالح واقعی Batch انتخاب‌شده</h3><span>Actual batching records</span></div><span className="badge blue">{selectedBatch?.materials?.length ?? 0}</span></div>
        <div className="table-wrap"><table><caption className="sr-only">مصالح واقعی ثبت‌شده برای Batch انتخاب‌شده</caption><thead><tr><th scope="col">Role</th><th scope="col">Material</th><th scope="col">Reference</th><th scope="col">Target kg</th><th scope="col">Batched kg</th><th scope="col">Moisture %</th><th scope="col">Absorption %</th><th scope="col">Correction kg</th></tr></thead><tbody>{!selectedBatch ? <tr><td colSpan={8}>ابتدا یک Batch را انتخاب کنید.</td></tr> : (selectedBatch.materials?.length ?? 0) === 0 ? <tr><td colSpan={8}>هنوز مقدار واقعی مصالح برای این Batch ثبت نشده است.</td></tr> : selectedBatch.materials!.map(material => <tr key={material.id}><td>{materialRoleLabel[material.materialRole]}</td><td>{material.materialName}</td><td>{material.materialReferenceId ?? '-'}</td><td>{material.targetMassKg ?? '-'}</td><td>{material.batchedMassKg}</td><td>{material.moisturePercent ?? '-'}</td><td>{material.absorptionPercent ?? '-'}</td><td>{material.moistureCorrectionKg ?? '-'}</td></tr>)}</tbody></table></div>
      </article>
    </section>

    <div aria-live="polite" aria-atomic="true">{specimenMessage && <div className={`alert ${specimenState === 'error' ? 'danger' : 'ok'}`}>{specimenMessage}</div>}</div>
    <section className="form-grid">
      <article className="panel form-panel">
        <div className="panel-head"><div><h3>Specimens</h3><span>{selectedBatch ? `Batch ${selectedBatch.batchSequence} — laboratory specimens` : 'یک Batch را انتخاب کنید'}</span></div></div>
        <div className="panel-body form-body">
          {specimenField('specimenCode', 'کد نمونه')}
          <label className="field"><span>نوع نمونه</span><select value={specimenForm.specimenType} onChange={event => setSpecimenForm(previous => ({ ...previous, specimenType: event.target.value as TrialSpecimenType }))}>{Object.entries(specimenTypeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {specimenField('castAt', 'زمان ساخت', 'datetime-local')}
          {specimenField('targetTestAgeDays', 'سن هدف آزمون (day)', 'number')}
          {specimenField('widthMm', 'عرض (mm)', 'number')}
          {specimenField('heightMm', 'ارتفاع (mm)', 'number')}
          {specimenField('lengthMm', 'طول (mm)', 'number')}
          {specimenField('diameterMm', 'قطر (mm)', 'number')}
          {specimenField('curingCondition', 'شرایط عمل‌آوری')}
          <label className="field"><span>یادداشت نمونه</span><textarea value={specimenForm.notes} onChange={event => setSpecimenForm(previous => ({ ...previous, notes: event.target.value }))} /></label>
        </div>
        <div className="toolbar"><button className="btn success" disabled={!selectedBatch || selectedSession?.status === 'void' || specimenState === 'saving'} onClick={saveSpecimen}>{specimenState === 'saving' ? 'در حال ثبت...' : 'ثبت نمونه'}</button></div>
      </article>

      <article className="panel form-panel">
        <div className="panel-head"><div><h3>هویت نمونه</h3><span>Geometry & curing traceability</span></div><span className="badge blue">{selectedBatch?.specimens?.length ?? 0}</span></div>
        <div className="panel-body">
          <p>ابعاد فقط در صورت ثبت، باید مثبت باشند. سن هدف آزمون نیز در صورت ورود باید عدد صحیح مثبت باشد.</p>
          <p><b>Batch فعال:</b> {selectedBatch ? `#${selectedBatch.batchSequence} / ${selectedBatch.id}` : '-'}</p>
        </div>
      </article>
    </section>

    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-head"><div><h3>نمونه‌های Batch انتخاب‌شده</h3><span>Persisted specimen identities</span></div><span className="badge blue">{selectedBatch?.specimens?.length ?? 0}</span></div>
        <div className="table-wrap"><table><caption className="sr-only">نمونه‌های آزمایشگاهی ثبت‌شده برای Batch انتخاب‌شده</caption><thead><tr><th scope="col">Code</th><th scope="col">Type</th><th scope="col">Cast At</th><th scope="col">Target Age</th><th scope="col">Width</th><th scope="col">Height</th><th scope="col">Length</th><th scope="col">Diameter</th><th scope="col">Curing</th><th scope="col">Results</th><th scope="col">عملیات</th></tr></thead><tbody>{!selectedBatch ? <tr><td colSpan={11}>ابتدا یک Batch را انتخاب کنید.</td></tr> : (selectedBatch.specimens?.length ?? 0) === 0 ? <tr><td colSpan={11}>هنوز نمونه‌ای برای این Batch ثبت نشده است.</td></tr> : selectedBatch.specimens!.map(specimen => <tr key={specimen.id}><td>{specimen.specimenCode}</td><td>{specimenTypeLabel[specimen.specimenType]}</td><td>{specimen.castAt}</td><td>{specimen.targetTestAgeDays ?? '-'}</td><td>{specimen.widthMm ?? '-'}</td><td>{specimen.heightMm ?? '-'}</td><td>{specimen.lengthMm ?? '-'}</td><td>{specimen.diameterMm ?? '-'}</td><td>{specimen.curingCondition ?? '-'}</td><td>{specimen.results?.length ?? 0}</td><td><button className="btn" aria-pressed={selectedSpecimenId === specimen.id} onClick={() => { setSelectedSpecimenId(specimen.id); setStrengthMessage(''); }}>انتخاب نمونه</button></td></tr>)}</tbody></table></div>
      </article>
    </section>

    <div aria-live="polite" aria-atomic="true">{strengthMessage && <div className={`alert ${strengthState === 'error' ? 'danger' : 'ok'}`}>{strengthMessage}</div>}</div>
    <section className="form-grid">
      <article className="panel form-panel">
        <div className="panel-head"><div><h3>Compressive Strength Result</h3><span>{selectedSpecimen ? `${selectedSpecimen.specimenCode} — ${specimenTypeLabel[selectedSpecimen.specimenType]}` : 'یک نمونه را انتخاب کنید'}</span></div></div>
        <div className="panel-body form-body">
          {strengthField('testedAt', 'زمان آزمون', 'datetime-local')}
          {strengthField('testAgeDays', 'سن آزمون (day)', 'number')}
          {strengthField('maximumLoadKn', 'بار بیشینه (kN)', 'number')}
          {strengthField('loadedAreaMm2', 'سطح بارگذاری (mm²)', 'number')}
          {strengthField('standardReference', 'Standard Reference')}
          {strengthField('machineReference', 'Machine Reference')}
          {strengthField('failureMode', 'Failure Mode')}
          {strengthField('testedBy', 'آزمایش‌کننده')}
          <label className="field"><span>یادداشت آزمون</span><textarea value={strengthForm.notes} onChange={event => setStrengthForm(previous => ({ ...previous, notes: event.target.value }))} /></label>
        </div>
        <div className="toolbar"><button className="btn success" disabled={!selectedSpecimen || selectedSession?.status === 'void' || strengthState === 'saving'} onClick={saveStrengthResult}>{strengthState === 'saving' ? 'در حال ثبت...' : 'ثبت نتیجه مقاومت'}</button></div>
      </article>

      <article className="panel form-panel">
        <div className="panel-head"><div><h3>محاسبه Deterministic</h3><span>Service-controlled MPa</span></div><span className="badge blue">{selectedSpecimen?.results?.length ?? 0}</span></div>
        <div className="panel-body">
          <p>مقاومت فشاری مستقیماً قابل ورود نیست. Service از بار بیشینه و سطح بارگذاری محاسبه و ذخیره می‌کند.</p>
          <p><b>رابطه:</b> Load (kN) × 1000 / Area (mm²)</p>
          <p><b>Preview:</b> {strengthPreview == null ? '-' : `${strengthPreview.toFixed(2)} MPa`}</p>
          <p><b>Specimen فعال:</b> {selectedSpecimen ? `${selectedSpecimen.specimenCode} / ${selectedSpecimen.id}` : '-'}</p>
        </div>
      </article>
    </section>

    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-head"><div><h3>نتایج مقاومت نمونه انتخاب‌شده</h3><span>Deterministic compressive strength history</span></div><span className="badge blue">{selectedSpecimen?.results?.length ?? 0}</span></div>
        <div className="table-wrap"><table><caption className="sr-only">نتایج مقاومت فشاری نمونه انتخاب‌شده</caption><thead><tr><th scope="col">Tested At</th><th scope="col">Age day</th><th scope="col">Load kN</th><th scope="col">Area mm²</th><th scope="col">Strength MPa</th><th scope="col">Method</th><th scope="col">Standard</th><th scope="col">Machine</th><th scope="col">Failure</th><th scope="col">Tester</th></tr></thead><tbody>{!selectedSpecimen ? <tr><td colSpan={10}>ابتدا یک نمونه را انتخاب کنید.</td></tr> : (selectedSpecimen.results?.length ?? 0) === 0 ? <tr><td colSpan={10}>هنوز نتیجه مقاومت فشاری برای این نمونه ثبت نشده است.</td></tr> : selectedSpecimen.results!.map(result => <tr key={result.id}><td>{result.testedAt}</td><td>{result.testAgeDays}</td><td>{result.maximumLoadKn}</td><td>{result.loadedAreaMm2}</td><td>{Number(result.strengthMpa).toFixed(2)}</td><td>{result.calculationMethod ?? '-'}</td><td>{result.standardReference ?? '-'}</td><td>{result.machineReference ?? '-'}</td><td>{result.failureMode ?? '-'}</td><td>{result.testedBy ?? '-'}</td></tr>)}</tbody></table></div>
      </article>
    </section>

    <section className="titlebar"><div><h2>Legacy Trial Batch</h2><p>مسیر پایدار Gate 06 برای ثبت رکورد بچ آزمایشی؛ رکورد ذخیره‌شده می‌تواند به Session فعال متصل شود.</p></div><div className="toolbar"><button className="btn success" disabled={!props.mixDesignId || state === 'saving'} onClick={saveRecord}>{state === 'saving' ? 'در حال ذخیره...' : 'ثبت Trial Mix'}</button></div></section>
    <div aria-live="polite" aria-atomic="true">{message && <div className={`alert ${state === 'error' ? 'danger' : 'ok'}`}>{message}</div>}</div>
    <section className="form-grid">
      <article className="panel form-panel"><div className="panel-head"><div><h3>مشخصات Trial</h3><span>Fresh concrete measurements</span></div></div><div className="panel-body form-body">
        {field('trialDate', 'تاریخ Trial', 'date')}{field('batchQuantityM3', 'حجم بچ (m³)')}{field('actualSlumpMm', 'اسلامپ واقعی (mm)')}{field('airContentPercent', 'هوای واقعی (%)')}{field('concreteTemperatureC', 'دمای بتن تازه (°C)')}{field('freshDensityKgM3', 'چگالی بتن تازه (kg/m³)')}
      </div></article>
      <article className="panel form-panel"><div className="panel-head"><div><h3>مقاومت و Traceability</h3><span>Strength results & audit</span></div></div><div className="panel-body form-body">
        {field('strength7dMpa', 'مقاومت ۷ روزه (MPa)')}{field('strength28dMpa', 'مقاومت ۲۸ روزه (MPa)')}{field('actorName', 'مسئول ثبت', 'text')}<label className="field"><span>یادداشت‌ها</span><textarea value={form.notes} onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))} /></label>
      </div></article>
    </section>
    <section className="content-grid"><article className="panel wide-panel"><div className="panel-head"><div><h3>سوابق Trial Mix</h3><span>Persisted records for active mix design</span></div><span className="badge blue">{records.length}</span></div><div className="table-wrap"><table><caption className="sr-only">سوابق Trial Mix ثبت‌شده برای طرح فعال</caption><thead><tr><th scope="col">تاریخ</th><th scope="col">Batch m³</th><th scope="col">Slump mm</th><th scope="col">Air %</th><th scope="col">Temp °C</th><th scope="col">Density kg/m³</th><th scope="col">7d MPa</th><th scope="col">28d MPa</th><th scope="col">مسئول</th><th scope="col">Session</th></tr></thead><tbody>{records.length === 0 ? <tr><td colSpan={10}>هنوز Trial Mix ثبت نشده است.</td></tr> : records.map(record => { const linked = linkedRecordIds.has(record.id); return <tr key={record.id}><td>{record.trialDate}</td><td>{record.batchQuantityM3}</td><td>{record.actualSlumpMm}</td><td>{record.airContentPercent}</td><td>{record.concreteTemperatureC}</td><td>{record.freshDensityKgM3}</td><td>{record.strength7dMpa ?? '-'}</td><td>{record.strength28dMpa ?? '-'}</td><td>{record.createdBy ?? '-'}</td><td><button className="btn" disabled={!selectedSession || selectedSession.status === 'void' || linked || linkingRecordId === record.id} onClick={() => void linkRecordToSelectedSession(record.id)} aria-label={linked ? 'این Batch به Session فعال متصل است' : `اتصال Trial Mix تاریخ ${record.trialDate} به Session فعال`}>{linked ? 'متصل است' : linkingRecordId === record.id ? 'در حال اتصال...' : 'اتصال به Session'}</button></td></tr>; })}</tbody></table></div></article></section>
  </>;
}
