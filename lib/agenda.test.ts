import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAgenda, byDay, inRange, rangeDates } from "./agenda.ts";

const ev = (over = {}) => ({
  id: "e1", kind: "vacation" as const, title: "Zhangjiajie", start_date: "2026-11-07", end_date: "2026-11-15", location: null, notes: null,
  checklist: [], goal_id: null, details: {}, booked: false, owner: "jaynie", updated_at: "", updated_by: null, ...over,
});

test("agendan samlar händelser, deadlines och underhåll", () => {
  const items = buildAgenda(
    {
      events: [ev()],
      tasks: [{ id: "t1", title: "Boka flyg", area: null, recurrence: "none", assignee: "jaynie", goal_id: null, project_id: null, due_date: "2026-10-11", points: 0, requires_photo: false, event_id: "e1" }],
      maintenance: [{ id: "m1", title: "Filter", interval_days: 180, last_done: "2026-04-01", owner: "joey", notes: null }],
      goals: [],
      projects: [],
    },
    "2026-10-04",
  );
  assert.deepEqual(items.map((i) => i.kind), ["maintenance", "task", "trip"]);
  assert.equal(items[0].date, "2026-09-28");
  assert.equal(items[1].href, "/kalender/e1");
});

test("intervall och dagar", () => {
  const items = buildAgenda({ events: [ev({ start_date: "2026-10-03", end_date: "2026-10-06" })], tasks: [], maintenance: [], goals: [], projects: [] }, "2026-10-04");
  const week = inRange(items, "2026-10-04", "2026-10-04", "2026-10-04");
  assert.equal(week.length, 1, "pågående resa syns");
  assert.deepEqual([...byDay(week, "2026-10-04").keys()], ["2026-10-04"]);
  assert.deepEqual(rangeDates("nasta", "2026-10-04", "2026-09-28"), ["2026-10-05", "2026-10-11"]);
  assert.deepEqual(rangeDates("vecka", "2026-10-04", "2026-09-28"), ["2026-10-04", "2026-10-04"]);
});

test("ics-fil med heldagar och escaping", async () => {
  const { buildIcs } = await import("./ics.ts");
  const ics = buildIcs("Familjen Hiew", [
    { key: "e-1", kind: "trip", title: "Zhangjiajie, Kina", date: "2026-11-07", end: "2026-11-15", href: "/kalender/1", owner: null, important: true, description: "MF 8656 14:40;KUL" },
  ], "https://homehub.example", new Date("2026-10-04T10:00:00Z"));
  assert.match(ics, /DTSTART;VALUE=DATE:20261107\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20261116\r\n/);
  assert.match(ics, /SUMMARY:Zhangjiajie\\, Kina/);
  assert.ok(ics.includes("DESCRIPTION:MF 8656 14:40\\;KUL\r\n"));
  assert.ok(ics.split("\r\n").every((l) => l.length <= 75));
});
