"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { monthKey, todayISO } from "@/lib/dates";
import { amountOutstanding } from "@/lib/invoice";
import { invoiceLabel } from "@/lib/invoice-list";
import { parseCapture, pickInvoice } from "@/lib/capture";
import { addPayment } from "@/lib/store";
import { useTijoriData } from "@/lib/use-tijori-data";
import type { Payment } from "@/lib/types";

const FIELD =
  "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

type Draft = {
  customerId: string;
  amount: string;
  method: Payment["method"];
  month: string;
};

export function SmartCapture() {
  const data = useTijoriData();
  const today = todayISO();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [unreadable, setUnreadable] = useState(false);

  const customers = [...data.customers].sort((a, b) => a.name.localeCompare(b.name));
  const target = draft
    ? pickInvoice(data.invoices, draft.customerId, draft.month, today)
    : null;
  const outstanding = target ? amountOutstanding(target) : 0;
  const value = draft ? Number(draft.amount) : NaN;
  const amountOk =
    Number.isInteger(value) && value > 0 && value <= outstanding;

  function read() {
    const result = parseCapture(text, data.customers);
    if (result.customerId === null && result.amount === null) {
      setDraft(null);
      setUnreadable(true);
      return;
    }
    setUnreadable(false);
    setDraft({
      customerId: result.customerId ?? "",
      amount: result.amount === null ? "" : String(result.amount),
      method: result.method,
      month: result.month ?? monthKey(today),
    });
  }

  function confirm() {
    if (!draft || !target || !amountOk) return;
    const name = data.customers.find((c) => c.id === draft.customerId)?.name ?? "";
    addPayment(target.id, { amount: value, date: today, method: draft.method });
    toast(`₹${value.toLocaleString("en-IN")} received from ${name}`);
    setText("");
    setDraft(null);
    setUnreadable(false);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
          <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />
        </svg>
        Smart fill
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Paste a WhatsApp message, e.g. Paid 2400 for Nov - Rahul"
        className="w-full rounded-md border border-input bg-background p-3 text-sm"
      />
      <Button type="button" variant="outline" className="h-11 w-full sm:w-auto" onClick={read}>
        Read message
      </Button>

      {unreadable && (
        <p className="text-sm text-amber-800">Couldn&apos;t read that. Try: Paid 2400 – Rahul</p>
      )}

      {draft && (
        <div className="grid gap-3 rounded-xl bg-zinc-50 p-4">
          <div className="grid gap-1.5">
            <label htmlFor="cap-customer" className="text-sm font-medium">
              Customer
            </label>
            <select
              id="cap-customer"
              className={FIELD}
              value={draft.customerId}
              onChange={(e) => setDraft({ ...draft, customerId: e.target.value })}
            >
              <option value="">Choose…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="cap-amount" className="text-sm font-medium">
              Amount (₹)
            </label>
            <input
              id="cap-amount"
              inputMode="numeric"
              className={FIELD}
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="cap-method" className="text-sm font-medium">
              Method
            </label>
            <select
              id="cap-method"
              className={FIELD}
              value={draft.method}
              onChange={(e) =>
                setDraft({ ...draft, method: e.target.value as Payment["method"] })
              }
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <p className="text-sm text-zinc-700">
            {target
              ? `Goes to: ${invoiceLabel(target)} · ₹${outstanding.toLocaleString("en-IN")} outstanding`
              : "No open invoice"}
          </p>

          <Button
            type="button"
            className="h-11 w-full"
            disabled={!target || !amountOk}
            onClick={confirm}
          >
            Confirm
          </Button>
        </div>
      )}
    </section>
  );
}
