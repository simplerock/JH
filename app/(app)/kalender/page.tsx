import Link from "next/link";
import { createEvent } from "@/app/actions";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { PageHeader } from "@/components/PageHeader";
import { Empty, Section } from "@/components/Section";
import { daysBetween, formatRange, today } from "@/lib/dates";
import { countdown } from "@/lib/format";
import { loadEvents, loadFamilyData } from "@/lib/queries";
import type { FamilyEvent } from "@/lib/types";

const KIND = { vacation: "Semester", event: "Händelse", activity: "Aktivitet" };

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
    <>
      <PageHeader title="Kalender" back={{ href: "/mer", label: "Mer" }} />

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

      {events.length === 0 && (
        <Section>
          <Empty>Inget inplanerat framåt.</Empty>
        </Section>
      )}

      {[...months.entries()].map(([month, list]) => (
        <Section key={month} title={monthLabel(month)}>
          {list.map((e) => (
            <Link key={e.id} href={`/kalender/${e.id}`} className="flex min-h-14 items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.title}</p>
                <p className="text-[13px] text-muted">{KIND[e.kind]} · {formatRange(e.start_date, e.end_date)}{e.location ? ` · ${e.location}` : ""}</p>
              </div>
              <span className="shrink-0 text-sm text-muted">{countdown(daysBetween(d, e.start_date))}</span>
            </Link>
          ))}
        </Section>
      ))}
    </>
  );
}
