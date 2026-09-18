import { getKey, getScale, spellScale } from "./scales.js";

const TRIAD_INTERVALS = [0, 2, 4];
const SEVENTH_INTERVALS = [0, 2, 4, 6];
const DEGREE_NAMES = ["I", "II", "III", "IV", "V", "VI", "VII"];
const QUALITY_NAMES = { major: "Major", minor: "Minor", diminished: "Diminished" };

function normalize(value) {
  return (value % 12 + 12) % 12;
}

function permutations(values) {
  if (values.length < 2) return [values];
  return values.flatMap((value, index) => permutations(values.filter((_, i) => i !== index).map((item) => item)).map((rest) => [value, ...rest]));
}

function combinations(values, count) {
  if (count === 0) return [[]];
  if (values.length < count) return [];
  return values.flatMap((value, index) => combinations(values.slice(index + 1), count - 1).map((rest) => [value, ...rest]));
}

export function pitchClassDistance(a, b) {
  const distance = Math.abs(normalize(a) - normalize(b));
  return Math.min(distance, 12 - distance);
}

function degreeQuality(mode, degree, seventh = false) {
  const major = mode === "major";
  const triads = major ? ["major", "minor", "minor", "major", "major", "minor", "diminished"] : ["minor", "diminished", "major", "minor", "minor", "major", "major"];
  const sevenths = major ? ["maj7", "min7", "min7", "maj7", "dom7", "min7", "half-diminished"] : ["min7", "half-diminished", "maj7", "min7", "min7", "maj7", "dom7"];
  return seventh ? sevenths[degree] : triads[degree];
}

function romanNumeral(degree, quality) {
  const numeral = DEGREE_NAMES[degree];
  return quality === "minor" || quality === "diminished" || quality === "min7" || quality === "half-diminished" ? numeral.toLowerCase() : numeral;
}

function qualitySymbol(quality) {
  return { major: "", minor: "m", diminished: "°", maj7: "maj7", min7: "m7", dom7: "7", "half-diminished": "ø7" }[quality] ?? "";
}

export function generateDiatonicChords(keyValue, mode = "major", includeSevenths = false) {
  const key = getKey(keyValue);
  const scale = getScale(mode === "natural-minor" ? "natural-minor" : "major");
  if (!key || !scale) throw new Error("A valid key and mode are required");
  const names = spellScale(key, scale);
  const pitchClasses = scale.intervals.map((interval) => normalize(key.pitchClass + interval));
  const intervals = includeSevenths ? SEVENTH_INTERVALS : TRIAD_INTERVALS;
  return names.map((root, degree) => {
    const quality = degreeQuality(scale.id === "major" ? "major" : "minor", degree, includeSevenths);
    const tones = intervals.map((offset) => pitchClasses[(degree + offset) % 7]);
    const toneNames = intervals.map((offset) => names[(degree + offset) % 7]);
    const numeral = romanNumeral(degree, quality);
    return {
      id: `${key.value}-${mode}-${degree}-${includeSevenths ? "7" : "3"}`,
      degree,
      numeral,
      root,
      name: `${root}${qualitySymbol(quality)}`,
      quality,
      qualityLabel: QUALITY_NAMES[quality] ?? ({ maj7: "Major seventh", min7: "Minor seventh", dom7: "Dominant seventh", "half-diminished": "Half-diminished seventh" }[quality]),
      pitchClasses: tones,
      toneNames,
      isSeventh: includeSevenths
    };
  });
}

export function chordToneAnalysis(source, destination) {
  const sourceSet = new Set(source.pitchClasses);
  const destinationSet = new Set(destination.pitchClasses);
  const common = source.pitchClasses.filter((pitchClass, index) => sourceSet.has(pitchClass) && destinationSet.has(pitchClass) && source.pitchClasses.indexOf(pitchClass) === index);
  const sourceOnly = source.pitchClasses.filter((pitchClass, index) => !destinationSet.has(pitchClass) && source.pitchClasses.indexOf(pitchClass) === index);
  const destinationOnly = destination.pitchClasses.filter((pitchClass, index) => !sourceSet.has(pitchClass) && destination.pitchClasses.indexOf(pitchClass) === index);
  const union = new Set([...sourceSet, ...destinationSet]);
  return { common, sourceOnly, destinationOnly, commonCount: common.length, jaccard: union.size ? common.length / union.size : 1 };
}

