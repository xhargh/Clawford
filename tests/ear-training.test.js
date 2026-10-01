import test from "node:test";
import assert from "node:assert/strict";
import { createEarTrainingSession, matchPitch, PitchAnswerGate } from "../js/ear-training.js";
import { BUILT_IN_TUNINGS } from "../js/tunings.js";
import { getKey, getScale } from "../js/scales.js";

const tuning = BUILT_IN_TUNINGS.find((item) => item.id === "open-g");
const settings = { tuning, key: getKey("G"), scale: getScale("major"), random: () => 0 };

test("matches an exact octave while tolerating cents", () => {
  assert.equal(matchPitch({ targetMidi: 59, frequency: 246.94 }), true);
  assert.equal(matchPitch({ targetMidi: 59, frequency: 250, toleranceCents: 35 }), true);
  assert.equal(matchPitch({ targetMidi: 59, frequency: 493.88 }), false);
});

test("Find repeats a wrong target and advances after a correct answer", () => {
  const session = createEarTrainingSession({ ...settings, exercise: "find" });
  const first = session.start();
  assert.equal(first.type, "play-target");
  assert.deepEqual(first.notes, [first.target]);

  const wrong = session.submitPitch(first.target.midi + 1);
  assert.equal(wrong.type, "repeat-target");
  assert.deepEqual(wrong.notes, [first.target]);

  const correct = session.submitPitch(first.target.midi);
  assert.equal(correct.type, "advance");
  assert.deepEqual(correct.notes, [first.target, correct.target]);
  assert.equal(session.state.streak, 1);
});

test("Open strings asks for the correct string, not just the pitch", () => {
  const session = createEarTrainingSession({ ...settings, variant: "open-string", random: () => 0 });
  const first = session.start();
  assert.equal(first.target.fret, 0);
  assert.equal(session.submitPitch(first.target.midi, first.target.string + 1).type, "repeat-target");
  assert.equal(session.submitPitch(first.target.midi, first.target.string).type, "advance");
});

test("Open strings accepts a correct pitch from the instrument microphone", () => {
  const session = createEarTrainingSession({ ...settings, variant: "open-string", random: () => 0 });
  const first = session.start();
  assert.equal(session.submitPitch(first.target.midi).type, "advance");
});

test("only supports one-note and find-the-string training", () => {
  assert.throws(() => createEarTrainingSession({ ...settings, exercise: "simon" }), /Invalid exercise/);
  assert.throws(() => createEarTrainingSession({ ...settings, variant: "free" }), /Invalid variant/);
});

test("pitch answers require a stable, confident note and a fresh attack", () => {
  const gate = new PitchAnswerGate({ targetMidi: 59, windowSize: 2 });
  const estimate = (frequency, overrides = {}) => ({ frequency, confidence: 0.95, isSilent: false, ...overrides });

  assert.equal(gate.update(estimate(246.94)).accepted, false);
  assert.equal(gate.update(estimate(246.94)).midi, 59);
  assert.equal(gate.update(estimate(246.94)).accepted, false);
  assert.equal(gate.update({ frequency: null, confidence: 0, isSilent: true }).status, "released");
  assert.equal(gate.update(estimate(246.94)).accepted, false);
  assert.equal(gate.update(estimate(246.94)).accepted, true);
});
