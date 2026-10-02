import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { validateChordShape } from "../js/chord-shape-validator.js";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
const chordsDb = resolve(args.get("--chords-db") || "./upstream/chords-db");
const ohana = resolve(args.get("--ohana") || "./upstream/open-source-orchestrator/shapes");
const output = resolve(args.get("--out") || "./js/chord-shape-data.js");
const qualities = { major: "major", minor: "minor", "7": "dom7", m7: "min7", maj7: "maj7", sus2: "sus2", sus4: "sus4" };
const roots = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const sourceNotice = (dataset, license) => ({ dataset, license });
const tuningPitches = { guitar: ["E2", "A2", "D3", "G3", "B3", "E4"], ukulele: ["G4", "C4", "E4", "A4"], mandolin: ["G3", "D4", "A4", "E5"], banjo5: ["D3", "G3", "B3", "D4"] };

function normalizeBarres(barres, frets, fingers) {
  return (barres || []).flatMap((fret) => {
    const indexes = frets.map((value, index) => value === fret && fingers[index] === 1 ? index : -1).filter((index) => index >= 0);
    return indexes.length > 1 ? [{ fret, fromString: indexes[0], toString: indexes.at(-1), finger: 1 }] : [];
  });
}

function shape(instrument, tuning, rootPitchClass, qualityId, frets, fingers, source, tags = [], stringOrder = "low-to-high") {
  return { id: `${instrument}:${tuning}:${rootPitchClass}:${qualityId}:${frets.join(",")}`, instrument, tuning, rootPitchClass, qualityId, frets, fingers, stringOrder, barres: [], tags, source };
}

async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }

function addValidated(item) {
  const pitches = tuningPitches[item.instrument].map((pitch) => ({ pitch, kind: "long" }));
  if (item.instrument === "banjo5") pitches.push({ pitch: "G4", kind: "drone" });
  const tuning = { strings: pitches };
  if (!validateChordShape(item, tuning)) {
    console.warn(`Skipped invalid ${item.instrument} ${item.rootPitchClass}:${item.qualityId} ${item.frets.join("")}`);
    return;
  }
  shapes.push(item);
}

const shapes = [];
for (const instrument of ["guitar", "ukulele"]) {
  const db = await readJson(join(chordsDb, "lib", `${instrument}.json`));
  for (const [root, entries] of Object.entries(db.main ? db.chords : {})) {
    for (const entry of entries) {
      const qualityId = qualities[entry.suffix];
      if (!qualityId || roots[root] == null) continue;
      for (const [index, position] of entry.positions.entries()) {
        const frets = position.frets.map((fret) => fret <= 0 ? fret : fret + (position.baseFret || 1) - 1);
        const fingers = (position.fingers || frets.map(() => 0)).map((finger) => finger <= 0 ? 0 : finger);
        const item = shape(instrument, instrument === "guitar" ? "EADGBE" : "GCEA", roots[root], qualityId, frets, fingers, sourceNotice("chords-db", "MIT"), index === 0 ? ["preferred", "common", ...(position.baseFret === 1 ? ["open"] : [])] : ["alternate"], instrument === "ukulele" ? "tuning" : "low-to-high");
        item.barres = normalizeBarres(position.barres, frets, fingers);
        addValidated(item);
      }
    }
  }
}

for (const root of ["C", "Csharp", "D", "Eb", "E", "F", "Fsharp", "G", "Ab", "A", "Bb", "B"]) {
  for (const quality of Object.keys(qualities)) {
    const file = `${root}_${quality === "7" ? "7" : quality === "m7" ? "m7" : quality}.json`;
    const data = await readJson(join(ohana, file));
    for (const [instrument, tuning, sourceInstrument] of [["mandolin", "GDAE", "mandolin"], ["banjo5", "gDGBD", "banjo"]]) {
      const entry = data[sourceInstrument];
      if (!entry) continue;
      const qualityId = qualities[quality];
      const item = shape(instrument, tuning, data.pitch_classes[0], qualityId, entry.frets, entry.fingers, sourceNotice("ohana", "CC0-1.0"), ["preferred", ...(entry.curated ? ["common"] : [])]);
      item.barres = (entry.barres || []).map((fret) => ({ fret, fromString: 0, toString: entry.frets.length - 1, finger: 1 }));
      if (instrument === "banjo5") item.drone = { state: entry.drone?.fits_open ? "open" : "mute" };
      addValidated(item);
    }
  }
}

shapes.sort((a, b) => `${a.instrument}:${a.tuning}:${a.rootPitchClass}:${a.qualityId}:${a.frets.join(",")}`.localeCompare(`${b.instrument}:${b.tuning}:${b.rootPitchClass}:${b.qualityId}:${b.frets.join(",")}`));
const uniqueShapes = new Map();
for (const item of shapes) {
  const key = `${item.instrument}:${item.tuning}:${item.rootPitchClass}:${item.qualityId}:${item.frets.join(",")}`;
  if (!uniqueShapes.has(key)) uniqueShapes.set(key, item);
}
const deduplicatedShapes = [...uniqueShapes.values()];
if (new Set(deduplicatedShapes.map((item) => item.id)).size !== deduplicatedShapes.length) throw new Error("Duplicate chord-shape IDs remain after import");
await writeFile(output, `// Generated by scripts/import-chord-shapes.mjs. Do not edit by hand.\nexport const CHORD_SHAPES = ${JSON.stringify(deduplicatedShapes, null, 2)};\n`);
console.log(`Wrote ${deduplicatedShapes.length} normalized chord shapes to ${output}`);
