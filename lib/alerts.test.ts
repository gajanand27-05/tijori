import { describe, it, expect } from "vitest";
import type { AppData, Bill, Customer, Invoice, Payment, Reminder } from "./types";
import { buildAlerts } from "./alerts";
import type { Alert, AlertKind } from "./alerts";

const TODAY = "2025-12-03";

function customer(id: string, name: string, monthlyFee = 0): Customer {
  return {
    id,
    name,
    phone: "9999999999",
    plan: "Both",
    monthlyFee,
    startDate: "2025-01-01",
    status: "active",
    language: "en",
  };
}

function invoice(
  id: string,
  customerId: string,
  amount: number,
  dueDate: string,
  extra: { payments?: Payment[]; reminders?: Reminder[] } = {},
): Invoice {
  return {
    id,
    customerId,
    billingMonth: "2025-11",
    amount,
    issueDate: "2025-11-01",
    dueDate,
    payments: extra.payments ?? [],
    reminders: extra.reminders ?? [],
  };
}

function reminder(id: string, date: string): Reminder {
  return { id, date, tone: "gentle", language: "en" };
}

function payment(id: string, amount: number, date: string): Payment {
  return { id, amount, date, method: "UPI" };
}

function data(
  overrides: { cashInHand?: number; safetyBuffer?: number; customers?: Customer[]; invoices?: Invoice[]; bills?: Bill[] } = {},
): AppData {
  return {
    version: 1,
    business: {
      name: "Test Tiffin",
      ownerName: "Owner",
      city: "Bengaluru",
      cashInHand: overrides.cashInHand ?? 100000,
      safetyBuffer: overrides.safetyBuffer ?? 0,
      defaultDueDays: 7,
    },
    customers: overrides.customers ?? [],
    invoices: overrides.invoices ?? [],
    bills: overrides.bills ?? [],
  };
}

function ofKind(alerts: Alert[], kind: AlertKind): Alert[] {
  return alerts.filter((a) => a.kind === kind);
}

