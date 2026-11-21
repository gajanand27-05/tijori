"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/page-title";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartCapture } from "@/components/capture/smart-capture";
import { InvoiceDetailSheet } from "@/components/invoices/invoice-detail-sheet";
import { InvoiceRow } from "@/components/invoices/invoice-row";
import { NewInvoiceDialog, RecordPaymentDialog } from "@/components/invoices/invoice-dialogs";
import { planMonthlyInvoices } from "@/lib/billing";
import { monthKey, todayISO } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import {
  countsByTab,
  INVOICE_TABS,
  invoicesForTab,
  monthName,
  type InvoiceTab,
} from "@/lib/invoice-list";
import { generateMonthlyInvoices } from "@/lib/store";
import { useTijoriData } from "@/lib/use-tijori-data";

const EMPTY: Record<InvoiceTab, string> = {
  overdue: "Nobody is overdue. 🎉",
  due: "Nothing else is due right now.",
  partial: "No part-paid bills.",
  paid: "No paid bills yet.",
  all: "No bills yet. Generate this month's bills to start.",
};

export default function InvoicesPage() {
  const data = useTijoriData();
  const today = todayISO();
  const month = monthKey(today);
  const plan = planMonthlyInvoices(data, month);
  const planTotal = plan.reduce((sum, i) => sum + i.amount, 0);
  const label = monthName(month);

  const [tab, setTab] = useState<InvoiceTab>("overdue");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const names = useMemo(
    () => new Map(data.customers.map((c) => [c.id, c.name])),
    [data.customers],
  );
  const nameOf = (id: string) => names.get(id) ?? "Unknown customer";
  const shown = invoicesForTab(data.invoices, tab, today);
  const counts = countsByTab(data.invoices, today);
  const detail = data.invoices.find((i) => i.id === detailId) ?? null;
  const paying = data.invoices.find((i) => i.id === payingId) ?? null;
  const choosable = data.customers
    .filter((c) => c.status === "active" || c.status === "paused")
    .sort((a, b) => a.name.localeCompare(b.name));

  function generate() {
    const result = generateMonthlyInvoices(month);
    toast(`Created ${result.created} bills worth ${formatINR(result.total)}`);
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Invoices · Tijori" />
      <h1 className="text-3xl font-semibold text-zinc-900">Invoices</h1>

      <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
        <Button
          className="h-11 w-full text-base sm:w-auto"
          disabled={plan.length === 0}
          onClick={generate}
        >
          Generate {label} bills
        </Button>
        <p className="mt-3 text-sm text-zinc-700">
          {plan.length === 0
            ? `${label} bills are already generated ✓`
            : `${plan.length} ${plan.length === 1 ? "customer" : "customers"} · ${formatINR(planTotal)}`}
        </p>
      </section>

      <SmartCapture />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Bills</h2>
        <Button variant="outline" className="h-11" onClick={() => setNewOpen(true)}>
          New invoice
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as InvoiceTab)}>
        <TabsList className="h-auto w-full flex-wrap">
          {INVOICE_TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="h-11 min-w-0 flex-1">
              {t.label} <span className="tabular-nums">({counts[t.key]})</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-600">
          {EMPTY[tab]}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((inv) => (
            <InvoiceRow
              key={inv.id}
              invoice={inv}
              customerName={nameOf(inv.customerId)}
              today={today}
              onOpen={setDetailId}
              onRecord={setPayingId}
            />
          ))}
        </ul>
      )}

      <InvoiceDetailSheet
        invoice={detail}
        customerName={detail ? nameOf(detail.customerId) : ""}
        today={today}
        onClose={() => setDetailId(null)}
        onRecord={(id) => {
          setDetailId(null);
          setPayingId(id);
        }}
      />

      <RecordPaymentDialog
        invoice={paying}
        customerName={paying ? nameOf(paying.customerId) : ""}
        onClose={() => setPayingId(null)}
      />

      <NewInvoiceDialog
        open={newOpen}
        customers={choosable}
        onClose={() => setNewOpen(false)}
      />
    </div>
  );
}
