import { parsePitch, pitchToMidi } from "./pitch.js";
import { chromaticName } from "./scales.js";

const NS = "http://www.w3.org/2000/svg";

function element(name, attributes = {}, text = "") {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}

export function renderChordBoard(board, title, tuning, root, quality) {
  return renderChordBoardWithShape(board, title, tuning, root, quality);
}

export function renderChordBoardWithShape(board, title, tuning, root, quality, shape = null) {
  const { displayMaxFret, tones, voicing } = board;
  const strings = tuning.strings.filter((string) => string.kind !== "drone").map((string) => string.number);
  const chordLabel = `${root.label.split(" ")[0]}${quality.symbol}`;

  return renderVertical(strings, displayMaxFret, tones, title, tuning, chordLabel, root.preference, { voicing, rootPitchClass: root.pitchClass, shape });
}

export function renderCompactChordShape(shape, tuning, label = "Chord shape") {
  if (!shape) return "";
  const strings = tuning.strings.filter((string) => string.kind !== "drone");
  if (shape.stringOrder !== "tuning") strings.sort((a, b) => pitchToMidi(a.pitch) - pitchToMidi(b.pitch));
  const width = Math.max(180, strings.length * 30 + 35);
  const height = 150;
  const xFor = (index) => 25 + index * 30;
  const fretted = shape.frets.filter((fret) => fret > 0);
  const base = fretted.length ? Math.max(1, Math.min(...fretted)) : 1;
  const svg = element("svg", { class: "compact-chord-diagram", viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `${label}. ${shapeDescription(shape, strings)}`, xmlns: NS });
  svg.append(element("title", {}, `${label}. ${shapeDescription(shape, strings)}`));
  strings.forEach((_string, index) => svg.append(element("line", { x1: xFor(index), x2: xFor(index), y1: 32, y2: 122, class: "shape-string" })));
  for (let fret = 0; fret <= 4; fret += 1) svg.append(element("line", { x1: 25, x2: width - 5, y1: 32 + fret * 22, y2: 32 + fret * 22, class: fret === 0 && base === 1 ? "shape-nut" : "shape-fret" }));
  strings.forEach((string, index) => {
    const fret = shape.frets[index];
    const x = xFor(index);
    if (fret < 0) svg.append(element("text", { x, y: 20, "text-anchor": "middle", class: "shape-muted" }, "X"));
    else if (fret === 0) svg.append(element("text", { x, y: 20, "text-anchor": "middle", class: "shape-open" }, "O"));
    else {
      const group = element("g", { class: "shape-fretted" });
      group.append(element("circle", { cx: x, cy: 32 + (fret - base + 0.5) * 22, r: 9 }));
      svg.append(group);
    }
  });
  if (shape.drone) svg.append(element("text", { x: width - 5, y: 145, "text-anchor": "end", class: shape.drone.state === "open" ? "shape-open" : "shape-muted" }, `drone ${shape.drone.state === "open" ? "O" : "X"}`));
  return svg;
}

export function renderScaleBoard(board, title, tuning, root, scale) {
  const strings = tuning.strings.filter((string) => string.kind !== "drone").map((string) => string.number);
  const scaleLabel = `${root.value} ${scale.name}`;
  return renderVertical(strings, board.displayMaxFret, board.tones, title, tuning, scaleLabel, root.preference, { type: "scale", rootPitchClass: root.pitchClass });
}

export function renderEarTrainingBoard({ tuning, maxFret = 5, targetMidi = null, targetString = null, detectedMidi = null, preference = "sharp", title = "Ear training" }) {
  const strings = tuning.strings.filter((string) => string.kind !== "drone").map((string) => string.number);
  const tones = [];
  for (const string of tuning.strings.filter((item) => item.kind !== "drone")) {
    const openMidi = pitchToMidi(string.pitch);
    for (let fret = 0; fret <= maxFret; fret += 1) {
      const midi = openMidi + fret;
      tones.push({ string: string.number, fret, midi, pitchClass: midi % 12, noteName: chromaticName(midi % 12, preference), isOpen: fret === 0 });
    }
  }
  return renderVertical(strings, maxFret, tones, title, tuning, "Find the pitch", preference, {
    type: "ear-training",
    rootPitchClass: 0,
    targetMidi,
    targetString,
    detectedMidi,
    ariaLabel: "Ear-training fretboard. Select a note to answer."
  });
}

