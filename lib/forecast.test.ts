import { describe, it, expect } from "vitest";
import { forecast, compareToBaseline } from "./forecast";
import type { AppData } from "./types";
import { buildSeedData } from "./seed";

type Cust = AppData["customers"][number];
type Inv = AppData["invoices"][number];
type Bill = AppData["bills"][number];
type Result = ReturnType<typeof forecast>;

const biz = {
  name: "T",
  ownerName: "O",
  city: "C",
  cashInHand: 1000,
  safetyBuffer: 300,
  defaultDueDays: 5,
};

function cust(id: string, name: string, status: Cust["status"], monthlyFee = 500): Cust {
  return { id, name, phone: "", plan: "Lunch", monthlyFee, startDate: "2024-06-01", status, language: "en" };
}

function inv(id: string, customerId: string, amount: number, issueDate: string, dueDate: string, billingMonth: string): Inv {
  return { id, customerId, billingMonth, amount, issueDate, dueDate, payments: [], reminders: [] };
}

function day(r: Result, date: string) {
  const d = r.daily.find((x) => x.date === date);
  if (!d) throw new Error(`no daily entry for ${date}`);
  return d;
}

const rent: Bill = { id: "rent", name: "Rent", category: "rent", amount: 200, recurrence: { type: "monthly", day: 14 } };

const seedData = buildSeedData("2026-11-21");

describe("forecast", () => {
  it("two customers, one bill, exact balances", () => {
    const data: AppData = {
      version: 1,
      business: biz,
      customers: [cust("cA", "Asha", "active"), cust("cB", "Bilal", "active"), cust("cL", "Left Person", "left", 800)],
      invoices: [
        inv("iA", "cA", 500, "2025-03-01", "2025-03-12", "2025-03"),
        inv("iL", "cL", 800, "2025-03-01", "2025-03-08", "2025-03"),
      ],
      bills: [{ ...rent, recurrence: { type: "monthly", day: 14 } }],
    };
    const r = forecast({ data, today: "2025-03-10", days: 10 });
    expect(day(r, "2025-03-10").balance).toBe(1000);
    expect(day(r, "2025-03-14").balance).toBe(800);
    expect(day(r, "2025-03-15").balance).toBe(1300);
    expect(day(r, "2025-03-20").balance).toBe(1300);
    expect(r.totalIn).toBe(500);
    expect(r.totalOut).toBe(200);
    expect(r.lowest).toEqual({ balance: 800, date: "2025-03-14" });
    expect(r.firstBelowBuffer).toBeNull();
    expect(r.firstBelowZero).toBeNull();
    const labels = r.daily.flatMap((d) => d.items.map((i) => i.label));
    expect(labels.some((l) => l.includes("Left Person"))).toBe(false);
  });

  it("past-expected date is moved forward", () => {
    const data: AppData = {
      version: 1,
      business: biz,
      customers: [cust("cA", "Asha", "active")],
      invoices: [inv("iA", "cA", 500, "2025-03-01", "2025-03-01", "2025-03")],
      bills: [],
    };
    const r = forecast({ data, today: "2025-03-10", days: 10 });
    expect(day(r, "2025-03-13").items.some((i) => i.kind === "in" && i.amount === 500)).toBe(true);
    expect(day(r, "2025-03-10").items.some((i) => i.kind === "in")).toBe(false);
    expect(r.daily.find((d) => d.date === "2025-03-04")).toBeUndefined();
    expect(r.totalIn).toBe(500);
  });

  it("month boundary: planned February invoice and monthly rent", () => {
    const base = { ...biz, cashInHand: 0, safetyBuffer: 0, defaultDueDays: 5 };
    const d1: AppData = { version: 1, business: base, customers: [cust("cM", "M", "active", 1000)], invoices: [], bills: [] };

    const r1 = forecast({ data: d1, today: "2025-01-28", days: 10 });
    expect(r1.totalIn).toBe(0);
    expect(day(r1, "2025-01-28").balance).toBe(0);
    expect(day(r1, "2025-01-31").balance).toBe(0);

    const d2: AppData = { ...d1, bills: [{ id: "rent", name: "Rent", category: "rent", amount: 300, recurrence: { type: "monthly", day: 1 } }] };
    const r2 = forecast({ data: d2, today: "2025-01-28", days: 15 });
    expect(r2.totalIn).toBe(1000);
    expect(day(r2, "2025-02-09").items.some((i) => i.kind === "in" && i.amount === 1000)).toBe(true);
    expect(day(r2, "2025-02-01").items.some((i) => i.kind === "in")).toBe(false);
    expect(day(r2, "2025-02-01").items.some((i) => i.kind === "out" && i.amount === 300)).toBe(true);
    expect(day(r2, "2025-02-01").balance).toBe(day(r2, "2025-01-31").balance - 300);
    expect(day(r2, "2025-01-31").balance).toBe(0);
  });
});

describe("forecast on seed data", () => {
  it("seed stays safe: lowest balance is >= 0 and below safetyBuffer + 6000", () => {
    const r = forecast({ data: seedData, today: "2026-11-21", days: 30 });
    expect(r.lowest.balance).toBeGreaterThanOrEqual(0);
    expect(r.lowest.balance).toBeLessThan(seedData.business.safetyBuffer + 6000);
  });

  it("assumptions are non-empty strings and the first starts with 'Starting cash:'", () => {
    const r = forecast({ data: seedData, today: "2026-11-21", days: 30 });
    expect(r.assumptions.length).toBeGreaterThan(0);
    expect(r.assumptions.every((a) => typeof a === "string" && a.trim().length > 0)).toBe(true);
    expect(r.assumptions[0].startsWith("Starting cash:")).toBe(true);
  });
});

