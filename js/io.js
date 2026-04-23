// Focus Bloom — import/export helpers.

import { actions, getState, SCHEMA, STORAGE_KEY_NAME } from "./store.js";

function download(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
  download(`focus-bloom-garden-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
}

export async function importGardenFile(file) {
  if (!file) return;
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.goals)) {
    throw new Error("That file does not look like a Focus Bloom garden backup.");
  }
  actions.replaceAll(parsed);
}
