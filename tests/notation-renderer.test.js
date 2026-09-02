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
