const LETTER_PITCH_CLASSES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export function parsePitch(value) {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(value).trim());
  if (!match) throw new Error(`Invalid pitch: ${value}`);
  const letter = match[1].toUpperCase();
  const accidental = match[2];
  const octave = Number(match[3]);
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const midi = (octave + 1) * 12 + LETTER_PITCH_CLASSES[letter] + offset;
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) throw new Error(`Invalid pitch: ${value}`);
  return { letter, accidental, octave, midi, pitchClass: ((midi % 12) + 12) % 12 };
}

export function pitchToMidi(value) {
  return typeof value === "number" ? value : parsePitch(value).midi;
}

export function getPitchClass(value) {
  const midi = pitchToMidi(value);
  return ((midi % 12) + 12) % 12;
}

export function transpose(value, semitones) {
  return pitchToMidi(value) + semitones;
}

export function midiToPitch(midi, preference = "sharp") {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) throw new Error(`Invalid MIDI note: ${midi}`);
  const names = preference === "flat" ? FLAT_NAMES : SHARP_NAMES;
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

// Written and sounding pitch currently share concert pitch. Keeping the convention here
// prevents notation transposition rules from leaking into mapping or rendering later.
export function toDisplayedMidi(soundingMidi, pitchDisplay = "written") {
  return pitchDisplay === "sounding" ? soundingMidi : soundingMidi;
}

export function splitNoteName(name) {
  const match = /^([A-G])([#b]*)$/.exec(name);
  return match ? { letter: match[1], accidental: match[2] } : null;
}
