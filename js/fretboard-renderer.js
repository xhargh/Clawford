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
  const chordLabel = `${root.label.split(" ")[0]}${quality.symbol}`;

  return renderVertical(strings, displayMaxFret, tones, voicing, title, tuning, chordLabel, root.preference);
}

function renderVertical(strings, displayMaxFret, tones, voicing, title, tuning, chordLabel, preference) {
  const leftX = 65;
  const stringGap = 52;
  const rightX = leftX + Math.max(1, strings.length - 1) * stringGap;
  const stringLabelY = 82;
  const openY = 108;
  const topY = 138;
  const boardHeight = 604;
  const bottomY = topY + boardHeight;
  const fretHeight = boardHeight / displayMaxFret;
  const width = rightX + 70;
  const height = bottomY + 40;
  const svg = element("svg", { class: "fretboard-svg chord-board vertical", viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `${chordLabel} chord shape on ${title}`, xmlns: NS });
  svg.append(element("text", { x: 20, y: 29, class: "diagram-title" }, `${title} — ${chordLabel}`));

  if (!voicing) {
    svg.append(element("text", { x: 20, y: 55, class: "no-shape-message" }, `No complete ${chordLabel} shape found within 12 frets for this tuning.`));
    return svg;
  }

  for (let fret = 0; fret <= displayMaxFret; fret += 1) {
    const y = topY + fret * fretHeight;
    svg.append(element("line", { x1: leftX, x2: rightX, y1: y, y2: y, class: fret === 0 ? "nut" : "fret" }));
    if (fret > 0) svg.append(element("text", { x: leftX - 12, y: topY + (fret - 0.5) * fretHeight + 5, "text-anchor": "end", class: "fret-number" }, fret));
  }
  // String 1 (highest-pitched/thinnest) on the right, highest-numbered (lowest-pitched/thickest)
  // string on the left — matches holding the instrument with the pegboard up.
  const xForString = new Map();
  strings.forEach((string) => {
    const x = rightX - (string - 1) * stringGap;
    xForString.set(string, x);
    svg.append(element("line", { x1: x, x2: x, y1: topY, y2: bottomY, class: "string-line" }));
    const openString = tuning.strings.find((item) => item.number === string);
    const openName = openString ? pitchName(openString.pitch) : "";
    svg.append(element("text", { x, y: stringLabelY, "text-anchor": "middle", class: "string-number" }, openName ? `${string} - ${openName}` : String(string)));
  });

  for (const tone of tones) {
    const x = xForString.get(tone.string);
    const y = tone.isOpen ? openY : topY + (tone.fret - 0.5) * fretHeight;
    appendTone(svg, tone, x, y, preference);
  }
  return svg;
}

function appendTone(svg, tone, x, y, preference) {
  const noteName = chromaticName(tone.pitchClass, preference);
  const classes = ["fret-note", "chord-tone"];
  if (tone.isSelected) classes.push("selected");
  if (tone.isRoot) classes.push("root");
  if (tone.isOpen) classes.push("open");
  const group = element("g", { class: classes.join(" ") });
  group.append(element("title", {}, `${noteName}, string ${tone.string}, ${tone.isOpen ? "open" : `fret ${tone.fret}`}`));
  group.append(element("circle", { cx: x, cy: y, r: tone.isSelected ? 16 : 9 }));
  const noteLabelAttributes = { x, y: y + (tone.isSelected ? 5 : 3), "text-anchor": "middle" };
  if (!tone.isSelected) noteLabelAttributes.class = "note-label-small";
  group.append(element("text", noteLabelAttributes, noteName));
  svg.append(group);
}


function pitchName(pitch) {
  const { letter, accidental } = parsePitch(pitch);
  return `${letter}${accidental}`;
}
