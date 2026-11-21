import type { AppData } from "@/lib/types";
import { billOccurrences } from "@/lib/bills";
import { addDays } from "@/lib/dates";
import { forecast } from "@/lib/forecast";
import { chasePriority, customerDues, duesSummary } from "@/lib/dues";

export type ForecastStatus = "Safe" | "Tight" | "Short";

export const BAD_DAY_MIN_LATE = 3;
const BILL_WINDOW_DAYS = 30;

export type BadDay = {
  lateCount: number;
  lateTotal: number;
  topIds: string[];
  topNames: string[];
  // The largest bill in the window, named only when the top customers' overdue total covers it.
  coversBill: { name: string; date: string } | null;
};

// "Good morning" before 12, "Good afternoon" 12 to 16, "Good evening" from 17.
export function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Short if the lowest balance is below zero, Tight if below the safety buffer, else Safe.
export function forecastStatusFor(data: AppData, today: string): ForecastStatus {
  const result = forecast({ data, today, days: 30 });
  if (result.lowest.balance < 0) return "Short";
  if (result.lowest.balance < data.business.safetyBuffer) return "Tight";
  return "Safe";
}

// Total of every unpaid invoice (same figure as the "Who owes me" headline).
export function owedToYou(data: AppData, today: string): number {
  return duesSummary(customerDues(data, today)).totalOwed;
}

// Sum of bill occurrences from today through `days` ahead (inclusive, like the forecast window).
export function billsDueWithin(data: AppData, today: string, days: number): number {
  const end = addDays(today, days);
  let total = 0;
  for (const bill of data.bills) {
    total += billOccurrences(bill, today, end).length * bill.amount;
  }
  return total;
}

// Largest single bill occurrence from today through `days` ahead; null if none.
function largestBillOccurrence(
  data: AppData,
  today: string,
  days: number,
): { name: string; amount: number; date: string } | null {
  const end = addDays(today, days);
  let largest: { name: string; amount: number; date: string } | null = null;
  for (const bill of data.bills) {
    for (const date of billOccurrences(bill, today, end)) {
      if (largest === null || bill.amount > largest.amount) {
        largest = { name: bill.name, amount: bill.amount, date };
      }
    }
  }
  return largest;
}

// Bad day: 3 or more customers overdue. Top 3 by chasePriority; the bill is named only if
// those 3 owe at least the largest bill occurrence in the next 30 days.
export function badDay(data: AppData, today: string): BadDay | null {
  const late = customerDues(data, today).filter((e) => e.daysOverdue > 0);
  if (late.length < BAD_DAY_MIN_LATE) return null;

  const ranked = late
    .map((e) => ({ e, score: chasePriority(e, data, today) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.e);
  const top = ranked.slice(0, BAD_DAY_MIN_LATE);
  const topTotal = top.reduce((sum, e) => sum + e.totalOwed, 0);
  const largest = largestBillOccurrence(data, today, BILL_WINDOW_DAYS);
  const covers = largest !== null && largest.amount > 0 && topTotal >= largest.amount;

  return {
    lateCount: late.length,
    lateTotal: late.reduce((sum, e) => sum + e.totalOwed, 0),
    topIds: top.map((e) => e.customerId),
    topNames: top.map((e) => e.name),
    coversBill: covers && largest !== null ? { name: largest.name, date: largest.date } : null,
  };
}

// Dismissed alert ids for today. Storage can be unavailable (private mode), so failures are silent.
export function readDismissed(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeDismissed(key: string, ids: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Storage unavailable: the dismissal lasts until the page is reloaded.
  }
}
