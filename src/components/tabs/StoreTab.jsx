import { ST } from '../../utils/styles';
import { fmt } from '../../utils/formatting';
import { NumInput } from '../Inputs';

export function StoreTab({ days, settings, onEditDayLevel }) {
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