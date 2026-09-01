import { pitchToMidi } from "./pitch.js";

export const CHORD_QUALITIES = [
  { id: "major", label: "Major", symbol: "", intervals: [0, 4, 7] },
  { id: "minor", label: "Minor", symbol: "m", intervals: [0, 3, 7] },
  { id: "power5", label: "5 (power chord)", symbol: "5", intervals: [0, 7] },
  { id: "dom7", label: "Dominant 7", symbol: "7", intervals: [0, 4, 7, 10] },
  { id: "maj7", label: "Major 7", symbol: "maj7", intervals: [0, 4, 7, 11] },
  { id: "min7", label: "Minor 7", symbol: "m7", intervals: [0, 3, 7, 10] },
  { id: "dim", label: "Diminished", symbol: "dim", intervals: [0, 3, 6] },
  { id: "aug", label: "Augmented", symbol: "aug", intervals: [0, 4, 8] },
  { id: "sus2", label: "Sus2", symbol: "sus2", intervals: [0, 2, 7] },
  { id: "sus4", label: "Sus4", symbol: "sus4", intervals: [0, 5, 7] }
];

const CHORD_STRINGS = [1, 2, 3, 4];
const MIN_DISPLAY_FRET = 5;

export function getChordQuality(id) {
  return CHORD_QUALITIES.find((quality) => quality.id === id);
}

function pitchClassesFor(rootPitchClass, quality) {
  return new Set(quality.intervals.map((interval) => (rootPitchClass + interval) % 12));
}

function compareCost(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

export function findChordVoicing(tuning, rootPitchClass, qualityId, options = {}) {
  const { maxSearchFret = 12 } = options;
  const quality = getChordQuality(qualityId);
  if (!quality) throw new Error(`Unknown chord quality: ${qualityId}`);
  const strings = CHORD_STRINGS.map((number) => tuning.strings.find((string) => string.number === number));
  if (strings.some((string) => !string)) return null;
  const opens = strings.map((string) => pitchToMidi(string.pitch));
  const pcs = pitchClassesFor(rootPitchClass, quality);
  let best = null;
  for (let level = 0; level <= maxSearchFret; level += 1) {
    for (let a = 0; a <= level; a += 1) {
      for (let b = 0; b <= level; b += 1) {
        for (let c = 0; c <= level; c += 1) {
          for (let d = 0; d <= level; d += 1) {
            if (a !== level && b !== level && c !== level && d !== level) continue;
            const frets = [a, b, c, d];
            const pitchClasses = frets.map((fret, index) => (opens[index] + fret) % 12);
            if (pitchClasses.some((pc) => !pcs.has(pc))) continue;
            const covered = new Set(pitchClasses);
            if ([...pcs].some((pc) => !covered.has(pc))) continue;
            const fretted = frets.filter((fret) => fret > 0);
            const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
            const total = frets.reduce((sum, fret) => sum + fret, 0);
            const cost = [level, span, total];
            if (!best || compareCost(cost, best.cost) < 0) best = { cost, frets: [...frets], pitchClasses: [...pitchClasses] };
          }
        }
      }
    }
    if (best) break;
  }
  if (!best) return null;
  return {
    highestFret: best.cost[0],
    notes: CHORD_STRINGS.map((number, index) => ({
      string: number,
      fret: best.frets[index],
      pitchClass: best.pitchClasses[index],
      isOpen: best.frets[index] === 0,
      isRoot: best.pitchClasses[index] === rootPitchClass
    }))
  };
}

export function generateChordBoardNotes(tuning, rootPitchClass, qualityId, options = {}) {
  const { maxSearchFret = 12 } = options;
  const quality = getChordQuality(qualityId);
  const voicing = findChordVoicing(tuning, rootPitchClass, qualityId, { maxSearchFret });
  const displayMaxFret = Math.max(MIN_DISPLAY_FRET, voicing ? voicing.highestFret : MIN_DISPLAY_FRET);
  if (!voicing) return { voicing: null, displayMaxFret, tones: [] };
  const pcs = pitchClassesFor(rootPitchClass, quality);
  const strings = CHORD_STRINGS.map((number) => tuning.strings.find((string) => string.number === number));
  const tones = [];
  strings.forEach((string, index) => {
    const stringNumber = CHORD_STRINGS[index];
    const open = pitchToMidi(string.pitch);
    const selectedFret = voicing.notes[index].fret;
    for (let fret = 0; fret <= displayMaxFret; fret += 1) {
      const pitchClass = (open + fret) % 12;
      if (!pcs.has(pitchClass)) continue;
      tones.push({
        string: stringNumber,
        fret,
        pitchClass,
        isOpen: fret === 0,
        isRoot: pitchClass === rootPitchClass,
        isSelected: fret === selectedFret
      });
    }
  });
  return { voicing, displayMaxFret, tones };
}

export function hasChordVoicing(tuning, rootPitchClass, qualityId, options = {}) {
  return findChordVoicing(tuning, rootPitchClass, qualityId, options) !== null;
}
