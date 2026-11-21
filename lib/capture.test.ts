import { describe, it, expect } from "vitest";
import type { Customer, Invoice } from "./types";
import { parseCapture, pickInvoice } from "./capture";

const CUSTOMERS: Customer[] = [
  { id: "c-rahul", name: "Rahul Sharma", phone: "9800000001", plan: "Both", monthlyFee: 2400, startDate: "2025-01-01", status: "active", language: "en" },
  { id: "c-priya", name: "Priya Nair", phone: "9800000002", plan: "Lunch", monthlyFee: 1800, startDate: "2025-01-01", status: "active", language: "en" },
  { id: "c-suresh", name: "Suresh Kumar", phone: "9800000003", plan: "Dinner", monthlyFee: 1500, startDate: "2025-01-01", status: "active", language: "kn" },
];

const NOW = new Date(2026, 2, 15); // 15 March 2026 (local time)

describe("parseCapture", () => {
  it("reads 'Paid 2400 for Nov - Rahul'", () => {
    const r = parseCapture("Paid 2400 for Nov - Rahul", CUSTOMERS, NOW);
    expect(r.customerId).toBe("c-rahul");
    expect(r.customerName).toBe("Rahul Sharma");
    expect(r.amount).toBe(2400);
    expect(r.method).toBe("UPI");
    expect(r.month).toBe("2025-11");
    expect(r.confidence).toBe("high");
  });

  it("reads 'Rahul bhaiya ne 2,400 GPay kiya'", () => {
    const r = parseCapture("Rahul bhaiya ne 2,400 GPay kiya", CUSTOMERS, NOW);
    expect(r.customerId).toBe("c-rahul");
    expect(r.amount).toBe(2400);
    expect(r.method).toBe("UPI");
    expect(r.month).toBeNull();
    expect(r.confidence).toBe("high");
  });

  it("reads 'received 4200 cash from priya for dec'", () => {
    const r = parseCapture("received 4200 cash from priya for dec", CUSTOMERS, NOW);
    expect(r.customerId).toBe("c-priya");
    expect(r.customerName).toBe("Priya Nair");
    expect(r.amount).toBe(4200);
    expect(r.method).toBe("Cash");
    expect(r.month).toBe("2025-12");
    expect(r.confidence).toBe("high");
  });

  it("reads 'rahl paid rs 2.4k' with a typo in the name and k amounts", () => {
    const r = parseCapture("rahl paid rs 2.4k", CUSTOMERS, NOW);
    expect(r.customerId).toBe("c-rahul");
    expect(r.amount).toBe(2400);
    expect(r.confidence).toBe("high");
  });

  it("gives low confidence and no customer when no name matches", () => {
    const r = parseCapture("Paid 1500 today", CUSTOMERS, NOW);
    expect(r.customerId).toBeNull();
    expect(r.customerName).toBeNull();
    expect(r.amount).toBe(1500);
    expect(r.confidence).toBe("low");
  });

  it("reads 'this month' as the current month", () => {
    const r = parseCapture("Suresh paid 1500 this month", CUSTOMERS, NOW);
    expect(r.month).toBe("2026-03");
  });
});

describe("pickInvoice", () => {
  const inv = (id: string, billingMonth: string, amount: number, paid = 0): Invoice => ({
    id,
    customerId: "c-rahul",
    billingMonth,
    amount,
    issueDate: `${billingMonth}-01`,
    dueDate: `${billingMonth}-05`,
    payments: paid > 0 ? [{ id: `p-${id}`, amount: paid, date: `${billingMonth}-02`, method: "UPI" }] : [],
    reminders: [],
  });

  it("prefers the open invoice for the named month", () => {
    const invoices = [inv("a", "2025-10", 2400), inv("b", "2025-11", 2400)];
    expect(pickInvoice(invoices, "c-rahul", "2025-11", "2026-03-15")?.id).toBe("b");
  });

  it("falls back to the oldest open invoice when the month is paid or missing", () => {
    const invoices = [inv("a", "2025-10", 2400), inv("b", "2025-11", 2400, 2400)];
    expect(pickInvoice(invoices, "c-rahul", "2025-11", "2026-03-15")?.id).toBe("a");
  });

  it("returns null when nothing is open", () => {
    const invoices = [inv("a", "2025-10", 2400, 2400)];
    expect(pickInvoice(invoices, "c-rahul", null, "2026-03-15")).toBeNull();
  });
});
