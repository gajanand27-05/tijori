import Link from "next/link";
import { formatINR } from "@/lib/format";

const TILE_BASE = "block min-h-11 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";

function StatTile({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 break-words text-2xl font-bold tabular-nums text-slate-900">{formatINR(value)}</p>
    </>
  );
  if (href === undefined) return <div className={TILE_BASE}>{body}</div>;
  return (
    <Link href={href} className={`${TILE_BASE} hover:bg-slate-50`}>
      {body}
    </Link>
  );
}

export function StatTiles({
  cashInHand,
  owed,
  billsSoon,
}: {
  cashInHand: number;
  owed: number;
  billsSoon: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatTile label="Cash in hand" value={cashInHand} />
      <StatTile label="Owed to you" value={owed} href="/app/dues" />
      <StatTile label="Bills in the next 7 days" value={billsSoon} href="/app/bills" />
    </div>
  );
}
