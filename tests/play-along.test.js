import test from "node:test";
import assert from "node:assert/strict";
import {
  PATTERNS,
  PRESET_PROGRESSIONS,
  actionsForInstrument,
  cyclePatternStep,
  parseChordSymbol,
  patternNoteIndexes,
  patternPlaybackProfile,
  patternNoteVelocity,
  playAlongPosition,
  playAlongTickState
} from "../js/play-along.js";

test("ships useful instrument-aware preset patterns", () => {
  assert.ok(PATTERNS.some((pattern) => pattern.instrument === "strum" && pattern.name === "Bum-Ditty"));
  assert.ok(PATTERNS.some((pattern) => pattern.instrument === "banjo5-three-finger" && pattern.name === "Forward Roll"));
  assert.deepEqual(actionsForInstrument("guitar"), ["-", "D", "U"]);
  assert.deepEqual(actionsForInstrument("banjo5-clawhammer"), ["-", "N", "B", "T"]);
});

test("provides the requested starter progressions", () => {
  assert.deepEqual(PRESET_PROGRESSIONS[0].chords, ["G", "C", "G", "D7"]);
  assert.deepEqual(PRESET_PROGRESSIONS[2].chords, ["C", "F", "G", "C"]);
});

test("cycles a custom pattern cell through its instrument actions", () => {
  assert.equal(cyclePatternStep("-", "guitar"), "D");
  assert.equal(cyclePatternStep("D", "guitar"), "U");
  assert.equal(cyclePatternStep("U", "guitar"), "-");
  assert.equal(cyclePatternStep("T", "banjo5-clawhammer"), "-");
});

test("maps eighth-note ticks to the current measure and pattern step", () => {
  assert.deepEqual(playAlongPosition(0, 4, 8), { chordIndex: 0, stepIndex: 0, beat: 1, subdivision: "1" });
  assert.deepEqual(playAlongPosition(3, 4, 8), { chordIndex: 0, stepIndex: 3, beat: 2, subdivision: "&" });
  assert.deepEqual(playAlongPosition(8, 4, 8), { chordIndex: 1, stepIndex: 0, beat: 1, subdivision: "1" });
});

test("holds the first pattern step until a four-beat count-in completes", () => {
  assert.deepEqual(playAlongTickState(0), { phase: "count-in", count: 1, tick: 0 });
  assert.deepEqual(playAlongTickState(7), { phase: "count-in", count: 8, tick: 0 });
  assert.deepEqual(playAlongTickState(8), { phase: "playing", count: 0, tick: 0 });
  assert.deepEqual(playAlongTickState(11), { phase: "playing", count: 0, tick: 3 });
});

test("turns chord symbols and pattern actions into playable note roles", () => {
  assert.deepEqual(parseChordSymbol("D7"), { root: "D", quality: "dom7" });
  assert.deepEqual(parseChordSymbol("Em"), { root: "E", quality: "minor" });
  assert.deepEqual(patternNoteIndexes("-", "strum", 4), []);
  assert.deepEqual(patternNoteIndexes("D", "strum", 4), [3, 2, 1, 0]);
  assert.deepEqual(patternNoteIndexes("T", "banjo5-three-finger", 4), [0]);
  assert.deepEqual(patternNoteIndexes("M", "banjo5-three-finger", 4), [2]);
});

test("gives down and up strums different audible articulation", () => {
  const down = patternPlaybackProfile("D");
  const up = patternPlaybackProfile("U");
  assert.ok(down.spread > up.spread);
  assert.ok(down.velocity > up.velocity);
  assert.ok(down.duration > up.duration);
});

test("built-in patterns target physical strings without changing their display steps", () => {
  const roll = PATTERNS.find((pattern) => pattern.id === "roll-forward");
  const clawhammer = PATTERNS.find((pattern) => pattern.id === "clawhammer-bum-ditty");
  assert.deepEqual(roll.steps, ["T", "I", "M", "T", "I", "M", "T", "I"]);
  assert.deepEqual(roll.targets, [5, 2, 1, 5, 2, 1, 5, 2]);
  assert.deepEqual(clawhammer.targets, [[3, 2, 1], null, [5], null, [3, 2, 1], null, [5], null]);
});

test("strum velocity is strongest at the start and responds to accents", () => {
  assert.ok(patternNoteVelocity("D", 0, 5) > patternNoteVelocity("D", 4, 5));
  assert.ok(patternNoteVelocity("U", 0, 5) > patternNoteVelocity("U", 4, 5));
  assert.ok(patternNoteVelocity("D", 1, 5, 1.1) > patternNoteVelocity("D", 1, 5));
});
