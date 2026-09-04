import test from "node:test";
import assert from "node:assert/strict";
import { generateScaleBoardNotes } from "../js/scale-board.js";
import { CHROMATIC_SCALE, getKey, getScale } from "../js/scales.js";
import { BUILT_IN_TUNINGS } from "../js/tunings.js";

const openG = BUILT_IN_TUNINGS.find((item) => item.id === "open-g");

test("generates every matching scale tone through fret 5 and excludes the drone string", () => {
  const board = generateScaleBoardNotes(openG, getKey("G"), getScale("major"));
  const pitchClasses = new Set([7, 9, 11, 0, 2, 4, 6]);

  assert.equal(board.displayMaxFret, 5);
  assert.ok(board.tones.length > 0);
  assert.ok(board.tones.every((tone) => tone.string !== 5));
  assert.ok(board.tones.every((tone) => tone.fret <= 5 && pitchClasses.has(tone.pitchClass)));
});

test("selects the lowest scale tone per string and accepts valid overrides", () => {
  const initial = generateScaleBoardNotes(openG, getKey("G"), getScale("major"));
  const initialSelected = initial.tones.filter((tone) => tone.isSelected);
  assert.equal(initialSelected.length, 4);
  assert.deepEqual(initialSelected.map((tone) => tone.fret), [0, 0, 0, 0]);

  const overridden = generateScaleBoardNotes(openG, getKey("G"), getScale("major"), {
    selectedFretsByString: new Map([[1, 2], [2, 2]])
  });
  const selected = overridden.tones.filter((tone) => tone.isSelected);
  assert.equal(selected.find((tone) => tone.string === 1).fret, 2);
  assert.equal(selected.find((tone) => tone.string === 2).fret, 0);
});

test("a chromatic scale includes every fret and keeps the selected root", () => {
  const board = generateScaleBoardNotes(openG, getKey("Bb"), CHROMATIC_SCALE);

  assert.equal(board.tones.length, 4 * 6);
  assert.ok(board.tones.some((tone) => tone.isRoot));
  assert.ok(board.tones.some((tone) => tone.noteName === "Bb"));
});

test("uses the scale's diatonic spelling", () => {
  const board = generateScaleBoardNotes(openG, getKey("Gb"), getScale("major"));
  const names = new Set(board.tones.map((tone) => tone.noteName));

  assert.ok(names.has("Cb"));
  assert.equal(names.has("B"), false);
});
