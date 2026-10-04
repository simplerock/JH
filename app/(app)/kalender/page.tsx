import { createEvent } from "@/app/actions";
import { Agenda, RangeChips } from "@/components/Agenda";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { OwnerSelect } from "@/components/OwnerSelect";
import { PageHeader } from "@/components/PageHeader";
import { byDay, inRange, rangeDates, RANGES, type RangeKey } from "@/lib/agenda";
import { today, weekStart } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { loadAgenda } from "@/lib/queries";
import { CalendarFeed } from "./CalendarFeed";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ visa?: string; ny?: string }> }) {
  const { visa, ny } = await searchParams;
  const range: RangeKey = visa && visa in RANGES ? (visa as RangeKey) : "30";
  const d = today();
  const [{ goals, isParent, members, agenda, family }, { t }] = await Promise.all([loadAgenda(), getI18n()]);
  const [from, to] = rangeDates(range, d, weekStart(d));
  const days = byDay(inRange(agenda, from, to, d), from);

  return (
    <>
      <PageHeader title={t("Kalender")} back={{ href: "/mer", label: t("Mer") }} />
      <RangeChips active={range} base="/kalender" />
      <Agenda days={days} today={d} members={members} empty={t("Inget inplanerat under den här perioden.")} />

      {isParent && (
        <AddPanel title={t("Lägg till")} open={ny === "1"}>
          <StatefulForm action={createEvent}>
            <div>
              <label className="label" htmlFor="kind">{t("Typ")}</label>
              <select className="input" id="kind" name="kind" defaultValue="vacation">
                <option value="vacation">{t("Semester / resa")}</option>
                <option value="event">{t("Händelse")}</option>
                <option value="activity">{t("Aktivitet")}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="title">{t("Namn")}</label>
              <input className="input" id="title" name="title" placeholder={t("Sommar i Toscana")} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="start_date">{t("Från")}</label>
                <input className="input" id="start_date" name="start_date" type="date" required />
              </div>
              <div>
                <label className="label" htmlFor="end_date">{t("Till")}</label>
                <input className="input" id="end_date" name="end_date" type="date" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="location">{t("Plats")}</label>
              <input className="input" id="location" name="location" />
            </div>
            <div>
              <label className="label" htmlFor="notes">{t("Info (boende, bokningsnummer, tider)")}</label>
              <textarea className="input" id="notes" name="notes" rows={3} />
            </div>
            <div>
              <label className="label" htmlFor="checklist">{t("Packlista / att göra, en per rad")}</label>
              <textarea className="input" id="checklist" name="checklist" rows={3} placeholder={t("Pass\nBoka hundvakt\nLaddare")} />
            </div>
            <div>
              <label className="label" htmlFor="goal_id">{t("Kopplat sparmål")}</label>
              <select className="input" id="goal_id" name="goal_id" defaultValue="">
                <option value="">{t("Inget")}</option>
                {goals.filter((g) => !g.archived).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
            <OwnerSelect members={members.filter((m) => m.role === "parent")} label={t("Planerar")} />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="template" defaultChecked className="mt-0.5 size-5 accent-[var(--accent)]" />
              <span>
                <span className="font-medium">{t("Lägg till uppgifter inför resan")}</span>
                <span className="block text-muted">{t("Boka, pass, försäkring, pengar och packa egen väska för varje barn. Bara för resor.")}</span>
              </span>
            </label>
            <SubmitButton>{t("Spara")}</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}

      {isParent && <CalendarFeed token={family.calendar_token} />}

    </>
  );
}
