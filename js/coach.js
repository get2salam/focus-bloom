// Focus Bloom — Garden Coach.
//
// A small, deterministic recommender that suggests which plant to tend next.
// Pure: no DOM, no storage, no clock except what callers pass in. Designed to
// be easy to test and easy to reason about — the same garden on the same day
// always returns the same recommendations in the same order.

import { percent } from "./model.js";

const DAY_MS = 86_400_000;

function toDate(value, fallback) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : fallback;
}

function daysBetween(later, earlier) {
  if (!later || !earlier) return 0;
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / DAY_MS));
}

function lastTouched(goal, fallback) {
  const fromHistory = Array.isArray(goal.history) && goal.history.length
    ? toDate(goal.history.at(-1)?.at, null)
    : null;
  return fromHistory ?? toDate(goal.updatedAt, null) ?? toDate(goal.createdAt, fallback) ?? fallback;
}

// Score a single goal for "tend me next" urgency. Returns { score, reasons }
// where score is in [0, 100] and reasons is a stable, ordered list of short
// human-readable hints. Higher score = more urgent.
export function scoreGoal(goal, today = new Date()) {
  if (!goal || typeof goal !== "object") {
    return { score: 0, reasons: ["Not a goal."] };
  }
  if (goal.stage === "harvest" || percent(goal) >= 100) {
    return { score: 0, reasons: ["Already harvested — celebrate, don't fuss."] };
  }

  const now = toDate(today, new Date()) ?? new Date();
  const touched = lastTouched(goal, now);
  const idleDays = daysBetween(now, touched);
  const reasons = [];
  let score = 0;

  const isPerennial = goal.kind === "habit" && (!goal.target || goal.target <= 0);
  if (isPerennial) {
    const vitality = Math.max(0, Math.min(100, goal.vitality ?? 0));
    if (vitality < 35) {
      score += 60;
      reasons.push(`Vitality is low (${vitality}/100).`);
    } else if (vitality < 60) {
      score += 35;
      reasons.push(`Vitality is fading (${vitality}/100).`);
    }
    if (idleDays >= 3) {
      score += Math.min(30, idleDays * 6);
      reasons.push(`No log for ${idleDays} day${idleDays === 1 ? "" : "s"}.`);
    } else if (idleDays >= 1) {
      score += 8;
      reasons.push(`Quiet for ${idleDays} day${idleDays === 1 ? "" : "s"}.`);
    }
  } else {
    const pct = percent(goal);
    if (pct >= 60 && pct < 100) {
      score += 55 + Math.floor((pct - 60) / 2);
      reasons.push(`Already in bloom (${pct}%) — one more push finishes it.`);
    } else if (pct >= 25) {
      score += 30;
      reasons.push(`Bud stage (${pct}%) — momentum is here.`);
    } else if (pct >= 1) {
      score += 15;
      reasons.push(`Sprout stage (${pct}%) — keep the streak.`);
    } else {
      score += 5;
      reasons.push("Seed — needs a first log to wake up.");
    }
    if (idleDays >= 5) {
      score += Math.min(25, idleDays * 3);
      reasons.push(`Untouched for ${idleDays} days.`);
    }
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

// Rank goals by urgency. Tie-breaks are deterministic: score desc, then the
// oldest createdAt first (so long-standing goals don't lose to fresh ones at
// the same score), then id asc as a final stable key. Never picks a tied
// leader by title — that's a recipe for surprising "why this one?" moments.
export function recommendNext(goals, options = {}) {
  if (!Array.isArray(goals) || goals.length === 0) return [];
  const limit = Math.max(1, Math.min(20, options.limit ?? 3));
  const today = toDate(options.today, new Date()) ?? new Date();

  const scored = goals.map((goal) => {
    const { score, reasons } = scoreGoal(goal, today);
    return { goal, score, reasons };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ageA = toDate(a.goal.createdAt, today)?.getTime() ?? 0;
    const ageB = toDate(b.goal.createdAt, today)?.getTime() ?? 0;
    if (ageA !== ageB) return ageA - ageB;
    return String(a.goal.id ?? "").localeCompare(String(b.goal.id ?? ""));
  });

  const meaningful = scored.filter((entry) => entry.score > 0);
  return (meaningful.length ? meaningful : scored).slice(0, limit);
}

// A whole-garden digest a UI or agent can show as a one-glance summary.
export function summarizeGarden(goals, today = new Date()) {
  const safe = Array.isArray(goals) ? goals : [];
  const now = toDate(today, new Date()) ?? new Date();
  const digest = {
    total: safe.length,
    harvested: 0,
    almostThere: 0,
    thirsty: 0,
    idle: 0,
    topPick: null,
  };
  for (const goal of safe) {
    if (goal?.stage === "harvest" || percent(goal) >= 100) {
      digest.harvested += 1;
      continue;
    }
    const pct = percent(goal);
    if (pct >= 90) digest.almostThere += 1;
    const isPerennial = goal?.kind === "habit" && (!goal?.target || goal.target <= 0);
    if (isPerennial && (goal.vitality ?? 0) < 35) digest.thirsty += 1;
    const idle = daysBetween(now, lastTouched(goal, now));
    if (idle >= 5) digest.idle += 1;
  }
  const ranked = recommendNext(safe, { limit: 1, today: now });
  digest.topPick = ranked[0] ?? null;
  return digest;
}
