import test from "node:test";
import assert from "node:assert/strict";
import { centsOffset, frequencyToNote, getPitchClass, midiToPitch, noteToFrequency, parsePitch, toDisplayedMidi, transpose } from "../js/pitch.js";

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

test("writes banjo notation one octave above sounding pitch", () => {
  const d3 = parsePitch("D3").midi;
  assert.equal(toDisplayedMidi(d3, "written"), parsePitch("D4").midi);
  assert.equal(toDisplayedMidi(d3, "sounding"), d3);
});

test("converts between note names and frequencies using A4", () => {
  assert.equal(noteToFrequency("A4"), 440);
  assert.ok(Math.abs(noteToFrequency("C4") - 261.625565) < 0.000001);
  assert.equal(frequencyToNote(440).note, "A4");
  assert.equal(frequencyToNote(440, { a4: 442 }).note, "A4");
});

test("calculates cents from a target note with a configurable A4", () => {
  assert.ok(Math.abs(centsOffset(445, "A4") - 19.562) < 0.001);
  assert.equal(centsOffset(442, "A4", { a4: 442 }), 0);
});