function renderVertical(strings, displayMaxFret, tones, title, tuning, label, preference, options = {}) {
  const { type = "chord", voicing = true, rootPitchClass, targetMidi = null, targetString = null, detectedMidi = null, ariaLabel, shape = null } = options;
  const leftX = 65;
  const stringGap = 52;
  const rightX = leftX + Math.max(1, strings.length - 1) * stringGap;
  const stringLabelY = 82;
  const openY = 140;
  const topY = 156;
  const boardHeight = 302;
  const bottomY = topY + boardHeight;
  const fretHeight = boardHeight / displayMaxFret;
  const width = rightX + 70;
  const height = bottomY + 40;
  const svg = element("svg", { class: "fretboard-svg fretboard-board chord-board vertical", viewBox: `0 0 ${width} ${height}`, role: "group", "aria-label": ariaLabel || `${label} ${type} on ${title}. Select one tone per string, then swipe across the strings to strum.`, xmlns: NS });
  const heading = element("text", { x: width / 2, y: 20, "text-anchor": "middle", class: "diagram-title" });
  const lines = [];
  const maxCharacters = Math.floor((width - 40) / 7);
  for (const section of [title, label]) {
    let line = "";
    for (const word of section.split(" ")) {
      if (line && `${line} ${word}`.length > maxCharacters) {
        lines.push(line);
        line = "";
      }
      line = line ? `${line} ${word}` : word;
    }
    lines.push(line);
  }
  lines.forEach((line, index) => heading.append(element("tspan", { x: width / 2, dy: index ? 16 : 0 }, line)));
  svg.append(heading);

  if (!voicing) {
    svg.append(element("text", { x: 20, y: 90, class: "no-shape-message" }, `No complete ${label} shape found within 12 frets for this tuning.`));
    return svg;
  }

  svg.append(element("rect", {
    x: leftX - stringGap / 2,
    y: openY - 18,
    width: rightX - leftX + stringGap,
    height: bottomY - openY + 24,
    class: "strum-hit-area"
  }));

  for (let fret = 0; fret <= displayMaxFret; fret += 1) {
    const y = topY + fret * fretHeight;
    svg.append(element("line", { x1: leftX, x2: rightX, y1: y, y2: y, class: fret === 0 ? "nut" : "fret" }));
    if (fret > 0) svg.append(element("text", { x: leftX - 26, y: topY + (fret - 0.5) * fretHeight + 5, "text-anchor": "end", class: "fret-number" }, fret));
  }
  // String 1 (highest-pitched/thinnest) on the right, highest-numbered (lowest-pitched/thickest)
  // string on the left — matches holding the instrument with the pegboard up.
  const xForString = new Map();
  strings.forEach((string) => {
    const x = rightX - (string - 1) * stringGap;
    xForString.set(string, x);
    svg.append(element("line", { x1: x, x2: x, y1: topY, y2: bottomY, class: "string-line", "data-string": string }));
    const openString = tuning.strings.find((item) => item.number === string);
    const openName = openString ? pitchName(openString.pitch) : "";
    svg.append(element("text", { x, y: stringLabelY, "text-anchor": "middle", class: "string-number" }, openName ? `${string} - ${openName}` : String(string)));
  });

  if (shape) appendShapeIndicators(svg, shape, tuning, strings, displayMaxFret, { leftX, rightX, stringGap, topY, openY, fretHeight });

  for (const tone of tones) {
    const x = xForString.get(tone.string);
    const y = tone.isOpen ? openY : topY + (tone.fret - 0.5) * fretHeight;
    appendTone(svg, tone, x, y, preference, rootPitchClass, type, { targetMidi, targetString, detectedMidi });
  }
  return svg;
}

