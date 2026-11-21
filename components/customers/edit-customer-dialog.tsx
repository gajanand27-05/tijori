"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/format";
import { updateCustomer } from "@/lib/store";
import type { Customer, Language } from "@/lib/types";

// Mirrors PLAN_FEES / LANGUAGE_LABELS in app/app/customers/page.tsx (not exported there).
const PLAN_FEES: Record<Customer["plan"], number> = {
  Lunch: 2400,
  Dinner: 2200,
  Both: 4200,
};

const PLANS = Object.keys(PLAN_FEES) as Customer["plan"][];

const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
};

type Props = {
  customer: Customer;
};

export function EditCustomerDialog({ customer }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<Customer["plan"]>("Lunch");
  const [fee, setFee] = useState<string>("");
  const [language, setLanguage] = useState<Language>("en");
  const [error, setError] = useState<string | null>(null);

  // Fill the form from the saved customer each time the dialog opens.
  function handleOpen() {
    setName(customer.name);
    setPhone(customer.phone);
    setPlan(customer.plan);
    setFee(String(customer.monthlyFee));
    setLanguage(customer.language);
    setError(null);
    setOpen(true);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setError(null);
  }

  function handlePlanChange(value: string | null) {
    if (!value || !(value in PLAN_FEES)) return;
    const next = value as Customer["plan"];
    setPlan(next);
    setFee(String(PLAN_FEES[next]));
  }

  function handleSave() {
    const feeNumber = Number(fee);
    if (name.trim() === "") {
      setError("Please enter the customer's name.");
      return;
    }
    if (!Number.isFinite(feeNumber) || feeNumber <= 0) {
      setError("Monthly fee must be more than 0.");
      return;
    }
    updateCustomer(customer.id, {
      name: name.trim(),
      phone: phone.trim(),
      plan,
      monthlyFee: feeNumber,
      language,
    });
    toast.success("Customer updated");
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <Button variant="outline" className="min-h-[44px] min-w-[44px] text-base" onClick={handleOpen}>
        Edit
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit customer</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-cust-name">Name</Label>
              <Input
                id="edit-cust-name"
                className="min-h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-cust-phone">Phone</Label>
              <Input
                id="edit-cust-phone"
                type="tel"
                className="min-h-11"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={handlePlanChange}>
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p} {formatINR(PLAN_FEES[p])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-cust-fee">Monthly fee (₹)</Label>
              <Input
                id="edit-cust-fee"
                type="number"
                inputMode="numeric"
                min={0}
                className="min-h-11"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Language</Label>
              <Select
                value={language}
                onValueChange={(v) => {
                  if (v === "en" || v === "hi" || v === "kn") setLanguage(v);
                }}
              >
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LANGUAGE_LABELS) as Language[]).map((l) => (
                    <SelectItem key={l} value={l}>
                      {LANGUAGE_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="min-h-11" />}>
              Cancel
            </DialogClose>
            <Button className="min-h-11" onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
