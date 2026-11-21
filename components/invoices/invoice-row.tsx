"use client";

import { Button } from "@/components/ui/button";
import { formatDate, formatINR } from "@/lib/format";
import { amountOutstanding, daysOverdue, getInvoiceStatus, type InvoiceStatus } from "@/lib/invoice";
import { invoiceLabel } from "@/lib/invoice-list";
import type { Invoice } from "@/lib/types";

const LABEL: Record<InvoiceStatus, string> = {
  paid: "Paid",
  partial: "Partly paid",
  due: "Due",
  overdue: "Overdue",
};

const STYLE: Record<InvoiceStatus, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-900",
  due: "bg-zinc-100 text-zinc-800",
  overdue: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${STYLE[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}

type Props = {
  invoice: Invoice;
  customerName: string;
  today: string;
  onOpen: (id: string) => void;
  onRecord: (id: string) => void;
};

export function InvoiceRow({ invoice, customerName, today, onOpen, onRecord }: Props) {
  const outstanding = amountOutstanding(invoice);
  const status = getInvoiceStatus(invoice, today);
  const late = daysOverdue(invoice, today);

  return (
    <li className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onOpen(invoice.id)}
        className="flex min-h-11 w-full min-w-0 flex-col gap-2 rounded-t-2xl p-4 text-left hover:bg-zinc-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-900">{customerName}</p>
            <p className="truncate text-sm text-zinc-600">{invoiceLabel(invoice)}</p>
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-zinc-600">
          <span>Amount {formatINR(invoice.amount)}</span>
          <span>
            Outstanding <strong className="font-semibold text-zinc-900">{formatINR(outstanding)}</strong>
          </span>
          <span>Due {formatDate(invoice.dueDate)}</span>
          {late > 0 && (
            <span className="font-medium text-red-700">
              {late} {late === 1 ? "day" : "days"} late
            </span>
          )}
        </div>
      </button>
      {outstanding > 0 && (
        <div className="px-4 pb-4">
          <Button variant="outline" className="h-11 w-full" onClick={() => onRecord(invoice.id)}>
            Record payment
          </Button>
        </div>
      )}
    </li>
  );
}
