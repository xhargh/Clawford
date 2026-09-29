export const DEFAULT_STATE = {
  instrument: "banjo5",
  tuning: "open-g",
  key: "G",
  scale: "major",
  maxFret: 5,
  fifthMode: "excluded",
  preference: "all",
  displayMode: "scale",
  rangeMode: "auto",
  lowNote: "D3",
  highNote: "G4",
  ledgerLines: 2,
  notationLayout: "strings",
  showNoteSymbols: true,
  showOctave: false,
  showDegree: false,
  view: "notation",
  tunerMode: "chromatic",
  tunerA4: 440,
  metronomeTpm: 96,
  metronomeTicks: 4,
  metronomePattern: "ANNN",
  pitchDisplay: "written",
  fifthNumbering: "physical",
  spelling: "key",
  staffSize: "normal",
  notationOctave: 0,
  chordRoot: "G",
  chordQuality: "major",
  earExercise: "find",
  earVariant: "free",
  earSequenceLimit: 5
};

const ENUMS = {
  view: ["notation", "fretboard", "tuner", "metronome", "ear-training"],
  tunerMode: ["chromatic", "tuning"],
  earExercise: ["find", "follow", "simon"],
  earVariant: ["free", "same-string", "scale", "rolling"]
};
const USER_SETTINGS = new Set(["instrument", "tuning", "key", "scale", "view", "tunerMode", "tunerA4", "metronomeTpm", "metronomeTicks", "metronomePattern", "chordRoot", "chordQuality", "earExercise", "earVariant", "earSequenceLimit"]);

export function stateFromSources(stored, searchParams, validValues) {
  const state = { ...DEFAULT_STATE };
  applyObject(state, stored, validValues);
  const query = Object.fromEntries(searchParams.entries());
  applyObject(state, query, validValues);
  return state;
}

function applyObject(state, source, validValues) {
  if (!source || typeof source !== "object") return;
  for (const key of Object.keys(DEFAULT_STATE)) {
    if (!USER_SETTINGS.has(key)) continue;
    if (!(key in source)) continue;
    const raw = source[key];
    if (key === "metronomeTpm" && Number.isInteger(Number(raw)) && Number(raw) >= 30 && Number(raw) <= 360) state[key] = Number(raw);
    else if (key === "metronomeTicks" && Number.isInteger(Number(raw)) && Number(raw) >= 1 && Number(raw) <= 16) state[key] = Number(raw);
    else if (key === "earSequenceLimit" && Number.isInteger(Number(raw)) && Number(raw) >= 1 && Number(raw) <= 32) state[key] = Number(raw);
    else if (key === "metronomePattern" && typeof raw === "string" && /^[ANS]{1,16}$/.test(raw)) state[key] = raw;
    else if (ENUMS[key]?.includes(raw)) state[key] = raw;
    else if (key === "tunerA4" && Number.isFinite(Number(raw)) && Number(raw) >= 400 && Number(raw) <= 480) state[key] = Number(raw);
    else if (key === "instrument" && validValues.instruments.includes(raw)) state[key] = raw;
    else if (key === "tuning" && validValues.tunings.includes(raw)) state[key] = raw;
    else if (key === "key" && validValues.keys.includes(raw)) state[key] = raw;
    else if (key === "scale" && validValues.scales.includes(raw)) state[key] = raw;
    else if (key === "chordRoot" && validValues.chordRoots.includes(raw)) state[key] = raw;
    else if (key === "chordQuality" && validValues.chordQualities.includes(raw)) state[key] = raw;
  }
}

export function stateToSearchParams(state) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state)) {
    if (USER_SETTINGS.has(key) && value !== DEFAULT_STATE[key]) params.set(key, String(value));
  }
  return params;
}
