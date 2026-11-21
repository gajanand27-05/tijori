import type { Invoice } from "./types";
import { amountOutstanding } from "./invoice";

const DEFAULT_DELAY_DAYS = 3;

// Whole days from `from` to `to` (both "YYYY-MM-DD"), computed in UTC.
function dayDiff(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

// Average of how many days late the customer's fully paid invoices were paid.
// Early or on-time payments count as 0. Defaults to 3 when there is no history.
export function averageDelayDays(customerId: string, invoices: Invoice[]): number {
  const delays: number[] = [];
  for (const inv of invoices) {
    if (inv.customerId !== customerId) continue;
    if (inv.payments.length === 0) continue;
    if (amountOutstanding(inv) > 0) continue;
    const lastPaid = inv.payments.reduce((max, p) => (p.date > max ? p.date : max), inv.payments[0].date);
    delays.push(Math.max(0, dayDiff(inv.dueDate, lastPaid)));
  }
  if (delays.length === 0) return DEFAULT_DELAY_DAYS;
  return delays.reduce((sum, d) => sum + d, 0) / delays.length;
}

// Total unpaid amount across all of a customer's invoices.
export function customerOutstanding(customerId: string, invoices: Invoice[]): number {
  return invoices
    .filter((inv) => inv.customerId === customerId)
    .reduce((sum, inv) => sum + amountOutstanding(inv), 0);
}

export function delayLabel(days: number): string {
  if (days <= 3) return "usually on time";
  return `usually pays ${Math.round(days)} days late`;
}
