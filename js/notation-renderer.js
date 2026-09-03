import { splitNoteName } from "./pitch.js";

const NS = "http://www.w3.org/2000/svg";
const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const E4 = 4 * 7 + LETTER_INDEX.E;
const F5 = 5 * 7 + LETTER_INDEX.F;
const SHARP_SIGNATURE_POSITIONS = [F5, 5 * 7 + LETTER_INDEX.C, 5 * 7 + LETTER_INDEX.G, 5 * 7 + LETTER_INDEX.D, 4 * 7 + LETTER_INDEX.A, 5 * 7 + LETTER_INDEX.E, 4 * 7 + LETTER_INDEX.B];
const FLAT_SIGNATURE_POSITIONS = [4 * 7 + LETTER_INDEX.B, 5 * 7 + LETTER_INDEX.E, 4 * 7 + LETTER_INDEX.A, 5 * 7 + LETTER_INDEX.D, 4 * 7 + LETTER_INDEX.G, 5 * 7 + LETTER_INDEX.C, 4 * 7 + LETTER_INDEX.F];

// Bass (F) clef staff: bottom line G2, top line A3. Key-signature accidentals sit
// two octaves (14 diatonic steps) lower than their treble-clef counterparts so the
// same letter names land on the equivalent zigzag shape.
const BASS_SIGNATURE_OFFSET = -14;
// Bass (F) clef artwork, traced from the public-domain reference at
// https://commons.wikimedia.org/wiki/File:Bass_clef.svg (released into the public
// domain by its author, "Tlusťa"). Reusing real, professionally-drawn vector art avoids
// the unpredictable proportions of relying on a Unicode "𝄢" glyph (U+1D122) rendered by
// whatever font a browser falls back to.
//
// The reference file's own 5-line staff has line y-positions 6378, 6968, 7559, 8149,
// 8740 (spacing ~590.5) with its clef positioned relative to that staff, so we anchor
// on its F line (2nd from top, y=6968) and scale by our own line spacing (2 * step)
// divided by the reference's, then translate its staff-left x (984) to line up with
// where our own clef sits (matching the treble clef's x=86 inset from the staff's
// left edge at x=72).
const BASS_CLEF_REFERENCE_PATH =
  "M 1239,8245 C 1397,8138 1515,8057 1591,8001 C 1667,7946 1747,7877 1829,7795 C 1911,7713 1980,7620 2036,7517 C 2080,7441 2118,7353 2149,7253 C 2180,7154 2196,7058 2199,6967 C 2199,6882 2188,6801 2165,6725 C 2143,6648 2105,6585 2051,6534 C 1997,6484 1927,6459 1840,6459 C 1756,6459 1677,6476 1603,6509 C 1530,6543 1478,6597 1449,6673 C 1449,6680 1445,6689 1439,6702 C 1441,6718 1449,6730 1464,6739 C 1479,6748 1492,6752 1504,6752 C 1510,6752 1527,6749 1553,6743 C 1580,6737 1602,6733 1620,6733 C 1673,6733 1720,6752 1763,6789 C 1805,6826 1826,6871 1826,6924 C 1826,6962 1815,6998 1794,7031 C 1773,7064 1744,7091 1707,7110 C 1670,7130 1629,7139 1585,7139 C 1505,7139 1437,7115 1381,7066 C 1326,7016 1298,6953 1298,6874 C 1298,6773 1329,6686 1390,6612 C 1452,6538 1530,6483 1626,6446 C 1721,6408 1817,6390 1915,6390 C 2022,6390 2124,6417 2219,6472 C 2315,6526 2390,6601 2446,6694 C 2502,6788 2531,6888 2531,6996 C 2531,7188 2467,7366 2339,7531 C 2211,7696 2053,7839 1864,7961 C 1738,8044 1534,8156 1253,8297 L 1239,8245 z" +
  " M 2628,6698 C 2628,6662 2641,6632 2667,6608 C 2692,6583 2723,6571 2760,6571 C 2792,6571 2822,6585 2849,6612 C 2876,6638 2889,6669 2889,6703 C 2889,6739 2875,6770 2849,6795 C 2821,6819 2790,6831 2755,6831 C 2718,6831 2688,6819 2664,6792 C 2640,6766 2628,6735 2628,6698 z" +
  " M 2628,7222 C 2628,7186 2641,7155 2665,7131 C 2690,7106 2721,7094 2760,7094 C 2792,7094 2821,7107 2849,7134 C 2875,7161 2889,7190 2889,7222 C 2889,7261 2876,7292 2851,7317 C 2825,7342 2795,7355 2760,7355 C 2721,7355 2690,7342 2665,7318 C 2641,7294 2628,7262 2628,7222 z";
