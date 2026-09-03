import { useState } from 'react';
import type { MaterialInput, MaterialRecord, SaveMaterialResponse } from './types/material';

type MaterialType = MaterialInput['materialType'];

const materialTypes: Array<{ value: MaterialType; label: string }> = [
  { value: 'cement', label: 'سیمان' },
  { value: 'water', label: 'آب' },
  { value: 'fine_aggregate', label: 'سنگدانه ریز / ماسه' },
  { value: 'coarse_aggregate', label: 'سنگدانه درشت / شن' },
  { value: 'scm', label: 'مواد مکمل سیمانی' },
  { value: 'admixture', label: 'افزودنی شیمیایی' },
  { value: 'fiber', label: 'الیاف' }
];

const initialMaterial: Omit<MaterialInput, 'mixDesignId'> = {
  materialType: 'fine_aggregate',
  name: 'ماسه شسته منبع نمونه',
  source: 'یزد',
  specificGravity: 2.65,
  absorptionPercent: 1.8,
  moisturePercent: 3.2,
  unitWeightKgM3: 1650,
  notes: 'برای محاسبات صنعتی باید نتایج آزمایشگاهی ASTM/ISIRI ثبت شود.'
};

export function MaterialsView(props: { mixDesignId: string | null }) {
  const [material, setMaterial] = useState(initialMaterial);
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function saveMaterial() {
    setStatus('saving');
    setMessage('');

    try {
      if (!props.mixDesignId) throw new Error('ابتدا یک پروژه/طرح جدید ذخیره کنید تا مصالح به همان طرح متصل شود.');
      if (!window.tolouMaterials) throw new Error('API مصالح در دسترس نیست. برنامه باید داخل Electron اجرا شود.');

      const payload: MaterialInput = { ...material, mixDesignId: props.mixDesignId };
      const result = await window.tolouMaterials.save(payload) as SaveMaterialResponse;
      if (result.status !== 'pass') throw new Error(result.error ?? 'ذخیره مصالح ناموفق بود.');

      const list = await window.tolouMaterials.listByMixDesign(props.mixDesignId) as { status: string; materials?: MaterialRecord[]; error?: string };
      setMaterials(list.materials ?? []);
      setStatus('saved');
      setMessage('مصالح با موفقیت به طرح فعلی اضافه شد.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'خطای ناشناخته در ذخیره مصالح');
    }
  }

  function setValue(key: keyof typeof material, value: string | number | null) {
    setMaterial(previous => ({ ...previous, [key]: value }));
  }

  return (
    <>
      <section className="titlebar">
        <div><h2>مصالح و منابع طرح اختلاط</h2><p>ثبت داده‌های آزمایشگاهی سیمان، آب، سنگدانه‌ها، افزودنی‌ها و SCM برای محاسبات ACI</p></div>
        <div className="toolbar"><button className="btn success" disabled={status === 'saving'} onClick={saveMaterial}>{status === 'saving' ? 'در حال ذخیره...' : 'ذخیره مصالح'}</button></div>
      </section>

      {!props.mixDesignId && <div className="alert warn">برای ثبت مصالح، ابتدا از بخش «پروژه جدید» یک طرح را ذخیره کنید.</div>}
      {message && <div className={`alert ${status === 'error' ? 'danger' : 'ok'}`}>{message}</div>}

      <section className="content-grid">
        <article className="panel wide-panel">
          <div className="panel-head"><div><h3>فرم ورود مصالح</h3><span>داده‌هایی که مستقیماً در محاسبات و گزارش نهایی استفاده می‌شوند</span></div><span className="badge blue">ASTM / ISIRI Ready</span></div>
          <div className="panel-body form-body">
            <label className="field"><span>نوع مصالح</span><select value={material.materialType} onChange={event => setValue('materialType', event.target.value as MaterialType)}>{materialTypes.map(type => <option value={type.value} key={type.value}>{type.label}</option>)}</select></label>
            <Field label="نام مصالح" value={material.name} onChange={value => setValue('name', value)} />
            <Field label="منبع / معدن / کارخانه" value={material.source} onChange={value => setValue('source', value)} />
            <NumberField label="وزن مخصوص SSD" value={material.specificGravity} onChange={value => setValue('specificGravity', value)} />
            <NumberField label="جذب آب %" value={material.absorptionPercent} onChange={value => setValue('absorptionPercent', value)} />
            <NumberField label="رطوبت فعلی %" value={material.moisturePercent} onChange={value => setValue('moisturePercent', value)} />
            <NumberField label="وزن واحد kg/m³" value={material.unitWeightKgM3} onChange={value => setValue('unitWeightKgM3', value)} />
            <label className="field full"><span>یادداشت فنی</span><textarea value={material.notes} onChange={event => setValue('notes', event.target.value)} /></label>
          </div>
        </article>

        <article className="panel wide-panel">
          <div className="panel-head"><div><h3>مصالح ثبت‌شده برای طرح فعلی</h3><span>در مرحله بعد به دانه‌بندی و موتور محاسبات وصل می‌شود</span></div></div>
          <div className="panel-body tablewrap">
            <table>
              <thead><tr><th>نوع</th><th>نام</th><th>منبع</th><th>وزن مخصوص</th><th>جذب</th><th>رطوبت</th><th>وزن واحد</th></tr></thead>
              <tbody>
                {materials.length === 0 && <tr><td colSpan={7}>هنوز مصالحی برای طرح فعلی ثبت نشده است.</td></tr>}
                {materials.map(item => <tr key={item.id}><td>{materialTypes.find(type => type.value === item.materialType)?.label ?? item.materialType}</td><td>{item.name}</td><td>{item.source}</td><td>{item.specificGravity ?? '-'}</td><td>{item.absorptionPercent ?? '-'}</td><td>{item.moisturePercent ?? '-'}</td><td>{item.unitWeightKgM3 ?? '-'}</td></tr>)}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </>
  );
}

function Field(props: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{props.label}</span><input value={props.value} onChange={event => props.onChange(event.target.value)} /></label>;
}

function NumberField(props: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return <label className="field"><span>{props.label}</span><input type="number" value={props.value ?? ''} onChange={event => props.onChange(event.target.value === '' ? null : Number(event.target.value))} /></label>;
}
