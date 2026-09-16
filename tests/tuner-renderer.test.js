import test from "node:test";
import assert from "node:assert/strict";
import { renderTunerOutput } from "../js/tuner-renderer.js";

test("renders tuner reading, status, and tuning targets through its public renderer", () => {
  const output = renderTunerOutput({
    mode: "tuning",
    running: true,
    reading: { note: "G4", frequency: 392, cents: -3, status: "In tune" },
    targets: [{ string: 5, pitch: "G4" }, { string: 4, pitch: "D4" }]
  });

  assert.match(output, /G4/);
  assert.match(output, /392\.0 Hz/);
  assert.match(output, /-3 cents/);
  assert.match(output, /In tune/);
  assert.match(output, /data-string="5"/);
  assert.match(output, /D4/);
});

test("renders a stopped tuner without inventing a microphone reading", () => {
  const output = renderTunerOutput({ error: "Permission denied" });

  assert.match(output, /data-running="false"/);
  assert.match(output, />--<\/span>/);
  assert.match(output, /Microphone unavailable/);
  assert.match(output, /Permission denied/);
});
