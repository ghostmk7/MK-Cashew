import { useState, useEffect, useMemo } from 'react';
import { emptyDay, today, computeAll, SEED_WORKERS } from '../utils/calculations';
import { pushToCloud } from '../utils/syncService';

const STORAGE_KEY = "cashew_payroll_v4";

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
      openingRawBalances: {},
      cashBookOpening: 0,
      storePrices: { aLoneGyi: 67000, aChan: 52000, hteikKwe: 372000, khaKyo: 312000, chan2: 35000, chan3: 20000, aThayLone: 50000 }
    } 
  };
}

export function useStore() {
  const [store, setStore] = useState(loadState);
  
  // App UI State
  const [activeDayIdx, setActiveDayIdx] = useState(store.rawDays.length - 1);
  const [tab, setTab] = useState("entry");
  const [section, setSection] = useState("peeler");
  const [unlocked, setUnlocked] = useState(() => new Set([store.rawDays[store.rawDays.length - 1]?.date]));
  const [pendingEdit, setPendingEdit] = useState(null);
  const [mobileEditWorker, setMobileEditWorker] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => store.rawDays[store.rawDays.length - 1]?.date.slice(0, 7) || today().slice(0, 7));
  const [globalSyncStatus, setGlobalSyncStatus] = useState("");

  // Debounced Local Save & Auto-Sync
  useEffect(() => {
    const timeout = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {}
      
      // Auto-sync to cloud if URL exists
      if (store.settings?.syncUrl) {
        setGlobalSyncStatus("Saving...");
        pushToCloud(store.settings.syncUrl, store).then(res => {
          if (res.success) {
            setGlobalSyncStatus("Saved to cloud");
            setTimeout(() => setGlobalSyncStatus(""), 3000);
          } else {
            setGlobalSyncStatus("Sync failed");
          }
        });
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [store]);

  const { workers, rawDays, auditLog, settings } = store;
  const activeRates = settings?.rates?.length ? settings.rates : [2400, 2700, 3000];
  const days = useMemo(() => computeAll(rawDays, workers, settings), [rawDays, workers, settings]);
  const months = useMemo(() => [...new Set(rawDays.map(d => d.date.slice(0, 7)))].sort(), [rawDays]);
  
  const day = days[activeDayIdx];
  const isPastDay = activeDayIdx !== rawDays.length - 1;
  const dayIsUnlocked = unlocked.has(day?.date);
  const activeWorkers = workers.filter(w => w.type === section && w.active !== false);

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

  function requestEdit(dayIdx, sectionKey, workerId, field, value, workerName) {
    const guard = dayIdx !== rawDays.length - 1 && !unlocked.has(rawDays[dayIdx].date);
    if (guard) {
      setPendingEdit({ dayIdx, sectionKey, workerId, field, value, workerName });
      return;
    }
    applyEdit(dayIdx, sectionKey, workerId, field, value, workerName);
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

  function requestEditDayLevel(dayIdx, sectionKey, field, value, sectionName) {
    const guard = dayIdx !== rawDays.length - 1 && !unlocked.has(rawDays[dayIdx].date);
    if (guard) {
      setPendingEdit({ dayIdx, sectionKey, field, value, workerName: sectionName, isDayLevel: true });
      return;
    }
    applyEditDayLevel(dayIdx, sectionKey, field, value, sectionName);
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

  function updateWorker(id, changes) {
    setStore(s => {
      const workers = s.workers.map(w => w.id === id ? { ...w, ...changes } : w);
      return { ...s, workers };
    });
  }

  function addWorker(worker) {
    setStore(s => {
      const maxId = s.workers.reduce((max, w) => Math.max(max, w.id), 0);
      const newWorker = { ...worker, id: maxId + 1, active: true };
      return { ...s, workers: [...s.workers, newWorker] };
    });
  }

  return {
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
    requestEdit, applyEdit, confirmPending, requestEditDayLevel, applyEditDayLevel, addNewDay,
    updateWorker, addWorker,
    globalSyncStatus
  };
}
