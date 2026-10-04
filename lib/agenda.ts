import { addDays, daysBetween } from "./dates.ts";
import { maintenanceDue } from "./progress.ts";
import { readDetails } from "./trip.ts";
import type { FamilyEvent, Goal, MaintenanceItem, Project, Task } from "./types.ts";

// Allt i familjen som har ett datum, samlat på ett ställe. Det är det kalendern och Hem visar.

export type AgendaKind = "trip" | "event" | "activity" | "task" | "maintenance" | "goal" | "project";

export type AgendaItem = {
  key: string;
  kind: AgendaKind;
  title: string;
  date: string;
  end: string | null;
  href: string;
  owner: string | null;
  /** Viktigt = syns på Hem. Vardagssysslor och underhåll långt fram är inte viktiga. */
  important: boolean;
};

export type AgendaSource = {
  events: FamilyEvent[];
  tasks: Task[];
  maintenance: MaintenanceItem[];
  goals: Goal[];
  projects: Project[];
};

export function buildAgenda(src: AgendaSource, today: string): AgendaItem[] {
  const items: AgendaItem[] = [];
  for (const e of src.events) {
    items.push({
      key: `e-${e.id}`,
      kind: e.kind === "vacation" ? "trip" : e.kind === "activity" ? "activity" : "event",
      title: e.title,
      date: e.start_date,
      end: e.end_date && e.end_date !== e.start_date ? e.end_date : null,
      href: `/kalender/${e.id}`,
      owner: e.owner,
      important: true,
    });
    // Varje flyg blir en egen rad, så att tiden syns i kalendern. Tiderna är lokala på respektive flygplats.
    readDetails(e.details).flights.forEach((f, i) => {
      if (!f.date) return;
      const route = [f.from, f.to].filter(Boolean).join(" → ");
      items.push({
        key: `f-${e.id}-${i}`,
        kind: "trip",
        title: ["Flyg", f.flight_no, f.depart && `kl ${f.depart}`].filter(Boolean).join(" ") + (route ? `, ${route}` : ""),
        date: f.date,
        end: null,
        href: `/kalender/${e.id}`,
        owner: e.owner,
        important: true,
      });
    });
  }
  for (const t of src.tasks) {
    if (!t.due_date) continue;
    items.push({
      key: `t-${t.id}`,
      kind: "task",
      title: t.title,
      date: t.due_date,
      end: null,
      href: t.event_id ? `/kalender/${t.event_id}` : "/rutiner?vem=alla",
      owner: t.assignee,
      important: true,
    });
  }
  for (const m of src.maintenance) {
    const date = addDays(today, maintenanceDue(m, today));
    items.push({ key: `m-${m.id}`, kind: "maintenance", title: m.title, date, end: null, href: "/hemmet?visa=underhall", owner: m.owner, important: daysBetween(today, date) <= 14 });
  }
  for (const g of src.goals) {
    if (!g.due_date || g.archived) continue;
    items.push({ key: `g-${g.id}`, kind: "goal", title: `Deadline: ${g.title}`, date: g.due_date, end: null, href: "/mal", owner: g.owner, important: true });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "sv"));
}

/** Det som pågår eller börjar inom [from, to]. Försenat underhåll räknas till idag. */
export function inRange(items: AgendaItem[], from: string, to: string, today: string): AgendaItem[] {
  return items
    .map((i) => (i.kind === "maintenance" && i.date < today ? { ...i, date: today } : i))
    .filter((i) => (i.end ?? i.date) >= from && i.date <= to);
}

/** Grupperar per dag. Flerdagars sådant (resor) visas på första dagen i intervallet. */
export function byDay(items: AgendaItem[], from: string): Map<string, AgendaItem[]> {
  const days = new Map<string, AgendaItem[]>();
  for (const i of items) {
    const day = i.date < from ? from : i.date;
    days.set(day, [...(days.get(day) ?? []), i]);
  }
  return new Map([...days.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export const RANGES = {
  vecka: { label: "Den här veckan", days: 0 },
  nasta: { label: "Nästa vecka", days: 7 },
  "30": { label: "30 dagar", days: 30 },
  "90": { label: "3 månader", days: 90 },
} as const;
export type RangeKey = keyof typeof RANGES;
/** Visningsordning. Objektnycklar som ser ut som siffror sorteras annars först. */
export const RANGE_ORDER: RangeKey[] = ["vecka", "nasta", "30", "90"];

/** Från och till för ett filter. Veckorna går måndag till söndag. */
export function rangeDates(key: RangeKey, today: string, monday: string): [string, string] {
  if (key === "vecka") return [today, addDays(monday, 6)];
  if (key === "nasta") return [addDays(monday, 7), addDays(monday, 13)];
  return [today, addDays(today, RANGES[key].days)];
}
