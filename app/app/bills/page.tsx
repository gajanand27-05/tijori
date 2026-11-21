"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Carrot,
  Flame,
  House,
  Package,
  Receipt,
  ShoppingBasket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/page-title";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { upcomingBills, nextDueDate, recurrenceLabel, type BillOccurrence } from "@/lib/bills";
import { todayISO } from "@/lib/dates";
import { formatDate, formatINR } from "@/lib/format";
import { addBill, updateBill, deleteBill } from "@/lib/store";
import { useTijoriData } from "@/lib/use-tijori-data";
import type { Bill, BillCategory, Recurrence } from "@/lib/types";

const FIELD =
  "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

const CATEGORY_OPTIONS: { value: BillCategory; label: string; icon: LucideIcon }[] = [
  { value: "rent", label: "Rent", icon: House },
  { value: "salary", label: "Salary", icon: Users },
  { value: "vegetables", label: "Vegetables", icon: Carrot },
  { value: "gas", label: "Gas", icon: Flame },
  { value: "groceries", label: "Groceries", icon: ShoppingBasket },
  { value: "packaging", label: "Packaging", icon: Package },
  { value: "other", label: "Other", icon: Receipt },
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type RepeatType = "monthly" | "weekly" | "everyNDays" | "oneOff";

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "everyNDays", label: "Every N days" },
  { value: "oneOff", label: "One-off" },
];

function categoryIcon(category: BillCategory): LucideIcon {
  return CATEGORY_OPTIONS.find((o) => o.value === category)?.icon ?? Receipt;
}

/* ---------- Date helpers (UTC, YYYY-MM-DD) ---------- */

function isISODate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Monday of the week containing `iso`. */
function mondayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((dow + 6) % 7));
}

/* ---------- Page ---------- */

