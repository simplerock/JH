import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import { deleteExtraPoints, deleteLevel, giveExtraPoints, saveLevel } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { ScoreCard } from "@/components/ScoreCard";
import { Empty, Section } from "@/components/Section";
import { addDays, daysBetween, today, weekStart } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { levelFor } from "@/lib/progress";
import { loadFamilyData } from "@/lib/queries";
import { kidWeek } from "@/lib/score";

export default async function PointsPage() {
  const [{ profile, members, tasks, completions, levels, adjustments, weekFrom, isParent }, { t, date }] = await Promise.all([loadFamilyData(), getI18n()]);
  const range = (min: number) => (min > 0 ? `${min}+ p` : lowestMin ? t("under {n} p", { n: lowestMin }) : "0 p");
  const d = today();
  const kids = members.filter((m) => m.role === "child");
  const top = Math.max(...levels.map((l) => l.min_points), 1);
  const lowestMin = [...levels].sort((a, b) => a.min_points - b.min_points)[1]?.min_points;
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const nameOf = new Map(members.map((m) => [m.id, m.display_name]));
  const thisWeek = adjustments.filter((a) => a.created_at >= weekFrom && (isParent || a.kid_id === profile.id));
  const pendingFor = (id: string) =>
    completions.filter((c) => c.completed_by === id && c.status === "pending").reduce((s, c) => s + (taskById.get(c.task_id)?.points ?? 0), 0);

  return (
    <>
      <PageHeader title={t("Poäng och förmåner")} back={{ href: "/mer", label: t("Mer") }} />

      {isParent ? (
        <Section title={t("Den här veckan")}>
          {kids.length === 0 && <Empty>{t("Inga barn i familjen än.")}</Empty>}
          {kids.map((k) => {
            const pts = kidWeek(k.id, tasks, completions, weekFrom, { adjustments }).points;
            const { level, lowest } = levelFor(pts, levels);
            return (
              <Link key={k.id} href={`/barn/${k.id}`} className="flex items-center gap-3 py-4">
                <Avatar name={k.display_name} color={k.color} size={28} />
                <div className="flex-1">
                  <ProgressBar ratio={pts / top} label={k.display_name} detail={`${pts} p${level ? ` · ${t(level.name)}` : ""}`} over={lowest} />
                </div>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            );
          })}
        </Section>
      ) : (
        <ScoreCard
          week={kidWeek(profile.id, tasks, completions, weekFrom, { adjustments })}
          pendingPoints={pendingFor(profile.id)}
          levels={levels}
          daysLeft={daysBetween(d, addDays(weekStart(d), 6))}
        />
      )}

      {(isParent || thisWeek.length > 0) && (
        <Section title={t("Extra poäng")}>
          {thisWeek.length === 0 && <Empty>{t("Inga extra poäng den här veckan.")}</Empty>}
          {thisWeek.map((a) => (
            <div key={a.id} className="flex min-h-12 items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.reason}</p>
                <p className="text-[13px] text-muted">
                  {[isParent && nameOf.get(a.kid_id), a.created_by && t("från {name}", { name: nameOf.get(a.created_by) ?? t("förälder") }), date(today(new Date(a.created_at)))].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className={`font-semibold tabular-nums ${a.points < 0 ? "text-warn" : "text-accent"}`}>{a.points > 0 ? `+${a.points}` : a.points} p</span>
              {isParent && (
                <ConfirmDelete action={deleteExtraPoints} id={a.id} label={t("Ta bort extra poäng")} />
              )}
            </div>
          ))}
        </Section>
      )}

      {isParent && kids.length > 0 && (
        <AddPanel title={t("Ge extra poäng")}>
          <StatefulForm action={giveExtraPoints}>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <div>
                <label className="label" htmlFor="xkid">{t("Till")}</label>
                <select className="input" id="xkid" name="kid_id">
                  {kids.map((k) => <option key={k.id} value={k.id}>{k.display_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="xpoints">{t("Poäng")}</label>
                <input className="input" id="xpoints" name="points" inputMode="numeric" placeholder="5" required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="xreason">{t("Varför")}</label>
              <input className="input" id="xreason" name="reason" placeholder={t("Hjälpte till med middagen utan att bli tillfrågad")} required />
            </div>
            <p className="text-[13px] text-muted">{t("Skriv minus för avdrag, till exempel -5.")}</p>
            <SubmitButton>{t("Ge poäng")}</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}

      <Section title={t("Nivåer")}>
        {levels.length === 0 && <Empty>{t("Inga nivåer än.")}</Empty>}
        {levels.map((l) =>
          isParent ? (
            <details key={l.id}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t(l.name)} · {range(l.min_points)}</p>
                  <p className="text-[13px] text-muted">{t(l.reward)}</p>
                </div>
              </summary>
              <div className="pb-4">
                <StatefulForm action={saveLevel} resetOnOk={false}>
                  <input type="hidden" name="id" value={l.id} />
                  <div className="grid grid-cols-[1fr_6rem] gap-3">
                    <input className="input" name="name" defaultValue={l.name} aria-label={t("Namn")} required />
                    <input className="input" name="min_points" defaultValue={l.min_points} inputMode="numeric" aria-label={t("Från poäng")} required />
                  </div>
                  <input className="input" name="reward" defaultValue={l.reward} aria-label={t("Förmån")} required />
                  <div className="flex items-center justify-between">
                    <SubmitButton className="btn-ghost">{t("Spara")}</SubmitButton>
                    <button form={`del-${l.id}`} className="flex items-center gap-1 text-sm text-warn"><X size={14} /> {t("Ta bort")}</button>
                  </div>
                </StatefulForm>
                <form id={`del-${l.id}`} action={deleteLevel}>
                  <input type="hidden" name="id" value={l.id} />
                </form>
              </div>
            </details>
          ) : (
            <div key={l.id} className="py-3">
              <p className="font-medium">{t(l.name)} · {range(l.min_points)}</p>
              <p className="text-[13px] text-muted">{t(l.reward)}</p>
            </div>
          ),
        )}
      </Section>

      {isParent && (
        <AddPanel title={t("Ny nivå")}>
          <StatefulForm action={saveLevel}>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <div>
                <label className="label" htmlFor="lname">{t("Namn")}</label>
                <input className="input" id="lname" name="name" placeholder="Platina" required />
              </div>
              <div>
                <label className="label" htmlFor="lmin">{t("Från poäng")}</label>
                <input className="input" id="lmin" name="min_points" inputMode="numeric" required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="lreward">{t("Förmån")}</label>
              <input className="input" id="lreward" name="reward" placeholder={t("Väljer helgutflykt")} required />
            </div>
            <SubmitButton>{t("Lägg till")}</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}

      <Section title={t("Så funkar det")}>
        <ol className="list-decimal space-y-2 py-4 pl-5 marker:text-muted">
          <li>{t("Gör sysslan ordentligt.")}</li>
          <li>{t("Tryck på cirkeln. Har sysslan en kamera tar du ett foto.")}</li>
          <li>{t("Mamma eller pappa godkänner. Först då räknas poängen.")}</li>
          <li>{t("Är det inte klart blir det gör om, utan poäng.")}</li>
          <li>{t("Mamma och pappa kan ge extra poäng när du gör något bra utan att bli tillfrågad.")}</li>
          <li>{t("Poängen börjar om på måndag. På söndag kväll får du förmånen för din nivå.")}</li>
        </ol>
      </Section>
    </>
  );
}
