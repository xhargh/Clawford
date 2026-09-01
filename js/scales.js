export const SCALES = [
  { id: "major", name: "Major", intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: "natural-minor", name: "Natural minor", intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: "major-pentatonic", name: "Major pentatonic", intervals: [0, 2, 4, 7, 9] },
  { id: "minor-pentatonic", name: "Minor pentatonic", intervals: [0, 3, 5, 7, 10] },
  { id: "mixolydian", name: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: "dorian", name: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10] }
];

export const KEYS = [
  { value: "C", label: "C", pitchClass: 0, preference: "sharp" },
  { value: "Db", label: "C# / Db", pitchClass: 1, preference: "flat" },
  { value: "D", label: "D", pitchClass: 2, preference: "sharp" },
  { value: "Eb", label: "D# / Eb", pitchClass: 3, preference: "flat" },
  { value: "E", label: "E", pitchClass: 4, preference: "sharp" },
  { value: "F", label: "F", pitchClass: 5, preference: "flat" },
  { value: "Gb", label: "F# / Gb", pitchClass: 6, preference: "flat" },
  { value: "G", label: "G", pitchClass: 7, preference: "sharp" },
  { value: "Ab", label: "G# / Ab", pitchClass: 8, preference: "flat" },
  { value: "A", label: "A", pitchClass: 9, preference: "sharp" },
  { value: "Bb", label: "A# / Bb", pitchClass: 10, preference: "flat" },
  { value: "B", label: "B", pitchClass: 11, preference: "sharp" }
];

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];
const SIGNATURE_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  "major-pentatonic": [0, 2, 4, 5, 7, 9, 11],
  "natural-minor": [0, 2, 3, 5, 7, 8, 10],
  "minor-pentatonic": [0, 2, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10]
};

export function getScale(id) {
  return SCALES.find((scale) => scale.id === id);
}

export function getKey(value) {
  return KEYS.find((key) => key.value === value);
}

export function scalePitchClasses(tonicPitchClass, intervals) {
  return intervals.map((interval) => (tonicPitchClass + interval) % 12);
}

export function spellScale(key, scale) {
  const classes = scalePitchClasses(key.pitchClass, scale.intervals);
  if (scale.intervals.length !== 7) return classes.map((pitchClass) => chromaticName(pitchClass, key.preference));
  const tonicLetter = key.value[0];
  const start = LETTERS.indexOf(tonicLetter);
  return classes.map((pitchClass, index) => {
    const letter = LETTERS[(start + index) % LETTERS.length];
    const difference = (pitchClass - NATURAL_PCS[letter] + 12) % 12;
    const accidentals = { 0: "", 1: "#", 2: "##", 10: "bb", 11: "b" };
    return `${letter}${accidentals[difference] ?? ""}`;
  });
}

export function chromaticName(pitchClass, preference = "sharp") {
  const sharps = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const flats = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  return (preference === "flat" ? flats : sharps)[pitchClass];
}

export function keySignatureFor(key, scale) {
  const intervals = SIGNATURE_INTERVALS[scale.id];
  if (!intervals) return [];
  const names = spellScale(key, { intervals });
  const altered = names.filter((name) => name.length > 1);
  if (!altered.length) return [];
  const accidental = altered[0].slice(1);
  if ((accidental !== "#" && accidental !== "b") || altered.some((name) => name.slice(1) !== accidental)) return [];
  const order = accidental === "#" ? SHARP_ORDER : FLAT_ORDER;
  const letters = new Set(altered.map((name) => name[0]));
  const expected = order.slice(0, letters.size);
  if (expected.some((letter) => !letters.has(letter))) return [];
  return expected.map((letter) => ({ letter, accidental }));
}
