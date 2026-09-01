import test from "node:test";
import assert from "node:assert/strict";
import { generateNotes } from "../js/mapping.js";
import { renderNotation } from "../js/notation-renderer.js";
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

test("renders scale accidentals in the key signature", () => {
  const key = getKey("G");
  const scale = getScale("major");
  const tuning = BUILT_IN_TUNINGS.find((item) => item.id === "open-g");
  const keySignature = keySignatureFor(key, scale);
  const scaleNotes = generateNotes({ tuning, key, scale, pitchDisplay: "written" });
  const scaleSvg = renderNotation(scaleNotes, "G major", { keySignature });
  const scaleElements = descendants(scaleSvg);

  const signature = scaleElements.filter((node) => node.attributes.class === "key-signature");
  assert.deepEqual(signature.map((node) => node.textContent), ["♯"]);
  assert.equal(signature[0].attributes["font-size"], "84");
  const topStaffLine = Math.min(...scaleElements.filter((node) => node.attributes.class === "staff-line").map((node) => Number(node.attributes.y1)));
  assert.ok(Math.abs(Number(signature[0].attributes.y) - topStaffLine - 26.6) < 0.001);
  assert.ok(scaleElements.some((node) => node.attributes.class === "note-label" && node.textContent === "F#"));
  assert.equal(scaleElements.some((node) => node.attributes.class === "accidental"), false);

  const chromaticNotes = generateNotes({ tuning, key, scale, pitchDisplay: "written", displayMode: "chromatic" });
  const chromaticSvg = renderNotation(chromaticNotes, "G chromatic", { keySignature });
  assert.ok(descendants(chromaticSvg).some((node) => node.attributes.class === "accidental" && node.textContent === "♮"));
});

test("places positions before note names when note symbols are hidden", () => {
  const key = getKey("G");
  const scale = getScale("major");
  const tuning = BUILT_IN_TUNINGS.find((item) => item.id === "open-g");
  const notes = generateNotes({ tuning, key, scale, pitchDisplay: "written" });
  const svg = renderNotation(notes, "Compact G major", { keySignature: keySignatureFor(key, scale), showNoteSymbols: false });
  const elements = descendants(svg);

  assert.equal(elements.some((node) => ["notehead", "stem", "ledger-line", "accidental"].includes(node.attributes.class)), false);
  assert.ok(elements.some((node) => node.attributes.class === "key-signature"));
  const position = elements.find((node) => node.attributes.class === "position-label");
  const note = elements.find((node) => node.attributes.class === "note-label");
  const staffRight = Math.max(...elements.filter((node) => node.attributes.class === "staff-line").map((node) => Number(node.attributes.x2)));
  assert.equal(Number(position.attributes.x) - staffRight, 28);
  assert.ok(Number(position.attributes.x) < Number(note.attributes.x));
});

test("renders string and fret positions as an ascending stair", () => {
  const key = getKey("G");
  const scale = getScale("major");
  const tuning = BUILT_IN_TUNINGS.find((item) => item.id === "open-g");
  const notes = generateNotes({ tuning, key, scale, pitchDisplay: "written" });
  const svg = renderNotation(notes, "G major stair", { keySignature: keySignatureFor(key, scale), notationLayout: "stair" });
  const elements = descendants(svg);
  const stairs = elements.filter((node) => node.attributes.class === "position-label stair-position");
  const staffLines = elements.filter((node) => node.attributes.class === "staff-line");
  const bottomLine = Math.max(...staffLines.map((node) => Number(node.attributes.y1)));

  assert.deepEqual(stairs.slice(0, 4).map((node) => node.textContent), ["4:0", "4:2", "4:4", "4:5 - 3:0"]);
  assert.deepEqual(stairs.slice(0, 4).map((node) => Number(node.attributes.y)), [bottomLine + 28, bottomLine, bottomLine - 28, bottomLine - 56]);
  assert.ok(stairs.every((node, index) => index === 0 || Number(node.attributes.x) > Number(stairs[index - 1].attributes.x)));
  assert.equal(Number(stairs[4].attributes.x) - Number(stairs[3].attributes.x), "4:5 - 3:0".length * 20 + 12);
  assert.equal(elements.some((node) => node.attributes.class === "notehead"), false);
});

test("renders four staff-aligned string columns and omits the fifth string", () => {
  const key = getKey("G");
  const scale = getScale("major");
  const tuning = BUILT_IN_TUNINGS.find((item) => item.id === "open-g");
  const notes = generateNotes({ tuning, key, scale, pitchDisplay: "written", fifthMode: "included" });
  const svg = renderNotation(notes, "G major string columns", { keySignature: keySignatureFor(key, scale), notationLayout: "strings" });
  const elements = descendants(svg);
  const positions = elements.filter((node) => node.attributes.class === "position-label string-column-position");
  const headers = elements.filter((node) => node.attributes.class === "column-label" && node.textContent.startsWith("String "));
  const valuesFor = (string) => {
    const x = headers.find((node) => node.textContent === `String ${string}`).attributes.x;
    return positions.filter((node) => node.attributes.x === x).map((node) => node.textContent);
  };

  assert.deepEqual(headers.map((node) => node.textContent), ["String 4", "String 3", "String 2", "String 1"]);
  assert.deepEqual(valuesFor(4), ["4:0", "4:2", "4:4", "4:5"]);
  assert.deepEqual(valuesFor(3), ["3:0", "3:2", "3:4", "3:5"]);
  assert.deepEqual(valuesFor(2), ["2:0", "2:1", "2:3", "2:5"]);
  assert.deepEqual(valuesFor(1), ["1:0", "1:2", "1:4", "1:5"]);
  assert.equal(positions.some((node) => node.textContent.startsWith("5:")), false);
  assert.equal(elements.some((node) => node.attributes.class === "notehead"), false);
});
