import Link from "next/link";
import { redirect } from "next/navigation";
import { Agenda } from "@/components/Agenda";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { Empty, Section } from "@/components/Section";
import { byDay, inRange } from "@/lib/agenda";
import { addDays, daysBetween, formatDate, isoWeek, today, weekStart, weekStartInstant } from "@/lib/dates";
import { currentCompletion, levelFor, maintenanceDue } from "@/lib/progress";
import { loadAgenda } from "@/lib/queries";
import { kidWeek } from "@/lib/score";

/** Underlag för familjens veckomöte: veckan som gått och veckan som kommer. */
export default async function WeekReview() {
  const data = await loadAgenda();
  const { isParent, members, tasks, completions, levels, adjustments, maintenance, goals, projects, events, agenda } = data;
  if (!isParent) redirect("/");

  const d = today();
  // På söndagar gäller genomgången veckan som slutar idag, annars förra veckan.
  const sunday = addDays(weekStart(d), 6) === d;
  const monday = sunday ? weekStart(d) : addDays(weekStart(d), -7);
  const lastDay = addDays(monday, 6);
  const from = weekStartInstant(new Date(`${monday}T12:00:00Z`));
  const to = weekStartInstant(new Date(`${addDays(monday, 7)}T12:00:00Z`));
  const nextMonday = addDays(monday, 7);
  const kids = members.filter((m) => m.role === "child");
  const top = Math.max(...levels.map((l) => l.min_points), 1);

  const doneBy = (id: string) =>
    completions.filter((c) => c.completed_by === id && c.status === "approved" && c.reviewed_at && c.reviewed_at >= from && c.reviewed_at < to).length;

  const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < d && currentCompletion(t, completions)?.status !== "approved");
  const lateMaint = maintenance.filter((m) => maintenanceDue(m, d) < 0);
  const orphans = [...goals.filter((g) => !g.archived), ...projects.filter((p) => p.status !== "done"), ...maintenance].filter((x) => !x.owner).length;
  const unbooked = events.filter((e) => e.kind === "vacation" && !e.booked && daysBetween(d, e.start_date) <= 60);
  const nextWeek = byDay(inRange(agenda.filter((i) => i.important), nextMonday, addDays(nextMonday, 6), d), nextMonday);

  const talk: string[] = [];
  for (const k of kids) {
    const w = kidWeek(k.id, tasks, completions, from, { weekTo: to, day: lastDay > d ? d : lastDay, adjustments });
    const { lowest } = levelFor(w.points, levels);
    if (lowest) talk.push(`${k.display_name} hamnade under ribban. Vad behövs för att det ska gå bättre?`);
  }
  for (const e of unbooked) talk.push(`${e.title} är inte bokad, ${daysBetween(d, e.start_date)} dagar kvar.`);
  if (overdueTasks.length) talk.push(`${overdueTasks.length} ${overdueTasks.length === 1 ? "uppgift är" : "uppgifter är"} försenade.`);
  if (orphans) talk.push(`${orphans} saker saknar ansvarig.`);

  return (
    <>
      <PageHeader title="Veckans genomgång" subtitle={`Vecka ${Number(isoWeek(monday).slice(-2))}, ${formatDate(monday)} – ${formatDate(lastDay)}`} back={{ href: "/mer", label: "Mer" }} />

      {kids.length > 0 && (
        <Section title="Barnen">
          {kids.map((k) => {
            const w = kidWeek(k.id, tasks, completions, from, { weekTo: to, day: lastDay > d ? d : lastDay, adjustments });
            const { level, lowest } = levelFor(w.points, levels);
            return (
              <div key={k.id} className="flex gap-3 py-4">
                <Avatar name={k.display_name} color={k.color} size={28} />
                <div className="min-w-0 flex-1">
                  <ProgressBar ratio={w.points / top} label={k.display_name} detail={`${w.points} p${level ? ` · ${level.name}` : ""}`} over={lowest} />
                  {level && <p className={`mt-1.5 text-[13px] ${lowest ? "text-warn" : "text-muted"}`}>{lowest ? "Konsekvens" : "Förmån"}: {level.reward}</p>}
                  {(w.bonus > 0 || w.streak > 0) && (
                    <p className="text-[13px] text-muted">{[w.bonus > 0 && `${w.bonus} bonuspoäng`, w.streak > 0 && `${w.streak} dagar i rad nu`].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              </div>
            );
          })}
        </Section>
      )}

      <Section title="Klart under veckan">
        {members.map((m) => (
          <div key={m.id} className="flex min-h-12 items-center gap-3 py-2.5">
            <Avatar name={m.display_name} color={m.color} size={22} />
            <span className="flex-1 font-medium">{m.display_name}</span>
            <span className="text-sm tabular-nums text-muted">{doneBy(m.id)} klara</span>
          </div>
        ))}
      </Section>

      <Section title="Att prata om">
        {talk.length === 0 ? (
          <Empty>Inget som brinner. Bra vecka.</Empty>
        ) : (
          <ul className="list-disc space-y-1.5 py-3.5 pl-5 marker:text-muted">
            {talk.map((t) => <li key={t}>{t}</li>)}
          </ul>
        )}
      </Section>

      {(overdueTasks.length > 0 || lateMaint.length > 0) && (
        <Section title="Försenat">
          {overdueTasks.map((t) => (
            <Link key={t.id} href={t.event_id ? `/kalender/${t.event_id}` : "/rutiner?vem=alla"} className="flex min-h-12 items-center justify-between gap-3 py-2.5">
              <span className="font-medium">{t.title}</span>
              <span className="text-sm text-warn">{formatDate(t.due_date!)}</span>
            </Link>
          ))}
          {lateMaint.map((m) => (
            <Link key={m.id} href="/hemmet?visa=underhall" className="flex min-h-12 items-center justify-between gap-3 py-2.5">
              <span className="font-medium">{m.title}</span>
              <span className="text-sm text-warn">{-maintenanceDue(m, d)} dagar sen</span>
            </Link>
          ))}
        </Section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="section-title mb-0">{sunday ? "Nästa vecka" : "Den här veckan"}</h2>
        <Agenda days={nextWeek} today={d} members={members} empty="Inget särskilt inplanerat." />
      </section>
    </>
  );
}
