import { pitchToMidi } from "./pitch.js";
import { getKey, getScale, spellScale } from "./scales.js";

export const PRESET_PROGRESSIONS = [
  { id: "one-four-one-five7", degrees: ["I", "IV", "I", "V7"] },
  { id: "one-six-four-five", degrees: ["I", "vi", "IV", "V"] },
  { id: "one-four-five-one", degrees: ["I", "IV", "V", "I"] },
  { id: "pop-four-chord", degrees: ["I", "V", "vi", "IV"] }
];

const ROMAN_DEGREES = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };

function progressionDegree(degree) {
  const match = /^([ivIV]+)(7)?$/.exec(degree);
  if (!match || ROMAN_DEGREES[match[1].toUpperCase()] == null) throw new Error(`Unsupported progression degree: ${degree}`);
  return { index: ROMAN_DEGREES[match[1].toUpperCase()], minor: match[1] === match[1].toLowerCase(), seventh: Boolean(match[2]) };
}

export function resolveProgression(progression, keyValue) {
  const key = typeof keyValue === "string" ? getKey(keyValue) : keyValue;
  if (!key) throw new Error(`Unknown key: ${keyValue}`);
  const scale = spellScale(key, getScale("major"));
  return progression.degrees.map((degree) => {
    const { index, minor, seventh } = progressionDegree(degree);
    return `${scale[index]}${minor ? "m" : ""}${seventh ? "7" : ""}`;
  });
}

export function progressionRomanNumerals(progression) {
  return progression.degrees.join("–");
}

export function progressionLabel(progression, keyValue) {
  return `${progressionRomanNumerals(progression)}: ${resolveProgression(progression, keyValue).join("–")}`;
}

const meter = (numerator, denominator, subdivision, steps, extra = {}) => ({
  meter: { numerator, denominator }, subdivision, steps, ...extra
});

const eighths = (numerator, steps, extra = {}) => meter(numerator, 4, 2, steps, extra);
const quarters = (numerator, steps, extra = {}) => meter(numerator, 4, 1, steps, extra);
const compound = (numerator, steps, extra = {}) => meter(numerator, 8, 3, steps, extra);

