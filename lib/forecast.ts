import type { AppData, Bill, BillCategory, Customer, Invoice } from "./types";
import { amountOutstanding } from "./invoice";
import { averageDelayDays } from "./customer-stats";
import { planMonthlyInvoices } from "./billing";
import type { PlannedInvoice } from "./billing";
import { billOccurrences } from "./bills";
import { addDays, daysInMonth, diffDays, monthKey } from "./dates";

export type ForecastItem = { label: string; amount: number; kind: "in" | "out" };
export type ForecastDay = { date: string; cashIn: number; cashOut: number; balance: number; items: ForecastItem[] };
export type ForecastScenario = {
  latePayers?: { topN: number; days: number };
  cancellations?: { n: number };
  costSpike?: { category: BillCategory; percent: number };
  festivalPause?: { n: number; days: number; startDate: string };
};
export type ForecastResult = {
  daily: ForecastDay[];
  lowest: { balance: number; date: string };
  firstBelowBuffer: string | null;
  firstBelowZero: string | null;
  totalIn: number;
  totalOut: number;
  assumptions: string[];
};
export type BaselineComparison = { shortfall: number; lowestDelta: number; firstBelowZero: string | null };

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

// First n items of a list (n floored, never negative).
function takeN<T>(list: T[], n: number): T[] {
  return list.slice(0, Math.max(0, Math.floor(n)));
}

// Money a festival pause removes from one planned invoice: fee times the pause's share of the month.
function festivalReduction(c: Customer, month: string, pause: { days: number; startDate: string }): number {
  if (pause.days < 1) return 0;
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
  const endDate = addDays(pause.startDate, pause.days - 1);
  const from = pause.startDate > first ? pause.startDate : first;
  const to = endDate < last ? endDate : last;
  if (from > to) return 0;
  const overlap = diffDays(from, to) + 1;
  return Math.round((c.monthlyFee * overlap) / daysInMonth(month));
}

type MonthSummary = {
  month: string;
  count: number;
  total: number;
  late: number;
  issueDate: string;
  dueDate: string;
};

