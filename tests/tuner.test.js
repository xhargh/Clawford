import test from "node:test";
import assert from "node:assert/strict";
import { BUILT_IN_TUNINGS } from "../js/tunings.js";
import { selectTunerTargets } from "../js/tuner.js";

test("selects the tuning strings as tuner targets", () => {
  const tuning = BUILT_IN_TUNINGS.find((item) => item.id === "open-g");
  const targets = selectTunerTargets({ mode: "tuning", tuning });

  assert.deepEqual(targets.map(({ string, pitch }) => ({ string, pitch })), [
    { string: 1, pitch: "D4" },
    { string: 2, pitch: "B3" },
    { string: 3, pitch: "G3" },
    { string: 4, pitch: "D3" },
    { string: 5, pitch: "G4" }
  ]);
});

test("selects the full chromatic MIDI range", () => {
  const targets = selectTunerTargets({ mode: "chromatic" });
  assert.equal(targets.length, 128);
  assert.deepEqual(targets[69], { midi: 69, pitch: "A4" });
});
