"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { AlertTriangle, CheckCircle2, ChevronDown, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTijoriData } from "@/lib/use-tijori-data";
import { todayISO } from "@/lib/dates";
import { formatDate, formatINR } from "@/lib/format";
import {
  compareToBaseline,
  forecast,
  type ForecastDay,
  type ForecastItem,
} from "@/lib/forecast";
import { chasePlan } from "@/lib/whatif";
import { Button } from "@/components/ui/button";
import { ChaseFlow } from "@/components/reminders/chase-flow";
import {
  DEFAULT_WHAT_IF,
  WhatIfPanel,
  anyWhatIfOn,
  scenarioFromWhatIf,
  whatIfHeadline,
  type WhatIfState,
} from "@/components/forecast/what-if-panel";

type WindowDays = 30 | 60 | 90;

const WINDOWS: WindowDays[] = [30, 60, 90];
const GRADIENT_ID = "forecast-zones";
const MINUS = "\u2212";

function shortRupees(v: number): string {
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1000) return `${sign}₹${Math.round(abs / 1000)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

function zoneOffset(value: number, max: number, min: number): number {
  if (max === min) return 0;
  const o = (max - value) / (max - min);
  return Math.min(1, Math.max(0, o));
}

function itemText(item: ForecastItem): string {
  const prefix = item.kind === "in" ? "+" : MINUS;
  return `${prefix}${formatINR(item.amount)}`;
}

function ForecastTooltip({ active, payload }: TooltipContentProps) {
  const day = active ? (payload?.[0]?.payload as ForecastDay | undefined) : undefined;
  if (!day) return null;
  return (
    <div className="max-w-[240px] rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-md">
      <p className="font-medium text-zinc-900">{formatDate(day.date)}</p>
      <p className="text-zinc-700">Balance {formatINR(day.balance)}</p>
      {day.items.length === 0 ? (
        <p className="mt-1 text-xs text-zinc-500">No money moves that day.</p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-xs">
          {day.items.map((item, i) => (
            <li key={`${item.label}-${i}`} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-zinc-600">{item.label}</span>
              <span className="shrink-0 text-zinc-900">{itemText(item)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 break-words text-xl font-semibold text-zinc-900 sm:text-2xl">{value}</p>
      <p className="mt-1 break-words text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

export default function ForecastPage() {
  const [days, setDays] = useState<WindowDays>(30);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [whatIf, setWhatIf] = useState<WhatIfState>(DEFAULT_WHAT_IF);
  // Customers to chase; null means the ChaseFlow dialog is closed.
  const [chaseIds, setChaseIds] = useState<string[] | null>(null);

  const today = todayISO();
  const data = useTijoriData();
  const baseline = useMemo(() => forecast({ data, today, days }), [data, today, days]);
  const whatIfOn = anyWhatIfOn(whatIf);
  const scenarioResult = useMemo(
    () =>
      whatIfOn ? forecast({ data, today, days, scenario: scenarioFromWhatIf(whatIf, today) }) : null,
    [data, today, days, whatIf, whatIfOn],
  );
  // With no card on, result is the baseline, so the page looks as it did before.
  const result = scenarioResult ?? baseline;
  const comparison = scenarioResult ? compareToBaseline(baseline, scenarioResult) : null;
  // Chase back up to the safety buffer, not just to zero.
  const gapToBuffer = scenarioResult ? data.business.safetyBuffer - result.lowest.balance : 0;
  const chase = gapToBuffer > 0 ? chasePlan(data, today, gapToBuffer) : null;
  const chaseNames = chase
    ? chase.customerIds.map((id) => data.customers.find((c) => c.id === id)?.name ?? id)
    : [];
  const chartData = useMemo(
    () =>
      scenarioResult
        ? scenarioResult.daily.map((d, i) => ({ ...d, baseline: baseline.daily[i]?.balance ?? d.balance }))
        : result.daily,
    [scenarioResult, baseline, result.daily],
  );

  const buffer = data.business.safetyBuffer;

  const gradientStops = useMemo(() => {
    const balances = result.daily.map((d) => d.balance);
    const max = Math.max(0, buffer, ...balances);
    const min = Math.min(0, buffer, ...balances);
    const bufferOff = zoneOffset(buffer, max, min);
    const zeroOff = zoneOffset(0, max, min);
    return { bufferOff, zeroOff };
  }, [result.daily, buffer]);

  const { bufferOff, zeroOff } = gradientStops;

  const baseHeadline: { Icon: LucideIcon; textClass: string; text: string } = result.firstBelowZero
    ? {
        Icon: XCircle,
        textClass: "text-red-700",
        text: `Short: you run out of money on ${formatDate(result.firstBelowZero)}.`,
      }
    : result.firstBelowBuffer
      ? {
          Icon: AlertTriangle,
          textClass: "text-amber-700",
          text: `Tight: you dip below your ${formatINR(buffer)} buffer on ${formatDate(result.firstBelowBuffer)}.`,
        }
      : {
          Icon: CheckCircle2,
          textClass: "text-green-700",
          text: `Safe: your lowest point is ${formatINR(result.lowest.balance)} on ${formatDate(result.lowest.date)}.`,
        };
  const headline =
    comparison === null
      ? baseHeadline
      : {
          Icon: comparison.shortfall > 0 ? XCircle : CheckCircle2,
          textClass: comparison.shortfall > 0 ? "text-red-700" : "text-green-700",
          text: whatIfHeadline({
            state: whatIf,
            today,
            shortfall: comparison.shortfall,
            firstBelowZero: comparison.firstBelowZero,
            lowest: result.lowest,
          }),
        };
  const HeadlineIcon = headline.Icon;

  const biggestDays = useMemo(
    () =>
      result.daily
        .filter((d) => Math.abs(d.cashIn) + Math.abs(d.cashOut) > 0)
        .slice()
        .sort(
          (a, b) =>
            Math.abs(b.cashIn) + Math.abs(b.cashOut) - (Math.abs(a.cashIn) + Math.abs(a.cashOut)),
        )
        .slice(0, 5),
    [result.daily],
  );

  const firstDangerDay = result.firstBelowZero ?? result.firstBelowBuffer;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-zinc-900">Forecast</h1>

      <div role="group" aria-label="Forecast window" className="flex flex-wrap gap-2">
        {WINDOWS.map((w) => (
          <button
            key={w}
            type="button"
            aria-pressed={days === w}
            onClick={() => setDays(w)}
            className={`min-h-[44px] rounded-lg border px-4 text-sm font-medium ${
              days === w
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {`${w} days`}
          </button>
        ))}
      </div>

      <WhatIfPanel value={whatIf} today={today} onChange={setWhatIf} />

      <p className={`flex items-start gap-2 text-base font-medium ${headline.textClass}`}>
        <HeadlineIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <span className="min-w-0 break-words">{headline.text}</span>
      </p>

      {chase && (
        <section className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-base font-semibold text-zinc-900">What should I do?</h2>
          {chase.customerIds.length === 0 ? (
            <p className="text-sm text-zinc-700">No overdue customers to chase yet.</p>
          ) : (
            <>
              {chase.customerIds.length === 1 ? (
                <p className="text-sm text-zinc-800">
                  Chasing {chaseNames[0]} ({formatINR(chase.total)} overdue) covers it.
                </p>
              ) : (
                <p className="text-sm text-zinc-800">
                  Chase these {chase.customerIds.length} customers ({formatINR(chase.total)} overdue) to get
                  back above your {formatINR(buffer)} buffer.
                </p>
              )}
              <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-800">
                {chaseNames.map((name, i) => (
                  <li key={chase.customerIds[i]}>{name}</li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="h-11 min-h-[44px] w-full sm:w-auto"
                onClick={() => setChaseIds(chase.customerIds)}
              >
                {chase.customerIds.length === 1 ? `Chase ${chaseNames[0]}` : "Remind them"}
              </Button>
            </>
          )}
        </section>
      )}

      {scenarioResult && (
        <p className="text-xs text-zinc-500">
          Grey dashed line: balance without the what-ifs. Coloured area: with them.
        </p>
      )}

      <div className="h-[260px] min-w-0 sm:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset={0} stopColor="#16a34a" stopOpacity={0.35} />
                <stop offset={bufferOff} stopColor="#16a34a" stopOpacity={0.35} />
                <stop offset={bufferOff} stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset={zeroOff} stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset={zeroOff} stopColor="#dc2626" stopOpacity={0.35} />
                <stop offset={1} stopColor="#dc2626" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => formatDate(v)}
              minTickGap={24}
              tick={{ fontSize: 12 }}
            />
            <YAxis tickFormatter={shortRupees} width={56} tick={{ fontSize: 12 }} />
            <Tooltip content={ForecastTooltip} />
            <ReferenceLine
              y={buffer}
              stroke="#d97706"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
              label={{ value: "Safety buffer", position: "insideTopLeft", fill: "#92400e", fontSize: 12 }}
            />
            <ReferenceLine y={0} stroke="#52525b" ifOverflow="extendDomain" />
            <ReferenceDot
              x={result.lowest.date}
              y={result.lowest.balance}
              r={5}
              fill="#166534"
              stroke="#ffffff"
              label={{ value: "Lowest", position: "top", fill: "#166534", fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#166534"
              strokeWidth={2}
              fill={`url(#${GRADIENT_ID})`}
              isAnimationActive={false}
            />
            {scenarioResult && (
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="#71717a"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Lowest balance"
          value={formatINR(result.lowest.balance)}
          sub={`on ${formatDate(result.lowest.date)}`}
        />
        <StatCard label="Coming in" value={formatINR(result.totalIn)} sub={`next ${days} days`} />
        <StatCard label="Going out" value={formatINR(result.totalOut)} sub={`next ${days} days`} />
        <StatCard
          label="First danger day"
          value={firstDangerDay ? formatDate(firstDangerDay) : `None in ${days} days`}
          sub={result.firstBelowZero ? "balance goes below zero" : firstDangerDay ? "balance dips below buffer" : "balance stays safe"}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Biggest days</h2>
        {biggestDays.length === 0 ? (
          <p className="text-sm text-zinc-500">No money moves in this window.</p>
        ) : (
          <ul className="space-y-3">
            {biggestDays.map((day) => (
              <li key={day.date} className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-zinc-900">{formatDate(day.date)}</span>
                  <span className="break-words text-sm font-semibold text-zinc-900">
                    {formatINR(day.cashIn + day.cashOut)}
                  </span>
                </div>
                {day.items.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {day.items.map((item, i) => (
                      <li key={`${item.label}-${i}`} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate text-zinc-600">{item.label}</span>
                        <span className="shrink-0 text-zinc-900">{itemText(item)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <button
          type="button"
          aria-expanded={assumptionsOpen}
          aria-controls="forecast-assumptions"
          onClick={() => setAssumptionsOpen((o) => !o)}
          className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          How we calculated this
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${assumptionsOpen ? "rotate-180" : ""}`}
          />
        </button>
        {assumptionsOpen && (
          <ul
            id="forecast-assumptions"
            className="list-disc space-y-1 pl-5 text-sm text-zinc-600"
          >
            {result.assumptions.map((a, i) => (
              <li key={`${i}-${a}`}>{a}</li>
            ))}
          </ul>
        )}
      </section>

      <ChaseFlow
        customerIds={chaseIds ?? []}
        open={chaseIds !== null}
        onClose={() => setChaseIds(null)}
      />
    </div>
  );
}
