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

export function FormulaInput({ value, onCommit, w = "100%" }) {
  const [local, setLocal] = useState(value ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => setLocal(value ?? ""), [value]);

  let computed = local;
  if (typeof local === 'string' && /^[\d\.\+\-\s]+$/.test(local)) {
    try {
      const res = new Function('return ' + local)();
      if (!isNaN(res)) computed = Number(res.toFixed(4));
    } catch (e) {}
  }

  if (isEditing) {
    return (
      <input
        type="text"
        inputMode="decimal"
        value={local}
        style={{ ...ST.input, width: w }}
        autoFocus
        onChange={e => setLocal(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          if (String(local) !== String(value ?? "")) onCommit(local);
        }}
      />
    );
  }

  const hasMath = typeof local === 'string' && /[+\-]/.test(local);

  return (
    <div 
      style={{ 
        ...ST.input, width: w, cursor: "pointer", position: "relative", 
        minHeight: 28, display: "flex", alignItems: "center", justifyContent: "flex-end" 
      }}
      onClick={() => setIsEditing(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span style={{ fontWeight: hasMath ? 600 : "normal", color: hasMath ? "#1B8A5A" : "inherit" }}>
        {computed !== "" ? computed : ""}
      </span>
      {isHovered && hasMath && (
        <div style={{ 
          position: "absolute", top: -24, right: 0, background: "#17181C", color: "#fff", 
          padding: "2px 8px", borderRadius: 4, fontSize: 11, whiteSpace: "nowrap", 
          zIndex: 100, pointerEvents: "none" 
        }}>
          {local}
        </div>
      )}
    </div>
  );
}