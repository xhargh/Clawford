export const DEFAULT_STATE = {
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
  pitchDisplay: "written",
  fifthNumbering: "physical",
  spelling: "key",
  staffSize: "normal",
  notationOctave: 0,
  chordRoot: "G",
  chordQuality: "major"
};

const ENUMS = { view: ["notation", "fretboard"] };
const USER_SETTINGS = new Set(["tuning", "key", "scale", "view", "chordRoot", "chordQuality"]);

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
    if (ENUMS[key]?.includes(raw)) state[key] = raw;
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