export const PATTERNS = [
  { id: "clawhammer-bum-ditty-2-4", name: "Bum-Ditty", instrument: "banjo5-clawhammer", ...meter(2, 4, 2, ["N", "-", "B", "T"], { targets: [[3], null, [3, 2, 1], [5]], accents: [1.1, 1, 1, .9] }) },
  { id: "clawhammer-double-thumb", name: "Double Thumb", instrument: "banjo5-clawhammer", ...meter(2, 4, 2, ["N", "T", "N", "T"], { targets: [[3, 2, 1], [5], [3, 2, 1], [5]] }) },
  { id: "clawhammer-bum-ditty-4", name: "Bum-Ditty — 4/4", instrument: "banjo5-clawhammer", ...eighths(4, ["N", "-", "B", "T", "N", "-", "B", "T"]) },
  { id: "clawhammer-double-thumb-4", name: "Double Thumb — 4/4", instrument: "banjo5-clawhammer", ...eighths(4, ["N", "T", "N", "T", "N", "T", "N", "T"]) },
  { id: "clawhammer-waltz", name: "Waltz Bum-Ditty", instrument: "banjo5-clawhammer", ...eighths(3, ["N", "-", "B", "T", "B", "T"], { grouping: [2, 2, 2] }) },
  { id: "clawhammer-waltz-single", name: "Waltz Single-Note", instrument: "banjo5-clawhammer", ...eighths(3, ["N", "-", "N", "T", "N", "T"], { grouping: [2, 2, 2] }) },

  { id: "roll-forward", name: "Forward Roll", instrument: "banjo5-three-finger", ...eighths(4, ["T", "I", "M", "T", "I", "M", "I", "M"], { targets: [3, 2, 1, 5, 2, 1, 2, 1] }) },
  { id: "roll-alternating", name: "Alternating Thumb", instrument: "banjo5-three-finger", ...eighths(4, ["T", "I", "T", "M", "T", "I", "T", "M"], { targets: [3, 2, 5, 1, 4, 2, 5, 1] }) },
  { id: "roll-forward-reverse", name: "Forward-Reverse Roll", instrument: "banjo5-three-finger", ...eighths(4, ["T", "I", "M", "T", "M", "I", "T", "M"], { targets: [3, 2, 1, 5, 1, 2, 3, 1] }) },
  { id: "roll-foggy-mountain", name: "Foggy Mountain Roll", instrument: "banjo5-three-finger", ...eighths(4, ["T", "M", "T", "I", "M", "T", "I", "M"], { targets: [3, 1, 5, 2, 1, 5, 2, 1] }) },
  { id: "roll-backward", name: "Backward / Reverse Roll", instrument: "banjo5-three-finger", ...eighths(4, ["M", "I", "T", "M", "I", "T", "M", "I"], { targets: [1, 2, 5, 1, 2, 5, 1, 2] }) },
  { id: "roll-waltz", name: "Forward Waltz Roll", instrument: "banjo5-three-finger", ...eighths(3, ["T", "I", "M", "T", "I", "M"], { targets: [3, 2, 1, 5, 2, 1], grouping: [2, 2, 2] }) },
  { id: "roll-6-8", name: "Forward 6/8 Roll", instrument: "banjo5-three-finger", ...compound(6, ["T", "I", "M", "T", "I", "M"], { targets: [3, 2, 1, 5, 2, 1], grouping: [3, 3] }) },
  { id: "banjo5-vamp", name: "Bluegrass Vamp", instrument: "banjo5-three-finger", ...quarters(4, ["-", "C", "-", "C"], { accents: [1, 1.12, 1, 1.12] }) },

  { id: "guitar-quarter-downs", name: "Quarter-Note Downs", instrument: "guitar", ...eighths(4, ["D", "-", "D", "-", "D", "-", "D", "-"]) },
  { id: "guitar-eighths", name: "Straight Eighths", instrument: "guitar", ...eighths(4, ["D", "U", "D", "U", "D", "U", "D", "U"]) },
  { id: "guitar-folk-pop", name: "Folk / Pop", instrument: "guitar", ...eighths(4, ["D", "-", "D", "U", "-", "U", "D", "U"]) },
  { id: "guitar-driving", name: "Driving Eighths", instrument: "guitar", ...eighths(4, ["D", "-", "D", "-", "D", "U", "D", "U"]) },
  { id: "guitar-backbeat", name: "Backbeat Strum", instrument: "guitar", ...eighths(4, ["D", "U", "D", "U", "D", "U", "D", "U"], { accents: [1, .8, 1.12, .85, 1, .8, 1.12, .85] }) },
  { id: "guitar-offbeat", name: "Reggae / Offbeat", instrument: "guitar", ...eighths(4, ["-", "U", "-", "U", "-", "U", "-", "U"]) },
  { id: "guitar-boom-chuck-2", name: "Boom-Chuck — 2/4", instrument: "guitar", ...quarters(2, ["B", "C"]) },
  { id: "guitar-boom-chuck", name: "Boom-Chuck", instrument: "guitar", ...quarters(4, ["B", "C", "B", "C"]) },
  { id: "guitar-waltz", name: "Waltz", instrument: "guitar", ...eighths(3, ["D", "-", "D", "U", "D", "U"], { grouping: [2, 2, 2] }) },
  { id: "guitar-waltz-boom", name: "Boom-Chuck-Chuck Waltz", instrument: "guitar", ...quarters(3, ["B", "C", "C"]) },
  { id: "guitar-ballad-6-8", name: "6/8 Ballad", instrument: "guitar", ...compound(6, ["D", "-", "-", "D", "-", "U"], { grouping: [3, 3] }) },
  { id: "guitar-flowing-6-8", name: "Flowing 6/8", instrument: "guitar", ...compound(6, ["D", "-", "U", "D", "-", "U"], { grouping: [3, 3] }) },
  { id: "guitar-shuffle-12-8", name: "12/8 Shuffle", instrument: "guitar", ...compound(12, ["D", "-", "-", "D", "-", "-", "D", "-", "-", "D", "-", "-"] , { grouping: [3, 3, 3, 3] }) },

  { id: "ukulele-downs", name: "All Downs", instrument: "ukulele", ...eighths(4, ["D", "-", "D", "-", "D", "-", "D", "-"]) },
  { id: "ukulele-eighths", name: "Straight Eighths", instrument: "ukulele", ...eighths(4, ["D", "U", "D", "U", "D", "U", "D", "U"]) },
  { id: "ukulele-island", name: "Island Strum", instrument: "ukulele", ...eighths(4, ["D", "-", "D", "U", "-", "U", "D", "U"]) },
  { id: "ukulele-driving", name: "Driving Uke", instrument: "ukulele", ...eighths(4, ["D", "-", "D", "-", "D", "U", "D", "U"]) },
  { id: "ukulele-chunk", name: "Chunk Groove", instrument: "ukulele", ...eighths(4, ["D", "U", "X", "U", "D", "U", "X", "U"]) },
  { id: "ukulele-offbeat", name: "Reggae / Offbeat", instrument: "ukulele", ...eighths(4, ["-", "C", "-", "C", "-", "C", "-", "C"]) },
  { id: "ukulele-waltz", name: "Waltz", instrument: "ukulele", ...eighths(3, ["D", "-", "D", "U", "D", "-"], { grouping: [2, 2, 2] }) },
  { id: "ukulele-busy-waltz", name: "Busy Waltz", instrument: "ukulele", ...eighths(3, ["D", "-", "D", "U", "D", "U"], { grouping: [2, 2, 2] }) },
  { id: "ukulele-rocking-6-8", name: "Rocking 6/8", instrument: "ukulele", ...compound(6, ["D", "-", "-", "D", "-", "U"], { grouping: [3, 3] }) },
  { id: "ukulele-flowing-6-8", name: "Flowing 6/8", instrument: "ukulele", ...compound(6, ["D", "-", "U", "D", "-", "U"], { grouping: [3, 3] }) },

  { id: "mandolin-quarter", name: "Quarter Strum", instrument: "mandolin", ...quarters(4, ["D", "D", "D", "D"]) },
  { id: "mandolin-eighths", name: "Straight Eighth Picking", instrument: "mandolin", ...eighths(4, ["D", "U", "D", "U", "D", "U", "D", "U"]) },
  { id: "mandolin-chop", name: "Bluegrass Chop", instrument: "mandolin", ...quarters(4, ["-", "C", "-", "C"], { accents: [1, 1.15, 1, 1.15] }) },
  { id: "mandolin-boom-chuck", name: "Boom-Chuck", instrument: "mandolin", ...quarters(4, ["B", "C", "B", "C"]) },
  { id: "mandolin-offbeat", name: "Offbeat Chop", instrument: "mandolin", ...quarters(2, ["-", "C"]) },
  { id: "mandolin-waltz-boom", name: "Waltz Boom-Chuck-Chuck", instrument: "mandolin", ...quarters(3, ["B", "C", "C"]) },
  { id: "mandolin-waltz-chop", name: "Waltz Chop", instrument: "mandolin", ...quarters(3, ["-", "C", "C"]) },
  { id: "mandolin-jig", name: "Jig Pulse", instrument: "mandolin", ...compound(6, ["D", "U", "D", "D", "U", "D"], { grouping: [3, 3], accents: [1.12, .85, .9, 1.12, .85, .9] }) },

  { id: "banjo4-four-bar", name: "Four-to-the-Bar", instrument: "banjo4", ...quarters(4, ["D", "D", "D", "D"]) },
  { id: "banjo4-eighths", name: "Straight Eighths", instrument: "banjo4", ...eighths(4, ["D", "U", "D", "U", "D", "U", "D", "U"]) },
  { id: "banjo4-swing-four", name: "Swing Four", instrument: "banjo4", ...quarters(4, ["D", "D", "D", "D"], { accents: [1, 1.15, 1, 1.15] }) },
  { id: "banjo4-charleston", name: "Charleston", instrument: "banjo4", ...eighths(4, ["D", "-", "-", "D", "-", "-", "-", "-"]) },
  { id: "banjo4-two-beat", name: "Two-Beat", instrument: "banjo4", ...quarters(2, ["D", "D"]) },
  { id: "banjo4-waltz", name: "Waltz", instrument: "banjo4", ...quarters(3, ["D", "D", "D"]) },
  { id: "banjo4-waltz-bass", name: "Waltz Bass-Chord-Chord", instrument: "banjo4", ...quarters(3, ["B", "C", "C"]) },
  { id: "banjo4-6-8", name: "6/8 Strum", instrument: "banjo4", ...compound(6, ["D", "-", "U", "D", "-", "U"], { grouping: [3, 3] }) },

  { id: "bass-whole-roots", name: "Whole-Note Root", instrument: "bass", ...quarters(4, ["R", "-", "-", "-"]) },
  { id: "bass-half-roots", name: "Half-Note Roots", instrument: "bass", ...quarters(4, ["R", "-", "R", "-"]) },
  { id: "bass-quarter-roots", name: "Quarter Roots", instrument: "bass", ...quarters(4, ["R", "R", "R", "R"]) },
  { id: "bass-eighth-roots", name: "Eighth Roots", instrument: "bass", ...eighths(4, ["R", "R", "R", "R", "R", "R", "R", "R"]) },
  { id: "bass-root-fifth-two", name: "Root-Fifth Two-Feel", instrument: "bass", ...quarters(4, ["R", "-", "5", "-"]) },
  { id: "bass-root-fifth", name: "Root-Fifth", instrument: "bass", ...quarters(4, ["R", "5", "R", "5"]) },
  { id: "bass-root-octave", name: "Root-Octave", instrument: "bass", ...quarters(4, ["R", "8", "R", "8"]) },
  { id: "bass-root-5-8-5", name: "Root-5-8-5", instrument: "bass", ...quarters(4, ["R", "5", "8", "5"]) },
  { id: "bass-waltz-roots", name: "Waltz Roots", instrument: "bass", ...quarters(3, ["R", "R", "R"]) },
  { id: "bass-waltz-movement", name: "Waltz Movement", instrument: "bass", ...quarters(3, ["R", "5", "8"]) },
  { id: "bass-6-8", name: "6/8 Two-Pulse", instrument: "bass", ...compound(6, ["R", "-", "-", "5", "-", "-"], { grouping: [3, 3] }) },
  { id: "bass-12-8", name: "12/8 Blues Pulse", instrument: "bass", ...compound(12, ["R", "-", "-", "5", "-", "-", "R", "-", "-", "5", "-", "-"], { grouping: [3, 3, 3, 3] }) }
];

