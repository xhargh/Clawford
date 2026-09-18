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
  metronomeBpm: 96,
  metronomeNumerator: 4,
  metronomeDenominator: 4,
  metronomeFirstAccent: true,
  metronomeOddAccent: false,
  pitchDisplay: "written",
  fifthNumbering: "physical",
  spelling: "key",
  staffSize: "normal",
  notationOctave: 0,
  chordRoot: "G",
  chordQuality: "major",
  harmonySevenths: false
};

const ENUMS = { view: ["notation", "fretboard", "tuner", "metronome", "harmony"], tunerMode: ["chromatic", "tuning"], metronomeDenominator: [2, 4, 8, 16] };
const USER_SETTINGS = new Set(["instrument", "tuning", "key", "scale", "view", "tunerMode", "tunerA4", "metronomeBpm", "metronomeNumerator", "metronomeDenominator", "metronomeFirstAccent", "metronomeOddAccent", "chordRoot", "chordQuality", "harmonySevenths"]);

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
    if (["metronomeFirstAccent", "metronomeOddAccent", "harmonySevenths"].includes(key)) state[key] = raw === true || raw === "true";
    else if (key === "metronomeBpm" && Number.isInteger(Number(raw)) && Number(raw) >= 30 && Number(raw) <= 300) state[key] = Number(raw);
    else if (key === "metronomeNumerator" && Number.isInteger(Number(raw)) && Number(raw) >= 1 && Number(raw) <= 12) state[key] = Number(raw);
    else if (key === "metronomeDenominator" && ENUMS[key].includes(Number(raw))) state[key] = Number(raw);
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
