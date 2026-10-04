import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { GoalCard } from "@/components/GoalCard";
import { ProgressBar } from "@/components/ProgressBar";
import { Empty, Section } from "@/components/Section";
import { TaskRow } from "@/components/TaskRow";
import { daysBetween, formatRange, today } from "@/lib/dates";
import { countdown, formatNumber } from "@/lib/format";
import { goalProgress, isDone, maintenanceDue, taskProgress } from "@/lib/progress";
import { loadEvents, loadFamilyData } from "@/lib/queries";
import { MaintenanceRow } from "@/components/MaintenanceRow";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("sv-SE", { hour: "numeric", timeZone: "Europe/Stockholm" }).format(new Date()));
  return h < 10 ? "God morgon" : h < 18 ? "Hej" : "God kväll";
}

export default async function Home() {
  const d = today();
  const [data, events] = await Promise.all([loadFamilyData(), loadEvents(d)]);
  const { profile, members, goals, tasks, completions, projects, maintenance, isParent } = data;
  const me = profile.id;

  const myTasks = tasks.filter((t) => t.assignee === me && !t.project_id);
  const open = myTasks.filter((t) => !isDone(t, completions));
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
  const nothing = myTasks.length + myMaint.length + myProjects.length + myGoals.length === 0;
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

      {vacation && (
        <Link href={`/kalender/${vacation.id}`} className="flex flex-col rounded-2xl bg-accent-soft p-4">
          <span className="text-sm font-semibold text-accent">{countdown(daysBetween(d, vacation.start_date))}</span>
          <span className="text-xl font-bold">{vacation.title}</span>
          <span className="text-sm text-muted">{formatRange(vacation.start_date, vacation.end_date)}</span>
        </Link>
      )}

      {myTasks.length > 0 && (
        <Section title="Att göra" aside={`${taskProgress(myTasks, completions).done} av ${myTasks.length} klara`}>
          {open.length === 0 && <Empty>Allt klart. Snyggt.</Empty>}
          {open.map((t) => <TaskRow key={t.id} task={t} done={false} canToggle />)}
          {closed.length > 0 && (
            <details className="group/done">
              <summary className="cursor-pointer list-none py-3 text-sm text-muted">
                <span className="group-open/done:hidden">Visa klara ({closed.length})</span>
                <span className="hidden group-open/done:inline">Dölj klara</span>
              </summary>
              <div className="border-t border-line">
                {closed.map((t) => <TaskRow key={t.id} task={t} done canToggle />)}
              </div>
            </details>
          )}
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