const ACTIONS = {
  strum: ["-", "D", "U"],
  guitar: ["-", "D", "U"],
  ukulele: ["-", "D", "U", "X", "C"],
  mandolin: ["-", "D", "U", "C", "B"],
  banjo4: ["-", "D", "U", "B", "C"],
  "banjo5-clawhammer": ["-", "N", "B", "T"],
  "banjo5-three-finger": ["-", "T", "I", "M", "C"],
  bass: ["-", "R", "5", "8"]
};

export function meterStepCount({ numerator, denominator }, subdivision) {
  const steps = subdivision ?? (denominator === 8 ? 3 : 1);
  return denominator === 8 ? (numerator / 3) * steps : numerator * steps;
}

export function beatsPerMeasure({ numerator, denominator }) {
  return denominator === 8 ? numerator / 3 : numerator;
}

export function stepsPerBeat({ denominator }, subdivision = denominator === 8 ? 3 : 1) {
  return subdivision;
}

export function playAlongSubdivisionSchedule(beatTick, subdivisionCount, subdivisionDuration) {
  return Array.from({ length: subdivisionCount }, (_, step) => ({
    tick: beatTick * subdivisionCount + step,
    delay: step * subdivisionDuration
  }));
}

export function playAlongStepTimestamps(beatTime, subdivisionCount, beatDuration, stepCount) {
  const stepDuration = beatDuration / subdivisionCount;
  return Array.from({ length: stepCount }, (_, tick) => ({ tick, time: beatTime + Math.floor(tick / subdivisionCount) * beatDuration + (tick % subdivisionCount) * stepDuration }));
}

