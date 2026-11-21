"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR } from "@/lib/format";
import type { ForecastScenario } from "@/lib/forecast";
import type { BillCategory } from "@/lib/types";

export type WhatIfState = {
  latePayers: { on: boolean; topN: number; days: number };
  cancellations: { on: boolean; n: number };
  costSpike: { on: boolean; category: BillCategory; percent: number };
  festivalPause: { on: boolean; n: number; days: number; startDate: string };
};

export const DEFAULT_WHAT_IF: WhatIfState = {
  latePayers: { on: false, topN: 3, days: 15 },
  cancellations: { on: false, n: 1 },
  costSpike: { on: false, category: "vegetables", percent: 10 },
  festivalPause: { on: false, n: 3, days: 7, startDate: "" },
};

const CATEGORIES: { value: BillCategory; label: string }[] = [
  { value: "rent", label: "Rent" },
  { value: "salary", label: "Salary" },
  { value: "vegetables", label: "Vegetables" },
  { value: "gas", label: "Gas" },
  { value: "groceries", label: "Groceries" },
  { value: "packaging", label: "Packaging" },
  { value: "other", label: "Other" },
];

const categoryLabel = (c: BillCategory): string => CATEGORIES.find((x) => x.value === c)?.label ?? c;

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

export function anyWhatIfOn(s: WhatIfState): boolean {
  return s.latePayers.on || s.cancellations.on || s.costSpike.on || s.festivalPause.on;
}

// Only the cards that are switched on become scenario modifiers.
export function scenarioFromWhatIf(s: WhatIfState, today: string): ForecastScenario {
  const scenario: ForecastScenario = {};
  if (s.latePayers.on) scenario.latePayers = { topN: s.latePayers.topN, days: s.latePayers.days };
  if (s.cancellations.on) scenario.cancellations = { n: s.cancellations.n };
  if (s.costSpike.on) scenario.costSpike = { category: s.costSpike.category, percent: s.costSpike.percent };
  if (s.festivalPause.on) {
    scenario.festivalPause = {
      n: s.festivalPause.n,
      days: s.festivalPause.days,
      startDate: s.festivalPause.startDate || today,
    };
  }
  return scenario;
}

// One clause per active card, e.g. "your top 3 customers pay 15 days late".
function clauses(s: WhatIfState, today: string): string[] {
  const out: string[] = [];
  const lp = s.latePayers;
  if (lp.on) {
    const who = lp.topN === 1 ? "your top customer" : `your top ${lp.topN} customers`;
    const verb = lp.topN === 1 ? "pays" : "pay";
    out.push(
      lp.days === 0 ? `${who} ${verb} on time` : `${who} ${verb} ${lp.days} ${plural(lp.days, "day", "days")} late`,
    );
  }
  if (s.cancellations.on) {
    const n = s.cancellations.n;
    out.push(`${n} ${plural(n, "customer", "customers")} ${n === 1 ? "cancels" : "cancel"}`);
  }
  if (s.costSpike.on) {
    const { category, percent } = s.costSpike;
    out.push(`${categoryLabel(category).toLowerCase()} bills cost ${percent}% more`);
  }
  if (s.festivalPause.on) {
    const fp = s.festivalPause;
    const n = fp.n;
    out.push(
      `${n} ${plural(n, "customer", "customers")} ${n === 1 ? "pauses" : "pause"} for ${fp.days} ${plural(
        fp.days,
        "day",
        "days",
      )} from ${formatDate(fp.startDate || today)}`,
    );
  }
  return out;
}

