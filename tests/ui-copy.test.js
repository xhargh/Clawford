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
    "Audio-first practice"
  ]) {
    assert.doesNotMatch(`${html}\n${earTraining}`, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), phrase);
  }

  assert.match(html, /warning-banner/);
  assert.match(app, /Select a note to hear it\./);
  assert.match(app, /Listen to your instrument\./);
  assert.match(await readFile(new URL("js/metronome-renderer.js", root), "utf8"), /Tap a tick to cycle normal, accent, and silent\./);
});
