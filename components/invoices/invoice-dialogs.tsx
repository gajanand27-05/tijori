"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { todayISO } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { amountOutstanding } from "@/lib/invoice";
import { invoiceLabel } from "@/lib/invoice-list";
import { addOneOffInvoice, addPayment } from "@/lib/store";
import type { Customer, Invoice, Payment } from "@/lib/types";

const FIELD =
  "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

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

/* ---------- Record payment ---------- */

type PaymentProps = {
  invoice: Invoice | null;
  customerName: string;
  onClose: () => void;
};

export function RecordPaymentDialog({ invoice, customerName, onClose }: PaymentProps) {
  return (
    <Dialog open={invoice !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        {invoice && (
          <PaymentForm
            key={invoice.id}
            invoice={invoice}
            customerName={customerName}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  invoice,
  customerName,
  onDone,
}: {
  invoice: Invoice;
  customerName: string;
  onDone: () => void;
}) {
  const outstanding = amountOutstanding(invoice);
  const today = todayISO();
  const [amount, setAmount] = useState(String(outstanding));
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<Payment["method"]>("UPI");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function save() {
    const value = Number(amount);
    const e: Record<string, string> = {};
    if (amount.trim() === "" || !Number.isInteger(value)) {
      e.amount = "Enter whole rupees, like 2400";
    } else if (value <= 0) {
      e.amount = "Amount must be more than ₹0";
    } else if (value > outstanding) {
      e.amount = `Can't be more than ${formatINR(outstanding)}`;
    }
    if (!date) e.date = "Pick a date";
    else if (date > today) e.date = "Date can't be in the future";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    addPayment(invoice.id, { amount: value, date, method });
    toast(`${formatINR(value)} received from ${customerName}`);
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
        <DialogTitle>Record payment</DialogTitle>
        <DialogDescription>
          {customerName} · {invoiceLabel(invoice)} · {formatINR(outstanding)} outstanding
        </DialogDescription>
      </DialogHeader>

      <Field id="pay-amount" label="Amount (₹)" error={errors.amount}>
        <input
          id="pay-amount"
          inputMode="numeric"
          className={FIELD}
          value={amount}
          onChange={(ev) => setAmount(ev.target.value)}
        />
      </Field>

      <Field id="pay-date" label="Date" error={errors.date}>
        <input
          id="pay-date"
          type="date"
          max={today}
          className={FIELD}
          value={date}
          onChange={(ev) => setDate(ev.target.value)}
        />
      </Field>

      <Field id="pay-method" label="Method">
        <select
          id="pay-method"
          className={FIELD}
          value={method}
          onChange={(ev) => setMethod(ev.target.value as Payment["method"])}
        >
          <option value="UPI">UPI</option>
          <option value="Cash">Cash</option>
        </select>
      </Field>

      <DialogFooter>
        <Button type="submit" className="h-11 w-full sm:w-auto">
          Save payment
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ---------- New one-off invoice ---------- */

type NewProps = {
  open: boolean;
  customers: Customer[]; // caller passes active and paused customers only
  onClose: () => void;
};

export function NewInvoiceDialog({ open, customers, onClose }: NewProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        {open && <NewInvoiceForm customers={customers} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function NewInvoiceForm({ customers, onDone }: { customers: Customer[]; onDone: () => void }) {
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function save() {
    const value = Number(amount);
    const desc = description.trim();
    const e: Record<string, string> = {};
    if (!customers.some((c) => c.id === customerId)) e.customerId = "Choose a customer";
    if (!desc) e.description = "Say what this is for";
    else if (desc.length > 80) e.description = "Keep it under 80 characters";
    if (amount.trim() === "" || !Number.isInteger(value) || value <= 0) {
      e.amount = "Enter whole rupees, more than ₹0";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) e.dueDate = "Pick a due date";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    const name = customers.find((c) => c.id === customerId)?.name ?? "";
    addOneOffInvoice({ customerId, description: desc, amount: value, dueDate });
    toast(`Invoice added for ${name}: ${formatINR(value)}`);
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
        <DialogTitle>New invoice</DialogTitle>
        <DialogDescription>A one-off charge, such as a party order.</DialogDescription>
      </DialogHeader>

      <Field id="inv-customer" label="Customer" error={errors.customerId}>
        <select
          id="inv-customer"
          className={FIELD}
          value={customerId}
          onChange={(ev) => setCustomerId(ev.target.value)}
        >
          <option value="">Choose…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field id="inv-desc" label="Description" error={errors.description}>
        <input
          id="inv-desc"
          className={FIELD}
          maxLength={120}
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
        />
      </Field>

      <Field id="inv-amount" label="Amount (₹)" error={errors.amount}>
        <input
          id="inv-amount"
          inputMode="numeric"
          className={FIELD}
          value={amount}
          onChange={(ev) => setAmount(ev.target.value)}
        />
      </Field>

      <Field id="inv-due" label="Due date" error={errors.dueDate}>
        <input
          id="inv-due"
          type="date"
          className={FIELD}
          value={dueDate}
          onChange={(ev) => setDueDate(ev.target.value)}
        />
      </Field>

      <DialogFooter>
        <Button type="submit" className="h-11 w-full sm:w-auto">
          Add invoice
        </Button>
      </DialogFooter>
    </form>
  );
}