// Public-domain artwork from https://commons.wikimedia.org/wiki/File:Treble_clef.svg,
// by the same author and expressed in the same reference-staff coordinate system.
const TREBLE_CLEF_REFERENCE_PATH =
  "M 2002,7851 C 1941,7868 1886,7906 1835,7964 C 1784,8023 1759,8088 1759,8158 C 1759,8202 1774,8252 1803,8305 C 1832,8359 1876,8398 1933,8423 C 1952,8427 1961,8437 1961,8451 C 1961,8456 1954,8461 1937,8465 C 1846,8442 1771,8393 1713,8320 C 1655,8246 1625,8162 1623,8066 C 1626,7963 1657,7867 1716,7779 C 1776,7690 1853,7627 1947,7590 L 1878,7235 C 1724,7363 1599,7496 1502,7636 C 1405,7775 1355,7926 1351,8089 C 1353,8162 1368,8233 1396,8301 C 1424,8370 1466,8432 1522,8489 C 1635,8602 1782,8661 1961,8667 C 2022,8663 2087,8652 2157,8634 L 2002,7851 z M 2074,7841 L 2230,8610 C 2384,8548 2461,8413 2461,8207 C 2452,8138 2432,8076 2398,8021 C 2365,7965 2321,7921 2265,7889 C 2209,7857 2146,7841 2074,7841 z M 1869,6801 C 1902,6781 1940,6746 1981,6697 C 2022,6649 2062,6592 2100,6528 C 2139,6463 2170,6397 2193,6330 C 2216,6264 2227,6201 2227,6143 C 2227,6118 2225,6093 2220,6071 C 2216,6035 2205,6007 2186,5988 C 2167,5970 2143,5960 2113,5960 C 2053,5960 1999,5997 1951,6071 C 1914,6135 1883,6211 1861,6297 C 1838,6384 1825,6470 1823,6557 C 1828,6656 1844,6737 1869,6801 z M 1806,6859 C 1761,6697 1736,6532 1731,6364 C 1732,6256 1743,6155 1764,6061 C 1784,5967 1813,5886 1851,5816 C 1888,5746 1931,5693 1979,5657 C 2022,5625 2053,5608 2070,5608 C 2083,5608 2094,5613 2104,5622 C 2114,5631 2127,5646 2143,5666 C 2262,5835 2322,6039 2322,6277 C 2322,6390 2307,6500 2277,6610 C 2248,6719 2205,6823 2148,6920 C 2090,7018 2022,7103 1943,7176 L 2024,7570 C 2068,7565 2098,7561 2115,7561 C 2191,7561 2259,7577 2322,7609 C 2385,7641 2439,7684 2483,7739 C 2527,7793 2561,7855 2585,7925 C 2608,7995 2621,8068 2621,8144 C 2621,8262 2590,8370 2528,8467 C 2466,8564 2373,8635 2248,8681 C 2256,8730 2270,8801 2291,8892 C 2311,8984 2326,9057 2336,9111 C 2346,9165 2350,9217 2350,9268 C 2350,9347 2331,9417 2293,9479 C 2254,9541 2202,9589 2136,9623 C 2071,9657 1999,9674 1921,9674 C 1811,9674 1715,9643 1633,9582 C 1551,9520 1507,9437 1503,9331 C 1506,9284 1517,9240 1537,9198 C 1557,9156 1584,9122 1619,9096 C 1653,9069 1694,9055 1741,9052 C 1780,9052 1817,9063 1852,9084 C 1886,9106 1914,9135 1935,9172 C 1955,9209 1966,9250 1966,9294 C 1966,9353 1946,9403 1906,9444 C 1866,9485 1815,9506 1754,9506 L 1731,9506 C 1770,9566 1834,9597 1923,9597 C 1968,9597 2014,9587 2060,9569 C 2107,9550 2146,9525 2179,9493 C 2212,9461 2234,9427 2243,9391 C 2260,9350 2268,9293 2268,9222 C 2268,9174 2263,9126 2254,9078 C 2245,9031 2231,8968 2212,8890 C 2193,8813 2179,8753 2171,8712 C 2111,8727 2049,8735 1984,8735 C 1875,8735 1772,8713 1675,8668 C 1578,8623 1493,8561 1419,8481 C 1346,8401 1289,8311 1248,8209 C 1208,8108 1187,8002 1186,7892 C 1190,7790 1209,7692 1245,7600 C 1281,7507 1327,7419 1384,7337 C 1441,7255 1500,7180 1561,7113 C 1623,7047 1704,6962 1806,6859 z";
