import { parsePitch } from "./pitch.js";

const NS = "http://www.w3.org/2000/svg";

function element(name, attributes = {}, text = "") {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}

export function renderFretboard(notes, maxFret, title, fifthMode = "excluded", tuning) {
  const width = 760;
  const left = 92;
  const right = 742;
  const top = 65;
  const stringGap = 52;
  const boardBottom = top + (fifthMode === "excluded" ? 3 : 4) * stringGap;
  const boardWidth = right - left;
  const fretWidth = boardWidth / maxFret;
  const svg = element("svg", { class: "fretboard-svg", viewBox: `0 0 ${width} ${boardBottom + 70}`, role: "img", "aria-label": `${title} fretboard view`, xmlns: NS });
  svg.append(element("text", { x: 20, y: 29, class: "diagram-title" }, `${title} — fretboard`));
  for (let fret = 0; fret <= maxFret; fret += 1) {
    const x = left + fret * fretWidth;
    svg.append(element("line", { x1: x, x2: x, y1: top, y2: boardBottom, class: fret === 0 ? "nut" : "fret" }));
    if (fret > 0) svg.append(element("text", { x: left + (fret - 0.5) * fretWidth, y: boardBottom + 30, "text-anchor": "middle", class: "fret-number" }, fret));
  }
  for (let string = 1; string <= 5; string += 1) {
    if (string === 5 && fifthMode === "excluded") continue;
    const y = top + (string - 1) * stringGap;
    const start = string === 5 ? left + 4 * fretWidth : left;
    svg.append(element("line", { x1: Math.min(start, right), x2: right, y1: y, y2: y, class: "string-line" }));
    const openString = tuning?.strings.find((item) => item.number === string);
    const openName = openString ? pitchName(openString.pitch) : "";
    svg.append(element("text", { x: 16, y: y + 5, class: "string-number" }, openName ? `${string} - ${openName}` : String(string)));
  }
  for (const note of notes) {
    const displayFret = note.string === 5 ? note.physicalFret : note.relativeFret;
    if (note.isOpen || displayFret > maxFret || (note.string === 5 && maxFret < 5)) continue;
    const x = left + (displayFret - 0.5) * fretWidth;
    const y = top + (note.string - 1) * stringGap;
    const group = element("g", { class: `fret-note${note.isScaleNote ? " scale-note" : ""}${note.isTonic ? " tonic" : ""}${note.isOpen ? " open" : ""}` });
    group.append(element("title", {}, `${note.noteName}, string ${note.string}, ${note.isOpen ? "open" : `fret ${displayFret}`}`));
    group.append(element("circle", { cx: x, cy: y, r: 16 }));
    group.append(element("text", { x, y: y + 5, "text-anchor": "middle" }, note.noteName));
    svg.append(group);
  }
  return svg;
}

function pitchName(pitch) {
  const { letter, accidental } = parsePitch(pitch);
  return `${letter}${accidental}`;
}
