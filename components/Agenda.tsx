import Link from "next/link";
import type { AgendaItem, RangeKey } from "@/lib/agenda";
import { RANGE_ORDER, RANGES } from "@/lib/agenda";
import { addDays } from "@/lib/dates";
import type { I18n } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import type { Profile } from "@/lib/types";
import { Avatar } from "./Avatar";

const KIND: Record<AgendaItem["kind"], string> = {
  trip: "Resa",
  event: "Händelse",
  activity: "Aktivitet",
  task: "Att göra",
  maintenance: "Underhåll",
  goal: "Mål",
  project: "Projekt",
};

function dayLabel(day: string, today: string, { t, locale }: I18n) {
  if (day === today) return t("Idag");
  if (day === addDays(today, 1)) return t("Imorgon");
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Filterknappar: den här veckan, nästa vecka, 30 dagar, 3 månader. */
export async function RangeChips({ active, base }: { active: RangeKey; base: string }) {
  const { t } = await getI18n();
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={t("Visa")}>
      {RANGE_ORDER.map((k) => (
        <Link
          key={k}
          href={`${base}?visa=${k}`}
          scroll={false}
          aria-current={active === k ? "true" : undefined}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${active === k ? "bg-ink text-bg" : "bg-track text-muted"}`}
        >
          {t(RANGES[k].label)}
        </Link>
      ))}
    </div>
  );
}

/** Agendan dag för dag. */
export async function Agenda({ days, today, members, empty }: { days: Map<string, AgendaItem[]>; today: string; members: Profile[]; empty: string }) {
  const i18n = await getI18n();
  const { t } = i18n;
  const byId = new Map(members.map((m) => [m.id, m]));
  if (days.size === 0) return <p className="rounded-2xl bg-card px-4 py-4 text-muted">{empty}</p>;
  return (
    <div className="flex flex-col gap-4">
      {[...days.entries()].map(([day, items]) => (
        <section key={day}>
          <h3 className={`mb-1.5 px-1 text-[13px] font-semibold capitalize ${day === today ? "text-accent" : "text-muted"}`}>{dayLabel(day, today, i18n)}</h3>
          <div className="group">
            {items.map((i) => {
              const owner = i.owner ? byId.get(i.owner) : undefined;
              const late = i.kind === "maintenance" && i.date === today;
              return (
                <Link key={i.key} href={i.href} className="flex min-h-13 items-center gap-3 py-3">
                  <span
                    className={`h-8 w-1 shrink-0 rounded-full ${i.kind === "trip" ? "bg-accent" : i.kind === "maintenance" || i.kind === "goal" ? "bg-wait" : i.kind === "task" ? "bg-line" : "bg-ink/40"}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.title}</p>
                    <p className={`text-[13px] ${late ? "text-warn" : "text-muted"}`}>
                      {t(KIND[i.kind])}
                      {i.end ? ` · ${t("till {date}", { date: i18n.date(i.end) })}` : ""}
                      {late ? ` · ${t("dags nu")}` : ""}
                    </p>
                  </div>
                  {owner && <Avatar name={owner.display_name} color={owner.color} size={22} />}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
