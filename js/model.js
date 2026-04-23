// Focus Bloom — data model helpers (pure, no DOM, no I/O)

export const STAGES = ["seed", "sprout", "bud", "bloom", "harvest"];

export const STAGE_META = {
  seed:    { label: "Seed",    pct: 0,   blurb: "Freshly planted." },
  sprout:  { label: "Sprout",  pct: 1,   blurb: "First signs of life." },
  bud:     { label: "Bud",     pct: 25,  blurb: "Visible structure." },
  bloom:   { label: "Bloom",   pct: 60,  blurb: "In full flower." },
  harvest: { label: "Harvest", pct: 100, blurb: "Complete." },
};

export const KINDS = ["habit", "task", "milestone"];
export const KIND_META = {
  habit:     { label: "Habit",     hint: "Recurring practice" },
  task:      { label: "Task",      hint: "One-off thing to do" },
  milestone: { label: "Milestone", hint: "A bigger achievement" },
};

export const CATEGORIES = [
  "health", "learning", "creative", "work", "relationships", "mindfulness", "other",
];
export const CATEGORY_LABEL = {
  health: "Health",
  learning: "Learning",
  creative: "Creative",
  work: "Work",
  relationships: "Relationships",
  mindfulness: "Mindfulness",
  other: "Other",
};

// Map progress percentage → stage. Percentage is `progress / target * 100`,
// or for habits without targets, a derived "vitality" 0–100.
export function stageFromPercent(pct) {
  if (pct >= 100) return "harvest";
  if (pct >= 60)  return "bloom";
  if (pct >= 25)  return "bud";
  if (pct >= 1)   return "sprout";
  return "seed";
}

export function percent(goal) {
  if (!goal.target || goal.target <= 0) {
    // Perennial habits: vitality decays a little each day, grows on log.
    return Math.max(0, Math.min(100, goal.vitality ?? 0));
  }
  return Math.max(0, Math.min(100, Math.round((goal.progress / goal.target) * 100)));
}

export function newId(prefix = "g") {
  // Short, URL-safe-ish id; collisions are negligible at this scale.
  const r = Math.random().toString(36).slice(2, 8);
  const t = Date.now().toString(36).slice(-4);
  return `${prefix}_${t}${r}`;
}

export function nowISO() { return new Date().toISOString(); }

// Build a fresh goal with sensible defaults.
export function makeGoal(partial = {}) {
  const kind = KINDS.includes(partial.kind) ? partial.kind : "habit";
  const category = CATEGORIES.includes(partial.category) ? partial.category : "other";
  const target = partial.target ?? (kind === "habit" ? 0 : kind === "milestone" ? 10 : 1);
  const progress = partial.progress ?? 0;
  const vitality = partial.vitality ?? (kind === "habit" ? 0 : undefined);

  const goal = {
    id: partial.id ?? newId(),
    title: (partial.title ?? "Untitled").trim().slice(0, 120),
    note: (partial.note ?? "").slice(0, 400),
    kind,
    category,
    target,
    progress,
    vitality,
    createdAt: partial.createdAt ?? nowISO(),
    updatedAt: partial.updatedAt ?? nowISO(),
    history: Array.isArray(partial.history) ? partial.history.slice(-200) : [],
  };
  goal.stage = stageFromPercent(percent(goal));
  return goal;
}

// Recompute derived fields (stage) and clamp values. Pure.
export function reconcile(goal) {
  const next = { ...goal };
  if (next.target < 0) next.target = 0;
  if (next.progress < 0) next.progress = 0;
  if (next.target > 0 && next.progress > next.target) next.progress = next.target;
  if (next.kind === "habit" && next.vitality != null) {
    next.vitality = Math.max(0, Math.min(100, next.vitality));
  }
  next.stage = stageFromPercent(percent(next));
  return next;
}

// Apply a progress delta and append to history.
export function logProgress(goal, delta = 1) {
  const next = { ...goal, history: [...goal.history] };
  if (next.kind === "habit" && (!next.target || next.target <= 0)) {
    // Perennial habit: bump vitality, decay gently elsewhere.
    next.vitality = Math.min(100, (next.vitality ?? 0) + Math.max(1, delta * 12));
  } else {
    next.progress = Math.max(0, (next.progress ?? 0) + delta);
  }
  next.updatedAt = nowISO();
  next.history.push({ at: next.updatedAt, delta });
  if (next.history.length > 200) next.history = next.history.slice(-200);
  return reconcile(next);
}

// Apply gentle daily decay to perennial habits so the garden stays alive.
// Returns a new goal if changed, otherwise the original reference.
export function applyDailyDecay(goal, today = new Date()) {
  if (goal.kind !== "habit" || (goal.target && goal.target > 0)) return goal;
  if (goal.vitality == null) return goal;
  const last = goal.history.length ? new Date(goal.history.at(-1).at) : new Date(goal.createdAt);
  const daysSince = Math.max(0, Math.floor((today - last) / 86_400_000));
  if (daysSince === 0) return goal;
  const decay = Math.min(daysSince * 8, goal.vitality);
  if (decay <= 0) return goal;
  return reconcile({ ...goal, vitality: goal.vitality - decay });
}
