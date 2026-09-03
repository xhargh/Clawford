import test from "node:test";
import assert from "node:assert/strict";
import { crossedStrings, selectTone, selectedFretsFromVoicing } from "../js/playback-interactions.js";

test("selection replaces only the chosen string", () => {
  const initial = selectedFretsFromVoicing({ notes: [{ string: 1, fret: 0 }, { string: 2, fret: 3 }] });
  const selected = selectTone(initial, 2, 5);
  assert.deepEqual([...selected], [[1, 0], [2, 5]]);
  assert.deepEqual([...initial], [[1, 0], [2, 3]]);
});

test("finds all strings crossed by fast swipes in physical order", () => {
  const positions = new Map([[4, 65], [3, 117], [2, 169], [1, 221]]);
  assert.deepEqual(crossedStrings(40, 240, positions), [4, 3, 2, 1]);
  assert.deepEqual(crossedStrings(240, 40, positions), [1, 2, 3, 4]);
});

test("does not replay a string at the shared endpoint of consecutive moves", () => {
  const positions = new Map([[3, 100], [2, 150], [1, 200]]);
  assert.deepEqual(crossedStrings(75, 150, positions, true), [3, 2]);
  assert.deepEqual(crossedStrings(150, 210, positions), [1]);
  assert.deepEqual(crossedStrings(150, 90, positions), [3]);
});
