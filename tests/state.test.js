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

test("accepts the tuner view", () => {
  const state = stateFromSources(null, new URLSearchParams("view=tuner"), validValues);
  assert.equal(state.view, "tuner");
});

test("accepts and serializes the harmony view and seventh-chord preference", () => {
  const state = stateFromSources(null, new URLSearchParams("view=harmony&harmonySevenths=true"), validValues);
  assert.equal(state.view, "harmony");
  assert.equal(state.harmonySevenths, true);
  assert.equal(stateToSearchParams(state).get("view"), "harmony");
  assert.equal(stateToSearchParams(state).get("harmonySevenths"), "true");
});

test("validates and persists tuner settings", () => {
  const state = stateFromSources({ tunerMode: "tuning", tunerA4: 442 }, new URLSearchParams(), validValues);
  assert.equal(state.tunerMode, "tuning");
  assert.equal(state.tunerA4, 442);

  const params = stateToSearchParams({ ...DEFAULT_STATE, tunerMode: "tuning", tunerA4: 442 });
  assert.equal(params.get("tunerMode"), "tuning");
  assert.equal(params.get("tunerA4"), "442");
});

test("rejects tuner A4 values outside the calibration range", () => {
  assert.equal(stateFromSources({ tunerA4: 399 }, new URLSearchParams(), validValues).tunerA4, DEFAULT_STATE.tunerA4);
  assert.equal(stateFromSources({ tunerA4: 481 }, new URLSearchParams(), validValues).tunerA4, DEFAULT_STATE.tunerA4);
});

test("persists chord root and quality independently from key/scale", () => {
  const withChordValidValues = { ...validValues, chordRoots: ["G", "C"], chordQualities: ["major", "dom7"] };
  const state = stateFromSources(null, new URLSearchParams("chordRoot=C&chordQuality=dom7"), withChordValidValues);
  assert.equal(state.chordRoot, "C");
  assert.equal(state.chordQuality, "dom7");
  assert.equal(state.key, DEFAULT_STATE.key);

  const params = stateToSearchParams({ ...DEFAULT_STATE, chordRoot: "C", chordQuality: "dom7" });
  assert.equal(params.get("chordRoot"), "C");
  assert.equal(params.get("chordQuality"), "dom7");
});

test("defaults chord root and quality to G major", () => {
  assert.equal(DEFAULT_STATE.chordRoot, "G");
  assert.equal(DEFAULT_STATE.chordQuality, "major");
});

test("accepts and serializes metronome settings", () => {
  const state = stateFromSources(null, new URLSearchParams("view=metronome&metronomeBpm=140&metronomeNumerator=6&metronomeDenominator=8&metronomeOddAccent=true"), validValues);
  assert.equal(state.view, "metronome");
  assert.equal(state.metronomeBpm, 140);
  assert.equal(state.metronomeNumerator, 6);
  assert.equal(state.metronomeDenominator, 8);
  assert.equal(state.metronomeOddAccent, true);

  const params = stateToSearchParams(state);
  assert.equal(params.get("metronomeBpm"), "140");
  assert.equal(params.get("metronomeDenominator"), "8");
});
