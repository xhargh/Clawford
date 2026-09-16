import test from "node:test";
import assert from "node:assert/strict";
import { viewControlVisibility } from "../js/view-controls.js";

test("shows key and scale only in notation view", () => {
  assert.deepEqual(viewControlVisibility("notation"), { instrument: true, tuning: true, key: false, scale: false });
  assert.deepEqual(viewControlVisibility("fretboard"), { instrument: true, tuning: true, key: true, scale: true });
  assert.deepEqual(viewControlVisibility("tuner"), { instrument: true, tuning: true, key: true, scale: true });
  assert.deepEqual(viewControlVisibility("metronome"), { instrument: false, tuning: false, key: false, scale: false });
});
