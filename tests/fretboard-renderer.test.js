import test from "node:test";
import assert from "node:assert/strict";
import { renderChordBoard } from "../js/fretboard-renderer.js";
import { generateChordBoardNotes } from "../js/chords.js";
import { getKey, chromaticName } from "../js/scales.js";
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

const openG = BUILT_IN_TUNINGS.find((item) => item.id === "open-g");
const root = getKey("G");
const quality = { id: "major", label: "Major", symbol: "" };

test("labels open strings and renders only strings 1-4 for a chord shape", () => {
  const board = generateChordBoardNotes(openG, root.pitchClass, "major");
  const svg = renderChordBoard(board, "Open G", openG, root, quality);
  const elements = descendants(svg);

  assert.deepEqual(elements.filter((node) => node.attributes.class === "string-number").map((node) => node.textContent), ["1 - D", "2 - B", "3 - G", "4 - D"]);
  assert.deepEqual(elements.filter((node) => node.attributes.class === "fret-number").map((node) => node.textContent), [1, 2, 3, 4, 5]);
});

test("marks the selected voicing bold and other chord tones faint", () => {
  const board = generateChordBoardNotes(openG, root.pitchClass, "major");
  const svg = renderChordBoard(board, "Open G", openG, root, quality);
  const elements = descendants(svg);

  const selected = elements.filter((node) => node.attributes.class?.includes("chord-tone") && node.attributes.class?.includes("selected"));
  const faint = elements.filter((node) => node.attributes.class?.includes("chord-tone") && !node.attributes.class?.includes("selected"));
  assert.equal(selected.length, 4);
  assert.ok(faint.length > 0);
  assert.ok(selected.every((node) => node.children.find((child) => child.name === "circle").attributes.r === "16"));
  assert.ok(faint.every((node) => node.children.find((child) => child.name === "circle").attributes.r === "9"));
});

test("grows the board width to the shape's highest fret when needed", () => {
  const board = generateChordBoardNotes(openG, 0, "dom7"); // C7 needs a higher position
  const svg = renderChordBoard(board, "Open G", openG, getKey("C"), { id: "dom7", label: "Dominant 7", symbol: "7" });
  const elements = descendants(svg);
  const fretNumbers = elements.filter((node) => node.attributes.class === "fret-number").map((node) => node.textContent);
  assert.equal(fretNumbers.length, board.displayMaxFret);
  assert.ok(board.displayMaxFret >= 5);
});

test("shows a message and no fret grid when no shape exists within range", () => {
  const board = { voicing: null, displayMaxFret: 5, tones: [] };
  const svg = renderChordBoard(board, "Open G", openG, root, quality);
  const elements = descendants(svg);
  assert.equal(elements.some((node) => node.attributes.class === "fret-number"), false);
  assert.ok(elements.some((node) => node.attributes.class === "no-shape-message"));
});

test("spells chord tones using the root's preferred accidentals", () => {
  const flatRoot = getKey("Bb");
  const board = generateChordBoardNotes(openG, flatRoot.pitchClass, "major");
  const svg = renderChordBoard(board, "Open G", openG, flatRoot, quality);
  const elements = descendants(svg);
  const names = elements.filter((node) => node.name === "g" && node.attributes.class?.includes("selected")).map((node) => node.children.find((child) => child.name === "text")?.textContent);
  assert.ok(names.some((name) => name === "Bb"));
  assert.equal(chromaticName(flatRoot.pitchClass, flatRoot.preference), "Bb");
});
