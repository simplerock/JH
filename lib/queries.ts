import "server-only";
import { currentPeriods } from "./progress";
import { getSession } from "./session";
import type { Completion, FamilyEvent, Goal, MaintenanceItem, Profile, Project, Task } from "./types";

export async function loadFamilyData() {
  const session = await getSession();
  const { supabase } = session;
  const [members, goals, tasks, completions, projects, maintenance] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at").returns<Profile[]>(),
    supabase.from("goals").select("*").order("created_at").returns<Goal[]>(),
    supabase.from("tasks").select("*").order("created_at").returns<Task[]>(),
    supabase.from("task_completions").select("task_id, period, completed_by").in("period", currentPeriods()).returns<Completion[]>(),
    supabase.from("projects").select("*").order("created_at").returns<Project[]>(),
    supabase.from("maintenance_items").select("*").order("created_at").returns<MaintenanceItem[]>(),
  ]);
  return {
    ...session,
    members: members.data ?? [],
    goals: goals.data ?? [],
    tasks: tasks.data ?? [],
    completions: completions.data ?? [],
    projects: projects.data ?? [],
    maintenance: maintenance.data ?? [],
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