export function customPatternFamily(instrument, technique = "clawhammer") {
  if (instrument === "banjo5") return `banjo5-${technique}`;
  return instrument === "guitar" ? "guitar" : instrument;
}

export function actionsForInstrument(instrument) {
  return ACTIONS[instrument] || ACTIONS.strum;
}

export function patternForInstrument(instrument) {
  if (instrument === "banjo5") return PATTERNS.filter((pattern) => ["banjo5-clawhammer", "banjo5-three-finger"].includes(pattern.instrument));
  return PATTERNS.filter((pattern) => pattern.instrument === instrument);
}

export function patternsForInstrument(instrument) {
  const family = instrument === "banjo5" ? "banjo5" : instrument;
  return { family, patterns: patternForInstrument(instrument) };
}

export function cyclePatternStep(step, instrument) {
  const actions = actionsForInstrument(instrument);
  return actions[(actions.indexOf(step) + 1) % actions.length];
}

export function playAlongPosition(tick, chordCount, stepCount, patternMeter = { numerator: 4, denominator: 4 }, subdivision = 2) {
  const stepsPerMeasure = stepCount || meterStepCount(patternMeter, subdivision);
  const measures = chordCount || 1;
  const stepIndex = ((tick % stepsPerMeasure) + stepsPerMeasure) % stepsPerMeasure;
  const chordIndex = Math.floor(tick / stepsPerMeasure) % measures;
  const beat = Math.floor(stepIndex / subdivision) + 1;
  const withinBeat = stepIndex % subdivision;
  const subdivisionLabel = subdivision === 1 ? String(beat) : withinBeat === 0 ? String(beat) : "&";
  return { chordIndex, stepIndex, beat, subdivision: subdivisionLabel };
}

export function playAlongTickState(tick, patternMeter = { numerator: 4, denominator: 4 }) {
  const countInTicks = beatsPerMeasure(patternMeter);
  if (tick < countInTicks) return { phase: "count-in", count: tick + 1, tick: 0 };
  return { phase: "playing", count: 0, tick: tick - countInTicks };
}

