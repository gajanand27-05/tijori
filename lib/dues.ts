import type { AppData, Customer, Invoice, Reminder, Payment } from "./types";
import { amountOutstanding, daysOverdue } from "./invoice";

const DAY_MS = 86400000;

export type DueBucket = "notDue" | "1-7" | "8-30" | "30+";

export type CustomerDue = {
  customerId: string;
  name: string;
  totalOwed: number;
  oldestDueDate: string;
  daysOverdue: number;
  unpaidCount: number;
  invoiceIds: string[];
  lastReminderDate: string | null;
  bucket: DueBucket;
};

export type DuesSummary = {
  totalOwed: number;
  customerCount: number;
  buckets: Record<DueBucket, { amount: number; count: number }>;
};

export const DUE_BUCKETS: DueBucket[] = ["notDue", "1-7", "8-30", "30+"];

// Whole days from `from` to `to` (both "YYYY-MM-DD"), UTC-based.
function wholeDays(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / DAY_MS);
}

export function bucketFor(days: number): DueBucket {
  if (days <= 0) return "notDue";
  if (days <= 7) return "1-7";
  if (days <= 30) return "8-30";
  return "30+";
}

function allPayments(invoices: Invoice[]): Payment[] {
  return invoices.flatMap((inv) => inv.payments);
}

function allReminders(invoices: Invoice[]): Reminder[] {
  return invoices.flatMap((inv) => inv.reminders);
}

function buildEntry(customer: Customer, invoices: Invoice[], today: string): CustomerDue | null {
  const unpaid = invoices.filter((inv) => amountOutstanding(inv) > 0);
  if (unpaid.length === 0) return null;

  const oldest = unpaid.reduce((a, b) => (b.dueDate < a.dueDate ? b : a));
  const totalOwed = unpaid.reduce((sum, inv) => sum + amountOutstanding(inv), 0);
  const reminderDates = allReminders(invoices).map((r) => r.date);
  const lastReminderDate =
    reminderDates.length > 0 ? reminderDates.reduce((a, b) => (b > a ? b : a)) : null;
  const days = daysOverdue(oldest, today);

  return {
    customerId: customer.id,
    name: customer.name,
    totalOwed,
    oldestDueDate: oldest.dueDate,
    daysOverdue: days,
    unpaidCount: unpaid.length,
    invoiceIds: unpaid.map((inv) => inv.id),
    lastReminderDate,
    bucket: bucketFor(days),
  };
}

export function customerDues(data: AppData, today: string): CustomerDue[] {
  const entries: CustomerDue[] = [];
  for (const customer of data.customers) {
    const invoices = data.invoices.filter((inv) => inv.customerId === customer.id);
    const entry = buildEntry(customer, invoices, today);
    if (entry) entries.push(entry);
  }
  return entries.sort((a, b) => {
    if (a.oldestDueDate !== b.oldestDueDate) return a.oldestDueDate < b.oldestDueDate ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function duesSummary(entries: CustomerDue[]): DuesSummary {
  const buckets: DuesSummary["buckets"] = {
    notDue: { amount: 0, count: 0 },
    "1-7": { amount: 0, count: 0 },
    "8-30": { amount: 0, count: 0 },
    "30+": { amount: 0, count: 0 },
  };
  let totalOwed = 0;
  for (const e of entries) {
    totalOwed += e.totalOwed;
    buckets[e.bucket].amount += e.totalOwed;
    buckets[e.bucket].count += 1;
  }
  return { totalOwed, customerCount: entries.length, buckets };
}

export function chasePriority(entry: CustomerDue, data: AppData, today: string): number {
  let score = entry.totalOwed * (1 + entry.daysOverdue / 30);

  const invoices = data.invoices.filter((inv) => inv.customerId === entry.customerId);
  const payments = allPayments(invoices);
  const reminders = allReminders(invoices);
  const paidWithinWeekOfReminder = payments.some((p) =>
    reminders.some((r) => {
      const d = wholeDays(r.date, p.date);
      return d >= 0 && d <= 7;
    }),
  );
  if (paidWithinWeekOfReminder) score *= 1.2;

  if (entry.lastReminderDate !== null) {
    const sinceReminder = wholeDays(entry.lastReminderDate, today);
    if (sinceReminder >= 0 && sinceReminder <= 2) score *= 0.5;
  }

  return score;
}
