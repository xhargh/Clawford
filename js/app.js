import { renderChordBoard } from "./fretboard-renderer.js";
import { generateNotes } from "./mapping.js";
import { renderNotation } from "./notation-renderer.js";
import { CHORD_QUALITIES, generateChordBoardNotes, hasChordVoicing } from "./chords.js";
import { KEYS, SCALES, getKey, getScale, keySignatureFor } from "./scales.js";
import { stateFromSources, stateToSearchParams } from "./state.js";
import { loadStoredState, saveStoredState } from "./storage.js";
import { BUILT_IN_TUNINGS } from "./tunings.js";

const form = document.querySelector("#settings-form");
const tuningSelect = document.querySelector("#tuning");
const keySelect = document.querySelector("#key");
const scaleSelect = document.querySelector("#scale");
const chordRootSelect = document.querySelector("#chord-root");
const chordQualitySelect = document.querySelector("#chord-quality");
const notationOutput = document.querySelector("#notation-output");
const fretboardOutput = document.querySelector("#fretboard-output");
const tunings = [...BUILT_IN_TUNINGS];

populateSelect(tuningSelect, tunings.map((tuning) => ({ value: tuning.id, label: `${tuning.name} (${tuning.shortName})` })));
populateSelect(keySelect, KEYS.map((key) => ({ value: key.value, label: key.label })));
populateSelect(scaleSelect, SCALES.map((scale) => ({ value: scale.id, label: scale.name })));
populateSelect(chordRootSelect, KEYS.map((key) => ({ value: key.value, label: key.label })));
populateSelect(chordQualitySelect, CHORD_QUALITIES.map((quality) => ({ value: quality.id, label: quality.label })));

let state = stateFromSources(loadStoredState(), new URLSearchParams(location.search), {
  tunings: tunings.map((tuning) => tuning.id),
  keys: KEYS.map((key) => key.value),
  scales: SCALES.map((scale) => scale.id),
  chordRoots: KEYS.map((key) => key.value),
  chordQualities: CHORD_QUALITIES.map((quality) => quality.id)
});
writeForm(state);
render();

form.addEventListener("input", updateFromForm);

function populateSelect(select, options) {
  select.replaceChildren(...options.map(({ value, label }) => new Option(label, value)));
}

function writeForm(values) {
  for (const [key, value] of Object.entries(values)) {
    const controls = form.elements.namedItem(key);
    if (!controls) continue;
    if (controls instanceof RadioNodeList) controls.value = String(value);
    else controls.value = String(value);
  }
}

function updateFromForm() {
  const data = new FormData(form);
  state = {
    ...state,
    tuning: data.get("tuning"),
    key: data.get("key"),
    scale: data.get("scale"),
    view: data.get("view"),
    chordRoot: data.get("chordRoot"),
    chordQuality: data.get("chordQuality")
  };
  render();
}

function updateChordOptionAvailability(tuning) {
  for (const option of chordRootSelect.options) {
    option.disabled = CHORD_QUALITIES.every((quality) => !hasChordVoicing(tuning, getKey(option.value).pitchClass, quality.id));
  }
  const chordRootPitchClass = getKey(state.chordRoot).pitchClass;
  for (const option of chordQualitySelect.options) {
    option.disabled = !hasChordVoicing(tuning, chordRootPitchClass, option.value);
  }
}

function render() {
  const tuning = tunings.find((item) => item.id === state.tuning) || tunings[0];
  const key = getKey(state.key);
  const scale = getScale(state.scale);
  const chordRoot = getKey(state.chordRoot);
  const chordQuality = CHORD_QUALITIES.find((quality) => quality.id === state.chordQuality);
  const title = `5-String Banjo — ${tuning.name} — ${key.value} ${scale.name} — Frets 0–${state.maxFret}`;
  const notes = generateNotes({ ...state, tuning, key, scale });
  updateChordOptionAvailability(tuning);
  const chordBoard = generateChordBoardNotes(tuning, chordRoot.pitchClass, chordQuality.id);

  notationOutput.replaceChildren(renderNotation(notes, title, { ...state, keySignature: keySignatureFor(key, scale) }));
  fretboardOutput.replaceChildren(renderChordBoard(chordBoard, title, tuning, chordRoot, chordQuality));
  notationOutput.hidden = state.view === "fretboard";
  fretboardOutput.hidden = state.view === "notation";
  document.querySelector("#chord-root-control").hidden = state.view !== "fretboard";
  document.querySelector("#chord-quality-control").hidden = state.view !== "fretboard";
  document.title = `${key.value} ${scale.name} — Banjo Note Map`;
  saveStoredState(state);
  const query = stateToSearchParams(state).toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
}