export const BASS_CLEF_REFERENCE = {
  lineSpacing: 590.5,
  fLineY: 6968,
  topLineY: 6378,
  staffLeftX: 984,
  dot1CenterY: 6701,
  dot2CenterY: 7224.5
};
export const TREBLE_CLEF_REFERENCE = {
  lineSpacing: 590.5,
  anchorLineY: 8149,
  topLineY: 6378,
  staffLeftX: 984
};

// Public-domain artwork from https://commons.wikimedia.org/wiki/File:Sharp.svg
// and https://commons.wikimedia.org/wiki/File:Flat.svg. Coordinates remain in the
// source files' spaces so rendering tests can compare the paths directly.
const SHARP_REFERENCE_PATH = "M 86.102000,447.45700 L 86.102000,442.75300 L 88.102000,442.20100 L 88.102000,446.88100 L 86.102000,447.45700 z M 90.040000,446.31900 L 88.665000,446.71300 L 88.665000,442.03300 L 90.040000,441.64900 L 90.040000,439.70500 L 88.665000,440.08900 L 88.665000,435.30723 L 88.102000,435.30723 L 88.102000,440.23400 L 86.102000,440.80900 L 86.102000,436.15923 L 85.571000,436.15923 L 85.571000,440.98600 L 84.196000,441.37100 L 84.196000,443.31900 L 85.571000,442.93500 L 85.571000,447.60600 L 84.196000,447.98900 L 84.196000,449.92900 L 85.571000,449.54500 L 85.571000,454.29977 L 86.102000,454.29977 L 86.102000,449.37500 L 88.102000,448.82500 L 88.102000,453.45077 L 88.665000,453.45077 L 88.665000,448.65100 L 90.040000,448.26600 L 90.040000,446.31900 z";
const FLAT_REFERENCE_PATH = "M 98.166,443.657 C 98.166,444.232 97.950425,444.78273 97.359,445.52188 C 96.732435,446.30494 96.205,446.75313 95.51,447.28013 L 95.51,443.848 C 95.668,443.449 95.901,443.126 96.21,442.878 C 96.518,442.631 96.83,442.507 97.146,442.507 C 97.668,442.507 97.999,442.803 98.142,443.393 C 98.158,443.441 98.166,443.529 98.166,443.657 z M 98.091,441.257 C 97.66,441.257 97.222,441.376 96.776,441.615 C 96.33,441.853 95.908,442.172 95.51,442.569 L 95.51,435.29733 L 94.947,435.29733 L 94.947,447.75213 C 94.947,448.10413 95.043,448.28013 95.235,448.28013 C 95.346,448.28013 95.483913,448.18713 95.69,448.06413 C 96.27334,447.71598 96.636935,447.48332 97.032,447.23788 C 97.482617,446.95792 97.99,446.631 98.661,445.991 C 99.124,445.526 99.459,445.057 99.667,444.585 C 99.874,444.112 99.978,443.644 99.978,443.179 C 99.978,442.491 99.795,442.002 99.429,441.713 C 99.015,441.409 98.568,441.257 98.091,441.257 z";
export const ACCIDENTAL_REFERENCES = {
  "#": { path: SHARP_REFERENCE_PATH, className: "sharp-sign", sourceX: 84.196, sourceY: 435.303, width: 6, height: 19, anchorY: 9.5 },
  b: { path: FLAT_REFERENCE_PATH, className: "flat-sign", sourceX: 94.947, sourceY: 435.28013, width: 6, height: 13, anchorY: 9.5 }
};

