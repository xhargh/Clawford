import test from "node:test";
import assert from "node:assert/strict";
import { AudioPlayer } from "../js/audio/player.js";

test("player lazily resumes, schedules notes, and reuses bounded buffers", async () => {
  const context = new FakeAudioContext();
  let creations = 0;
  const player = new AudioPlayer({
    createAudioContext: () => { creations += 1; return context; },
    duration: 0.05,
    cacheSize: 1
  });
  assert.equal(creations, 0);

  await player.playNote({ midi: 62, string: 1, when: 2 });
  await player.playNote(62, 2, { when: 2.5 });
  assert.equal(creations, 1);
  assert.equal(context.resumeCalls, 1);
  assert.deepEqual(context.sources.map((source) => source.startedAt), [2, 2.5]);
  assert.equal(context.buffers.length, 2);

  await player.playNote({ midi: 62, string: 2, when: 3 });
  assert.equal(context.buffers.length, 2, "most recently used one-entry cache should hit");
  await player.dispose();
  assert.equal(context.closeCalls, 1);
});

test("retrigger fades only the previous voice on the same physical string", async () => {
  const context = new FakeAudioContext();
  const player = new AudioPlayer({ createAudioContext: () => context, duration: 0.05 });
  await player.playNote({ midi: 60, string: 1, when: 1 });
  await player.playNote({ midi: 64, string: 2, when: 1 });
  await player.playNote({ midi: 62, string: 1, when: 1.5 });

  assert.deepEqual(context.sources[0].stopCalls, [1.525]);
  assert.deepEqual(context.sources[1].stopCalls, []);
  assert.deepEqual(context.gains[0].gain.ramps, [{ value: 0, time: 1.515 }]);

  context.sources[0].finish();
  player.stopAll();
  assert.deepEqual(context.sources[1].stopCalls, [0.025]);
  assert.deepEqual(context.sources[2].stopCalls, [0.025]);
  await player.dispose();
});

test("grouped notes are prepared before being scheduled as an ordered strum", async () => {
  const context = new FakeAudioContext();
  context.currentTime = 4;
  const player = new AudioPlayer({ createAudioContext: () => context, duration: 0.05 });
  await player.playNotes([
    { midi: 55, string: 4 },
    { midi: 59, string: 3 },
    { midi: 62, string: 2 }
  ], { spread: 0.03 });

  assert.deepEqual(context.sources.map((source) => source.startedAt.toFixed(3)), ["4.005", "4.035", "4.065"]);
  assert.ok(context.gains.every((gain) => gain.gain.sets[0].value === 0.16));
  await player.dispose();
});

class FakeAudioParam {
  value = 1;
  ramps = [];
  sets = [];
  cancellations = [];
  setValueAtTime(value, time) { this.value = value; this.sets.push({ value, time }); }
  linearRampToValueAtTime(value, time) { this.ramps.push({ value, time }); }
  cancelScheduledValues(time) { this.cancellations.push(time); }
}

class FakeNode {
  connectedTo = null;
  disconnected = false;
  connect(destination) { this.connectedTo = destination; }
  disconnect() { this.disconnected = true; }
}

class FakeSource extends FakeNode {
  buffer = null;
  onended = null;
  startedAt = null;
  stopCalls = [];
  start(when) { this.startedAt = when; }
  stop(when) { this.stopCalls.push(when); }
  finish() { this.onended?.({}); }
}

class FakeGain extends FakeNode {
  gain = new FakeAudioParam();
}

class FakeAudioContext {
  sampleRate = 8000;
  state = "suspended";
  currentTime = 0;
  destination = new FakeNode();
  sources = [];
  gains = [];
  buffers = [];
  resumeCalls = 0;
  closeCalls = 0;
  async resume() { this.resumeCalls += 1; this.state = "running"; }
  async close() { this.closeCalls += 1; this.state = "closed"; }
  createBuffer(channels, length, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    const buffer = { numberOfChannels: channels, length, sampleRate, getChannelData: (channel) => data[channel] };
    this.buffers.push(buffer);
    return buffer;
  }
  createBufferSource() { const source = new FakeSource(); this.sources.push(source); return source; }
  createGain() { const gain = new FakeGain(); this.gains.push(gain); return gain; }
}
