// Tests for the Garden Coach. Pure inputs, fixed clock, no DOM.

import test from "node:test";
import assert from "node:assert/strict";

import { recommendNext, scoreGoal, summarizeGarden } from "../js/coach.js";

const TODAY = new Date("2026-06-08T12:00:00Z");
const day = 86_400_000;
const daysAgo = (n) => new Date(TODAY.getTime() - n * day).toISOString();

function goal(partial) {
  return {
    id: partial.id ?? "g_test",
    title: partial.title ?? "Test goal",
    note: "",
    kind: partial.kind ?? "task",
    category: partial.category ?? "other",
    target: partial.target ?? 1,
    progress: partial.progress ?? 0,
    vitality: partial.vitality,
    stage: partial.stage ?? "seed",
    createdAt: partial.createdAt ?? daysAgo(7),
    updatedAt: partial.updatedAt ?? daysAgo(0),
    history: partial.history ?? [],
  };
}

test("harvested goals score zero and are deprioritised", () => {
  const done = goal({ id: "g_done", target: 5, progress: 5, stage: "harvest" });
  const { score, reasons } = scoreGoal(done, TODAY);
  assert.equal(score, 0);
  assert.match(reasons[0], /harvest/i);
});

test("perennial habits with low vitality and long silence rank highest", () => {
  const wilting = goal({
    id: "g_wilt", kind: "habit", target: 0, vitality: 18,
    history: [{ at: daysAgo(6), delta: 1 }],
  });
  const { score, reasons } = scoreGoal(wilting, TODAY);
  assert.ok(score >= 80, `expected high urgency, got ${score}`);
  assert.ok(reasons.some((r) => /vitality/i.test(r)));
  assert.ok(reasons.some((r) => /no log/i.test(r)));
});

test("goals already in bloom are urgent — one push finishes them", () => {
  const almost = goal({ id: "g_bloom", target: 10, progress: 8 });
  const seedling = goal({ id: "g_seed", target: 10, progress: 1 });
  assert.ok(scoreGoal(almost, TODAY).score > scoreGoal(seedling, TODAY).score);
});

test("recommendNext sorts by score, then oldest createdAt, never alphabetically", () => {
  // Two goals tie on score (both fresh sprouts touched today). The older one
  // must win — picking by title would surprise the user.
  const beta = goal({
    id: "g_b", title: "Beta", target: 10, progress: 2,
    createdAt: daysAgo(10), updatedAt: daysAgo(0),
  });
  const alpha = goal({
    id: "g_a", title: "Alpha", target: 10, progress: 2,
    createdAt: daysAgo(3), updatedAt: daysAgo(0),
  });
  const [top] = recommendNext([alpha, beta], { today: TODAY, limit: 2 });
  assert.equal(top.goal.id, "g_b", "expected the older goal to win the tie");
});

test("recommendNext returns at most `limit` entries and is deterministic", () => {
  const goals = [
    goal({ id: "g_1", target: 10, progress: 7 }),
    goal({ id: "g_2", kind: "habit", target: 0, vitality: 20, history: [{ at: daysAgo(6), delta: 1 }] }),
    goal({ id: "g_3", target: 10, progress: 1 }),
    goal({ id: "g_4", target: 10, progress: 10, stage: "harvest" }),
  ];
  const first = recommendNext(goals, { today: TODAY, limit: 2 });
  const second = recommendNext(goals, { today: TODAY, limit: 2 });
  assert.equal(first.length, 2);
  assert.deepEqual(first.map((r) => r.goal.id), second.map((r) => r.goal.id));
  assert.ok(!first.some((r) => r.goal.id === "g_4"), "harvested goals must be filtered when better options exist");
});

test("recommendNext handles empty and malformed input safely", () => {
  assert.deepEqual(recommendNext([], { today: TODAY }), []);
  assert.deepEqual(recommendNext(null, { today: TODAY }), []);
});

test("summarizeGarden counts thirsty, idle, almost-there, and picks a top recommendation", () => {
  const goals = [
    goal({ id: "g_h", kind: "habit", target: 0, vitality: 12, history: [{ at: daysAgo(2), delta: 1 }] }),
    goal({ id: "g_almost", target: 10, progress: 9 }),
    goal({ id: "g_done", target: 5, progress: 5, stage: "harvest" }),
    goal({ id: "g_idle", target: 10, progress: 3, updatedAt: daysAgo(8), history: [{ at: daysAgo(8), delta: 1 }] }),
  ];
  const digest = summarizeGarden(goals, TODAY);
  assert.equal(digest.total, 4);
  assert.equal(digest.harvested, 1);
  assert.equal(digest.almostThere, 1);
  assert.equal(digest.thirsty, 1);
  assert.equal(digest.idle, 1);
  assert.ok(digest.topPick, "expected a top pick");
  assert.notEqual(digest.topPick.goal.id, "g_done");
});
