import "server-only";
import { buildAgenda } from "./agenda";
import { today, weekStartInstant } from "./dates";
import { currentPeriods } from "./progress";
import { getI18n } from "./i18n/server";
import { getSession, getUser } from "./session";
import type { Completion, FamilyEvent, Goal, MaintenanceItem, PointAdjustment, Profile, Project, RewardLevel, Task } from "./types";

type FamilyRows = {
  members: Profile[];
  goals: Goal[];
  tasks: Task[];
  completions: Completion[];
  projects: Project[];
  maintenance: MaintenanceItem[];
  levels: RewardLevel[];
  adjustments: PointAdjustment[];
  events: FamilyEvent[] | null;
};

/**
 * Familjens data. Med eventsFrom kommer också pågående och kommande händelser.
 * Allt hämtas i ett anrop (family_data, 0010_snabb_start.sql) samtidigt som profilen. RLS sköter behörigheten.
 */
export async function loadFamilyData({ eventsFrom }: { eventsFrom?: string } = {}) {
  const { supabase } = await getUser();
  const weekFrom = weekStartInstant();
  const lastWeekFrom = weekStartInstant(new Date(Date.now() - 7 * 86400000));
  const since = new Date(Date.now() - 60 * 86400000).toISOString();
  const periods = currentPeriods();
  const [session, rows] = await Promise.all([
    getSession(),
    supabase
      .rpc("family_data", { periods, reviewed_since: lastWeekFrom, completed_since: since, events_from: eventsFrom ?? null })
      .then(({ data, error }) => (error ? loadFamilyRows(periods, lastWeekFrom, since, eventsFrom) : (data as FamilyRows))),
  ]);
  return { ...session, ...rows, events: rows.events ?? [], weekFrom, lastWeekFrom };
}

/** Samma data tabell för tabell. Används tills 0010_snabb_start.sql körts i Supabase. */
async function loadFamilyRows(periods: string[], lastWeekFrom: string, since: string, eventsFrom?: string): Promise<FamilyRows> {
  const { supabase } = await getUser();
  const inPeriods = periods.map((p) => `"${p}"`).join(",");
  const [members, goals, tasks, completions, projects, maintenance, levels, adjustments, events] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at").returns<Profile[]>(),
    supabase.from("goals").select("*").order("created_at").returns<Goal[]>(),
    supabase.from("tasks").select("*").order("created_at").returns<Task[]>(),
    supabase
      .from("task_completions")
      .select("id, task_id, period, completed_by, status, photo_path, note, completed_at, reviewed_at")
      .or(`period.in.(${inPeriods}),status.eq.pending,reviewed_at.gte.${lastWeekFrom},completed_at.gte.${since}`)
      .returns<Completion[]>(),
    supabase.from("projects").select("*").order("created_at").returns<Project[]>(),
    supabase.from("maintenance_items").select("*").order("created_at").returns<MaintenanceItem[]>(),
    supabase.from("reward_levels").select("*").order("min_points", { ascending: false }).returns<RewardLevel[]>(),
    supabase.from("point_adjustments").select("*").gte("created_at", lastWeekFrom).order("created_at", { ascending: false }).returns<PointAdjustment[]>(),
    eventsFrom ? loadEvents(eventsFrom) : null,
  ]);
  return {
    members: members.data ?? [],
    goals: goals.data ?? [],
    tasks: tasks.data ?? [],
    completions: completions.data ?? [],
    projects: projects.data ?? [],
    maintenance: maintenance.data ?? [],
    levels: levels.data ?? [],
    adjustments: adjustments.data ?? [],
    events,
  };
}

export async function loadEvents(fromDate: string) {
  const { supabase } = await getUser();
  const { data } = await supabase
    .from("events")
    .select("*")
    .or(`end_date.gte.${fromDate},and(end_date.is.null,start_date.gte.${fromDate})`)
    .order("start_date")
    .returns<FamilyEvent[]>();
  return data ?? [];
}

/** Signerade länkar till foton, giltiga en timme. */
export async function signedPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { supabase } = await getUser();
  const { data } = await supabase.storage.from("bevis").createSignedUrls(unique, 3600);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl as string]));
}

/** Händelser som pågår eller kommer, plus agendan för hela familjen. */
export async function loadAgenda() {
  const d = today();
  const [data, { t }] = await Promise.all([loadFamilyData({ eventsFrom: d }), getI18n()]);
  return { ...data, agenda: buildAgenda({ events: data.events, tasks: data.tasks, maintenance: data.maintenance, goals: data.goals, projects: data.projects }, d, t) };
}
