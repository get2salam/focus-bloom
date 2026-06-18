#!/usr/bin/env node
// Runnable Garden Coach example for README and developer smoke checks.
// It exercises the pure recommender without a browser, DOM, or localStorage.

import { recommendNext, summarizeGarden } from "../js/coach.js";

const today = new Date("2026-06-08T12:00:00Z");
const dayMs = 86_400_000;
const daysAgo = (days) => new Date(today.getTime() - days * dayMs).toISOString();

const garden = [
  {
    id: "g_stretch",
    title: "Morning stretch",
    kind: "habit",
    category: "health",
    target: 0,
    progress: 0,
    vitality: 22,
    stage: "sprout",
    createdAt: daysAgo(18),
    updatedAt: daysAgo(6),
    history: [{ at: daysAgo(6), delta: 1 }],
  },
  {
    id: "g_portfolio",
    title: "Polish portfolio case study",
    kind: "milestone",
    category: "work",
    target: 10,
    progress: 9,
    stage: "bloom",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
    history: [{ at: daysAgo(1), delta: 2 }],
  },
  {
    id: "g_reading",
    title: "Read one chapter",
    kind: "task",
    category: "learning",
    target: 1,
    progress: 0,
    stage: "seed",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
    history: [],
  },
];

const digest = summarizeGarden(garden, today);
const recommendations = recommendNext(garden, { today, limit: 2 });

console.log(`Garden: ${digest.total} goals, ${digest.thirsty} thirsty, ${digest.almostThere} almost ready to harvest.`);
console.log("Tend next:");
for (const [index, entry] of recommendations.entries()) {
  const reasons = entry.reasons.join(" ");
  console.log(`${index + 1}. ${entry.goal.title} — score ${entry.score}. ${reasons}`);
}
