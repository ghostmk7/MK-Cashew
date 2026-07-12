export function weekKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export function fmt(n) {
  if (n === null || n === undefined || n === "" || isNaN(n)) return "—";
  return Math.round(Number(n)).toLocaleString();
}

export function fmtKg(v) {
  if (v === "" || v === null || v === undefined) return "—";
  const n = parseFloat(v);
  return isNaN(n) ? "—" : n.toFixed(2);
}

export function fmtPct(p) { return p === null || p === undefined ? "—" : (p * 100).toFixed(1) + "%"; }

