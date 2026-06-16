// Tests for shared model copy used by accessible progress UI.

import test from "node:test";
import assert from "node:assert/strict";

import { progressLabel } from "../js/model.js";

test("progressLabel describes finite goals with counts and percent", () => {
  assert.equal(
    progressLabel({ progress: 3, target: 10 }),
    "3 of 10 complete (30%)"
  );
});

test("progressLabel describes perennial habits as vitality out of 100", () => {
  assert.equal(
    progressLabel({ kind: "habit", target: 0, vitality: 42 }),
    "Vitality 42 out of 100 (42%)"
  );
});