import type { Invoice } from "./types";
import { daysOverdue, getInvoiceStatus } from "./invoice";

export type InvoiceTab = "overdue" | "due" | "partial" | "paid" | "all";

export const INVOICE_TABS: { key: InvoiceTab; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "due", label: "Due" },
  { key: "partial", label: "Partial" },
  { key: "paid", label: "Paid" },
  { key: "all", label: "All" },
];

// Each invoice sits in exactly one status tab. Overdue is sorted by days late (most first);
// the rest by due date.
export function invoicesForTab(invoices: Invoice[], tab: InvoiceTab, today: string): Invoice[] {
  const matches = invoices.filter((inv) => tab === "all" || getInvoiceStatus(inv, today) === tab);
  if (tab === "overdue") {
    return matches.sort((a, b) => daysOverdue(b, today) - daysOverdue(a, today));
  }
  return matches.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function countsByTab(invoices: Invoice[], today: string): Record<InvoiceTab, number> {
  const counts: Record<InvoiceTab, number> = { overdue: 0, due: 0, partial: 0, paid: 0, all: invoices.length };
  for (const inv of invoices) counts[getInvoiceStatus(inv, today)] += 1;
  return counts;
}

// "December" for "2025-12"
export function monthName(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

// "December 2025" for "2025-12"
export function monthYear(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

export function invoiceLabel(invoice: Invoice): string {
  return invoice.description ?? monthYear(invoice.billingMonth);
}
