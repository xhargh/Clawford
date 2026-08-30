import { combineSvgs, downloadSvg } from "./export.js";
import { renderFretboard } from "./fretboard-renderer.js";
import { generateFretboardNotes, generateNotes } from "./mapping.js";
import { renderNotation } from "./notation-renderer.js";
import { parsePitch } from "./pitch.js";
import { KEYS, SCALES, getKey, getScale } from "./scales.js";
import { DEFAULT_STATE, stateFromSources, stateToSearchParams } from "./state.js";
import { loadCustomTuning, loadStoredState, saveCustomTuning, saveStoredState } from "./storage.js";
import { BUILT_IN_TUNINGS, createCustomTuning } from "./tunings.js";

const form = document.querySelector("#settings-form");
const tuningSelect = document.querySelector("#tuning");
const keySelect = document.querySelector("#key");
const scaleSelect = document.querySelector("#scale");
const notationOutput = document.querySelector("#notation-output");
const fretboardOutput = document.querySelector("#fretboard-output");
const status = document.querySelector("#status");
const initialParams = new URLSearchParams(location.search);
let customTuning = customTuningFromParams(initialParams) || loadCustomTuning(isValidTuning);
let tunings = customTuning ? [...BUILT_IN_TUNINGS, customTuning] : [...BUILT_IN_TUNINGS];

populateSelect(tuningSelect, tunings.map((tuning) => ({ value: tuning.id, label: `${tuning.name} (${tuning.shortName})` })));
populateSelect(keySelect, KEYS.map((key) => ({ value: key.value, label: key.label })));
populateSelect(scaleSelect, SCALES.map((scale) => ({ value: scale.id, label: scale.name })));

let state = stateFromSources(loadStoredState(), initialParams, {
  tunings: tunings.map((tuning) => tuning.id),
  keys: KEYS.map((key) => key.value),
  scales: SCALES.map((scale) => scale.id)
}, isValidPitch);
writeForm(state);
render();

form.addEventListener("input", updateFromForm);
document.querySelector("#print-button").addEventListener("click", () => window.print());
document.querySelector("#download-button").addEventListener("click", () => {
  const notationSvg = notationOutput.querySelector("svg");
  const fretboardSvg = fretboardOutput.querySelector("svg");
  const visibleSvg = state.view === "both" ? combineSvgs([notationSvg, fretboardSvg]) : state.view === "fretboard" ? fretboardSvg : notationSvg;
  if (visibleSvg) downloadSvg(visibleSvg, `banjo-note-map-${state.tuning}-${state.key}-${state.scale}.svg`);
});
document.querySelector("#save-custom").addEventListener("click", saveCustom);

function populateSelect(select, options) {
  select.replaceChildren(...options.map(({ value, label }) => new Option(label, value)));
}

function writeForm(values) {
  for (const [key, value] of Object.entries(values)) {
    const controls = form.elements.namedItem(key);
    if (!controls) continue;
    if (controls instanceof RadioNodeList) controls.value = String(value);
    else if (controls.type === "checkbox") controls.checked = value;
    else controls.value = String(value);
  }
  updateConditionalControls();
}

function updateFromForm() {
  const data = new FormData(form);
  state = {
    ...state,
    tuning: data.get("tuning"),
    key: data.get("key"),
    scale: data.get("scale"),
    maxFret: Number(data.get("maxFret")),
    fifthMode: data.get("fifthMode"),
    preference: data.get("preference"),
    displayMode: data.get("displayMode"),
    view: data.get("view"),
    pitchDisplay: data.get("pitchDisplay"),
    fifthNumbering: data.get("fifthNumbering"),
    spelling: data.get("spelling"),
    rangeMode: data.get("rangeMode"),
    lowNote: data.get("lowNote"),
    highNote: data.get("highNote"),
    ledgerLines: Number(data.get("ledgerLines")),
    staffSize: data.get("staffSize"),
    showOctave: data.has("showOctave"),
    showDegree: data.has("showDegree")
  };
  updateConditionalControls();
  render();
}