export function voiceLeadingAnalysis(source, destination) {
  const sourceNotes = source.pitchClasses;
  const destinationNotes = destination.pitchClasses;
  const pairs = [];
  if (sourceNotes.length === destinationNotes.length) {
    const best = permutations(destinationNotes).map((assignment) => assignment.map((pitchClass, index) => ({ from: sourceNotes[index], to: pitchClass, distance: pitchClassDistance(sourceNotes[index], pitchClass) }))).sort((a, b) => a.reduce((sum, pair) => sum + pair.distance, 0) - b.reduce((sum, pair) => sum + pair.distance, 0))[0];
    pairs.push(...best);
  } else {
    const smaller = Math.min(sourceNotes.length, destinationNotes.length);
    const assignments = (sourceNotes.length > destinationNotes.length ? combinations(sourceNotes, smaller) : [sourceNotes]).flatMap((sourceSelection) => permutations(destinationNotes).map((destinationSelection) => sourceSelection.map((from, index) => ({ from, to: destinationSelection[index], distance: pitchClassDistance(from, destinationSelection[index]) }))));
    const best = assignments.sort((a, b) => a.reduce((sum, pair) => sum + pair.distance, 0) - b.reduce((sum, pair) => sum + pair.distance, 0))[0];
    pairs.push(...best);
  }
  const matchedSource = new Set(pairs.map((pair) => pair.from));
  const matchedDestination = new Set(pairs.map((pair) => pair.to));
  return {
    pairs,
    unmatchedSource: sourceNotes.filter((pitchClass) => !matchedSource.has(pitchClass)),
    unmatchedDestination: destinationNotes.filter((pitchClass) => !matchedDestination.has(pitchClass)),
    totalDistance: pairs.reduce((sum, pair) => sum + pair.distance, 0),
    differentSizes: sourceNotes.length !== destinationNotes.length
  };
}

const MAJOR_FUNCTIONS = {
  "1-4": "tonic -> predominant",
  "1-5": "tonic -> dominant preparation",
  "2-4": "predominant -> predominant",
  "2-5": "predominant -> dominant",
  "3-6": "tonic prolongation -> tonic area",
  "4-1": "plagal movement",
  "4-5": "predominant -> dominant",
  "5-1": "strong dominant resolution",
  "5-6": "deceptive resolution",
  "6-2": "tonic area -> predominant",
  "7-1": "leading-tone resolution"
};

const MINOR_FUNCTIONS = {
  "1-4": "tonic -> predominant",
  "2-5": "predominant -> dominant area",
  "4-5": "predominant -> dominant area",
  "5-1": "minor dominant -> tonic (natural minor)",
  "5-3": "dominant area -> relative-major area",
  "6-4": "tonic area -> predominant",
  "7-3": "relative-major movement"
};

export function functionalRelationship(source, destination, mode = "major", includeSevenths = false) {
  const key = `${source.degree + 1}-${destination.degree + 1}`;
  let label = (mode === "major" ? MAJOR_FUNCTIONS : MINOR_FUNCTIONS)[key] ?? "";
  if (includeSevenths && source.degree === 4 && destination.degree === 0 && source.quality === "dom7") label = "strong dominant seventh resolution";
  const rootInterval = normalize(destination.pitchClasses[0] - source.pitchClasses[0]);
  if (!label && rootInterval === 7) label = "root moves by a fifth";
  return label;
}

export function analyzeTransition(source, destination, mode, includeSevenths) {
  const tones = chordToneAnalysis(source, destination);
  const voiceLeading = voiceLeadingAnalysis(source, destination);
  const functionLabel = functionalRelationship(source, destination, mode, includeSevenths);
  const reasons = [functionLabel, tones.commonCount ? `shares ${tones.commonCount} chord tone${tones.commonCount === 1 ? "" : "s"}` : "no shared chord tones", voiceLeading.totalDistance <= 2 ? "very smooth voice leading" : voiceLeading.totalDistance <= 4 ? "compact voice leading" : "wider voice leading"].filter(Boolean);
  return { tones, voiceLeading, functionLabel, reasons };
}
