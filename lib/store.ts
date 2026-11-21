import type { AppData, Bill, Business, Customer, Invoice, Payment, Reminder } from "./types";
import { monthKey, todayISO } from "./dates";
import { buildSeedData } from "./seed";
import { planMonthlyInvoices } from "./billing";

const KEY = "tijori-data-v1";

export function emptyData(): AppData {
  return {
    version: 1,
    business: {
      name: "My Business",
      ownerName: "",
      city: "",
      cashInHand: 0,
      safetyBuffer: 0,
      defaultDueDays: 5,
    },
    customers: [],
    invoices: [],
    bills: [],
  };
}

function load(): AppData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as AppData;
    const seed = buildSeedData(todayISO());
    window.localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  } catch {
    return emptyData();
  }
}
let cache: AppData | null = null;
const listeners = new Set<() => void>();

function current(): AppData {
  if (cache === null) cache = load();
  return cache;
}

function commit(next: AppData): void {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage full or disabled: keep the in-memory copy
    }
  }
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): AppData {
  return current();
}

export function getData(): AppData {
  return current();
}

export function updateBusiness(partial: Partial<Business>): void {
  const cur = current();
  commit({ ...cur, business: { ...cur.business, ...partial } });
}

export function addCustomer(customer: Omit<Customer, "id">): void {
  const cur = current();
  commit({ ...cur, customers: [...cur.customers, { ...customer, id: crypto.randomUUID() }] });
}

export function updateCustomer(id: string, partial: Partial<Omit<Customer, "id">>): void {
  const cur = current();
  commit({
    ...cur,
    customers: cur.customers.map((c) => (c.id === id ? { ...c, ...partial } : c)),
  });
}

export function addInvoice(
  invoice: Omit<Invoice, "id" | "payments" | "reminders"> &
    Partial<Pick<Invoice, "payments" | "reminders">>,
): void {
  const cur = current();
  const created: Invoice = {
    ...invoice,
    id: crypto.randomUUID(),
    payments: invoice.payments ?? [],
    reminders: invoice.reminders ?? [],
  };
  commit({ ...cur, invoices: [...cur.invoices, created] });
}

export function addOneOffInvoice(input: {
  customerId: string;
  description: string;
  amount: number;
  dueDate: string;
}): void {
  addInvoice({
    customerId: input.customerId,
    billingMonth: monthKey(input.dueDate),
    description: input.description,
    amount: input.amount,
    issueDate: todayISO(),
    dueDate: input.dueDate,
  });
}

export function addPayment(invoiceId: string, payment: Omit<Payment, "id">): void {
  const cur = current();
  commit({
    ...cur,
    invoices: cur.invoices.map((inv) =>
      inv.id === invoiceId
        ? { ...inv, payments: [...inv.payments, { ...payment, id: crypto.randomUUID() }] }
        : inv,
    ),
  });
}

export function addReminder(invoiceIds: string[], reminder: Omit<Reminder, "id">): void {
  const cur = current();
  const ids = new Set(invoiceIds);
  commit({
    ...cur,
    invoices: cur.invoices.map((inv) =>
      ids.has(inv.id)
        ? { ...inv, reminders: [...inv.reminders, { ...reminder, id: crypto.randomUUID() }] }
        : inv,
    ),
  });
}

export function addBill(bill: Omit<Bill, "id">): void {
  const cur = current();
  commit({ ...cur, bills: [...cur.bills, { ...bill, id: crypto.randomUUID() }] });
}

export function updateBill(id: string, partial: Partial<Omit<Bill, "id">>): void {
  const cur = current();
  commit({
    ...cur,
    bills: cur.bills.map((b) => (b.id === id ? { ...b, ...partial } : b)),
  });
}

export function deleteBill(id: string): void {
  const cur = current();
  commit({ ...cur, bills: cur.bills.filter((b) => b.id !== id) });
}

// Creates exactly the invoices planMonthlyInvoices returns, so the button and the action agree.
export function generateMonthlyInvoices(month: string): { created: number; total: number } {
  const cur = current();
  const fresh: Invoice[] = planMonthlyInvoices(cur, month).map((inv) => ({
    ...inv,
    id: crypto.randomUUID(),
  }));
  if (fresh.length > 0) commit({ ...cur, invoices: [...cur.invoices, ...fresh] });
  return { created: fresh.length, total: fresh.reduce((sum, i) => sum + i.amount, 0) };
}

export function replaceAll(data: AppData): void {
  commit(data);
}

export function resetDemoData(): void {
  commit(buildSeedData(todayISO()));
}
