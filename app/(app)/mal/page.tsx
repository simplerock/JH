import { createGoal } from "@/app/actions";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { GoalCard } from "@/components/GoalCard";
import { OwnerPicker } from "@/components/OwnerPicker";
import { OwnerSelect } from "@/components/OwnerSelect";
import { PageHeader } from "@/components/PageHeader";
import { Empty, Section } from "@/components/Section";
import { TaskRow } from "@/components/TaskRow";
import { goalProgress, isDone } from "@/lib/progress";
import { loadFamilyData } from "@/lib/queries";
import { GoalKindFields } from "./GoalKindFields";

const CATEGORIES = ["Ekonomi", "Hem", "Semester", "Hälsa", "Barnen", "Övrigt"];

export default async function GoalsPage() {
  const { profile, members, goals, tasks, completions, isParent } = await loadFamilyData();
  const byId = new Map(members.map((m) => [m.id, m]));
  const active = goals.filter((g) => !g.archived);
  const archived = goals.filter((g) => g.archived);
  const categories = CATEGORIES.filter((c) => active.some((g) => g.category === c));
  const other = active.filter((g) => !CATEGORIES.includes(g.category));

  const card = (g: (typeof goals)[number]) => {
    const steps = tasks.filter((t) => t.goal_id === g.id);
    return (
      <GoalCard key={g.id} goal={g} progress={goalProgress(g, tasks, completions)} owner={g.owner ? byId.get(g.owner) : undefined} editable={isParent}>
        {steps.length > 0 && (
          <div className="mt-2 border-t border-line">
            {steps.map((t) => (
              <TaskRow key={t.id} task={t} done={isDone(t, completions)} canToggle={isParent || t.assignee === profile.id} plain />
            ))}
          </div>
        )}
        {isParent && (
          <div className="mt-3">
            <OwnerPicker table="goals" id={g.id} owner={g.owner} members={members} />
          </div>
        )}
      </GoalCard>
    );
  };

  return (
    <>
      <PageHeader title="Mål" />

      {active.length === 0 && (
        <Section>
          <Empty>Inga mål än.{isParent ? " Vad vill ni uppnå?" : ""}</Empty>
        </Section>
      )}
      {categories.map((c) => (
        <Section key={c} title={c}>{active.filter((g) => g.category === c).map(card)}</Section>
      ))}
      {other.length > 0 && <Section title="Övrigt">{other.map(card)}</Section>}

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
            <OwnerSelect members={members} />
            <SubmitButton>Skapa mål</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}

      {archived.length > 0 && (
        <details>
          <summary className="cursor-pointer px-1 text-sm text-muted">Arkiverade ({archived.length})</summary>
          <div className="group mt-2 opacity-70">{archived.map(card)}</div>
        </details>
      )}
    </>
  );
}
