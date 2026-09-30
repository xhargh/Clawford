import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STATE, updateSettings } from "../js/state.js";
import { INSTRUMENTS } from "../js/instruments.js";
import { BUILT_IN_TUNINGS } from "../js/tunings.js";

const valid = {
  instruments: INSTRUMENTS.map(({ id }) => id),
  tunings: BUILT_IN_TUNINGS.map(({ id }) => id),
  keys: ["G", "C"], scales: ["major"], chordRoots: ["G"], chordQualities: ["major"]
};

test("settings transitions preserve independent selections and choose a compatible tuning", () => {
  const previous = { ...DEFAULT_STATE, key: "C", metronomePattern: "ASNN" };
  const next = updateSettings(previous, { instrument: "guitar", tuning: "open-g", metronomeTicks: "6" }, valid, BUILT_IN_TUNINGS);
  assert.equal(next.tuning, BUILT_IN_TUNINGS.find(({ instrument }) => instrument === "guitar").id);
  assert.equal(next.key, "C");
  assert.equal(next.chordRoot, "G");
  assert.equal(next.metronomePattern, "ASNNNN");
  assert.equal(previous.instrument, "banjo5");
});

test("invalid settings retain previous values using the same rules as saved and URL settings", () => {
  const next = updateSettings(DEFAULT_STATE, { tunerA4: "399", metronomeTpm: "1.5", earSequenceLimit: "33", view: "missing", metronomeTicks: "2" }, valid, BUILT_IN_TUNINGS);
  assert.equal(next.tunerA4, 440);
  assert.equal(next.metronomeTpm, 96);
  assert.equal(next.earSequenceLimit, 5);
  assert.equal(next.view, "notation");
  assert.equal(next.metronomePattern, "AN");
});

test("rolling sequence generation is only available for Simon", () => {
  const next = updateSettings(DEFAULT_STATE, { earExercise: "find", earVariant: "rolling" }, valid, BUILT_IN_TUNINGS);
  assert.equal(next.earVariant, "free");
});
