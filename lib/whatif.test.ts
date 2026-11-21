import { describe, it, expect } from "vitest";
import type { AppData, Customer, Invoice } from "./types";
import { chasePlan } from "./whatif";

const TODAY = "2025-03-31";

function customer(id: string): Customer {
  return {
    id,
    name: `Customer ${id}`,
    phone: "9999999999",
    plan: "Both",
    monthlyFee: 0,
    startDate: "2025-01-01",
    status: "active",
    language: "en",
  };
}

function invoice(id: string, customerId: string, amount: number, dueDate: string): Invoice {
  return {
    id,
    customerId,
    billingMonth: "2025-03",
    amount,
    issueDate: "2025-03-01",
    dueDate,
    payments: [],
    reminders: [],
  };
}

function data(customers: Customer[], invoices: Invoice[]): AppData {
  return {
    version: 1,
    business: {
      name: "Test Tiffin",
      ownerName: "Owner",
      city: "Bengaluru",
      cashInHand: 0,
      safetyBuffer: 0,
      defaultDueDays: 7,
    },
    customers,
    invoices,
    bills: [],
  };
}

// Overdue days as of TODAY, and chasePriority (no reminders, so score = owed * (1 + days/30)):
//   A: owed 100, 89 days overdue -> ~397
//   B: owed 500, 11 days overdue -> ~683
//   C: owed 300, 58 days overdue -> ~880
// chasePriority order: C, B, A.  Input order: A, B, C.  customerDues order (oldest due first): A, C, B.
const A = customer("A");
const B = customer("B");
const C = customer("C");
const invA = invoice("ia", "A", 100, "2025-01-01");
const invB = invoice("ib", "B", 500, "2025-03-20");
const invC = invoice("ic", "C", 300, "2025-02-01");

describe("chasePlan", () => {
  it("returns an empty plan when nobody is overdue", () => {
    const d = data([A], []);
    expect(chasePlan(d, TODAY, 100)).toEqual({ customerIds: [], total: 0 });
  });

  it("returns an empty plan for a shortfall of 0", () => {
    const d = data([A, B, C], [invA, invB, invC]);
    expect(chasePlan(d, TODAY, 0)).toEqual({ customerIds: [], total: 0 });
  });

  it("stops at the prefix whose total exactly equals the shortfall", () => {
    const d = data([A, B, C], [invA, invB, invC]);
    expect(chasePlan(d, TODAY, 300)).toEqual({ customerIds: ["C"], total: 300 });
  });

  it("returns everyone when the shortfall exceeds the total owed", () => {
    const d = data([A, B, C], [invA, invB, invC]);
    const plan = chasePlan(d, TODAY, 1000);
    expect(plan.total).toBe(900);
    expect([...plan.customerIds].sort()).toEqual(["A", "B", "C"]);
  });

  it("follows chasePriority order, not input or due-date order", () => {
    const d = data([A, B, C], [invA, invB, invC]);
    expect(chasePlan(d, TODAY, 301)).toEqual({ customerIds: ["C", "B"], total: 800 });
  });
});
