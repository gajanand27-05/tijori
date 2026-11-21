import Link from "next/link";
import { AlertTriangle, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import type { ForecastStatus } from "./today-model";

const STYLE: Record<ForecastStatus, { Icon: LucideIcon; cls: string }> = {
  Safe: { Icon: CheckCircle2, cls: "border-green-600 bg-green-50 text-green-900" },
  Tight: { Icon: AlertTriangle, cls: "border-amber-500 bg-amber-50 text-amber-900" },
  Short: { Icon: XCircle, cls: "border-red-600 bg-red-50 text-red-900" },
};

export function ForecastPill({ status }: { status: ForecastStatus }) {
  const { Icon, cls } = STYLE[status];
  return (
    <Link
      href="/app/forecast"
      className={`flex min-h-11 items-center gap-2 self-start rounded-full border-2 px-4 py-2 text-base font-semibold ${cls}`}
    >
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <span>Next 30 days: {status}</span>
    </Link>
  );
}
