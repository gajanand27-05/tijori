import type { AppData } from "./types";
import { chasePriority, customerDues } from "./dues";

export type ChasePlan = {
  customerIds: string[];
  total: number;
};

// Smallest prefix of overdue customers, in chasePriority order (highest score first),
// whose combined totalOwed reaches `shortfall`. If they never reach it, returns everyone overdue.
export function chasePlan(data: AppData, today: string, shortfall: number): ChasePlan {
  if (shortfall <= 0) return { customerIds: [], total: 0 };

  const ranked = customerDues(data, today)
    .filter((e) => e.bucket !== "notDue")
    .map((e) => ({ e, score: chasePriority(e, data, today) }))
    .sort((a, b) => b.score - a.score);

  const customerIds: string[] = [];
  let total = 0;
  for (const { e } of ranked) {
    customerIds.push(e.customerId);
    total += e.totalOwed;
    if (total >= shortfall) break;
  }
  return { customerIds, total };
}
