import { addDays } from "./dates.ts";
import type { AgendaItem } from "./agenda.ts";

// Enkel iCalendar-fil (RFC 5545) med heldagshändelser. Telefonens kalender hämtar den med jämna mellanrum.

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const day = (iso: string) => iso.replace(/-/g, "");

/** Radbryter långa rader enligt standarden: max 75 tecken, fortsättning börjar med mellanslag. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

export type IcsItem = AgendaItem & { description?: string };

export function buildIcs(name: string, items: IcsItem[], baseUrl: string, now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Home Hub//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
    "X-WR-TIMEZONE:Europe/Stockholm",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const i of items) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${i.key}@homehub`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day(i.date)}`,
      `DTEND;VALUE=DATE:${day(addDays(i.end ?? i.date, 1))}`,
      `SUMMARY:${esc(i.title)}`,
      `URL:${baseUrl}${i.href}`,
      ...(i.description ? [`DESCRIPTION:${esc(i.description)}`] : []),
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
