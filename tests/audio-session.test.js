import test from "node:test";
import assert from "node:assert/strict";
import { MicrophoneSession } from "../js/audio/microphone-session.js";

test("starts a microphone session with injected browser audio dependencies", async () => {
  const calls = [];
  const track = { stop: () => calls.push("track.stop") };
  const stream = { getTracks: () => [track] };
  const analyser = { connect: () => calls.push("analyser.connect") };
  const source = { connect: (node) => { calls.push(["source.connect", node]); } };
  const context = {
    sampleRate: 48000,
    createAnalyser: () => { calls.push("createAnalyser"); return analyser; },
    createMediaStreamSource: (value) => { calls.push(["createSource", value]); return source; },
    close: async () => calls.push("context.close")
  };
  const session = new MicrophoneSession({
    getUserMedia: async (constraints) => { calls.push(["getUserMedia", constraints]); return stream; },
    createAudioContext: () => { calls.push("createContext"); return context; }
  });

  await session.start();

  assert.equal(session.state, "running");
  assert.equal(session.sampleRate, 48000);
  assert.deepEqual(calls.slice(0, 4), [
    ["getUserMedia", { audio: true }],
    "createContext",
    "createAnalyser",
    ["createSource", stream]
  ]);
  assert.deepEqual(calls[4], ["source.connect", analyser]);
});

test("stops and releases a running microphone session", async () => {
  const calls = [];
  const stream = { getTracks: () => [{ stop: () => calls.push("track.stop") }] };
  const source = {
    connect: () => {},
    disconnect: () => calls.push("source.disconnect")
  };
  const context = {
    state: "running",
    createAnalyser: () => ({}),
    createMediaStreamSource: () => source,
    close: async () => calls.push("context.close")
  };
  const session = new MicrophoneSession({
    getUserMedia: async () => stream,
    createAudioContext: () => context
  });

  await session.start();
  await session.stop();
  await session.stop();

  assert.equal(session.state, "stopped");
  assert.deepEqual(calls, ["source.disconnect", "track.stop", "context.close"]);
});

test("propagates microphone permission errors", async () => {
  const permissionError = new Error("Permission denied");
  let contextCreated = false;
  const session = new MicrophoneSession({
    getUserMedia: async () => { throw permissionError; },
    createAudioContext: () => { contextCreated = true; return {}; }
  });

  await assert.rejects(session.start(), permissionError);
  assert.equal(session.state, "error");
  assert.equal(contextCreated, false);
});

test("reads one time-domain frame from the analyser", async () => {
  const analyser = {
    fftSize: 4,
    getFloatTimeDomainData: (buffer) => buffer.set([0.1, -0.2, 0.3, -0.4])
  };
  const session = new MicrophoneSession({
    getUserMedia: async () => ({ getTracks: () => [] }),
    createAudioContext: () => ({
      createAnalyser: () => analyser,
      createMediaStreamSource: () => ({ connect() {} }),
      close: async () => {}
    })
  });

  await session.start();

  assert.deepEqual([...session.readFrame()].map((value) => Number(value.toFixed(3))), [0.1, -0.2, 0.3, -0.4]);
});

test("suspends and resumes audio processing without losing the session", async () => {
  const calls = [];
  const context = {
    state: "running",
    sampleRate: 44100,
    createAnalyser: () => ({}),
    createMediaStreamSource: () => ({ connect() {}, disconnect() {} }),
    suspend: async () => { calls.push("suspend"); context.state = "suspended"; },
    resume: async () => { calls.push("resume"); context.state = "running"; },
    close: async () => {}
  };
  const session = new MicrophoneSession({
    getUserMedia: async () => ({ getTracks: () => [] }),
    createAudioContext: () => context
  });

  await session.start();
  await session.suspend();
  await session.resume();

  assert.deepEqual(calls, ["suspend", "resume"]);
  assert.equal(session.state, "running");
});

test("dispose permanently ends the session", async () => {
  const session = new MicrophoneSession({
    getUserMedia: async () => ({ getTracks: () => [] }),
    createAudioContext: () => ({
      state: "closed",
      createAnalyser: () => ({}),
      createMediaStreamSource: () => ({ connect() {} }),
      close: async () => {}
    })
  });

  await session.dispose();

  assert.equal(session.state, "disposed");
  await assert.rejects(session.start(), /disposed/);
});
