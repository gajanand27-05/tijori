import type { AppData, Bill, Customer, Invoice, Language, Payment, Reminder } from "./types";
import { addDays, addMonths, dateInMonth, monthKey } from "./dates";

export const SEED_TUNING = { cashInHand: 33000 };

type Plan = Customer["plan"];

const FEES: Record<Plan, number> = { Lunch: 2400, Dinner: 2200, Both: 4200 };
const LANGS: Language[] = ["en", "en", "hi", "kn"];

const NAMES: string[] = [
  "Aditya Verma", "Priya Malhotra", "Vikram Chauhan", "Neha Kapoor", "Rahul Bhatia",
  "Sunita Gupta", "Amit Saxena", "Pooja Arora", "Deepak Joshi", "Kavita Tiwari",
  "Sanjay Dubey", "Ritu Agarwal", "Manish Pandey", "Anjali Bisht", "Gaurav Rawat",
  "Venkatesh Iyer", "Harish Naidu", "Karthik Reddy", "Ramesh Pillai", "Mahesh Hegde",
  "Ganesh Murthy", "Prakash Kulkarni", "Lakshmi Narayan", "Deepa Nair", "Savitha Gowda",
  "Meghana Shetty", "Revathi Krishnan", "Shobha Rao", "Geetha Prasad", "Asha Menon",
  "Vijaya Shastri", "Nandini Kamath", "Imran Qureshi", "Farah Siddiqui", "Joseph Dsouza",
  "Rekha Naik", "Mohan Lal", "Sneha Patil", "Harpreet Singh", "Gurleen Kaur",
];

// mulberry32: small deterministic PRNG, returns floats in [0, 1)
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSeedData(today: string): AppData {
  const rand = mulberry32(42);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

  const firstOfMonth = `${monthKey(today)}-01`;
  // index 0 = two months ago, 1 = last month, 2 = this month
  const issueDates = [
    addMonths(firstOfMonth, -2),
    addMonths(firstOfMonth, -1),
    firstOfMonth,
  ];

  const customers: Customer[] = [];
  const invoices: Invoice[] = [];

  NAMES.forEach((name, i) => {
    const plan: Plan = i < 20 ? "Lunch" : i < 28 ? "Dinner" : "Both";
    const group = i < 25 ? "punctual" : i < 35 ? "late" : i < 39 ? "chronic" : "left";
    const language = LANGS[i % 4];
    const monthlyFee = FEES[plan];
    const id = `cust-${String(i + 1).padStart(2, "0")}`;
    const isPaused = i === 0;

    const customer: Customer = {
      id,
      name,
      phone: `+91 90000 0${String(i + 1).padStart(4, "0")}`,
      plan,
      monthlyFee,
      startDate: addMonths(today, -int(4, 12)),
      status: group === "left" ? "left" : isPaused ? "paused" : "active",
      language,
    };
    if (isPaused) {
      customer.pauseFrom = today;
      customer.pauseTo = addDays(today, 10);
    }
    customers.push(customer);

    const [lo, hi] = group === "late" ? [7, 20] : group === "chronic" ? [33, 37] : [0, 3];

    issueDates.forEach((issueDate, m) => {
      if (group === "left" && m === 2) return;

      const billingMonth = monthKey(issueDate);
      const dueDate = dateInMonth(billingMonth, 6);
      const unpaidByRule =
        (group === "chronic" && m >= 1) || (group === "left" && m === 1);

      const payments: Payment[] = [];
      const delay = int(lo, hi);
      const payDate = addDays(dueDate, delay);
      if (!unpaidByRule && payDate <= today) {
        payments.push({
          id: `pay-${id}-${m}`,
          amount: monthlyFee,
          date: payDate,
          method: rand() < 0.8 ? "UPI" : "Cash",
        });
      }

      const reminders: Reminder[] = [];
      if (group === "chronic" && payments.length === 0) {
        const remDate = addDays(dueDate, 10);
        if (remDate <= today) {
          reminders.push({ id: `rem-${id}-${m}`, date: remDate, tone: "gentle", language });
        }
      }

      invoices.push({
        id: `inv-${id}-${m}`,
        customerId: id,
        billingMonth,
        amount: monthlyFee,
        issueDate,
        dueDate,
        payments,
        reminders,
      });
    });
  });

  const bills: Bill[] = [
    { id: "bill-rent", name: "Rent", category: "rent", amount: 15000, recurrence: { type: "monthly", day: 5 } },
    { id: "bill-salary-ravi", name: "Helper salary – Ravi", category: "salary", amount: 10000, recurrence: { type: "monthly", day: 1 } },
    { id: "bill-salary-suresh", name: "Helper salary – Suresh", category: "salary", amount: 10000, recurrence: { type: "monthly", day: 1 } },
    { id: "bill-vegetables", name: "Vegetable vendor", category: "vegetables", amount: 6000, recurrence: { type: "weekly", weekday: 1 } },
    { id: "bill-gas", name: "Gas cylinder", category: "gas", amount: 1750, recurrence: { type: "everyNDays", n: 10, startDate: addDays(today, -4) } },
    { id: "bill-groceries", name: "Groceries & rice", category: "groceries", amount: 15000, recurrence: { type: "monthly", day: 10 } },
    { id: "bill-packaging", name: "Packaging", category: "packaging", amount: 3000, recurrence: { type: "monthly", day: 15 } },
  ];

  return {
    version: 1,
    business: {
      name: "Meena's Kitchen",
      ownerName: "Meena Rao",
      city: "Bengaluru",
      cashInHand: SEED_TUNING.cashInHand,
      safetyBuffer: 5000,
      defaultDueDays: 5,
      upiId: "meenaskitchen@upi",
    },
    customers,
    invoices,
    bills,
  };
}