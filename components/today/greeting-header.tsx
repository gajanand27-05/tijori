export function GreetingHeader({ greeting, dateLabel }: { greeting: string; dateLabel: string }) {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-green-900 sm:text-3xl">{greeting}, Meena</h1>
      <p className="mt-1 text-base text-slate-600">{dateLabel}</p>
    </header>
  );
}
