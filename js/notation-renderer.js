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
  const contentTop = 120;
  const contentBottom = 160;
  const noteX = Math.max(350, 295 + keySignature.length * 18);
  const labelX = noteX + 50;
  const positionX = labelX + 120;
  const width = Math.max(760, positionX + 220);
  const height = contentTop + (topDiatonic - bottomDiatonic) * step + contentBottom;
  const yForDiatonic = (diatonic) => contentTop + (topDiatonic - diatonic) * step;
  const svg = element("svg", { class: "notation-svg", viewBox: `0 0 ${width} ${height}`, role: "img", "aria-labelledby": "diagram-svg-title diagram-svg-desc", xmlns: NS });
  svg.append(element("title", { id: "diagram-svg-title" }, title));
  svg.append(element("desc", { id: "diagram-svg-desc" }, "One shared treble staff with note names and banjo string and fret positions beside each note."));
  svg.append(element("text", { x: 20, y: 29, class: "diagram-title" }, title));
  svg.append(element("text", { x: labelX, y: 57, class: "column-label" }, "Note"));
  svg.append(element("text", { x: positionX, y: 57, class: "column-label" }, "String : fret"));

  drawStaff(svg, yForDiatonic, step, keySignature, noteX);
  const duplicateCounts = countByDiatonic(preparedNotes);
  const duplicateIndexes = new Map();
  preparedNotes.forEach((note) => {
    const duplicateIndex = duplicateIndexes.get(note.diatonic) || 0;
    duplicateIndexes.set(note.diatonic, duplicateIndex + 1);
    drawNote(svg, note, yForDiatonic(note.diatonic), step, duplicateIndex, duplicateCounts.get(note.diatonic), options, { noteX, labelX, positionX });
  });

  if (!notes.length) svg.append(element("text", { x: width / 2, y: 110, "text-anchor": "middle", class: "empty-label" }, "No playable notes in this range."));
  return svg;
}

function prepareNote(note, octaveShift) {
  const parsed = splitNoteName(note.noteName);
  const displayOctave = note.octave + octaveShift;
  return { ...note, parsed, displayOctave, diatonic: displayOctave * 7 + LETTER_INDEX[parsed.letter] };
}

function drawStaff(svg, yForDiatonic, step, keySignature, noteX) {
  const left = 72;
  const right = noteX + 22;
  for (let line = 0; line < 5; line += 1) {
    const y = yForDiatonic(E4 + line * 2);
    svg.append(element("line", { x1: left, x2: right, y1: y, y2: y, class: "staff-line" }));
  }
  const clefX = 86;
  const clefAnchorX = 138;
  const clefAnchorY = yForDiatonic(4 * 7 + LETTER_INDEX.G);
  svg.append(element("text", {
    x: clefX,
    y: yForDiatonic(E4) - step * 0.75,
    class: "clef",
    transform: `translate(${clefAnchorX} ${clefAnchorY}) scale(1.65) translate(${-clefAnchorX} ${-clefAnchorY})`
  }, "𝄞"));
  const positions = positionsForKeySignature(keySignature);
  keySignature.forEach((item, index) => {
    const symbol = item.accidental === "#" ? "♯" : "♭";
    svg.append(element("text", { x: 250 + index * 18, y: yForDiatonic(positions[index]) + 9, class: "key-signature" }, symbol));
  });
}

function positionsForKeySignature(keySignature) {
  const positions = keySignature[0]?.accidental === "b" ? FLAT_SIGNATURE_POSITIONS : SHARP_SIGNATURE_POSITIONS;
  return positions.slice(0, keySignature.length);
}

function drawNote(svg, note, staffY, step, duplicateIndex, duplicateCount, options, geometry) {
  const group = element("g", { class: `note-entry${note.isScaleNote ? " scale-note" : ""}${note.isTonic ? " tonic" : ""}` });
  const positionText = note.positions.map((position) => `${position.string}:${position.fret}${position.string === 5 ? "*" : ""}`).join(" / ");
  const noteRadiusY = step / 2 - 1;
  const noteRadiusX = noteRadiusY * 1.45;
  const duplicateOffset = duplicateIndex - (duplicateCount - 1) / 2;
  const noteX = geometry.noteX + duplicateOffset * (noteRadiusX * 2 + 5);
  const labelY = staffY + duplicateOffset * 18;
  group.append(element("title", {}, accessibleDescription(note, note.displayOctave)));
  drawLedgerLines(group, noteX, staffY, note.diatonic, step);
  const writtenAccidental = accidentalForNote(note.parsed, options.keySignature || []);
  if (writtenAccidental) {
    const accidental = [...writtenAccidental].map((character) => character === "#" ? "♯" : character === "b" ? "♭" : "♮").join("");
    group.append(element("text", { x: noteX - noteRadiusX - 30, y: staffY + 11, class: "accidental" }, accidental));
  }
  group.append(element("ellipse", { cx: noteX, cy: staffY, rx: noteRadiusX, ry: noteRadiusY, transform: `rotate(-18 ${noteX} ${staffY})`, class: "notehead" }));
  group.append(element("line", { x1: noteX + noteRadiusX - 1, x2: noteX + noteRadiusX - 1, y1: staffY, y2: staffY - step * 1.5, class: "stem" }));
  group.append(element("path", { d: `M ${noteX + noteRadiusX + 5} ${staffY} L ${geometry.labelX - 16} ${labelY}`, class: "note-guide" }));
  const displayName = `${note.noteName}${options.showOctave ? note.displayOctave : ""}`;
  group.append(element("text", { x: geometry.labelX, y: labelY + 6, class: "note-label" }, displayName));
  if (options.showDegree && note.scaleDegree) group.append(element("text", { x: geometry.labelX + 62, y: labelY + 5, class: "degree-label" }, `degree ${note.scaleDegree}`));
  group.append(element("text", { x: geometry.positionX, y: labelY + 6, class: "position-label" }, positionText));
  svg.append(group);
}

function accidentalForNote(parsed, keySignature) {
  const signatureAccidental = keySignature.find((item) => item.letter === parsed.letter)?.accidental || "";
  if (parsed.accidental === signatureAccidental) return "";
  return parsed.accidental || "n";
}

function drawLedgerLines(group, noteX, noteY, diatonic, step) {
  const halfWidth = (step / 2 - 1) * 1.45 + 8;
  for (let ledger = E4 - 2; ledger >= diatonic; ledger -= 2) {
    group.append(element("line", { x1: noteX - halfWidth, x2: noteX + halfWidth, y1: noteY - (ledger - diatonic) * step, y2: noteY - (ledger - diatonic) * step, class: "ledger-line" }));
  }
  for (let ledger = F5 + 2; ledger <= diatonic; ledger += 2) {
    group.append(element("line", { x1: noteX - halfWidth, x2: noteX + halfWidth, y1: noteY + (diatonic - ledger) * step, y2: noteY + (diatonic - ledger) * step, class: "ledger-line" }));
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
