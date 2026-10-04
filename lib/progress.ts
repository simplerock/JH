import { daysBetween, periodKey, today } from "./dates.ts";
import type { BudgetCategory, ChecklistItem, Completion, Goal, MaintenanceItem, Task, Transaction } from "./types.ts";

export function isDone(task: Task, completions: Completion[], date: string = today()): boolean {
  const key = periodKey(task.recurrence, date);
  return completions.some((c) => c.task_id === task.id && c.period === key);
}

export type Progress = { done: number; total: number; ratio: number };

function make(done: number, total: number): Progress {
  return { done, total, ratio: total > 0 ? Math.min(1, Math.max(0, done / total)) : 0 };
}

export function goalProgress(goal: Goal, tasks: Task[], completions: Completion[], date?: string): Progress {
  if (goal.kind === "amount") return make(Number(goal.current), Number(goal.target ?? 0));
  const linked = tasks.filter((t) => t.goal_id === goal.id);
  return make(linked.filter((t) => isDone(t, completions, date)).length, linked.length);
}

export function taskProgress(tasks: Task[], completions: Completion[], date?: string): Progress {
  return make(tasks.filter((t) => isDone(t, completions, date)).length, tasks.length);
}

export function checklistProgress(items: ChecklistItem[]): Progress {
  return make(items.filter((i) => i.done).length, items.length);
}

/** Alla perioder som är aktuella idag. Används för att bara hämta relevanta avbockningar. */
export function currentPeriods(date: string = today()): string[] {
  return ["once", periodKey("daily", date), periodKey("weekly", date), periodKey("monthly", date)];
}

/** Dagar tills underhållet ska göras. Negativt = försenat. Aldrig gjort räknas som dags idag. */
export function maintenanceDue(item: MaintenanceItem, date: string = today()): number {
  if (!item.last_done) return 0;
  return daysBetween(date, item.last_done) + item.interval_days;
}

export type CategorySpend = { category: BudgetCategory; spent: number; left: number; over: boolean; ratio: number };

export function budgetSummary(categories: BudgetCategory[], transactions: Transaction[]) {
  const rows: CategorySpend[] = categories.map((c) => {
    const spent = transactions.filter((t) => t.category_id === c.id).reduce((a, t) => a + Number(t.amount), 0);
    const limit = Number(c.monthly_limit);
    return { category: c, spent, left: limit - spent, over: spent > limit, ratio: make(spent, limit).ratio };
  });
  const limit = categories.reduce((a, c) => a + Number(c.monthly_limit), 0);
  const spent = transactions.reduce((a, t) => a + Number(t.amount), 0);
  return { rows, limit, spent, left: limit - spent, ratio: make(spent, limit).ratio };
}
