import test from "node:test";
import assert from "node:assert/strict";
import { generateFretboardNotes, generateNotes, positionsForMidi, stringMaxFrets } from "../js/mapping.js";
import { pitchToMidi } from "../js/pitch.js";
import { getKey, getScale } from "../js/scales.js";
import { BUILT_IN_TUNINGS, createCustomTuning } from "../js/tunings.js";

const tuning = (id) => BUILT_IN_TUNINGS.find((item) => item.id === id);
const labels = (positions) => positions.map((position) => `${position.string}:${position.fret}`);

test("includes the Open G beginner reference and every valid position", () => {
  const expected = {
    D3: ["4:0"], E3: ["4:2"], "F#3": ["4:4"], G3: ["3:0", "4:5"],
    A3: ["3:2"], B3: ["2:0", "3:4"], C4: ["2:1", "3:5"], D4: ["1:0", "2:3"],
    E4: ["1:2", "2:5"], "F#4": ["1:4"], G4: ["1:5"]
  };
  for (const [pitch, positions] of Object.entries(expected)) {
    assert.deepEqual(labels(positionsForMidi(pitchToMidi(pitch), tuning("open-g"), { maxFret: 5 })).sort(), positions.sort(), pitch);
  }
});

test("maps other built-in and custom tunings without special cases", () => {
  assert.deepEqual(labels(positionsForMidi(pitchToMidi("C3"), tuning("double-c"))), ["4:0"]);
  assert.deepEqual(labels(positionsForMidi(pitchToMidi("C4"), tuning("sawmill"))), ["2:0", "3:5"]);
  assert.deepEqual(labels(positionsForMidi(pitchToMidi("C3"), tuning("standard-c"))), ["4:0"]);
  const custom = createCustomTuning("A tuning", ["E4", "C#4", "A3", "D3", "A4"]);
  assert.deepEqual(labels(positionsForMidi(pitchToMidi("C#4"), custom)), ["2:0", "3:4"]);
});

test("filters unplayable notes and frets above the limit", () => {
  assert.deepEqual(positionsForMidi(pitchToMidi("C3"), tuning("open-g")), []);
  assert.deepEqual(positionsForMidi(pitchToMidi("A3"), tuning("open-g"), { maxFret: 1 }), []);
});

test("handles fifth string inclusion, drone mode, and numbering", () => {
  assert.deepEqual(labels(positionsForMidi(pitchToMidi("G4"), tuning("open-g"), { fifthMode: "included" })), ["5:5", "1:5"]);
  assert.deepEqual(labels(positionsForMidi(pitchToMidi("A4"), tuning("open-g"), { maxFret: 7, fifthMode: "included", fifthNumbering: "relative" })), ["5:2", "1:7"]);
  assert.ok(!positionsForMidi(pitchToMidi("A4"), tuning("open-g"), { maxFret: 5, fifthMode: "included" }).some((position) => position.string === 5));
  assert.ok(!positionsForMidi(pitchToMidi("Bb4"), tuning("open-g"), { maxFret: 7, fifthMode: "included" }).some((position) => position.string === 5));
  assert.ok(!positionsForMidi(pitchToMidi("A4"), tuning("open-g"), { maxFret: 7, fifthMode: "drone" }).some((position) => position.string === 5));
});

test("chromatic fretboard data retains non-scale notes for secondary highlighting", () => {
  const notes = generateFretboardNotes({ tuning: tuning("open-g"), key: getKey("G"), scale: getScale("major"), displayMode: "chromatic" });
  assert.ok(notes.some((note) => !note.isScaleNote));
  assert.ok(notes.some((note) => note.isTonic));
});

test("generates scale notes with key-appropriate spelling", () => {
  const notes = generateNotes({ tuning: tuning("open-g"), key: getKey("G"), scale: getScale("major") });
  assert.ok(notes.some((note) => note.noteName === "F#"));
  assert.ok(!notes.some((note) => note.noteName === "Gb"));
  assert.ok(notes.every((note) => note.positions.length));
});

test("computes per-string max frets that overlap with the next-higher string, with the default on the highest string", () => {
  const frets = stringMaxFrets(tuning("open-g"), 5);
  assert.equal(frets.get(4), 5); // D3 -> G3 is a perfect fourth (5 semitones)
  assert.equal(frets.get(3), 4); // G3 -> B3 is a major third (4 semitones)
  assert.equal(frets.get(2), 3); // B3 -> D4 is a minor third (3 semitones)
  assert.equal(frets.get(1), 5); // D4 is the highest string, falls back to the default
});
