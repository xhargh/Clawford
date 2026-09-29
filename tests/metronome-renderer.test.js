import test from "node:test";
import assert from "node:assert/strict";
import { renderMetronomeOutput } from "../js/metronome-renderer.js";

test("renders each tick state without preset buttons", () => {
  const output = renderMetronomeOutput({ pattern: "ANASN", tpm: 120 });
  assert.match(output, /Tick 1: Accent/);
  assert.match(output, /Tick 3: Accent/);
  assert.match(output, /Tick 4: Silent/);
  assert.doesNotMatch(output, />[ANS]<small>/);
  assert.doesNotMatch(output, /data-pattern=/);
  assert.match(output, /120 ticks\/min/);
});

test("marks the currently sounding tick", () => {
  const output = renderMetronomeOutput({ beat: 2, pattern: "ANNN" });
  assert.match(output, /metronome-tick metronome-tick-normal active[^>]*data-tick-index="1"/);
});
