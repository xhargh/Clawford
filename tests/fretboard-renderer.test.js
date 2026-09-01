import test from "node:test";
import assert from "node:assert/strict";
import { renderFretboard } from "../js/fretboard-renderer.js";
import { generateFretboardNotes } from "../js/mapping.js";
import { getKey, getScale } from "../js/scales.js";
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

test("labels open strings beside a fretboard that begins at fret one", () => {
  const tuning = BUILT_IN_TUNINGS.find((item) => item.id === "open-g");
  const notes = generateFretboardNotes({ tuning, key: getKey("G"), scale: getScale("major"), maxFret: 5 });
  const svg = renderFretboard(notes, 5, "Open G", "excluded", tuning);
  const elements = descendants(svg);

  assert.deepEqual(elements.filter((node) => node.attributes.class === "string-number").map((node) => node.textContent), ["1 - D", "2 - B", "3 - G", "4 - D"]);
  assert.deepEqual(elements.filter((node) => node.attributes.class === "fret-number").map((node) => node.textContent), [1, 2, 3, 4, 5]);
  assert.equal(elements.some((node) => node.attributes.class?.includes("open")), false);
  assert.ok(elements.filter((node) => node.attributes.class === "fret" || node.attributes.class === "nut").every((node) => node.attributes.y2 === "221"));

  const firstFretGroup = elements.find((node) => node.children.some((child) => child.name === "title" && child.textContent === "C, string 2, fret 1"));
  assert.equal(firstFretGroup.children.find((node) => node.name === "circle").attributes.cx, "157");
});
