import type { AppData, Invoice } from "./types";
import { amountOutstanding } from "./invoice";
import { averageDelayDays } from "./customer-stats";
import { planMonthlyInvoices } from "./billing";
import { billOccurrences } from "./bills";
import { addDays, monthKey } from "./dates";

export type ForecastItem = { label: string; amount: number; kind: "in" | "out" };
export type ForecastDay = { date: string; cashIn: number; cashOut: number; balance: number; items: ForecastItem[] };
export type ForecastScenario = Record<string, unknown>; // accepted, ignored
export type ForecastResult = {
  daily: ForecastDay[];
  lowest: { balance: number; date: string };
  firstBelowBuffer: string | null;
  firstBelowZero: string | null;
  totalIn: number;
  totalOut: number;
  assumptions: string[];
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const inr = (n: number): string => "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n));

// "2025-10" -> "Oct 2025"
function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

// "2025-12-01" -> "1 Dec"
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

// "2025-12" -> "2026-01"
function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + m;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

type MonthSummary = { month: string; count: number; total: number; issueDate: string; dueDate: string };

export function forecast({
  data,
  today,
  days,
}: {
  data: AppData;
  today: string;
  days: number;
  scenario?: ForecastScenario;
}): ForecastResult {
  const span = Math.max(0, Math.floor(days));
  const windowEnd = addDays(today, span);
  const invoices: Invoice[] = data.invoices;
  const customers = new Map(data.customers.map((c) => [c.id, c] as const));

  // Unrounded average delay per customer, computed once.
  const rawDelay = new Map<string, number>();
  const delayOf = (customerId: string): number => {
    let v = rawDelay.get(customerId);
    if (v === undefined) {
      v = averageDelayDays(customerId, invoices);
      rawDelay.set(customerId, v);
    }
    return v;
  };

  // When money due on dueDate arrives, or null if it falls outside the window.
  const arrivalFor = (dueDate: string, customerId: string): string | null => {
    const avg = Math.round(delayOf(customerId));
    const expected = addDays(dueDate, avg);
    const arrival = expected < today ? addDays(today, Math.max(3, Math.round(avg / 2))) : expected;
    return arrival >= today && arrival <= windowEnd ? arrival : null;
  };

  const itemsByDate = new Map<string, ForecastItem[]>();
  let totalIn = 0;
  let totalOut = 0;
  const addItem = (date: string, item: ForecastItem) => {
    const list = itemsByDate.get(date);
    if (list) list.push(item);
    else itemsByDate.set(date, [item]);
    if (item.kind === "in") totalIn += item.amount;
    else totalOut += item.amount;
  };

  // Open invoices already issued.
  for (const inv of invoices) {
    const c = customers.get(inv.customerId);
    if (!c || c.status === "left") continue;
    const owed = amountOutstanding(inv);
    if (owed <= 0) continue;
    const arrival = arrivalFor(inv.dueDate, c.id);
    if (arrival === null) continue;
    addItem(arrival, { label: `${c.name} – ${monthLabel(inv.billingMonth)}`, amount: owed, kind: "in" });
  }

  // Invoices not yet issued: each month strictly after the current one whose first day is inside the window.
  const monthSummaries: MonthSummary[] = [];
  for (let month = nextMonth(monthKey(today)); `${month}-01` <= windowEnd; month = nextMonth(month)) {
    const plan = planMonthlyInvoices(data, month);
    let count = 0;
    let total = 0;
    for (const p of plan) {
      const c = customers.get(p.customerId);
      if (!c || (c.status !== "active" && c.status !== "paused")) continue;
      const arrival = arrivalFor(p.dueDate, c.id);
      if (arrival === null) continue;
      addItem(arrival, { label: `${c.name} – ${monthLabel(p.billingMonth)}`, amount: p.amount, kind: "in" });
      count += 1;
      total += p.amount;
    }
    if (count > 0) {
      monthSummaries.push({ month, count, total, issueDate: plan[0].issueDate, dueDate: plan[0].dueDate });
    }
  }

  // Bills falling due inside the window.
  const billsHit: AppData["bills"] = [];
  for (const bill of data.bills) {
    const dates = billOccurrences(bill, today, windowEnd);
    for (const date of dates) {
      addItem(date, { label: bill.name, amount: bill.amount, kind: "out" });
    }
    if (dates.length > 0) billsHit.push(bill);
  }

  // Daily table: in-items first, then out-items, per day.
  const daily: ForecastDay[] = [];
  let balance = data.business.cashInHand;
  for (let i = 0; i <= span; i++) {
    const date = addDays(today, i);
    const all = itemsByDate.get(date) ?? [];
    const ins = all.filter((it) => it.kind === "in");
    const outs = all.filter((it) => it.kind === "out");
    const cashIn = ins.reduce((sum, it) => sum + it.amount, 0);
    const cashOut = outs.reduce((sum, it) => sum + it.amount, 0);
    balance = balance + cashIn - cashOut;
    daily.push({ date, cashIn, cashOut, balance, items: [...ins, ...outs] });
  }

  let lowest = { balance: daily[0].balance, date: daily[0].date };
  for (const d of daily) {
    if (d.balance < lowest.balance) lowest = { balance: d.balance, date: d.date };
  }
  const firstBelowBuffer = daily.find((d) => d.balance < data.business.safetyBuffer)?.date ?? null;
  const firstBelowZero = daily.find((d) => d.balance < 0)?.date ?? null;

  // Assumptions, in order.
  const assumptions: string[] = [];
  assumptions.push(`Starting cash: ${inr(data.business.cashInHand)} (from Settings).`);

  const liveCustomers = data.customers.filter((c) => c.status !== "left");
  let onTime = 0;
  let lateWeeks = 0;
  let lateMonth = 0;
  for (const c of liveCustomers) {
    const d = delayOf(c.id);
    if (d <= 3) onTime += 1;
    else if (d <= 21) lateWeeks += 1;
    else lateMonth += 1;
  }
  assumptions.push(
    `Each customer pays on their usual delay; ${onTime} usually pay on time, ${lateWeeks} pay 1–3 weeks late, ${lateMonth} pay over a month late.`,
  );

  const hasOverdue = invoices.some((inv) => {
    const c = customers.get(inv.customerId);
    return c !== undefined && c.status !== "left" && amountOutstanding(inv) > 0 && inv.dueDate < today;
  });
  if (hasOverdue) {
    assumptions.push("Overdue money we haven't received yet is expected within the next few days.");
  }

  const leftIds = new Set<string>();
  let leftSum = 0;
  for (const inv of invoices) {
    const c = customers.get(inv.customerId);
    if (!c || c.status !== "left") continue;
    const owed = amountOutstanding(inv);
    if (owed <= 0) continue;
    leftIds.add(c.id);
    leftSum += owed;
  }
  if (leftIds.size > 0) {
    assumptions.push(`Customers who left (${leftIds.size}) are not expected to pay (${inr(leftSum)}).`);
  }

  for (const ms of monthSummaries) {
    const [, m] = ms.month.split("-").map(Number);
    assumptions.push(
      `${MONTHS_LONG[m - 1]} bills: ${ms.count} customers, ${inr(ms.total)}, sent on ${shortDate(ms.issueDate)}, due ${shortDate(ms.dueDate)}.`,
    );
  }

  for (const bill of billsHit) {
    const r = bill.recurrence;
    const schedule =
      r.type === "monthly"
        ? `on the ${ordinal(r.day)} of each month`
        : r.type === "weekly"
          ? `every ${WEEKDAYS[r.weekday]}`
          : r.type === "everyNDays"
            ? `every ${r.n} days`
            : `once on ${shortDate(r.date)}`;
    assumptions.push(`Bills: ${bill.name} ${inr(bill.amount)}, ${schedule}.`);
  }

  return {
    daily,
    lowest,
    firstBelowBuffer,
    firstBelowZero,
    totalIn,
    totalOut,
    assumptions,
  };
}
