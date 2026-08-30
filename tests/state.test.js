import test from "node:test";
import assert from "node:assert/strict";
import { parsePitch } from "../js/pitch.js";
import { DEFAULT_STATE, stateFromSources, stateToSearchParams } from "../js/state.js";

const validValues = {
  tunings: ["open-g", "double-c"],
  keys: ["G", "F"],
  scales: ["major", "dorian"]
};

const isValidPitch = (pitch) => {
  try {
    parsePitch(pitch);
    return true;
  } catch {
    return false;
  }
};

test("URL state takes precedence and ignores invalid values individually", () => {
  const params = new URLSearchParams("key=F&scale=bogus&maxFret=7&lowNote=C99&highNote=A4");
  const state = stateFromSources({ key: "G", scale: "dorian", lowNote: "E3" }, params, validValues, isValidPitch);
  assert.equal(state.key, "F");
  assert.equal(state.scale, "dorian");
  assert.equal(state.maxFret, 7);
  assert.equal(state.lowNote, "E3");
  assert.equal(state.highNote, "A4");
});

test("serializes non-default state into query parameters", () => {
  const params = stateToSearchParams({ ...DEFAULT_STATE, key: "F", showOctave: true, notationOctave: 1 });
  assert.equal(params.get("key"), "F");
  assert.equal(params.get("showOctave"), "true");
  assert.equal(params.get("notationOctave"), "1");
  assert.equal(params.has("scale"), false);
});

test("loads only supported written notation octave shifts", () => {
  const shifted = stateFromSources(null, new URLSearchParams("notationOctave=-1"), validValues, isValidPitch);
  const invalid = stateFromSources(null, new URLSearchParams("notationOctave=3"), validValues, isValidPitch);
  assert.equal(shifted.notationOctave, -1);
  assert.equal(invalid.notationOctave, 0);
});
