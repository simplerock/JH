import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { addToGoal, archiveGoal, deleteGoal } from "@/app/actions";
import { daysBetween, formatDate, today } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import type { Progress } from "@/lib/progress";
import type { Goal } from "@/lib/types";
import type { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";

export function goalDetail(goal: Goal, p: Progress): string {
  if (goal.kind === "amount") return `${formatNumber(p.done)} / ${formatNumber(p.total)} ${goal.unit}`;
  return p.total === 0 ? "Inga uppgifter än" : `${p.done} av ${p.total} klara`;
}

type Props = { goal: Goal; progress: Progress; isParent?: boolean; compact?: boolean; children?: ReactNode };

export function GoalCard({ goal, progress, isParent, compact, children }: Props) {
  const left = goal.due_date ? daysBetween(today(), goal.due_date) : null;
  const finished = progress.total > 0 && progress.ratio >= 1;

  return (
    <article className="card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="chip mb-1">{goal.category}</span>
          <h3 className="text-lg font-semibold leading-snug break-words">{goal.title}</h3>
          {!compact && goal.description && <p className="text-sm text-muted">{goal.description}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold tabular-nums text-accent">{Math.round(progress.ratio * 100)}%</p>
          {left !== null && (
            <p className={`text-xs ${left < 0 && !finished ? "text-warn" : "text-muted"}`}>
              {left < 0 ? `Deadline ${formatDate(goal.due_date!)}` : `${left} dagar kvar`}
            </p>
          )}
        </div>
      </div>
      <ProgressBar ratio={progress.ratio} detail={goalDetail(goal, progress)} label={finished ? "Klart!" : undefined} />
      {!compact && children}

      {!compact && isParent && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {goal.kind === "amount" && !goal.archived && (
            <form action={addToGoal} className="flex flex-1 gap-2">
              <input type="hidden" name="id" value={goal.id} />
              <input className="input py-1.5 text-sm" name="amount" inputMode="decimal" placeholder={`+ ${goal.unit}`} aria-label="Belopp att lägga till" />
              <button className="btn-ghost shrink-0">Lägg till</button>
            </form>
          )}
          <form action={archiveGoal}>
            <input type="hidden" name="id" value={goal.id} />
            <input type="hidden" name="archived" value={String(!goal.archived)} />
            <button className="btn-ghost" aria-label={goal.archived ? "Återställ" : "Arkivera"}>
              {goal.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            </button>
          </form>
          <form action={deleteGoal}>
            <input type="hidden" name="id" value={goal.id} />
            <button className="btn-ghost text-warn" aria-label="Ta bort mål">
              <Trash2 size={16} />
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
