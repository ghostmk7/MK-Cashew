import { useState } from 'react';
import { ST } from '../../utils/styles';
import { fmt } from '../../utils/formatting';
import { emptyDay } from '../../utils/calculations';
import { pushToCloud, pullFromCloud } from '../../utils/syncService';
import { exportPeelersToCsv } from '../../utils/exportToCsv';

export function SettingsTab({ settings, workers, auditLog, setStore, store, days }) {
  const storedRates = settings?.rates?.length ? settings.rates : [2400, 2700, 3000];
  const [rates, setRates] = useState([...storedRates]);
  const [defaultRate, setDefaultRate] = useState(settings?.defaultRate || storedRates[storedRates.length - 1]);
  const [openingBalances, setOpeningBalances] = useState(settings?.openingBalances || {});
  const [cashBookOpening, setCashBookOpening] = useState(settings?.cashBookOpening || 0);
  const [storePrices, setStorePrices] = useState(settings?.storePrices || { aLoneGyi: 67000, aChan: 52000, hteikKwe: 37200, khaKyo: 31200, chan2: 35000, chan3: 20000, aThayLone: 50000 });
  const [saved, setSaved] = useState(false);

  // Sync state
  const [syncUrl, setSyncUrl] = useState(settings?.syncUrl || "");
  const [syncStatus, setSyncStatus] = useState("");

  function updateRate(i, val) {
    const next = [...rates];
    next[i] = val;
    setRates(next);
  }

  function addRate() { setRates(r => [...r, ""]); }

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
        storePrices,
        syncUrl
      } 
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handlePush() {
    if (!syncUrl) return alert("Please enter the Google Apps Script Web App URL first.");
    setSyncStatus("Pushing to cloud...");
    
    // Auto-save the URL to store before pushing so it persists
    setStore(s => ({ ...s, settings: { ...s.settings, syncUrl } }));
    
    const res = await pushToCloud(syncUrl, { ...store, settings: { ...store.settings, syncUrl } });
    if (res.success) {
      setSyncStatus("✓ Pushed successfully!");
    } else {
      setSyncStatus("❌ Error pushing data.");
    }
    setTimeout(() => setSyncStatus(""), 3000);
  }

  async function handlePull() {
    if (!syncUrl) return alert("Please enter the Google Apps Script Web App URL first.");
    if (!confirm("This will OVERWRITE your local data with the cloud data. Are you sure?")) return;
    setSyncStatus("Pulling from cloud...");
    
    // Auto-save the URL to store so it isn't erased if the cloud backup doesn't have it
    setStore(s => ({ ...s, settings: { ...s.settings, syncUrl } }));
    
    const res = await pullFromCloud(syncUrl);
    if (res.success && res.data && res.data.rawDays) {
      // Ensure the URL stays even after overwriting store
      const newData = res.data;
      if (!newData.settings) newData.settings = {};
      newData.settings.syncUrl = syncUrl;
      setStore(newData);
      setSyncStatus("✓ Pulled successfully!");
    } else {
      setSyncStatus("❌ Error pulling data.");
    }
    setTimeout(() => setSyncStatus(""), 3000);
  }

  function startNewMonth() {
    if (!confirm("WARNING: This will archive your current month, clear all daily records, and start a new month using the final balances from today. Proceed?")) return;
    
    const lastDay = days[days.length - 1];
    const newOpeningBalances = {};
    workers.forEach(w => {
      let change = 0;
      if (w.type === "peeler") {
        change = lastDay?.peelersComputed?.[w.id]?.changeForNextDay || 0;
      }
      else if (w.type === "general") change = lastDay?.generalComputed?.[w.id]?.changeForNextDay || 0;
      else if (w.type === "divider") change = lastDay?.dividersComputed?.[w.id]?.changeForNextDay || 0;
      
      newOpeningBalances[w.id] = change;
    });

    let newCashOpening = parseFloat(cashBookOpening) || 0;
    if (lastDay?.cashBook?.length) {
      const lastTx = lastDay.cashBook[lastDay.cashBook.length - 1];
      if (lastTx && lastTx.runningBal !== undefined) newCashOpening = lastTx.runningBal;
    }

    setStore(s => ({
      ...s,
      rawDays: [emptyDay()],
      auditLog: [],
      settings: {
        ...s.settings,
        openingBalances: newOpeningBalances,
        cashBookOpening: newCashOpening
      }
    }));
    
    setOpeningBalances(newOpeningBalances);
    setCashBookOpening(newCashOpening);
    alert("New month started successfully!");
  }

  return (
    <div style={ST.card2}>
      <h3 style={ST.cardTitle}>Settings</h3>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Cloud Sync (Google Sheets)</div>
        <div style={{ ...ST.note, marginTop: 0, marginBottom: 12 }}>Paste your Google Apps Script Web App URL here to sync data to the cloud.</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input 
            type="password" 
            value={syncUrl} 
            onChange={e => setSyncUrl(e.target.value)} 
            placeholder="https://script.google.com/macros/s/.../exec"
            style={{ ...ST.addInput, flex: 1 }}
          />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button style={{ ...ST.btnPrimary, background: "#1B8A5A", padding: "6px 14px", fontSize: 14 }} onClick={handlePush}>Push Backup to Cloud</button>
          <button style={{ ...ST.btnGhost, padding: "6px 14px", fontSize: 14 }} onClick={handlePull}>Pull from Cloud</button>
          <span style={{ fontSize: 13, color: "#6E7079", alignSelf: "center", marginLeft: 10 }}>{syncStatus}</span>
        </div>
      </div>

      <div style={{ marginBottom: 20, borderTop: "1px solid #E4E4E0", paddingTop: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Monthly Rollover</div>
        <div style={{ ...ST.note, marginTop: 0, marginBottom: 12 }}>Automatically calculate all final balances and start a fresh month.</div>
        <button style={{ ...ST.btnGhost, color: "#C0392B", border: "1px solid #C0392B" }} onClick={startNewMonth}>
          Start New Month
        </button>
      </div>

      <div style={{ marginBottom: 20, borderTop: "1px solid #E4E4E0", paddingTop: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Export Data</div>
        <div style={{ ...ST.note, marginTop: 0, marginBottom: 12 }}>Download your production data as a spreadsheet (CSV) that you can open in Excel.</div>
        <button style={{ ...ST.btnGhost, border: "1px solid #0B6E4F", color: "#0B6E4F" }} onClick={() => exportPeelersToCsv(days, workers)}>
          Export Peelers Data to CSV
        </button>
      </div>

      <div style={{ marginBottom: 20, borderTop: "1px solid #E4E4E0", paddingTop: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Price Rate Options (MMK/viss)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rates.map((rv, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="number" value={rv} onChange={e => updateRate(i, e.target.value)} style={{ ...ST.addInput, maxWidth: 150 }} placeholder="Rate" />
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
                <input type="radio" name="defaultRate" checked={String(defaultRate) === String(rv)} onChange={() => setDefaultRate(rv)} />
                Default
              </label>
              <button onClick={() => removeRate(i)} style={{ background: "none", border: "1px solid #E4E4E0", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#C0392B" }}>✕ Remove</button>
            </div>
          ))}
        </div>
        <button onClick={addRate} style={{ marginTop: 10, background: "none", border: "1px dashed #0B6E4F", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#0B6E4F", fontWeight: 600 }}>+ Add Rate</button>
      </div>

      <div style={{ marginTop: 28, borderTop: "1px solid #E4E4E0", paddingTop: 18, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Opening Carry-Over Balances</div>
        <div style={{ ...ST.note, marginTop: 0, marginBottom: 12 }}>Set a starting balance per worker (e.g., from end of previous month). Applied before Day 1 calculations.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {workers.filter(w => w.active !== false).map(w => (
            <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ minWidth: 150, fontSize: 13, fontWeight: 500 }}>{w.name}</span>
              <span style={{ fontSize: 11, color: "#9A9A93", minWidth: 56 }}>{w.type}</span>
              <input type="number" value={openingBalances[w.id] ?? ""} onChange={e => setOpeningBalances(ob => ({ ...ob, [w.id]: e.target.value }))} placeholder="0" style={{ ...ST.addInput, maxWidth: 130 }} />
              <span style={{ fontSize: 12, color: "#6E7079", minWidth: 40 }}>MMK</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 28, borderTop: "1px solid #E4E4E0", paddingTop: 18, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Cash Book & Store Settings</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ minWidth: 150, fontSize: 13, fontWeight: 500 }}>Cash Book Opening</span>
            <input type="number" value={cashBookOpening} onChange={e => setCashBookOpening(e.target.value)} placeholder="0" style={{ ...ST.addInput, maxWidth: 130 }} />
            <span style={{ fontSize: 12, color: "#6E7079" }}>MMK</span>
          </div>

          <div style={{ fontWeight: 600, fontSize: 13, marginTop: 8 }}>Store Transfer Prices (per viss/unit)</div>
          {Object.entries({ aLoneGyi: "အလုံး", aChan: "အခြမ်း", hteikKwe: "ပြာတွဲ", khaKyo: "စိမ်းတွဲ", chan2: "ခြမ်း 2", chan3: "ခြမ်း 3", aThayLone: "အဝါလုံး" }).map(([key, label]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ minWidth: 150, fontSize: 13, fontWeight: 500 }}>{label}</span>
              <input type="number" value={storePrices[key] ?? ""} onChange={e => setStorePrices(sp => ({ ...sp, [key]: parseFloat(e.target.value) || 0 }))} placeholder="0" style={{ ...ST.addInput, maxWidth: 130 }} />
              <span style={{ fontSize: 12, color: "#6E7079" }}>MMK</span>
            </div>
          ))}
        </div>
      </div>
      
      <button style={{ ...ST.btnPrimary, width: "100%", opacity: saved ? 0.7 : 1, marginTop: 12 }} onClick={save}>
        {saved ? "✓ Saved!" : "Save All Settings"}
      </button>

      <div style={{ marginTop: 28, borderTop: "1px solid #E4E4E0", paddingTop: 18 }}>
        <h3 style={{ ...ST.cardTitle, marginBottom: 12 }}>Audit Log</h3>
        {auditLog && auditLog.length > 0 ? (
          <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid #E4E4E0", borderRadius: 8, padding: 10, fontSize: 12 }}>
             {auditLog.map(l => (
               <div key={l.id} style={{ padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
                 <span style={{ color: "#6E7079" }}>{new Date(l.ts).toLocaleString()}</span>
                 <strong> {l.date}</strong> - {l.section} - {l.workerName}: {l.field} ({l.oldValue} → {l.newValue})
               </div>
             ))}
          </div>
        ) : <div style={ST.note}>No recent edits.</div>}
      </div>
    </div>
  );
}