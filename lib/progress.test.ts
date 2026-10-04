import { test } from "node:test";
import assert from "node:assert/strict";
import { isoWeek, periodKey, today, daysBetween } from "./dates.ts";
import { budgetSummary, goalProgress, isDone, checklistProgress, levelFor, maintenanceDue, weekPoints } from "./progress.ts";
import { monthRange, shiftMonth, weekStart, weekStartInstant } from "./dates.ts";
import type { Goal, Task } from "./types.ts";

const task = (over: Partial<Task>): Task => ({
  id: "t", title: "x", area: null, recurrence: "weekly", assignee: null, goal_id: null, project_id: null, due_date: null, points: 1, requires_photo: false, ...over,
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
  const done = [{ task_id: "a", period: "2026-W40", completed_by: "u", status: "approved" as const }];
  assert.equal(isDone(t, done, "2026-10-04"), true);
  assert.equal(isDone(t, done, "2026-10-05"), false);
});

test("målprogress för uppgifter och belopp", () => {
  const goal: Goal = { id: "g", title: "", description: null, category: "", kind: "tasks", target: null, current: 0, unit: "kr", due_date: null, archived: false, owner: null };
  const tasks = [task({ id: "a", goal_id: "g", recurrence: "none" }), task({ id: "b", goal_id: "g", recurrence: "none" })];
  const p = goalProgress(goal, tasks, [{ task_id: "a", period: "once", completed_by: "u", status: "approved" as const }]);
  assert.deepEqual([p.done, p.total, p.ratio], [1, 2, 0.5]);
  const money = goalProgress({ ...goal, kind: "amount", target: 30000, current: 45000 }, [], []);
  assert.equal(money.ratio, 1);
});

test("checklista och dagar", () => {
  assert.equal(checklistProgress([{ text: "a", done: true }, { text: "b", done: false }]).ratio, 0.5);
  assert.equal(checklistProgress([]).ratio, 0);
  assert.equal(daysBetween("2026-10-04", "2026-12-24"), 81);
});

test("underhåll: dagar kvar och försenat", () => {
  const item = { id: "m", title: "Filter", interval_days: 180, last_done: "2026-04-01", owner: null, notes: null };
  assert.equal(maintenanceDue(item, "2026-10-04"), -6);
  assert.equal(maintenanceDue({ ...item, last_done: null }, "2026-10-04"), 0);
});

test("månader", () => {
  assert.deepEqual(monthRange("2028-02"), ["2028-02-01", "2028-02-29"]);
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
});

test("budget per kategori", () => {
  const cats = [{ id: "a", name: "Mat", monthly_limit: 1000 }, { id: "b", name: "Bil", monthly_limit: 500 }];
  const tx = [
    { id: "1", category_id: "a", amount: 400, occurred_on: "2026-10-01", note: null },
    { id: "2", category_id: "b", amount: 650, occurred_on: "2026-10-02", note: null },
  ];
  const s = budgetSummary(cats, tx);
  assert.equal(s.spent, 1050);
  assert.equal(s.rows[1].over, true);
  assert.equal(s.rows[0].left, 600);
});

test("väntande avbockning räknas inte som klar", () => {
  const t = task({ id: "a" });
  assert.equal(isDone(t, [{ task_id: "a", period: "2026-W40", completed_by: "k", status: "pending" }], "2026-10-04"), false);
});

test("veckans start i svensk tid", () => {
  assert.equal(weekStart("2026-10-04"), "2026-09-28");
  assert.equal(weekStart("2026-10-05"), "2026-10-05");
  // Sommartid: måndag 00:00 i Stockholm är söndag 22:00 UTC
  assert.equal(weekStartInstant(new Date("2026-10-01T12:00:00Z")), "2026-09-27T22:00:00.000Z");
  // Vintertid: 23:00 UTC
  assert.equal(weekStartInstant(new Date("2026-12-02T12:00:00Z")), "2026-11-29T23:00:00.000Z");
});

test("veckopoäng räknar bara godkänt den här veckan", () => {
  const tasks = [task({ id: "a", points: 5 }), task({ id: "b", points: 3 })];
  const from = "2026-09-27T22:00:00.000Z";
  const c = [
    { task_id: "a", period: "x", completed_by: "kid", status: "approved" as const, reviewed_at: "2026-09-29T10:00:00Z" },
    { task_id: "b", period: "x", completed_by: "kid", status: "pending" as const, reviewed_at: null },
    { task_id: "b", period: "y", completed_by: "kid", status: "approved" as const, reviewed_at: "2026-09-20T10:00:00Z" },
    { task_id: "b", period: "z", completed_by: "other", status: "approved" as const, reviewed_at: "2026-09-29T10:00:00Z" },
  ];
  assert.equal(weekPoints("kid", c, tasks, from), 5);
});

test("nivåer", () => {
  const levels = [
    { id: "1", name: "Guld", min_points: 50, reward: "" },
    { id: "2", name: "Silver", min_points: 35, reward: "" },
    { id: "3", name: "Brons", min_points: 20, reward: "" },
    { id: "4", name: "Under ribban", min_points: 0, reward: "" },
  ];
  const brons = levelFor(31, levels);
  assert.equal(brons.level?.name, "Brons");
  assert.equal(brons.next?.name, "Silver");
  assert.equal(brons.rank, 2);
  assert.equal(levelFor(5, levels).lowest, true);
  assert.equal(levelFor(80, levels).next, undefined);
});
