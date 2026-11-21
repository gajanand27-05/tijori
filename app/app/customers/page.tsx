"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/page-title";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { todayISO } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { addCustomer } from "@/lib/store";
import { averageDelayDays, customerOutstanding, delayLabel } from "@/lib/customer-stats";
import { useTijoriData } from "@/lib/use-tijori-data";
import type { Customer, Language } from "@/lib/types";

type StatusFilter = "all" | "active" | "paused" | "left";

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

const STATUS_LABELS: Record<Customer["status"], string> = {
  active: "Active",
  paused: "Paused",
  left: "Left",
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "left", label: "Left" },
];

const chipBase =
  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors";

export default function CustomersPage() {
  const data = useTijoriData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<Customer["plan"]>("Lunch");
  const [fee, setFee] = useState<string>(String(PLAN_FEES.Lunch));
  const [startDate, setStartDate] = useState(todayISO());
  const [language, setLanguage] = useState<Language>("en");
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: data.customers.length, active: 0, paused: 0, left: 0 };
    for (const cust of data.customers) c[cust.status] += 1;
    return c;
  }, [data.customers]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.customers.filter(
      (c) =>
        (filter === "all" || c.status === filter) &&
        (q === "" || c.name.toLowerCase().includes(q)),
    );
  }, [data.customers, filter, query]);

  function resetForm() {
    setName("");
    setPhone("");
    setPlan("Lunch");
    setFee(String(PLAN_FEES.Lunch));
    setStartDate(todayISO());
    setLanguage("en");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
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
    addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      plan,
      monthlyFee: feeNumber,
      startDate,
      status: "active",
      language,
    });
    toast("Customer added");
    setOpen(false);
    resetForm();
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Customers · Tijori" />
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button className="min-h-11 px-4" />}>Add customer</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add customer</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cust-name">Name</Label>
                <Input
                  id="cust-name"
                  className="min-h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="cust-phone">Phone</Label>
                <Input
                  id="cust-phone"
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
                <Label htmlFor="cust-fee">Monthly fee (₹)</Label>
                <Input
                  id="cust-fee"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="min-h-11"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="cust-start">Start date</Label>
                <Input
                  id="cust-start"
                  type="date"
                  className="min-h-11"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
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
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name"
        aria-label="Search customers by name"
        className="min-h-12 w-full rounded-lg border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => {
          const selected = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={selected}
              className={`${chipBase} ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground"
              }`}
            >
              {f.label}
              <span className="tabular-nums opacity-80">{counts[f.value]}</span>
            </button>
          );
        })}
      </div>

      <ul className="flex flex-col gap-3">
        {visible.map((c) => {
          const outstanding = customerOutstanding(c.id, data.invoices);
          const delay = averageDelayDays(c.id, data.invoices);
          return (
            <li key={c.id}>
              <Link
                href={`/app/customers/${c.id}`}
                className="flex min-h-11 flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-base font-semibold">{c.name}</span>
                  <Badge variant="secondary">{STATUS_LABELS[c.status]}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {c.plan} · {formatINR(c.monthlyFee)}/mo
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  {outstanding > 0 ? (
                    <span className="font-medium text-red-600">
                      {formatINR(outstanding)} due
                    </span>
                  ) : (
                    <span className="font-medium text-green-700">Paid up</span>
                  )}
                  <span className="text-muted-foreground">{delayLabel(delay)}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No customers match this view.
        </p>
      )}
    </div>
  );
}
