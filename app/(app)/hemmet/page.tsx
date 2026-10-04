import Link from "next/link";
import {
  addProjectCost,
  createMaintenance,
  createProject,
  createTask,
  deleteMaintenance,
  deleteProject,
  markMaintenanceDone,
  setProjectStatus,
} from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { MaintenanceRow } from "@/components/MaintenanceRow";
import { OwnerPicker } from "@/components/OwnerPicker";
import { OwnerSelect } from "@/components/OwnerSelect";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { Empty, Section } from "@/components/Section";
import { TaskRow } from "@/components/TaskRow";
import { today } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { formatNumber } from "@/lib/format";
import { currentCompletion, maintenanceDue, taskProgress } from "@/lib/progress";
import { loadFamilyData } from "@/lib/queries";
import type { ProjectStatus } from "@/lib/types";

const STATUS: Record<ProjectStatus, string> = { ongoing: "Pågår", planned: "Planerat", idea: "Idé", done: "Klart" };
const ORDER: ProjectStatus[] = ["ongoing", "planned", "idea", "done"];

export default async function HousePage({ searchParams }: { searchParams: Promise<{ visa?: string; ny?: string }> }) {
  const { visa, ny } = await searchParams;
  const showMaint = visa === "underhall";
  const [{ profile, members, tasks, completions, projects, maintenance, isParent }, { t, date }] = await Promise.all([loadFamilyData(), getI18n()]);
  const byId = new Map(members.map((m) => [m.id, m]));
  const tab = (active: boolean) => `rounded-lg px-3.5 py-1.5 text-sm font-medium ${active ? "bg-card text-ink shadow-sm" : "text-muted"}`;
  const d = today();

  return (
    <>
      <PageHeader title={t("Hemmet")} />

      <div className="inline-flex gap-0.5 self-start rounded-xl bg-track p-[3px]">
        <Link href="/hemmet" className={tab(!showMaint)}>{t("Projekt")}</Link>
        <Link href="/hemmet?visa=underhall" className={tab(showMaint)}>{t("Underhåll")}</Link>
      </div>

      {!showMaint && (
        <>
          {projects.length === 0 && (
            <Section>
              <Empty>{t("Inga projekt än. Badrum, altan, måla om?")}</Empty>
            </Section>
          )}
          {[...projects].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status)).map((p) => {
            const steps = tasks.filter((t) => t.project_id === p.id);
            const sp = taskProgress(steps, completions);
            const budget = Number(p.budget ?? 0);
            const spent = Number(p.spent);
            const owner = p.owner ? byId.get(p.owner) : undefined;
            return (
              <section key={p.id} className={`group ${p.status === "done" ? "opacity-60" : ""}`}>
                <div className="space-y-3 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="min-w-0 text-lg font-semibold">{p.title}</h2>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === "ongoing" ? "bg-accent-soft text-accent" : "bg-track text-muted"}`}>
                      {t(STATUS[p.status])}
                    </span>
                  </div>
                  {steps.length > 0 && <ProgressBar ratio={sp.ratio} label={t("Steg")} detail={t("{done} av {total}", { done: sp.done, total: sp.total })} thin />}
                  {budget > 0 && (
                    <ProgressBar
                      ratio={spent / budget}
                      label={t("Kostnad")}
                      detail={t("{done} av {total} kr", { done: formatNumber(spent), total: formatNumber(budget) })}
                      over={spent > budget}
                      thin
                    />
                  )}
                  <p className="flex items-center gap-2 text-[13px] text-muted">
                    {owner ? <><Avatar name={owner.display_name} color={owner.color} size={18} /> {t("{name} ansvarar", { name: owner.display_name })}</> : <span className="text-warn">{t("Ingen ansvarig")}</span>}
                  </p>
                </div>
                {steps.map((t) => (
                  <TaskRow key={t.id} task={t} completion={currentCompletion(t, completions)} me={profile} assignee={t.assignee ? byId.get(t.assignee) : undefined} canDelete={isParent} plain />
                ))}
                {isParent && (
                  <details className="group/manage">
                    <summary className="cursor-pointer list-none py-3 text-sm text-muted">{t("Hantera")}</summary>
                    <div className="space-y-3 pb-4">
                      <StatefulForm action={createTask} className="flex flex-wrap gap-2" quiet>
                        <input type="hidden" name="project_id" value={p.id} />
                        <input type="hidden" name="recurrence" value="none" />
                        <input className="input w-auto min-w-0 flex-1 py-2 text-sm" name="title" placeholder={t("Nytt steg")} aria-label={t("Nytt steg")} required />
                        <SubmitButton className="btn-ghost shrink-0">{t("Lägg till")}</SubmitButton>
                      </StatefulForm>
                      <form action={addProjectCost} className="flex gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input className="input py-2 text-sm" name="amount" inputMode="decimal" placeholder="+ kr" aria-label={t("Lägg till kostnad")} />
                        <button className="btn-ghost shrink-0">{t("Kostnad")}</button>
                      </form>
                      <div className="flex flex-wrap items-center gap-2">
                        <OwnerPicker table="projects" id={p.id} owner={p.owner} members={members} />
                        {ORDER.filter((s) => s !== p.status).map((s) => (
                          <form key={s} action={setProjectStatus}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="status" value={s} />
                            <button className="btn-ghost py-1">{t(STATUS[s])}</button>
                          </form>
                        ))}
                        <form action={deleteProject} className="ml-auto">
                          <input type="hidden" name="id" value={p.id} />
                          <button className="py-1 text-sm text-warn">{t("Ta bort")}</button>
                        </form>
                      </div>
                    </div>
                  </details>
                )}
              </section>
            );
          })}

          {isParent && (
            <AddPanel title={t("Nytt projekt")} open={ny === "1"}>
              <StatefulForm action={createProject}>
                <div>
                  <label className="label" htmlFor="ptitle">{t("Vad?")}</label>
                  <input className="input" id="ptitle" name="title" placeholder={t("Nytt badrum")} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="budget">{t("Budget (kr)")}</label>
                    <input className="input" id="budget" name="budget" inputMode="decimal" />
                  </div>
                  <div>
                    <label className="label" htmlFor="status">{t("Status")}</label>
                    <select className="input" id="status" name="status" defaultValue="planned">
                      {ORDER.map((s) => <option key={s} value={s}>{t(STATUS[s])}</option>)}
                    </select>
                  </div>
                </div>
                <OwnerSelect members={members} />
                <SubmitButton>{t("Skapa projekt")}</SubmitButton>
              </StatefulForm>
            </AddPanel>
          )}
        </>
      )}

      {showMaint && (
        <>
          <Section>
            {maintenance.length === 0 && <Empty>{t("Inget underhåll inlagt. Filter, takrännor, bilservice?")}</Empty>}
            {maintenance
              .map((m) => ({ m, due: maintenanceDue(m, d) }))
              .sort((a, b) => a.due - b.due)
              .map(({ m, due }) => {
                const owner = m.owner ? byId.get(m.owner) : undefined;
                return (
                  <details key={m.id} className="group/item">
                    <summary className="cursor-pointer list-none">
                      <MaintenanceRow item={m} d={due}>
                        {owner ? <Avatar name={owner.display_name} color={owner.color} size={22} /> : <span className="text-xs text-warn">{t("Ingen")}</span>}
                      </MaintenanceRow>
                    </summary>
                    <div className="flex flex-wrap items-center gap-2 pb-4">
                      <span className="w-full text-[13px] text-muted">
                        {m.last_done ? t("Var {n}:e dag, senast {date}", { n: m.interval_days, date: date(m.last_done) }) : t("Var {n}:e dag, aldrig gjort", { n: m.interval_days })}
                      </span>
                      {isParent ? (
                        <>
                          <form action={markMaintenanceDone}>
                            <input type="hidden" name="id" value={m.id} />
                            <button className="btn py-1.5 text-sm">{t("Gjort idag")}</button>
                          </form>
                          <OwnerPicker table="maintenance_items" id={m.id} owner={m.owner} members={members} />
                          <form action={deleteMaintenance} className="ml-auto">
                            <input type="hidden" name="id" value={m.id} />
                            <button className="py-1 text-sm text-warn">{t("Ta bort")}</button>
                          </form>
                        </>
                      ) : (
                        <span className="text-[13px] text-muted">{t("Säg till en vuxen när det är gjort.")}</span>
                      )}
                    </div>
                  </details>
                );
              })}
          </Section>

          {isParent && (
            <AddPanel title={t("Nytt underhåll")} open={ny === "1"}>
              <StatefulForm action={createMaintenance}>
                <div>
                  <label className="label" htmlFor="mtitle">{t("Vad?")}</label>
                  <input className="input" id="mtitle" name="title" placeholder={t("Byta filter i ventilationen")} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="interval_days">{t("Var x:e dag")}</label>
                    <input className="input" id="interval_days" name="interval_days" inputMode="numeric" placeholder="180" required />
                  </div>
                  <div>
                    <label className="label" htmlFor="last_done">{t("Senast gjort")}</label>
                    <input className="input" id="last_done" name="last_done" type="date" />
                  </div>
                </div>
                <OwnerSelect members={members} />
                <SubmitButton>{t("Lägg till")}</SubmitButton>
              </StatefulForm>
            </AddPanel>
          )}
        </>
      )}
    </>
  );
}
