import "server-only";
import { weekStartInstant } from "./dates";
import { currentPeriods } from "./progress";
import { getSession } from "./session";
import type { Completion, FamilyEvent, Goal, MaintenanceItem, Profile, Project, RewardLevel, Task } from "./types";

export async function loadFamilyData() {
  const session = await getSession();
  const { supabase } = session;
  const weekFrom = weekStartInstant();
  const periods = currentPeriods().map((p) => `"${p}"`).join(",");
  const [members, goals, tasks, completions, projects, maintenance, levels] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at").returns<Profile[]>(),
    supabase.from("goals").select("*").order("created_at").returns<Goal[]>(),
    supabase.from("tasks").select("*").order("created_at").returns<Task[]>(),
    // Aktuella perioder, allt som väntar och veckans godkända (för poängen).
    supabase
      .from("task_completions")
      .select("id, task_id, period, completed_by, status, photo_path, note, completed_at, reviewed_at")
      .or(`period.in.(${periods}),status.eq.pending,reviewed_at.gte.${weekFrom}`)
      .returns<Completion[]>(),
    supabase.from("projects").select("*").order("created_at").returns<Project[]>(),
    supabase.from("maintenance_items").select("*").order("created_at").returns<MaintenanceItem[]>(),
    supabase.from("reward_levels").select("*").order("min_points", { ascending: false }).returns<RewardLevel[]>(),
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
    weekFrom,
  };
}

export async function loadEvents(fromDate: string) {
  const { supabase } = await getSession();
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
  const { supabase } = await getSession();
  const { data } = await supabase.storage.from("bevis").createSignedUrls(unique, 3600);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl as string]));
}
