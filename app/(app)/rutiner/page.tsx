import Link from "next/link";
import { createTask } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { FreeChores, freeChores } from "@/components/FreeChores";
import { Empty, Section } from "@/components/Section";
import { TaskRow } from "@/components/TaskRow";
import { isoWeek, recurrenceLabel, today } from "@/lib/dates";
import { currentCompletion, isDone, taskProgress } from "@/lib/progress";
import { loadFamilyData } from "@/lib/queries";
import type { Recurrence } from "@/lib/types";

const GROUPS: { key: Recurrence; title: string }[] = [
  { key: "daily", title: "Idag" },
  { key: "weekly", title: `Vecka ${Number(isoWeek(today()).slice(-2))}` },
  { key: "monthly", title: "Den här månaden" },
  { key: "none", title: "En gång" },
];

const AREAS = ["Kök", "Badrum", "Vardagsrum", "Sovrum", "Tvätt", "Ute", "Bil", "Övrigt"];

export default async function RoutinesPage({ searchParams }: { searchParams: Promise<{ vem?: string; ny?: string }> }) {
  const { vem, ny } = await searchParams;
  const { profile, members, goals, tasks, completions, isParent } = await loadFamilyData();
  const byId = new Map(members.map((m) => [m.id, m]));
  const routines = tasks.filter((t) => !t.project_id);
  const showAll = vem === "alla";
  // Barn ser lediga sysslor separat och väljer dem. Vuxna ser dem bland sina egna.
  const visible = showAll ? routines : routines.filter((t) => t.assignee === profile.id || (!t.assignee && isParent));
  const free = isParent || showAll ? [] : freeChores(routines);
  const tab = (active: boolean) => `rounded-lg px-3.5 py-1.5 text-sm font-medium ${active ? "bg-card text-ink shadow-sm" : "text-muted"}`;
  const recurring = routines.filter((t) => t.recurrence !== "none");

  return (
    <>
      <PageHeader title="Rutiner" />

      <div className="inline-flex gap-0.5 self-start rounded-xl bg-track p-[3px]">
        <Link href="/rutiner" className={tab(!showAll)}>Mina</Link>
        <Link href="/rutiner?vem=alla" className={tab(showAll)}>Alla</Link>
      </div>

      <FreeChores tasks={free} />

      {GROUPS.map(({ key, title }) => {
        const list = visible.filter((t) => t.recurrence === key && !(key === "none" && isDone(t, completions) && !showAll));
        if (list.length === 0) return null;
        const p = taskProgress(list, completions);
        return (
          <Section key={key} title={title} aside={`${p.done} av ${p.total}`}>
            {list.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                completion={currentCompletion(t, completions)}
                me={profile}
                assignee={t.assignee ? byId.get(t.assignee) : undefined}
                showAssignee={showAll}
                canDelete={isParent && showAll}
              />
            ))}
          </Section>
        );
      })}

      {visible.length === 0 && free.length === 0 && (
        <Section>
          <Empty>Inga sysslor här.</Empty>
        </Section>
      )}

      {members.length > 1 && recurring.length > 0 && (
        <Section title="Hela familjen">
          {members.map((m) => {
            const theirs = recurring.filter((t) => t.assignee === m.id);
            if (theirs.length === 0) return null;
            const p = taskProgress(theirs, completions);
            return (
              <div key={m.id} className="flex items-center gap-3 py-3.5">
                <Avatar name={m.display_name} color={m.color} size={22} />
                <div className="flex-1">
                  <ProgressBar ratio={p.ratio} label={m.display_name} detail={`${p.done} av ${p.total}`} thin />
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {isParent && (
        <AddPanel title="Ny syssla" open={ny === "1"}>
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
                <label className="label" htmlFor="area">Rum</label>
                <input className="input" id="area" name="area" list="areas" placeholder="Kök" />
                <datalist id="areas">{AREAS.map((a) => <option key={a} value={a} />)}</datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="assignee">Vem</label>
                <select className="input" id="assignee" name="assignee" defaultValue="">
                  <option value="">Ledig, barnen väljer</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="goal_id">Steg i mål</label>
                <select className="input" id="goal_id" name="goal_id" defaultValue="">
                  <option value="">Inget</option>
                  {goals.filter((g) => !g.archived && g.kind === "tasks").map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <div>
                <label className="label" htmlFor="points">Poäng (barn)</label>
                <input className="input" id="points" name="points" inputMode="numeric" defaultValue="2" />
              </div>
              <label className="flex items-center gap-2 py-2.5 text-sm">
                <input type="checkbox" name="requires_photo" className="size-5 accent-[var(--accent)]" />
                Kräver foto
              </label>
            </div>
            <SubmitButton>Lägg till</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}
    </>
  );
}
