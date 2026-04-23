// Focus Bloom — import/export helpers.

import { actions, getState, SCHEMA, STORAGE_KEY_NAME } from "./store.js";
import { showToast } from "./feedback.js";

function download(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseGardenPayload(text) {
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
