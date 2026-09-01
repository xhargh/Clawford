import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STATE, stateFromSources, stateToSearchParams } from "../js/state.js";

const validValues = {
  tunings: ["open-g", "double-c"],
  keys: ["G", "F"],
  scales: ["major", "dorian"]
};

test("URL state takes precedence for visible settings", () => {
  const state = stateFromSources({ key: "G", scale: "dorian" }, new URLSearchParams("key=F&scale=bogus"), validValues);
  assert.equal(state.key, "F");
  assert.equal(state.scale, "dorian");
});

test("serializes only visible settings", () => {
  const params = stateToSearchParams({ ...DEFAULT_STATE, key: "F", showOctave: true, notationLayout: "stair" });
  assert.equal(params.get("key"), "F");
  assert.equal(params.has("showOctave"), false);
  assert.equal(params.has("notationLayout"), false);
});

test("enforces fixed simplified settings including String columns", () => {
  const params = new URLSearchParams("maxFret=22&fifthMode=included&preference=lower-string&displayMode=chromatic&notationLayout=columns&notationOctave=2");
  const state = stateFromSources({ showNoteSymbols: false, rangeMode: "notes" }, params, validValues);
  assert.equal(state.maxFret, 5);
  assert.equal(state.fifthMode, "excluded");
  assert.equal(state.preference, "all");
  assert.equal(state.displayMode, "scale");
  assert.equal(state.notationLayout, "strings");
  assert.equal(state.notationOctave, 0);
  assert.equal(state.rangeMode, "auto");
});

test("rejects the removed combined view", () => {
  const state = stateFromSources(null, new URLSearchParams("view=both"), validValues);
  assert.equal(state.view, "notation");
});
