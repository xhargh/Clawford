import test from "node:test";
import assert from "node:assert/strict";
import { BANJO_PROFILE, GUITAR_PROFILE, renderPluck } from "../js/audio/synth.js";

test("renderPluck is deterministic, finite, and decays", () => {
  const options = {
    midi: 62,
    string: 1,
    profile: BANJO_PROFILE,
    sampleRate: 12000,
    duration: 1,
    seed: 1234
  };
  const first = renderPluck(options);
  const second = renderPluck(options);
  assert.deepEqual(first, second);
  assert.equal(first.length, 12000);
  assert.ok(first.every(Number.isFinite));
  assert.ok(first.some((sample) => sample !== 0));
  assert.ok(rms(first.subarray(9000, 11000)) < rms(first.subarray(1000, 3000)));
  assert.equal(first.at(-1), 0);
});

test("profiles support six strings and arbitrary physical string numbers", () => {
  assert.equal(renderPluck({ midi: 40, string: 6, profile: GUITAR_PROFILE, sampleRate: 8000, duration: 0.1 }).length, 800);
  const custom = {
    strings: [{ number: 42, damping: 0.99, excitation: 0.8, brightness: 0.5 }],
    bodyMix: 0,
    bodyResonances: []
  };
  assert.equal(renderPluck({ midi: 60, string: 42, profile: custom, sampleRate: 8000, duration: 0.1 }).length, 800);
  assert.throws(() => renderPluck({ midi: 60, string: 7, profile: GUITAR_PROFILE }), /no physical string 7/);
});

function rms(samples) {
  return Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
}
