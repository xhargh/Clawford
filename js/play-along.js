export const PRESET_PROGRESSIONS = [
  { name: "G | C | G | D7", chords: ["G", "C", "G", "D7"] },
  { name: "G | Em | C | D", chords: ["G", "Em", "C", "D"] },
  { name: "C | F | G | C", chords: ["C", "F", "G", "C"] }
];

export const PATTERNS = [
  { id: "strum-down", name: "Down strokes", instrument: "strum", steps: ["D", "D", "D", "D"] },
  { id: "strum-eighths", name: "Down-up eighths", instrument: "strum", steps: ["D", "U", "D", "U", "D", "U", "D", "U"] },
  { id: "strum-bum-ditty", name: "Bum-Ditty", instrument: "strum", steps: ["D", "-", "D", "U", "-", "U", "D", "U"] },
  { id: "clawhammer-bum-ditty", name: "Bum-Ditty", instrument: "banjo5-clawhammer", steps: ["B", "-", "T", "-", "B", "-", "T", "-"] },
  { id: "clawhammer-double-thumb", name: "Double Thumb", instrument: "banjo5-clawhammer", steps: ["B", "T", "B", "T", "B", "T", "B", "T"] },
  { id: "roll-forward", name: "Forward Roll", instrument: "banjo5-three-finger", steps: ["T", "I", "M", "T", "I", "M", "T", "I"] },
  { id: "roll-alternating", name: "Alternating Thumb Roll", instrument: "banjo5-three-finger", steps: ["T", "I", "T", "M", "T", "I", "T", "M"] },
  { id: "roll-forward-reverse", name: "Forward-Reverse Roll", instrument: "banjo5-three-finger", steps: ["T", "I", "M", "T", "M", "I", "T", "M"] }
];

const ACTIONS = {
  strum: ["-", "D", "U"],
  "banjo5-clawhammer": ["-", "N", "B", "T"],
  "banjo5-three-finger": ["-", "T", "I", "M"]
};

export function actionsForInstrument(instrument) {
  return ACTIONS[instrument] || ACTIONS.strum;
}

export function cyclePatternStep(step, instrument) {
  const actions = actionsForInstrument(instrument);
  return actions[(actions.indexOf(step) + 1) % actions.length];
}

export function playAlongPosition(tick, chordCount, stepCount) {
  const stepsPerMeasure = stepCount || 8;
  const measures = chordCount || 1;
  const stepIndex = tick % stepsPerMeasure;
  const chordIndex = Math.floor(tick / stepsPerMeasure) % measures;
  return {
    chordIndex,
    stepIndex,
    beat: Math.floor(stepIndex / 2) + 1,
    subdivision: stepIndex % 2 === 0 ? String(Math.floor(stepIndex / 2) + 1) : "&"
  };
}

export function playAlongTickState(tick, countInTicks = 8) {
  if (tick < countInTicks) return { phase: "count-in", count: tick + 1, tick: 0 };
  return { phase: "playing", count: 0, tick: tick - countInTicks };
}

export function parseChordSymbol(symbol) {
  const match = /^([A-G](?:#|b)?)(m?7?)$/.exec(symbol);
  if (!match) throw new Error(`Unsupported chord symbol: ${symbol}`);
  return { root: match[1], quality: match[2] === "m" ? "minor" : match[2] === "7" ? "dom7" : "major" };
}

export function patternNoteIndexes(action, instrument, noteCount) {
  if (action === "-") return [];
  if (instrument === "strum") {
    const indexes = Array.from({ length: noteCount }, (_, index) => index);
    return action === "D" ? indexes.reverse() : indexes;
  }
  if (instrument === "banjo5-three-finger") return [{ T: 0, I: 1, M: 2 }[action] ?? 0].filter((index) => index < noteCount);
  if (action === "B") return Array.from({ length: noteCount }, (_, index) => index);
  return [action === "T" ? noteCount - 1 : 0].filter((index) => index >= 0);
}

export function patternPlaybackProfile(action) {
  if (action === "D") return { spread: 0.04, velocity: 1, duration: 0.45 };
  if (action === "U") return { spread: 0.015, velocity: 0.68, duration: 0.24 };
  if (action === "B") return { spread: 0.018, velocity: 0.82, duration: 0.35 };
  return { spread: 0.008, velocity: 0.75, duration: 0.3 };
}

export function patternsForInstrument(instrument) {
  const family = instrument === "banjo5" ? "banjo5-clawhammer" : instrument === "banjo5-three-finger" ? instrument : "strum";
  return { family, patterns: PATTERNS.filter((pattern) => pattern.instrument === family) };
}
