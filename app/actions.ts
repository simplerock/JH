"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { periodKey } from "@/lib/dates";
import { getSession, getUser, requireParent } from "@/lib/session";
import { childEmail, childPassword } from "@/lib/supabase/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ChecklistItem, FamilyEvent, Recurrence } from "@/lib/types";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => str(f, k) || null;
const optNum = (f: FormData, k: string) => {
  const v = str(f, k).replace(/\s/g, "").replace(",", ".");
  return v ? Number(v) : null;
};

function fail(error: unknown): FormState {
  const msg = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "Något gick fel";
  return { error: translate(msg) };
}

function translate(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Fel inloggningsuppgifter";
  if (msg.includes("already registered")) return "Det finns redan ett konto med den e-posten";
  if (msg.includes("Password should be")) return "Lösenordet är för kort (minst 6 tecken)";
  if (msg.includes("Email not confirmed")) return "Bekräfta din e-post först, kolla inkorgen";
  return msg;
}

function refresh() {
  revalidatePath("/", "layout");
}

// Inloggning ------------------------------------------------------------------------

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(form, "email"), password: str(form, "password") });
  if (error) return fail(error);
  redirect("/");
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email: str(form, "email"), password: str(form, "password") });
  if (error) return fail(error);
  if (!data.session) return { ok: "Kolla din e-post och klicka på länken för att bekräfta kontot." };
  redirect("/onboarding");
}

export async function childSignIn(_: FormState, form: FormData): Promise<FormState> {
  const username = str(form, "username").toLowerCase();
  const pin = str(form, "pin");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: childEmail(username), password: childPassword(pin) });
  if (error) return { error: "Fel namn eller PIN" };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Familj ------------------------------------------------------------------------------

export async function createFamily(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await getUser();
  const { error } = await supabase.rpc("create_family", { family_name: str(form, "family"), my_name: str(form, "name") });
  if (error) return fail(error);
  redirect("/");
}

export async function joinFamily(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await getUser();
  const { error } = await supabase.rpc("join_family", { code: str(form, "code"), my_name: str(form, "name") });
  if (error) return fail(error);
  redirect("/");
}

export async function newInviteCode() {
  const { supabase } = await requireParent();
  await supabase.rpc("new_invite_code");
  refresh();
}

export async function createChild(_: FormState, form: FormData): Promise<FormState> {
  try {
    const { family } = await requireParent();
    const name = str(form, "name");
    const username = str(form, "username").toLowerCase();
    const pin = str(form, "pin");
    if (!name) return { error: "Skriv ett namn" };
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return { error: "Användarnamn: 3–20 tecken, bara a–z, siffror och _" };
    if (!/^\d{4,8}$/.test(pin)) return { error: "PIN: 4–8 siffror" };

    const admin = createServiceClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: childEmail(username),
      password: childPassword(pin),
      email_confirm: true,
      user_metadata: { display_name: name, role: "child" },
    });
    if (error) return error.message.includes("already") ? { error: "Användarnamnet är upptaget" } : fail(error);

    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      family_id: family.id,
      display_name: name,
      role: "child",
      username,
      color: str(form, "color") || "#f59e0b",
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return fail(profileError);
    }
    refresh();
    return { ok: `${name} kan nu logga in med ${username} och sin PIN.` };
  } catch (e) {
    return fail(e);
  }
}

export async function updateMyProfile(form: FormData) {
  const { supabase, profile } = await getSession();
  await supabase.from("profiles").update({ display_name: str(form, "name") || profile.display_name, color: str(form, "color") || profile.color }).eq("id", profile.id);
  refresh();
}

// Mål -------------------------------------------------------------------------------------

export async function createGoal(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireParent();
  const kind = str(form, "kind") === "amount" ? "amount" : "tasks";
  const target = optNum(form, "target");
  if (kind === "amount" && !(target && target > 0)) return { error: "Ange ett målbelopp" };
  const { error } = await supabase.from("goals").insert({
    title: str(form, "title"),
    description: optStr(form, "description"),
    category: str(form, "category") || "Övrigt",
    kind,
    target: kind === "amount" ? target : null,
    current: kind === "amount" ? optNum(form, "current") ?? 0 : 0,
    unit: str(form, "unit") || "kr",
    due_date: optStr(form, "due_date"),
  });
  if (error) return fail(error);
  refresh();
  return { ok: "Målet är skapat" };
}

