import { useState, Fragment } from 'react';
import { ST } from '../utils/styles';
import { NumInput } from './Inputs';
import { fmt, fmtKg, fmtPct } from '../utils/formatting';
import { getPctColor, RawTakenNote, Overlay } from './Helpers';

export function PeelerTable({ workers, computed, rates, onEdit }) {
  return (
    <div style={ST.tableWrap}>
      <table style={ST.table}>
        <thead>
          <tr>
            <th style={{ ...ST.th, textAlign: "left" }}>Worker</th>
            <th style={ST.th}>Taken (viss)</th>
            <th style={ST.th}>Alone+Awar</th>
            <th style={ST.th}>Grade 1</th>
            <th style={ST.th}>Rotten</th>
            <th style={ST.th}>Total</th>
            <th style={ST.th}>%</th>
            <th style={ST.th}>Rate</th>
            <th style={ST.th}>Carry In</th>
            <th style={{ ...ST.th, color: "#1B6FA8" }}>Payroll</th>
            <th style={ST.th}>Paid</th>
            <th style={ST.th}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w, i) => {
            const r = computed[w.id] || {};
            const bal = r.changeForNextDay || 0;
            return (
              <tr key={w.id} style={i % 2 ? ST.rowOdd : ST.rowEven}>
                <td style={{ ...ST.td, textAlign: "left" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontWeight: 600 }}>{w.name}{w.grade && <span style={ST.gradeTag}>×{w.grade}</span>}</div>
                    <RawTakenNote value={r.rawMaterialTaken ?? ""} onCommit={v => onEdit(w.id, "rawMaterialTaken", v, w.name)} />
                  </div>
                </td>
                {["amountTaken", "alonePlusAwarLone", "grade1Gotten", "rotten"].map(f => (
                  <td key={f} style={ST.td}>
                    <NumInput value={r[f] ?? ""} onCommit={v => onEdit(w.id, f, v, w.name)} />
                  </td>
                ))}
                <td style={{ ...ST.td, ...ST.tdCalc }}>{fmtKg(r.totalAmountGotten)}</td>
                <td style={{ ...ST.td, ...ST.tdCalc, color: getPctColor(r.percentPct), fontWeight: 600 }}>{fmtPct(r.percentPct)}</td>
                <td style={ST.td}>
                  <select
                    value={r.priceRate || ""}
                    onChange={e => onEdit(w.id, "priceRate", e.target.value ? parseFloat(e.target.value) : "", w.name)}
                    style={{ ...ST.input, width: 80 }}
                  >
                    <option value="">Default</option>
                    {rates.map(rv => <option key={rv} value={rv}>{rv.toLocaleString()}</option>)}
                  </select>
                </td>
                <td style={{ ...ST.td, ...ST.tdCalc, color: r.carryOver >= 0 ? "#1B8A5A" : "#C0392B" }}>{fmt(r.carryOver)}</td>
                <td style={{ ...ST.td, fontWeight: 700, color: "#1B6FA8" }}>{fmt(r.payrollAmount)}</td>
                <td style={ST.td}>
                  <NumInput value={r.amountPaid ?? ""} onCommit={v => onEdit(w.id, "amountPaid", v, w.name)} w={72} />
                </td>
                <td style={{ ...ST.td, fontWeight: 700, color: bal >= 0 ? "#1B8A5A" : "#C0392B" }}>{fmt(bal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TempWorkerRow({ dayPeelers, rates, settings, onEdit }) {
  const tempEntries = Object.entries(dayPeelers).filter(([k]) => k.startsWith("temp_"));
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  function addTemp() {
    if (!name.trim()) return;
    const id = "temp_" + name.trim().replace(/\s+/g, "_") + "_" + Date.now();
    onEdit(id, "_tempName", name.trim());
    setName("");
    setShowForm(false);
  }

  const defaultRate = settings?.defaultRate || 3000;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: tempEntries.length ? 8 : 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#6E7079", textTransform: "uppercase", letterSpacing: "0.06em" }}>Temporary Workers</span>
        <button
          onClick={() => setShowForm(s => !s)}
          style={{ background: "none", border: "1px dashed #0B6E4F", borderRadius: 6, padding: "3px 10px", fontSize: 12, cursor: "pointer", color: "#0B6E4F", fontWeight: 600 }}
        >+ Add Temp</button>
      </div>

      {showForm && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <input
            placeholder="Temp worker name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTemp()}
            style={{ ...ST.addInput, flex: 1, maxWidth: 220 }}
            autoFocus
          />
          <button style={ST.btnPrimary} onClick={addTemp}>Add</button>
          <button style={ST.btnGhost} onClick={() => setShowForm(false)}>Cancel</button>
        </div>
      )}

      {tempEntries.length > 0 && (
        <div style={{ ...ST.tableWrap, marginTop: 4 }}>
          <table style={ST.table}>
            <thead>
              <tr>
                <th style={{ ...ST.th, textAlign: "left" }}>Temp Worker</th>
                <th style={ST.th}>Taken (viss)</th>
                <th style={ST.th}>Alone+Awar</th>
                <th style={ST.th}>Grade 1</th>
                <th style={ST.th}>Rotten</th>
                <th style={ST.th}>Rate</th>
                <th style={{ ...ST.th, color: "#1B6FA8" }}>Payroll</th>
                <th style={ST.th}>Paid</th>
              </tr>
            </thead>
            <tbody>
              {tempEntries.map(([id, raw], i) => {
                const taken = parseFloat(raw.amountTaken) || 0;
                const rotten = parseFloat(raw.rotten) || 0;
                const rate = raw.priceRate ? parseFloat(raw.priceRate) : defaultRate;
                const total = taken - rotten;
                const payroll = Math.round(total * rate);
                return (
                  <tr key={id} style={i % 2 ? ST.rowOdd : ST.rowEven}>
                    <td style={{ ...ST.td, textAlign: "left", fontWeight: 600 }}>
                      {raw._tempName || id}
                      <span style={{ ...ST.gradeTag, color: "#B8860B", marginLeft: 6 }}>TEMP</span>
                    </td>
                    {["amountTaken", "alonePlusAwarLone", "grade1Gotten", "rotten"].map(f => (
                      <td key={f} style={ST.td}>
                        <NumInput value={raw[f] ?? ""} onCommit={v => onEdit(id, f, v)} />
                      </td>
                    ))}
                    <td style={ST.td}>
                      <select
                        value={raw.priceRate || ""}
                        onChange={e => onEdit(id, "priceRate", e.target.value ? parseFloat(e.target.value) : "")}
                        style={{ ...ST.input, width: 80 }}
                      >
                        <option value="">Default</option>
                        {rates.map(rv => <option key={rv} value={rv}>{rv.toLocaleString()}</option>)}
                      </select>
                    </td>
                    <td style={{ ...ST.td, fontWeight: 700, color: "#1B6FA8" }}>{fmt(payroll)}</td>
                    <td style={ST.td}>
                      <NumInput value={raw.amountPaid ?? ""} onCommit={v => onEdit(id, "amountPaid", v)} w={72} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function WageWorkerTable({ workers, computed, onEdit }) {
  return (
    <div style={ST.tableWrap}>
      <table style={ST.table}>
        <thead>
          <tr>
            <th style={{ ...ST.th, textAlign: "left" }}>Worker</th>
            <th style={ST.th}>Present</th>
            <th style={ST.th}>Daily Wage</th>
            <th style={ST.th}>Carry In</th>
            <th style={{ ...ST.th, color: "#1B6FA8" }}>Payroll</th>
            <th style={ST.th}>Paid</th>
            <th style={ST.th}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w, i) => {
            const r = computed[w.id] || {};
            const bal = r.changeForNextDay || 0;
            return (
              <tr key={w.id} style={i % 2 ? ST.rowOdd : ST.rowEven}>
                <td style={{ ...ST.td, textAlign: "left", fontWeight: 600 }}>{w.name}</td>
                <td style={ST.td}>
                  <input
                    type="checkbox"
                    checked={!!r.isPresent}
                    onChange={e => {
                      const checked = e.target.checked;
                      onEdit(w.id, "present", checked);
                      if (checked && !r.wage && w.dailyWage) onEdit(w.id, "wage", w.dailyWage);
                    }}
                  />
                </td>
                <td style={ST.td}>
                  <NumInput value={r.wage ?? w.dailyWage ?? ""} onCommit={v => onEdit(w.id, "wage", v)} w={80} />
                </td>
                <td style={{ ...ST.td, ...ST.tdCalc, color: r.carryOver >= 0 ? "#1B8A5A" : "#C0392B" }}>{fmt(r.carryOver)}</td>
                <td style={{ ...ST.td, fontWeight: 700, color: "#1B6FA8" }}>{fmt(r.payrollAmount)}</td>
                <td style={ST.td}>
                  <NumInput value={r.amountPaid ?? ""} onCommit={v => onEdit(w.id, "amountPaid", v)} w={72} />
                </td>
                <td style={{ ...ST.td, fontWeight: 700, color: bal >= 0 ? "#1B8A5A" : "#C0392B" }}>{fmt(bal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CardListPeeler({ workers, computed, onOpen }) {
  return (
    <div style={ST.cardList}>
      {workers.map(w => {
        const r = computed[w.id] || {};
        const bal = r.changeForNextDay || 0;
        const hasData = r.amountTaken !== "" && r.amountTaken !== undefined;
        return (
          <button key={w.id} style={ST.card} onClick={() => onOpen(w)}>
            <div style={ST.cardLeft}>
              <div style={ST.cardName}>{w.name}</div>
              <div style={ST.cardSub}>
                {hasData ? `${fmtKg(r.totalAmountGotten)} viss` : "no entry"}
                {hasData && r.amountPaid ? ` · Paid ${fmt(r.amountPaid)}` : ""}
              </div>
            </div>
            <div style={{ ...ST.cardBal, color: bal >= 0 ? "#1B8A5A" : "#C0392B" }}>{fmt(bal)}</div>
          </button>
        );
      })}
    </div>
  );
}

export function CardListWage({ workers, computed, onOpen }) {
  return (
    <div style={ST.cardList}>
      {workers.map(w => {
        const r = computed[w.id] || {};
        const bal = r.changeForNextDay || 0;
        return (
          <button key={w.id} style={ST.card} onClick={() => onOpen(w)}>
            <div style={ST.cardLeft}>
              <div style={ST.cardName}>{w.name}</div>
              <div style={ST.cardSub}>{r.isPresent ? "present" : "not marked"}</div>
            </div>
            <div style={{ ...ST.cardBal, color: bal >= 0 ? "#1B8A5A" : "#C0392B" }}>{fmt(bal)}</div>
          </button>
        );
      })}
    </div>
  );
}

export function MobileEditModal({ worker, section, day, rates, onClose, onEdit }) {
  const fieldsBySection = {
    peeler: [
      ["amountTaken", "Amount Taken (viss)"],
      ["alonePlusAwarLone", "Alone + Awar Lone (viss)"],
      ["grade1Gotten", "Grade 1 Gotten (viss)"],
      ["rotten", "Rotten (viss)"],
      ["priceRate", "Price Rate"],
      ["amountPaid", "Amount Paid"],
    ],
    general: [["wage", "Daily Wage"], ["amountPaid", "Amount Paid"]],
    divider: [["wage", "Daily Wage"], ["amountPaid", "Amount Paid"]],
  };
  const dataKey = section === "peeler" ? "peelersComputed" : (section === "general" ? "generalComputed" : "dividersComputed");
  const row = (day[dataKey] || {})[worker.id] || {};

  return (
    <Overlay>
      <div style={ST.mobileModal}>
        <div style={ST.mobileModalHead}>
          <div>
            <div style={ST.mobileModalName}>{worker.name}</div>
            {section === "peeler" && (
              <div style={ST.mobileModalMeta}>
                Carry in: {fmt(row.carryOver)} · Payroll: {fmt(row.payrollAmount)} MMK
                <div style={{ marginTop: 6 }}>
                  <RawTakenNote value={row.rawMaterialTaken ?? ""} onCommit={v => onEdit("rawMaterialTaken", v)} />
                </div>
              </div>
            )}
          </div>
          <button style={ST.closeBtn} onClick={onClose}>Done</button>
        </div>

        {(section === "general" || section === "divider") && (
          <label style={ST.checkboxRow}>
            <input
              type="checkbox"
              checked={!!row.isPresent}
              onChange={e => {
                onEdit("present", e.target.checked);
                if (e.target.checked && !row.wage && worker.dailyWage) onEdit("wage", worker.dailyWage);
              }}
            />
            Present today
          </label>
        )}

        {fieldsBySection[section].map(([field, label]) => (
          <div key={field} style={ST.mobileField}>
            <label style={ST.mobileLabel}>{label}</label>
            {field === "priceRate" ? (
              <select
                value={row[field] || ""}
                onChange={e => onEdit(field, e.target.value ? parseFloat(e.target.value) : "")}
                style={{ ...ST.input, width: "100%", padding: "7px 10px" }}
              >
                <option value="">Default</option>
                {rates.map(rv => <option key={rv} value={rv}>{rv.toLocaleString()}</option>)}
              </select>
            ) : (
              <NumInput value={row[field] ?? ""} onCommit={v => onEdit(field, v)} w={"100%"} />
            )}
          </div>
        ))}

        {section === "peeler" && (
          <div style={ST.mobileResult}>
            <div>Total Gotten: <strong>{fmtKg(row.totalAmountGotten)} viss</strong></div>
            <div>Balance: <strong style={{ color: (row.changeForNextDay || 0) >= 0 ? "#1B8A5A" : "#C0392B" }}>{fmt(row.changeForNextDay)}</strong></div>
          </div>
        )}
      </div>
    </Overlay>
  );
}

export function WorkersTab({ workers, onAdd, onToggle, onEditField }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("peeler");
  const [grade, setGrade] = useState("");
  const [wage, setWage] = useState("");

  const groups = [["peeler", "Peelers"], ["general", "General Workers"], ["divider", "Dividers"]];

  function submit() {
    if (!name.trim()) return;
    onAdd(name.trim(), type, grade ? parseFloat(grade) : null, wage ? parseFloat(wage) : null);
    setName(""); setGrade(""); setWage("");
  }

  return (
    <div>
      <div style={ST.card2}>
        <h3 style={ST.cardTitle}>Add Worker</h3>
        <div style={ST.addRow}>
          <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} style={ST.addInput} />
          <select value={type} onChange={e => setType(e.target.value)} style={ST.addSelect}>
            <option value="peeler">Peeler</option>
            <option value="general">General Worker</option>
            <option value="divider">Divider</option>
          </select>
          {type === "peeler" && (
            <input placeholder="Grade factor" type="number" step="0.001" value={grade} onChange={e => setGrade(e.target.value)} style={{ ...ST.addInput, maxWidth: 140 }} />
          )}
          {(type === "general" || type === "divider") && (
            <input placeholder="Daily wage" type="number" value={wage} onChange={e => setWage(e.target.value)} style={{ ...ST.addInput, maxWidth: 140 }} />
          )}
          <button style={ST.btnPrimary} onClick={submit}>Add</button>
        </div>
      </div>

      {groups.map(([key, label]) => {
        const list = workers.filter(w => w.type === key);
        if (!list.length) return null;
        return (
          <div key={key} style={{ marginBottom: 28 }}>
            <h3 style={ST.cardTitle}>{label}</h3>
            <div style={ST.workerGrid}>
              {list.map(w => (
                <div key={w.id} style={{ ...ST.workerCard, opacity: w.active === false ? 0.5 : 1 }}>
                  <div style={{ marginBottom: 12 }}>
                    <input
                      style={{ ...ST.wcInput, fontWeight: 600, fontSize: 14, width: "100%", padding: "4px 8px" }}
                      value={w.name}
                      onChange={e => onEditField(w.id, "name", e.target.value)}
                      placeholder="Worker Name"
                    />
                  </div>
                  {key === "peeler" && (
                    <div style={ST.wcRow}>
                      <span style={ST.wcLabel}>Grade</span>
                      <input
                        style={ST.wcInput}
                        type="number" step="0.001"
                        value={w.grade ?? ""}
                        onChange={e => onEditField(w.id, "grade", parseFloat(e.target.value) || null)}
                      />
                    </div>
                  )}
                  {(key === "general" || key === "divider") && (
                    <div style={ST.wcRow}>
                      <span style={ST.wcLabel}>Daily wage</span>
                      <input
                        style={ST.wcInput}
                        type="number"
                        value={w.dailyWage ?? ""}
                        onChange={e => onEditField(w.id, "dailyWage", parseFloat(e.target.value) || null)}
                      />
                    </div>
                  )}
                  <button style={ST.wcToggle} onClick={() => onToggle(w.id)}>
                    {w.active === false ? "Reactivate" : "Archive"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}