function appendShapeIndicators(svg, shape, tuning, strings, displayMaxFret, layout) {
  const ordered = tuning.strings.filter((string) => string.kind !== "drone");
  if (shape.stringOrder !== "tuning") ordered.sort((a, b) => pitchToMidi(a.pitch) - pitchToMidi(b.pitch));
  ordered.forEach((string, index) => {
    const fret = shape.frets[index];
    const x = layout.rightX - (string.number - 1) * layout.stringGap;
    if (fret < 0) svg.append(element("text", { x, y: layout.openY - 28, "text-anchor": "middle", class: "shape-marker shape-muted", "data-string": string.number }, "X"));
    else if (fret === 0) svg.append(element("text", { x, y: layout.openY - 28, "text-anchor": "middle", class: "shape-marker shape-open", "data-string": string.number }, "O"));
    else if (fret <= displayMaxFret) svg.append(element("circle", { cx: x, cy: layout.topY + (fret - 0.5) * layout.fretHeight, r: 16, class: "shape-marker shape-fretted", "data-string": string.number }));
  });
}

function shapeDescription(shape, strings) {
  return strings.map((string, index) => {
    const fret = shape.frets[index];
    const finger = shape.fingers?.[index] || 0;
    if (fret < 0) return `String ${string.number} muted`;
    if (fret === 0) return `String ${string.number} open`;
    return `String ${string.number}, fret ${fret}${finger ? `, finger ${finger}` : ""}`;
  }).join(". ");
}

function appendTone(svg, tone, x, y, preference, rootPitchClass, type, options = {}) {
  const { targetMidi = null, targetString = null, detectedMidi = null } = options;
  const noteName = tone.noteName || chromaticName(tone.pitchClass, preference);
  const interval = (tone.pitchClass - rootPitchClass + 12) % 12;
  const toneStrength = Math.round(100 - interval * 7.5);
  const classes = ["fret-note", "fretboard-tone", `${type}-tone`];
  if (tone.isSelected) classes.push("selected");
  if (tone.isRoot) classes.push("root");
  if (tone.isOpen) classes.push("open");
  if (type === "ear-training" && tone.midi === targetMidi && (targetString === null || tone.string === targetString)) classes.push("target-note");
  if (type === "ear-training" && tone.midi === detectedMidi) classes.push("detected-note");
  const position = tone.isOpen ? "open" : `fret ${tone.fret}`;
  const group = element("g", {
    class: `${classes.join(" ")} playable-note`,
    "data-midi": tone.midi,
    "data-string": tone.string,
    "data-fret": tone.fret,
    "data-interval": interval,
    style: `--tone-strength: ${toneStrength}%`,
    role: "button",
    tabindex: "0",
    "aria-pressed": String(tone.isSelected),
    "aria-label": `${type === "ear-training" ? "Play" : tone.isSelected ? "Selected" : "Select"} ${noteName}, string ${tone.string}, ${position}`
  });
  group.append(element("title", {}, `${noteName}, string ${tone.string}, ${position}`));
  group.append(element("circle", { cx: x, cy: y, r: tone.isSelected ? 16 : type === "ear-training" && (tone.midi === targetMidi || tone.midi === detectedMidi) ? 13 : 9 }));
  const noteLabelAttributes = { x, y: y + (tone.isSelected ? 5 : 3), "text-anchor": "middle" };
  if (!tone.isSelected) noteLabelAttributes.class = "note-label-small";
  group.append(element("text", noteLabelAttributes, noteName));
  svg.append(group);
}


function pitchName(pitch) {
  const { letter, accidental } = parsePitch(pitch);
  return `${letter}${accidental}`;
}
