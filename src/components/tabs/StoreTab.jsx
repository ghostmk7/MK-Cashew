import { ST } from '../../utils/styles';
import { fmt } from '../../utils/formatting';
import { NumInput } from '../Inputs';

export function StoreTab({ days, settings, onEditDayLevel, isMobile }) {
  const prices = settings?.storePrices || {};
  const labels = {
    aLoneGyi: "အလုံး",
    aChan: "အခြမ်း",
    hteikKwe: "ပြာတွဲ",
    khaKyo: "စိမ်းတွဲ",
    chan2: "ခြမ်း 2",
    chan3: "ခြမ်း 3",
    aThayLone: "အဝါလုံး"
  };
  const keys = Object.keys(labels);
  return (
    <div style={ST.card2}>
      <h3 style={ST.cardTitle}>Store Transfer (Monthly)</h3>
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

            return (
              <div key={d.date} style={{ border: "1px solid #E4E4E0", borderRadius: 8, padding: 12, backgroundColor: "#fff" }}>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>{d.date}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {keys.map(k => (
                    <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 12, color: "#6E7079" }}>{labels[k]}</span>
                      <input 
                        style={{ ...ST.input, width: "100%" }} 
                        value={tr[k] ?? ""} 
                        onChange={e => onEditDayLevel(dayIdx, k, e.target.value)} 
                        placeholder="0"
                        type="number"
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: "1px dashed #E4E4E0" }}>
                  <span style={{ fontSize: 13, color: "#6E7079" }}>Total Value</span>
                  <strong style={{ color: "#1B8A5A" }}>{fmt(totalVal)} MMK</strong>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
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
      )}
    </div>
  );
}