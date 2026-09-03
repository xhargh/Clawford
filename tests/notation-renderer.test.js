import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateNotes } from "../js/mapping.js";
import { BASS_CLEF_REFERENCE, renderNotation, TREBLE_CLEF_REFERENCE } from "../js/notation-renderer.js";
import { getKey, getScale, keySignatureFor } from "../js/scales.js";
import { BUILT_IN_TUNINGS } from "../js/tunings.js";

class SvgNode {
  constructor(name) {
    this.name = name;
    this.attributes = {};
    this.children = [];
    this.textContent = "";
  }

  setAttribute(key, value) {
    this.attributes[key] = String(value);
  }

  append(...children) {
    this.children.push(...children);
  }
}

globalThis.document = { createElementNS: (_namespace, name) => new SvgNode(name) };

function descendants(node) {
  return [node, ...node.children.flatMap(descendants)];
}

function assertArtworkMatches(clef, { fixture, width, height, viewBox, label }) {
  const actualSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">`,
    `<path fill="#000" stroke="#000" stroke-width="3" d="${clef.attributes.d}"/>`,
    "</svg>"
  ].join("");
  const workDir = mkdtempSync(join(tmpdir(), `clawford-${label}-clef-`));
  const actualPath = join(workDir, "actual.svg");
  const actualPng = join(workDir, "actual.png");
  const expectedPng = join(workDir, "expected.png");
  const differencePng = join(workDir, "difference.png");
  const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "fixtures", fixture);

  try {
    writeFileSync(actualPath, actualSvg);
    execFileSync("magick", [fixturePath, "-background", "white", "-alpha", "remove", expectedPng]);
    execFileSync("magick", [actualPath, "-background", "white", "-alpha", "remove", actualPng]);
    let absoluteError = "0";
    try {
      execFileSync("magick", ["compare", "-metric", "AE", expectedPng, actualPng, differencePng], { stdio: ["ignore", "ignore", "pipe"] });
    } catch (error) {
      absoluteError = error.stderr.toString().trim();
    }
    assert.equal(absoluteError, "0", `rendered ${label} clef differs from the Wikimedia reference by ${absoluteError} pixels`);
    assert.ok(readFileSync(actualPng).length > 0);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

test("renders four staff-aligned string columns with a conventional key signature", () => {
  const key = getKey("G");
  const scale = getScale("major");
  const tuning = BUILT_IN_TUNINGS.find((item) => item.id === "open-g");
  const notes = generateNotes({ tuning, key, scale, pitchDisplay: "written", fifthMode: "included" });
  const svg = renderNotation(notes, "G major string columns", { keySignature: keySignatureFor(key, scale) });
  const elements = descendants(svg);
  const positions = elements.filter((node) => node.attributes.class === "position-label string-column-position");
  const headers = elements.filter((node) => node.attributes.class === "column-label" && node.textContent.startsWith("String "));
  const valuesFor = (string) => {
    const x = headers.find((node) => node.textContent === `String ${string}`).attributes.x;
    return positions.filter((node) => node.attributes.x === x).map((node) => node.textContent);
  };

  assert.deepEqual(elements.filter((node) => node.attributes.class === "key-signature").map((node) => node.textContent), ["♯"]);
  assert.deepEqual(headers.map((node) => node.textContent), ["String 4", "String 3", "String 2", "String 1"]);
  assert.deepEqual(valuesFor(4), ["4:0", "4:2", "4:4", "4:5"]);
  assert.deepEqual(valuesFor(3), ["3:0", "3:2", "3:4"]);
  assert.deepEqual(valuesFor(2), ["2:0", "2:1", "2:3"]);
  assert.deepEqual(valuesFor(1), ["1:0", "1:2", "1:4", "1:5"]);
  assert.equal(positions.some((node) => node.textContent.startsWith("5:")), false);
  assert.equal(elements.some((node) => node.attributes.class === "notehead"), false);
});

test("generalizes string columns to a 6-string guitar tuning", () => {
  const key = getKey("E");
  const scale = getScale("major");
  const guitar = BUILT_IN_TUNINGS.find((item) => item.id === "guitar-standard");
  const notes = generateNotes({ tuning: guitar, key, scale, pitchDisplay: "written" });
  const svg = renderNotation(notes, "E major on guitar", { tuning: guitar, keySignature: keySignatureFor(key, scale) });
  const elements = descendants(svg);
  const headers = elements.filter((node) => node.attributes.class === "column-label" && node.textContent.startsWith("String "));
  assert.deepEqual(headers.map((node) => node.textContent), ["String 6", "String 5", "String 4", "String 3", "String 2", "String 1"]);
});

test("renders a bass clef with far fewer ledger lines than treble for bass guitar's low range", () => {
  const key = getKey("E");
  const scale = getScale("major");
  const bass = BUILT_IN_TUNINGS.find((item) => item.instrument === "bass");
  const notes = generateNotes({ tuning: bass, key, scale, pitchDisplay: "written" });

  const bassSvg = renderNotation(notes, "E major on bass", { tuning: bass, keySignature: keySignatureFor(key, scale), clef: "bass" });
  const trebleSvg = renderNotation(notes, "E major on bass (treble)", { tuning: bass, keySignature: keySignatureFor(key, scale), clef: "treble" });

  const bassElements = descendants(bassSvg);
  const trebleElements = descendants(trebleSvg);

  const bassClef = bassElements.find((node) => node.attributes.class === "clef bass-clef");
  assert.equal(bassClef.name, "path", "bass clef uses the reference vector artwork");
  assert.equal(trebleElements.find((node) => node.attributes.class === "clef treble-clef").name, "path", "treble clef uses reference vector artwork");

  const bassLedgerCount = bassElements.filter((node) => node.attributes.class === "ledger-line").length;
  const trebleLedgerCount = trebleElements.filter((node) => node.attributes.class === "ledger-line").length;
  assert.ok(bassLedgerCount < trebleLedgerCount, "bass clef should need fewer ledger lines for a bass guitar's low notes");
});

test("renders the public-domain Wikimedia bass clef artwork pixel-for-pixel", () => {
  const svg = renderNotation([], "Bass clef reference", { clef: "bass" });
  const elements = descendants(svg);
  const clef = elements.find((node) => node.attributes.class === "clef bass-clef");
  const scale = (28 * 2) / BASS_CLEF_REFERENCE.lineSpacing;
  const fLine = elements
    .filter((node) => node.attributes.class === "staff-line")
    .map((node) => Number(node.attributes.y1))
    .sort((a, b) => a - b)[1];
  const transform = clef.attributes.transform.match(/^translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)$/);
  assert.ok(transform, "bass clef has a reference-to-staff transform");
  const [, translateXText, translateYText, renderedScaleText] = transform;
  const translateX = Number(translateXText);
  const translateY = Number(translateYText);
  const renderedScale = Number(renderedScaleText);
  assert.equal(renderedScale, scale);
  assert.ok(Math.abs(translateX + BASS_CLEF_REFERENCE.staffLeftX * scale - 72) < 1e-9, "reference staff left maps to rendered staff left");
  assert.ok(Math.abs(translateY + BASS_CLEF_REFERENCE.fLineY * scale - fLine) < 1e-9, "reference F line maps to rendered F line");
  const topLine = elements
    .filter((node) => node.attributes.class === "staff-line")
    .map((node) => Number(node.attributes.y1))
    .sort((a, b) => a - b)[0];
  assert.ok(Math.abs(translateY + BASS_CLEF_REFERENCE.topLineY * scale - topLine) < 0.1, "reference top line maps to rendered top line");
  assert.ok(translateY + BASS_CLEF_REFERENCE.dot1CenterY * scale < fLine, "upper dot is above the F line");
  assert.ok(translateY + BASS_CLEF_REFERENCE.dot2CenterY * scale > fLine, "lower dot is below the F line");

  assertArtworkMatches(clef, {
    fixture: "bass-clef-reference.svg",
    width: 400,
    height: 480,
    viewBox: "984 6378 1969 2362",
    label: "bass"
  });
});

