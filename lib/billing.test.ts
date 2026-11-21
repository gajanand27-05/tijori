import { describe, expect, it } from "vitest";
import { planMonthlyInvoices, proRataFee } from "./billing";
import type { AppData, Customer, Invoice } from "./types";

const FEB = "2025-02"; // 28 days
const base: Customer = {
  id: "c1",
  name: "Rahul Bhatia",
  phone: "",
  plan: "Lunch",
  monthlyFee: 2400,
  startDate: "2024-01-01",
  status: "active",
  language: "en",
};

function data(customers: Customer[], invoices: Invoice[] = []): AppData {
  return {
    version: 1,
    business: { name: "Test", ownerName: "", city: "", cashInHand: 0, safetyBuffer: 0, defaultDueDays: 5 },
    customers,
    invoices,
    bills: [],
  };
}

describe("proRataFee", () => {
  it("returns the full fee when there is no pause", () => {
    expect(proRataFee(base, FEB)).toBe(2400);
  });

  it("prorates when the pause covers half the month", () => {
    const c = { ...base, status: "paused" as const, pauseFrom: "2025-02-01", pauseTo: "2025-02-14" };
    expect(proRataFee(c, FEB)).toBe(1200);
  });

  it("is 0 when the pause covers the whole month", () => {
    const c = { ...base, status: "paused" as const, pauseFrom: "2025-02-01", pauseTo: "2025-02-28" };
    expect(proRataFee(c, FEB)).toBe(0);
  });
});

describe("planMonthlyInvoices", () => {
  it("skips left customers", () => {
    expect(planMonthlyInvoices(data([{ ...base, status: "left" }]), FEB)).toHaveLength(0);
  });

  it("skips customers already billed for the month", () => {
    const existing: Invoice = {
      id: "i1",
      customerId: "c1",
      billingMonth: FEB,
      amount: 2400,
      issueDate: "2025-02-01",
      dueDate: "2025-02-06",
      payments: [],
      reminders: [],
    };
    expect(planMonthlyInvoices(data([base], [existing]), FEB)).toHaveLength(0);
  });

  it("does not let a one-off invoice block the monthly bill", () => {
    const oneOff: Invoice = {
      id: "i2",
      customerId: "c1",
      billingMonth: FEB,
      description: "Party order",
      amount: 500,
      issueDate: "2025-02-01",
      dueDate: "2025-02-10",
      payments: [],
      reminders: [],
    };
    expect(planMonthlyInvoices(data([base], [oneOff]), FEB)).toHaveLength(1);
  });

  it("skips customers whose pause covers the whole month", () => {
    const c = { ...base, status: "paused" as const, pauseFrom: "2025-02-01", pauseTo: "2025-02-28" };
    expect(planMonthlyInvoices(data([c]), FEB)).toHaveLength(0);
  });

  it("issues on the 1st and is due on the 6th by default", () => {
    const [inv] = planMonthlyInvoices(data([base]), FEB);
    expect(inv.issueDate).toBe("2025-02-01");
    expect(inv.dueDate).toBe("2025-02-06");
    expect(inv.amount).toBe(2400);
  });
});
