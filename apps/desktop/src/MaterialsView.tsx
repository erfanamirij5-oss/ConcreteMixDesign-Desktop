import { useState } from 'react';
import type { AggregateRole, MaterialInput, MaterialRecord, MaterialType, MoistureCondition, SaveMaterialResponse } from './types/material';

const materialTypes: Array<{ value: MaterialType; label: string }> = [
  { value: 'cement', label: 'سیمان' },
  { value: 'water', label: 'آب' },
  { value: 'fine_aggregate', label: 'سنگدانه ریز / ماسه' },
  { value: 'coarse_aggregate', label: 'سنگدانه درشت / شن' },
  { value: 'scm', label: 'مواد مکمل سیمانی' },
  { value: 'admixture', label: 'افزودنی شیمیایی' },
  { value: 'fiber', label: 'الیاف' }
];

const aggregateRoles: Array<{ value: AggregateRole; label: string; materialType: 'fine_aggregate' | 'coarse_aggregate' | 'both' }> = [
  { value: 'natural_sand', label: 'ماسه طبیعی', materialType: 'fine_aggregate' },
  { value: 'manufactured_sand', label: 'ماسه شکسته', materialType: 'fine_aggregate' },
  { value: 'correction_aggregate', label: 'سنگدانه اصلاحی', materialType: 'both' },
  { value: 'pea_gravel', label: 'نخودی', materialType: 'coarse_aggregate' },
  { value: 'coarse_gravel', label: 'بادامی', materialType: 'coarse_aggregate' },
  { value: 'coarse_12_5', label: 'شن 12.5 میلی‌متر', materialType: 'coarse_aggregate' },
  { value: 'coarse_19', label: 'شن 19 میلی‌متر', materialType: 'coarse_aggregate' },
  { value: 'coarse_25', label: 'شن 25 میلی‌متر', materialType: 'coarse_aggregate' },
  { value: 'recycled_aggregate', label: 'سنگدانه بازیافتی', materialType: 'both' },
  { value: 'lightweight_aggregate', label: 'سنگدانه سبک', materialType: 'both' },
  { value: 'heavyweight_aggregate', label: 'سنگدانه سنگین', materialType: 'both' },
  { value: 'custom', label: 'نام/نقش سفارشی', materialType: 'both' }
];

const moistureConditions: Array<{ value: MoistureCondition; label: string }> = [
  { value: 'oven_dry', label: 'خشک آون' },
  { value: 'air_dry', label: 'خشک هوایی' },
  { value: 'ssd', label: 'SSD' },
  { value: 'wet', label: 'مرطوب' },
  { value: 'stockpile', label: 'وضعیت دپو' }
];

