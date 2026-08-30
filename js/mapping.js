import { pitchToMidi, toDisplayedMidi } from "./pitch.js";
import { chromaticName, scalePitchClasses, spellScale } from "./scales.js";

export function enabledStrings(tuning, fifthMode = "excluded") {
  return tuning.strings.filter((string) => string.number !== 5 || fifthMode !== "excluded");
}

export function getAutomaticRange(tuning, maxFret, fifthMode = "excluded") {
  const strings = enabledStrings(tuning, fifthMode);
  return {
    low: Math.min(...strings.map((string) => pitchToMidi(string.pitch))),
    high: Math.max(...strings.map((string) => {
      if (string.number !== 5) return pitchToMidi(string.pitch) + maxFret;
      return pitchToMidi(string.pitch) + (fifthMode === "drone" ? 0 : Math.max(0, maxFret - string.startsAtPhysicalFret));
    }))
  };
}

export function positionsForMidi(midi, tuning, options = {}) {
  const { maxFret = 5, fifthMode = "excluded", fifthNumbering = "physical", preference = "all" } = options;
  const positions = [];
  for (const string of enabledStrings(tuning, fifthMode)) {
    const relativeFret = midi - pitchToMidi(string.pitch);
    const physicalFret = string.number === 5 ? string.startsAtPhysicalFret + relativeFret : relativeFret;
    if (relativeFret < 0 || physicalFret > maxFret || (string.number === 5 && fifthMode === "drone" && relativeFret !== 0)) continue;
    positions.push({
      string: string.number,
      fret: string.number === 5 && fifthNumbering === "physical" ? physicalFret : relativeFret,
      relativeFret,
      physicalFret,
      isOpen: relativeFret === 0
    });
  }
  positions.sort(positionSorter(preference));
  return preference === "all" ? positions : positions.slice(0, 1);
}

function positionSorter(preference) {
  if (preference === "higher-string") return (a, b) => a.string - b.string || a.fret - b.fret;
  if (preference === "lower-string") {
    const rank = { 4: 0, 3: 1, 2: 2, 1: 3, 5: 4 };
    return (a, b) => rank[a.string] - rank[b.string] || a.fret - b.fret;
  }
  return (a, b) => a.fret - b.fret || b.string - a.string;
}

export function generateNotes({ tuning, key, scale, maxFret = 5, fifthMode = "excluded", fifthNumbering = "physical", preference = "all", displayMode = "scale", range, pitchDisplay = "written", spelling = "key" }) {
  const actualRange = range || getAutomaticRange(tuning, maxFret, fifthMode);
  const scaleClasses = scalePitchClasses(key.pitchClass, scale.intervals);
  const scaleNames = spellScale(key, scale);
  const notes = [];
  for (let midi = actualRange.low; midi <= actualRange.high; midi += 1) {
    const pitchClass = midi % 12;
    const scaleIndex = scaleClasses.indexOf(pitchClass);
    if (displayMode === "scale" && scaleIndex < 0) continue;
    const positions = positionsForMidi(midi, tuning, { maxFret, fifthMode, fifthNumbering, preference });
    if (!positions.length) continue;
    const preferenceName = spelling === "sharp" || spelling === "flat" ? spelling : key.preference;
    const noteName = spelling !== "key" ? chromaticName(pitchClass, preferenceName) : scaleIndex >= 0 ? scaleNames[scaleIndex] : chromaticName(pitchClass, preferenceName);
    const displayedMidi = toDisplayedMidi(midi, pitchDisplay);
    notes.push({
      midi,
      displayedMidi,
      pitchClass,
      noteName,
      octave: spelledOctave(noteName, displayedMidi),
      scaleDegree: scaleIndex >= 0 ? scaleIndex + 1 : null,
      isTonic: pitchClass === key.pitchClass,
      isScaleNote: scaleIndex >= 0,
      positions
    });
  }
  return notes;
}

function spelledOctave(noteName, midi) {
  const naturalPitchClasses = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const accidental = [...noteName.slice(1)].reduce((total, character) => total + (character === "#" ? 1 : -1), 0);
  return (midi - naturalPitchClasses[noteName[0]] - accidental) / 12 - 1;
}

export function generateFretboardNotes({ tuning, key, scale, maxFret = 5, fifthMode = "excluded", spelling = "key", displayMode = "scale" }) {
  const scaleClasses = scalePitchClasses(key.pitchClass, scale.intervals);
  const scaleNames = spellScale(key, scale);
  const notes = [];
  for (const string of enabledStrings(tuning, fifthMode)) {
    const openMidi = pitchToMidi(string.pitch);
    const limit = string.number === 5 ? (fifthMode === "drone" ? 0 : Math.max(0, maxFret - string.startsAtPhysicalFret)) : maxFret;
    for (let relativeFret = 0; relativeFret <= limit; relativeFret += 1) {
      const midi = openMidi + relativeFret;
      const pitchClass = midi % 12;
      const scaleIndex = scaleClasses.indexOf(pitchClass);
      if (displayMode === "scale" && scaleIndex < 0) continue;
      const preferenceName = spelling === "sharp" || spelling === "flat" ? spelling : key.preference;
      notes.push({
        string: string.number,
        relativeFret,
        physicalFret: string.number === 5 ? string.startsAtPhysicalFret + relativeFret : relativeFret,
        noteName: spelling !== "key" || scaleIndex < 0 ? chromaticName(pitchClass, preferenceName) : scaleNames[scaleIndex],
        isTonic: pitchClass === key.pitchClass,
        isScaleNote: scaleIndex >= 0,
        isOpen: relativeFret === 0
      });
    }
  }
  return notes;
}
