import { ST } from '../../utils/styles';
import { fmt } from '../../utils/formatting';

export function FinancialTab({ days, workers, settings }) {
  // Aggregate all totals across all days
  let totalPeelerWage = 0;
  let totalPeelerPaid = 0;
  let totalGeneralWage = 0;
  let totalGeneralPaid = 0;
  let totalDividerWage = 0;
  let totalDividerPaid = 0;

  let totalPeelerG1 = 0;
  let totalDividerFulls = 0;
  let totalDividerHalfs = 0;

  let totalStoreValue = 0;
  let totalCashIn = 0;
  let totalCashOut = 0;

  days.forEach(d => {
    // Peelers
    Object.values(d.peelersComputed || {}).forEach(r => {
      totalPeelerWage += r.payrollAmount || 0;
      totalPeelerPaid += parseFloat(r.amountPaid) || 0;
      totalPeelerG1 += parseFloat(r.grade1Gotten) || 0;
    });
    // General
    Object.values(d.generalComputed || {}).forEach(r => {
      if (r.isPresent) totalGeneralWage += parseFloat(r.wage) || 0;
      totalGeneralPaid += parseFloat(r.amountPaid) || 0;
    });
    // Divider
    Object.values(d.dividersComputed || {}).forEach(r => {
      if (r.isPresent) totalDividerWage += parseFloat(r.wage) || 0;
      totalDividerPaid += parseFloat(r.amountPaid) || 0;
    });
    // Production
    totalDividerFulls += parseFloat(d.dividerProduction?.fulls) || 0;
    totalDividerHalfs += parseFloat(d.dividerProduction?.halfs) || 0;
    // Store Transfers
    Object.entries(d.storeTransfer || {}).forEach(([key, qty]) => {
      const p = settings?.storePrices?.[key] || 0;
      totalStoreValue += (parseFloat(qty) || 0) * p;
    });
    // Cash Book
    d.cashBook?.forEach(cb => {
      if (cb.type === "in") totalCashIn += parseFloat(cb.amount) || 0;
      if (cb.type === "out") totalCashOut += parseFloat(cb.amount) || 0;
    });
  });

  const finalCashBalance = (parseFloat(settings?.cashBookOpening) || 0) + totalCashIn - totalCashOut;
  const totalWagesGenerated = totalPeelerWage + totalGeneralWage + totalDividerWage;
  const totalWagesPaid = totalPeelerPaid + totalGeneralPaid + totalDividerPaid;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={ST.card2}>
        <h3 style={ST.cardTitle}>Monthly Closing Statement</h3>
        <p style={{ ...ST.note, marginTop: 0, marginBottom: 16 }}>An aggregated view of all financial and production metrics for this month.</p>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
          
          <div style={{ border: "1px solid #E4E4E0", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#6E7079", marginBottom: 12, textTransform: "uppercase" }}>Wages & Labor</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Total Payroll Generated</span><strong style={{ color: "#1B6FA8" }}>{fmt(totalWagesGenerated)} Ks</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Total Wages Paid Out</span><strong style={{ color: "#B8860B" }}>{fmt(totalWagesPaid)} Ks</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px dashed #E4E4E0" }}>
              <span>Net Worker Balance Change</span><strong style={{ color: totalWagesGenerated > totalWagesPaid ? "#C0392B" : "#1B8A5A" }}>{fmt(totalWagesGenerated - totalWagesPaid)} Ks</strong>
            </div>
          </div>

          <div style={{ border: "1px solid #E4E4E0", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#6E7079", marginBottom: 12, textTransform: "uppercase" }}>Cash Book</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Opening Balance</span><strong>{fmt(parseFloat(settings?.cashBookOpening) || 0)} Ks</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Total Cash In</span><strong style={{ color: "#1B8A5A" }}>{fmt(totalCashIn)} Ks</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Total Cash Out</span><strong style={{ color: "#C0392B" }}>{fmt(totalCashOut)} Ks</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px dashed #E4E4E0" }}>
              <span>Final Closing Balance</span><strong>{fmt(finalCashBalance)} Ks</strong>
            </div>
          </div>

          <div style={{ border: "1px solid #E4E4E0", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#6E7079", marginBottom: 12, textTransform: "uppercase" }}>Production & Goods</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Total Peeler G1</span><strong>{totalPeelerG1.toFixed(2)} viss</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Divider Fulls</span><strong>{totalDividerFulls.toFixed(2)} viss</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Divider Halfs</span><strong>{totalDividerHalfs.toFixed(2)} viss</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px dashed #E4E4E0" }}>
              <span>Store Transfer Value</span><strong style={{ color: "#1B8A5A" }}>{fmt(totalStoreValue)} Ks</strong>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
