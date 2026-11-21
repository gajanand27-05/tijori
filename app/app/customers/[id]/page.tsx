"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useTijoriData } from "@/lib/use-tijori-data";
import { updateCustomer } from "@/lib/store";
import { amountOutstanding, daysOverdue, getInvoiceStatus } from "@/lib/invoice";
import { averageDelayDays, customerOutstanding, delayLabel } from "@/lib/customer-stats";
import { formatINR, formatDate, formatDateLong } from "@/lib/format";
import { todayISO, addDays } from "@/lib/dates";
import type { Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/page-title";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog";
import { RemindDialog } from "@/components/reminders/remind-dialog";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "YYYY-MM" -> "Nov 2026"
function monthLabel(billingMonth: string): string {
  const year = billingMonth.slice(0, 4);
  const monthIndex = Number(billingMonth.slice(5, 7)) - 1;
  return `${MONTH_NAMES[monthIndex] ?? billingMonth} ${year}`;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  left: "Left",
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  partial: "Partly paid",
  due: "Due",
  overdue: "Overdue",
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);
  const { customers, invoices } = useTijoriData();

  const today = todayISO();

  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseFrom, setPauseFrom] = useState(today);
  const [pauseTo, setPauseTo] = useState(addDays(today, 7));
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);

  const customer = customers.find((c) => c.id === id);

  if (!customer) {
    return (
      <div className="space-y-6">
        <p className="text-lg">Customer not found</p>
        <Link
          href="/app/customers"
          className="inline-flex min-h-[44px] items-center text-base underline"
        >
          ← Customers
        </Link>
      </div>
    );
  }

  const customerInvoices = invoices
    .filter((inv) => inv.customerId === customer.id)
    .sort((a, b) => (a.billingMonth < b.billingMonth ? 1 : a.billingMonth > b.billingMonth ? -1 : 0));

  const outstanding = customerOutstanding(customer.id, invoices);
  const delay = delayLabel(averageDelayDays(customer.id, invoices));

  const reminders = customerInvoices
    .flatMap((inv) => inv.reminders)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // Plain YYYY-MM-DD strings compare correctly as text.
  const pauseRangeError = pauseTo < pauseFrom ? "The end date can't be before the start date." : null;

  function handlePause() {
    if (pauseRangeError) return;
    updateCustomer(customer!.id, { status: "paused", pauseFrom, pauseTo });
    setPauseOpen(false);
    toast.success(`${customer!.name} paused`);
  }

  function handleLeave() {
    updateCustomer(customer!.id, { status: "left" });
    setLeaveOpen(false);
    toast.success(`${customer!.name} marked as left`);
  }

  function handleResume() {
    updateCustomer(customer!.id, {
      status: "active",
      pauseFrom: undefined,
      pauseTo: undefined,
    });
    toast.success(`${customer!.name} resumed`);
  }

  function handleReactivate() {
    updateCustomer(customer!.id, { status: "active" });
    toast.success(`${customer!.name} reactivated`);
  }

  return (
    <div className="space-y-6">
      <PageTitle title={`${customer.name} · Tijori`} />
      <Link
        href="/app/customers"
        className="inline-flex min-h-[44px] items-center text-base underline"
      >
        ← Customers
      </Link>

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{customer.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-base">{customer.phone}</p>
          <p className="text-base">
            {customer.plan} · {formatINR(customer.monthlyFee)}/mo
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{STATUS_LABEL[customer.status] ?? customer.status}</Badge>
            {customer.status === "paused" && customer.pauseFrom && customer.pauseTo && (
              <span className="text-sm text-muted-foreground">
                Paused {formatDate(customer.pauseFrom)} – {formatDate(customer.pauseTo)}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Customer since {formatDateLong(customer.startDate)}
          </p>
          <p className="text-sm text-muted-foreground">{delay}</p>
        </CardContent>
      </Card>

      {/* Outstanding */}
      <Card>
        <CardContent className="py-6">
          {outstanding > 0 ? (
            <p className="text-4xl font-bold text-red-600">
              {formatINR(outstanding)}
            </p>
          ) : (
            <p className="text-4xl font-bold text-green-600">All paid up ✓</p>
          )}
          <p className="text-sm text-muted-foreground">outstanding</p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {outstanding > 0 && (
          <Button
            variant="outline"
            className="min-h-[44px] min-w-[44px] text-base"
            onClick={() => setRemindOpen(true)}
          >
            Remind
          </Button>
        )}
        <EditCustomerDialog customer={customer} />
        {customer.status === "active" && (
          <>
            <Button
              className="min-h-[44px] min-w-[44px] text-base"
              onClick={() => {
                setPauseFrom(today);
                setPauseTo(addDays(today, 7));
                setPauseOpen(true);
              }}
            >
              Pause
            </Button>
            <Button
              variant="destructive"
              className="min-h-[44px] min-w-[44px] text-base"
              onClick={() => setLeaveOpen(true)}
            >
              Mark as left
            </Button>
          </>
        )}
        {customer.status === "paused" && (
          <Button
            className="min-h-[44px] min-w-[44px] text-base"
            onClick={handleResume}
          >
            Resume
          </Button>
        )}
        {customer.status === "left" && (
          <Button
            className="min-h-[44px] min-w-[44px] text-base"
            onClick={handleReactivate}
          >
            Reactivate
          </Button>
        )}
      </div>

      <RemindDialog
        customerId={customer.id}
        open={remindOpen}
        onClose={() => setRemindOpen(false)}
      />

      {/* Pause dialog */}
      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause {customer.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="pause-from">From</Label>
              <Input
                id="pause-from"
                type="date"
                className="min-h-[44px] text-base"
                value={pauseFrom}
                onChange={(e) => setPauseFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pause-to">To</Label>
              <Input
                id="pause-to"
                type="date"
                className="min-h-[44px] text-base"
                value={pauseTo}
                onChange={(e) => setPauseTo(e.target.value)}
              />
            </div>
            {pauseRangeError && (
              <p role="alert" className="text-sm text-red-600">
                {pauseRangeError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-[44px] min-w-[44px] text-base"
              onClick={() => setPauseOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="min-h-[44px] min-w-[44px] text-base"
              onClick={handlePause}
              disabled={pauseRangeError !== null}
            >
              Confirm pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as left confirm dialog */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {customer.name} as left?</DialogTitle>
          </DialogHeader>
          <p className="text-base">
            They will stop receiving deliveries. You can reactivate them later.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-[44px] min-w-[44px] text-base"
              onClick={() => setLeaveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="min-h-[44px] min-w-[44px] text-base"
              onClick={handleLeave}
            >
              Mark as left
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {customerInvoices.length === 0 && (
            <p className="text-base text-muted-foreground">No invoices yet</p>
          )}
          {customerInvoices.map((inv: Invoice) => {
            const status = getInvoiceStatus(inv, today);
            const due = amountOutstanding(inv);
            const late = daysOverdue(inv, today);
            const paidDate =
              inv.payments.length > 0
                ? inv.payments.reduce((max, p) => (p.date > max ? p.date : max), inv.payments[0].date)
                : undefined;
            return (
              <div
                key={inv.id}
                className="flex flex-col gap-1 rounded-md border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-medium">{monthLabel(inv.billingMonth)}</span>
                  <span className="text-base">{formatINR(inv.amount)}</span>
                </div>
                <div>
                  <Badge variant="outline">{INVOICE_STATUS_LABEL[status] ?? status}</Badge>
                </div>
                {inv.payments.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {inv.payments.map((p) => (
                      <li key={p.id} className="text-sm">
                        {formatINR(p.amount)} · {p.method} · {formatDate(p.date)}
                      </li>
                    ))}
                  </ul>
                )}
                {due <= 0 ? (
                  paidDate && (
                    <p className="text-sm text-muted-foreground">
                      Paid on {formatDate(paidDate)}
                    </p>
                  )
                ) : status === "overdue" ? (
                  <p className="text-sm text-red-600">
                    {formatINR(due)} due · {late} days late
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {formatINR(due)} due on {formatDate(inv.dueDate)}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {reminders.length === 0 ? (
            <p className="text-base text-muted-foreground">No reminders sent yet</p>
          ) : (
            reminders.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 text-base"
              >
                <span>{formatDate(r.date)}</span>
                <span className="capitalize">{r.tone}</span>
                <span className="uppercase">{r.language}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
