"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RecordPaymentDialog } from "@/components/invoices/invoice-dialogs";
import { RemindDialog } from "@/components/reminders/remind-dialog";
import { ChaseFlow } from "@/components/reminders/chase-flow";
import { todayISO } from "@/lib/dates";
import { formatDate, formatINR } from "@/lib/format";
import { amountOutstanding } from "@/lib/invoice";
import {
  DUE_BUCKETS,
  chasePriority,
  customerDues,
  duesSummary,
  type CustomerDue,
  type DueBucket,
} from "@/lib/dues";
import { useTijoriData } from "@/lib/use-tijori-data";
import type { AppData, Invoice } from "@/lib/types";

type SortKey = "chase" | "most" | "oldest";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "chase", label: "Chase first" },
  { key: "most", label: "Most owed" },
  { key: "oldest", label: "Oldest" },
];

const BUCKET_LABEL: Record<DueBucket, string> = {
  notDue: "Not due yet",
  "1-7": "1–7 days",
  "8-30": "8–30 days",
  "30+": "30+ days",
};

const BUCKET_TONE: Record<DueBucket, string> = {
  notDue: "border-green-600 bg-green-50 text-green-900",
  "1-7": "border-amber-500 bg-amber-50 text-amber-900",
  "8-30": "border-orange-500 bg-orange-50 text-orange-900",
  "30+": "border-red-600 bg-red-50 text-red-900",
};

const BUCKET_TEXT: Record<DueBucket, string> = {
  notDue: "text-green-800",
  "1-7": "text-amber-700",
  "8-30": "text-orange-700",
  "30+": "text-red-700",
};

const DAY_MS = 86400000;

// Whole days from `from` to `to` (both "YYYY-MM-DD"), UTC-based.
function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY_MS);
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function reminderText(lastReminderDate: string | null, today: string): string {
  if (lastReminderDate === null) return "never reminded";
  const days = daysBetween(lastReminderDate, today);
  if (days === 0) return "reminded today";
  if (days === 1) return "reminded 1 day ago";
  return `reminded ${days} days ago`;
}

// Oldest unpaid invoice: smallest dueDate, ties broken by earliest issueDate.
function oldestUnpaid(data: AppData, customerId: string): Invoice | null {
  const unpaid = data.invoices.filter(
    (inv) => inv.customerId === customerId && amountOutstanding(inv) > 0,
  );
  if (unpaid.length === 0) return null;
  return unpaid.reduce((a, b) => {
    if (b.dueDate !== a.dueDate) return b.dueDate < a.dueDate ? b : a;
    return b.issueDate < a.issueDate ? b : a;
  });
}