function joinWords(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

// Live headline for the active scenario. Shortfall is the scenario's depth below zero.
export function whatIfHeadline(args: {
  state: WhatIfState;
  today: string;
  shortfall: number;
  firstBelowZero: string | null;
  lowest: { balance: number; date: string };
}): string {
  if (args.shortfall > 0 && args.firstBelowZero) {
    const joined = joinWords(clauses(args.state, args.today));
    return `If ${joined}, you'll be ${formatINR(args.shortfall)} short on ${formatDate(args.firstBelowZero)}.`;
  }
  return `You'd still be safe: lowest ${formatINR(args.lowest.balance)} on ${formatDate(args.lowest.date)}.`;
}

function WhatIfCard({
  title,
  on,
  onToggle,
  children,
}: {
  title: string;
  on: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 pt-2 font-medium text-zinc-900">{title}</p>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={title}
          onClick={onToggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              on ? "bg-zinc-900" : "bg-zinc-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                on ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      </div>
      {on && <div className="mt-2 space-y-3">{children}</div>}
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm text-zinc-700">
      <span className="flex justify-between gap-2">
        <span>{label}</span>
        <span className="font-medium tabular-nums text-zinc-900">
          {value} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-zinc-900"
      />
    </label>
  );
}

export function WhatIfPanel({
  value,
  today,
  onChange,
}: {
  value: WhatIfState;
  today: string;
  onChange: (next: WhatIfState) => void;
}) {
  const setLate = (patch: Partial<WhatIfState["latePayers"]>) =>
    onChange({ ...value, latePayers: { ...value.latePayers, ...patch } });
  const setCancel = (patch: Partial<WhatIfState["cancellations"]>) =>
    onChange({ ...value, cancellations: { ...value.cancellations, ...patch } });
  const setCost = (patch: Partial<WhatIfState["costSpike"]>) =>
    onChange({ ...value, costSpike: { ...value.costSpike, ...patch } });
  const setFest = (patch: Partial<WhatIfState["festivalPause"]>) =>
    onChange({ ...value, festivalPause: { ...value.festivalPause, ...patch } });

  // Preset: only the late-payers card is on.
  const preset = () =>
    onChange({
      ...DEFAULT_WHAT_IF,
      latePayers: { on: true, topN: 3, days: 15 },
    });
  const reset = () => onChange(DEFAULT_WHAT_IF);

  return (
    <section aria-labelledby="what-if-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="what-if-heading" className="text-lg font-semibold text-zinc-900">
          What if?
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11 min-h-[44px]" onClick={preset}>
            Demo: top 3 pay 15 days late
          </Button>
          <Button variant="outline" className="h-11 min-h-[44px]" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <WhatIfCard
          title="My top customers pay late"
          on={value.latePayers.on}
          onToggle={() => setLate({ on: !value.latePayers.on })}
        >
          <RangeField
            label="Top N customers"
            value={value.latePayers.topN}
            min={1}
            max={10}
            unit=""
            onChange={(v) => setLate({ topN: v })}
          />
          <RangeField
            label="Days late"
            value={value.latePayers.days}
            min={0}
            max={30}
            unit="days"
            onChange={(v) => setLate({ days: v })}
          />
        </WhatIfCard>

        <WhatIfCard
          title="Customers cancel"
          on={value.cancellations.on}
          onToggle={() => setCancel({ on: !value.cancellations.on })}
        >
          <RangeField
            label="Customers who cancel"
            value={value.cancellations.n}
            min={1}
            max={10}
            unit=""
            onChange={(v) => setCancel({ n: v })}
          />
        </WhatIfCard>

        <WhatIfCard
          title="Costs go up"
          on={value.costSpike.on}
          onToggle={() => setCost({ on: !value.costSpike.on })}
        >
          <label className="block text-sm text-zinc-700">
            <span>Category</span>
            <select
              value={value.costSpike.category}
              onChange={(e) => setCost({ category: e.target.value as BillCategory })}
              className="mt-1 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <RangeField
            label="Increase"
            value={value.costSpike.percent}
            min={0}
            max={50}
            unit="%"
            onChange={(v) => setCost({ percent: v })}
          />
        </WhatIfCard>

        <WhatIfCard
          title="Festival pause"
          on={value.festivalPause.on}
          onToggle={() =>
            setFest({
              on: !value.festivalPause.on,
              startDate: value.festivalPause.startDate || today,
            })
          }
        >
          <RangeField
            label="Customers paused"
            value={value.festivalPause.n}
            min={1}
            max={15}
            unit=""
            onChange={(v) => setFest({ n: v })}
          />
          <RangeField
            label="Days paused"
            value={value.festivalPause.days}
            min={1}
            max={30}
            unit="days"
            onChange={(v) => setFest({ days: v })}
          />
          <label className="block text-sm text-zinc-700">
            <span>Start date</span>
            <input
              type="date"
              value={value.festivalPause.startDate}
              onChange={(e) => setFest({ startDate: e.target.value })}
              className="mt-1 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
            />
          </label>
        </WhatIfCard>
      </div>
    </section>
  );
}
