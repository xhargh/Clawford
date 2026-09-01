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
