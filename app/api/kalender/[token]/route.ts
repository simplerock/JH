import { buildAgenda } from "@/lib/agenda";
import { addDays, today } from "@/lib/dates";
import { buildIcs, type IcsItem } from "@/lib/ics";
import { createServiceClient } from "@/lib/supabase/server";
import { readDetails } from "@/lib/trip";
import type { FamilyEvent, Goal, MaintenanceItem, Project, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Kalenderprenumeration. Länken är hemlig och kan bytas ut av en förälder. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clean = token.replace(/\.ics$/, "");
  if (!/^[a-f0-9]{36}$/.test(clean)) return new Response("Hittades inte", { status: 404 });

  const db = createServiceClient();
  const { data: family } = await db.from("families").select("id, name").eq("calendar_token", clean).maybeSingle();
  if (!family) return new Response("Hittades inte", { status: 404 });

  const d = today();
  const since = addDays(d, -60);
  const [events, tasks, maintenance, goals] = await Promise.all([
    db.from("events").select("*").eq("family_id", family.id).gte("start_date", since).returns<FamilyEvent[]>(),
    db.from("tasks").select("*").eq("family_id", family.id).not("due_date", "is", null).returns<Task[]>(),
    db.from("maintenance_items").select("*").eq("family_id", family.id).returns<MaintenanceItem[]>(),
    db.from("goals").select("*").eq("family_id", family.id).returns<Goal[]>(),
  ]);

  const evById = new Map((events.data ?? []).map((e) => [e.id, e]));
  const items: IcsItem[] = buildAgenda(
    { events: events.data ?? [], tasks: tasks.data ?? [], maintenance: maintenance.data ?? [], goals: goals.data ?? [], projects: [] as Project[] },
    d,
  ).map((i) => {
    const e = i.key.startsWith("e-") ? evById.get(i.key.slice(2)) : undefined;
    if (!e) return i;
    const det = readDetails(e.details);
    const lines = [
      ...det.flights.map((f) => [f.date, f.flight_no, [f.from, f.to].filter(Boolean).join(" → "), [f.depart, f.arrive].filter(Boolean).join("–"), f.booking_ref && `Bokning ${f.booking_ref}`].filter(Boolean).join(" · ")),
      ...det.important,
      e.location ?? "",
      e.notes ?? "",
    ].filter(Boolean);
    return { ...i, description: lines.join("\n") || undefined };
  });

  const base = new URL(request.url).origin;
  return new Response(buildIcs(family.name, items, base), {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=900" },
  });
}
