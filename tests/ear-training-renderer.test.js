import test from "node:test";
import assert from "node:assert/strict";
import { renderEarTrainingOutput } from "../js/ear-training-renderer.js";

test("renders a screenless-friendly ear-training status and controls", () => {
  const html = renderEarTrainingOutput({
    exercise: "simon",
    variant: "rolling",
    running: true,
    status: "Listening",
    streak: 3,
    sequenceLength: 5,
    sequenceIndex: 2,
    error: ""
  });
  assert.match(html, /Ear training/);
  assert.match(html, /Listening/);
  assert.match(html, /Streak.*3/);
  assert.match(html, /5 notes/);
  assert.match(html, /Stop/);
  assert.doesNotMatch(html, /undefined/);
});

test("renders microphone errors and a start action", () => {
  const html = renderEarTrainingOutput({ error: "Permission denied" });
  assert.match(html, /Permission denied/);
  assert.match(html, /Start exercise/);
});
