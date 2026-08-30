const NS = "http://www.w3.org/2000/svg";

function element(name, attributes = {}, text = "") {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}

export function renderFretboard(notes, maxFret, title, fifthMode = "excluded") {
  const width = 760;
  const left = 68;
  const right = 742;
  const top = 65;
  const stringGap = 52;
  const boardWidth = right - left;
  const fretWidth = boardWidth / (maxFret + 1);
  const svg = element("svg", { class: "fretboard-svg", viewBox: `0 0 ${width} 365`, role: "img", "aria-label": `${title} fretboard view`, xmlns: NS });
  svg.append(element("text", { x: 20, y: 29, class: "diagram-title" }, `${title} — fretboard`));
  for (let fret = 0; fret <= maxFret + 1; fret += 1) {
    const x = left + fret * fretWidth;
    svg.append(element("line", { x1: x, x2: x, y1: top, y2: top + 4 * stringGap, class: fret === 1 ? "nut" : "fret" }));
    if (fret <= maxFret) svg.append(element("text", { x: left + (fret + 0.5) * fretWidth, y: top + 4 * stringGap + 30, "text-anchor": "middle", class: "fret-number" }, fret));
  }
  for (let string = 1; string <= 5; string += 1) {
    if (string === 5 && fifthMode === "excluded") continue;
    const y = top + (string - 1) * stringGap;
    const start = string === 5 ? left + 5 * fretWidth : left;
    svg.append(element("line", { x1: Math.min(start, right), x2: right, y1: y, y2: y, class: "string-line" }));
    svg.append(element("text", { x: 38, y: y + 5, "text-anchor": "middle", class: "string-number" }, String(string)));
  }
  for (const note of notes) {
    const displayFret = note.string === 5 ? note.physicalFret : note.relativeFret;
    if (displayFret > maxFret || (note.string === 5 && maxFret < 5)) continue;
    const x = left + (displayFret + 0.5) * fretWidth;
    const y = top + (note.string - 1) * stringGap;
    const group = element("g", { class: `fret-note${note.isScaleNote ? " scale-note" : ""}${note.isTonic ? " tonic" : ""}${note.isOpen ? " open" : ""}` });
    group.append(element("title", {}, `${note.noteName}, string ${note.string}, ${note.isOpen ? "open" : `fret ${displayFret}`}`));
    group.append(element("circle", { cx: x, cy: y, r: 16 }));
    group.append(element("text", { x, y: y + 5, "text-anchor": "middle" }, note.noteName));
    svg.append(group);
  }
  return svg;
}
