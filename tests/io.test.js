// Tests for import boundary validation. Pure parser coverage, no DOM.

import test from "node:test";
import assert from "node:assert/strict";

import { IMPORT_LIMITS, parseGardenPayload } from "../js/io.js";

function backup(overrides = {}) {
  return JSON.stringify({
    app: "focus-bloom",
    schema: 1,
    goals: [
      {
        id: "g_safe",
        title: "Review portfolio notes",
        note: "Small, valid garden import.",
        kind: "task",
        category: "work",
        target: 3,
        progress: 1,
        createdAt: "2026-06-01T08:00:00.000Z",
        updatedAt: "2026-06-02T08:00:00.000Z",
        history: [{ at: "2026-06-02T08:00:00.000Z", delta: 1 }],
      },
    ],
    ...overrides,
  });
}

test("parseGardenPayload accepts a valid Focus Bloom backup", () => {
  const parsed = parseGardenPayload(backup());
  assert.equal(parsed.app, "focus-bloom");
  assert.equal(parsed.goals.length, 1);
  assert.equal(parsed.goals[0].title, "Review portfolio notes");
});

test("parseGardenPayload rejects oversized backups before parsing", () => {
  const tooLarge = " ".repeat(IMPORT_LIMITS.maxBytes + 1);
  assert.throws(
    () => parseGardenPayload(tooLarge),
    /too large/i
  );
});

test("parseGardenPayload rejects too many imported plants", () => {
  const goals = Array.from({ length: IMPORT_LIMITS.maxGoals + 1 }, (_, index) => ({
    id: `g_${index}`,
    title: `Goal ${index}`,
    target: 1,
    progress: 0,
  }));

  assert.throws(
    () => parseGardenPayload(backup({ goals })),
    /too many plants/i
  );
});

test("parseGardenPayload rejects malformed goal fields that would break reconciliation", () => {
  const goals = [{ title: 42, target: 1, progress: 0 }];
  assert.throws(
    () => parseGardenPayload(backup({ goals })),
    /invalid title/i
  );
});

test("parseGardenPayload rejects unbounded progress history", () => {
  const goals = [{
    title: "Noisy import",
    target: 10,
    progress: 1,
    history: Array.from({ length: IMPORT_LIMITS.maxHistoryEntriesPerGoal + 1 }, () => ({
      at: "2026-06-02T08:00:00.000Z",
      delta: 1,
    })),
  }];

  assert.throws(
    () => parseGardenPayload(backup({ goals })),
    /too many progress history entries/i
  );
});
