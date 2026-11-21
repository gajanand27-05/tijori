"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDate, formatINR } from "@/lib/format";
import { amountOutstanding, amountPaid, daysOverdue, getInvoiceStatus } from "@/lib/invoice";
import { invoiceLabel } from "@/lib/invoice-list";
import type { Invoice, Language } from "@/lib/types";
import { StatusBadge } from "./invoice-row";

const LANGUAGE: Record<Language, string> = { en: "English", hi: "Hindi", kn: "Kannada" };

type Props = {
  invoice: Invoice | null;
  customerName: string;
  today: string;
  onClose: () => void;
  onRecord: (id: string) => void;
};

export function InvoiceDetailSheet({ invoice, customerName, today, onClose, onRecord }: Props) {
  return (
    <Sheet
      open={invoice !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto sm:mx-auto sm:max-w-lg sm:rounded-t-2xl"
      >
        {invoice && (
          <div className="space-y-5 pb-2">
            <SheetHeader className="pr-10">
              <SheetTitle className="text-lg">{customerName}</SheetTitle>
              <p className="text-sm text-zinc-600">{invoiceLabel(invoice)}</p>
              <Button
                variant="link"
                className="h-11 justify-start px-0"
                render={<Link href={`/app/customers/${invoice.customerId}`} />}
              >
                Open customer page
              </Button>
            </SheetHeader>

            <div className="flex items-center justify-between gap-3 px-4">
              <StatusBadge status={getInvoiceStatus(invoice, today)} />
              {daysOverdue(invoice, today) > 0 && (
                <span className="text-sm font-medium text-red-700">
                  {daysOverdue(invoice, today)} days late
                </span>
              )}
            </div>

            <dl className="grid grid-cols-3 gap-3 px-4 text-sm">
              <div>
                <dt className="text-zinc-600">Amount</dt>
                <dd className="font-semibold tabular-nums">{formatINR(invoice.amount)}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">Paid</dt>
                <dd className="font-semibold tabular-nums">{formatINR(amountPaid(invoice))}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">Outstanding</dt>
                <dd className="font-semibold tabular-nums">{formatINR(amountOutstanding(invoice))}</dd>
              </div>
              <div className="col-span-3">
                <dt className="text-zinc-600">Due</dt>
                <dd className="font-semibold">{formatDate(invoice.dueDate)}</dd>
              </div>
            </dl>

            <section className="px-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-900">Payments</h3>
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-zinc-600">No payments yet.</p>
              ) : (
                <ul className="divide-y divide-zinc-200 text-sm">
                  {invoice.payments.map((p) => (
                    <li key={p.id} className="flex justify-between py-2">
                      <span>
                        {formatDate(p.date)} · {p.method}
                      </span>
                      <span className="tabular-nums">{formatINR(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="px-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-900">Reminders</h3>
              {invoice.reminders.length === 0 ? (
                <p className="text-sm text-zinc-600">No reminders sent.</p>
              ) : (
                <ul className="divide-y divide-zinc-200 text-sm">
                  {invoice.reminders.map((r) => (
                    <li key={r.id} className="flex justify-between py-2">
                      <span>{formatDate(r.date)}</span>
                      <span className="capitalize">
                        {r.tone} · {LANGUAGE[r.language]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {amountOutstanding(invoice) > 0 && (
              <div className="px-4">
                <Button className="h-11 w-full" onClick={() => onRecord(invoice.id)}>
                  Record payment
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