export default function DuesPage() {
  const data = useTijoriData();
  const today = todayISO();
  const entries = useMemo(() => customerDues(data, today), [data, today]);
  const summary = useMemo(() => duesSummary(entries), [entries]);

  const [bucket, setBucket] = useState<DueBucket | null>(null);
  const [sort, setSort] = useState<SortKey>("chase");
  const [selected, setSelected] = useState<{ invoice: Invoice; customerName: string } | null>(
    null,
  );
  const [remindId, setRemindId] = useState<string | null>(null);
  const [chaseOpen, setChaseOpen] = useState(false);

  const visible = useMemo(() => {
    const list = bucket ? entries.filter((e) => e.bucket === bucket) : [...entries];
    if (sort === "most") return list.sort((a, b) => b.totalOwed - a.totalOwed);
    if (sort === "oldest") {
      return list.sort((a, b) =>
        a.oldestDueDate < b.oldestDueDate ? -1 : a.oldestDueDate > b.oldestDueDate ? 1 : 0,
      );
    }
    const score = new Map(list.map((e) => [e.customerId, chasePriority(e, data, today)]));
    return list.sort((a, b) => (score.get(b.customerId) ?? 0) - (score.get(a.customerId) ?? 0));
  }, [entries, bucket, sort, data, today]);

  const chaseIds = useMemo(() => {
    const overdue = entries.filter((e) => e.daysOverdue > 0);
    const score = new Map(overdue.map((e) => [e.customerId, chasePriority(e, data, today)]));
    return overdue
      .map((e) => e.customerId)
      .sort((a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0));
  }, [entries, data, today]);

  function recordFor(entry: CustomerDue) {
    const invoice = oldestUnpaid(data, entry.customerId);
    if (!invoice) {
      toast("No unpaid invoice to record against");
      return;
    }
    setSelected({ invoice, customerName: entry.name });
  }

  const clearFilter = () => setBucket(null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-green-900">Who owes me</h1>
        <p className="mt-2 text-4xl font-bold tabular-nums text-green-900">
          {formatINR(summary.totalOwed)}
        </p>
        <p className="text-base text-slate-600">
          from {summary.customerCount} {plural(summary.customerCount, "customer", "customers")}
        </p>
        {chaseIds.length > 0 && (
          <Button
            variant="outline"
            className="mt-3 h-11 min-h-11 w-full sm:w-auto"
            onClick={() => setChaseOpen(true)}
          >
            Remind all overdue
          </Button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DUE_BUCKETS.map((b) => {
          const seg = summary.buckets[b];
          const active = bucket === b;
          return (
            <button
              key={b}
              type="button"
              aria-pressed={active}
              onClick={() => setBucket(active ? null : b)}
              className={`min-h-11 rounded-2xl border-2 p-3 text-left transition ${BUCKET_TONE[b]} ${
                active ? "ring-2 ring-slate-900" : ""
              }`}
            >
              <span className="block text-sm font-medium">{BUCKET_LABEL[b]}</span>
              <span className="block text-lg font-bold tabular-nums">{formatINR(seg.amount)}</span>
              <span className="block text-sm">
                {seg.count} {plural(seg.count, "customer", "customers")}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Sort">
        {SORTS.map((s) => {
          const active = sort === s.key;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={active}
              onClick={() => setSort(s.key)}
              className={`min-h-11 rounded-full border px-2 text-sm font-medium ${
                active
                  ? "border-green-800 bg-green-800 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {bucket && (
        <p className="text-sm text-slate-700">
          Showing: {BUCKET_LABEL[bucket]} ·{" "}
          <button
            type="button"
            onClick={clearFilter}
            className="min-h-11 px-1 font-medium text-green-800 underline"
          >
            Clear
          </button>
        </p>
      )}

      {!bucket && entries.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-lg text-slate-800">
          Nobody owes you anything. 🎉
        </div>
      )}

      {bucket && visible.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center text-lg text-slate-800">
          <p>No one in this group.</p>
          <button
            type="button"
            onClick={clearFilter}
            className="min-h-11 px-3 font-medium text-green-800 underline"
          >
            Clear
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {visible.map((e) => (
          <li
            key={e.customerId}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <Link
              href={`/app/customers/${e.customerId}`}
              className="inline-flex min-h-11 items-center text-lg font-semibold text-slate-900 hover:underline"
            >
              {e.name}
            </Link>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
              {formatINR(e.totalOwed)}
            </p>
            <p className={`text-sm font-medium ${BUCKET_TEXT[e.bucket]}`}>
              since {formatDate(e.oldestDueDate)} ·{" "}
              {e.daysOverdue === 0
                ? "not due yet"
                : `${e.daysOverdue} ${plural(e.daysOverdue, "day", "days")} overdue`}
            </p>
            <p className="text-sm text-slate-600">
              {e.unpaidCount} unpaid {plural(e.unpaidCount, "month", "months")}
            </p>
            <p className="text-sm text-slate-500">{reminderText(e.lastReminderDate, today)}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="h-11 min-h-11 w-full sm:w-auto"
                onClick={() => setRemindId(e.customerId)}
              >
                Remind
              </Button>
              <Button
                className="h-11 min-h-11 w-full bg-green-800 text-white hover:bg-green-700 sm:w-auto"
                onClick={() => recordFor(e)}
              >
                Record payment
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <RecordPaymentDialog
        invoice={selected?.invoice ?? null}
        customerName={selected?.customerName ?? ""}
        onClose={() => setSelected(null)}
      />

      <RemindDialog
        customerId={remindId ?? ""}
        open={remindId !== null}
        onClose={() => setRemindId(null)}
      />

      <ChaseFlow
        customerIds={chaseIds}
        open={chaseOpen}
        onClose={() => setChaseOpen(false)}
      />
    </div>
  );
}
