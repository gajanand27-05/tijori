const DAY_MS = 86400000;

const pad = (n: number) => String(n).padStart(2, "0");

function parse(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function format(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(date: string, n: number): string {
  return format(parse(date) + n * DAY_MS);
}

export function diffDays(from: string, to: string): number {
  return Math.round((parse(to) - parse(from)) / DAY_MS);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function dateInMonth(month: string, day: number): string {
  return `${month}-${pad(Math.min(day, daysInMonth(month)))}`;
}

export function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  const month = `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
  return dateInMonth(month, d);
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function weekday(date: string): number {
  return new Date(parse(date)).getUTCDay();
}