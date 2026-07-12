import { useState, useEffect } from 'react';
import { ST } from '../utils/styles';

export function NumInput({ value, onCommit, w = 68 }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => setLocal(value ?? ""), [value]);

  function handleBlur() {
    let finalVal = local;
    if (typeof local === 'string' && /^[\d\.\+\-\s]+$/.test(local)) {
      try {
        const computed = new Function('return ' + local)();
        if (!isNaN(computed)) {
          finalVal = String(Number(computed.toFixed(4)));
        }
      } catch (e) {}
    }
    setLocal(finalVal);
    if (String(finalVal) !== String(value ?? "")) {
      onCommit(finalVal);
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      style={{ ...ST.input, width: w }}
      onChange={e => setLocal(e.target.value)}
      onBlur={handleBlur}
    />
  );
}

export function FormulaInput({ value, onCommit, w = 180 }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => setLocal(value ?? ""), [value]);

  let computed = "";
  if (typeof local === 'string' && /^[\d\.\+\-\s]+$/.test(local)) {
    try {
      const res = new Function('return ' + local)();
      if (!isNaN(res)) computed = Number(res.toFixed(4));
    } catch (e) {}
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input
        type="text"
        inputMode="decimal"
        value={local}
        style={{ ...ST.input, width: w }}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => {
          if (String(local) !== String(value ?? "")) onCommit(local);
        }}
      />
      {computed !== "" && /[+\-]/.test(local) && (
        <span style={{ fontWeight: 600, color: "#1B8A5A", fontSize: 14 }}>= {computed}</span>
      )}
    </div>
  );
}