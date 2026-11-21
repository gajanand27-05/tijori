import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";

export function BadDayBanner({
  lateCount,
  lateTotal,
  topNames,
  coversRent,
  doneCount,
  onStart,
}: {
  lateCount: number;
  lateTotal: number;
  topNames: string[];
  coversRent: boolean;
  doneCount: number;
  onStart: () => void;
}) {
  const total = topNames.length;
  const plan = coversRent ? "Start with these 3; that covers your rent." : "Start with these 3.";
  return (
    <section className="space-y-3 rounded-2xl border border-amber-400 bg-amber-50 p-5 text-amber-950">
      <p className="text-base font-semibold">
        Rough day: {lateCount} customers are late ({formatINR(lateTotal)}). {plan}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {topNames.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p className="text-sm font-medium">
        {doneCount} of {total} done
      </p>
      <Button
        className="h-11 min-h-11 w-full bg-green-800 text-white hover:bg-green-700 sm:w-auto"
        onClick={onStart}
      >
        Start chase mode
      </Button>
    </section>
  );
}