export function parseChordSymbol(symbol) {
  const match = /^([A-G](?:#|b)?)(m?7?)$/.exec(symbol);
  if (!match) throw new Error(`Unsupported chord symbol: ${symbol}`);
  return { root: match[1], quality: match[2] === "m" ? "minor" : match[2] === "7" ? "dom7" : "major" };
}

const PITCH_CLASSES = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };

export function resolveChordRole(symbol, role) {
  const { root } = parseChordSymbol(symbol);
  const pitchClass = PITCH_CLASSES[root];
  const offset = { root: 0, fifth: 7, octave: 0 }[role];
  if (offset == null) throw new Error(`Unsupported chord role: ${role}`);
  return { root, role, pitchClass: (pitchClass + offset) % 12 };
}

export function bassNoteForChord(symbol, action, tuning) {
  const role = action === "R" ? "root" : action === "5" ? "fifth" : action === "8" ? "octave" : action;
  const resolved = resolveChordRole(symbol, role);
  const low = tuning.strings.reduce((result, string) => {
    const midi = pitchToMidi(string.pitch);
    return !result || midi < result.midi ? { midi, string } : result;
  }, null);
  const rootMidi = low.midi + ((resolved.pitchClass - low.midi) + 12) % 12;
  const midi = role === "octave" ? rootMidi + 12 : rootMidi;
  const string = tuning.strings.reduce((result, candidate) => {
    const open = pitchToMidi(candidate.pitch);
    return open <= midi && (!result || open > result.open) ? { number: candidate.number, open } : result;
  }, null);
  return { midi, string: string?.number ?? low.string.number, role };
}

export function patternNoteIndexes(action, instrument, noteCount, targetStrings = null, notes = []) {
  if (["-", "rest"].includes(action)) return [];
  if (["strum", "guitar", "ukulele", "banjo4", "mandolin"].includes(instrument)) {
    if (action === "B") {
      return [lowestChordToneIndex(notes)];
    }
    const indexes = Array.from({ length: noteCount }, (_, index) => index);
    return action === "D" ? indexes.reverse() : indexes;
  }
  if (instrument === "bass") {
    const role = action === "R" ? "root" : action === "5" ? "fifth" : action === "8" ? "octave" : action;
    const index = notes.findIndex((note) => note.role === role);
    return index >= 0 ? [index] : [];
  }
  if (targetStrings) {
    const targets = Array.isArray(targetStrings) ? targetStrings : [targetStrings];
    if (instrument === "banjo5-clawhammer" && action === "N") {
      const index = notes.findIndex((note) => note.string === targets[0]);
      return index >= 0 ? [index] : [];
    }
    return targets.map((string) => notes.findIndex((note) => note.string === string)).filter((index) => index >= 0);
  }
  if (instrument === "banjo5-three-finger") return [{ T: 0, I: 1, M: 2 }[action] ?? 0].filter((index) => index < noteCount);
  if (action === "B") return Array.from({ length: Math.min(3, noteCount) }, (_, index) => index);
  return [action === "T" ? noteCount - 1 : 0].filter((index) => index >= 0);
}

function lowestChordToneIndex(notes) {
  let index = notes.findIndex((note) => ["root", "octave"].includes(note.role));
  if (index < 0) index = 0;
  for (let candidate = index + 1; candidate < notes.length; candidate += 1) {
    if (["root", "octave"].includes(notes[candidate].role) && notes[candidate].midi < notes[index].midi) index = candidate;
  }
  return index;
}

export function patternPlaybackProfile(action, { stepDuration, noteCount } = {}) {
  const naturalSpread = ["D", "B"].includes(action) ? 0.04 : action === "U" ? 0.015 : 0.008;
  const spread = Number.isFinite(stepDuration) && noteCount > 1
    ? Math.min(naturalSpread, (stepDuration * 0.4) / (noteCount - 1))
    : naturalSpread;
  if (["D", "B"].includes(action)) return { spread, velocity: 1, duration: 0.45 };
  if (action === "U") return { spread, velocity: 0.68, duration: 0.24 };
  if (["C", "X"].includes(action)) return { spread, velocity: .75, duration: .18 };
  return { spread, velocity: 0.75, duration: 0.3 };
}

export function patternNoteVelocity(action, index, count, accent = 1) {
  const profile = patternPlaybackProfile(action);
  const position = count <= 1 ? 0 : index / (count - 1);
  return Math.min(1, profile.velocity * (1 - position * 0.2) * accent);
}