const initialMaterial: Omit<MaterialInput, 'mixDesignId'> = {
  materialType: 'fine_aggregate',
  aggregateRole: 'natural_sand',
  nominalSizeMm: 4.75,
  fracturedFacePercent: null,
  moistureCondition: 'stockpile',
  name: 'ماسه طبیعی 0-6 منبع نمونه',
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
  const isAggregate = material.materialType === 'fine_aggregate' || material.materialType === 'coarse_aggregate';
  const visibleRoles = aggregateRoles.filter(role => role.materialType === 'both' || role.materialType === material.materialType);

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

  function useAggregatePreset(kind: 'sand' | 'pea' | 'coarse') {
    if (kind === 'sand') {
      setMaterial(previous => ({ ...previous, materialType: 'fine_aggregate', aggregateRole: 'natural_sand', nominalSizeMm: 4.75, name: 'ماسه طبیعی 0-6' }));
      return;
    }
    if (kind === 'pea') {
      setMaterial(previous => ({ ...previous, materialType: 'coarse_aggregate', aggregateRole: 'pea_gravel', nominalSizeMm: 12.5, name: 'شن نخودی' }));
      return;
    }
    setMaterial(previous => ({ ...previous, materialType: 'coarse_aggregate', aggregateRole: 'coarse_gravel', nominalSizeMm: 19, name: 'شن بادامی' }));
  }

  function countByType(type: MaterialType) {
    return materials.filter(item => item.materialType === type).length;
  }

  return (
    <>
      <section className="titlebar">
        <div><h2>مصالح و منابع طرح اختلاط</h2><p>ثبت چند ماسه، چند شن و مصالح خاص با نام آزاد برای ترکیب‌های واقعی پروژه</p></div>
        <div className="toolbar"><button className="btn success" disabled={status === 'saving'} onClick={saveMaterial}>{status === 'saving' ? 'در حال ذخیره...' : 'ذخیره مصالح'}</button></div>
      </section>

      {!props.mixDesignId && <div className="alert warn">برای ثبت مصالح، ابتدا از بخش «پروژه جدید» یک طرح را ذخیره کنید.</div>}
      {message && <div className={`alert ${status === 'error' ? 'danger' : 'ok'}`}>{message}</div>}

      <section className="content-grid">
        <article className="panel wide-panel">
          <div className="panel-head"><div><h3>فرم ورود مصالح</h3><span>نام‌گذاری آزاد مثل ماسه شکسته، نخودی، بادامی یا شن 19 برای گزارش و ترکیب نهایی</span></div><span className="badge blue">Multi Aggregate</span></div>
          <div className="panel-body form-body">
            <div className="quick-actions full">
              <button className="btn ghost" type="button" onClick={() => useAggregatePreset('sand')}>افزودن ماسه</button>
              <button className="btn ghost" type="button" onClick={() => useAggregatePreset('pea')}>افزودن نخودی</button>
              <button className="btn ghost" type="button" onClick={() => useAggregatePreset('coarse')}>افزودن بادامی</button>
            </div>
            <label className="field"><span>نوع مصالح</span><select value={material.materialType} onChange={event => setValue('materialType', event.target.value as MaterialType)}>{materialTypes.map(type => <option value={type.value} key={type.value}>{type.label}</option>)}</select></label>
            {isAggregate && <label className="field"><span>نقش سنگدانه</span><select value={material.aggregateRole ?? 'custom'} onChange={event => setValue('aggregateRole', event.target.value as AggregateRole)}>{visibleRoles.map(role => <option value={role.value} key={role.value}>{role.label}</option>)}</select></label>}
            <Field label="نام مصالح" value={material.name} onChange={value => setValue('name', value)} />
            <Field label="منبع / معدن / کارخانه" value={material.source} onChange={value => setValue('source', value)} />
            {isAggregate && <NumberField label="اندازه اسمی mm" value={material.nominalSizeMm} onChange={value => setValue('nominalSizeMm', value)} />}
            {isAggregate && <NumberField label="درصد شکستگی %" value={material.fracturedFacePercent} onChange={value => setValue('fracturedFacePercent', value)} />}
            {isAggregate && <label className="field"><span>وضعیت رطوبتی</span><select value={material.moistureCondition ?? 'stockpile'} onChange={event => setValue('moistureCondition', event.target.value as MoistureCondition)}>{moistureConditions.map(condition => <option value={condition.value} key={condition.value}>{condition.label}</option>)}</select></label>}
            <NumberField label="وزن مخصوص SSD" value={material.specificGravity} onChange={value => setValue('specificGravity', value)} />
            <NumberField label="جذب آب %" value={material.absorptionPercent} onChange={value => setValue('absorptionPercent', value)} />
            <NumberField label="رطوبت فعلی %" value={material.moisturePercent} onChange={value => setValue('moisturePercent', value)} />
            <NumberField label="وزن واحد kg/m³" value={material.unitWeightKgM3} onChange={value => setValue('unitWeightKgM3', value)} />
            <label className="field full"><span>یادداشت فنی</span><textarea value={material.notes} onChange={event => setValue('notes', event.target.value)} /></label>
          </div>
        </article>

        <article className="panel wide-panel">
          <div className="panel-head"><div><h3>مصالح ثبت‌شده برای طرح فعلی</h3><span>ماسه‌ها: {countByType('fine_aggregate')} | شن‌ها: {countByType('coarse_aggregate')} | کل مصالح: {materials.length}</span></div></div>
          <div className="panel-body tablewrap">
            <table>
              <thead><tr><th>نوع</th><th>نقش</th><th>نام</th><th>منبع</th><th>اندازه</th><th>شکستگی</th><th>رطوبت</th><th>وزن مخصوص</th><th>جذب</th></tr></thead>
              <tbody>
                {materials.length === 0 && <tr><td colSpan={9}>هنوز مصالحی برای طرح فعلی ثبت نشده است.</td></tr>}
                {materials.map(item => <tr key={item.id}><td>{materialTypes.find(type => type.value === item.materialType)?.label ?? item.materialType}</td><td>{aggregateRoles.find(role => role.value === item.aggregateRole)?.label ?? '-'}</td><td>{item.name}</td><td>{item.source}</td><td>{item.nominalSizeMm ?? '-'}</td><td>{item.fracturedFacePercent ?? '-'}</td><td>{moistureConditions.find(condition => condition.value === item.moistureCondition)?.label ?? '-'}</td><td>{item.specificGravity ?? '-'}</td><td>{item.absorptionPercent ?? '-'}</td></tr>)}
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
