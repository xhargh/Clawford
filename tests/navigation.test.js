import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { TOOL_CATEGORIES, TOOLS, getTool } from "../js/tools.js";

const root = new URL("../", import.meta.url);

test("tool registry describes grouped tools without numbered navigation", () => {
  assert.deepEqual(TOOLS.map((tool) => tool.id), ["notation", "fretboard", "tuner", "metronome", "ear-training", "play-along"]);
  assert.deepEqual(TOOLS.map((tool) => tool.category), ["explore", "explore", "practice", "practice", "practice", "practice"]);
  assert.equal(getTool("play-along").name, "Play along");
  assert.deepEqual(TOOL_CATEGORIES.map((category) => category.id), ["explore", "practice"]);
});

test("main page uses the current tool as the canonical launcher control", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /id="tools-launcher"/);
  assert.match(html, /aria-label="Choose tool"/);
  assert.match(html, /class="tools-button-prefix">Tools: /);
  assert.doesNotMatch(html, /id="tools-home"/);
  assert.doesNotMatch(html, /id="home-link"/);
  assert.match(await readFile(new URL("js/app.js", root), "utf8"), /backstory\.html/);
  assert.doesNotMatch(html, /tool-number/);
  assert.doesNotMatch(html, /class="segmented tool-navigation"/);
});

test("root route opens a tool instead of a duplicate directory", async () => {
  const app = await readFile(new URL("js/app.js", root), "utf8");
  assert.doesNotMatch(app, /isHomeRoute = !new URLSearchParams\(location\.search\)\.has\("view"\)/);
  assert.doesNotMatch(app, /settingsPanel\.hidden = isHomeRoute/);
  assert.doesNotMatch(app, /workspace\.hidden = isHomeRoute/);
});

test("tools launcher uses a popup menu rather than a modal dialog", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /class="tools-menu"/);
  assert.doesNotMatch(html, /<dialog id="tools-dialog"/);
});

test("launcher keeps categories and a secondary Meet Clawford destination", async () => {
  const app = await readFile(new URL("js/app.js", root), "utf8");
  assert.match(app, /TOOL_CATEGORIES\.map/);
  assert.doesNotMatch(await readFile(new URL("index.html", root), "utf8"), /Explore, practice, tune and play\./);
  assert.match(app, /Meet Clawford/);
  assert.doesNotMatch(app, /toolsHomeGrid/);
});

test("launcher uses a full-width mobile sheet", async () => {
  const css = await readFile(new URL("css/app.css", root), "utf8");
  assert.match(css, /\.tools-menu\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /@media \(max-width: 579px\)[\s\S]*\.tools-menu\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /\.tools-menu\s*\{[^}]*left:\s*0/s);
});
