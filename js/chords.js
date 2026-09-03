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

// The strings used for chord voicings are every fretted (non-drone) string of the tuning.
// A drone string (e.g. a banjo's fifth string) is never part of a chord shape.
function chordStringsFor(tuning) {
  return tuning.strings.filter((string) => string.kind !== "drone");
}

// Only frets whose resulting pitch class belongs to the chord matter, so restricting the
// search to those candidates keeps the search fast regardless of how many strings the
// instrument has (banjo, guitar, mandolin, ukulele, etc. all share this same algorithm).
function candidateFrets(openMidi, pitchClasses, maxSearchFret) {
  const frets = [];
  for (let fret = 0; fret <= maxSearchFret; fret += 1) {
    if (pitchClasses.has((openMidi + fret) % 12)) frets.push(fret);
  }
  return frets;
}

export function findChordVoicing(tuning, rootPitchClass, qualityId, options = {}) {
  const { maxSearchFret = 12 } = options;
  const quality = getChordQuality(qualityId);
  if (!quality) throw new Error(`Unknown chord quality: ${qualityId}`);
  const strings = chordStringsFor(tuning);
  if (!strings.length) return null;
  const opens = strings.map((string) => pitchToMidi(string.pitch));
  const pcs = pitchClassesFor(rootPitchClass, quality);
  const perStringCandidates = opens.map((openMidi) => candidateFrets(openMidi, pcs, maxSearchFret));
  if (perStringCandidates.some((frets) => frets.length === 0)) return null;

  let best = null;
  const chosen = new Array(strings.length);
  function recurse(index) {
    if (index === strings.length) {
      const pitchClasses = chosen.map((fret, i) => (opens[i] + fret) % 12);
      const covered = new Set(pitchClasses);
      if ([...pcs].some((pc) => !covered.has(pc))) return;
      const fretted = chosen.filter((fret) => fret > 0);
      const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
      const total = chosen.reduce((sum, fret) => sum + fret, 0);
      const highestFret = Math.max(...chosen);
      const cost = [highestFret, span, total];
      if (!best || compareCost(cost, best.cost) < 0) best = { cost, frets: [...chosen], pitchClasses };
      return;
    }
    for (const fret of perStringCandidates[index]) {
      chosen[index] = fret;
      recurse(index + 1);
    }
  }
  recurse(0);
  if (!best) return null;
  return {
    highestFret: best.cost[0],
    notes: strings.map((string, index) => ({
      string: string.number,
      fret: best.frets[index],
      pitchClass: best.pitchClasses[index],
      isOpen: best.frets[index] === 0,
      isRoot: best.pitchClasses[index] === rootPitchClass
    }))
  };
}

export function generateChordBoardNotes(tuning, rootPitchClass, qualityId, options = {}) {
  const { maxSearchFret = 12, selectedFretsByString } = options;
  const quality = getChordQuality(qualityId);
  const voicing = findChordVoicing(tuning, rootPitchClass, qualityId, { maxSearchFret });
  const displayMaxFret = Math.max(MIN_DISPLAY_FRET, voicing ? voicing.highestFret : MIN_DISPLAY_FRET);
  if (!voicing) return { voicing: null, displayMaxFret, tones: [] };
  const pcs = pitchClassesFor(rootPitchClass, quality);
  const strings = chordStringsFor(tuning);
  const tones = [];
  strings.forEach((string, index) => {
    const open = pitchToMidi(string.pitch);
    const requestedFret = selectedFretsByString?.get(string.number);
    const selectedFret = Number.isInteger(requestedFret) && requestedFret >= 0 && requestedFret <= displayMaxFret && pcs.has((open + requestedFret) % 12)
      ? requestedFret
      : voicing.notes[index].fret;
    for (let fret = 0; fret <= displayMaxFret; fret += 1) {
      const pitchClass = (open + fret) % 12;
      if (!pcs.has(pitchClass)) continue;
      tones.push({
        string: string.number,
        fret,
        midi: open + fret,
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
