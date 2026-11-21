import type { Bill, Recurrence } from "./types";

export type BillOccurrence = {
  billId: string;
  name: string;
  category: Bill["category"];
  amount: number;
  date: string;
  runningTotal: number;
};

const DAY_MS = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(y: number, m0: number, d: number): string {
  const mm = String(m0 + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function addDays(iso: string, n: number): string {
  const t = parse(iso).getTime() + n * DAY_MS;
  const dt = new Date(t);
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

function dayDiff(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS);
}

export function billOccurrences(bill: Bill, from: string, to: string): string[] {
  if (from > to) return [];
  const r: Recurrence = bill.recurrence;
  const out: string[] = [];

  if (r.type === "monthly") {
    const start = parse(from);
    const end = parse(to);
    let y = start.getUTCFullYear();
    let m0 = start.getUTCMonth();
    const endY = end.getUTCFullYear();
    const endM0 = end.getUTCMonth();
    while (y < endY || (y === endY && m0 <= endM0)) {
      const last = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
      const day = Math.min(Math.max(r.day, 1), last);
      const date = toISO(y, m0, day);
      if (date >= from && date <= to) out.push(date);
      m0 += 1;
      if (m0 > 11) {
        m0 = 0;
        y += 1;
      }
    }
  } else if (r.type === "weekly") {
    let cur = from;
    while (cur <= to) {
      if (parse(cur).getUTCDay() === r.weekday) out.push(cur);
      cur = addDays(cur, 1);
    }
  } else if (r.type === "everyNDays") {
    if (!(r.n >= 1)) return [];
    const k0 = Math.max(0, Math.ceil(dayDiff(r.startDate, from) / r.n));
    let date = addDays(r.startDate, k0 * r.n);
    while (date <= to) {
      if (date >= from) out.push(date);
      date = addDays(date, r.n);
    }
  } else {
    if (r.date >= from && r.date <= to) out.push(r.date);
  }

  return Array.from(new Set(out));
}

export function upcomingBills(bills: Bill[], from: string, to: string): BillOccurrence[] {
  const items: { bill: Bill; date: string }[] = [];
  for (const bill of bills) {
    for (const date of billOccurrences(bill, from, to)) {
      items.push({ bill, date });
    }
  }
  items.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.bill.name === b.bill.name) return 0;
    return a.bill.name < b.bill.name ? -1 : 1;
  });

  let running = 0;
  return items.map(({ bill, date }) => {
    running += bill.amount;
    return {
      billId: bill.id,
      name: bill.name,
      category: bill.category,
      amount: bill.amount,
      date,
      runningTotal: running,
    };
  });
}

export function nextDueDate(bill: Bill, today: string): string | null {
  const occ = billOccurrences(bill, today, addDays(today, 400));
  return occ.length > 0 ? occ[0] : null;
}

function ordinal(d: number): string {
  const mod100 = d % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${d}th`;
  switch (d % 10) {
    case 1:
      return `${d}st`;
    case 2:
      return `${d}nd`;
    case 3:
      return `${d}rd`;
    default:
      return `${d}th`;
  }
}

export function recurrenceLabel(r: Recurrence): string {
  switch (r.type) {
    case "monthly":
      return `${ordinal(r.day)} of every month`;
    case "weekly":
      return `Every ${WEEKDAYS[r.weekday]}`;
    case "everyNDays":
      return `Every ${r.n} day${r.n === 1 ? "" : "s"}`;
    case "oneOff": {
      const [, m, d] = r.date.split("-").map(Number);
      return `Once on ${d} ${MONTHS[m - 1]}`;
    }
  }
}
