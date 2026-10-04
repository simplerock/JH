import "server-only";
import { buildAgenda } from "./agenda";
import { today, weekStartInstant } from "./dates";
import { currentPeriods } from "./progress";
import { getI18n } from "./i18n/server";
import { getSession, getUser } from "./session";
import type { Completion, FamilyEvent, Goal, MaintenanceItem, PointAdjustment, Profile, Project, RewardLevel, Task } from "./types";

export async function loadFamilyData() {
  // Familjens data kräver bara inloggningen (RLS sköter resten), så den hämtas samtidigt som profilen.
  const { supabase } = await getUser();
  const weekFrom = weekStartInstant();
  const lastWeekFrom = weekStartInstant(new Date(Date.now() - 7 * 86400000));
  const since = new Date(Date.now() - 60 * 86400000).toISOString();
  const periods = currentPeriods().map((p) => `"${p}"`).join(",");
  const [session, members, goals, tasks, completions, projects, maintenance, levels, adjustments] = await Promise.all([
    getSession(),
    supabase.from("profiles").select("*").order("created_at").returns<Profile[]>(),
    supabase.from("goals").select("*").order("created_at").returns<Goal[]>(),
    supabase.from("tasks").select("*").order("created_at").returns<Task[]>(),
    // Aktuella perioder, allt som väntar, två veckors godkända (poäng) och 60 dagar bakåt (streaks).
    supabase
      .from("task_completions")
      .select("id, task_id, period, completed_by, status, photo_path, note, completed_at, reviewed_at")
      .or(`period.in.(${periods}),status.eq.pending,reviewed_at.gte.${lastWeekFrom},completed_at.gte.${since}`)
      .returns<Completion[]>(),
    supabase.from("projects").select("*").order("created_at").returns<Project[]>(),
    supabase.from("maintenance_items").select("*").order("created_at").returns<MaintenanceItem[]>(),
    supabase.from("reward_levels").select("*").order("min_points", { ascending: false }).returns<RewardLevel[]>(),
    supabase.from("point_adjustments").select("*").gte("created_at", lastWeekFrom).order("created_at", { ascending: false }).returns<PointAdjustment[]>(),
  ]);
  return {
    ...session,
    members: members.data ?? [],
    goals: goals.data ?? [],
    tasks: tasks.data ?? [],
    completions: completions.data ?? [],
    projects: projects.data ?? [],
    maintenance: maintenance.data ?? [],
    levels: levels.data ?? [],
    adjustments: adjustments.data ?? [],
    weekFrom,
    lastWeekFrom,
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
  const [data, events, { t }] = await Promise.all([loadFamilyData(), loadEvents(d), getI18n()]);
  return { ...data, events, agenda: buildAgenda({ events, tasks: data.tasks, maintenance: data.maintenance, goals: data.goals, projects: data.projects }, d, t) };
}
