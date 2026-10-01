import test from "node:test";
import assert from "node:assert/strict";
import { getChordShapes, getPreferredChordShape, validateChordShape } from "../js/chord-shapes.js";
import { BUILT_IN_TUNINGS } from "../js/tunings.js";

const tuning = (id) => BUILT_IN_TUNINGS.find((item) => item.id === id);

test("looks up the imported standard guitar C shape with explicit string states", () => {
  const shapes = getChordShapes({ instrumentId: "guitar", tuning: tuning("guitar-standard"), rootPitchClass: 0, qualityId: "major" });
  assert.ok(shapes.length > 0);
  assert.deepEqual(shapes[0].frets, [-1, 3, 2, 0, 1, 0]);
  assert.deepEqual(shapes[0].fingers, [0, 3, 2, 0, 1, 0]);
  assert.equal(shapes[0].source.license, "MIT");
});

test("does not apply a standard shape to another tuning", () => {
  assert.deepEqual(getChordShapes({ instrumentId: "guitar", tuning: tuning("guitar-dadgad"), rootPitchClass: 0, qualityId: "major" }), []);
});

test("enharmonic roots share physical shapes", () => {
  const sharp = getChordShapes({ instrumentId: "guitar", tuning: tuning("guitar-standard"), rootPitchClass: 1, qualityId: "major" });
  const flat = getChordShapes({ instrumentId: "guitar", tuning: tuning("guitar-standard"), rootPitchClass: 1, qualityId: "major" });
  assert.deepEqual(sharp, flat);
});

test("banjo keeps its short drone separate from four full-length strings", () => {
  const shape = getPreferredChordShape({ instrumentId: "banjo5", tuning: tuning("open-g"), rootPitchClass: 7, qualityId: "major" });
  assert.deepEqual(shape.frets, [0, 0, 0, 0]);
  assert.deepEqual(shape.drone, { state: "open" });
});

test("published uke and mandolin shapes use their logical string/course order", () => {
  const uke = getPreferredChordShape({ instrumentId: "ukulele", tuning: tuning("ukulele-c"), rootPitchClass: 0, qualityId: "major" });
  const mandolin = getPreferredChordShape({ instrumentId: "mandolin", tuning: tuning("mandolin-standard"), rootPitchClass: 0, qualityId: "major" });
  assert.deepEqual(uke.frets, [0, 0, 0, 3]);
  assert.deepEqual(mandolin.frets, [0, 2, 3, 0]);
});

test("a banjo drone is muted when its open pitch is outside the chord", () => {
  const shape = getPreferredChordShape({ instrumentId: "banjo5", tuning: tuning("open-g"), rootPitchClass: 2, qualityId: "major" });
  assert.equal(shape.drone.state, "mute");
});

test("validation allows a normal fifth omission but requires chord-defining tones", () => {
  const shape = getPreferredChordShape({ instrumentId: "guitar", tuning: tuning("guitar-standard"), rootPitchClass: 0, qualityId: "major" });
  assert.equal(validateChordShape(shape, tuning("guitar-standard")), true);
  assert.equal(validateChordShape({ ...shape, frets: [0, 0, 0, 0, 0, 0] }, tuning("guitar-standard")), false);
});
