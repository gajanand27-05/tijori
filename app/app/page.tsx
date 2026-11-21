"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChaseFlow } from "@/components/reminders/chase-flow";
import { RemindDialog } from "@/components/reminders/remind-dialog";
import { AlertCard } from "@/components/today/alert-card";
import { BadDayBanner } from "@/components/today/bad-day-banner";
import { ForecastPill } from "@/components/today/forecast-pill";
import { GreetingHeader } from "@/components/today/greeting-header";
import { StatTiles } from "@/components/today/stat-tiles";
import {
  badDay,
  billsDueWithin,
  forecastStatusFor,
  greetingFor,
  isChaseDone,
  owedToYou,
  readDismissed,
  writeDismissed,
} from "@/components/today/today-model";
import { buildAlerts, type Alert } from "@/lib/alerts";
import { todayISO } from "@/lib/dates";
import { formatDateLong, formatINR } from "@/lib/format";
import { generateMonthlyInvoices } from "@/lib/store";
import { useTijoriData } from "@/lib/use-tijori-data";

const BILLS_WINDOW_DAYS = 7;

export default function TodayPage() {
  const data = useTijoriData();
  const today = todayISO();
  const now = new Date();
  const dismissKey = `tijori-dismissed-${today}`;

  // Read lazily from localStorage (guarded for SSR inside readDismissed).
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed(dismissKey));
  // Customers for the ChaseFlow dialog; null means closed.
  const [chaseIds, setChaseIds] = useState<string[] | null>(null);
  // The 3 customers chosen by "Start chase mode", frozen so progress does not shift when payments change.
  const [trio, setTrio] = useState<string[]>([]);
  const [remindId, setRemindId] = useState<string | null>(null);

  const alerts = useMemo(() => buildAlerts(data, today), [data, today]);
  const status = useMemo(() => forecastStatusFor(data, today), [data, today]);
  const owed = useMemo(() => owedToYou(data, today), [data, today]);
  const billsSoon = useMemo(() => billsDueWithin(data, today, BILLS_WINDOW_DAYS), [data, today]);
  const bad = useMemo(() => badDay(data, today), [data, today]);

  const visible = alerts.filter((a) => !dismissed.includes(a.id));

  const progressIds = trio.length > 0 ? trio : (bad?.topIds ?? []);
  const doneCount = progressIds.filter((id) => isChaseDone(data, id, today)).length;

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    writeDismissed(dismissKey, next);
  }

  function runAction(alert: Alert) {
    const action = alert.action;
    if (!action) return;
    if (action.type === "remind") {
      setRemindId((action.payload as { customerId: string }).customerId);
    } else if (action.type === "chase") {
      setChaseIds((action.payload as { customerIds: string[] }).customerIds);
    } else if (action.type === "generateInvoices") {
      const { month } = action.payload as { month: string };
      const result = generateMonthlyInvoices(month);
      toast(`Created ${result.created} bills worth ${formatINR(result.total)}`);
    }
  }

  return (
    <div className="space-y-6">
      <GreetingHeader greeting={greetingFor(now.getHours())} dateLabel={formatDateLong(today)} />

      <StatTiles cashInHand={data.business.cashInHand} owed={owed} billsSoon={billsSoon} />

      <ForecastPill status={status} />

      {bad && (
        <BadDayBanner
          lateCount={bad.lateCount}
          lateTotal={bad.lateTotal}
          topNames={bad.topNames}
          coversRent={bad.coversRent}
          doneCount={doneCount}
          onStart={() => {
            setTrio(bad.topIds);
            setChaseIds(bad.topIds);
          }}
        />
      )}

      {visible.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Do this today</h2>
          <ul className="space-y-3">
            {visible.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onAction={runAction} onDismiss={dismiss} />
            ))}
          </ul>
        </section>
      )}

      {visible.length === 0 && !bad && (
        <p className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center text-lg font-medium text-green-900">
          All clear today. ✓
        </p>
      )}

      <RemindDialog
        customerId={remindId ?? ""}
        open={remindId !== null}
        onClose={() => setRemindId(null)}
      />

      <ChaseFlow
        customerIds={chaseIds ?? []}
        open={chaseIds !== null}
        onClose={() => setChaseIds(null)}
      />
    </div>
  );
}
