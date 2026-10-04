import { createEvent } from "@/app/actions";
import { Agenda, RangeChips } from "@/components/Agenda";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { OwnerSelect } from "@/components/OwnerSelect";
import { PageHeader } from "@/components/PageHeader";
import { byDay, inRange, rangeDates, RANGES, type RangeKey } from "@/lib/agenda";
import { today, weekStart } from "@/lib/dates";
import { loadAgenda } from "@/lib/queries";
import { CalendarFeed } from "./CalendarFeed";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ visa?: string; ny?: string }> }) {
  const { visa, ny } = await searchParams;
  const range: RangeKey = visa && visa in RANGES ? (visa as RangeKey) : "30";
  const d = today();
  const { goals, isParent, members, agenda, family } = await loadAgenda();
  const [from, to] = rangeDates(range, d, weekStart(d));
  const days = byDay(inRange(agenda, from, to, d), from);

  return (
    <>
      <PageHeader title="Kalender" back={{ href: "/mer", label: "Mer" }} />
      <RangeChips active={range} base="/kalender" />
      <Agenda days={days} today={d} members={members} empty="Inget inplanerat under den här perioden." />

      {isParent && (
        <AddPanel title="Lägg till" open={ny === "1"}>
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
            <OwnerSelect members={members.filter((m) => m.role === "parent")} label="Planerar" />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="template" defaultChecked className="mt-0.5 size-5 accent-[var(--accent)]" />
              <span>
                <span className="font-medium">Lägg till uppgifter inför resan</span>
                <span className="block text-muted">Boka, pass, försäkring, pengar och packa egen väska för varje barn. Bara för resor.</span>
              </span>
            </label>
            <SubmitButton>Spara</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}

      {isParent && <CalendarFeed token={family.calendar_token} />}

    </>
  );
}
