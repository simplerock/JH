import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { GoalCard } from "@/components/GoalCard";
import { ProgressBar } from "@/components/ProgressBar";
import { Empty, Section } from "@/components/Section";
import { TaskRow } from "@/components/TaskRow";
import { daysBetween, formatRange, today } from "@/lib/dates";
import { countdown, formatNumber } from "@/lib/format";
import { goalProgress, isDone, maintenanceDue, taskProgress } from "@/lib/progress";
import { loadAgenda } from "@/lib/queries";
import { kidWeek } from "@/lib/score";
import { Agenda, RangeChips } from "@/components/Agenda";
import { byDay, inRange, rangeDates, RANGES, type RangeKey } from "@/lib/agenda";
import { MaintenanceRow } from "@/components/MaintenanceRow";
import { Approvals } from "@/components/Approvals";
import { ScoreCard } from "@/components/ScoreCard";
import { weekStart, addDays } from "@/lib/dates";
import { currentCompletion, levelFor } from "@/lib/progress";
import { signedPhotoUrls } from "@/lib/queries";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("sv-SE", { hour: "numeric", timeZone: "Europe/Stockholm" }).format(new Date()));
  return h < 10 ? "God morgon" : h < 18 ? "Hej" : "God kväll";
}

export default async function Home({ searchParams }: { searchParams: Promise<{ visa?: string }> }) {
  const { visa } = await searchParams;
  const range: RangeKey = visa && visa in RANGES ? (visa as RangeKey) : "vecka";
  const d = today();
  const data = await loadAgenda();
  const { events, agenda } = data;
  const [from, to] = rangeDates(range, d, weekStart(d));
  const upcoming = byDay(inRange(agenda.filter((i) => i.important && i.kind !== "maintenance"), from, to, d), from);
  const { profile, members, goals, tasks, completions, projects, maintenance, isParent, levels, weekFrom, adjustments } = data;
  const me = profile.id;
  const byId = new Map(members.map((m) => [m.id, m]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const kids = members.filter((m) => m.role === "child");
  const daysLeft = daysBetween(d, addDays(weekStart(d), 6));

  const myTasks = tasks.filter((t) => t.assignee === me && !t.project_id);
  const statusOf = (t: (typeof tasks)[number]) => currentCompletion(t, completions)?.status;
  const open = myTasks.filter((t) => !isDone(t, completions) && statusOf(t) !== "pending");
  const waiting = myTasks.filter((t) => statusOf(t) === "pending");
  const closed = myTasks.filter((t) => isDone(t, completions) && t.recurrence !== "none");
  const myMaint = maintenance
    .filter((m) => m.owner === me)
    .map((m) => ({ m, due: maintenanceDue(m, d) }))
    .filter(({ due }) => due <= 30)
    .sort((a, b) => a.due - b.due);
  const myProjects = projects.filter((p) => p.owner === me && p.status !== "done");
  const myGoals = goals.filter((g) => g.owner === me && !g.archived);
  const houseOrphans = [...projects.filter((p) => p.status !== "done"), ...maintenance].filter((x) => !x.owner).length;
  const orphans = houseOrphans + goals.filter((g) => !g.archived && !g.owner).length;
  const vacation = events.find((e) => e.kind === "vacation");
  const nothing = isParent && myTasks.length + myMaint.length + myProjects.length + myGoals.length + kids.length === 0;
  const pending = isParent ? completions.filter((c) => c.status === "pending" && taskById.has(c.task_id)) : [];
  const photos = await signedPhotoUrls(pending.map((c) => c.photo_path ?? ""));
  const myPending = completions
    .filter((c) => c.completed_by === me && c.status === "pending")
    .reduce((sum, c) => sum + (taskById.get(c.task_id)?.points ?? 0), 0);
  const row = (t: (typeof tasks)[number]) => (
    <TaskRow key={t.id} task={t} completion={currentCompletion(t, completions)} me={profile} assignee={byId.get(t.assignee ?? "")} />
  );
  const dateLabel = new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Stockholm" }).format(new Date());

  return (
    <>
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm capitalize text-muted">{dateLabel}</p>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">{greeting()} {profile.display_name}</h1>
        </div>
        <Link href="/familj" aria-label="Familj">
          <Avatar name={profile.display_name} color={profile.color} size={36} />
        </Link>
      </header>

      {!isParent && (
        <ScoreCard week={kidWeek(me, tasks, completions, weekFrom, { adjustments })} pendingPoints={myPending} levels={levels} daysLeft={daysLeft} />
      )}

      {vacation && (
        <Link href={`/kalender/${vacation.id}`} className="flex flex-col rounded-2xl bg-accent-soft p-4">
          <span className="text-sm font-semibold text-accent">{countdown(daysBetween(d, vacation.start_date))}</span>
          <span className="text-xl font-bold">{vacation.title}</span>
          <span className="text-sm text-muted">{formatRange(vacation.start_date, vacation.end_date)}</span>
        </Link>
      )}

      {isParent && (addDays(weekStart(d), 6) === d || weekStart(d) === d) && (
        <Link href="/vecka" className="flex items-center justify-between rounded-2xl bg-card px-4 py-3.5">
          <span>
            <span className="block font-semibold">Veckans genomgång</span>
            <span className="text-[13px] text-muted">Poäng, förmåner och veckan som kommer</span>
          </span>
          <span className="text-sm font-medium text-accent">Öppna</span>
        </Link>
      )}

      <Approvals
        items={pending.map((c) => ({
          completion: c,
          task: taskById.get(c.task_id)!,
          kid: byId.get(c.completed_by),
          photoUrl: c.photo_path ? photos.get(c.photo_path) : undefined,
        }))}
      />

      <section className="flex flex-col gap-3">
        <h2 className="section-title mb-0">Familjens kalender</h2>
        <RangeChips active={range} base="/" />
        <Agenda days={upcoming} today={d} members={members} empty={range === "vecka" ? "Inget särskilt resten av veckan." : "Inget inplanerat."} />
      </section>

      {myTasks.length > 0 && (
        <Section title="Att göra" aside={`${taskProgress(myTasks, completions).done} av ${myTasks.length} klara`}>
          {open.length === 0 && <Empty>{waiting.length ? "Allt inskickat. Snyggt." : "Allt klart. Snyggt."}</Empty>}
          {open.map(row)}
          {closed.length > 0 && (
            <details className="group/done">
              <summary className="cursor-pointer list-none py-3 text-sm text-muted">
                <span className="group-open/done:hidden">Visa klara ({closed.length})</span>
                <span className="hidden group-open/done:inline">Dölj klara</span>
              </summary>
              <div className="border-t border-line">
                {closed.map(row)}
              </div>
            </details>
          )}
        </Section>
      )}

      {waiting.length > 0 && <Section title="Väntar på mamma eller pappa">{waiting.map(row)}</Section>}

      {isParent && kids.length > 0 && (
        <Section title="Barnens vecka">
          {kids.map((k) => {
            const pts = kidWeek(k.id, tasks, completions, weekFrom, { adjustments }).points;
            const { level, lowest } = levelFor(pts, levels);
            const top = Math.max(...levels.map((l) => l.min_points), 1);
            return (
              <Link key={k.id} href="/poang" className="flex items-center gap-3 py-3.5">
                <Avatar name={k.display_name} color={k.color} size={22} />
                <div className="flex-1">
                  <ProgressBar ratio={pts / top} label={k.display_name} detail={`${pts} p${level ? ` · ${level.name}` : ""}`} over={lowest} thin />
                </div>
              </Link>
            );
          })}
        </Section>
      )}

      {myMaint.length > 0 && (
        <Section title="Underhåll snart">
          {myMaint.map(({ m, due }) => <MaintenanceRow key={m.id} item={m} d={due} />)}
        </Section>
      )}

      {myProjects.length > 0 && (
        <Section title="Dina projekt">
          {myProjects.map((p) => {
            const steps = tasks.filter((t) => t.project_id === p.id);
            const sp = taskProgress(steps, completions);
            return (
              <Link key={p.id} href="/hemmet" className="block py-4">
                <ProgressBar ratio={sp.ratio} label={p.title} detail={steps.length ? `${sp.done} av ${sp.total} steg` : "Inga steg än"} />
                {p.budget ? (
                  <p className={`mt-1.5 text-[13px] ${Number(p.spent) > Number(p.budget) ? "text-warn" : "text-muted"}`}>
                    {formatNumber(Number(p.spent))} av {formatNumber(Number(p.budget))} kr
                  </p>
                ) : null}
              </Link>
            );
          })}
        </Section>
      )}

      {myGoals.length > 0 && (
        <Section title="Dina mål">
          {myGoals.map((g) => <GoalCard key={g.id} goal={g} progress={goalProgress(g, tasks, completions)} />)}
        </Section>
      )}

      {nothing && (
        <Section>
          <Empty>Inget på ditt ansvar just nu.{isParent && " Fördela sysslor under Rutiner och ansvar under Mål och Hemmet."}</Empty>
        </Section>
      )}

      {isParent && orphans > 0 && (
        <p className="px-1 text-sm text-muted">
          {orphans === 1 ? "1 sak saknar ansvarig." : `${orphans} saker saknar ansvarig.`}{" "}
          <Link href={houseOrphans ? "/hemmet" : "/mal"} className="font-medium text-accent">Fördela</Link>
        </p>
      )}

      {members.length === 1 && isParent && (
        <p className="px-1 text-sm text-muted">
          Lägg till resten av familjen under <Link href="/familj" className="font-medium text-accent">Familj</Link>.
        </p>
      )}
    </>
  );
}
