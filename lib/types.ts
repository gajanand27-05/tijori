export type Language = "en" | "hi" | "kn";

export type Business = {
  name: string;
  ownerName: string;
  city: string;
  cashInHand: number;
  safetyBuffer: number;
  defaultDueDays: number;
  upiId?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  plan: "Lunch" | "Dinner" | "Both";
  monthlyFee: number;
  startDate: string;
  status: "active" | "paused" | "left";
  pauseFrom?: string;
  pauseTo?: string;
  language: Language;
  notes?: string;
};

export type Payment = {
  id: string;
  amount: number;
  date: string;
  method: "UPI" | "Cash";
};

export type Reminder = {
  id: string;
  date: string;
  tone: "gentle" | "firm" | "final";
  language: Language;
};

export type Invoice = {
  id: string;
  customerId: string;
  billingMonth: string; // "YYYY-MM"
  description?: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  payments: Payment[];
  reminders: Reminder[];
};

export type BillCategory =
  | "rent"
  | "salary"
  | "vegetables"
  | "gas"
  | "groceries"
  | "packaging"
  | "other";

// monthly: day = day of month (1-31)
// weekly: weekday = 0 (Sunday) to 6 (Saturday)
export type Recurrence =
  | { type: "monthly"; day: number }
  | { type: "weekly"; weekday: number }
  | { type: "everyNDays"; n: number; startDate: string }
  | { type: "oneOff"; date: string };

export type Bill = {
  id: string;
  name: string;
  category: BillCategory;
  amount: number;
  recurrence: Recurrence;
};

export type AppData = {
  version: number;
  business: Business;
  customers: Customer[];
  invoices: Invoice[];
  bills: Bill[];
};