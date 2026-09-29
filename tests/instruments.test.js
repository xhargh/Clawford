import test from "node:test";
import assert from "node:assert/strict";
import { getFretboardFrets } from "../js/instruments.js";

test("uses seven fretboard frets for guitar and keeps the existing range for other instruments", () => {
  assert.equal(getFretboardFrets("guitar"), 7);
  assert.equal(getFretboardFrets("banjo5"), 5);
  assert.equal(getFretboardFrets("mandolin"), 5);
});