describe("what-if scenarios", () => {
  it("latePayers: the top payer by fee is pushed past the window", () => {
    const data: AppData = {
      version: 1,
      business: biz,
      customers: [cust("cA", "Asha", "active", 500), cust("cB", "Bilal", "active", 300)],
      invoices: [
        inv("iA", "cA", 500, "2025-03-01", "2025-03-12", "2025-03"),
        inv("iB", "cB", 300, "2025-03-01", "2025-03-12", "2025-03"),
      ],
      bills: [],
    };
    const base = forecast({ data, today: "2025-03-10", days: 10 });
    expect(base.totalIn).toBe(800);
    const r = forecast({ data, today: "2025-03-10", days: 10, scenario: { latePayers: { topN: 1, days: 7 } } });
    expect(r.totalIn).toBe(300);
    expect(day(r, "2025-03-15").balance).toBe(1300);
    expect(r.daily.flatMap((d) => d.items).some((i) => i.label.includes("Asha"))).toBe(false);
  });

  it("cancellations: the least reliable active customer sends no invoices from next month", () => {
    const history = { ...inv("iOld", "cA", 500, "2025-02-05", "2025-02-05", "2025-02"), payments: [{ id: "p1", amount: 500, date: "2025-02-15", method: "UPI" as const }] };
    const data: AppData = {
      version: 1,
      business: biz,
      customers: [cust("cA", "Asha", "active", 500), cust("cB", "Bilal", "active", 300)],
      invoices: [history],
      bills: [],
    };
    const base = forecast({ data, today: "2025-03-10", days: 40 });
    expect(base.totalIn).toBe(800);
    const r = forecast({ data, today: "2025-03-10", days: 40, scenario: { cancellations: { n: 1 } } });
    expect(r.totalIn).toBe(300);
    expect(r.daily.flatMap((d) => d.items).some((i) => i.label.includes("Asha"))).toBe(false);
    expect(r.daily.flatMap((d) => d.items).some((i) => i.label.includes("Bilal"))).toBe(true);
  });

  it("costSpike: every occurrence of the category costs more, other bills do not", () => {
    const gas: Bill = { id: "gas", name: "Gas", category: "gas", amount: 100, recurrence: { type: "monthly", day: 12 } };
    const data: AppData = { version: 1, business: biz, customers: [], invoices: [], bills: [rent, gas] };
    const base = forecast({ data, today: "2025-03-10", days: 40 });
    expect(base.totalOut).toBe(600);
    const r = forecast({ data, today: "2025-03-10", days: 40, scenario: { costSpike: { category: "rent", percent: 50 } } });
    expect(r.totalOut).toBe(800);
    expect(day(r, "2025-03-14").items.some((i) => i.kind === "out" && i.amount === 300)).toBe(true);
    expect(day(r, "2025-04-14").items.some((i) => i.kind === "out" && i.amount === 300)).toBe(true);
    expect(day(r, "2025-04-12").items.some((i) => i.kind === "out" && i.amount === 100)).toBe(true);
  });

  it("festivalPause: the lowest-fee customer's future invoice shrinks pro rata", () => {
    const data: AppData = {
      version: 1,
      business: biz,
      customers: [cust("cA", "Asha", "active", 500), cust("cB", "Bilal", "active", 300)],
      invoices: [],
      bills: [],
    };
    const base = forecast({ data, today: "2025-03-10", days: 40 });
    expect(base.totalIn).toBe(800);
    const r = forecast({
      data,
      today: "2025-03-10",
      days: 40,
      scenario: { festivalPause: { n: 1, days: 15, startDate: "2025-04-01" } },
    });
    // Bilal (fee 300) pauses 1–15 April: 15 of 30 days, so his April invoice is 150.
    expect(r.totalIn).toBe(650);
    expect(day(r, "2025-04-09").items.some((i) => i.kind === "in" && i.amount === 150)).toBe(true);
    expect(day(r, "2025-04-09").items.some((i) => i.kind === "in" && i.amount === 500)).toBe(true);
  });
});

describe("compareToBaseline", () => {
  it("reports shortfall, lowest delta and first day below zero", () => {
    const data: AppData = { version: 1, business: biz, customers: [], invoices: [], bills: [rent] };
    const base = forecast({ data, today: "2025-03-10", days: 10 });
    expect(base.lowest).toEqual({ balance: 800, date: "2025-03-14" });
    // Rent 200 becomes 2200 (+1000%): balance on 14 Mar is 1000 - 2200 = -1200.
    const r = forecast({ data, today: "2025-03-10", days: 10, scenario: { costSpike: { category: "rent", percent: 1000 } } });
    expect(compareToBaseline(base, r)).toEqual({ shortfall: 1200, lowestDelta: -2000, firstBelowZero: "2025-03-14" });
  });

  it("a forecast compared with itself has no shortfall and no delta", () => {
    const data: AppData = { version: 1, business: biz, customers: [], invoices: [], bills: [rent] };
    const base = forecast({ data, today: "2025-03-10", days: 10 });
    expect(compareToBaseline(base, base)).toEqual({ shortfall: 0, lowestDelta: 0, firstBelowZero: null });
  });
});

describe("what-if scenarios on seed data", () => {
  it("latePayers top 3 paying 15 days late takes the balance below zero", () => {
    const r = forecast({ data: seedData, today: "2026-11-21", days: 30, scenario: { latePayers: { topN: 3, days: 15 } } });
    expect(r.firstBelowZero).not.toBeNull();
  });
});