describe("buildAlerts", () => {
  it("returns an empty list when there is nothing to say", () => {
    // Mid-month, no customers, bills, invoices or payments, and cash above the (zero) buffer.
    expect(buildAlerts(data(), "2025-12-15")).toEqual([]);
  });

  it("emits a shortfall alert for the first day below the buffer, chasing a customer who covers it", () => {
    // Rahul owes 20,000 overdue (due 1 Nov). Cash 10,000, buffer 5,000, rent 15,000 on 5 Dec -> balance -5,000.
    const d = data({
      cashInHand: 10000,
      safetyBuffer: 5000,
      customers: [customer("c1", "Rahul Bhatia")],
      invoices: [invoice("i1", "c1", 20000, "2025-11-01")],
      bills: [
        {
          id: "b1",
          name: "Rent",
          category: "rent",
          amount: 15000,
          recurrence: { type: "monthly", day: 5 },
        },
      ],
    });
    const shortfalls = ofKind(buildAlerts(d, TODAY), "shortfall");
    expect(shortfalls).toHaveLength(1);
    const a = shortfalls[0];
    expect(a.priority).toBe(1);
    expect(a.title).toBe("Rent ₹15,000 is due on 5 Dec.");
    expect(a.detail).toBe("You'll be ₹5,000 short. Chasing this one covers it.");
    expect(a.action).toEqual({ label: "Chase all 1", type: "chase", payload: { customerIds: ["c1"] } });
  });

  it("says chasing will not cover a shortfall and omits the action", () => {
    // Cash 10,000, buffer 5,000, rent 8,000 on 5 Dec -> lowest 2,000. Nobody owes anything.
    const d = data({
      cashInHand: 10000,
      safetyBuffer: 5000,
      bills: [{ id: "b1", name: "Rent", category: "rent", amount: 8000, recurrence: { type: "monthly", day: 5 } }],
    });
    const [a] = ofKind(buildAlerts(d, TODAY), "shortfall");
    expect(a.detail).toBe("You'll have only ₹2,000 left, below your ₹5,000 buffer. Chasing overdue customers won't cover it alone.");
    expect(a.action).toBeUndefined();
  });

  it("emits a chase alert for an overdue, never-reminded customer with a gentle reminder", () => {
    const d = data({
      customers: [customer("c1", "Rahul Bhatia")],
      invoices: [invoice("i1", "c1", 20000, "2025-11-01")],
    });
    const [a] = ofKind(buildAlerts(d, TODAY), "chase");
    expect(a.id).toBe("chase-c1");
    expect(a.priority).toBe(2);
    expect(a.title).toBe("Chase Rahul Bhatia today: ₹20,000, 32 days late, never reminded.");
    expect(a.detail).toBe("Oldest bill due 1 Nov.");
    expect(a.action).toEqual({ label: "Send reminder", type: "remind", payload: { customerId: "c1", tone: "gentle" } });
  });

  it("uses a firm tone when an earlier reminder is more than 5 days old", () => {
    const d = data({
      customers: [customer("c1", "Rahul Bhatia")],
      invoices: [invoice("i1", "c1", 20000, "2025-11-01", { reminders: [reminder("r1", "2025-11-20")] })],
    });
    const [a] = ofKind(buildAlerts(d, TODAY), "chase");
    expect(a.title).toBe("Chase Rahul Bhatia today: ₹20,000, 32 days late, last reminded 13 days ago.");
    expect(a.action?.payload).toEqual({ customerId: "c1", tone: "firm" });
  });

  it("skips a customer reminded within the last 2 days", () => {
    const d = data({
      customers: [customer("c1", "Rahul Bhatia")],
      invoices: [invoice("i1", "c1", 20000, "2025-11-01", { reminders: [reminder("r1", "2025-12-02")] })],
    });
    expect(ofKind(buildAlerts(d, TODAY), "chase")).toEqual([]);
  });

  it("emits a follow-up for a customer who has not paid 5+ days after a reminder, not due yet", () => {
    const d = data({
      customers: [customer("c2", "Priya")],
      invoices: [invoice("i2", "c2", 3000, "2025-12-10", { reminders: [reminder("r2", "2025-11-27")] })],
    });
    const alerts = buildAlerts(d, TODAY);
    const [a] = ofKind(alerts, "followUp");
    expect(a.id).toBe("followUp-c2");
    expect(a.priority).toBe(3);
    expect(a.title).toBe("Priya hasn't paid 6 days after your reminder.");
    expect(a.action).toEqual({
      label: "Send firm reminder",
      type: "remind",
      payload: { customerId: "c2", tone: "firm" },
    });
    expect(ofKind(alerts, "chase")).toEqual([]);
  });

  it("does not repeat a customer already in the chase list as a follow-up", () => {
    const d = data({
      customers: [customer("c1", "Rahul Bhatia")],
      invoices: [invoice("i1", "c1", 20000, "2025-11-01", { reminders: [reminder("r1", "2025-11-20")] })],
    });
    const alerts = buildAlerts(d, TODAY);
    expect(ofKind(alerts, "chase").map((a) => a.id)).toEqual(["chase-c1"]);
    expect(ofKind(alerts, "followUp")).toEqual([]);
  });

  it("lists bills due in the next 3 days, soonest first, capped at 3", () => {
    const oneOff = (id: string, name: string, amount: number, date: string): Bill => ({
      id,
      name,
      category: "other",
      amount,
      recurrence: { type: "oneOff", date },
    });
    const d = data({
      bills: [
        oneOff("b-old", "Old bill", 100, "2025-12-02"),
        oneOff("b-milk", "Milk", 300, "2025-12-03"),
        oneOff("b-net", "Internet", 999, "2025-12-04"),
        oneOff("b-gas", "Gas cylinder", 1750, "2025-12-05"),
        oneOff("b-water", "Water", 450, "2025-12-06"),
      ],
    });
    const bills = ofKind(buildAlerts(d, TODAY), "billSoon");
    expect(bills.map((a) => a.title)).toEqual([
      "Milk ₹300 due today.",
      "Internet ₹999 due tomorrow.",
      "Gas cylinder ₹1,750 due in 2 days.",
    ]);
    expect(bills[0].priority).toBe(4);
    expect(bills[0].action).toEqual({ label: "View bills", type: "link", payload: { href: "/app/bills" } });
  });

  it("offers to generate this month's bills in the first week, when the planner has invoices", () => {
    const d = data({ customers: [customer("c3", "Kiran", 1500)] });
    const [a] = ofKind(buildAlerts(d, TODAY), "monthStart");
    expect(a.title).toBe("Generate December bills");
    expect(a.priority).toBe(5);
    expect(a.detail).toBe("1 customer, ₹1,500 to send on 1 Dec.");
    expect(a.action).toEqual({
      label: "Generate December bills",
      type: "generateInvoices",
      payload: { month: "2025-12" },
    });
    // Outside the first 7 days, no prompt.
    expect(ofKind(buildAlerts(d, "2025-12-15"), "monthStart")).toEqual([]);
  });

  it("reports yesterday's and today's payments as good news, with no action", () => {
    const d = data({
      customers: [customer("c4", "Anil")],
      invoices: [
        invoice("i4", "c4", 3800, "2025-11-30", {
          payments: [payment("p1", 2400, "2025-12-03"), payment("p2", 500, "2025-12-02"), payment("p3", 900, "2025-12-01")],
        }),
      ],
    });
    const news = ofKind(buildAlerts(d, TODAY), "goodNews");
    expect(news.map((a) => a.title).sort()).toEqual(["Anil paid ₹2,400 today.", "Anil paid ₹500 yesterday."]);
    for (const a of news) expect(a.action).toBeUndefined();
  });

  it("returns alerts in kind order shortfall, chase, followUp, billSoon, monthStart, goodNews", () => {
    const d = data({
      cashInHand: 10000,
      safetyBuffer: 5000,
      customers: [customer("c1", "Rahul Bhatia"), customer("c2", "Priya"), customer("c4", "Anil")],
      invoices: [
        invoice("i1", "c1", 20000, "2025-11-01"),
        invoice("i2", "c2", 3000, "2025-12-10", { reminders: [reminder("r2", "2025-11-27")] }),
        invoice("i4", "c4", 2400, "2025-11-30", { payments: [payment("p4", 2400, "2025-12-03")] }),
      ],
      bills: [
        { id: "b-rent", name: "Rent", category: "rent", amount: 15000, recurrence: { type: "monthly", day: 5 } },
        { id: "b-gas", name: "Gas cylinder", category: "gas", amount: 1750, recurrence: { type: "oneOff", date: "2025-12-04" } },
      ],
    });
    const alerts = buildAlerts(d, TODAY);
    expect(alerts.map((a) => a.kind)).toEqual(["shortfall", "chase", "followUp", "billSoon", "billSoon", "goodNews"]);
    expect(alerts.map((a) => a.priority)).toEqual([1, 2, 3, 4, 4, 6]);
    expect(new Set(alerts.map((a) => a.id)).size).toBe(alerts.length);
  });
});
