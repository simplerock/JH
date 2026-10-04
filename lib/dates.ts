import type { Recurrence } from "./types.ts";

const TZ = "Europe/Stockholm";

/** Dagens datum i Sverige som YYYY-MM-DD, oavsett serverns tidszon. */
export function today(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(now);
}

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** ISO-vecka, t.ex. "2026-W40". */
export function isoWeek(iso: string): string {
  const d = parse(iso);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Nyckeln för den period en syssla gäller just nu. En avbockning per period. */
export function periodKey(recurrence: Recurrence, date: string = today()): string {
  switch (recurrence) {
    case "daily":
      return date;
    case "weekly":
      return isoWeek(date);
    case "monthly":
      return date.slice(0, 7);
    case "none":
      return "once";
  }
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86400000);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", timeZone: "UTC" }).format(parse(iso));
}

export function formatRange(start: string, end: string | null): string {
  if (!end || end === start) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export const recurrenceLabel: Record<Recurrence, string> = {
  daily: "Varje dag",
  weekly: "Varje vecka",
  monthly: "Varje månad",
  none: "En gång",
};
