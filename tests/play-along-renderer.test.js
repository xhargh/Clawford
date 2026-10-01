import test from "node:test";
import assert from "node:assert/strict";
import { renderPlayAlongOutput } from "../js/play-along-renderer.js";
import { getPreferredChordShape } from "../js/chord-shapes.js";
import { BUILT_IN_TUNINGS } from "../js/tunings.js";

test("play along includes a compact current chord shape without losing controls", () => {
  const tuning = BUILT_IN_TUNINGS.find((item) => item.id === "guitar-standard");
  const shape = getPreferredChordShape({ instrumentId: "guitar", tuning, rootPitchClass: 0, qualityId: "major" });
  const output = renderPlayAlongOutput({ chords: ["C", "G"], shape, tuning, pattern: ["D", "U"] });
  assert.match(output, /compact-chord-diagram/);
  assert.match(output, />X</);
  assert.match(output, />O</);
  assert.match(output, /play-along-start/);
  assert.match(output, /play-along-step/);
});

test("play along omits shape guidance when no imported shape applies", () => {
  const output = renderPlayAlongOutput({ chords: ["C"], pattern: ["D"] });
  assert.doesNotMatch(output, /compact-chord-diagram/);
});
