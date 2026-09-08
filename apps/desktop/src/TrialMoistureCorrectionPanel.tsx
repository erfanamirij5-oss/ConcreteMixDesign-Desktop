import { useEffect, useState } from 'react';

type AggregateCorrection = {
  id: string;
  materialRole: 'fine_aggregate' | 'coarse_aggregate';
  materialName: string;
  comparable: boolean;
  reason?: string;
  correction?: {
    targetSsdMassKg: number;
    ovenDryEquivalentKg: number;
    totalMoisturePercent: number;
    absorptionPercent: number;
    freeMoisturePercentOdBasis: number;
    freeWaterKg: number;
    correctedWetAggregateMassKg: number;
  };
};

type MoistureBatch = {
  batchId: string;
  batchSequence: number;
  batchQuantityM3: number;
  designBatchWaterKg: number;
  totalAggregateFreeWaterKg: number | null;
  correctedBatchWaterKg: number | null;
  comparable: boolean;
  aggregates: AggregateCorrection[];
};

type MoistureCorrection = {
  method: {
    version: string;
    basis: string;
    freeMoistureDefinition: string;
    batchWaterRule: string;
    references: string[];
    writesMixDesign: boolean;
    acceptanceCriteriaApplied: boolean;
  };
  session: { id: string; mixDesignId: string; revisionNumber: number; sessionCode: string };
  design: { resultId: string; waterKgM3: number };
  batches: MoistureBatch[];
};

type ApiResponse =
  | { status: 'pass'; moistureCorrection: MoistureCorrection }
  | { status: 'fail'; error: string };

type Props = { sessionId: string; refreshKey?: string };

const f = (value: number | null | undefined, digits = 3) => value == null ? '—' : value.toFixed(digits);

export function TrialMoistureCorrectionPanel(props: Props) {
  const [data, setData] = useState<MoistureCorrection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualRefresh, setManualRefresh] = useState(0);

  useEffect(() => {
    if (!props.sessionId) return;
    let cancelled = false;
    const sessionId = props.sessionId;
    setLoading(true);
    setError(null);
    window.tolouTrialMixV2?.getMoistureCorrection(sessionId)
      .then(raw => {
        if (cancelled) return;
        const response = raw as ApiResponse;
        if (response?.status === 'pass') setData(response.moistureCorrection);
        else {
          setData(null);
          setError(response?.status === 'fail' ? response.error : 'پاسخ Moisture Correction نامعتبر است.');
        }
      })
      .catch(reason => {
        if (!cancelled) {
          setData(null);
          setError(reason instanceof Error ? reason.message : 'خطا در خواندن Moisture Correction');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [props.sessionId, props.refreshKey, manualRefresh]);

  return <section className="panel form-panel" aria-label="Trial moisture correction">
    <div className="panel-head">
      <div><h3>Moisture Correction</h3><span>SSD → OD → wet aggregate + corrected batch water</span></div>
      <button className="btn" disabled={loading} onClick={() => setManualRefresh(value => value + 1)}>بروزرسانی</button>
    </div>
    <div className="panel-body">
      {loading && <p>در حال محاسبه...</p>}
      {error && <div className="alert warn">{error}</div>}
      {data && <>
        <p><b>Method:</b> {data.method.version}</p>
        <p><b>Design water:</b> {f(data.design.waterKgM3)} kg/m³</p>
        <p><b>Writes Mix Design:</b> خیر · <b>Acceptance criteria:</b> خیر</p>
        <div className="alert warn">مقادیر آب و مصالح فقط خروجی محاسباتی read-only هستند و هیچ رکوردی را تغییر نمی‌دهند.</div>
        {data.batches.length === 0
          ? <p>Batch متصل برای Moisture Correction وجود ندارد.</p>
          : data.batches.map(batch => <div key={batch.batchId} className="panel form-panel">
              <div className="panel-head">
                <div><h3>Batch {batch.batchSequence}</h3><span>{f(batch.batchQuantityM3)} m³</span></div>
                <span className={`badge ${batch.comparable ? 'blue' : ''}`}>{batch.comparable ? 'Comparable' : 'Incomplete inputs'}</span>
              </div>
              <div className="panel-body">
                <p><b>Design batch water:</b> {f(batch.designBatchWaterKg)} kg</p>
                <p><b>Aggregate free-water contribution:</b> {f(batch.totalAggregateFreeWaterKg)} kg</p>
                <p><b>Corrected batch water target:</b> {f(batch.correctedBatchWaterKg)} kg</p>
                <div className="table-wrap">
                  <table>
                    <caption className="sr-only">Aggregate moisture correction details</caption>
                    <thead><tr><th>Aggregate</th><th>SSD target kg</th><th>OD kg</th><th>Moisture %</th><th>Absorption %</th><th>Free moisture %</th><th>Free water kg</th><th>Wet target kg</th></tr></thead>
                    <tbody>
                      {batch.aggregates.map(item => item.comparable && item.correction
                        ? <tr key={item.id}><td>{item.materialName}</td><td>{f(item.correction.targetSsdMassKg)}</td><td>{f(item.correction.ovenDryEquivalentKg)}</td><td>{f(item.correction.totalMoisturePercent)}</td><td>{f(item.correction.absorptionPercent)}</td><td>{f(item.correction.freeMoisturePercentOdBasis)}</td><td>{f(item.correction.freeWaterKg)}</td><td>{f(item.correction.correctedWetAggregateMassKg)}</td></tr>
                        : <tr key={item.id}><td>{item.materialName}</td><td colSpan={7}>Not comparable — {item.reason ?? 'ورودی ناقص'}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>)}
        <p className="muted">References: {data.method.references.join(' · ')}</p>
      </>}
    </div>
  </section>;
}
