import type { AppData, Bill } from "./types";
import type { ForecastItem } from "./forecast";
import { forecast } from "./forecast";
import { chasePriority, customerDues } from "./dues";
import type { CustomerDue } from "./dues";
import { chasePlan } from "./whatif";
import { billOccurrences } from "./bills";
import { planMonthlyInvoices } from "./billing";
import { addDays, diffDays, monthKey } from "./dates";
import { formatDate, formatINR } from "./format";

export type AlertKind = "shortfall" | "chase" | "followUp" | "billSoon" | "monthStart" | "goodNews";
export type AlertActionType = "chase" | "remind" | "link" | "generateInvoices";
export type AlertAction = { label: string; type: AlertActionType; payload: unknown };
export type Alert = {
  id: string;
  kind: AlertKind;
  priority: number;
  title: string;
  detail: string;
  action?: AlertAction;
};

const MAX_CHASE = 3;
const MAX_FOLLOW_UP = 3;
const MAX_BILL_SOON = 3;
const MAX_GOOD_NEWS = 3;
const BILL_SOON_DAYS = 3;
const FOLLOW_UP_AFTER_DAYS = 5;
const FIRM_AFTER_DAYS = 5;
const RECENT_REMINDER_DAYS = 2;

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

// Whole days since an ISO date; null when there is no date.
function daysSince(iso: string | null, today: string): number | null {
  return iso === null ? null : diffDays(iso, today);
}

// Any reminder sent more than FIRM_AFTER_DAYS ago for this customer.
function hasOldReminder(data: AppData, customerId: string, today: string): boolean {
  return data.invoices
    .filter((inv) => inv.customerId === customerId)
    .some((inv) => inv.reminders.some((r) => diffDays(r.date, today) > FIRM_AFTER_DAYS));
}

function shortfallAlerts(data: AppData, today: string): Alert[] {
  const buffer = data.business.safetyBuffer;
  const fc = forecast({ data, today, days: 30 });
  if (fc.firstBelowBuffer === null) return [];
  const day = fc.daily.find((d) => d.date === fc.firstBelowBuffer);
  if (!day) return [];

  let biggest: ForecastItem | undefined;
  for (const it of day.items) {
    if (it.kind === "out" && (biggest === undefined || it.amount > biggest.amount)) biggest = it;
  }
  const title = biggest
    ? `${biggest.label} ${formatINR(biggest.amount)} is due on ${formatDate(day.date)}.`
    : `Your cash drops below your ${formatINR(buffer)} buffer on ${formatDate(day.date)}.`;

  const lowest = fc.lowest.balance;
  const needed = buffer - lowest;
  const sentences: string[] = [];
  if (lowest < 0) {
    sentences.push(`You'll be ${formatINR(-lowest)} short.`);
  } else {
    sentences.push(`You'll have only ${formatINR(lowest)} left, below your ${formatINR(buffer)} buffer.`);
  }

  const plan = chasePlan(data, today, needed);
  const n = plan.customerIds.length;
  const covered = plan.total >= needed;
  let action: AlertAction | undefined;
  if (covered) {
    sentences.push(n === 1 ? "Chasing this one covers it." : `Chasing these ${n} covers it.`);
    action = { label: `Chase all ${n}`, type: "chase", payload: { customerIds: plan.customerIds } };
  } else {
    sentences.push("Chasing overdue customers won't cover it alone.");
  }

  const alert: Alert = {
    id: "shortfall",
    kind: "shortfall",
    priority: 1,
    title,
    detail: sentences.join(" "),
  };
  if (action) alert.action = action;
  return [alert];
}

