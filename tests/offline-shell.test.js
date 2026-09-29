import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);

test("offline installation includes both pages, their styles, and every application module", async () => {
  const events = {};
  let shell;
  runInNewContext(await readFile(new URL("sw.js", root), "utf8"), {
    self: { addEventListener: (name, handler) => { events[name] = handler; }, skipWaiting() {} },
    caches: { open: async () => ({ addAll: async (paths) => { shell = paths; } }) }
  });
  await new Promise((resolve) => events.install({ waitUntil: resolve }));
  for (const path of shell) await stat(new URL(path, root));
  const visited = new Set();
  async function checkModule(path) {
    if (visited.has(path)) return;
    visited.add(path);
    assert.ok(shell.includes(path), `Offline module missing: ${path}`);
    const source = await readFile(new URL(path, root), "utf8");
    for (const [, dependency] of source.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
      await checkModule(new URL(dependency, new URL(path, root)).href.slice(root.href.length));
    }
  }
  await checkModule("js/app.js");
  for (const page of ["index.html", "backstory.html"]) {
    assert.ok(shell.includes(page), `Offline page missing: ${page}`);
    const html = await readFile(new URL(page, root), "utf8");
    for (const [, css] of html.matchAll(/href="(css\/[^"]+)"/g)) assert.ok(shell.includes(css), `Offline stylesheet missing: ${css}`);
  }
});

test("all fourteen story illustrations exist within a 4 MB total budget", async () => {
  const html = await readFile(new URL("backstory.html", root), "utf8");
  const paths = [...html.matchAll(/src="(img\/backstory\/[^"]+)"/g)].map((match) => match[1]);
  assert.equal(paths.length, 14);
  const sizes = await Promise.all(paths.map(async (path) => (await stat(new URL(path, root))).size));
  assert.ok(sizes.reduce((total, size) => total + size, 0) < 4_000_000);
});
