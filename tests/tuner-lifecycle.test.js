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

test("restarts a running tuner session without overlapping the old session", async () => {
  const calls = [];
  const sessions = [];
  const lifecycle = new TunerLifecycle({
    createSession: () => {
      const session = fakeSession(calls);
      sessions.push(session);
      return session;
    }
  });

  await lifecycle.start();
  await lifecycle.restart();

  assert.deepEqual(calls, ["start", "stop", "start"]);
  assert.equal(sessions.length, 2);
  assert.equal(lifecycle.session, sessions[1]);
});

test("serializes rapid restarts behind the previous session release", async () => {
  const calls = [];
  const sessions = [];
  let releaseStop;
  const lifecycle = new TunerLifecycle({
    createSession: () => {
      const session = fakeSession(calls);
      if (sessions.length === 0) {
        session.stop = () => {
          calls.push("stop");
          return new Promise((resolve) => { releaseStop = resolve; });
        };
      }
      sessions.push(session);
      return session;
    }
  });

  await lifecycle.start();
  const firstRestart = lifecycle.restart();
  const secondRestart = lifecycle.restart();
  await Promise.resolve();
  assert.equal(sessions.length, 1);

  releaseStop();
  await Promise.all([firstRestart, secondRestart]);

  assert.deepEqual(calls, ["start", "stop", "start"]);
  assert.equal(sessions.length, 2);
});

test("restarts safely when a device changes during startup", async () => {
  const calls = [];
  const sessions = [];
  let resolveStart;
  const lifecycle = new TunerLifecycle({
    createSession: () => {
      const session = fakeSession(calls);
      if (sessions.length === 0) {
        session.start = () => new Promise((resolve) => { resolveStart = resolve; });
      }
      sessions.push(session);
      return session;
    }
  });

  const startPromise = lifecycle.start();
  await Promise.resolve();
  const restartPromise = lifecycle.restart();
  await Promise.resolve();
  assert.deepEqual(calls, ["stop"]);

  resolveStart();
  await Promise.all([startPromise, restartPromise]);

  assert.deepEqual(calls, ["stop", "start"]);
  assert.equal(sessions.length, 2);
});
