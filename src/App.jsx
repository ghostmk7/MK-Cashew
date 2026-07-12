import { useState } from 'react';
import { useStore } from './store/useStore';
import { GlobalStyle, Overlay } from './components/Helpers';
import { ST } from './utils/styles';
import { EntryTab } from './components/tabs/EntryTab';
import { SummaryTab } from './components/tabs/SummaryTab';
import { CashBookTab } from './components/tabs/CashBookTab';
import { StoreTab } from './components/tabs/StoreTab';
import { FinancialTab } from './components/tabs/FinancialTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { AuditTab } from './components/tabs/AuditTab';
import { WorkersTab, MobileEditModal } from './components/Tables';
import { fmt, weekKey } from './utils/formatting';
import { today } from './utils/calculations';

function useIsMobile() {
  const [mobile, setMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 820 : false);
  // useEffect is intentionally simplified, we can add window resize listener later if needed.
  return mobile;
}

export default function App() {
  const {
    store, setStore,
    activeDayIdx, setActiveDayIdx,
    tab, setTab,
    section, setSection,
    unlocked, setUnlocked,
    pendingEdit, setPendingEdit,
    mobileEditWorker, setMobileEditWorker,
    selectedMonth, setSelectedMonth,
    workers, rawDays, auditLog, settings,
    activeRates, days, months, day, isPastDay, dayIsUnlocked, activeWorkers,
    requestEdit, applyEdit, confirmPending, requestEditDayLevel, applyEditDayLevel, addNewDay
  } = useStore();

  const isMobile = useIsMobile();

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
            {[["entry", "Entry"], ["summary", "Summary"], ["workers", "Workers"], ["store", "Store"], ["cashbook", "Cash Book"], ["financial", "Financial"], ["settings", "Settings"]].map(([k, label]) => (
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
          <EntryTab 
            day={day} rawDays={rawDays} activeDayIdx={activeDayIdx} section={section} setSection={setSection} 
            activeWorkers={activeWorkers} isMobile={isMobile} setMobileEditWorker={setMobileEditWorker} 
            activeRates={activeRates} settings={settings} requestEdit={requestEdit} requestEditDayLevel={requestEditDayLevel}
            peelerTotalGrade1={peelerTotalGrade1} peelerTotalPayroll={peelerTotalPayroll} peelerTotalPaid={peelerTotalPaid}
            generalTotalWage={generalTotalWage} generalTotalPaid={generalTotalPaid} dividerTotalWage={dividerTotalWage} dividerTotalPaid={dividerTotalPaid}
          />
        )}

        {tab === "summary" && (
          <SummaryTab
            days={days} workers={workers} activeDay={day}
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
            days={days} settings={settings}
            onEditDayLevel={(dayIdx, field, val) => requestEditDayLevel(dayIdx, "cashBook", field, val, "Cash Book")}
          />
        )}

        {tab === "financial" && (
          <FinancialTab days={days} workers={workers} settings={settings} />
        )}

        {tab === "store" && (
          <StoreTab 
            days={days} settings={settings}
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
          worker={mobileEditWorker} section={section} day={day} rates={activeRates}
          onClose={() => setMobileEditWorker(null)}
          onEdit={(field, val) => requestEdit(activeDayIdx, section === "peeler" ? "peelers" : section, mobileEditWorker.id, field, val, mobileEditWorker.name)}
        />
      )}
    </div>
  );
}
