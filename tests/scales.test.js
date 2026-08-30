import test from "node:test";
import assert from "node:assert/strict";
import { getKey, getScale, keySignatureFor, scalePitchClasses, spellScale } from "../js/scales.js";

test("generates scale pitch classes", () => {
  assert.deepEqual(scalePitchClasses(7, getScale("major").intervals), [7, 9, 11, 0, 2, 4, 6]);
});

test("derives conventional key signatures for each scale mode", () => {
  assert.deepEqual(keySignatureFor(getKey("G"), getScale("major")), [{ letter: "F", accidental: "#" }]);
  assert.deepEqual(keySignatureFor(getKey("F"), getScale("major")), [{ letter: "B", accidental: "b" }]);
  assert.deepEqual(keySignatureFor(getKey("G"), getScale("mixolydian")), []);
  assert.deepEqual(keySignatureFor(getKey("G"), getScale("dorian")), [{ letter: "B", accidental: "b" }]);
  assert.deepEqual(keySignatureFor(getKey("Gb"), getScale("natural-minor")), []);
});

test("spells seven-note scales in key context", () => {
  assert.deepEqual(spellScale(getKey("G"), getScale("major")), ["G", "A", "B", "C", "D", "E", "F#"]);
  assert.deepEqual(spellScale(getKey("F"), getScale("major")), ["F", "G", "A", "Bb", "C", "D", "E"]);
  assert.deepEqual(spellScale(getKey("D"), getScale("major")), ["D", "E", "F#", "G", "A", "B", "C#"]);
  assert.deepEqual(spellScale(getKey("Gb"), getScale("natural-minor")), ["Gb", "Ab", "Bbb", "Cb", "Db", "Ebb", "Fb"]);
});
