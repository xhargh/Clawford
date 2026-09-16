import test from "node:test";
import assert from "node:assert/strict";
import { beatDurationSeconds, beatPattern } from "../js/metronome.js";

test("uses denominator note value for beat duration", () => {
  assert.equal(beatDurationSeconds(120, 4), 0.5);
  assert.equal(beatDurationSeconds(120, 8), 0.25);
});

test("6/8 produces six beats", () => {
  assert.deepEqual(beatPattern({ numerator: 6 }).map(({ beat }) => beat), [1, 2, 3, 4, 5, 6]);
});

test("accent options mark odd-numbered beats", () => {
  assert.deepEqual(beatPattern({ numerator: 6, firstBeatAccent: false, oddBeatAccent: true }).map(({ accent }) => accent), [true, false, true, false, true, false]);
});
