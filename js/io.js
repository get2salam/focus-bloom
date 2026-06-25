// Focus Bloom — import/export helpers.

import { actions, getState, SCHEMA, STORAGE_KEY_NAME } from "./store.js";
import { showToast } from "./feedback.js";

export const IMPORT_LIMITS = {
  maxBytes: 1_000_000,
  maxGoals: 250,
  maxHistoryEntriesPerGoal: 200,
};

function download(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function assertOptionalString(value, label, index) {
  if (value != null && typeof value !== "string") {
    throw new Error(`Goal ${index + 1} has an invalid ${label}.`);
  }
}

function assertOptionalFiniteNumber(value, label, index) {
  if (value != null && (!Number.isFinite(value) || Math.abs(value) > 1_000_000)) {
    throw new Error(`Goal ${index + 1} has an invalid ${label}.`);
  }
}

function validateImportedGoals(goals) {
  if (goals.length > IMPORT_LIMITS.maxGoals) {
    throw new Error(`That backup has too many plants. Please import ${IMPORT_LIMITS.maxGoals} or fewer at a time.`);
  }

  goals.forEach((goal, index) => {
    if (!goal || typeof goal !== "object" || Array.isArray(goal)) {
      throw new Error(`Goal ${index + 1} is not a valid plant record.`);
    }

    assertOptionalString(goal.id, "id", index);
    assertOptionalString(goal.title, "title", index);
    assertOptionalString(goal.note, "note", index);
    assertOptionalString(goal.kind, "kind", index);
    assertOptionalString(goal.category, "category", index);
    assertOptionalString(goal.createdAt, "createdAt", index);
    assertOptionalString(goal.updatedAt, "updatedAt", index);
    assertOptionalFiniteNumber(goal.target, "target", index);
    assertOptionalFiniteNumber(goal.progress, "progress", index);
    assertOptionalFiniteNumber(goal.vitality, "vitality", index);

    if (goal.history != null) {
      if (!Array.isArray(goal.history)) {
        throw new Error(`Goal ${index + 1} has an invalid progress history.`);
      }
      if (goal.history.length > IMPORT_LIMITS.maxHistoryEntriesPerGoal) {
        throw new Error(`Goal ${index + 1} has too many progress history entries.`);
      }
    }
  });
}

export function parseGardenPayload(text) {
  if (typeof text !== "string" || text.length > IMPORT_LIMITS.maxBytes) {
    throw new Error("That backup is too large to import safely.");
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.goals)) {
    throw new Error("That file does not look like a Focus Bloom garden backup.");
  }

  if (parsed.app && parsed.app !== "focus-bloom") {
    throw new Error("That backup belongs to a different app.");
  }

  if (parsed.schema && parsed.schema > SCHEMA) {
    throw new Error("That backup was created by a newer version of Focus Bloom.");
  }

  validateImportedGoals(parsed.goals);

  return parsed;
}

export function exportGarden() {
  const state = getState();
  const payload = {
    app: "focus-bloom",
    schema: SCHEMA,
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY_NAME,
    goals: state.goals,
    meta: state.meta,
  };

  download(
    `focus-bloom-garden-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2)
  );
  showToast(`Downloaded backup with ${state.goals.length} plant${state.goals.length === 1 ? "" : "s"}.`, "success");
}

export async function importGardenFile(file) {
  if (!file) return;
  const parsed = parseGardenPayload(await file.text());
  actions.replaceAll(parsed);
  showToast(`Imported ${parsed.goals.length} plant${parsed.goals.length === 1 ? "" : "s"}.`, "success");
}
