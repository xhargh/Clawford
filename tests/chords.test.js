import test from "node:test";
import assert from "node:assert/strict";
import { CHORD_QUALITIES, findChordVoicing, generateChordBoardNotes, hasChordVoicing } from "../js/chords.js";
import { BUILT_IN_TUNINGS, createCustomTuning } from "../js/tunings.js";

const tuning = (id) => BUILT_IN_TUNINGS.find((item) => item.id === id);

test("finds the lowest complete four-string voicing for an open-position major chord", () => {
  const voicing = findChordVoicing(tuning("open-g"), 7, "major"); // G major on Open G
  assert.ok(voicing);
  assert.equal(voicing.highestFret, 0);
  assert.ok(voicing.notes.every((note) => note.isOpen));
  assert.ok(voicing.notes.some((note) => note.isRoot));
});

test("covers every defining chord tone using only chord-tone pitch classes", () => {
  const voicing = findChordVoicing(tuning("open-g"), 0, "dom7"); // C7, no open C7 shape
  assert.ok(voicing);
  const pcs = new Set([0, 4, 7, 10]);
  assert.ok(voicing.notes.every((note) => pcs.has(note.pitchClass)));
  assert.ok([...pcs].every((pc) => voicing.notes.some((note) => note.pitchClass === pc)));
});

test("allows inversions when no root-in-bass shape is available at the lowest position", () => {
  const voicing = findChordVoicing(tuning("open-g"), 1, "power5"); // C#5, unusual root for Open G
  assert.ok(voicing);
});

test("returns null when no complete voicing exists within the search cap", () => {
  const voicing = findChordVoicing(tuning("open-g"), 1, "dom7", { maxSearchFret: 1 });
  assert.equal(voicing, null);
  assert.equal(hasChordVoicing(tuning("open-g"), 1, "dom7", { maxSearchFret: 1 }), false);
});

test("still finds a duplicate-pitch tuning's voicings by fretting strings independently", () => {
  const custom = createCustomTuning("Unison", ["C4", "C4", "C4", "C4", "C4"]);
  assert.ok(findChordVoicing(custom, 0, "dom7"));
  assert.ok(hasChordVoicing(custom, 0, "major"));
});

test("generates a board that grows to the shape's highest fret and marks the selected notes", () => {
  const board = generateChordBoardNotes(tuning("open-g"), 7, "major");
  assert.equal(board.displayMaxFret, 5);
  assert.ok(board.tones.some((tone) => tone.isSelected));
  assert.ok(board.tones.some((tone) => !tone.isSelected));
  assert.ok(board.tones.every((tone) => tone.fret <= board.displayMaxFret));
});

test("every chord quality is defined with a root-relative interval set", () => {
  assert.equal(CHORD_QUALITIES.length, 10);
  assert.ok(CHORD_QUALITIES.every((quality) => quality.intervals[0] === 0));
});
