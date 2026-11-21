import type { Invoice } from "./types";

const DAY_MS = 86400000;

function wholeDays(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / DAY_MS);
}

export type InvoiceStatus = "paid" | "partial" | "due" | "overdue";

export function amountPaid(invoice: Invoice): number {
  return invoice.payments.reduce((sum, p) => sum + p.amount, 0);
}

export function amountOutstanding(invoice: Invoice): number {
  return Math.max(0, invoice.amount - amountPaid(invoice));
}

export function daysOverdue(invoice: Invoice, today: string): number {
  if (amountOutstanding(invoice) > 0 && today > invoice.dueDate) {
    return wholeDays(invoice.dueDate, today);
  }
  return 0;
}

export function getInvoiceStatus(invoice: Invoice, today: string): InvoiceStatus {
  if (amountOutstanding(invoice) === 0) return "paid";
  if (today > invoice.dueDate) return "overdue";
  if (amountPaid(invoice) > 0) return "partial";
  return "due";
}