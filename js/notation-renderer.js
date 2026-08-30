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

export function renderNotation(notes, title, options = {}) {
  const step = options.staffSize === "compact" ? 23 : options.staffSize === "large" ? 33 : 28;
  const octaveShift = options.notationOctave || 0;
  const preparedNotes = notes.map((note) => prepareNote(note, octaveShift));
  const keySignature = options.keySignature || [];
  const signaturePositions = positionsForKeySignature(keySignature);
  const topDiatonic = Math.max(F5, ...preparedNotes.map((note) => note.diatonic), ...signaturePositions);
  const bottomDiatonic = Math.min(E4, ...preparedNotes.map((note) => note.diatonic));
  const contentTop = 78;
  const contentBottom = 42;
  const width = 760;
  const height = contentTop + (topDiatonic - bottomDiatonic) * step + contentBottom;
  const yForDiatonic = (diatonic) => contentTop + (topDiatonic - diatonic) * step;
  const svg = element("svg", { class: "notation-svg", viewBox: `0 0 ${width} ${height}`, role: "img", "aria-labelledby": "diagram-svg-title diagram-svg-desc", xmlns: NS });
  svg.append(element("title", { id: "diagram-svg-title" }, title));
  svg.append(element("desc", { id: "diagram-svg-desc" }, "One shared treble staff with note names and banjo string and fret positions beside each note."));
  svg.append(element("text", { x: 20, y: 29, class: "diagram-title" }, title));
  svg.append(element("text", { x: 350, y: 57, class: "column-label" }, "Note"));
  svg.append(element("text", { x: 470, y: 57, class: "column-label" }, "String : fret"));

  drawStaff(svg, yForDiatonic, step, keySignature);
  const duplicateCounts = countByDiatonic(preparedNotes);
  const duplicateIndexes = new Map();
  preparedNotes.forEach((note) => {
    const duplicateIndex = duplicateIndexes.get(note.diatonic) || 0;
    duplicateIndexes.set(note.diatonic, duplicateIndex + 1);
    drawNote(svg, note, yForDiatonic(note.diatonic), step, duplicateIndex, duplicateCounts.get(note.diatonic), options);
  });

  if (!notes.length) svg.append(element("text", { x: width / 2, y: 110, "text-anchor": "middle", class: "empty-label" }, "No playable notes in this range."));
  return svg;
}

function prepareNote(note, octaveShift) {
  const parsed = splitNoteName(note.noteName);
  const displayOctave = note.octave + octaveShift;
  return { ...note, parsed, displayOctave, diatonic: displayOctave * 7 + LETTER_INDEX[parsed.letter] };
}

function drawStaff(svg, yForDiatonic, step, keySignature) {
  const left = 72;
  const right = 300;
  for (let line = 0; line < 5; line += 1) {
    const y = yForDiatonic(E4 + line * 2);
    svg.append(element("line", { x1: left, x2: right, y1: y, y2: y, class: "staff-line" }));
  }
  svg.append(element("text", { x: 86, y: yForDiatonic(E4) - step * 0.55, class: "clef" }, "𝄞"));
  const positions = positionsForKeySignature(keySignature);
  keySignature.forEach((item, index) => {
    const symbol = item.accidental === "#" ? "♯" : "♭";
    svg.append(element("text", { x: 190 + index * 15, y: yForDiatonic(positions[index]) + 7, class: "key-signature" }, symbol));
  });
}

function positionsForKeySignature(keySignature) {
  const positions = keySignature[0]?.accidental === "b" ? FLAT_SIGNATURE_POSITIONS : SHARP_SIGNATURE_POSITIONS;
  return positions.slice(0, keySignature.length);
}

function drawNote(svg, note, staffY, step, duplicateIndex, duplicateCount, options) {
  const group = element("g", { class: `note-entry${note.isScaleNote ? " scale-note" : ""}${note.isTonic ? " tonic" : ""}` });
  const positionText = note.positions.map((position) => `${position.string}:${position.fret}${position.string === 5 ? "*" : ""}`).join(" / ");
  const slotOffset = (duplicateIndex - (duplicateCount - 1) / 2) * 18;
  const noteX = 300 + slotOffset;
  const labelY = staffY + slotOffset;
  group.append(element("title", {}, accessibleDescription(note, note.displayOctave)));
  drawLedgerLines(group, noteX, staffY, note.diatonic, step);
  const writtenAccidental = accidentalForNote(note.parsed, options.keySignature || []);
  if (writtenAccidental) {
    const accidental = [...writtenAccidental].map((character) => character === "#" ? "♯" : character === "b" ? "♭" : "♮").join("");
    group.append(element("text", { x: noteX - 30, y: staffY + 7, class: "accidental" }, accidental));
  }
  group.append(element("ellipse", { cx: noteX, cy: staffY, rx: 9, ry: 6.5, transform: `rotate(-18 ${noteX} ${staffY})`, class: "notehead" }));
  group.append(element("line", { x1: noteX + 8, x2: noteX + 8, y1: staffY, y2: staffY - 28, class: "stem" }));
  group.append(element("path", { d: `M ${noteX + 14} ${staffY} L 326 ${labelY}`, class: "note-guide" }));
  const displayName = `${note.noteName}${options.showOctave ? note.displayOctave : ""}`;
  group.append(element("text", { x: 350, y: labelY + 6, class: "note-label" }, displayName));
  if (options.showDegree && note.scaleDegree) group.append(element("text", { x: 412, y: labelY + 5, class: "degree-label" }, `degree ${note.scaleDegree}`));
  group.append(element("text", { x: 470, y: labelY + 6, class: "position-label" }, positionText));
  svg.append(group);
}

function accidentalForNote(parsed, keySignature) {
  const signatureAccidental = keySignature.find((item) => item.letter === parsed.letter)?.accidental || "";
  if (parsed.accidental === signatureAccidental) return "";
  return parsed.accidental || "n";
}

function drawLedgerLines(group, noteX, noteY, diatonic, step) {
  for (let ledger = E4 - 2; ledger >= diatonic; ledger -= 2) {
    group.append(element("line", { x1: noteX - 16, x2: noteX + 17, y1: noteY - (ledger - diatonic) * step, y2: noteY - (ledger - diatonic) * step, class: "ledger-line" }));
  }
  for (let ledger = F5 + 2; ledger <= diatonic; ledger += 2) {
    group.append(element("line", { x1: noteX - 16, x2: noteX + 17, y1: noteY + (diatonic - ledger) * step, y2: noteY + (diatonic - ledger) * step, class: "ledger-line" }));
  }
}

function countByDiatonic(notes) {
  const counts = new Map();
  for (const note of notes) counts.set(note.diatonic, (counts.get(note.diatonic) || 0) + 1);
  return counts;
}

function accessibleDescription(note, displayOctave) {
  const descriptions = note.positions.map((position) => {
    const fret = position.isOpen ? "open" : `fret ${position.fret}`;
    return `string ${position.string} ${fret}${position.string === 5 ? ", fifth-string position" : ""}`;
  });
  return `${note.noteName}${displayOctave}: ${descriptions.join(", or ")}.`;
}
