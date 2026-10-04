import { test } from "node:test";
import assert from "node:assert/strict";
import { isoWeek, periodKey, today, daysBetween } from "./dates.ts";
import { goalProgress, isDone, checklistProgress } from "./progress.ts";
import type { Goal, Task } from "./types.ts";

const task = (over: Partial<Task>): Task => ({
  id: "t", title: "x", area: null, recurrence: "weekly", assignee: null, goal_id: null, due_date: null, points: 1, ...over,
});

test("ISO-veckor stämmer runt årsskiftet", () => {
  assert.equal(isoWeek("2026-10-04"), "2026-W40");
  assert.equal(isoWeek("2027-01-01"), "2026-W53");
  assert.equal(isoWeek("2025-12-29"), "2026-W01");
});

test("periodnycklar", () => {
  assert.equal(periodKey("daily", "2026-10-04"), "2026-10-04");
  assert.equal(periodKey("monthly", "2026-10-04"), "2026-10");
  assert.equal(periodKey("none", "2026-10-04"), "once");
});

test("dagens datum följer svensk tid", () => {
  // 23:30 UTC 31 dec är redan nyår i Stockholm
  assert.equal(today(new Date("2026-12-31T23:30:00Z")), "2027-01-01");
});

test("veckosyssla räknas bara som klar samma vecka", () => {
  const t = task({ id: "a" });
  const done = [{ task_id: "a", period: "2026-W40", completed_by: "u" }];
  assert.equal(isDone(t, done, "2026-10-04"), true);
  assert.equal(isDone(t, done, "2026-10-05"), false);
});

test("målprogress för uppgifter och belopp", () => {
  const goal: Goal = { id: "g", title: "", description: null, category: "", kind: "tasks", target: null, current: 0, unit: "kr", due_date: null, archived: false };
  const tasks = [task({ id: "a", goal_id: "g", recurrence: "none" }), task({ id: "b", goal_id: "g", recurrence: "none" })];
  const p = goalProgress(goal, tasks, [{ task_id: "a", period: "once", completed_by: "u" }]);
  assert.deepEqual([p.done, p.total, p.ratio], [1, 2, 0.5]);
  const money = goalProgress({ ...goal, kind: "amount", target: 30000, current: 45000 }, [], []);
  assert.equal(money.ratio, 1);
});

test("checklista och dagar", () => {
  assert.equal(checklistProgress([{ text: "a", done: true }, { text: "b", done: false }]).ratio, 0.5);
  assert.equal(checklistProgress([]).ratio, 0);
  assert.equal(daysBetween("2026-10-04", "2026-12-24"), 81);
});
