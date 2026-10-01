import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("main app keeps functional guidance without decorative motivational copy", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("js/app.js", root), "utf8");
  const earTraining = await readFile(new URL("js/ear-training-renderer.js", root), "utf8");

  for (const phrase of [
    "Explore · Listen · Practice",
    "Every note is a place to begin.",
    "Make it yours",
    "Follow a note. Find a new path.",
    "Your setup is saved as you explore.",
    "Your musical atlas",
    "A little curiosity. A world of music.",
    "The practice room",
    "Audio-first practice",
    "Choose a few chords and a pattern, then follow the highlighted step."
  ]) {
    assert.doesNotMatch(`${html}\n${app}\n${earTraining}`, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), phrase);
  }

  assert.match(html, /warning-banner/);
  assert.match(app, /Select a note to hear it\./);
  assert.match(app, /Listen to your instrument\./);
  assert.match(app, /if \(metronome\.running\) metronome\.updateTpm\(playAlongBpmSetting\);/);
  assert.match(await readFile(new URL("js/metronome-renderer.js", root), "utf8"), /Tap a tick to cycle normal, accent, and silent\./);
});

test("hides redundant ear-training controls and heading", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /<legend id="ear-training-heading" hidden>Ear training<\/legend>/);
  assert.match(html, /<label id="ear-exercise-control" hidden>Exercise/);
  assert.match(html, /<label id="ear-variant-control" hidden>Note generation/);
});
