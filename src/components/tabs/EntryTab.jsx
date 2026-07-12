import { Fragment } from "react";
import { ST } from "../../utils/styles";
import { fmt } from "../../utils/formatting";
import { Stat } from "../Helpers";
import { CardListPeeler, CardListWage, WageWorkerTable, PeelerTable } from "../Tables";
import { FormulaInput } from "../Inputs";

function TempWorkerRow({ dayPeelers, rates, settings, onEdit }) {
  // A simple placeholder for temp worker logic (extracted from App)
  return null; // Will properly copy TempWorkerRow logic later if needed
}

export function EntryTab({ 
  day, rawDays, activeDayIdx, section, setSection, activeWorkers, isMobile, 
  setMobileEditWorker, activeRates, settings, requestEdit, requestEditDayLevel,
  peelerTotalGrade1, peelerTotalPayroll, peelerTotalPaid,
  generalTotalWage, generalTotalPaid, dividerTotalWage, dividerTotalPaid
}) {
  return (
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
  );
}
