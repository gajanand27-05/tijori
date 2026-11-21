import { getInvoiceStatus } from "./invoice";
import type { Customer, Invoice, Payment } from "./types";

export type Capture = {
  customerId: string | null;
  customerName: string | null;
  amount: number | null;
  method: Payment["method"];
  month: string | null; // "YYYY-MM"
  confidence: "high" | "low";
};

const MONTH_WORDS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const UPI_WORDS = new Set(["gpay", "google", "phonepe", "paytm", "upi", "online"]);
const CASH_WORDS = new Set(["cash", "nakad", "nagad"]);

// Words that are never a customer name.
const FILLER = new Set([
  "bhaiya", "bhai", "ji", "sir", "madam", "didi", "ne", "kiya", "paid", "received",
  "from", "for", "pay", "rs", "rupees", "rupee", "k", "mahine", "month", "this", "is",
  "sent", "today", "the", "a", "an", "to", "and", "of", "by", "via", "hai", "diya",
  "kar", "ka", "ki", "ke", "ko", "se",
  ...Object.keys(MONTH_WORDS),
  ...UPI_WORDS,
  ...CASH_WORDS,
]);

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

function firstNameOf(name: string): string {
  return (name.trim().split(/\s+/)[0] ?? "").toLowerCase();
}

// "2400", "2,400", "₹2400", "Rs. 2400", "rs2400", "2.4k" (= 2400).
function findAmount(lower: string): number | null {
  for (const m of lower.matchAll(/(\d[\d,]*(?:\.\d+)?)(\s*k\b)?/g)) {
    const base = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(base)) continue;
    const value = Math.round(m[2] ? base * 1000 : base);
    if (value > 0) return value;
  }
  return null;
}

function findMethod(tokens: string[]): Payment["method"] {
  for (const t of tokens) {
    if (UPI_WORDS.has(t)) return "UPI";
    if (CASH_WORDS.has(t)) return "Cash";
  }
  return "UPI";
}

// Most recent occurrence of the named month that is not after `now`.
function recentMonthKey(month: number, now: Date): string {
  const year = month <= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function currentMonthKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function findMonth(lower: string, tokens: string[], now: Date): string | null {
  for (const t of tokens) {
    const m = MONTH_WORDS[t];
    if (m !== undefined) return recentMonthKey(m, now);
  }
  if (/\b(is mahine|this month)\b/.test(lower)) return currentMonthKey(now);
  return null;
}

export function parseCapture(
  text: string,
  customers: Customer[],
  now: Date = new Date(),
): Capture {
  const lower = text.toLowerCase();
  const tokens = lower.split(/[^a-z]+/).filter(Boolean);

  let best: { customer: Customer; dist: number } | null = null;
  for (const token of tokens) {
    if (FILLER.has(token)) continue;
    for (const customer of customers) {
      const name = firstNameOf(customer.name);
      if (!name) continue;
      const allowed = name.length >= 5 ? 2 : 1;
      const dist = levenshtein(token, name);
      if (dist > allowed) continue;
      if (!best || dist < best.dist) best = { customer, dist };
    }
  }

  const amount = findAmount(lower);
  const customer = best?.customer ?? null;

  return {
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? null,
    amount,
    method: findMethod(tokens),
    month: findMonth(lower, tokens, now),
    confidence: customer !== null && amount !== null ? "high" : "low",
  };
}

// The invoice a captured payment should go to: the customer's open invoice for `month`
// if there is one, otherwise their oldest open invoice. Null when nothing is open.
export function pickInvoice(
  invoices: Invoice[],
  customerId: string,
  month: string | null,
  today: string,
): Invoice | null {
  const open = invoices.filter(
    (inv) => inv.customerId === customerId && getInvoiceStatus(inv, today) !== "paid",
  );
  if (month) {
    const same = open.find((inv) => inv.billingMonth === month);
    if (same) return same;
  }
  open.sort(
    (a, b) => a.billingMonth.localeCompare(b.billingMonth) || a.dueDate.localeCompare(b.dueDate),
  );
  return open[0] ?? null;
}
