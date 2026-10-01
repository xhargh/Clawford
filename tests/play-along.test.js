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
  meterStepCount,
  patternForInstrument,
  resolveChordRole,
  bassNoteForChord,
  customPatternFamily,
  playAlongPosition,
  playAlongTickState,
  beatsPerMeasure,
  stepsPerBeat
} from "../js/play-along.js";

test("ships useful instrument-aware preset patterns", () => {
  assert.equal(PATTERNS.some((pattern) => pattern.instrument === "strum" && pattern.name === "Bum-Ditty"), false);
  assert.ok(PATTERNS.some((pattern) => pattern.instrument === "banjo5-three-finger" && pattern.name === "Forward Roll"));
  assert.deepEqual(actionsForInstrument("guitar"), ["-", "D", "U"]);
  assert.deepEqual(actionsForInstrument("banjo5-clawhammer"), ["-", "N", "B", "T"]);
});

test("defines valid, meter-aware presets for every supported instrument", () => {
  const instruments = ["banjo5-clawhammer", "banjo5-three-finger", "banjo4", "guitar", "ukulele", "mandolin", "bass"];
  const ids = new Set();
  for (const pattern of PATTERNS) {
    assert.ok(instruments.includes(pattern.instrument) || pattern.instrument === "strum");
    assert.ok(pattern.meter.numerator > 0);
    assert.ok([2, 4, 8].includes(pattern.meter.denominator));
    assert.equal(pattern.steps.length, meterStepCount(pattern.meter, pattern.subdivision));
    assert.equal(ids.has(pattern.id), false);
    ids.add(pattern.id);
  }
  for (const instrument of instruments) assert.ok(patternForInstrument(instrument).length > 0);
  assert.equal(patternForInstrument("bass").some((pattern) => pattern.name === "Bum-Ditty"), false);
  assert.equal(patternForInstrument("guitar").some((pattern) => pattern.name === "Forward Roll"), false);
  assert.equal(patternForInstrument("mandolin").some((pattern) => pattern.name === "Island Strum"), false);
  assert.ok(patternForInstrument("banjo5").some((pattern) => pattern.name === "Forward Roll"));
});

test("maps variable meters to positions and chord measures", () => {
  assert.equal(meterStepCount({ numerator: 2, denominator: 4 }, 1), 2);
  assert.equal(meterStepCount({ numerator: 3, denominator: 4 }, 2), 6);
  assert.equal(meterStepCount({ numerator: 4, denominator: 4 }, 2), 8);
  assert.equal(meterStepCount({ numerator: 6, denominator: 8 }, 3), 6);
  assert.equal(meterStepCount({ numerator: 12, denominator: 8 }, 3), 12);
  assert.equal(beatsPerMeasure({ numerator: 6, denominator: 8 }), 2);
  assert.equal(beatsPerMeasure({ numerator: 12, denominator: 8 }), 4);
  assert.equal(stepsPerBeat({ numerator: 6, denominator: 8 }, 3), 3);
  assert.deepEqual(playAlongPosition(6, 4, 6, { numerator: 6, denominator: 8 }, 3), { chordIndex: 1, stepIndex: 0, beat: 1, subdivision: "1" });
});

test("resolves bass roles relative to the active chord", () => {
  assert.deepEqual(resolveChordRole("C", "root"), { root: "C", role: "root", pitchClass: 0 });
  assert.deepEqual(resolveChordRole("C", "fifth"), { root: "C", role: "fifth", pitchClass: 7 });
  assert.deepEqual(resolveChordRole("Am", "octave"), { root: "A", role: "octave", pitchClass: 9 });
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
  assert.deepEqual(playAlongTickState(3, { numerator: 4, denominator: 4 }), { phase: "count-in", count: 4, tick: 0 });
  assert.deepEqual(playAlongTickState(4, { numerator: 4, denominator: 4 }), { phase: "playing", count: 0, tick: 0 });
  assert.deepEqual(playAlongTickState(1, { numerator: 6, denominator: 8 }), { phase: "count-in", count: 2, tick: 0 });
  for (const [meter, beats] of [[[2, 4], 2], [[3, 4], 3], [[4, 4], 4], [[6, 8], 2], [[12, 8], 4]]) {
    const patternMeter = { numerator: meter[0], denominator: meter[1] };
    assert.equal(playAlongTickState(beats - 1, patternMeter).count, beats);
    assert.equal(playAlongTickState(beats, patternMeter).phase, "playing");
  }
});

