import Link from "next/link";
import { createTask } from "@/app/actions";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { TaskRow } from "@/components/TaskRow";
import { isoWeek, recurrenceLabel, today } from "@/lib/dates";
import { isDone, taskProgress } from "@/lib/progress";
import { loadFamilyData } from "@/lib/queries";
import type { Recurrence } from "@/lib/types";

const GROUPS: { key: Recurrence; title: string }[] = [
  { key: "daily", title: "Idag" },
  { key: "weekly", title: "Den här veckan" },
  { key: "monthly", title: "Den här månaden" },
  { key: "none", title: "Enstaka uppgifter" },
];

const AREAS = ["Kök", "Badrum", "Vardagsrum", "Sovrum", "Tvätt", "Ute", "Bil", "Övrigt"];

export default async function RoutinesPage({ searchParams }: { searchParams: Promise<{ vem?: string }> }) {
  const { vem } = await searchParams;
  const { profile, members, goals, tasks, completions, isParent } = await loadFamilyData();
  const byId = new Map(members.map((m) => [m.id, m]));
  const onlyMine = vem === "mina";
  const visible = onlyMine ? tasks.filter((t) => t.assignee === profile.id || !t.assignee) : tasks;
  const canToggle = (assignee: string | null) => isParent || !assignee || assignee === profile.id;
  const tab = (active: boolean) => `flex-1 rounded-lg py-1.5 text-center text-sm font-semibold ${active ? "bg-card shadow-sm" : "text-muted"}`;

  return (
    <div className="space-y-4">
      <PageHeader title="Rutiner" subtitle={`Vecka ${isoWeek(today()).slice(-2)}. Bocka av när det är gjort.`} />

      <div className="flex gap-1 rounded-xl bg-track p-1">
        <Link href="/rutiner" className={tab(!onlyMine)}>Alla</Link>
        <Link href="/rutiner?vem=mina" className={tab(onlyMine)}>Mina</Link>
      </div>

      {GROUPS.map(({ key, title }) => {
        const list = visible.filter((t) => t.recurrence === key);
        if (list.length === 0) return null;
        const p = taskProgress(list, completions);
        const sorted = [...list].sort((a, b) => (a.area ?? "").localeCompare(b.area ?? "", "sv"));
        return (
          <section key={key} className="card">
            <h2 className="mb-2 font-semibold">{title}</h2>
            <ProgressBar ratio={p.ratio} size="sm" detail={`${p.done} av ${p.total}`} />
            <ul className="mt-1 divide-y divide-line">
              {sorted.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  done={isDone(t, completions)}
                  assignee={t.assignee ? byId.get(t.assignee) : undefined}
                  canToggle={canToggle(t.assignee)}
                  canDelete={isParent}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {visible.length === 0 && <p className="card text-center text-muted">Inga sysslor här än.</p>}

      {isParent && (
        <AddPanel title="Ny syssla">
          <StatefulForm action={createTask}>
            <div>
              <label className="label" htmlFor="title">Vad ska göras?</label>
              <input className="input" id="title" name="title" placeholder="Dammsuga hallen" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="recurrence">Hur ofta</label>
                <select className="input" id="recurrence" name="recurrence" defaultValue="weekly">
                  {(Object.keys(recurrenceLabel) as Recurrence[]).map((r) => (
                    <option key={r} value={r}>{recurrenceLabel[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="area">Rum / område</label>
                <input className="input" id="area" name="area" list="areas" placeholder="Kök" />
                <datalist id="areas">{AREAS.map((a) => <option key={a} value={a} />)}</datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="assignee">Vem</label>
                <select className="input" id="assignee" name="assignee" defaultValue="">
                  <option value="">Vem som helst</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="goal_id">Del av mål</label>
                <select className="input" id="goal_id" name="goal_id" defaultValue="">
                  <option value="">Inget</option>
                  {goals.filter((g) => !g.archived && g.kind === "tasks").map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <SubmitButton>Lägg till</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}
    </div>
  );
}