test("renders the public-domain Wikimedia treble clef artwork pixel-for-pixel", () => {
  const svg = renderNotation([], "Treble clef reference", { clef: "treble" });
  const elements = descendants(svg);
  const clef = elements.find((node) => node.attributes.class === "clef treble-clef");
  const scale = (28 * 2) / TREBLE_CLEF_REFERENCE.lineSpacing;
  const staffLines = elements
    .filter((node) => node.attributes.class === "staff-line")
    .map((node) => Number(node.attributes.y1))
    .sort((a, b) => a - b);
  const topLine = staffLines[0];
  const gLine = staffLines[3];
  const transform = clef.attributes.transform.match(/^translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)$/);
  assert.ok(transform, "treble clef has a reference-to-staff transform");
  const [, translateXText, translateYText, renderedScaleText] = transform;
  const translateX = Number(translateXText);
  const translateY = Number(translateYText);
  assert.equal(Number(renderedScaleText), scale);
  assert.ok(Math.abs(translateX + TREBLE_CLEF_REFERENCE.staffLeftX * scale - 72) < 1e-9, "reference staff left maps to rendered staff left");
  assert.ok(Math.abs(translateY + TREBLE_CLEF_REFERENCE.anchorLineY * scale - gLine) < 1e-9, "reference G line maps to rendered G line");
  assert.ok(Math.abs(translateY + TREBLE_CLEF_REFERENCE.topLineY * scale - topLine) < 0.1, "reference top line maps to rendered top line");

  assertArtworkMatches(clef, {
    fixture: "treble-clef-reference.svg",
    width: 400,
    height: 826,
    viewBox: "984 5608 1969 4066",
    label: "treble"
  });
});