test("turns chord symbols and pattern actions into playable note roles", () => {
  assert.deepEqual(parseChordSymbol("D7"), { root: "D", quality: "dom7" });
  assert.deepEqual(parseChordSymbol("Em"), { root: "E", quality: "minor" });
  assert.deepEqual(patternNoteIndexes("-", "strum", 4), []);
  assert.deepEqual(patternNoteIndexes("D", "strum", 4), [3, 2, 1, 0]);
  assert.deepEqual(patternNoteIndexes("T", "banjo5-three-finger", 4), [0]);
  assert.deepEqual(patternNoteIndexes("M", "banjo5-three-finger", 4), [2]);
  assert.deepEqual(patternNoteIndexes("B", "guitar", 4, null, [
    { midi: 72, role: "root" }, { midi: 60, role: "octave" }, { midi: 67, role: "fifth" }, { midi: 64, role: null }
  ]), [1]);
});

test("bass roles resolve to playable chord-relative pitches", () => {
  const tuning = { strings: [{ number: 4, pitch: "E1" }, { number: 3, pitch: "A1" }, { number: 2, pitch: "D2" }, { number: 1, pitch: "G2" }] };
  for (const [chord, root, fifth] of [["C", 0, 7], ["G", 7, 2], ["Am", 9, 4], ["D7", 2, 9]]) {
    const rootNote = bassNoteForChord(chord, "R", tuning);
    const fifthNote = bassNoteForChord(chord, "5", tuning);
    const octaveNote = bassNoteForChord(chord, "8", tuning);
    assert.equal(rootNote.midi % 12, root);
    assert.equal(fifthNote.midi % 12, fifth);
    assert.equal(octaveNote.midi, rootNote.midi + 12);
  }
});

test("clawhammer actions keep single notes, brushes, and thumbs distinct", () => {
  const notes = [{ string: 3 }, { string: 2 }, { string: 1 }, { string: 5 }];
  assert.deepEqual(patternNoteIndexes("N", "banjo5-clawhammer", notes.length, [3, 2, 1], notes), [0]);
  assert.deepEqual(patternNoteIndexes("B", "banjo5-clawhammer", notes.length, [3, 2, 1], notes), [0, 1, 2]);
  assert.deepEqual(patternNoteIndexes("T", "banjo5-clawhammer", notes.length, [5], notes), [3]);
});

test("custom pattern vocabulary follows instrument and banjo technique", () => {
  assert.equal(customPatternFamily("guitar"), "guitar");
  assert.equal(customPatternFamily("bass"), "bass");
  assert.equal(customPatternFamily("banjo5", "clawhammer"), "banjo5-clawhammer");
  assert.equal(customPatternFamily("banjo5", "three-finger"), "banjo5-three-finger");
  assert.deepEqual(actionsForInstrument(customPatternFamily("bass")), ["-", "R", "5", "8"]);
  assert.notDeepEqual(actionsForInstrument(customPatternFamily("banjo5", "clawhammer")), actionsForInstrument(customPatternFamily("banjo5", "three-finger")));
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
  const clawhammer = PATTERNS.find((pattern) => pattern.id === "clawhammer-bum-ditty-4");
  assert.deepEqual(roll.steps, ["T", "I", "M", "T", "I", "M", "T", "I"]);
  assert.deepEqual(roll.targets, [5, 2, 1, 5, 2, 1, 5, 2]);
  assert.deepEqual(clawhammer.targets, undefined);
  assert.deepEqual(PATTERNS.find((pattern) => pattern.id === "clawhammer-waltz").grouping, [2, 2, 2]);
});

test("strum velocity is strongest at the start and responds to accents", () => {
  assert.ok(patternNoteVelocity("D", 0, 5) > patternNoteVelocity("D", 4, 5));
  assert.ok(patternNoteVelocity("U", 0, 5) > patternNoteVelocity("U", 4, 5));
  assert.ok(patternNoteVelocity("D", 1, 5, 1.1) > patternNoteVelocity("D", 1, 5));
});
