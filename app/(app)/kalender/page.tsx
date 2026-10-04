import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin, Palmtree, Trophy } from "lucide-react";
import { createEvent } from "@/app/actions";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { daysBetween, formatRange, today } from "@/lib/dates";
import { countdown } from "@/lib/format";
import { checklistProgress } from "@/lib/progress";
import { loadEvents, loadFamilyData } from "@/lib/queries";
import type { FamilyEvent } from "@/lib/types";

const ICONS = { vacation: Palmtree, event: CalendarDays, activity: Trophy };

function monthLabel(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("sv-SE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export default async function CalendarPage() {
  const d = today();
  const [{ goals, isParent }, events] = await Promise.all([loadFamilyData(), loadEvents(d)]);
  const months = new Map<string, FamilyEvent[]>();
  for (const e of events) {
    const key = e.start_date < d ? d.slice(0, 7) : e.start_date.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), e]);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Kalender" subtitle="Semestrar, händelser och aktiviteter." />

      {isParent && (
        <AddPanel title="Lägg till">
          <StatefulForm action={createEvent}>
            <div>
              <label className="label" htmlFor="kind">Typ</label>
              <select className="input" id="kind" name="kind" defaultValue="vacation">
                <option value="vacation">Semester / resa</option>
                <option value="event">Händelse</option>
                <option value="activity">Aktivitet</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="title">Namn</label>
              <input className="input" id="title" name="title" placeholder="Sommar i Toscana" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="start_date">Från</label>
                <input className="input" id="start_date" name="start_date" type="date" required />
              </div>
              <div>
                <label className="label" htmlFor="end_date">Till</label>
                <input className="input" id="end_date" name="end_date" type="date" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="location">Plats</label>
              <input className="input" id="location" name="location" />
            </div>
            <div>
              <label className="label" htmlFor="notes">Info (boende, bokningsnummer, tider)</label>
              <textarea className="input" id="notes" name="notes" rows={3} />
            </div>
            <div>
              <label className="label" htmlFor="checklist">Packlista / att göra, en per rad</label>
              <textarea className="input" id="checklist" name="checklist" rows={3} placeholder={"Pass\nBoka hundvakt\nLaddare"} />
            </div>
            <div>
              <label className="label" htmlFor="goal_id">Kopplat sparmål</label>
              <select className="input" id="goal_id" name="goal_id" defaultValue="">
                <option value="">Inget</option>
                {goals.filter((g) => !g.archived).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
            <SubmitButton>Spara</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}

      {events.length === 0 && <p className="card text-center text-muted">Inget inplanerat framåt.</p>}

      {[...months.entries()].map(([month, list]) => (
        <section key={month}>
          <h2 className="mb-2 text-sm font-semibold capitalize text-muted">{monthLabel(month)}</h2>
          <div className="space-y-2">
            {list.map((e) => {
              const Icon = ICONS[e.kind];
              const check = checklistProgress(e.checklist);
              return (
                <Link key={e.id} href={`/kalender/${e.id}`} className="card flex items-center gap-3">
                  <Icon className={e.kind === "vacation" ? "text-accent" : "text-muted"} size={24} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-semibold">{e.title}</p>
                      <p className="shrink-0 text-xs text-muted">{countdown(daysBetween(d, e.start_date))}</p>
                    </div>
                    <p className="flex items-center gap-1 text-sm text-muted">
                      {formatRange(e.start_date, e.end_date)}
                      {e.location && <><MapPin size={12} className="ml-1" />{e.location}</>}
                    </p>
                    {check.total > 0 && <ProgressBar size="sm" ratio={check.ratio} />}
                  </div>
                  <ChevronRight className="text-muted" size={18} />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
