import test from "node:test";
import assert from "node:assert/strict";
import { viewControlVisibility } from "../js/view-controls.js";

test("shows key and scale only in notation view", () => {
  assert.deepEqual(viewControlVisibility("notation"), { key: false, scale: false });
  assert.deepEqual(viewControlVisibility("fretboard"), { key: true, scale: true });
  assert.deepEqual(viewControlVisibility("tuner"), { key: true, scale: true });
});
