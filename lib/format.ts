const inrFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const dayMonthYearFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function formatINR(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${inrFormatter.format(Math.abs(n))}`;
}

export function formatDate(iso: string): string {
  return dayMonthFormatter.format(parseISODate(iso));
}

export function formatDateLong(iso: string): string {
  return dayMonthYearFormatter.format(parseISODate(iso));
}
