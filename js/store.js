// Focus Bloom — pub/sub store backed by localStorage.
//
// Design: state is one frozen-ish object owned here. Mutations only happen
// through `actions`; every mutation produces a new state, persists, and
// notifies subscribers. UI never touches localStorage directly.

import { makeGoal, reconcile, logProgress, applyDailyDecay, CATEGORIES } from "./model.js";

const STORAGE_KEY = "focus-bloom:v1";
const SCHEMA_VERSION = 1;

const DEFAULT_STATE = {
  version: SCHEMA_VERSION,
  goals: [],
  ui: {
    view: "list",         // "garden" | "list"
    search: "",
    categoryFilter: "all", // "all" | <category>
    kindFilter: "all",     // "all" | "habit" | "task" | "milestone"
    onlyActive: false,
    sortBy: "recent",      // "recent" | "title" | "stage"
  },
  meta: {
    createdAt: null,
    seedShown: false,
  },
};

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v : fallback;
  } catch { return fallback; }
}

function readPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = safeParse(raw, null);
    if (!parsed) return null;
    if (parsed.version !== SCHEMA_VERSION) {
      // Future migrations would run here. For v1, just take what we can.
      parsed.version = SCHEMA_VERSION;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Quota or private mode — surface a console warning but don't crash.
    console.warn("[focus-bloom] could not persist state:", err);
  }
}

// ---- store ----

let state = DEFAULT_STATE;
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try { fn(state); } catch (e) { console.error(e); }
  }
}

function setState(producer) {
  const next = producer(state);
  if (next === state) return;
  state = next;
  writePersisted(state);
  notify();
}

export function getState() { return state; }

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Initialize the store. If a sample seed function is passed and there is
// nothing persisted, plant the sample garden.
export function init({ seed } = {}) {
  const persisted = readPersisted();
  if (persisted) {
    // Reconcile every goal so we recompute derived fields (e.g. decay).
    state = {
      ...DEFAULT_STATE,
      ...persisted,
      ui: { ...DEFAULT_STATE.ui, ...(persisted.ui ?? {}) },
      meta: { ...DEFAULT_STATE.meta, ...(persisted.meta ?? {}) },
      goals: (persisted.goals ?? []).map((g) => reconcile(applyDailyDecay(g))),
    };
  } else if (typeof seed === "function") {
    state = {
      ...DEFAULT_STATE,
      goals: seed().map((g) => reconcile(makeGoal(g))),
      meta: { createdAt: new Date().toISOString(), seedShown: true },
    };
    writePersisted(state);
  } else {
    state = { ...DEFAULT_STATE, meta: { createdAt: new Date().toISOString(), seedShown: false } };
    writePersisted(state);
  }
  notify();
}

// ---- actions ----

export const actions = {
  addGoal(partial) {
    const goal = reconcile(makeGoal(partial));
    setState((s) => ({ ...s, goals: [goal, ...s.goals] }));
    return goal;
  },
  updateGoal(id, patch) {
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) => (g.id === id ? reconcile({ ...g, ...patch, updatedAt: new Date().toISOString() }) : g)),
    }));
  },
  removeGoal(id) {
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
  },
  logProgress(id, delta = 1) {
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) => (g.id === id ? logProgress(g, delta) : g)),
    }));
  },
  setUI(patch) {
    setState((s) => ({ ...s, ui: { ...s.ui, ...patch } }));
  },
  replaceAll(payload) {
    // Used by import. Validate minimally before swapping.
    if (!payload || !Array.isArray(payload.goals)) {
      throw new Error("Invalid garden file: expected { goals: [...] }.");
    }
    const goals = payload.goals.map((g) => reconcile(makeGoal(g)));
    setState((s) => ({
      ...s,
      goals,
      meta: { ...s.meta, createdAt: payload?.meta?.createdAt ?? s.meta.createdAt },
    }));
  },
  clearAll() {
    setState((s) => ({ ...s, goals: [] }));
  },
};

// ---- selectors ----

export function selectVisibleGoals(s = state) {
  const { search, categoryFilter, kindFilter, onlyActive, sortBy } = s.ui;
  const q = search.trim().toLowerCase();
  let goals = s.goals.filter((g) => {
    if (categoryFilter !== "all" && g.category !== categoryFilter) return false;
    if (kindFilter !== "all" && g.kind !== kindFilter) return false;
    if (onlyActive && g.stage === "harvest") return false;
    if (q && !(g.title.toLowerCase().includes(q) || g.note.toLowerCase().includes(q))) return false;
    return true;
  });
  const stageOrder = { seed: 0, sprout: 1, bud: 2, bloom: 3, harvest: 4 };
  goals.sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "stage") return (stageOrder[b.stage] - stageOrder[a.stage]);
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  return goals;
}

export function selectStats(s = state) {
  const total = s.goals.length;
  const byStage = { seed: 0, sprout: 0, bud: 0, bloom: 0, harvest: 0 };
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  for (const g of s.goals) {
    byStage[g.stage] = (byStage[g.stage] ?? 0) + 1;
    byCategory[g.category] = (byCategory[g.category] ?? 0) + 1;
  }
  return { total, byStage, byCategory };
}

export const STORAGE_KEY_NAME = STORAGE_KEY;
export const SCHEMA = SCHEMA_VERSION;
