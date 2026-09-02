import test from "node:test";
import assert from "node:assert/strict";
import { INSTRUMENTS, getInstrument } from "../js/instruments.js";
import { BUILT_IN_TUNINGS, createCustomTuning } from "../js/tunings.js";

test("every built-in tuning belongs to a known instrument", () => {
  const instrumentIds = new Set(INSTRUMENTS.map((instrument) => instrument.id));
  assert.ok(BUILT_IN_TUNINGS.every((tuning) => instrumentIds.has(tuning.instrument)));
});

test("provides tunings for banjo (5- and 4-string), guitar, bass, mandolin, and ukulele", () => {
  const byInstrument = (id) => BUILT_IN_TUNINGS.filter((tuning) => tuning.instrument === id);
  assert.equal(byInstrument("banjo5").length, 4);
  assert.equal(byInstrument("banjo4").length, 2);
  assert.equal(byInstrument("guitar").length, 1);
  assert.equal(byInstrument("bass").length, 1);
  assert.equal(byInstrument("mandolin").length, 1);
  assert.equal(byInstrument("ukulele").length, 2);
});

test("ukulele includes both C and D tunings", () => {
  const ukulele = BUILT_IN_TUNINGS.filter((tuning) => tuning.instrument === "ukulele");
  assert.deepEqual(ukulele.map((tuning) => tuning.id).sort(), ["ukulele-c", "ukulele-d"]);
  const cTuning = ukulele.find((tuning) => tuning.id === "ukulele-c");
  assert.deepEqual(cTuning.strings.map((string) => string.pitch), ["G4", "C4", "E4", "A4"]);
  const dTuning = ukulele.find((tuning) => tuning.id === "ukulele-d");
  assert.deepEqual(dTuning.strings.map((string) => string.pitch), ["A4", "D4", "F#4", "B4"]);
});

test("only the 5-string banjo tunings have a drone string", () => {
  for (const tuning of BUILT_IN_TUNINGS) {
    const droneStrings = tuning.strings.filter((string) => string.kind === "drone");
    if (tuning.instrument === "banjo5") assert.equal(droneStrings.length, 1, tuning.id);
    else assert.equal(droneStrings.length, 0, tuning.id);
  }
});

test("getInstrument looks up an instrument by id", () => {
  assert.equal(getInstrument("guitar").name, "Guitar");
  assert.equal(getInstrument("nonexistent"), undefined);
});

test("createCustomTuning defaults five pitches to a banjo5-style tuning with a fifth-string drone", () => {
  const custom = createCustomTuning("Test", ["D4", "B3", "G3", "D3", "G4"]);
  assert.equal(custom.instrument, "banjo5");
  assert.equal(custom.strings[4].kind, "drone");
});

test("createCustomTuning supports arbitrary string counts for other instruments", () => {
  const custom = createCustomTuning("Test Guitar", ["E2", "A2", "D3", "G3", "B3", "E4"], { instrument: "guitar" });
  assert.equal(custom.strings.length, 6);
  assert.ok(custom.strings.every((string) => string.kind === "long"));
});

test("createCustomTuning rejects an empty pitch list", () => {
  assert.throws(() => createCustomTuning("Empty", []));
});
