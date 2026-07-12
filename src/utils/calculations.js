export const SEED_WORKERS = [
  { id: 1, name: "Khin Thet Cho",   type: "peeler",  grade: null,  dailyWage: null, active: true },
  { id: 2, name: "Nu Nu Win",       type: "peeler",  grade: 1.07,  dailyWage: null, active: true },
  { id: 3, name: "Mi Tayy",         type: "peeler",  grade: 0.96,  dailyWage: null, active: true },
  { id: 4, name: "Kaung Khant",     type: "peeler",  grade: 0.865, dailyWage: null, active: true },
  { id: 5, name: "Than Cho",        type: "peeler",  grade: 0.885, dailyWage: null, active: true },
  { id: 6, name: "Thel Thel",       type: "peeler",  grade: null,  dailyWage: null, active: true },
  { id: 7, name: "War War Tun",     type: "peeler",  grade: 0.85,  dailyWage: null, active: true },
  { id: 8, name: "Ma Ni Sander",    type: "peeler",  grade: 0.93,  dailyWage: null, active: true },
  { id: 9, name: "Khin May Sann",   type: "peeler",  grade: 0.96,  dailyWage: null, active: true },
  { id: 10, name: "Naing Naing Win", type: "peeler", grade: 0.815, dailyWage: null, active: true },
  { id: 11, name: "Khin Win",        type: "peeler",  grade: null, dailyWage: null, active: true },
  { id: 12, name: "Zarwin",          type: "divider", grade: null, dailyWage: 16667, active: true },
  { id: 13, name: "Lapyae",          type: "divider", grade: null, dailyWage: 16667, active: true },
  { id: 14, name: "Myatnoe",         type: "divider", grade: null, dailyWage: 16666, active: true },
  { id: 15, name: "Nini Win",        type: "divider", grade: null, dailyWage: 10000, active: true },
  { id: 16, name: "Photayote",       type: "general", grade: null, dailyWage: 15000, active: true },
];

export function today() { return new Date().toISOString().slice(0, 10); }

export function emptyDay() { 
  return { 
    date: today(), 
    peelers: {}, 
    general: {}, 
    dividers: {},
    dividerProduction: { fulls: "", halfs: "" },
    storeTransfer: { aLoneGyi: "", aChan: "", hteikKwe: "", khaKyo: "", chan2: "", chan3: "", aThayLone: "" },
    cashBook: [] 
  }; 
}

export function calcPeelerRow(raw, carryOver, settings) {
  const taken = parseFloat(raw?.amountTaken);
  const hasInput = !isNaN(taken) && raw?.amountTaken !== "";
  const rate = raw?.priceRate !== undefined && raw?.priceRate !== "" ? parseFloat(raw.priceRate) : (settings?.defaultRate || 3000);

  if (!hasInput) {
    const payroll = Math.round(carryOver || 0);
    return { totalAmountGotten: 0, percentPct: null, payrollAmount: payroll, rate };
  }
  const alone = parseFloat(raw?.alonePlusAwarLone) || 0;
  const rotten = parseFloat(raw?.rotten) || 0;
  const total = taken - rotten; // C - F
  const pct = total > 0 ? alone / total : null; // D / G
  const payroll = Math.round(total * rate + (carryOver || 0));
  return { totalAmountGotten: parseFloat(total.toFixed(4)), percentPct: pct, payrollAmount: payroll, rate };
}

export function computeAll(rawDays, workers, settings) {
  const openingBalances = settings?.openingBalances || {};
  const openingRawBalances = settings?.openingRawBalances || {};
  const workerBalances = {};
  const workerRawBalances = {};
  workers.forEach(w => {
    workerBalances[w.id] = parseFloat(openingBalances[w.id]) || 0;
    workerRawBalances[w.id] = parseFloat(openingRawBalances[w.id]) || 0;
  });

  return rawDays.map(day => {
    const peelersComputed = {};
    const generalComputed = {};
    const dividersComputed = {};

    workers.forEach(w => {
      const id = w.id;
      const carryOver = workerBalances[id] || 0;

      if (w.type === "peeler") {
        const raw = day.peelers[id] || {};
        const calc = calcPeelerRow(raw, carryOver, settings);
        const paid = parseFloat(raw.amountPaid);
        const changeForNextDay = !isNaN(paid) ? calc.payrollAmount - paid : calc.payrollAmount;

        const rawCarryIn = workerRawBalances[id] || 0;
        const taken = parseFloat(raw.rawMaterialTaken) || 0;
        const isPaid = !isNaN(paid) && paid > 0;
        const rawChangeForNextDay = (isPaid ? 0 : rawCarryIn) + taken;

        peelersComputed[id] = { ...raw, carryOver, ...calc, changeForNextDay, rawCarryIn, rawChangeForNextDay };
        workerBalances[id] = changeForNextDay;
        workerRawBalances[id] = rawChangeForNextDay;
      } else if (w.type === "general") {
        const raw = day.general[id] || {};
        const isPresent = !!raw.present;
        const wage = isPresent ? (parseFloat(raw.wage) || parseFloat(w.dailyWage) || 0) : 0;
        const payrollAmount = carryOver + wage;
        const paid = parseFloat(raw.amountPaid);
        const changeForNextDay = !isNaN(paid) ? payrollAmount - paid : payrollAmount;
        generalComputed[id] = { ...raw, carryOver, wage, isPresent, payrollAmount, changeForNextDay };
        workerBalances[id] = changeForNextDay;
      } else if (w.type === "divider") {
        const raw = day.dividers[id] || {};
        const isPresent = !!raw.present;
        const wage = isPresent ? (parseFloat(raw.wage) || parseFloat(w.dailyWage) || 0) : 0;
        const payrollAmount = carryOver + wage;
        const paid = parseFloat(raw.amountPaid);
        const changeForNextDay = !isNaN(paid) ? payrollAmount - paid : payrollAmount;
        dividersComputed[id] = { ...raw, carryOver, wage, isPresent, payrollAmount, changeForNextDay };
        workerBalances[id] = changeForNextDay;
      }
    });

    return { ...day, peelersComputed, generalComputed, dividersComputed };
  });
}

