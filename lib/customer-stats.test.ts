import { describe, it, expect } from "vitest";
import type { Invoice, Payment } from "./types";
import { averageDelayDays } from "./customer-stats";

const CUSTOMER = "cust-test";

function makeInvoice(
  amount: number,
  payments: Payment[] = [],
  overrides: Partial<Invoice> = {},
): Invoice {
  return {
    id: `inv-${Math.random().toString(36).slice(2)}`,
    customerId: CUSTOMER,
    billingMonth: "2026-03",
    amount,
    issueDate: "2026-03-01",
    dueDate: "2026-03-06",
    payments,
    reminders: [],
    ...overrides,
  };
}

const payment = (amount: number, date: string): Payment => ({
  id: `pay-${date}-${amount}`,
  amount,
  date,
  method: "UPI",
});

describe("averageDelayDays", () => {
  it("defaults to 3 when there is no history", () => {
    expect(averageDelayDays(CUSTOMER, [])).toBe(3);
  });

  it("defaults to 3 when the customer has only unpaid invoices", () => {
    const invoices = [makeInvoice(1000)];
    expect(averageDelayDays(CUSTOMER, invoices)).toBe(3);
  });

  it("counts an early payment as 0 days", () => {
    const invoices = [makeInvoice(1000, [payment(1000, "2026-03-02")])];
    expect(averageDelayDays(CUSTOMER, invoices)).toBe(0);
  });

  it("counts a payment on the due date as 0 days", () => {
    const invoices = [makeInvoice(1000, [payment(1000, "2026-03-06")])];
    expect(averageDelayDays(CUSTOMER, invoices)).toBe(0);
  });

  it("measures lateness from the due date to the payment date", () => {
    const invoices = [makeInvoice(1000, [payment(1000, "2026-03-16")])];
    expect(averageDelayDays(CUSTOMER, invoices)).toBe(10);
  });

  it("ignores unpaid invoices", () => {
    const invoices = [
      makeInvoice(1000, [payment(1000, "2026-03-16")]),
      makeInvoice(1000),
    ];
    expect(averageDelayDays(CUSTOMER, invoices)).toBe(10);
  });

  it("ignores part-paid invoices", () => {
    const invoices = [
      makeInvoice(1000, [payment(400, "2026-03-30")]),
      makeInvoice(1000, [payment(1000, "2026-03-09")]),
    ];
    expect(averageDelayDays(CUSTOMER, invoices)).toBe(3);
  });

  it("uses the latest payment date when an invoice has two payments", () => {
    const invoices = [
      makeInvoice(1000, [
        payment(500, "2026-03-08"),
        payment(500, "2026-03-10"),
      ]),
    ];
    expect(averageDelayDays(CUSTOMER, invoices)).toBe(4);
  });

  it("ignores invoices belonging to other customers", () => {
    const invoices = [
      makeInvoice(1000, [payment(1000, "2026-03-16")], { customerId: "cust-other" }),
    ];
    expect(averageDelayDays(CUSTOMER, invoices)).toBe(3);
  });
});