function reminderAlerts(data: AppData, today: string): { chase: Alert[]; followUp: Alert[] } {
  // Everyone who owes money, most urgent first.
  const ranked = customerDues(data, today)
    .map((e) => ({ e, score: chasePriority(e, data, today) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.e);

  const chaseEntries: CustomerDue[] = [];
  for (const e of ranked) {
    if (chaseEntries.length >= MAX_CHASE) break;
    if (e.daysOverdue <= 0) continue;
    const since = daysSince(e.lastReminderDate, today);
    if (since !== null && since >= 0 && since <= RECENT_REMINDER_DAYS) continue;
    chaseEntries.push(e);
  }

  const chase: Alert[] = chaseEntries.map((e): Alert => {
    const since = daysSince(e.lastReminderDate, today);
    const reminded = since === null ? "never reminded" : `last reminded ${since} days ago`;
    const tone = hasOldReminder(data, e.customerId, today) ? "firm" : "gentle";
    return {
      id: `chase-${e.customerId}`,
      kind: "chase",
      priority: 2,
      title: `Chase ${e.name} today: ${formatINR(e.totalOwed)}, ${e.daysOverdue} days late, ${reminded}.`,
      detail: `Oldest bill due ${formatDate(e.oldestDueDate)}.`,
      action: { label: "Send reminder", type: "remind", payload: { customerId: e.customerId, tone } },
    };
  });

  const chasedIds = new Set(chaseEntries.map((e) => e.customerId));
  const followUp: Alert[] = [];
  for (const e of ranked) {
    if (followUp.length >= MAX_FOLLOW_UP) break;
    if (chasedIds.has(e.customerId)) continue;
    const since = daysSince(e.lastReminderDate, today);
    if (since === null || since < FOLLOW_UP_AFTER_DAYS) continue;
    followUp.push({
      id: `followUp-${e.customerId}`,
      kind: "followUp",
      priority: 3,
      title: `${e.name} hasn't paid ${since} days after your reminder.`,
      detail: `${formatINR(e.totalOwed)} still owed.`,
      action: { label: "Send firm reminder", type: "remind", payload: { customerId: e.customerId, tone: "firm" } },
    });
  }

  return { chase, followUp };
}

function billSoonAlerts(data: AppData, today: string): Alert[] {
  const end = addDays(today, BILL_SOON_DAYS);
  const items: { bill: Bill; date: string }[] = [];
  for (const bill of data.bills) {
    for (const date of billOccurrences(bill, today, end)) items.push({ bill, date });
  }
  items.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.bill.name.localeCompare(b.bill.name);
  });

  return items.slice(0, MAX_BILL_SOON).map(({ bill, date }): Alert => {
    const n = diffDays(today, date);
    const when = n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
    return {
      id: `billSoon-${bill.id}-${date}`,
      kind: "billSoon",
      priority: 4,
      title: `${bill.name} ${formatINR(bill.amount)} due ${when}.`,
      detail: `Due on ${formatDate(date)}.`,
      action: { label: "View bills", type: "link", payload: { href: "/app/bills" } },
    };
  });
}

function monthStartAlerts(data: AppData, today: string): Alert[] {
  const dayOfMonth = Number(today.slice(8, 10));
  if (dayOfMonth > 7) return [];
  const month = monthKey(today);
  const plan = planMonthlyInvoices(data, month);
  if (plan.length === 0) return [];

  const total = plan.reduce((sum, p) => sum + p.amount, 0);
  const [, m] = month.split("-").map(Number);
  const label = `Generate ${MONTHS_LONG[m - 1]} bills`;
  const count = plan.length;
  return [
    {
      id: `monthStart-${month}`,
      kind: "monthStart",
      priority: 5,
      title: label,
      detail: `${count} ${count === 1 ? "customer" : "customers"}, ${formatINR(total)} to send on ${formatDate(`${month}-01`)}.`,
      action: { label, type: "generateInvoices", payload: { month } },
    },
  ];
}

function goodNewsAlerts(data: AppData, today: string): Alert[] {
  const yesterday = addDays(today, -1);
  const names = new Map(data.customers.map((c) => [c.id, c.name] as const));
  const rows: { name: string; id: string; amount: number; method: string; date: string }[] = [];
  for (const inv of data.invoices) {
    for (const p of inv.payments) {
      if (p.date !== today && p.date !== yesterday) continue;
      const name = names.get(inv.customerId);
      if (!name) continue;
      rows.push({ name, id: p.id, amount: p.amount, method: p.method, date: p.date });
    }
  }
  // Today's payments first; the sort is stable, so the rest keep data order.
  rows.sort((a, b) => (a.date === b.date ? 0 : a.date === today ? -1 : 1));

  return rows.slice(0, MAX_GOOD_NEWS).map((r): Alert => ({
    id: `goodNews-${r.id}`,
    kind: "goodNews",
    priority: 6,
    title: `${r.name} paid ${formatINR(r.amount)} ${r.date === today ? "today" : "yesterday"}.`,
    detail: `Paid via ${r.method}.`,
  }));
}

/**
 * The Today page's alerts, in display order:
 * shortfall, chase, followUp, billSoon, monthStart, goodNews (priorities 1 to 6).
 * Pure: reads `data` and `today` ("YYYY-MM-DD"), writes nothing.
 */
export function buildAlerts(data: AppData, today: string): Alert[] {
  const { chase, followUp } = reminderAlerts(data, today);
  return [
    ...shortfallAlerts(data, today),
    ...chase,
    ...followUp,
    ...billSoonAlerts(data, today),
    ...monthStartAlerts(data, today),
    ...goodNewsAlerts(data, today),
  ];
}
