import type { ReactNode } from "react";
import { addToGoal, archiveGoal, deleteGoal } from "@/app/actions";
import { daysBetween, today } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import type { Progress } from "@/lib/progress";
import type { Goal, Profile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ProgressBar } from "./ProgressBar";

export function goalDetail(goal: Goal, p: Progress): string {
  if (goal.kind === "amount") return `${formatNumber(p.done)} av ${formatNumber(p.total)} ${goal.unit}`;
  return p.total === 0 ? "Inga steg än" : `${p.done} av ${p.total} steg`;
}

type Props = {
  goal: Goal;
  progress: Progress;
  owner?: Profile;
  /** Visar knappar för att lägga till belopp, arkivera och ta bort. */
  editable?: boolean;
  children?: ReactNode;
};

/** Ett mål som rad i en grupperad lista. */
export function GoalCard({ goal, progress, owner, editable, children }: Props) {
  const left = goal.due_date ? daysBetween(today(), goal.due_date) : null;
  const finished = progress.total > 0 && progress.ratio >= 1;

  return (
    <article className="py-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 font-medium">{goal.title}</h3>
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${finished ? "text-accent" : "text-muted"}`}>
          {finished ? "Klart" : `${Math.round(progress.ratio * 100)}%`}
        </span>
      </div>
      <ProgressBar ratio={progress.ratio} />
      <div className="mt-1.5 flex items-center justify-between gap-3 text-[13px] text-muted">
        <span>{goalDetail(goal, progress)}</span>
        <span className="flex items-center gap-2">
          {left !== null && !finished && <span className={left < 0 ? "text-warn" : ""}>{left < 0 ? "Deadline passerad" : `${left} dagar kvar`}</span>}
          {owner && <Avatar name={owner.display_name} color={owner.color} size={20} />}
        </span>
      </div>

      {children}

      {editable && (
        <div className="mt-3 flex items-center gap-2">
          {goal.kind === "amount" && !goal.archived && (
            <form action={addToGoal} className="flex flex-1 gap-2">
              <input type="hidden" name="id" value={goal.id} />
              <input className="input py-1.5 text-sm" name="amount" inputMode="decimal" placeholder={`+ ${goal.unit}`} aria-label="Belopp att lägga till" />
              <button className="btn-ghost shrink-0">Lägg till</button>
            </form>
          )}
          <form action={archiveGoal} className={goal.kind === "amount" && !goal.archived ? "" : "flex-1"}>
            <input type="hidden" name="id" value={goal.id} />
            <input type="hidden" name="archived" value={String(!goal.archived)} />
            <button className="btn-ghost">{goal.archived ? "Återställ" : "Arkivera"}</button>
          </form>
          {goal.archived && (
            <form action={deleteGoal}>
              <input type="hidden" name="id" value={goal.id} />
              <button className="btn-ghost text-warn">Ta bort</button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
