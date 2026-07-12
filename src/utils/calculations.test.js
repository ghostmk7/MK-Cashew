import { describe, it, expect } from 'vitest';
import { calcPeelerRow, computeAll } from './calculations';

describe('calcPeelerRow', () => {
  const settings = { defaultRate: 3000 };

  it('should calculate payroll properly without inputs but with carry over', () => {
    const result = calcPeelerRow({}, 5000, settings);
    expect(result.payrollAmount).toBe(5000);
    expect(result.totalAmountGotten).toBe(0);
    expect(result.percentPct).toBe(null);
  });

  it('should correctly calculate total and payroll for a peeler', () => {
    const raw = {
      amountTaken: "20",
      rotten: "2",
      alonePlusAwarLone: "15"
    };
    const carryOver = 1000;
    
    const result = calcPeelerRow(raw, carryOver, settings);
    expect(result.totalAmountGotten).toBe(18);
    expect(result.percentPct).toBeCloseTo(0.8333, 4);
    expect(result.payrollAmount).toBe(55000);
    expect(result.rate).toBe(3000);
  });

  it('should use custom rate if provided', () => {
    const raw = {
      amountTaken: "10",
      rotten: "0",
      priceRate: "2800"
    };
    const result = calcPeelerRow(raw, 0, settings);
    expect(result.payrollAmount).toBe(28000);
    expect(result.rate).toBe(2800);
  });
});

describe('computeAll', () => {
  const workers = [
    { id: 1, type: 'peeler', active: true },
    { id: 2, type: 'general', dailyWage: 15000, active: true },
    { id: 3, type: 'divider', dailyWage: 10000, active: true }
  ];

  const settings = {
    openingBalances: { 1: 5000, 2: 1000, 3: 0 },
    defaultRate: 3000
  };

  it('should compute balances across days correctly', () => {
    const rawDays = [
      {
        date: "2024-01-01",
        peelers: { 1: { amountTaken: "10", amountPaid: "10000" } },
        general: { 2: { present: true, amountPaid: "5000" } },
        dividers: { 3: { present: true, amountPaid: "0" } }
      },
      {
        date: "2024-01-02",
        peelers: { 1: { amountTaken: "5", amountPaid: "0" } },
        general: { 2: { present: false, amountPaid: "0" } },
        dividers: { 3: { present: true, amountPaid: "20000" } }
      }
    ];

    const computed = computeAll(rawDays, workers, settings);

    expect(computed[0].peelersComputed[1].payrollAmount).toBe(35000);
    expect(computed[0].peelersComputed[1].changeForNextDay).toBe(25000);
    expect(computed[0].generalComputed[2].payrollAmount).toBe(16000);
    expect(computed[0].generalComputed[2].changeForNextDay).toBe(11000);
    expect(computed[0].dividersComputed[3].payrollAmount).toBe(10000);
    expect(computed[0].dividersComputed[3].changeForNextDay).toBe(10000);

    expect(computed[1].peelersComputed[1].carryOver).toBe(25000);
    expect(computed[1].peelersComputed[1].payrollAmount).toBe(40000);
    expect(computed[1].generalComputed[2].carryOver).toBe(11000);
    expect(computed[1].generalComputed[2].payrollAmount).toBe(11000);
    expect(computed[1].dividersComputed[3].carryOver).toBe(10000);
    expect(computed[1].dividersComputed[3].payrollAmount).toBe(20000);
    expect(computed[1].dividersComputed[3].changeForNextDay).toBe(0);
  });
});
