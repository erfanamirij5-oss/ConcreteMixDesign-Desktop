type RevisionSnapshot = {
  revisionNumber: number;
  createdAt?: string;
  changeReason?: string;
  data?: Record<string, unknown>;
};

type Props = {
  current: Record<string, unknown>;
  snapshots: RevisionSnapshot[];
};

const fields = [
  ['projectName', 'نام پروژه'],
  ['city', 'شهر'],
  ['concreteType', 'نوع بتن'],
  ['targetStrengthMpa', 'مقاومت هدف'],
  ['requiredSlumpMm', 'اسلامپ'],
  ['maxAggregateSizeMm', 'NMSA'],
  ['exposureSummary', 'شرایط دوام']
];

function valueOf(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return value === undefined || value === null || value === '' ? '-' : String(value);
}

export function RevisionComparePanel({ current, snapshots }: Props) {
  const latest = snapshots[0];
  if (!latest) {
    return <section className="panel"><div className="panel-body empty-revision">برای مقایسه، حداقل یک Snapshot Revision لازم است.</div></section>;
  }

  const previous = latest.data ?? {};

  return <section className="panel revision-compare-panel">
    <div className="panel-head">
      <div><h3>مقایسه Revision</h3><span>نسخه جاری در برابر آخرین Snapshot</span></div>
      <span className="revision-badge">R{latest.revisionNumber}</span>
    </div>
    <div className="panel-body table-wrap">
      <table className="mix-table">
        <thead><tr><th>پارامتر</th><th>نسخه قبلی</th><th>نسخه جاری</th><th>وضعیت</th></tr></thead>
        <tbody>{fields.map(([key, label]) => {
          const before = valueOf(previous, key);
          const after = valueOf(current, key);
          const changed = before !== after;
          return <tr key={key}><td>{label}</td><td>{before}</td><td>{after}</td><td><span className={changed ? 'status-chip status-review' : 'status-chip status-approved'}>{changed ? 'تغییر کرده' : 'بدون تغییر'}</span></td></tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}
