import { fmt, fmtKg } from './formatting';

export function exportPeelersToCsv(days, workers) {
  // Find all peelers
  const peelers = workers.filter(w => w.type === "peeler");
  
  // Create CSV Header
  let csvContent = "Date,Worker Name,Raw Taken,Amount Taken,Alone+Awar,Grade 1,Rotten,Total Gotten,Yield %,Rate,Payroll,Paid,Carry Over Balance\n";
  
  // Loop through days and workers
  for (const day of days) {
    if (!day.peelersComputed) continue;
    for (const w of peelers) {
      const r = day.peelersComputed[w.id];
      if (!r || !r.amountTaken) continue; // Only export rows with data
      
      const date = day.date;
      const name = `"${w.name}"`;
      const rawTaken = r.rawMaterialTaken || "";
      const amountTaken = r.amountTaken || "";
      const aloneAwar = r.alonePlusAwarLone || "";
      const grade1 = r.grade1Gotten || "";
      const rotten = r.rotten || "";
      const totalGotten = fmtKg(r.totalAmountGotten);
      const yieldPct = (r.percentPct * 100).toFixed(2) + "%";
      const rate = r.priceRate || "";
      const payroll = r.payrollAmount || "";
      const paid = r.amountPaid || "";
      const balance = r.changeForNextDay || "";
      
      csvContent += `${date},${name},${rawTaken},${amountTaken},${aloneAwar},${grade1},${rotten},${totalGotten},${yieldPct},${rate},${payroll},${paid},${balance}\n`;
    }
  }

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `MK_Cashew_Peelers_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
