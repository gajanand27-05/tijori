"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTijoriData } from "@/lib/use-tijori-data";
import { todayISO } from "@/lib/dates";
import { addReminder } from "@/lib/store";
import { amountOutstanding, daysOverdue } from "@/lib/invoice";
import {
  suggestTone,
  draftReminder,
  whatsappLink,
  type Tone,
} from "@/lib/reminders";
import type { Language } from "@/lib/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "gentle", label: "Gentle" },
  { value: "firm", label: "Firm" },
  { value: "final", label: "Final" },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
  { value: "kn", label: "ಕನ್ನಡ" },
];

export function ReminderDraft({
  customerId,
  onSent,
  sendLabel = "Open in WhatsApp",
}: {
  customerId: string;
  onSent: () => void;
  sendLabel?: string;
}) {
  const data = useTijoriData();
  const today = todayISO();
  const customer = data.customers.find((c) => c.id === customerId);
  const business = data.business;
  const unpaid = data.invoices.filter(
    (inv) => inv.customerId === customerId && amountOutstanding(inv) > 0,
  );
  const total = unpaid.reduce((sum, inv) => sum + amountOutstanding(inv), 0);
  const months = Array.from(new Set(unpaid.map((inv) => inv.billingMonth)))
    .sort()
    .map(monthLabel);
  const maxOverdue = Math.max(
    0,
    ...unpaid.map((inv) => daysOverdue(inv, today)),
  );

  const [tone, setTone] = useState<Tone>(() => suggestTone(maxOverdue));
  const [language, setLanguage] = useState<Language>(
    customer?.language ?? "en",
  );
  const [edited, setEdited] = useState<string | null>(null);

  const generated = useMemo(() => {
    if (!customer) return "";
    return draftReminder({
      customerName: customer.name,
      amount: total,
      months,
      tone,
      language,
      businessName: business.name,
      ownerName: business.ownerName,
      upiId: business.upiId,
    });
  }, [tone, language, customer, total, months, business]);

  const text = edited ?? generated;

  if (!customer) return null;

  function send() {
    window.open(whatsappLink(customer!.phone, text), "_blank", "noopener");
    addReminder(
      unpaid.map((inv) => inv.id),
      { date: today, tone, language },
    );
    toast("Reminder sent to " + customer!.name.split(" ")[0]);
    onSent();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast("Message copied");
    } catch {
      toast("Could not copy. Select the text and copy it.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <p>
          Amount outstanding:{" "}
          <span className="font-semibold">
            ₹{total.toLocaleString("en-IN")}
          </span>
        </p>
        <p>Months: {months.join(", ")}</p>
      </div>

      <div className="flex gap-2" role="group" aria-label="Tone">
        {TONE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant={tone === opt.value ? "default" : "outline"}
            aria-pressed={tone === opt.value}
            className="h-11 flex-1"
            onClick={() => {
              setTone(opt.value);
              setEdited(null);
            }}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <div className="flex gap-2" role="group" aria-label="Language">
        {LANGUAGE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant={language === opt.value ? "default" : "outline"}
            aria-pressed={language === opt.value}
            className="h-11 flex-1"
            onClick={() => {
              setLanguage(opt.value);
              setEdited(null);
            }}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setEdited(e.target.value)}
        rows={8}
        className="w-full rounded-md border border-input bg-background p-3 text-sm"
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="h-11 w-full" onClick={send}>
          {sendLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={copy}
        >
          Copy message
        </Button>
      </div>
    </div>
  );
}

export function RemindDialog({
  customerId,
  open,
  onClose,
  onSent,
}: {
  customerId: string;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a reminder</DialogTitle>
        </DialogHeader>
        {open && (
          <ReminderDraft
            customerId={customerId}
            onSent={() => {
              onSent?.();
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
