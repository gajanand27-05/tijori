import type { AppData, Customer, Invoice } from "./types";
import { addDays, daysInMonth, diffDays } from "./dates";

export type PlannedInvoice = Omit<Invoice, "id">;

// Days of `month` ("YYYY-MM") covered by the customer's pause, inclusive.
function pausedDays(customer: Customer, month: string): number {
  if (!customer.pauseFrom || !customer.pauseTo) return 0;
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
  const from = customer.pauseFrom > first ? customer.pauseFrom : first;
  const to = customer.pauseTo < last ? customer.pauseTo : last;
  if (from > to) return 0;
  return diffDays(from, to) + 1;
}

// Monthly fee times the share of the month NOT paused, rounded to the rupee.
export function proRataFee(customer: Customer, month: string): number {
  const total = daysInMonth(month);
  const active = total - pausedDays(customer, month);
  return Math.round((customer.monthlyFee * active) / total);
}

// The monthly invoices that would be created for `month`. Pure: nothing is written.
// One-off invoices (those with a description) do not count as already billed.
export function planMonthlyInvoices(data: AppData, month: string): PlannedInvoice[] {
  const issueDate = `${month}-01`;
  const dueDate = addDays(issueDate, data.business.defaultDueDays);
  const billed = new Set(
    data.invoices
      .filter((i) => i.billingMonth === month && !i.description)
      .map((i) => i.customerId),
  );
  const plan: PlannedInvoice[] = [];
  for (const c of data.customers) {
    if (c.status !== "active" && c.status !== "paused") continue;
    if (billed.has(c.id)) continue;
    const amount = proRataFee(c, month);
    if (amount <= 0) continue;
    plan.push({
      customerId: c.id,
      billingMonth: month,
      amount,
      issueDate,
      dueDate,
      payments: [],
      reminders: [],
    });
  }
  return plan;
}
