import { X } from "lucide-react";
import { deleteLevel, saveLevel } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { ScoreCard } from "@/components/ScoreCard";
import { Empty, Section } from "@/components/Section";
import { addDays, daysBetween, today, weekStart } from "@/lib/dates";
import { levelFor } from "@/lib/progress";
import { loadFamilyData } from "@/lib/queries";
import { kidWeek } from "@/lib/score";

export default async function PointsPage() {
  const { profile, members, tasks, completions, levels, weekFrom, isParent } = await loadFamilyData();
  const d = today();
  const kids = members.filter((m) => m.role === "child");
  const top = Math.max(...levels.map((l) => l.min_points), 1);
  const lowestMin = [...levels].sort((a, b) => a.min_points - b.min_points)[1]?.min_points;
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const pendingFor = (id: string) =>
    completions.filter((c) => c.completed_by === id && c.status === "pending").reduce((s, c) => s + (taskById.get(c.task_id)?.points ?? 0), 0);

  return (
    <>
      <PageHeader title="Poäng och förmåner" back={{ href: "/mer", label: "Mer" }} />

      {isParent ? (
        <Section title="Den här veckan">
          {kids.length === 0 && <Empty>Inga barn i familjen än.</Empty>}
          {kids.map((k) => {
            const pts = kidWeek(k.id, tasks, completions, weekFrom).points;
            const { level, lowest } = levelFor(pts, levels);
            return (
              <div key={k.id} className="flex items-center gap-3 py-4">
                <Avatar name={k.display_name} color={k.color} size={28} />
                <div className="flex-1">
                  <ProgressBar ratio={pts / top} label={k.display_name} detail={`${pts} p${level ? ` · ${level.name}` : ""}`} over={lowest} />
                </div>
              </div>
            );
          })}
        </Section>
      ) : (
        <ScoreCard
          week={kidWeek(profile.id, tasks, completions, weekFrom)}
          pendingPoints={pendingFor(profile.id)}
          levels={levels}
          daysLeft={daysBetween(d, addDays(weekStart(d), 6))}
        />
      )}

      <Section title="Nivåer">
        {levels.length === 0 && <Empty>Inga nivåer än.</Empty>}
        {levels.map((l) =>
          isParent ? (
            <details key={l.id}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{l.name} · {l.min_points > 0 ? `${l.min_points}+ p` : lowestMin ? `under ${lowestMin} p` : "0 p"}</p>
                  <p className="text-[13px] text-muted">{l.reward}</p>
                </div>
              </summary>
              <div className="pb-4">
                <StatefulForm action={saveLevel} resetOnOk={false}>
                  <input type="hidden" name="id" value={l.id} />
                  <div className="grid grid-cols-[1fr_6rem] gap-3">
                    <input className="input" name="name" defaultValue={l.name} aria-label="Namn" required />
                    <input className="input" name="min_points" defaultValue={l.min_points} inputMode="numeric" aria-label="Från poäng" required />
                  </div>
                  <input className="input" name="reward" defaultValue={l.reward} aria-label="Förmån" required />
                  <div className="flex items-center justify-between">
                    <SubmitButton className="btn-ghost">Spara</SubmitButton>
                    <button form={`del-${l.id}`} className="flex items-center gap-1 text-sm text-warn"><X size={14} /> Ta bort</button>
                  </div>
                </StatefulForm>
                <form id={`del-${l.id}`} action={deleteLevel}>
                  <input type="hidden" name="id" value={l.id} />
                </form>
              </div>
            </details>
          ) : (
            <div key={l.id} className="py-3">
              <p className="font-medium">{l.name} · {l.min_points > 0 ? `${l.min_points}+ p` : lowestMin ? `under ${lowestMin} p` : "0 p"}</p>
              <p className="text-[13px] text-muted">{l.reward}</p>
            </div>
          ),
        )}
      </Section>

      {isParent && (
        <AddPanel title="Ny nivå">
          <StatefulForm action={saveLevel}>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <div>
                <label className="label" htmlFor="lname">Namn</label>
                <input className="input" id="lname" name="name" placeholder="Platina" required />
              </div>
              <div>
                <label className="label" htmlFor="lmin">Från poäng</label>
                <input className="input" id="lmin" name="min_points" inputMode="numeric" required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="lreward">Förmån</label>
              <input className="input" id="lreward" name="reward" placeholder="Väljer helgutflykt" required />
            </div>
            <SubmitButton>Lägg till</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}

      <Section title="Så funkar det">
        <ol className="list-decimal space-y-2 py-4 pl-5 marker:text-muted">
          <li>Gör sysslan ordentligt.</li>
          <li>Tryck på cirkeln. Har sysslan en kamera tar du ett foto.</li>
          <li>Mamma eller pappa godkänner. Först då räknas poängen.</li>
          <li>Är det inte klart blir det gör om, utan poäng.</li>
          <li>Poängen börjar om på måndag. På söndag kväll får du förmånen för din nivå.</li>
        </ol>
      </Section>
    </>
  );
}
