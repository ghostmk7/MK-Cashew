import { useState, Fragment } from 'react';
import { ST } from '../../utils/styles';
import { fmt } from '../../utils/formatting';
import { NumInput } from '../Inputs';

export function CashBookTab({ days, settings, onEditDayLevel }) {
  let runningBalance = settings?.cashBookOpening || 0;
  
  return (
    <div style={ST.card2}>
      <h3 style={ST.cardTitle}>Cash Book (Monthly Ledger)</h3>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
        <span>Opening Balance</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(runningBalance)} MMK</span>
      </div>
      <div style={ST.tableWrap}>
        <table style={ST.table}>
          <thead>
            <tr>
              <th style={{ ...ST.th, textAlign: "left" }}>Date</th>
              <th style={{ ...ST.th, textAlign: "left" }}>Description</th>
              <th style={ST.th}>Cash In</th>
              <th style={ST.th}>Cash Out</th>
              <th style={ST.th}>Balance</th>
              <th style={ST.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, dayIdx) => {
              const peelPaid = Object.values(d.peelersComputed || {}).reduce((s, r) => s + (parseFloat(r.amountPaid) || 0), 0);
              const genPaid = Object.values(d.generalComputed || {}).reduce((s, r) => s + (parseFloat(r.amountPaid) || 0), 0);
              const divPaid = Object.values(d.dividersComputed || {}).reduce((s, r) => s + (parseFloat(r.amountPaid) || 0), 0);
              const autoPaid = peelPaid + genPaid + divPaid;

              const customEntries = d.cashBook || [];
              
              const rows = [];
              if (autoPaid > 0) {
                runningBalance -= autoPaid;
                rows.push({ isAuto: true, desc: "Payroll Auto-Payout", outAmt: autoPaid, inAmt: null, bal: runningBalance });
              }
              
              customEntries.forEach(e => {
                const amt = parseFloat(e.amount) || 0;
                if (e.type === "in") runningBalance += amt;
                else runningBalance -= amt;
                rows.push({ isCustom: true, id: e.id, desc: e.desc, inAmt: e.type === "in" ? amt : null, outAmt: e.type === "out" ? amt : null, bal: runningBalance });
              });

              if (rows.length === 0) {
                rows.push({ isEmpty: true, desc: "No transactions", inAmt: null, outAmt: null, bal: runningBalance });
              }

              return (
                <Fragment key={d.date}>
                  {rows.map((r, idx) => (
                    <tr key={idx} style={ST.rowEven}>
                      <td style={{ ...ST.td, textAlign: "left" }}>{idx === 0 ? d.date : ""}</td>
                      <td style={{ ...ST.td, textAlign: "left", color: r.isAuto || r.isEmpty ? "#9A9A93" : "#17181C", fontStyle: r.isEmpty ? "italic" : "normal" }}>{r.desc}</td>
                      <td style={{ ...ST.td, color: "#1B8A5A" }}>{r.inAmt ? fmt(r.inAmt) : "—"}</td>
                      <td style={{ ...ST.td, color: "#C0392B" }}>{r.outAmt ? fmt(r.outAmt) : "—"}</td>
                      <td style={{ ...ST.td, fontWeight: 600 }}>{fmt(r.bal)}</td>
                      <td style={ST.td}>
                        {r.isCustom && (
                          <button style={ST.wcToggle} onClick={() => {
                            if (window.confirm("Delete entry?")) {
                              const nextBook = customEntries.filter(x => x.id !== r.id);
                              onEditDayLevel(dayIdx, null, nextBook);
                            }
                          }}>Del</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr style={ST.rowOdd}>
                    <td style={{ ...ST.td, textAlign: "left", borderBottom: "2px solid #E4E4E0" }}></td>
                    <td colSpan={5} style={{ ...ST.td, textAlign: "left", borderBottom: "2px solid #E4E4E0" }}>
                      <AddCashBookEntry dayIdx={dayIdx} currentEntries={customEntries} onEditDayLevel={onEditDayLevel} />
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AddCashBookEntry({ dayIdx, currentEntries, onEditDayLevel }) {
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("out");
  const [amount, setAmount] = useState("");
  const [adding, setAdding] = useState(false);
  
  function add() {
    if (!desc || !amount) return;
    const nextBook = [...currentEntries, { id: Date.now(), desc, type, amount: parseFloat(amount) }];
    onEditDayLevel(dayIdx, null, nextBook);
    setDesc("");
    setAmount("");
    setAdding(false);
  }

  if (!adding) {
    return <button style={ST.addLinkBtn} onClick={() => setAdding(true)}>+ Add entry</button>;
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <input style={{ ...ST.input, textAlign: "left", flex: "1 1 120px" }} placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
      <select style={ST.input} value={type} onChange={e => setType(e.target.value)}>
        <option value="in">Cash In</option>
        <option value="out">Cash Out</option>
      </select>
      <input style={ST.input} type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
      <button style={{ ...ST.btnPrimary, padding: "5px 10px" }} onClick={add}>Save</button>
      <button style={{ ...ST.btnGhost, padding: "5px 10px" }} onClick={() => setAdding(false)}>Cancel</button>
    </div>
  );
}