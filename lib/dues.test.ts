import { describe, it, expect } from "vitest";
import type { AppData, Customer, Invoice, Payment, Reminder } from "./types";
import {
  bucketFor,
  chasePriority,
  customerDues,
  duesSummary,
  type CustomerDue,
} from "./dues";

const TODAY = "2025-03-31";

function customer(id: string, status: Customer["status"] = "active"): Customer {
  return {
    id,
    name: `Customer ${id}`,
    phone: "9999999999",
    plan: "Both",
    monthlyFee: 0,
    startDate: "2025-01-01",
    status,
    language: "en",
  };
}

function payment(id: string, amount: number, date: string): Payment {
  return { id, amount, date, method: "UPI" };
}

function reminder(id: string, date: string): Reminder {
  return { id, date, tone: "gentle", language: "en" };
}

function invoice(
  id: string,
  customerId: string,
  amount: number,
  dueDate: string,
  payments: Payment[] = [],
  reminders: Reminder[] = [],
): Invoice {
  return {
    id,
    customerId,
    billingMonth: "2025-03",
    amount,
    issueDate: "2025-03-01",
    dueDate,
    payments,
    reminders,
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

describe("bucketFor", () => {
  it("maps day counts to buckets at the boundaries", () => {
    expect(bucketFor(0)).toBe("notDue");
    expect(bucketFor(1)).toBe("1-7");
    expect(bucketFor(7)).toBe("1-7");
    expect(bucketFor(8)).toBe("8-30");
    expect(bucketFor(30)).toBe("8-30");
    expect(bucketFor(31)).toBe("30+");
  });
});

describe("customerDues buckets", () => {
  // Due dates are 0, 1, 7, 8, 30 and 31 days before TODAY (2025-03-31).
  it.each([
    ["2025-03-31", "notDue"], // 0 days: due today
    ["2025-03-30", "1-7"], // 1 day
    ["2025-03-24", "1-7"], // 7 days
    ["2025-03-23", "8-30"], // 8 days
    ["2025-03-01", "8-30"], // 30 days
    ["2025-02-28", "30+"], // 31 days
  ])("due %s is bucket %s", (dueDate, bucket) => {
    const d = data([customer("c1")], [invoice("i1", "c1", 500, dueDate)]);
    const [entry] = customerDues(d, TODAY);
    expect(entry.bucket).toBe(bucket);
  });

  it("reports 0 daysOverdue when the due date is today", () => {
    const d = data([customer("c1")], [invoice("i1", "c1", 500, "2025-03-31")]);
    expect(customerDues(d, TODAY)[0].daysOverdue).toBe(0);
  });
});

describe("customerDues totals", () => {
  it("sums partial payments against each invoice", () => {
    const d = data(
      [customer("c1")],
      [
        invoice("i1", "c1", 1000, "2025-03-01", [payment("p1", 400, "2025-03-05")]),
        invoice("i2", "c1", 500, "2025-03-20"),
      ],
    );
    const [entry] = customerDues(d, TODAY);
    expect(entry.totalOwed).toBe(600 + 500);
    expect(entry.unpaidCount).toBe(2);
    expect(entry.invoiceIds).toEqual(["i1", "i2"]);
  });

  it("excludes fully paid invoices", () => {
    const d = data(
      [customer("c1")],
      [
        invoice("i1", "c1", 1000, "2025-03-01", [payment("p1", 1000, "2025-03-02")]),
        invoice("i2", "c1", 500, "2025-03-20"),
      ],
    );
    const [entry] = customerDues(d, TODAY);
    expect(entry.totalOwed).toBe(500);
    expect(entry.invoiceIds).toEqual(["i2"]);
  });

  it("omits customers with only paid invoices", () => {
    const d = data(
      [customer("c1")],
      [invoice("i1", "c1", 1000, "2025-03-01", [payment("p1", 1000, "2025-03-02")])],
    );
    expect(customerDues(d, TODAY)).toEqual([]);
  });

  it("ignores invoices whose customer does not exist", () => {
    const d = data([customer("c1")], [invoice("i1", "ghost", 999, "2025-03-01")]);
    expect(customerDues(d, TODAY)).toEqual([]);
  });
});

describe("customerDues oldest invoice", () => {
  it("uses the oldest unpaid invoice for daysOverdue and bucket", () => {
    const d = data(
      [customer("c1")],
      [
        invoice("old", "c1", 500, "2025-03-01"), // 30 days overdue
        invoice("new", "c1", 500, "2025-03-25"), // 6 days overdue
      ],
    );
    const [entry] = customerDues(d, TODAY);
    expect(entry.oldestDueDate).toBe("2025-03-01");
    expect(entry.daysOverdue).toBe(30);
    expect(entry.bucket).toBe("8-30");
  });
});

describe("customerDues status", () => {
  it("includes a customer with status left who still owes", () => {
    const d = data(
      [customer("c1", "left")],
      [invoice("i1", "c1", 300, "2025-03-01")],
    );
    const result = customerDues(d, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0].customerId).toBe("c1");
  });
});

describe("customerDues lastReminderDate", () => {
  it("is the max reminder date across paid and unpaid invoices", () => {
    const d = data(
      [customer("c1")],
      [
        invoice("paid", "c1", 1000, "2025-03-01", [payment("p1", 1000, "2025-03-02")], [
          reminder("r1", "2025-03-25"),
        ]),
        invoice("open", "c1", 500, "2025-03-20", [], [reminder("r2", "2025-03-10")]),
      ],
    );
    expect(customerDues(d, TODAY)[0].lastReminderDate).toBe("2025-03-25");
  });

  it("is null when there are no reminders", () => {
    const d = data([customer("c1")], [invoice("i1", "c1", 500, "2025-03-01")]);
    expect(customerDues(d, TODAY)[0].lastReminderDate).toBeNull();
  });
});

describe("customerDues sorting", () => {
  it("sorts by oldest due date, then by name", () => {
    const d = data(
      [customer("a"), customer("b"), customer("c")],
      [
        invoice("i1", "a", 100, "2025-03-20"),
        invoice("i2", "b", 100, "2025-03-01"),
        invoice("i3", "c", 100, "2025-03-01"),
      ],
    );
    const ids = customerDues(d, TODAY).map((e) => e.customerId);
    expect(ids).toEqual(["b", "c", "a"]);
  });
});

describe("duesSummary", () => {
  it("totals and buckets with empty buckets present as zero", () => {
    const d = data(
      [customer("c1"), customer("c2"), customer("c3"), customer("c4")],
      [
        invoice("i1", "c1", 500, "2025-03-31"), // notDue
        invoice("i2", "c2", 1000, "2025-03-28"), // 1-7
        invoice("i3", "c3", 2000, "2025-03-15"), // 8-30
        invoice("i4", "c4", 300, "2025-02-28"), // 30+
      ],
    );
    const summary = duesSummary(customerDues(d, TODAY));
    expect(summary.totalOwed).toBe(3800);
    expect(summary.customerCount).toBe(4);
    expect(summary.buckets).toEqual({
      notDue: { amount: 500, count: 1 },
      "1-7": { amount: 1000, count: 1 },
      "8-30": { amount: 2000, count: 1 },
      "30+": { amount: 300, count: 1 },
    });
  });

  it("returns zeroed buckets for empty input", () => {
    expect(duesSummary([])).toEqual({
      totalOwed: 0,
      customerCount: 0,
      buckets: {
        notDue: { amount: 0, count: 0 },
        "1-7": { amount: 0, count: 0 },
        "8-30": { amount: 0, count: 0 },
        "30+": { amount: 0, count: 0 },
      },
    });
  });
});

describe("chasePriority", () => {
  // Single customer, 1000 owed, 30 days overdue, no payments or reminders.
  function singleInvoice(extra: Partial<Invoice> = {}): AppData {
    return data(
      [customer("c1")],
      [{ ...invoice("i1", "c1", 1000, "2025-03-01"), ...extra }],
    );
  }

  it("uses base = owed x (1 + days/30)", () => {
    const d = singleInvoice();
    const [entry] = customerDues(d, TODAY);
    expect(chasePriority(entry, d, TODAY)).toBeCloseTo(1000 * (1 + 30 / 30));
  });

  it("applies x1.2 when a payment falls 0-7 days after a reminder", () => {
    const d = data(
      [customer("c1")],
      [
        invoice("i1", "c1", 1000, "2025-03-01", [payment("p1", 400, "2025-03-10")], [
          reminder("r1", "2025-03-05"), // payment 5 days after reminder
        ]),
      ],
    );
    const [entry] = customerDues(d, TODAY);
    const base = 600 * (1 + 30 / 30);
    expect(chasePriority(entry, d, TODAY)).toBeCloseTo(base * 1.2);
  });

  it("applies no bonus when the payment is 8+ days after a reminder", () => {
    const d = data(
      [customer("c1")],
      [
        invoice("i1", "c1", 1000, "2025-03-01", [payment("p1", 400, "2025-03-09")], [
          reminder("r1", "2025-03-01"), // payment 8 days after reminder
        ]),
      ],
    );
    const [entry] = customerDues(d, TODAY);
    expect(chasePriority(entry, d, TODAY)).toBeCloseTo(600 * (1 + 30 / 30));
  });

  it("halves the score when the last reminder was 0-2 days ago", () => {
    const d = singleInvoice({ reminders: [reminder("r1", "2025-03-30")] }); // 1 day ago
    const [entry] = customerDues(d, TODAY);
    expect(chasePriority(entry, d, TODAY)).toBeCloseTo(1000 * 2 * 0.5);
  });

  it("applies the penalty at exactly 2 days ago", () => {
    const d = singleInvoice({ reminders: [reminder("r1", "2025-03-29")] });
    const [entry] = customerDues(d, TODAY);
    expect(chasePriority(entry, d, TODAY)).toBeCloseTo(1000 * 2 * 0.5);
  });

  it("applies no penalty when the last reminder was 3 days ago", () => {
    const d = singleInvoice({ reminders: [reminder("r1", "2025-03-28")] });
    const [entry] = customerDues(d, TODAY);
    expect(chasePriority(entry, d, TODAY)).toBeCloseTo(1000 * 2);
  });

  it("does not apply the penalty when there is no reminder", () => {
    const d = singleInvoice();
    const entry: CustomerDue = customerDues(d, TODAY)[0];
    expect(entry.lastReminderDate).toBeNull();
    expect(chasePriority(entry, d, TODAY)).toBeCloseTo(2000);
  });
});
