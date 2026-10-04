import { addDays, today as todayIso, weekStart } from "./dates.ts";
import { currentStreak, streakBonus, weekPoints } from "./progress.ts";
import type { Completion, PointAdjustment, Task } from "./types.ts";

export type KidWeek = { points: number; base: number; bonus: number; extra: number; streak: number };

/** Extra poäng från föräldrar som getts mellan weekFrom och weekTo. */
export function extraPoints(kidId: string, adjustments: PointAdjustment[], weekFrom: string, weekTo?: string): number {
  return adjustments
    .filter((a) => a.kid_id === kidId && a.created_at >= weekFrom && (!weekTo || a.created_at < weekTo))
    .reduce((sum, a) => sum + a.points, 0);
}

/** Barnets vecka: godkända poäng, streakbonus och extra poäng. weekFrom/weekTo är tidsstämplar, day är sista dagen som räknas. */
export function kidWeek(
  kidId: string,
  tasks: Task[],
  completions: Completion[],
  weekFrom: string,
  opts: { weekTo?: string; day?: string; adjustments?: PointAdjustment[] } = {},
): KidWeek {
  const day = opts.day ?? todayIso();
  const monday = weekStart(day);
  const base = weekPoints(kidId, completions, tasks, weekFrom, opts.weekTo);
  const bonus = streakBonus(kidId, monday, day, tasks, completions);
  const extra = extraPoints(kidId, opts.adjustments ?? [], weekFrom, opts.weekTo);
  return { points: Math.max(0, base + bonus + extra), base, bonus, extra, streak: currentStreak(kidId, day, tasks, completions) };
}

export const lastSunday = (day: string = todayIso()) => addDays(weekStart(day), -1);

/** Poäng per dag måndag till söndag: godkända sysslor (dagen de godkändes) plus extra poäng. */
export function dailyPoints(kidId: string, tasks: Task[], completions: Completion[], adjustments: PointAdjustment[], monday: string): number[] {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const sums = days.map(() => 0);
  const points = new Map(tasks.map((t) => [t.id, t.points]));
  const add = (instant: string, n: number) => {
    const i = days.indexOf(todayIso(new Date(instant)));
    if (i >= 0) sums[i] += n;
  };
  for (const c of completions) {
    if (c.completed_by === kidId && c.status === "approved" && c.reviewed_at) add(c.reviewed_at, points.get(c.task_id) ?? 0);
  }
  for (const a of adjustments) if (a.kid_id === kidId) add(a.created_at, a.points);
  return sums;
}
