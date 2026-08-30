import test from "node:test";
import assert from "node:assert/strict";
import { getKey, getScale, scalePitchClasses, spellScale } from "../js/scales.js";

test("generates scale pitch classes", () => {
  assert.deepEqual(scalePitchClasses(7, getScale("major").intervals), [7, 9, 11, 0, 2, 4, 6]);
});

test("spells seven-note scales in key context", () => {
  assert.deepEqual(spellScale(getKey("G"), getScale("major")), ["G", "A", "B", "C", "D", "E", "F#"]);
  assert.deepEqual(spellScale(getKey("F"), getScale("major")), ["F", "G", "A", "Bb", "C", "D", "E"]);
  assert.deepEqual(spellScale(getKey("D"), getScale("major")), ["D", "E", "F#", "G", "A", "B", "C#"]);
  assert.deepEqual(spellScale(getKey("Gb"), getScale("natural-minor")), ["Gb", "Ab", "Bbb", "Cb", "Db", "Ebb", "Fb"]);
});
