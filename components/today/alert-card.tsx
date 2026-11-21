import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Alert } from "@/lib/alerts";

const BUTTON = "mt-3 h-11 min-h-11 w-full sm:w-auto";

export function AlertCard({
  alert,
  onAction,
  onDismiss,
}: {
  alert: Alert;
  onAction: (alert: Alert) => void;
  onDismiss: (id: string) => void;
}) {
  const action = alert.action;
  return (
    <li className="relative rounded-2xl border border-slate-200 bg-white p-4 pr-14 shadow-sm">
      <button
        type="button"
        aria-label="Hide for today"
        onClick={() => onDismiss(alert.id)}
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
      >
        <X aria-hidden="true" className="h-5 w-5" />
      </button>
      <p className="text-base font-semibold text-slate-900">{alert.title}</p>
      <p className="mt-1 text-sm text-slate-600">{alert.detail}</p>
      {action?.type === "link" && (
        <Button
          variant="outline"
          className={BUTTON}
          render={<Link href={(action.payload as { href: string }).href} />}
        >
          {action.label}
        </Button>
      )}
      {action && action.type !== "link" && (
        <Button variant="outline" className={BUTTON} onClick={() => onAction(alert)}>
          {action.label}
        </Button>
      )}
    </li>
  );
}