function updateConditionalControls() {
  document.querySelector("#note-range-controls").hidden = state.rangeMode !== "notes";
  document.querySelector("#ledger-control").hidden = state.rangeMode !== "staff";
}

function render() {
  const tuning = tunings.find((item) => item.id === state.tuning) || tunings[0];
  const key = getKey(state.key);
  const scale = getScale(state.scale);
  let range;
  try {
    range = selectedRange();
    if (range && range.low > range.high) throw new Error("Lowest note must not be above highest note");
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
    notationOutput.replaceChildren();
    fretboardOutput.replaceChildren();
    document.querySelector("#download-button").disabled = true;
    return;
  }
  const title = `5-String Banjo — ${tuning.name} — ${key.value} ${scale.name} — Frets 0–${state.maxFret}`;
  const notes = generateNotes({ ...state, tuning, key, scale, range });
  const fretNotes = generateFretboardNotes({ ...state, tuning, key, scale });

  notationOutput.replaceChildren(renderNotation(notes, title, state));
  fretboardOutput.replaceChildren(renderFretboard(fretNotes, state.maxFret, title, state.fifthMode));
  document.querySelector("#download-button").disabled = false;
  notationOutput.hidden = state.view === "fretboard";
  fretboardOutput.hidden = state.view === "notation";
  status.textContent = `${notes.length} playable written ${notes.length === 1 ? "note" : "notes"}. Root notes are shaded and underlined.`;
  document.querySelector(".fifth-note").hidden = state.fifthMode === "excluded" || !notes.some((note) => note.positions.some((position) => position.string === 5));
  document.title = `${key.value} ${scale.name} — Banjo Note Map`;
  saveStoredState(state);
  const params = stateToSearchParams(state);
  if (state.tuning === "custom" && customTuning) {
    params.set("customName", customTuning.name);
    params.set("customPitches", customTuning.strings.map((string) => string.pitch).join(","));
  }
  const query = params.toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
}

function isValidPitch(value) {
  try {
    parsePitch(value);
    return true;
  } catch {
    return false;
  }
}

function isValidTuning(tuning) {
  return Boolean(tuning && tuning.id === "custom" && typeof tuning.name === "string" && typeof tuning.shortName === "string" && Array.isArray(tuning.strings) && tuning.strings.length === 5 && tuning.strings.every((string, index) => string.number === index + 1 && isValidPitch(string.pitch) && (index < 4 || string.startsAtPhysicalFret === 5)));
}

function customTuningFromParams(params) {
  const pitches = params.get("customPitches")?.split(",");
  if (!pitches || pitches.length !== 5 || !pitches.every(isValidPitch)) return null;
  return createCustomTuning(params.get("customName") || "Shared custom tuning", pitches);
}

function selectedRange() {
  if (state.rangeMode === "auto") return undefined;
  if (state.rangeMode === "notes") return { low: parsePitch(state.lowNote).midi, high: parsePitch(state.highNote).midi };
  return { low: 64 - state.ledgerLines * 2, high: 77 + state.ledgerLines * 2 };
}

function saveCustom() {
  const error = document.querySelector("#custom-error");
  try {
    const pitches = [1, 2, 3, 4, 5].map((number) => {
      const pitch = document.querySelector(`#custom-${number}`).value.trim();
      parsePitch(pitch);
      return pitch;
    });
    customTuning = createCustomTuning(document.querySelector("#custom-name").value.trim(), pitches);
    saveCustomTuning(customTuning);
    tunings = [...BUILT_IN_TUNINGS, customTuning];
    populateSelect(tuningSelect, tunings.map((tuning) => ({ value: tuning.id, label: `${tuning.name} (${tuning.shortName})` })));
    state.tuning = "custom";
    tuningSelect.value = "custom";
    error.textContent = "";
    render();
  } catch (exception) {
    error.textContent = exception.message;
  }
}
