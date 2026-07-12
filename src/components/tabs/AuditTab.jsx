import { ST } from '../../utils/styles';

export function AuditTab({ log }) {
  if (!log.length) return <div style={ST.note}>No changes recorded yet.</div>;
  return (
    <div style={ST.auditList}>
      {log.map(e => (
        <div key={e.id} style={ST.auditRow}>
          <div style={ST.auditMeta}>
            <span>{new Date(e.ts).toLocaleString()}</span>
            <span style={ST.auditDate}>{e.date}</span>
          </div>
          <div>
            <strong>{e.workerName || "—"}</strong> · {e.section} · {e.field}
          </div>
          <div style={ST.auditDiff}>
            <span style={ST.auditOld}>{String(e.oldValue)}</span> → <span style={ST.auditNew}>{String(e.newValue)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}