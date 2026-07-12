import { useState, useEffect, useMemo, useRef, Fragment } from "react";

// ══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════
const STORAGE_KEY = "cashew_payroll_v4"; // Bumped version to flush old structures safely if needed, or keep v3 if migration is handled.
// Using cashew_payroll_v4 to avoid migrating complex old divider structures since we changed their logic entirely.

const SEED_WORKERS = [
  { id: 1, name: "Khin Thet Cho",   type: "peeler",  grade: null,  dailyWage: null, active: true },
  { id: 2, name: "Nu Nu Win",       type: "peeler",  grade: 1.07,  dailyWage: null, active: true },
  { id: 3, name: "Mi Tayy",         type: "peeler",  grade: 0.96,  dailyWage: null, active: true },
  { id: 4, name: "Kaung Khant",     type: "peeler",  grade: 0.865, dailyWage: null, active: true },
  { id: 5, name: "Than Cho",        type: "peeler",  grade: 0.885, dailyWage: null, active: true },
  { id: 6, name: "Thel Thel",       type: "peeler",  grade: null,  dailyWage: null, active: true },
  { id: 7, name: "War War Tun",     type: "peeler",  grade: 0.85,  dailyWage: null, active: true },
  { id: 8, name: "Ma Ni Sander",    type: "peeler",  grade: 0.93,  dailyWage: null, active: true },
  { id: 9, name: "Khin May Sann",   type: "peeler",  grade: 0.96,  dailyWage: null, active: true },
  { id: 10, name: "Naing Naing Win", type: "peeler", grade: 0.815, dailyWage: null, active: true },
  { id: 11, name: "Khin Win",        type: "peeler",  grade: null, dailyWage: null, active: true },
  { id: 12, name: "Zarwin",          type: "divider", grade: null, dailyWage: 16667, active: true },
  { id: 13, name: "Lapyae",          type: "divider", grade: null, dailyWage: 16667, active: true },
  { id: 14, name: "Myatnoe",         type: "divider", grade: null, dailyWage: 16666, active: true },
  { id: 15, name: "Nini Win",        type: "divider", grade: null, dailyWage: 10000, active: true },
  { id: 16, name: "Photayote",       type: "general", grade: null, dailyWage: 15000, active: true },
];

function today() { return new Date().toISOString().slice(0, 10); }
function emptyDay() { 
  return { 
    date: today(), 
    peelers: {}, 
    general: {}, 
    dividers: {},
    dividerProduction: { fulls: "", halfs: "" },
    storeTransfer: { aLoneGyi: "", aChan: "", hteikKwe: "", khaKyo: "", chan2: "", chan3: "", aThayLone: "" },
    cashBook: [] 
  }; 
}

// ══════════════════════════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════════════════════════
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { 
    workers: SEED_WORKERS, 
    rawDays: [emptyDay()], 
    auditLog: [], 
    settings: { 
      defaultRate: 3000, 
      rates: [2400, 2700, 3000], 
      openingBalances: {},
      cashBookOpening: 0,
      storePrices: { aLoneGyi: 67000, aChan: 52000, hteikKwe: 372000, khaKyo: 312000, chan2: 35000, chan3: 20000, aThayLone: 50000 }
    } 
  };
}
function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// ══════════════════════════════════════════════════════════════════════════
// CALC HELPERS
// ══════════════════════════════════════════════════════════════════════════
function calcPeelerRow(raw, carryOver, settings) {
  const taken = parseFloat(raw?.amountTaken);
  const hasInput = !isNaN(taken) && raw?.amountTaken !== "";
  const rate = raw?.priceRate !== undefined && raw?.priceRate !== "" ? parseFloat(raw.priceRate) : (settings?.defaultRate || 3000);

  if (!hasInput) {
    const payroll = Math.round(carryOver || 0);
    return { totalAmountGotten: 0, percentPct: null, payrollAmount: payroll, rate };
  }
  const alone = parseFloat(raw?.alonePlusAwarLone) || 0;
  const rotten = parseFloat(raw?.rotten) || 0;
  const total = taken - rotten; // C - F
  const pct = total > 0 ? alone / total : null; // D / G
  const payroll = Math.round(total * rate + (carryOver || 0));
  return { totalAmountGotten: parseFloat(total.toFixed(4)), percentPct: pct, payrollAmount: payroll, rate };
}

// Derive full computed day chain (carry-over cascades automatically)
function computeAll(rawDays, workers, settings) {
  const openingBalances = settings?.openingBalances || {};
  const workerBalances = {};
  workers.forEach(w => (workerBalances[w.id] = parseFloat(openingBalances[w.id]) || 0));

  return rawDays.map(day => {
    const peelersComputed = {};
    const generalComputed = {};
    const dividersComputed = {};

    workers.forEach(w => {
      const id = w.id;
      const carryOver = workerBalances[id] || 0;

      if (w.type === "peeler") {
        const raw = day.peelers[id] || {};
        const calc = calcPeelerRow(raw, carryOver, settings);
        const paid = parseFloat(raw.amountPaid);
        const changeForNextDay = !isNaN(paid) ? calc.payrollAmount - paid : calc.payrollAmount;
        peelersComputed[id] = { ...raw, carryOver, ...calc, changeForNextDay };
        workerBalances[id] = changeForNextDay;
      } else if (w.type === "general") {
        const raw = day.general[id] || {};
        const isPresent = !!raw.present;
        const wage = isPresent ? (parseFloat(raw.wage) || parseFloat(w.dailyWage) || 0) : 0;
        const payrollAmount = carryOver + wage;
        const paid = parseFloat(raw.amountPaid);
        const changeForNextDay = !isNaN(paid) ? payrollAmount - paid : payrollAmount;
        generalComputed[id] = { ...raw, carryOver, wage, isPresent, payrollAmount, changeForNextDay };
        workerBalances[id] = changeForNextDay;
      } else if (w.type === "divider") {
        const raw = day.dividers[id] || {};
        const isPresent = !!raw.present;
        const wage = isPresent ? (parseFloat(raw.wage) || parseFloat(w.dailyWage) || 0) : 0;
        const payrollAmount = carryOver + wage;
        const paid = parseFloat(raw.amountPaid);
        const changeForNextDay = !isNaN(paid) ? payrollAmount - paid : payrollAmount;
        dividersComputed[id] = { ...raw, carryOver, wage, isPresent, payrollAmount, changeForNextDay };
        workerBalances[id] = changeForNextDay;
      }
    });

    return { ...day, peelersComputed, generalComputed, dividersComputed };
  });
}

function weekKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function fmt(n) {
  if (n === null || n === undefined || n === "" || isNaN(n)) return "—";
  return Math.round(Number(n)).toLocaleString();
}
function fmtKg(v) {
  if (v === "" || v === null || v === undefined) return "—";
  const n = parseFloat(v);
  return isNaN(n) ? "—" : n.toFixed(2);
}
function fmtPct(p) { return p === null || p === undefined ? "—" : (p * 100).toFixed(1) + "%"; }

function useIsMobile() {
  const [mobile, setMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 820 : false);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 820);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [store, setStore] = useState(loadState);
  const [activeDayIdx, setActiveDayIdx] = useState(store.rawDays.length - 1);
  const [tab, setTab] = useState("entry");
  const [section, setSection] = useState("peeler");
  const [unlocked, setUnlocked] = useState(() => new Set([store.rawDays[store.rawDays.length - 1]?.date]));
  const [pendingEdit, setPendingEdit] = useState(null);
  const [mobileEditWorker, setMobileEditWorker] = useState(null);
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState(() => store.rawDays[store.rawDays.length - 1]?.date.slice(0, 7) || today().slice(0, 7));

  useEffect(() => { saveState(store); }, [store]);

  const { workers, rawDays, auditLog, settings } = store;
  const activeRates = settings?.rates?.length ? settings.rates : [2400, 2700, 3000];
  const days = useMemo(() => computeAll(rawDays, workers, settings), [rawDays, workers, settings]);
  const months = useMemo(() => [...new Set(rawDays.map(d => d.date.slice(0, 7)))].sort(), [rawDays]);
  const day = days[activeDayIdx];
  const isPastDay = activeDayIdx !== rawDays.length - 1;
  const dayIsUnlocked = unlocked.has(day?.date);

  const activeWorkers = workers.filter(w => w.type === section && w.active !== false);

  // ── EDIT PIPELINE (with past-day guard) ──────────────────────────────────
  function requestEdit(dayIdx, sectionKey, workerId, field, value, workerName) {
    const guard = dayIdx !== rawDays.length - 1 && !unlocked.has(rawDays[dayIdx].date);
    if (guard) {
      setPendingEdit({ dayIdx, sectionKey, workerId, field, value, workerName });
      return;
    }
    applyEdit(dayIdx, sectionKey, workerId, field, value, workerName);
  }

  function applyEdit(dayIdx, sectionKey, workerId, field, value, workerName) {
    setStore(s => {
      let nextAuditLog = s.auditLog;
      const rawDays = s.rawDays.map((d, i) => {
        if (i !== dayIdx) return d;
        const bucket = { ...d[sectionKey] };
        const oldRow = bucket[workerId] || {};
        const oldVal = oldRow[field];
        bucket[workerId] = { ...oldRow, [field]: value };

        if (String(oldVal ?? "") !== String(value ?? "")) {
          nextAuditLog = [
            {
              id: Date.now() + Math.random(),
              ts: new Date().toISOString(),
              date: d.date,
              section: sectionKey,
              workerName,
              field,
              oldValue: oldVal ?? "—",
              newValue: value === "" ? "—" : value,
            },
            ...nextAuditLog,
          ].slice(0, 500);
        }
        return { ...d, [sectionKey]: bucket };
      });
      return { ...s, rawDays, auditLog: nextAuditLog };
    });
  }

  function confirmPending() {
    if (!pendingEdit) return;
    setUnlocked(prev => new Set(prev).add(rawDays[pendingEdit.dayIdx].date));
    if (pendingEdit.isDayLevel) {
      applyEditDayLevel(pendingEdit.dayIdx, pendingEdit.sectionKey, pendingEdit.field, pendingEdit.value, pendingEdit.workerName);
    } else {
      applyEdit(pendingEdit.dayIdx, pendingEdit.sectionKey, pendingEdit.workerId, pendingEdit.field, pendingEdit.value, pendingEdit.workerName);
    }
    setPendingEdit(null);
  }

  function requestEditDayLevel(dayIdx, sectionKey, field, value, sectionName) {
    const guard = dayIdx !== rawDays.length - 1 && !unlocked.has(rawDays[dayIdx].date);
    if (guard) {
      setPendingEdit({ dayIdx, sectionKey, field, value, workerName: sectionName, isDayLevel: true });
      return;
    }
    applyEditDayLevel(dayIdx, sectionKey, field, value, sectionName);
  }

  function applyEditDayLevel(dayIdx, sectionKey, field, value, sectionName) {
    setStore(s => {
      let nextAuditLog = s.auditLog;
      const rawDays = s.rawDays.map((d, i) => {
        if (i !== dayIdx) return d;
        let newValueForSection;
        let oldVal;
        
        if (field === null) {
          oldVal = "Array Update";
          newValueForSection = value;
        } else {
          newValueForSection = { ...(d[sectionKey] || {}) };
          oldVal = newValueForSection[field];
          newValueForSection[field] = value;
        }

        if (String(oldVal ?? "") !== String(value ?? "")) {
          nextAuditLog = [
            {
              id: Date.now() + Math.random(),
              ts: new Date().toISOString(),
              date: d.date,
              section: sectionKey,
              workerName: sectionName,
              field: field || "All",
              oldValue: oldVal ?? "—",
              newValue: field === null ? "Updated" : (value === "" ? "—" : value),
            },
            ...nextAuditLog,
          ].slice(0, 500);
        }
        return { ...d, [sectionKey]: newValueForSection };
      });
      return { ...s, rawDays, auditLog: nextAuditLog };
    });
  }

  function addNewDay() {
    const todayStr = today();
    const existingIdx = rawDays.findIndex(d => d.date === todayStr);
    if (existingIdx !== -1) {
      setActiveDayIdx(existingIdx);
      setSelectedMonth(todayStr.slice(0, 7));
      return;
    }
    setStore(s => ({ ...s, rawDays: [...s.rawDays, emptyDay()] }));
    setActiveDayIdx(rawDays.length);
    setUnlocked(prev => new Set(prev).add(todayStr));
    setSelectedMonth(todayStr.slice(0, 7));
  }

  function addWorker(name, type, grade, dailyWage) {
    setStore(s => {
      const id = Math.max(0, ...s.workers.map(w => w.id)) + 1;
      return { ...s, workers: [...s.workers, { id, name, type, grade: grade || null, dailyWage: dailyWage || null, active: true }] };
    });
  }
  function toggleWorkerActive(id) {
    setStore(s => ({ ...s, workers: s.workers.map(w => (w.id === id ? { ...w, active: !w.active } : w)) }));
  }
  function editWorkerField(id, field, value) {
    setStore(s => ({ ...s, workers: s.workers.map(w => (w.id === id ? { ...w, [field]: value } : w)) }));
  }

  // ── DAY TOTALS ────────────────────────────────────────────────────────────
  const peelerTotalGrade1 = Object.values(day?.peelersComputed || {}).reduce((s, r) => s + (parseFloat(r.grade1Gotten) || 0), 0);
  const peelerTotalPayroll = Object.values(day?.peelersComputed || {}).reduce((s, r) => s + (r.payrollAmount || 0), 0);
  const peelerTotalPaid = Object.values(day?.peelersComputed || {}).reduce((s, r) => s + (parseFloat(r.amountPaid) || 0), 0);
  const generalTotalWage = Object.values(day?.generalComputed || {}).reduce((s, r) => s + (r.isPresent ? (parseFloat(r.wage) || 0) : 0), 0);
  const generalTotalPaid = Object.values(day?.generalComputed || {}).reduce((s, r) => s + (parseFloat(r.amountPaid) || 0), 0);
  const dividerTotalWage = Object.values(day?.dividersComputed || {}).reduce((s, r) => s + (r.isPresent ? (parseFloat(r.wage) || 0) : 0), 0);
  const dividerTotalPaid = Object.values(day?.dividersComputed || {}).reduce((s, r) => s + (parseFloat(r.amountPaid) || 0), 0);

  return (
    <div style={ST.app}>
      <GlobalStyle />

      <header style={ST.header}>
        <div style={ST.headerInner}>
          <div style={ST.headerRow}>
            <div>
              <div style={ST.brand}>MK Cashew</div>
              <div style={ST.brandSub}>Daily Payroll & Production</div>
            </div>
            <button style={ST.newDayBtn} onClick={addNewDay}>+ New Day</button>
          </div>

          <div style={ST.dayNav}>
            <select style={ST.monthSelect} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{new Date(m + "-15").toLocaleDateString("en", { year: "numeric", month: "short" })}</option>)}
            </select>
            <div style={ST.dayScroll}>
              {days.map((d, i) => {
                if (d.date.slice(0, 7) !== selectedMonth) return null;
                const dayNum = parseInt(d.date.slice(8), 10);
                const wd = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(d.date + "T00:00:00").getDay()];
                return (
                  <button
                    key={i}
                    style={{ ...ST.dayChip, ...(i === activeDayIdx ? ST.dayChipActive : {}) }}
                    onClick={() => setActiveDayIdx(i)}
                  >
                    {dayNum} {wd}
                  </button>
                );
              })}
            </div>
          </div>

          <nav style={ST.tabBar}>
            {[["entry", "Entry"], ["summary", "Summary"], ["workers", "Workers"], ["store", "Store"], ["cashbook", "Cash Book"], ["settings", "Settings"]].map(([k, label]) => (
              <button key={k} style={{ ...ST.tabBtn, ...(tab === k ? ST.tabBtnActive : {}) }} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={ST.main}>
        {isPastDay && !dayIsUnlocked && tab === "entry" && (
          <div style={ST.pastNotice}>Viewing past day — editing will ask to confirm recalculation.</div>
        )}

        {tab === "entry" && (
          <div>
            <div style={ST.segControl}>
              {[["peeler", "Peelers"], ["general", "General"], ["divider", "Dividers"]].map(([k, label]) => (
                <button key={k} style={{ ...ST.segBtn, ...(section === k ? ST.segBtnActive : {}) }} onClick={() => setSection(k)}>
                  {label}
                </button>
              ))}
            </div>

            {section === "peeler" && (
              <>
                <div style={ST.statsRow}>
                  <Stat label="Total Grade 1" value={peelerTotalGrade1.toFixed(2) + " viss"} color="#0B6E4F" />
                  <Stat label="Payroll" value={fmt(peelerTotalPayroll) + " MMK"} color="#1B6FA8" />
                  <Stat label="Cash Out" value={fmt(peelerTotalPaid) + " MMK"} color="#B8860B" />
                </div>
                {isMobile ? (
                  <CardListPeeler workers={activeWorkers} computed={day.peelersComputed} onOpen={setMobileEditWorker} />
                ) : (
                  <PeelerTable
                    workers={activeWorkers}
                    computed={day.peelersComputed}
                    rates={activeRates}
                    onEdit={(wid, field, val, wname) => requestEdit(activeDayIdx, "peelers", wid, field, val, wname)}
                  />
                )}
                <TempWorkerRow
                  dayPeelers={rawDays[activeDayIdx]?.peelers || {}}
                  rates={activeRates}
                  settings={settings}
                  onEdit={(tempId, field, val) => requestEdit(activeDayIdx, "peelers", tempId, field, val, tempId)}
                />
              </>
            )}

            {section === "general" && (
              <>
                <div style={ST.statsRow}>
                  <Stat label="Present Today" value={Object.values(day.generalComputed || {}).filter(r => r.isPresent).length + " / " + activeWorkers.length} color="#0B6E4F" />
                  <Stat label="Total Wages" value={fmt(generalTotalWage) + " MMK"} color="#1B6FA8" />
                  <Stat label="Total Paid" value={fmt(generalTotalPaid) + " MMK"} color="#B8860B" />
                </div>
                {isMobile ? (
                  <CardListWage workers={activeWorkers} computed={day.generalComputed} onOpen={setMobileEditWorker} />
                ) : (
                  <WageWorkerTable
                    workers={activeWorkers}
                    computed={day.generalComputed}
                    onEdit={(wid, field, val, wname) => requestEdit(activeDayIdx, "general", wid, field, val, wname)}
                  />
                )}
              </>
            )}

            {section === "divider" && (
              <>
                <div style={ST.statsRow}>
                  <Stat label="Present Today" value={Object.values(day.dividersComputed || {}).filter(r => r.isPresent).length + " / " + activeWorkers.length} color="#0B6E4F" />
                  <Stat label="Total Wages" value={fmt(dividerTotalWage) + " MMK"} color="#1B6FA8" />
                  <Stat label="Total Paid" value={fmt(dividerTotalPaid) + " MMK"} color="#B8860B" />
                </div>
                {isMobile ? (
                  <CardListWage workers={activeWorkers} computed={day.dividersComputed} onOpen={setMobileEditWorker} />
                ) : (
                  <WageWorkerTable
                    workers={activeWorkers}
                    computed={day.dividersComputed}
                    onEdit={(wid, field, val, wname) => requestEdit(activeDayIdx, "dividers", wid, field, val, wname)}
                  />
                )}
                
                <div style={{ ...ST.card2, marginTop: 24 }}>
                  <h3 style={ST.cardTitle}>Divider Production (Day Total)</h3>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div>
                      <div style={ST.mobileLabel}>Fulls (viss)</div>
                      <FormulaInput 
                        value={day.dividerProduction?.fulls ?? ""} 
                        onCommit={val => requestEditDayLevel(activeDayIdx, "dividerProduction", "fulls", val, "Divider Production")} 
                        w={180}
                      />
                    </div>
                    <div>
                      <div style={ST.mobileLabel}>Halfs (viss)</div>
                      <FormulaInput 
                        value={day.dividerProduction?.halfs ?? ""} 
                        onCommit={val => requestEditDayLevel(activeDayIdx, "dividerProduction", "halfs", val, "Divider Production")} 
                        w={180}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "summary" && (
          <SummaryTab
            days={days}
            workers={workers}
            activeDay={day}
            peelerTotals={{ grade1: peelerTotalGrade1, payroll: peelerTotalPayroll, paid: peelerTotalPaid }}
            generalTotals={{ wage: generalTotalWage, paid: generalTotalPaid }}
            dividerTotals={{ wage: dividerTotalWage, paid: dividerTotalPaid }}
          />
        )}

        {tab === "workers" && (
          <WorkersTab workers={workers} onAdd={addWorker} onToggle={toggleWorkerActive} onEditField={editWorkerField} />
        )}

        {tab === "cashbook" && (
          <CashBookTab 
            days={days} 
            settings={settings}
            onEditDayLevel={(dayIdx, field, val) => requestEditDayLevel(dayIdx, "cashBook", field, val, "Cash Book")}
          />
        )}

        {tab === "store" && (
          <StoreTab 
            days={days} 
            settings={settings}
            onEditDayLevel={(dayIdx, field, val) => requestEditDayLevel(dayIdx, "storeTransfer", field, val, "Store Transfer")}
          />
        )}

        {tab === "settings" && (
          <SettingsTab settings={settings} workers={workers} auditLog={auditLog} setStore={setStore} />
        )}
      </main>

      {pendingEdit && (
        <Overlay>
          <div style={ST.confirmModal}>
            <div style={ST.confirmTitle}>Edit past data?</div>
            <p style={ST.confirmBody}>
              You're editing <strong>{rawDays[pendingEdit.dayIdx].date}</strong>. This will recalculate carry-over
              balances for every day after it.
            </p>
            <div style={ST.confirmActions}>
              <button style={ST.btnGhost} onClick={() => setPendingEdit(null)}>Cancel</button>
              <button style={ST.btnPrimary} onClick={confirmPending}>Confirm & Recalculate</button>
            </div>
          </div>
        </Overlay>
      )}

      {mobileEditWorker && (
        <MobileEditModal
          worker={mobileEditWorker}
          section={section}
          day={day}
          rates={activeRates}
          onClose={() => setMobileEditWorker(null)}
          onEdit={(field, val) => requestEdit(activeDayIdx, section === "peeler" ? "peelers" : section, mobileEditWorker.id, field, val, mobileEditWorker.name)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ══════════════════════════════════════════════════════════════════════════
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      * { box-sizing: border-box; }
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

function Overlay({ children }) {
  return <div style={ST.overlay}>{children}</div>;
}

function Stat({ label, value, color }) {
  return (
    <div style={ST.statBox}>
      <div style={{ ...ST.statValue, color }}>{value}</div>
      <div style={ST.statLabel}>{label}</div>
    </div>
  );
}

function getPctColor(pct) {
  if (pct === null || pct === undefined) return "inherit";
  if (pct >= 0.75) return "#1B8A5A";
  if (pct >= 0.74) return "#B8860B";
  return "#C0392B";
}

function RawTakenNote({ value, onCommit }) {
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

function PeelerTable({ workers, computed, rates, onEdit }) {
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
                <td style={{ ...ST.td, textAlign: "left", fontWeight: 600, verticalAlign: "top" }}>
                  <div>{w.name}{w.grade && <span style={ST.gradeTag}>×{w.grade}</span>}</div>
                  <RawTakenNote value={r.rawMaterialTaken ?? ""} onCommit={v => onEdit(w.id, "rawMaterialTaken", v, w.name)} />
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

function TempWorkerRow({ dayPeelers, rates, settings, onEdit }) {
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

function WageWorkerTable({ workers, computed, onEdit }) {
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

function NumInput({ value, onCommit, w = 68 }) {
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

function FormulaInput({ value, onCommit, w = 180 }) {
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

function CardListPeeler({ workers, computed, onOpen }) {
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
function CardListWage({ workers, computed, onOpen }) {
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

function MobileEditModal({ worker, section, day, rates, onClose, onEdit }) {
  const fieldsBySection = {
    peeler: [
      ["amountTaken", "Amount Taken (viss)"],
      ["rawMaterialTaken", "Raw Taken (viss)"],
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

function SummaryTab({ days, workers, activeDay, peelerTotals, generalTotals, dividerTotals }) {
  return (
    <div style={ST.summaryGrid}>
      <div style={ST.card2}>
        <h3 style={ST.cardTitle}>{activeDay.date} — Peelers</h3>
        <div style={ST.summaryList}>
          {Object.entries(activeDay.peelersComputed || {}).map(([wid, r]) => {
            const w = workers.find(x => x.id === Number(wid));
            if (!w || (r.payrollAmount === 0 && !r.amountPaid)) return null;
            return (
              <div key={wid} style={ST.summaryRow}>
                <span>{w.name}</span>
                <span style={{ color: "#1B6FA8", fontWeight: 600 }}>{fmt(r.payrollAmount)} MMK</span>
                <span style={{ color: r.changeForNextDay >= 0 ? "#1B8A5A" : "#C0392B", fontWeight: 700 }}>
                  {fmt(r.changeForNextDay)}
                </span>
              </div>
            );
          })}
        </div>
        <div style={ST.summaryFooterRow}><span>Total Grade 1</span><strong>{peelerTotals.grade1.toFixed(2)} viss</strong></div>
        <div style={ST.summaryFooterRow}><span>Total Payroll</span><strong style={{ color: "#1B6FA8" }}>{fmt(peelerTotals.payroll)} MMK</strong></div>
        <div style={ST.summaryFooterRow}><span>Cash Out</span><strong style={{ color: "#B8860B" }}>{fmt(peelerTotals.paid)} MMK</strong></div>
      </div>

      <div style={ST.card2}>
        <h3 style={ST.cardTitle}>{activeDay.date} — General & Dividers</h3>
        <div style={ST.summaryFooterRow}><span>General wages generated</span><strong style={{ color: "#1B6FA8" }}>{fmt(generalTotals.wage)} MMK</strong></div>
        <div style={ST.summaryFooterRow}><span>General wages paid</span><strong style={{ color: "#B8860B" }}>{fmt(generalTotals.paid)} MMK</strong></div>
        <div style={ST.summaryFooterRow}><span>Divider wages generated</span><strong style={{ color: "#1B6FA8" }}>{fmt(dividerTotals.wage)} MMK</strong></div>
        <div style={ST.summaryFooterRow}><span>Divider wages paid</span><strong style={{ color: "#B8860B" }}>{fmt(dividerTotals.paid)} MMK</strong></div>
      </div>

      <div style={ST.card2}>
        <h3 style={ST.cardTitle}>Month Progress</h3>
        {days.map((d, i) => {
          const payroll = Object.values(d.peelersComputed || {}).reduce((s, r) => s + (r.payrollAmount || 0), 0);
          const paid = Object.values(d.peelersComputed || {}).reduce((s, r) => s + (parseFloat(r.amountPaid) || 0), 0);
          return (
            <div key={i} style={ST.monthRow}>
              <span>{d.date}</span>
              <span style={{ color: "#1B6FA8" }}>{fmt(payroll)} MMK</span>
              <span style={{ color: "#B8860B" }}>out {fmt(paid)} MMK</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsTab({ settings, workers, auditLog, setStore }) {
  const storedRates = settings?.rates?.length ? settings.rates : [2400, 2700, 3000];
  const [rates, setRates] = useState([...storedRates]);
  const [defaultRate, setDefaultRate] = useState(settings?.defaultRate || storedRates[storedRates.length - 1]);
  const [openingBalances, setOpeningBalances] = useState(settings?.openingBalances || {});
  const [cashBookOpening, setCashBookOpening] = useState(settings?.cashBookOpening || 0);
  const [storePrices, setStorePrices] = useState(settings?.storePrices || { aLoneGyi: 67000, aChan: 52000, hteikKwe: 37200, khaKyo: 31200, chan2: 35000, chan3: 20000, aThayLone: 50000 });
  const [saved, setSaved] = useState(false);

  function updateRate(i, val) {
    const next = [...rates];
    next[i] = val;
    setRates(next);
  }

  function addRate() {
    setRates(r => [...r, ""]);
  }

  function removeRate(i) {
    const next = rates.filter((_, idx) => idx !== i);
    setRates(next);
    if (defaultRate === rates[i]) setDefaultRate(next[0] || "");
  }

  function save() {
    const cleanRates = rates.map(r => parseFloat(r)).filter(r => !isNaN(r) && r > 0);
    const dr = parseFloat(defaultRate);
    const finalDefault = !isNaN(dr) ? dr : cleanRates[cleanRates.length - 1];
    const cleanBalances = {};
    Object.entries(openingBalances).forEach(([k, v]) => {
      const n = parseFloat(v);
      if (!isNaN(n)) cleanBalances[k] = n;
    });
    setStore(s => ({ 
      ...s, 
      settings: { 
        ...s.settings, 
        rates: cleanRates, 
        defaultRate: finalDefault, 
        openingBalances: cleanBalances,
        cashBookOpening: parseFloat(cashBookOpening) || 0,
        storePrices
      } 
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={ST.card2}>
      <h3 style={ST.cardTitle}>Settings</h3>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Price Rate Options (MMK/viss)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rates.map((rv, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="number"
                value={rv}
                onChange={e => updateRate(i, e.target.value)}
                style={{ ...ST.addInput, maxWidth: 150 }}
                placeholder="Rate"
              />
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="defaultRate"
                  checked={String(defaultRate) === String(rv)}
                  onChange={() => setDefaultRate(rv)}
                />
                Default
              </label>
              <button
                onClick={() => removeRate(i)}
                style={{ background: "none", border: "1px solid #E4E4E0", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#C0392B" }}
              >✕ Remove</button>
            </div>
          ))}
        </div>
        <button
          onClick={addRate}
          style={{ marginTop: 10, background: "none", border: "1px dashed #0B6E4F", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#0B6E4F", fontWeight: 600 }}
        >+ Add Rate</button>
      </div>

      <button style={{ ...ST.btnPrimary, opacity: saved ? 0.7 : 1 }} onClick={save}>
        {saved ? "✓ Saved!" : "Save Settings"}
      </button>
      <div style={{ ...ST.note, marginTop: 12 }}>Divider and General Worker daily wages are configured in the Workers tab.</div>

      <div style={{ marginTop: 28, borderTop: "1px solid #E4E4E0", paddingTop: 18, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Opening Carry-Over Balances</div>
        <div style={{ ...ST.note, marginTop: 0, marginBottom: 12 }}>Set a starting balance per worker (e.g., from end of previous month). Applied before Day 1 calculations.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {workers.filter(w => w.active !== false).map(w => (
            <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ minWidth: 150, fontSize: 13, fontWeight: 500 }}>{w.name}</span>
              <span style={{ fontSize: 11, color: "#9A9A93", minWidth: 56 }}>{w.type}</span>
              <input
                type="number"
                value={openingBalances[w.id] ?? ""}
                onChange={e => setOpeningBalances(ob => ({ ...ob, [w.id]: e.target.value }))}
                placeholder="0"
                style={{ ...ST.addInput, maxWidth: 130 }}
              />
              <span style={{ fontSize: 12, color: "#6E7079" }}>MMK</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 28, borderTop: "1px solid #E4E4E0", paddingTop: 18, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Cash Book & Store Settings</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ minWidth: 150, fontSize: 13, fontWeight: 500 }}>Cash Book Opening</span>
            <input
              type="number"
              value={cashBookOpening}
              onChange={e => setCashBookOpening(e.target.value)}
              placeholder="0"
              style={{ ...ST.addInput, maxWidth: 130 }}
            />
            <span style={{ fontSize: 12, color: "#6E7079" }}>MMK</span>
          </div>

          <div style={{ fontWeight: 600, fontSize: 13, marginTop: 8 }}>Store Transfer Prices (per viss/unit)</div>
          {Object.entries({ aLoneGyi: "အလုံး", aChan: "အခြမ်း", hteikKwe: "ပြာတွဲ", khaKyo: "စိမ်းတွဲ", chan2: "ခြမ်း 2", chan3: "ခြမ်း 3", aThayLone: "အဝါလုံး" }).map(([key, label]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ minWidth: 150, fontSize: 13, fontWeight: 500 }}>{label}</span>
              <input
                type="number"
                value={storePrices[key] ?? ""}
                onChange={e => setStorePrices(sp => ({ ...sp, [key]: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                style={{ ...ST.addInput, maxWidth: 130 }}
              />
              <span style={{ fontSize: 12, color: "#6E7079" }}>MMK</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, borderTop: "1px solid #E4E4E0", paddingTop: 18 }}>
        <h3 style={{ ...ST.cardTitle, marginBottom: 12 }}>Audit Log</h3>
        <AuditTab log={auditLog} />
      </div>
    </div>
  );
}

function WorkersTab({ workers, onAdd, onToggle, onEditField }) {
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
                  <div style={ST.wcName}>{w.name}</div>
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

function AuditTab({ log }) {
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

function CashBookTab({ days, settings, onEditDayLevel }) {
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

function AddCashBookEntry({ dayIdx, currentEntries, onEditDayLevel }) {
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
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <input style={{ ...ST.input, textAlign: "left" }} placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
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

function StoreTab({ days, settings, onEditDayLevel }) {
  const prices = settings?.storePrices || {};
  return (
    <div style={ST.card2}>
      <h3 style={ST.cardTitle}>Store Transfer (Monthly)</h3>
      <div style={ST.tableWrap}>
        <table style={ST.table}>
          <thead>
            <tr>
              <th style={{ ...ST.th, textAlign: "left" }}>Date</th>
              <th style={ST.th}>အလုံး</th>
              <th style={ST.th}>အခြမ်း</th>
              <th style={ST.th}>ပြာတွဲ</th>
              <th style={ST.th}>စိမ်းတွဲ</th>
              <th style={ST.th}>ခြမ်း 2</th>
              <th style={ST.th}>ခြမ်း 3</th>
              <th style={ST.th}>အဝါလုံး</th>
              <th style={ST.th}>Total Value</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, dayIdx) => {
              const tr = d.storeTransfer || {};
              const vals = {
                aLoneGyi: parseFloat(tr.aLoneGyi) || 0,
                aChan: parseFloat(tr.aChan) || 0,
                hteikKwe: parseFloat(tr.hteikKwe) || 0,
                khaKyo: parseFloat(tr.khaKyo) || 0,
                chan2: parseFloat(tr.chan2) || 0,
                chan3: parseFloat(tr.chan3) || 0,
                aThayLone: parseFloat(tr.aThayLone) || 0,
              };
              const totalVal = 
                vals.aLoneGyi * (prices.aLoneGyi || 0) +
                vals.aChan * (prices.aChan || 0) +
                vals.hteikKwe * (prices.hteikKwe || 0) +
                vals.khaKyo * (prices.khaKyo || 0) +
                vals.chan2 * (prices.chan2 || 0) +
                vals.chan3 * (prices.chan3 || 0) +
                vals.aThayLone * (prices.aThayLone || 0);

              const keys = ["aLoneGyi", "aChan", "hteikKwe", "khaKyo", "chan2", "chan3", "aThayLone"];
              return (
                <tr key={d.date} style={dayIdx % 2 === 0 ? ST.rowEven : ST.rowOdd}>
                  <td style={{ ...ST.td, textAlign: "left" }}>{d.date}</td>
                  {keys.map(k => (
                    <td key={k} style={ST.td}>
                      <input 
                        style={{ ...ST.input, width: 60 }} 
                        value={tr[k] ?? ""} 
                        onChange={e => onEditDayLevel(dayIdx, k, e.target.value)} 
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td style={{ ...ST.td, fontWeight: 600, color: "#1B8A5A" }}>{fmt(totalVal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════
const ST = {
  app: { minHeight: "100vh", background: "#F7F7F5", color: "#17181C", fontFamily: "'Public Sans', sans-serif" },
  header: { background: "#FFFFFF", borderBottom: "1px solid #E4E4E0", position: "sticky", top: 0, zIndex: 50 },
  headerInner: { maxWidth: 1100, margin: "0 auto", padding: "0 20px" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 10px" },
  brand: { fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 21, letterSpacing: "-0.01em" },
  brandSub: { fontSize: 12, color: "#6E7079", marginTop: 1 },
  newDayBtn: { background: "#0B6E4F", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  dayNav: { display: "flex", alignItems: "center", gap: 10, padding: "0 0 10px" },
  monthSelect: { flexShrink: 0, border: "1px solid #E4E4E0", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: 600, fontFamily: "'Public Sans', sans-serif", background: "#fff", color: "#17181C", cursor: "pointer" },
  dayScroll: { display: "flex", gap: 6, overflowX: "auto", flex: 1 },
  dayChip: { flexShrink: 0, padding: "6px 12px", borderRadius: 20, border: "1px solid #E4E4E0", background: "#fff", color: "#6E7079", fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" },
  dayChipActive: { background: "#0B6E4F", borderColor: "#0B6E4F", color: "#fff" },
  tabBar: { display: "flex", borderTop: "1px solid #E4E4E0", gap: 4, padding: "0" },
  tabBtn: { padding: "10px 18px", background: "none", border: "none", borderBottom: "2px solid transparent", color: "#6E7079", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  tabBtnActive: { color: "#0B6E4F", borderBottomColor: "#0B6E4F" },
  main: { padding: "16px 20px 60px", maxWidth: 1100, margin: "0 auto" },

  pastNotice: { background: "#FBF3D9", border: "1px solid #E9D896", color: "#7A5C00", fontSize: 13, padding: "8px 14px", borderRadius: 8, marginBottom: 14 },

  segControl: { display: "inline-flex", background: "#EDECE7", borderRadius: 10, padding: 3, marginBottom: 16 },
  segBtn: { padding: "7px 16px", border: "none", background: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#6E7079", cursor: "pointer" },
  segBtnActive: { background: "#fff", color: "#17181C", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" },

  statsRow: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  statBox: { flex: "1 1 150px", background: "#fff", border: "1px solid #E4E4E0", borderRadius: 10, padding: "12px 16px" },
  statValue: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 600 },
  statLabel: { fontSize: 11.5, color: "#6E7079", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" },

  note: { fontSize: 12.5, color: "#6E7079", marginBottom: 12, fontStyle: "italic" },

  tableWrap: { background: "#fff", border: "1px solid #E4E4E0", borderRadius: 10, overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "10px 8px", textAlign: "right", color: "#6E7079", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #E4E4E0", whiteSpace: "nowrap" },
  td: { padding: "8px", textAlign: "right", borderBottom: "1px solid #F0F0EC", fontFamily: "'IBM Plex Mono', monospace" },
  tdCalc: { color: "#6E7079" },
  rowEven: { background: "#fff" },
  rowOdd: { background: "#FBFBFA" },
  gradeTag: { fontSize: 10, color: "#9A9A93", marginLeft: 6, fontFamily: "'IBM Plex Mono', monospace" },

  input: { border: "1px solid #E4E4E0", borderRadius: 6, padding: "5px 7px", textAlign: "right", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", background: "#FCFCFB" },

  cardList: { display: "flex", flexDirection: "column", gap: 8 },
  card: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #E4E4E0", borderRadius: 10, padding: "12px 14px", textAlign: "left", cursor: "pointer", width: "100%" },
  cardLeft: {},
  cardName: { fontWeight: 600, fontSize: 14.5 },
  cardSub: { fontSize: 12, color: "#6E7079", marginTop: 2 },
  cardBal: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 14 },

  overlay: { position: "fixed", inset: 0, background: "rgba(23,24,28,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 },
  confirmModal: { background: "#fff", borderRadius: "16px 16px 0 0", padding: 22, width: "100%", maxWidth: 420, margin: "auto" },
  confirmTitle: { fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18, marginBottom: 8 },
  confirmBody: { fontSize: 13.5, color: "#4B4C52", lineHeight: 1.5, marginBottom: 18 },
  confirmActions: { display: "flex", gap: 10, justifyContent: "flex-end" },
  btnGhost: { background: "none", border: "1px solid #E4E4E0", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnPrimary: { background: "#0B6E4F", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  addLinkBtn: { background: "none", border: "none", color: "#0B6E4F", fontWeight: 600, cursor: "pointer", fontSize: 13, padding: "5px 0" },

  mobileModal: { background: "#fff", borderRadius: "16px 16px 0 0", padding: "18px 20px 28px", width: "100%", maxWidth: 480, margin: "auto", maxHeight: "85vh", overflowY: "auto" },
  mobileModalHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, borderBottom: "1px solid #E4E4E0", paddingBottom: 14 },
  mobileModalName: { fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18 },
  mobileModalMeta: { fontSize: 12, color: "#6E7079", marginTop: 3, fontFamily: "'IBM Plex Mono', monospace" },
  closeBtn: { background: "#0B6E4F", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, marginBottom: 14 },
  mobileField: { marginBottom: 12 },
  mobileLabel: { display: "block", fontSize: 12, color: "#6E7079", marginBottom: 4, fontWeight: 600 },
  mobileResult: { marginTop: 14, paddingTop: 14, borderTop: "1px solid #E4E4E0", display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5 },

  summaryGrid: { display: "flex", flexDirection: "column", gap: 14 },
  card2: { background: "#fff", border: "1px solid #E4E4E0", borderRadius: 10, padding: 18 },
  cardTitle: { fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 15, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #E4E4E0" },
  summaryList: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px solid #F5F5F2" },
  summaryFooterRow: { display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0" },
  weekLabel: { fontSize: 12, fontWeight: 700, color: "#0B6E4F", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" },
  monthRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid #F5F5F2", fontFamily: "'IBM Plex Mono', monospace" },

  workerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px,1fr))", gap: 10 },
  workerCard: { background: "#fff", border: "1px solid #E4E4E0", borderRadius: 10, padding: 14 },
  wcName: { fontWeight: 700, marginBottom: 8 },
  wcRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12.5 },
  wcLabel: { color: "#6E7079" },
  wcInput: { width: 64, border: "1px solid #E4E4E0", borderRadius: 6, padding: "3px 6px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" },
  wcToggle: { width: "100%", background: "none", border: "1px solid #E4E4E0", borderRadius: 6, padding: "5px", fontSize: 12, cursor: "pointer", color: "#6E7079" },

  addRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  addInput: { flex: "1 1 160px", border: "1px solid #E4E4E0", borderRadius: 8, padding: "9px 12px", fontSize: 13 },
  addSelect: { border: "1px solid #E4E4E0", borderRadius: 8, padding: "9px 12px", fontSize: 13, background: "#fff" },

  auditList: { display: "flex", flexDirection: "column", gap: 8 },
  auditRow: { background: "#fff", border: "1px solid #E4E4E0", borderRadius: 8, padding: "10px 14px", fontSize: 13 },
  auditMeta: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9A9A93", marginBottom: 4 },
  auditDate: { fontFamily: "'IBM Plex Mono', monospace" },
  auditDiff: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, marginTop: 3 },
  auditOld: { color: "#C0392B" },
  auditNew: { color: "#1B8A5A" },
};
