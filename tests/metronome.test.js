import test from "node:test";
import assert from "node:assert/strict";
import { beatDurationSeconds, beatPattern, Metronome } from "../js/metronome.js";

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

test("applies a BPM change after the next tick without restarting the beat", async () => {
  const intervals = [];
  const timeouts = new Map();
  let nextTimer = 1;
  const originalSetInterval = globalThis.setInterval;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const context = createFakeAudioContext();
  const beats = [];
  globalThis.setInterval = (callback) => {
    intervals.push(callback);
    return intervals.length;
  };
  globalThis.setTimeout = (callback, delay) => {
    const id = nextTimer++;
    timeouts.set(id, { callback, delay });
    return id;
  };
  globalThis.clearTimeout = (id) => timeouts.delete(id);
  try {
    const metronome = new Metronome({ createAudioContext: () => context, onBeat: (beat) => beats.push(beat) });
    await metronome.start({ bpm: 120, numerator: 4, denominator: 4 });
    metronome.updateBpm(60);
    context.currentTime = 0.02;
    intervals[0]();
    assert.deepEqual(context.clickTimes, [0.05]);

    context.currentTime = 1;
    intervals[0]();
    assert.deepEqual(context.clickTimes, [0.05, 1.05]);
    assert.equal(beats.length, 0);
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

function createFakeAudioContext() {
  const context = {
    currentTime: 0,
    state: "running",
    destination: {},
    clickTimes: [],
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
          cancelScheduledValues() {}
        },
        connect() {}
      };
    },
    createOscillator() {
      return {
        type: "",
        frequency: { setValueAtTime() {} },
        connect() {},
        start: (time) => context.clickTimes.push(time),
        stop() {}
      };
    },
    async resume() {},
    async suspend() {},
    async close() { this.state = "closed"; }
  };
  return context;
}
