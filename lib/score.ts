import { addDays, today as todayIso, weekStart } from "./dates.ts";
import { currentStreak, streakBonus, weekPoints } from "./progress.ts";
import type { Completion, Task } from "./types.ts";

export type KidWeek = { points: number; base: number; bonus: number; streak: number };

/** Barnets vecka: godkända poäng plus streakbonus. weekFrom/weekTo är tidsstämplar, day är sista dagen som räknas. */
export function kidWeek(kidId: string, tasks: Task[], completions: Completion[], weekFrom: string, opts: { weekTo?: string; day?: string } = {}): KidWeek {
  const day = opts.day ?? todayIso();
  const monday = weekStart(day);
  const base = weekPoints(kidId, completions, tasks, weekFrom, opts.weekTo);
  const bonus = streakBonus(kidId, monday, day, tasks, completions);
  return { points: base + bonus, base, bonus, streak: currentStreak(kidId, day, tasks, completions) };
}

export const lastSunday = (day: string = todayIso()) => addDays(weekStart(day), -1);
