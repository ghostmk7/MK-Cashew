import { useState } from 'react';
import { ST } from '../utils/styles';
import { NumInput } from './Inputs';
import { fmtKg } from '../utils/formatting';

export function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      button:focus { outline: none; }
      input:focus, select:focus, button:focus-visible { outline: 2px solid #0B6E4F; outline-offset: 1px; }
      input[type=number]::-webkit-inner-spin-button,
      input[type=number]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      input[type=number] {
        -moz-appearance: textfield;
      }
      body { margin: 0; }
    `}</style>
  );
}

export function Overlay({ children }) {
  return <div style={ST.overlay}>{children}</div>;
}

export function Stat({ label, value, color }) {
  return (
    <div style={ST.statBox}>
      <div style={{ ...ST.statValue, color }}>{value}</div>
      <div style={ST.statLabel}>{label}</div>
    </div>
  );
}

export function getPctColor(pct) {
  if (pct === null || pct === undefined) return "inherit";
  if (pct >= 0.75) return "#1B8A5A";
  if (pct >= 0.74) return "#B8860B";
  return "#C0392B";
}

export function RawTakenNote({ value, onCommit }) {
  const [open, setOpen] = useState(false);
  const hasValue = value !== "" && value !== null && value !== undefined;
  return (
    <div style={{ marginTop: 3 }}>
      {!open && !hasValue && (
        <button
          onClick={() => setOpen(true)}
          style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: "#9A9A93", cursor: "pointer", textDecoration: "underline dotted" }}
        >+ raw taken</button>
      )}
      {(open || hasValue) && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: "#9A9A93", whiteSpace: "nowrap" }}>raw:</span>
          <NumInput
            value={value}
            onCommit={v => { onCommit(v); if (!v) setOpen(false); }}
            w={52}
            style={{ fontSize: 11 }}
          />
          <span style={{ fontSize: 10, color: "#9A9A93" }}>v</span>
        </div>
      )}
    </div>
  );
}