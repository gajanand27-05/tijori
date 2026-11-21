import { describe, it, expect } from "vitest";
import { forecast } from "./forecast";
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
