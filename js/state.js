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
  showOctave: false,
  showDegree: false,
  view: "notation",
  pitchDisplay: "written",
  fifthNumbering: "physical",
  spelling: "key",
  staffSize: "normal"
};

const ENUMS = {
  fifthMode: ["excluded", "included", "drone"],
  preference: ["all", "lowest-fret", "higher-string", "lower-string"],
  displayMode: ["scale", "chromatic"],
  rangeMode: ["auto", "notes", "staff"],
  view: ["notation", "fretboard", "both"],
  pitchDisplay: ["written", "sounding"],
  fifthNumbering: ["physical", "relative"],
  spelling: ["key", "sharp", "flat"],
  staffSize: ["compact", "normal", "large"]
};

export function stateFromSources(stored, searchParams, validValues, isValidPitch = () => true) {
  const state = { ...DEFAULT_STATE };
  applyObject(state, stored, validValues, isValidPitch);
  const query = Object.fromEntries(searchParams.entries());
  applyObject(state, query, validValues, isValidPitch);
  return state;
}

function applyObject(state, source, validValues, isValidPitch) {
  if (!source || typeof source !== "object") return;
  for (const key of Object.keys(DEFAULT_STATE)) {
    if (!(key in source)) continue;
    const raw = source[key];
    if (key === "maxFret" && [5, 7, 12, 17, 22].includes(Number(raw))) state[key] = Number(raw);
    else if (key === "ledgerLines" && Number(raw) >= 0 && Number(raw) <= 8) state[key] = Number(raw);
    else if (key === "showOctave" || key === "showDegree") state[key] = raw === true || raw === "true";
    else if (ENUMS[key]?.includes(raw)) state[key] = raw;
    else if (key === "tuning" && validValues.tunings.includes(raw)) state[key] = raw;
    else if (key === "key" && validValues.keys.includes(raw)) state[key] = raw;
    else if (key === "scale" && validValues.scales.includes(raw)) state[key] = raw;
    else if ((key === "lowNote" || key === "highNote") && isValidPitch(raw)) state[key] = raw;
  }
}

export function stateToSearchParams(state) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state)) {
    if (value !== DEFAULT_STATE[key]) params.set(key, String(value));
  }
  return params;
}
