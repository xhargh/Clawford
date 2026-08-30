import test from "node:test";
import assert from "node:assert/strict";
import { getPitchClass, midiToPitch, parsePitch, transpose } from "../js/pitch.js";

test("parses pitches and preserves enharmonic identity numerically", () => {
  assert.equal(parsePitch("C4").midi, 60);
  assert.equal(parsePitch("F#3").midi, 54);
  assert.equal(parsePitch("Gb3").midi, 54);
  assert.equal(getPitchClass("Db4"), 1);
  assert.equal(transpose("D3", 12), 62);
  assert.equal(midiToPitch(70, "flat"), "Bb4");
});

test("rejects malformed and impossible pitches", () => {
  assert.throws(() => parsePitch("H3"), /Invalid pitch/);
  assert.throws(() => parsePitch("C#"), /Invalid pitch/);
  assert.throws(() => parsePitch("C99"), /Invalid pitch/);
});
