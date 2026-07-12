import { ST } from '../../utils/styles';
import { fmt, weekKey } from '../../utils/formatting';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function SummaryTab({ days, workers, activeDay, peelerTotals, generalTotals, dividerTotals }) {
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
      <div style={{ ...ST.card2, gridColumn: "1 / -1" }}>
        <h3 style={ST.cardTitle}>Daily Production Analytics</h3>
        <div style={{ width: "100%", height: 300, marginTop: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={days.map(d => {
                const dayNum = parseInt(d.date.slice(8), 10);
                const peelerG1 = Object.values(d.peelersComputed || {}).reduce((s, r) => s + (parseFloat(r.grade1Gotten) || 0), 0);
                const divFulls = parseFloat(d.dividerProduction?.fulls) || 0;
                return { name: dayNum, "Peeler Grade 1": peelerG1, "Divider Fulls": divFulls };
              })}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6E7079" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6E7079" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                labelStyle={{ fontWeight: 600, color: "#17181C", marginBottom: 4 }}
              />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} iconType="circle" />
              <Line type="monotone" dataKey="Peeler Grade 1" stroke="#0B6E4F" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Divider Fulls" stroke="#1B6FA8" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}