import test from "node:test";
import assert from "node:assert/strict";
import { estimatePitch, PitchStabilizer } from "../js/audio/pitch-detector.js";

test("reports RMS and silence for a silent frame", () => {
  const result = estimatePitch(new Float32Array(1024), { sampleRate: 44100 });

  assert.equal(result.frequency, null);
  assert.equal(result.rms, 0);
  assert.equal(result.isSilent, true);
  assert.equal(result.confidence, 0);
});

test("estimates the frequency of a clear tone", () => {
  const sampleRate = 44100;
  const frequency = 440;
  const samples = Float32Array.from({ length: 4096 }, (_, index) =>
    Math.sin((2 * Math.PI * frequency * index) / sampleRate)
  );

  const result = estimatePitch(samples, { sampleRate });

  assert.ok(Math.abs(result.frequency - frequency) < 2, `${result.frequency} Hz`);
  assert.ok(result.confidence > 0.8, `${result.confidence}`);
  assert.ok(result.rms > 0.6);
  assert.equal(result.isSilent, false);
});

test("stabilizes nearby estimates and ignores one frequency outlier", () => {
  const stabilizer = new PitchStabilizer({ windowSize: 3 });
  const estimate = (frequency) => ({ frequency, confidence: 0.95, rms: 0.5, isSilent: false });

  assert.equal(stabilizer.update(estimate(440)).stable, false);
  assert.equal(stabilizer.update(estimate(442)).stable, false);
  assert.equal(stabilizer.update(estimate(441)).frequency, 441);
  assert.equal(stabilizer.update(estimate(880)).frequency, 441);
  assert.equal(stabilizer.update(estimate(441)).stable, true);
});
