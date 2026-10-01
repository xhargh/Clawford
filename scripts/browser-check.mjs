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
  assert.equal(await page.locator(".site-header #warning-banner").count(), 1);
  assert.equal(await page.locator(".site-footer").count(), 0);
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
  await page.selectOption("#instrument", "guitar");
  await page.selectOption("#tuning", "guitar-standard");
  await page.selectOption("#chord-root", "C");
  await page.selectOption("#chord-quality", "major");
  await page.locator("#fretboard-mode-control input[value=shape]").check();
  assert.ok(await page.locator("#fretboard-output .shape-muted").count() > 0, "shape view shows muted strings");
  assert.ok(await page.locator("#fretboard-output .shape-open").count() > 0, "shape view shows open strings");
  assert.ok(await page.locator("#fretboard-output .shape-finger").count() > 0, "shape view shows finger numbers");
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
  await chooseView("play-along");
  assert.equal(await page.locator("#workspace-title").innerText(), "Play along");
  assert.equal(await page.locator("#key-control").isVisible(), true, "Play Along exposes the shared Key selector");
  assert.equal(await page.locator("#scale-control").isVisible(), false, "Play Along hides Scale");
  await page.selectOption("#key", "C");
  assert.equal(await page.locator("#play-along-progression").inputValue(), "one-four-one-five7");
  assert.match(await page.locator("#play-along-progression").locator("option:checked").innerText(), /I–IV–I–V7: C–F–C–G7/);
  assert.equal(await page.locator(".play-along-chord").innerText(), "C");
  await page.selectOption("#instrument", "guitar");
  assert.ok(await page.locator(".play-along-output .compact-chord-diagram").count() > 0, "Play Along shows the shared chord shape");
  await page.selectOption("#play-along-pattern", "custom");
  assert.equal(await page.locator("#play-along-meter-control").isVisible(), true);
  assert.equal(await page.locator(".play-along-step").count(), 8);
  await page.selectOption("#play-along-pattern", "guitar-eighths");
  assert.equal(await page.locator("#play-along-meter-control").isVisible(), false);
  await page.selectOption("#play-along-pattern", "custom");
  assert.equal(await page.locator("#play-along-meter-control").isVisible(), true);
  await page.selectOption("#play-along-meter", "3/4");
  assert.equal(await page.locator(".play-along-step").count(), 6);
  assert.deepEqual(await page.locator(".play-along-step small").allTextContents(), ["1", "&", "2", "&", "3", "&"]);
  await page.selectOption("#play-along-meter", "6/8");
  assert.equal(await page.locator(".play-along-step").count(), 6);
  assert.deepEqual(await page.locator(".play-along-step small").allTextContents(), ["1", "trip", "let", "2", "trip", "let"]);
  await page.selectOption("#play-along-meter", "12/8");
  assert.equal(await page.locator(".play-along-step").count(), 12);
  await page.selectOption("#play-along-meter", "4/4");
  assert.equal(await page.locator(".play-along-step").count(), 8);
  await page.locator(".play-along-custom-step").first().click();
  assert.equal(await page.locator(".play-along-custom-step").first().innerText(), "D");
  await page.selectOption("#instrument", "banjo5");
  await page.selectOption("#play-along-technique", "clawhammer");
  await page.selectOption("#play-along-meter", "6/8");
  await page.selectOption("#play-along-technique", "three-finger");
  assert.equal(await page.inputValue("#play-along-meter"), "6/8");
  await page.selectOption("#instrument", "bass");
  assert.equal(await page.locator("#play-along-meter-control").isVisible(), true);
  await page.locator(".play-along-custom-step").first().click();
  assert.equal(await page.locator(".play-along-custom-step").first().innerText(), "R");
  await page.selectOption("#instrument", "guitar");
  await page.selectOption("#play-along-meter", "4/4");
  await page.selectOption("#play-along-pattern", "guitar-eighths");
  await page.setViewportSize({ width: 390, height: 900 });
  assert.equal(await page.locator(".play-along-pattern").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length), 4);
  await page.click("#play-along-start");
  await page.waitForFunction(() => document.querySelector("#play-along-start").disabled);
  assert.match(await page.locator(".play-along-heading .eyebrow").innerText(), /COUNT IN · 4/);
  await page.locator("#play-along-stop").dispatchEvent("pointerdown");
  assert.match(await page.locator(".play-along-heading .eyebrow").innerText(), /READY TO PLAY/);
  await page.click("#play-along-start");
  await page.waitForFunction(() => document.querySelector("#play-along-start").disabled);
  await page.waitForTimeout(3500);
  assert.match(await page.locator(".play-along-heading .eyebrow").innerText(), /PLAYING/);
  await page.evaluate(() => {
    window.playAlongStepChanges = [];
    window.playAlongActiveLabels = [];
    window.playAlongActiveIndexes = [];
    new MutationObserver(() => window.playAlongStepChanges.push(performance.now()))
      .observe(document.querySelector("#play-along-output"), { childList: true, subtree: true });
    new MutationObserver(() => {
      const active = document.querySelector(".play-along-step.active small");
      if (active) {
        window.playAlongActiveLabels.push(active.textContent);
        window.playAlongActiveIndexes.push([...document.querySelectorAll(".play-along-step")].indexOf(active.closest(".play-along-step")));
      }
    }).observe(document.querySelector("#play-along-output"), { childList: true, subtree: true });
  });
  await page.waitForTimeout(2200);
  const normalTempoChanges = await page.evaluate(() => window.playAlongStepChanges.length);
  const activeLabels = await page.evaluate(() => window.playAlongActiveLabels);
  const activeIndexes = await page.evaluate(() => window.playAlongActiveIndexes);
  assert.ok(activeLabels.includes("&"), "visual cursor must visit straight-eighth offbeats");
  const transitions = activeIndexes.filter((index, position) => position === 0 || index !== activeIndexes[position - 1]);
  assert.ok(transitions.every((index, position) => position === 0 || (index - transitions[position - 1] + 8) % 8 === 1), `visual cursor jumped: ${transitions}`);
  await page.evaluate(() => { window.playAlongStepChanges = []; });
  await page.locator("#play-along-bpm").fill("180");
  await page.waitForTimeout(2200);
  const fastTempoChanges = await page.evaluate(() => window.playAlongStepChanges.length);
  assert.ok(fastTempoChanges > normalTempoChanges, `BPM change should speed up playback (${normalTempoChanges} to ${fastTempoChanges} step changes)`);
  await page.click("#play-along-stop");
  await page.selectOption("#play-along-pattern", "custom");
  await page.selectOption("#play-along-meter", "6/8");
  await page.fill("#play-along-bpm", "90");
  await page.evaluate(() => { window.playAlongActiveLabels = []; });
  await page.click("#play-along-start");
  await page.waitForTimeout(2500);
  const compoundLabels = await page.evaluate(() => window.playAlongActiveLabels);
  assert.ok(compoundLabels.includes("trip") && compoundLabels.includes("let"), "visual cursor must visit 6/8 subdivisions");
  await page.click("#play-along-stop");
  await page.reload();
  assert.equal(await page.inputValue("#ear-sequence-limit"), "7");
  assert.equal(await page.inputValue("#ear-exercise"), "simon");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ["notation", "fretboard", "tuner", "metronome", "ear-training", "play-along"]) {
      await chooseView(view);
      assert.equal(await page.locator("#workspace-title").innerText(), { notation: "Notation", fretboard: "Fretboard", tuner: "Tuner", metronome: "Metronome", "ear-training": "Ear training", "play-along": "Play along" }[view]);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view} fits ${width}px`);
      if (view === "fretboard" || view === "ear-training") {
        const output = view === "fretboard" ? "#fretboard-output" : "#ear-training-fretboard-output";
        assert.ok(await page.locator(`${output} .diagram-title`).evaluate((title) => {
          const box = title.getBBox();
          return box.x >= 0 && box.x + box.width <= title.ownerSVGElement.viewBox.baseVal.width;
        }), `${view} heading stays inside diagram`);
      }
      if (width <= 390) {
        const navigationLabels = page.locator("#tool-navigation > label");
        assert.ok(await navigationLabels.evaluateAll((labels) => labels.every((label) => label.scrollWidth === label.clientWidth)), `${view} navigation labels fit at ${width}px`);
        if (view === "metronome") {
          assert.equal(await page.locator("#metronome-controls label").evaluateAll((labels) => new Set(labels.map((label) => Math.round(label.getBoundingClientRect().width))).size), 1, `metronome controls align at ${width}px`);
        }
      }
      if (process.env.SCREENSHOT_DIR) {
        await page.screenshot({ path: resolve(process.env.SCREENSHOT_DIR, `clawford-${width}-${view}.png`), fullPage: true });
      }
    }
  }
  await chooseView("ear-training");
  await page.getByRole("link", { name: "Meet Clawford" }).click();
  await page.waitForURL("**/backstory.html");
  const images = page.locator(".illustration img");
  assert.equal(await images.count(), 14);
  for (const image of await images.all()) {
    assert.match(await image.getAttribute("src"), /\.webp$/);
    assert.equal(await image.getAttribute("loading"), "lazy");
    assert.equal(await image.getAttribute("width"), "1536");
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element) => element.decode());
  }
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `story fits ${width}px`);
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: resolve(process.env.SCREENSHOT_DIR, `story-${width}.png`) });
  }
  await page.getByRole("link", { name: "Explore the atlas" }).click();
  await page.locator("#ear-training-output:not([hidden])").waitFor();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.goto(`${url}/index.html`);
  await page.locator("#ear-training-output:not([hidden])").waitFor();
  await chooseView("notation");
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator("#tool-navigation").isVisible(), false);
  assert.equal(await page.locator("#notation-output svg").isVisible(), true);
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("link", { name: "Meet Clawford" }).click();
  await page.waitForURL("**/backstory.html");
  await page.locator(".illustration img").first().evaluate((image) => image.decode());
  assert.deepEqual(errors, []);
  console.log("Browser checks passed: instruments, playback, five views at four viewport widths, live tuner isolation, metronome persistence, ear training, reload, story images, print, and offline navigation.");
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
