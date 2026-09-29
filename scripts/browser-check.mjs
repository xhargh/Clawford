import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".webmanifest": "application/manifest+json" };
const server = createServer(async (request, response) => {
  const path = resolve(root, `.${new URL(request.url, "http://localhost").pathname.replace(/\/$/, "/index.html")}`);
  try {
    if (!path.startsWith(root + sep)) throw new Error("Outside root");
    const body = await readFile(path);
    response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.locator("#notation-output svg").waitFor();
  const chooseView = async (view) => page.locator(`input[name=view][value="${view}"]`).check();
  for (const instrument of ["banjo5", "banjo4", "guitar", "bass", "mandolin", "ukulele"]) {
    await page.selectOption("#instrument", instrument);
    assert.ok(await page.locator("#notation-output .playable-note").count(), instrument);
  }
  await page.selectOption("#instrument", "banjo5");
  await page.locator("#notation-output .playable-note").first().press("Enter");
  await chooseView("fretboard");
  await page.locator("#fretboard-output .fretboard-tone").first().click();
  await page.selectOption("#chord-quality", "scale:chromatic");
  assert.ok(await page.locator("#fretboard-output .fretboard-tone").count() > 20);
  await chooseView("tuner");
  await page.waitForFunction(() => document.querySelector("#tuner-start").disabled);
  await page.evaluate(() => {
    window.savedWrites = 0;
    window.diagramChanges = 0;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (...args) { window.savedWrites++; return setItem.apply(this, args); };
    new MutationObserver(() => window.diagramChanges++).observe(document.querySelector("#notation-output"), { childList: true });
  });
  await page.waitForTimeout(400);
  assert.deepEqual(await page.evaluate(() => [window.savedWrites, window.diagramChanges]), [0, 0], "tuner frames only update live display");
  await chooseView("metronome");
  await page.click("#metronome-start");
  await page.waitForFunction(() => document.querySelector("#metronome-start").disabled);
  await page.locator("[data-tick-index='0']").click();
  assert.match(page.url(), /metronomePattern=SNNN/, "running pattern changes are saved");
  await page.click("#metronome-stop");
  await chooseView("ear-training");
  await page.selectOption("#ear-exercise", "simon");
  await page.selectOption("#ear-variant", "rolling");
  await page.fill("#ear-sequence-limit", "7");
  await page.click("#ear-training-start");
  await page.waitForFunction(() => document.querySelector("#ear-training-stop") && !document.querySelector("#ear-training-stop").disabled);
  await page.click("#ear-training-stop");
  await page.reload();
  assert.equal(await page.inputValue("#ear-sequence-limit"), "7");
  assert.equal(await page.inputValue("#ear-exercise"), "simon");
  assert.deepEqual(errors, []);
  console.log("Browser checks passed: instruments, playback, five views, live tuner isolation, metronome persistence, ear training, reload.");
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
