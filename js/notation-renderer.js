import { splitNoteName } from "./pitch.js";

const NS = "http://www.w3.org/2000/svg";
const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const E4 = 4 * 7 + LETTER_INDEX.E;
const F5 = 5 * 7 + LETTER_INDEX.F;
const SHARP_SIGNATURE_POSITIONS = [F5, 5 * 7 + LETTER_INDEX.C, 5 * 7 + LETTER_INDEX.G, 5 * 7 + LETTER_INDEX.D, 4 * 7 + LETTER_INDEX.A, 5 * 7 + LETTER_INDEX.E, 4 * 7 + LETTER_INDEX.B];
const FLAT_SIGNATURE_POSITIONS = [4 * 7 + LETTER_INDEX.B, 5 * 7 + LETTER_INDEX.E, 4 * 7 + LETTER_INDEX.A, 5 * 7 + LETTER_INDEX.D, 4 * 7 + LETTER_INDEX.G, 5 * 7 + LETTER_INDEX.C, 4 * 7 + LETTER_INDEX.F];

function element(name, attributes = {}, text = "") {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}

function columnStrings(tuning) {
  if (!tuning) return [4, 3, 2, 1];
  return tuning.strings.filter((string) => string.kind !== "drone").map((string) => string.number).sort((a, b) => b - a);
}

export function renderNotation(notes, title, options = {}) {
  const step = options.staffSize === "compact" ? 23 : options.staffSize === "large" ? 33 : 28;
  const preparedNotes = notes.map(prepareNote);
  const keySignature = options.keySignature || [];
  const signaturePositions = positionsForKeySignature(keySignature);
  const topDiatonic = Math.max(F5, ...preparedNotes.map((note) => note.diatonic), ...signaturePositions);
  const bottomDiatonic = Math.min(E4, ...preparedNotes.map((note) => note.diatonic));
  const contentTop = 120;
  const contentBottom = 160;
  const signatureX = 250;
  const signatureGap = step * 1.5;
  const signatureWidth = Math.max(0, keySignature.length - 1) * signatureGap;
  const columnStart = Math.max(350, signatureX + signatureWidth + step * 2.6);
  const columnGap = step * 3.8;
  const columns = columnStrings(options.tuning).map((string, index) => ({ string, x: columnStart + index * columnGap }));
  const staffRight = columns.at(-1).x + step * 2.5;
  const width = Math.max(760, staffRight + 30);
  const height = contentTop + (topDiatonic - bottomDiatonic) * step + contentBottom;
  const yForDiatonic = (diatonic) => contentTop + (topDiatonic - diatonic) * step;
  const svg = element("svg", { class: "notation-svg", viewBox: `0 0 ${width} ${height}`, role: "img", "aria-labelledby": "diagram-svg-title diagram-svg-desc", xmlns: NS });
  svg.append(element("title", { id: "diagram-svg-title" }, title));
  svg.append(element("desc", { id: "diagram-svg-desc" }, `A shared treble staff with separate string and fret columns for strings ${columns.map((column) => column.string).join(" through ")}.`));
  svg.append(element("text", { x: 20, y: 29, class: "diagram-title" }, title));
  for (const column of columns) svg.append(element("text", { x: column.x, y: 57, class: "column-label" }, `String ${column.string}`));

  drawStaff(svg, yForDiatonic, step, keySignature, staffRight, signatureX, signatureGap);
  drawStringColumns(svg, preparedNotes, columns, yForDiatonic, step);
  if (!notes.length) svg.append(element("text", { x: width / 2, y: 110, "text-anchor": "middle", class: "empty-label" }, "No playable notes in this range."));
  return svg;
}

function prepareNote(note) {
  const parsed = splitNoteName(note.noteName);
  return { ...note, diatonic: note.octave * 7 + LETTER_INDEX[parsed.letter] };
}

function drawStringColumns(svg, notes, columns, yForDiatonic, step) {
  const xByString = new Map(columns.map((column) => [column.string, column.x]));
  for (const note of notes) {
    for (const position of note.positions.filter((item) => xByString.has(item.string))) {
      const group = element("g", { class: `note-entry string-column-entry${note.isScaleNote ? " scale-note" : ""}${note.isTonic ? " tonic" : ""}` });
      group.append(element("title", {}, accessibleDescription(note, position)));
      group.append(element("text", {
        x: xByString.get(position.string),
        y: yForDiatonic(note.diatonic),
        class: "position-label string-column-position",
        "dominant-baseline": "middle",
        "font-size": step
      }, `${position.string}:${position.fret}`));
      svg.append(group);
    }
  }
}

function drawStaff(svg, yForDiatonic, step, keySignature, staffRight, signatureX, signatureGap) {
  for (let line = 0; line < 5; line += 1) {
    const y = yForDiatonic(E4 + line * 2);
    svg.append(element("line", { x1: 72, x2: staffRight, y1: y, y2: y, class: "staff-line" }));
  }
  const clefAnchorX = 138;
  const clefAnchorY = yForDiatonic(4 * 7 + LETTER_INDEX.G);
  svg.append(element("text", {
    x: 86,
    y: yForDiatonic(E4) - step * 0.75,
    class: "clef",
    transform: `translate(${clefAnchorX} ${clefAnchorY}) scale(1.65) translate(${-clefAnchorX} ${-clefAnchorY})`
  }, "𝄞"));
  const positions = positionsForKeySignature(keySignature);
  keySignature.forEach((item, index) => {
    svg.append(element("text", {
      x: signatureX + index * signatureGap,
      y: yForDiatonic(positions[index]) + step * 0.95,
      class: "key-signature",
      "font-size": step * 3
    }, item.accidental === "#" ? "♯" : "♭"));
  });
}

function positionsForKeySignature(keySignature) {
  const positions = keySignature[0]?.accidental === "b" ? FLAT_SIGNATURE_POSITIONS : SHARP_SIGNATURE_POSITIONS;
  return positions.slice(0, keySignature.length);
}

function accessibleDescription(note, position) {
  const fret = position.isOpen ? "open" : `fret ${position.fret}`;
  return `${note.noteName}${note.octave}: string ${position.string} ${fret}.`;
}
