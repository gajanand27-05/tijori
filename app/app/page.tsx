"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { SmartCapture } from "@/components/capture/smart-capture";
import { PageTitle } from "@/components/page-title";
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

// The clock is read per render and never needs a live update, so there is nothing to subscribe to.
const noopSubscribe = () => () => {};

export default function TodayPage() {
  const data = useTijoriData();
  const today = todayISO();
  const dismissKey = `tijori-dismissed-${today}`;

  // "Good morning" etc. only on the client; the server (and hydration) render "Hello".
  const timeGreeting = useSyncExternalStore(
    noopSubscribe,
    () => greetingFor(new Date().getHours()),
    () => "Hello",
  );
  const firstName = data.business.ownerName.trim().split(/\s+/)[0] || "there";

  // Read lazily from localStorage (guarded for SSR inside readDismissed).
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed(dismissKey));
  // Customers for the ChaseFlow dialog; null means closed.
  const [chaseIds, setChaseIds] = useState<string[] | null>(null);
  // True when the open chase was started from the bad-day banner, so its progress counts there.
  const [chaseFromBanner, setChaseFromBanner] = useState(false);
  // Done count reported by ChaseFlow while the banner's chase is open.
  const [bannerDone, setBannerDone] = useState(0);
  const [remindId, setRemindId] = useState<string | null>(null);
  // Tone the "Do this today" card asked for (e.g. "firm" for a follow-up).
  const [remindTone, setRemindTone] = useState<"gentle" | "firm" | undefined>(undefined);

  const alerts = useMemo(() => buildAlerts(data, today), [data, today]);
  const status = useMemo(() => forecastStatusFor(data, today), [data, today]);
  const owed = useMemo(() => owedToYou(data, today), [data, today]);
  const billsSoon = useMemo(() => billsDueWithin(data, today, BILLS_WINDOW_DAYS), [data, today]);
  const bad = useMemo(() => badDay(data, today), [data, today]);

  const visible = alerts.filter((a) => !dismissed.includes(a.id));

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    writeDismissed(dismissKey, next);
  }

  function runAction(alert: Alert) {
    const action = alert.action;
    if (!action) return;
    if (action.type === "remind") {
      const { customerId, tone } = action.payload as {
        customerId: string;
        tone?: "gentle" | "firm";
      };
      setRemindId(customerId);
      setRemindTone(tone);
    } else if (action.type === "chase") {
      setChaseFromBanner(false);
      setChaseIds((action.payload as { customerIds: string[] }).customerIds);
    } else if (action.type === "generateInvoices") {
      const { month } = action.payload as { month: string };
      const result = generateMonthlyInvoices(month);
      toast(`Created ${result.created} bills worth ${formatINR(result.total)}`);
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Today · Tijori" />
      <GreetingHeader
        greeting={timeGreeting}
        name={firstName}
        dateLabel={formatDateLong(today)}
      />

      <StatTiles cashInHand={data.business.cashInHand} owed={owed} billsSoon={billsSoon} />

      <SmartCapture />

      <ForecastPill status={status} />

      {bad && (
        <BadDayBanner
          lateCount={bad.lateCount}
          lateTotal={bad.lateTotal}
          topNames={bad.topNames}
          coversBill={bad.coversBill}
          doneCount={bannerDone}
          onStart={() => {
            setChaseFromBanner(true);
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
        initialTone={remindTone}
      />

      <ChaseFlow
        customerIds={chaseIds ?? []}
        open={chaseIds !== null}
        onClose={() => setChaseIds(null)}
        onProgress={chaseFromBanner ? (done) => setBannerDone(done) : undefined}
      />
    </div>
  );
}
