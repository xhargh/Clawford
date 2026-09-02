import { parsePitch } from "./pitch.js";
import { chromaticName } from "./scales.js";

const NS = "http://www.w3.org/2000/svg";

function element(name, attributes = {}, text = "") {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}

export function renderChordBoard(board, title, tuning, root, quality) {
  const { displayMaxFret, tones, voicing } = board;
  const strings = tuning.strings.filter((string) => string.kind !== "drone").map((string) => string.number);
  const width = 760;
  const stringLabelX = 16;
  const openX = 108;
  const nutX = 138;
  const right = 742;
  const top = 65;
  const stringGap = 52;
  const boardBottom = top + Math.max(1, strings.length - 1) * stringGap;
  const boardWidth = right - nutX;
  const fretWidth = boardWidth / displayMaxFret;
  const chordLabel = `${root.label.split(" ")[0]}${quality.symbol}`;
  const svg = element("svg", { class: "fretboard-svg chord-board", viewBox: `0 0 ${width} ${boardBottom + 70}`, role: "img", "aria-label": `${chordLabel} chord shape on ${title}`, xmlns: NS });
  svg.append(element("text", { x: 20, y: 29, class: "diagram-title" }, `${title} — ${chordLabel}`));

  if (!voicing) {
    svg.append(element("text", { x: 20, y: 55, class: "no-shape-message" }, `No complete ${chordLabel} shape found within 12 frets for this tuning.`));
    return svg;
  }

  for (let fret = 0; fret <= displayMaxFret; fret += 1) {
    const x = nutX + fret * fretWidth;
    svg.append(element("line", { x1: x, x2: x, y1: top, y2: boardBottom, class: fret === 0 ? "nut" : "fret" }));
    if (fret > 0) svg.append(element("text", { x: nutX + (fret - 0.5) * fretWidth, y: boardBottom + 30, "text-anchor": "middle", class: "fret-number" }, fret));
  }
  strings.forEach((string, index) => {
    const y = top + index * stringGap;
    svg.append(element("line", { x1: nutX, x2: right, y1: y, y2: y, class: "string-line" }));
    const openString = tuning.strings.find((item) => item.number === string);
    const openName = openString ? pitchName(openString.pitch) : "";
    svg.append(element("text", { x: stringLabelX, y: y + 5, class: "string-number" }, openName ? `${string} - ${openName}` : String(string)));
  });

  const yForString = new Map(strings.map((string, index) => [string, top + index * stringGap]));
  for (const tone of tones) {
    const y = yForString.get(tone.string);
    const x = tone.isOpen ? openX : nutX + (tone.fret - 0.5) * fretWidth;
    const noteName = chromaticName(tone.pitchClass, root.preference);
    const classes = ["fret-note", "chord-tone"];
    if (tone.isSelected) classes.push("selected");
    if (tone.isRoot) classes.push("root");
    if (tone.isOpen) classes.push("open");
    const group = element("g", { class: classes.join(" ") });
    group.append(element("title", {}, `${noteName}, string ${tone.string}, ${tone.isOpen ? "open" : `fret ${tone.fret}`}`));
    group.append(element("circle", { cx: x, cy: y, r: tone.isSelected ? 16 : 9 }));
    if (tone.isSelected) group.append(element("text", { x, y: y + 5, "text-anchor": "middle" }, noteName));
    svg.append(group);
  }
  return svg;
}

function pitchName(pitch) {
  const { letter, accidental } = parsePitch(pitch);
  return `${letter}${accidental}`;
}
