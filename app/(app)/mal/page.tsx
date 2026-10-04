import { createGoal } from "@/app/actions";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { GoalCard } from "@/components/GoalCard";
import { PageHeader } from "@/components/PageHeader";
import { TaskRow } from "@/components/TaskRow";
import { GoalKindFields } from "./GoalKindFields";
import { goalProgress, isDone } from "@/lib/progress";
import { loadFamilyData } from "@/lib/queries";

const CATEGORIES = ["Ekonomi", "Hem", "Renovering", "Semester", "Hälsa", "Barnen", "Övrigt"];

export default async function GoalsPage() {
  const { profile, members, goals, tasks, completions, isParent } = await loadFamilyData();
  const byId = new Map(members.map((m) => [m.id, m]));
  const linked = (goalId: string) => {
    const list = tasks.filter((t) => t.goal_id === goalId);
    if (list.length === 0) return null;
    return (
      <ul className="mt-2 divide-y divide-line">
        {list.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            done={isDone(t, completions)}
            assignee={t.assignee ? byId.get(t.assignee) : undefined}
            canToggle={isParent || !t.assignee || t.assignee === profile.id}
          />
        ))}
      </ul>
    );
  };
  const active = goals.filter((g) => !g.archived);
  const archived = goals.filter((g) => g.archived);

  return (
    <div className="space-y-4">
      <PageHeader title="Mål" subtitle="Det här jobbar vi mot." />

      {isParent && (
        <AddPanel title="Nytt mål">
          <StatefulForm action={createGoal}>
            <div>
              <label className="label" htmlFor="title">Vad vill ni uppnå?</label>
              <input className="input" id="title" name="title" placeholder="Spara till Italienresan" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="category">Kategori</label>
                <select className="input" id="category" name="category">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="due_date">Deadline</label>
                <input className="input" id="due_date" name="due_date" type="date" />
              </div>
            </div>
            <GoalKindFields />
            <div>
              <label className="label" htmlFor="description">Varför? (valfritt)</label>
              <textarea className="input" id="description" name="description" rows={2} />
            </div>
            <SubmitButton>Skapa mål</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}

      {active.length === 0 && (
        <p className="card text-center text-muted">Inga mål än. {isParent ? "Skapa det första ovan." : "Fråga en vuxen."}</p>
      )}
      {active.map((g) => (
        <GoalCard key={g.id} goal={g} progress={goalProgress(g, tasks, completions)} isParent={isParent}>
          {linked(g.id)}
        </GoalCard>
      ))}

      {archived.length > 0 && (
        <details className="pt-2">
          <summary className="cursor-pointer text-sm font-medium text-muted">Arkiverade ({archived.length})</summary>
          <div className="mt-3 space-y-3 opacity-70">
            {archived.map((g) => (
              <GoalCard key={g.id} goal={g} progress={goalProgress(g, tasks, completions)} isParent={isParent} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