export function forecast({
  data,
  today,
  days,
  scenario = {},
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
  const byName = (a: Customer, b: Customer) => a.name.localeCompare(b.name);

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

  // When money due on dueDate arrives (plus any extra days), or null if it falls outside the window.
  const arrivalFor = (dueDate: string, customerId: string, extraDays = 0): string | null => {
    const avg = Math.round(delayOf(customerId));
    const expected = addDays(dueDate, avg);
    const base = expected < today ? addDays(today, Math.max(3, Math.round(avg / 2))) : expected;
    const arrival = extraDays > 0 ? addDays(base, extraDays) : base;
    return arrival >= today && arrival <= windowEnd ? arrival : null;
  };

  // Planned invoices for each month whose first day is inside the window. Computed once.
  const plans: { month: string; plan: PlannedInvoice[] }[] = [];
  for (let month = nextMonth(monthKey(today)); `${month}-01` <= windowEnd; month = nextMonth(month)) {
    plans.push({ month, plan: planMonthlyInvoices(data, month) });
  }

  // ---- Scenario targets ----

  // latePayers: top N by monthly fee. Ties go to whoever has the most money expected in the window
  // (measured on the baseline, before any scenario).
  const lp = scenario.latePayers;
  const lateIds = new Set<string>();
  if (lp) {
    const expectedInWindow = new Map<string, number>();
    const credit = (customerId: string, amount: number, dueDate: string) => {
      if (arrivalFor(dueDate, customerId) === null) return;
      expectedInWindow.set(customerId, (expectedInWindow.get(customerId) ?? 0) + amount);
    };
    for (const inv of invoices) {
      const c = customers.get(inv.customerId);
      if (!c || c.status === "left") continue;
      const owed = amountOutstanding(inv);
      if (owed > 0) credit(c.id, owed, inv.dueDate);
    }
    for (const { plan } of plans) {
      for (const p of plan) credit(p.customerId, p.amount, p.dueDate);
    }
    const billed = data.customers.filter((c) => c.status === "active" || c.status === "paused");
    const ranked = [...billed].sort(
      (a, b) =>
        b.monthlyFee - a.monthlyFee ||
        (expectedInWindow.get(b.id) ?? 0) - (expectedInWindow.get(a.id) ?? 0) ||
        byName(a, b),
    );
    for (const c of takeN(ranked, lp.topN)) lateIds.add(c.id);
  }
  const lateDays = lp?.days ?? 0;
  const extraFor = (customerId: string): number => (lateIds.has(customerId) ? lateDays : 0);

  // cancellations: N least reliable active customers (highest average delay). No invoices from next month on.
  const cancelledIds = new Set<string>();
  if (scenario.cancellations) {
    const active = data.customers.filter((c) => c.status === "active");
    const worst = [...active].sort((a, b) => delayOf(b.id) - delayOf(a.id) || byName(a, b));
    for (const c of takeN(worst, scenario.cancellations.n)) cancelledIds.add(c.id);
  }

  // festivalPause: N lowest-fee billed customers. Their future invoices shrink pro rata.
  const fp = scenario.festivalPause;
  const pausedIds = new Set<string>();
  if (fp) {
    const billed = data.customers.filter((c) => c.status === "active" || c.status === "paused");
    const lowestFee = [...billed].sort((a, b) => a.monthlyFee - b.monthlyFee || byName(a, b));
    for (const c of takeN(lowestFee, fp.n)) pausedIds.add(c.id);
  }

  // costSpike: every bill in the category costs percent% more.
  const spike = scenario.costSpike;
  const billAmount = (bill: Bill): number =>
    spike && bill.category === spike.category ? Math.round(bill.amount * (1 + spike.percent / 100)) : bill.amount;

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
    const arrival = arrivalFor(inv.dueDate, c.id, extraFor(c.id));
    if (arrival === null) continue;
    addItem(arrival, { label: `${c.name} – ${monthLabel(inv.billingMonth)}`, amount: owed, kind: "in" });
  }

  // Invoices not yet issued, month by month.
  const monthSummaries: MonthSummary[] = [];
  for (const { month, plan } of plans) {
    let count = 0;
    let total = 0;
    let late = 0;
    for (const p of plan) {
      const c = customers.get(p.customerId);
      if (!c || cancelledIds.has(c.id)) continue;
      let amount = p.amount;
      if (fp && pausedIds.has(c.id)) amount = Math.max(0, amount - festivalReduction(c, month, fp));
      if (amount <= 0) continue;
      count += 1;
      total += amount;
      // Usual pattern, ignoring scenarios: does this customer pay after the window?
      if (arrivalFor(p.dueDate, c.id) === null) late += 1;
      const arrival = arrivalFor(p.dueDate, c.id, extraFor(c.id));
      if (arrival === null) continue;
      addItem(arrival, { label: `${c.name} – ${monthLabel(p.billingMonth)}`, amount, kind: "in" });
    }
    if (count > 0) {
      monthSummaries.push({ month, count, total, late, issueDate: plan[0].issueDate, dueDate: plan[0].dueDate });
    }
  }

  // Bills falling due inside the window (with costSpike applied).
  const effectiveBills: Bill[] = data.bills.map((b) => ({ ...b, amount: billAmount(b) }));
  const billsHit: Bill[] = [];
  for (const bill of effectiveBills) {
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
    const tail = ms.late > 0 ? ` ${ms.late} of them usually pay after this forecast window.` : "";
    assumptions.push(
      `${MONTHS_LONG[m - 1]} bills: ${ms.count} customers, ${inr(ms.total)}, sent on ${shortDate(ms.issueDate)}, due ${shortDate(ms.dueDate)}.${tail}`,
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

  if (lp) {
    assumptions.push(`What if: top ${lp.topN} payers by fee pay ${lp.days} days later.`);
  }
  if (scenario.cancellations) {
    assumptions.push(
      `What if: ${scenario.cancellations.n} least reliable active customers send no invoices from next month.`,
    );
  }
  if (spike) {
    assumptions.push(`What if: ${spike.category} bills cost ${spike.percent}% more.`);
  }
  if (fp) {
    assumptions.push(
      `What if: ${fp.n} lowest-fee customers pause from ${shortDate(fp.startDate)} for ${fp.days} days.`,
    );
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

/**
 * Compares a what-if forecast with the baseline (no-scenario) forecast.
 * - shortfall: how far the scenario's lowest balance falls below zero (0 if it never does).
 * - lowestDelta: scenario lowest balance minus baseline lowest balance. Negative means the scenario is worse.
 * - firstBelowZero: the first day the scenario balance is below zero, or null.
 */
export function compareToBaseline(baseline: ForecastResult, scenario: ForecastResult): BaselineComparison {
  return {
    shortfall: Math.max(0, -scenario.lowest.balance),
    lowestDelta: scenario.lowest.balance - baseline.lowest.balance,
    firstBelowZero: scenario.firstBelowZero,
  };
}
