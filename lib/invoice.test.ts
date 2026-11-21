import { describe, it, expect } from "vitest";
import type { Invoice, Payment } from "./types";
import { amountOutstanding, daysOverdue, getInvoiceStatus } from "./invoice";

function makeInvoice(amount: number, payments: Payment[] = []): Invoice {
  return {
    id: "inv-test",
    customerId: "cust-test",
    billingMonth: "2026-03",
    amount,
    issueDate: "2026-03-01",
    dueDate: "2026-03-06",
    payments,
    reminders: [],
  };
}

const payment = (amount: number, date = "2026-03-02"): Payment => ({
  id: `pay-${amount}-${date}`,
  amount,
  date,
  method: "UPI",
});

describe("getInvoiceStatus", () => {
  it("is paid when nothing is outstanding", () => {
    const inv = makeInvoice(1000, [payment(1000)]);
    expect(getInvoiceStatus(inv, "2026-03-03")).toBe("paid");
  });

  it("is partial when part-paid and not yet due", () => {
    const inv = makeInvoice(1000, [payment(400)]);
    expect(getInvoiceStatus(inv, "2026-03-03")).toBe("partial");
  });

  it("is due when unpaid and not yet due", () => {
    const inv = makeInvoice(1000);
    expect(getInvoiceStatus(inv, "2026-03-03")).toBe("due");
  });

  it("is due on the due date itself (not overdue)", () => {
    const inv = makeInvoice(1000);
    expect(getInvoiceStatus(inv, "2026-03-06")).toBe("due");
  });

  it("is overdue when unpaid after the due date", () => {
    const inv = makeInvoice(1000);
    expect(getInvoiceStatus(inv, "2026-03-07")).toBe("overdue");
  });

  it("is overdue when part-paid and past the due date", () => {
    const inv = makeInvoice(1000, [payment(400)]);
    expect(getInvoiceStatus(inv, "2026-03-10")).toBe("overdue");
  });
});

describe("daysOverdue", () => {
  it("is 0 when paid and on the due date", () => {
    const inv = makeInvoice(1000, [payment(1000)]);
    expect(daysOverdue(inv, "2026-03-06")).toBe(0);
  });

  it("is 0 when paid even if past the due date", () => {
    const inv = makeInvoice(1000, [payment(1000)]);
    expect(daysOverdue(inv, "2026-03-20")).toBe(0);
  });

  it("is 0 on the due date when unpaid", () => {
    const inv = makeInvoice(1000);
    expect(daysOverdue(inv, "2026-03-06")).toBe(0);
  });

  it("counts whole days past the due date when unpaid", () => {
    const inv = makeInvoice(1000);
    expect(daysOverdue(inv, "2026-03-09")).toBe(3);
  });

  it("counts days across a month boundary", () => {
    const inv = makeInvoice(1000);
    expect(daysOverdue(inv, "2026-04-05")).toBe(30);
  });
});

describe("amountOutstanding", () => {
  it("is the invoice amount minus payments", () => {
    const inv = makeInvoice(1000, [payment(250), payment(250)]);
    expect(amountOutstanding(inv)).toBe(500);
  });

  it("never goes below 0 when overpaid", () => {
    const inv = makeInvoice(1000, [payment(1500)]);
    expect(amountOutstanding(inv)).toBe(0);
  });
});
