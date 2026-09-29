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

test("Follow generates consecutive targets on one low-position string", () => {
  const session = createEarTrainingSession({ ...settings, exercise: "follow", random: () => 0.2 });
  const first = session.start();
  const second = session.submitPitch(first.target.midi);
  assert.equal(second.type, "advance");
  assert.equal(second.target.sourceString, first.target.sourceString);
  assert.ok(Math.abs(second.target.midi - first.target.midi) <= 4);
  assert.ok(second.target.fret <= 5);
});

test("Simon grows after a complete answer and replays after an error", () => {
  const session = createEarTrainingSession({ ...settings, exercise: "simon", random: () => 0 });
  const first = session.start();
  assert.equal(first.sequence.length, 1);

  const extended = session.submitSimonPitch(first.sequence[0].midi);
  assert.equal(extended.type, "extend-sequence");
  assert.equal(extended.sequence.length, 2);
  assert.notEqual(extended.sequence[0].midi, extended.sequence[1].midi);

  const replay = session.submitSimonPitch(extended.sequence[0].midi + 1);
  assert.equal(replay.type, "repeat-sequence");
  assert.deepEqual(replay.sequence, extended.sequence);
  assert.equal(session.state.streak, 0);
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