const CLEFS = {
  treble: {
    bottom: E4,
    top: F5,
    glyphMode: "treble-reference-art",
    artworkPath: TREBLE_CLEF_REFERENCE_PATH,
    artworkReference: TREBLE_CLEF_REFERENCE,
    artworkClass: "treble-clef",
    anchorDiatonic: 4 * 7 + LETTER_INDEX.G,
    signaturePositions: {
      sharp: SHARP_SIGNATURE_POSITIONS,
      flat: FLAT_SIGNATURE_POSITIONS
    }
  },
  bass: {
    bottom: 2 * 7 + LETTER_INDEX.G,
    top: 3 * 7 + LETTER_INDEX.A,
    glyphMode: "bass-reference-art",
    artworkPath: BASS_CLEF_REFERENCE_PATH,
    artworkReference: { ...BASS_CLEF_REFERENCE, anchorLineY: BASS_CLEF_REFERENCE.fLineY },
    artworkClass: "bass-clef",
    anchorDiatonic: 3 * 7 + LETTER_INDEX.F,
    signaturePositions: {
      sharp: SHARP_SIGNATURE_POSITIONS.map((position) => position + BASS_SIGNATURE_OFFSET),
      flat: FLAT_SIGNATURE_POSITIONS.map((position) => position + BASS_SIGNATURE_OFFSET)
    }
  }
};

function clefFor(options) {
  return CLEFS[options.clef] || CLEFS.treble;
}

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
  const clef = clefFor(options);
  const step = options.staffSize === "compact" ? 23 : options.staffSize === "large" ? 33 : 28;
  const preparedNotes = notes.map(prepareNote);
  const keySignature = options.keySignature || [];
  const signaturePositions = positionsForKeySignature(keySignature, clef);
  const topDiatonic = Math.max(clef.top, ...preparedNotes.map((note) => note.diatonic), ...signaturePositions);
  const bottomDiatonic = Math.min(clef.bottom, ...preparedNotes.map((note) => note.diatonic));
  const contentTop = 120;
  const contentBottom = 160;
  const signatureX = clef.glyphMode === "bass-reference-art" ? 290 : 250;
  const signatureGap = step * 1.5;
  const signatureWidth = Math.max(0, keySignature.length - 1) * signatureGap;
  const columnStart = Math.max(350, signatureX + signatureWidth + step * 2.6);
  const columnGap = step * 3.8;
  const columns = columnStrings(options.tuning).map((string, index) => ({ string, x: columnStart + index * columnGap }));
  const staffRight = columns.at(-1).x + step * 2.5;
  const width = Math.max(760, staffRight + 30);
  const height = contentTop + (topDiatonic - bottomDiatonic) * step + contentBottom;
  const yForDiatonic = (diatonic) => contentTop + (topDiatonic - diatonic) * step;
  const svg = element("svg", { class: "notation-svg", viewBox: `0 0 ${width} ${height}`, role: "group", "aria-labelledby": "diagram-svg-title diagram-svg-desc", xmlns: NS });
  svg.append(element("title", { id: "diagram-svg-title" }, title));
  svg.append(element("desc", { id: "diagram-svg-desc" }, `A shared ${options.clef === "bass" ? "bass" : "treble"} staff with separate string and fret columns for strings ${columns.map((column) => column.string).join(" through ")}.`));
  svg.append(element("text", { x: 20, y: 29, class: "diagram-title" }, title));
  for (const column of columns) svg.append(element("text", { x: column.x, y: 57, class: "column-label" }, `String ${column.string}`));

  drawStaff(svg, yForDiatonic, step, keySignature, staffRight, signatureX, signatureGap, clef);
  drawStringColumns(svg, preparedNotes, columns, yForDiatonic, step, clef);
  if (!notes.length) svg.append(element("text", { x: width / 2, y: 110, "text-anchor": "middle", class: "empty-label" }, "No playable notes in this range."));
  return svg;
}

function prepareNote(note) {
  const parsed = splitNoteName(note.noteName);
  return { ...note, diatonic: note.octave * 7 + LETTER_INDEX[parsed.letter] };
}

