import test from "node:test";
import assert from "node:assert/strict";
import { TunerLifecycle } from "../js/tuner-lifecycle.js";

function fakeSession(calls) {
  return {
    state: "idle",
    start: async function () { calls.push("start"); this.state = "running"; },
    stop: async function () { calls.push("stop"); this.state = "stopped"; }
  };
}

test("entering starts the tuner and leaving stops it without processing after leave", async () => {
  const calls = [];
  const lifecycle = new TunerLifecycle({
    createSession: () => fakeSession(calls),
    onStarted: () => calls.push("process")
  });

  await lifecycle.enter();
  await lifecycle.leave();

  assert.deepEqual(calls, ["start", "process", "stop"]);
  assert.equal(lifecycle.session, null);
});

test("manual start and stop provide recovery while in tuner mode", async () => {
  const calls = [];
  const lifecycle = new TunerLifecycle({ createSession: () => fakeSession(calls) });

  await lifecycle.start();
  await lifecycle.stop();
  await lifecycle.start();

  assert.deepEqual(calls, ["start", "stop", "start"]);
});

test("does not begin processing when leaving during startup", async () => {
  const calls = [];
  let resolveStart;
  const lifecycle = new TunerLifecycle({
    createSession: () => ({
      state: "idle",
      start: () => new Promise((resolve) => { resolveStart = resolve; }),
      stop: async () => calls.push("stop")
    }),
    onStarted: () => calls.push("process")
  });

  const enterPromise = lifecycle.enter();
  await lifecycle.leave();
  resolveStart();
  await enterPromise;

  assert.deepEqual(calls, ["stop"]);
});

test("allows manual retry after startup fails", async () => {
  const calls = [];
  let attempts = 0;
  const lifecycle = new TunerLifecycle({
    createSession: () => ({
      state: "idle",
      start: async function () {
        attempts += 1;
        if (attempts === 1) throw new Error("denied");
        this.state = "running";
        calls.push("start");
      },
      stop: async () => calls.push("stop")
    })
  });

  await lifecycle.enter();
  await lifecycle.start();

  assert.deepEqual(calls, ["start"]);
});
