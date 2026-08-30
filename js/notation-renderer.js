import { splitNoteName } from "./pitch.js";

const NS = "http://www.w3.org/2000/svg";
const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

function element(name, attributes = {}, text = "") {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}

export function renderNotation(notes, title, options = {}) {
  const rowHeight = options.staffSize === "compact" ? 62 : options.staffSize === "large" ? 84 : 72;
  const width = 760;
  const height = 64 + notes.length * rowHeight;
  const svg = element("svg", { class: "notation-svg", viewBox: `0 0 ${width} ${height}`, role: "img", "aria-labelledby": "diagram-svg-title diagram-svg-desc", xmlns: NS });
  svg.append(element("title", { id: "diagram-svg-title" }, title));
  svg.append(element("desc", { id: "diagram-svg-desc" }, "A note-by-note translation from treble staff notation to banjo string and fret positions."));
  svg.append(element("text", { x: 20, y: 29, class: "diagram-title" }, title));
  svg.append(element("text", { x: 170, y: 51, class: "column-label" }, "Notation"));
  svg.append(element("text", { x: 370, y: 51, class: "column-label" }, "Note"));
  svg.append(element("text", { x: 485, y: 51, class: "column-label" }, "String : fret"));

  notes.forEach((note, index) => {
    const top = 60 + index * rowHeight;
    const center = top + rowHeight / 2;
    const group = element("g", { class: `note-row${note.isScaleNote ? " scale-note" : ""}${note.isTonic ? " tonic" : ""}` });
    const positionText = note.positions.map((position) => `${position.string}:${position.fret}${position.string === 5 ? "*" : ""}`).join(" / ");
    group.append(element("title", {}, accessibleDescription(note, positionText)));
    group.append(element("rect", { x: 10, y: top, width: 740, height: rowHeight, rx: 4, class: "row-background" }));
    drawStaff(group, note, center);
    const displayName = `${note.noteName}${options.showOctave ? note.octave : ""}`;
    group.append(element("text", { x: 370, y: center + 6, class: "note-label" }, displayName));
    if (options.showDegree && note.scaleDegree) group.append(element("text", { x: 430, y: center + 5, class: "degree-label" }, `degree ${note.scaleDegree}`));
    group.append(element("text", { x: 485, y: center + 6, class: "position-label" }, positionText));
    svg.append(group);
  });
  if (!notes.length) svg.append(element("text", { x: width / 2, y: 110, "text-anchor": "middle", class: "empty-label" }, "No playable notes in this range."));
  return svg;
}

function drawStaff(group, note, center) {
  const left = 55;
  const right = 330;
  const spacing = 7;
  const bottomLine = center + spacing * 2;
  for (let line = 0; line < 5; line += 1) {
    const y = bottomLine - line * spacing;
    group.append(element("line", { x1: left, x2: right, y1: y, y2: y, class: "staff-line" }));
  }
  group.append(element("text", { x: 66, y: center + 20, class: "clef" }, "𝄞"));
  const parsed = splitNoteName(note.noteName);
  const diatonic = note.octave * 7 + LETTER_INDEX[parsed.letter];
  const e4 = 4 * 7 + LETTER_INDEX.E;
  const y = bottomLine - (diatonic - e4) * (spacing / 2);
  drawLedgerLines(group, y, bottomLine, spacing);
  if (parsed.accidental) {
    const accidental = [...parsed.accidental].map((character) => character === "#" ? "♯" : "♭").join("");
    group.append(element("text", { x: 238, y: y + 6, class: "accidental" }, accidental));
  }
  group.append(element("ellipse", { cx: 276, cy: y, rx: 8, ry: 5.5, transform: `rotate(-18 276 ${y})`, class: "notehead" }));
  group.append(element("line", { x1: 283, x2: 283, y1: y, y2: y - 23, class: "stem" }));
}

function drawLedgerLines(group, noteY, bottomLine, spacing) {
  const topLine = bottomLine - spacing * 4;
  for (let y = bottomLine + spacing; y <= noteY + 1; y += spacing) group.append(element("line", { x1: 262, x2: 291, y1: y, y2: y, class: "ledger-line" }));
  for (let y = topLine - spacing; y >= noteY - 1; y -= spacing) group.append(element("line", { x1: 262, x2: 291, y1: y, y2: y, class: "ledger-line" }));
}

function accessibleDescription(note, positions) {
  const descriptions = note.positions.map((position) => {
    const fret = position.isOpen ? "open" : `fret ${position.fret}`;
    return `string ${position.string} ${fret}${position.string === 5 ? ", fifth-string position" : ""}`;
  });
  return `${note.noteName}${note.octave}: ${descriptions.join(", or ")}.`;
}