export async function addToGoal(form: FormData) {
  const { supabase } = await requireParent();
  const id = str(form, "id");
  const amount = optNum(form, "amount");
  if (!amount) return;
  const { data: goal } = await supabase.from("goals").select("current").eq("id", id).single();
  if (!goal) return;
  await supabase.from("goals").update({ current: Number(goal.current) + amount }).eq("id", id);
  refresh();
}

export async function archiveGoal(form: FormData) {
  const { supabase } = await requireParent();
  await supabase.from("goals").update({ archived: form.get("archived") === "true" }).eq("id", str(form, "id"));
  refresh();
}

export async function deleteGoal(form: FormData) {
  const { supabase } = await requireParent();
  await supabase.from("goals").delete().eq("id", str(form, "id"));
  refresh();
}

// Sysslor -----------------------------------------------------------------------------

const RECURRENCES: Recurrence[] = ["none", "daily", "weekly", "monthly"];

export async function createTask(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireParent();
  const recurrence = str(form, "recurrence") as Recurrence;
  const { error } = await supabase.from("tasks").insert({
    title: str(form, "title"),
    area: optStr(form, "area"),
    recurrence: RECURRENCES.includes(recurrence) ? recurrence : "weekly",
    assignee: optStr(form, "assignee"),
    goal_id: optStr(form, "goal_id"),
    due_date: optStr(form, "due_date"),
    points: optNum(form, "points") ?? 1,
  });
  if (error) return fail(error);
  refresh();
  return { ok: "Sysslan är tillagd" };
}

export async function toggleTask(form: FormData) {
  const { supabase, user } = await getSession();
  const taskId = str(form, "id");
  const recurrence = str(form, "recurrence") as Recurrence;
  const period = periodKey(RECURRENCES.includes(recurrence) ? recurrence : "weekly");
  if (form.get("done") === "true") {
    await supabase.from("task_completions").delete().eq("task_id", taskId).eq("period", period);
  } else {
    await supabase.from("task_completions").insert({ task_id: taskId, period, completed_by: user.id });
  }
  refresh();
}

export async function deleteTask(form: FormData) {
  const { supabase } = await requireParent();
  await supabase.from("tasks").delete().eq("id", str(form, "id"));
  refresh();
}

// Kalender och semester -------------------------------------------------------------

function parseChecklist(text: string): ChecklistItem[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((text) => ({ text, done: false }));
}

export async function createEvent(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireParent();
  const kind = str(form, "kind");
  const { data, error } = await supabase
    .from("events")
    .insert({
      kind: ["vacation", "event", "activity"].includes(kind) ? kind : "event",
      title: str(form, "title"),
      start_date: str(form, "start_date"),
      end_date: optStr(form, "end_date"),
      location: optStr(form, "location"),
      notes: optStr(form, "notes"),
      checklist: parseChecklist(str(form, "checklist")),
      goal_id: optStr(form, "goal_id"),
    })
    .select("id")
    .single();
  if (error) return fail(error);
  refresh();
  redirect(`/kalender/${data.id}`);
}

export async function updateEvent(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireParent();
  const { error } = await supabase
    .from("events")
    .update({
      title: str(form, "title"),
      start_date: str(form, "start_date"),
      end_date: optStr(form, "end_date"),
      location: optStr(form, "location"),
      notes: optStr(form, "notes"),
      goal_id: optStr(form, "goal_id"),
    })
    .eq("id", str(form, "id"));
  if (error) return fail(error);
  refresh();
  return { ok: "Sparat" };
}

async function editChecklist(id: string, change: (items: ChecklistItem[]) => ChecklistItem[]) {
  const { supabase } = await requireParent();
  const { data } = await supabase.from("events").select("checklist").eq("id", id).single<Pick<FamilyEvent, "checklist">>();
  if (!data) return;
  await supabase.from("events").update({ checklist: change(data.checklist) }).eq("id", id);
  refresh();
}

export async function toggleChecklistItem(form: FormData) {
  const index = Number(form.get("index"));
  await editChecklist(str(form, "id"), (items) => items.map((it, i) => (i === index ? { ...it, done: !it.done } : it)));
}

export async function addChecklistItems(form: FormData) {
  const added = parseChecklist(str(form, "text"));
  await editChecklist(str(form, "id"), (items) => [...items, ...added]);
}

export async function removeChecklistItem(form: FormData) {
  const index = Number(form.get("index"));
  await editChecklist(str(form, "id"), (items) => items.filter((_, i) => i !== index));
}

export async function deleteEvent(form: FormData) {
  const { supabase } = await requireParent();
  await supabase.from("events").delete().eq("id", str(form, "id"));
  refresh();
  redirect("/kalender");
}
