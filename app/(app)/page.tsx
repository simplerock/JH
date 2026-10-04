import Link from "next/link";
import { ChevronRight, Palmtree } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { GoalCard } from "@/components/GoalCard";
import { ProgressBar } from "@/components/ProgressBar";
import { TaskRow } from "@/components/TaskRow";
import { daysBetween, formatRange, today } from "@/lib/dates";
import { countdown } from "@/lib/format";
import { goalProgress, isDone, taskProgress } from "@/lib/progress";
import { loadEvents, loadFamilyData } from "@/lib/queries";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("sv-SE", { hour: "numeric", timeZone: "Europe/Stockholm" }).format(new Date()));
  return h < 10 ? "God morgon" : h < 18 ? "Hej" : "God kväll";
}

export default async function Home() {
  const d = today();
  const [{ profile, family, members, goals, tasks, completions, isParent }, events] = await Promise.all([loadFamilyData(), loadEvents(d)]);
  const byId = new Map(members.map((m) => [m.id, m]));

  const mine = tasks
    .filter((t) => t.assignee === profile.id || (!t.assignee && t.recurrence !== "none"))
    .map((t) => ({ t, done: isDone(t, completions) }))
    .filter(({ t, done }) => !(t.recurrence === "none" && done))
    .sort((a, b) => Number(a.done) - Number(b.done));
  const routines = tasks.filter((t) => t.recurrence !== "none");
  const total = taskProgress(routines, completions);
  const active = goals.filter((g) => !g.archived);
  const vacation = events.find((e) => e.kind === "vacation");
  const upcoming = events.filter((e) => e !== vacation).slice(0, 3);
  const dateLabel = new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Stockholm" }).format(new Date());

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm capitalize text-muted">{dateLabel}</p>
          <h1 className="text-2xl font-bold tracking-tight">{greeting()} {profile.display_name}</h1>
        </div>
        <Link href="/familj" aria-label={family.name}>
          <Avatar name={profile.display_name} color={profile.color} size={40} />
        </Link>
      </header>

      {vacation && (
        <Link href={`/kalender/${vacation.id}`} className="card flex items-center gap-4 border-accent/30 bg-accent-soft">
          <Palmtree className="shrink-0 text-accent" size={32} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-accent">{countdown(daysBetween(d, vacation.start_date))}</p>
            <p className="truncate text-lg font-semibold">{vacation.title}</p>
            <p className="text-sm text-muted">{formatRange(vacation.start_date, vacation.end_date)}</p>
          </div>
          <ChevronRight className="text-muted" size={20} />
        </Link>
      )}

      <section className="card space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Rutiner just nu</h2>
          <Link href="/rutiner" className="text-sm text-accent">Alla</Link>
        </div>
        <ProgressBar ratio={total.ratio} label="Hela familjen" detail={`${total.done} av ${total.total}`} />
        {members.map((m) => {
          const theirs = routines.filter((t) => t.assignee === m.id);
          if (theirs.length === 0) return null;
          const p = taskProgress(theirs, completions);
          return <ProgressBar key={m.id} size="sm" ratio={p.ratio} color={m.color} label={m.display_name} detail={`${p.done} av ${p.total}`} />;
        })}
      </section>

      <section className="card">
        <h2 className="font-semibold">Mina sysslor</h2>
        {mine.length === 0 ? (
          <p className="py-3 text-sm text-muted">Inget på din lista. Skönt.</p>
        ) : (
          <ul className="divide-y divide-line">
            {mine.slice(0, 6).map(({ t, done }) => (
              <TaskRow key={t.id} task={t} done={done} assignee={t.assignee ? byId.get(t.assignee) : undefined} canToggle />
            ))}
          </ul>
        )}
      </section>

      {active.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Vi jobbar mot</h2>
            <Link href="/mal" className="text-sm text-accent">Alla mål</Link>
          </div>
          {active.slice(0, 4).map((g) => (
            <GoalCard key={g.id} goal={g} progress={goalProgress(g, tasks, completions)} compact />
          ))}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="card">
          <h2 className="mb-1 font-semibold">På gång</h2>
          <ul className="divide-y divide-line">
            {upcoming.map((e) => (
              <li key={e.id}>
                <Link href={`/kalender/${e.id}`} className="flex items-center justify-between py-2.5">
                  <span className="truncate font-medium">{e.title}</span>
                  <span className="shrink-0 text-sm text-muted">{formatRange(e.start_date, e.end_date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isParent && active.length === 0 && tasks.length === 0 && (
        <section className="card text-center">
          <p className="font-semibold">Kom igång</p>
          <p className="mb-3 text-sm text-muted">Sätt ett första mål och lägg in veckans städrutiner.</p>
          <div className="flex justify-center gap-2">
            <Link href="/mal" className="btn">Skapa mål</Link>
            <Link href="/rutiner" className="btn-ghost">Lägg till sysslor</Link>
          </div>
        </section>
      )}
    </div>
  );
}