export default function BillsPage() {
  const data = useTijoriData();
  const bills = data.bills;
  const today = todayISO();
  const end = addDays(today, 30);

  const [dialog, setDialog] = useState<{ bill?: Bill } | null>(null);

  const sortedBills = [...bills].sort((a, b) => a.name.localeCompare(b.name));
  const upcoming = upcomingBills(bills, today, end);
  const total = upcoming.reduce((sum, o) => sum + o.amount, 0);

  // Group the (date-ordered) occurrences into Monday-start weeks.
  const weeks: { monday: string; items: BillOccurrence[] }[] = [];
  for (const occ of upcoming) {
    const monday = mondayOf(occ.date);
    const last = weeks[weeks.length - 1];
    if (last && last.monday === monday) {
      last.items.push(occ);
    } else {
      weeks.push({ monday, items: [occ] });
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Bills · Tijori" />
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Bills</h1>
        <p className="text-lg font-medium">
          Bills in the next 30 days: {formatINR(total)}
        </p>
        <Button
          type="button"
          className="mt-2 h-11 w-full sm:w-auto"
          onClick={() => setDialog({})}
        >
          Add bill
        </Button>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your bills</h2>
        {sortedBills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bills yet.</p>
        ) : (
          <ul className="space-y-2">
            {sortedBills.map((bill) => {
              const Icon = categoryIcon(bill.category);
              const next = nextDueDate(bill, today);
              return (
                <li key={bill.id}>
                  <button
                    type="button"
                    onClick={() => setDialog({ bill })}
                    className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-lg border p-3 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{bill.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {recurrenceLabel(bill.recurrence)}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {next ? `Next: ${formatDate(next)}` : "No upcoming date"}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium">
                      {formatINR(bill.amount)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Coming up (30 days)</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing due in the next 30 days.</p>
        ) : (
          weeks.map((week) => (
            <div key={week.monday} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Week of {formatDate(week.monday)}
              </h3>
              <ul className="space-y-2">
                {week.items.map((occ) => (
                  <li
                    key={`${occ.billId}-${occ.date}`}
                    className="min-h-11 rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground">{formatDate(occ.date)}</p>
                        <p className="truncate font-medium">{occ.name}</p>
                      </div>
                      <p className="shrink-0 text-sm font-medium">{formatINR(occ.amount)}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Running total {formatINR(occ.runningTotal)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <BillDialog
        open={dialog !== null}
        bill={dialog?.bill}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

/* ---------- Add / edit dialog ---------- */

type BillDialogProps = {
  open: boolean;
  onClose: () => void;
  bill?: Bill;
};

export function BillDialog({ open, onClose, bill }: BillDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        {open && <BillForm key={bill?.id ?? "new"} bill={bill} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function BillForm({ bill, onDone }: { bill?: Bill; onDone: () => void }) {
  const today = todayISO();
  const r = bill?.recurrence;

  const [name, setName] = useState(bill?.name ?? "");
  const [category, setCategory] = useState<BillCategory>(bill?.category ?? "other");
  const [amount, setAmount] = useState(bill ? String(bill.amount) : "");
  const [repeat, setRepeat] = useState<RepeatType>(r?.type ?? "monthly");
  const [monthDay, setMonthDay] = useState(String(r?.type === "monthly" ? r.day : 1));
  const [weekday, setWeekday] = useState(String(r?.type === "weekly" ? r.weekday : 1));
  const [everyN, setEveryN] = useState(String(r?.type === "everyNDays" ? r.n : 7));
  const [startDate, setStartDate] = useState(
    r?.type === "everyNDays" ? r.startDate : today,
  );
  const [oneOffDate, setOneOffDate] = useState(r?.type === "oneOff" ? r.date : today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  function save() {
    const trimmed = name.trim();
    const value = Number(amount);
    const day = Number(monthDay);
    const wd = Number(weekday);
    const n = Number(everyN);
    const e: Record<string, string> = {};

    if (!trimmed) e.name = "Enter a name";
    else if (trimmed.length > 60) e.name = "Keep it under 60 characters";

    if (amount.trim() === "" || !Number.isInteger(value) || value <= 0) {
      e.amount = "Enter whole rupees, more than ₹0";
    }

    if (repeat === "monthly") {
      if (monthDay.trim() === "" || !Number.isInteger(day) || day < 1 || day > 31) {
        e.monthDay = "Enter a day from 1 to 31";
      }
    }
    if (repeat === "everyNDays") {
      if (everyN.trim() === "" || !Number.isInteger(n) || n < 1) {
        e.everyN = "Enter a whole number, 1 or more";
      }
      if (!isISODate(startDate)) e.startDate = "Pick a start date";
    }
    if (repeat === "oneOff" && !isISODate(oneOffDate)) {
      e.oneOffDate = "Pick a date";
    }

    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const recurrence: Recurrence =
      repeat === "monthly"
        ? { type: "monthly", day }
        : repeat === "weekly"
          ? { type: "weekly", weekday: wd }
          : repeat === "everyNDays"
            ? { type: "everyNDays", n, startDate }
            : { type: "oneOff", date: oneOffDate };

    const fields = { name: trimmed, category, amount: value, recurrence };
    if (bill) {
      updateBill(bill.id, fields);
    } else {
      addBill(fields);
    }
    toast("Bill saved");
    onDone();
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        save();
      }}
    >
      <DialogHeader>
        <DialogTitle>{bill ? "Edit bill" : "Add bill"}</DialogTitle>
        <DialogDescription>Set how much is due and how often.</DialogDescription>
      </DialogHeader>

      <Field id="bill-name" label="Name" error={errors.name}>
        <input
          id="bill-name"
          className={FIELD}
          value={name}
          onChange={(ev) => setName(ev.target.value)}
        />
      </Field>

      <Field id="bill-category" label="Category">
        <select
          id="bill-category"
          className={FIELD}
          value={category}
          onChange={(ev) => setCategory(ev.target.value as BillCategory)}
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id="bill-amount" label="Amount (₹)" error={errors.amount}>
        <input
          id="bill-amount"
          inputMode="numeric"
          className={FIELD}
          value={amount}
          onChange={(ev) => setAmount(ev.target.value)}
        />
      </Field>

      <Field id="bill-repeat" label="Repeats">
        <select
          id="bill-repeat"
          className={FIELD}
          value={repeat}
          onChange={(ev) => setRepeat(ev.target.value as RepeatType)}
        >
          {REPEAT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      {repeat === "monthly" && (
        <Field id="bill-day" label="Day of month" error={errors.monthDay}>
          <input
            id="bill-day"
            inputMode="numeric"
            className={FIELD}
            value={monthDay}
            onChange={(ev) => setMonthDay(ev.target.value)}
          />
        </Field>
      )}

      {repeat === "weekly" && (
        <Field id="bill-weekday" label="Weekday">
          <select
            id="bill-weekday"
            className={FIELD}
            value={weekday}
            onChange={(ev) => setWeekday(ev.target.value)}
          >
            {WEEKDAYS.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {repeat === "everyNDays" && (
        <>
          <Field id="bill-n" label="Every how many days?" error={errors.everyN}>
            <input
              id="bill-n"
              inputMode="numeric"
              className={FIELD}
              value={everyN}
              onChange={(ev) => setEveryN(ev.target.value)}
            />
          </Field>
          <Field id="bill-start" label="Start date" error={errors.startDate}>
            <input
              id="bill-start"
              type="date"
              className={FIELD}
              value={startDate}
              onChange={(ev) => setStartDate(ev.target.value)}
            />
          </Field>
        </>
      )}

      {repeat === "oneOff" && (
        <Field id="bill-date" label="Date" error={errors.oneOffDate}>
          <input
            id="bill-date"
            type="date"
            className={FIELD}
            value={oneOffDate}
            onChange={(ev) => setOneOffDate(ev.target.value)}
          />
        </Field>
      )}

      {bill && !confirming && (
        <Button
          type="button"
          className="h-11 w-full"
          onClick={() => setConfirming(true)}
        >
          Delete bill
        </Button>
      )}

      {bill && confirming && (
        <div className="grid gap-3">
          <p className="text-sm">{`Delete ${bill.name}? This can't be undone.`}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              className="h-11"
              onClick={() => {
                deleteBill(bill.id);
                toast("Bill deleted");
                onDone();
              }}
            >
              Yes, delete
            </Button>
            <Button type="button" className="h-11" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="submit" className="h-11 w-full sm:w-auto">
          Save bill
        </Button>
      </DialogFooter>
    </form>
  );
}