function drawStringColumns(svg, notes, columns, yForDiatonic, step, clef) {
  const xByString = new Map(columns.map((column) => [column.string, column.x]));
  for (const note of notes) {
    for (const position of note.positions.filter((item) => xByString.has(item.string))) {
      const x = xByString.get(position.string);
      const label = `${position.string}:${position.fret}`;
      const description = accessibleDescription(note, position);
      const group = element("g", {
        class: `note-entry string-column-entry playable-note${note.isScaleNote ? " scale-note" : ""}${note.isTonic ? " tonic" : ""}`,
        "data-midi": note.midi,
        "data-string": position.string,
        "data-fret": position.fret,
        role: "button",
        tabindex: "0",
        "aria-label": `Play ${description}`
      });
      group.append(element("title", {}, description));
      drawLedgerLines(group, x, label, note.diatonic, yForDiatonic, step, clef);
      group.append(element("text", {
        x,
        y: yForDiatonic(note.diatonic),
        class: "position-label string-column-position",
        "dominant-baseline": "middle",
        "font-size": step
      }, label));
      svg.append(group);
    }
  }
}

function drawLedgerLines(group, x, label, diatonic, yForDiatonic, step, clef) {
  const textWidth = measureTextWidth(label, step);
  const centerX = x + textWidth / 2;
  const halfWidth = textWidth / 2 + step * 0.35;
  const linesAbove = Math.floor((diatonic - clef.top) / 2);
  for (let line = 1; line <= linesAbove; line += 1) {
    const y = yForDiatonic(clef.top + line * 2);
    group.append(element("line", { x1: centerX - halfWidth, x2: centerX + halfWidth, y1: y, y2: y, class: "ledger-line" }));
  }
  const linesBelow = Math.floor((clef.bottom - diatonic) / 2);
  for (let line = 1; line <= linesBelow; line += 1) {
    const y = yForDiatonic(clef.bottom - line * 2);
    group.append(element("line", { x1: centerX - halfWidth, x2: centerX + halfWidth, y1: y, y2: y, class: "ledger-line" }));
  }
}

let measurementContext;
function measureTextWidth(label, step) {
  if (measurementContext === undefined) {
    measurementContext = null;
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      const canvas = document.createElement("canvas");
      measurementContext = canvas.getContext && canvas.getContext("2d");
    }
  }
  if (measurementContext) {
    measurementContext.font = `700 ${step}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    return measurementContext.measureText(label).width;
  }
  return label.length * step * 0.6;
}

function drawStaff(svg, yForDiatonic, step, keySignature, staffRight, signatureX, signatureGap, clef) {
  for (let line = 0; line < 5; line += 1) {
    const y = yForDiatonic(clef.bottom + line * 2);
    svg.append(element("line", { x1: 72, x2: staffRight, y1: y, y2: y, class: "staff-line" }));
  }
  const clefAnchorY = yForDiatonic(clef.anchorDiatonic);
  drawReferenceClef(svg, clef, clefAnchorY, step);
  const positions = positionsForKeySignature(keySignature, clef);
  keySignature.forEach((item, index) => {
    drawKeySignatureAccidental(svg, item.accidental, signatureX + index * signatureGap, yForDiatonic(positions[index]), step);
  });
}

function positionsForKeySignature(keySignature, clef) {
  const positions = keySignature[0]?.accidental === "b" ? clef.signaturePositions.flat : clef.signaturePositions.sharp;
  return positions.slice(0, keySignature.length);
}

function drawReferenceClef(svg, clef, anchorLineY, step) {
  const reference = clef.artworkReference;
  const scale = (step * 2) / reference.lineSpacing;
  const staffLeft = 72;
  const translateX = staffLeft - reference.staffLeftX * scale;
  const translateY = anchorLineY - reference.anchorLineY * scale;
  svg.append(element("path", {
    d: clef.artworkPath,
    class: `clef ${clef.artworkClass}`,
    transform: `translate(${translateX} ${translateY}) scale(${scale})`
  }));
}

function drawKeySignatureAccidental(svg, accidental, x, y, step) {
  const reference = ACCIDENTAL_REFERENCES[accidental];
  const scale = (step * 3) / reference.height;
  const translateX = x - reference.sourceX * scale;
  const translateY = y - (reference.sourceY + reference.anchorY) * scale;
  svg.append(element("path", {
    d: reference.path,
    class: `key-signature ${reference.className}`,
    transform: `translate(${translateX} ${translateY}) scale(${scale})`
  }));
}

function accessibleDescription(note, position) {
  const fret = position.isOpen ? "open" : `fret ${position.fret}`;
  return `${note.noteName}${note.octave}: string ${position.string} ${fret}.`;
}
