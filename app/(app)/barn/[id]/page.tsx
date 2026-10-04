import { notFound, redirect } from "next/navigation";
import { Approvals } from "@/components/Approvals";
import { PageHeader } from "@/components/PageHeader";
import { ScoreCard } from "@/components/ScoreCard";
import { Empty, Section } from "@/components/Section";
import { TaskRow } from "@/components/TaskRow";
import { addDays, daysBetween, today, weekStart } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { currentCompletion, isDone } from "@/lib/progress";
import { loadFamilyData, signedPhotoUrls } from "@/lib/queries";
import { dailyPoints, kidWeek } from "@/lib/score";


/** Ett barns vecka för föräldrarna: poäng dag för dag, vad som är kvar, väntar och klart. */
export default async function KidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ profile, members, tasks, completions, levels, adjustments, weekFrom, isParent }, { t, date, locale }] = await Promise.all([loadFamilyData(), getI18n()]);
  const kid = members.find((m) => m.id === id && m.role === "child");
  if (!kid) notFound();
  if (!isParent && profile.id !== kid.id) redirect("/");

  const d = today();
  const monday = weekStart(d);
  const dayName = (iso: string) => new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`)).replace(".", "");
  const week = kidWeek(kid.id, tasks, completions, weekFrom, { adjustments });
  const perDay = dailyPoints(kid.id, tasks, completions, adjustments, monday);
  const maxDay = Math.max(...perDay, 1);
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const theirs = tasks.filter((t) => t.assignee === kid.id && !t.project_id);
  const statusOf = (t: (typeof tasks)[number]) => currentCompletion(t, completions)?.status;
  const open = theirs.filter((t) => !isDone(t, completions) && statusOf(t) !== "pending" && (t.recurrence !== "none" || !t.due_date || daysBetween(d, t.due_date) <= 14));
  const pending = completions.filter((c) => c.completed_by === kid.id && c.status === "pending" && taskById.has(c.task_id));
  const doneThisWeek = completions
    .filter((c) => c.completed_by === kid.id && c.status === "approved" && c.reviewed_at && c.reviewed_at >= weekFrom && taskById.has(c.task_id))
    .sort((a, b) => (b.reviewed_at ?? "").localeCompare(a.reviewed_at ?? ""));
  const extras = adjustments.filter((a) => a.kid_id === kid.id && a.created_at >= weekFrom);
  const photos = isParent ? await signedPhotoUrls(pending.map((c) => c.photo_path ?? "")) : new Map<string, string>();
  const pendingPoints = pending.reduce((s, c) => s + (taskById.get(c.task_id)?.points ?? 0), 0);

  return (
    <>
      <PageHeader title={kid.display_name} back={isParent ? { href: "/poang", label: t("Poäng") } : { href: "/", label: t("Hem") }} />

      <ScoreCard week={week} pendingPoints={pendingPoints} levels={levels} daysLeft={daysBetween(d, addDays(monday, 6))} />

      <Section title={t("Veckan")} aside={`${week.points} p`}>
        <div className="grid grid-cols-7 items-end gap-1.5 py-4" role="list" aria-label={t("Poäng per dag")}>
          {perDay.map((p, i) => {
            const day = addDays(monday, i);
            const future = day > d;
            return (
              <div key={day} role="listitem" aria-label={t("{day}: {n} poäng", { day: dayName(day), n: p })} className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold tabular-nums text-muted">{future ? "" : p}</span>
                <div className="flex h-20 w-full items-end rounded-md bg-track">
                  <div className={`w-full rounded-md ${p < 0 ? "bg-warn" : "bg-accent"}`} style={{ height: `${(Math.abs(p) / maxDay) * 100}%` }} />
                </div>
                <span className={`text-[11px] ${day === d ? "font-bold text-ink" : "text-muted"}`}>{dayName(day)}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {isParent && (
        <Approvals items={pending.map((c) => ({ completion: c, task: taskById.get(c.task_id)!, kid, photoUrl: c.photo_path ? photos.get(c.photo_path) : undefined }))} />
      )}

      <Section title={t("Kvar att göra")} aside={`${open.length}`}>
        {open.length === 0 && <Empty>{t("Inget kvar just nu.")}</Empty>}
        {open.map((t) => (
          <TaskRow key={t.id} task={t} completion={currentCompletion(t, completions)} me={profile} assignee={kid} />
        ))}
      </Section>

      {doneThisWeek.length > 0 && (
        <Section title={t("Klart den här veckan")} aside={`${doneThisWeek.length}`}>
          {doneThisWeek.map((c) => {
            const task = taskById.get(c.task_id)!;
            return (
              <div key={c.id ?? `${c.task_id}-${c.period}`} className="flex min-h-12 items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-[13px] text-muted">{c.reviewed_at ? t("Godkänd {date}", { date: date(today(new Date(c.reviewed_at))) }) : ""}</p>
                </div>
                <span className="font-semibold tabular-nums text-accent">+{task.points} p</span>
              </div>
            );
          })}
        </Section>
      )}

      {extras.length > 0 && (
        <Section title={t("Extra poäng")}>
          {extras.map((a) => (
            <div key={a.id} className="flex min-h-12 items-center gap-3 py-2.5">
              <p className="min-w-0 flex-1 font-medium">{a.reason}</p>
              <span className={`font-semibold tabular-nums ${a.points < 0 ? "text-warn" : "text-accent"}`}>{a.points > 0 ? `+${a.points}` : a.points} p</span>
            </div>
          ))}
        </Section>
      )}
    </>
  );
}
