import { renderChordBoard } from "./fretboard-renderer.js";
import { generateNotes } from "./mapping.js";
import { renderNotation } from "./notation-renderer.js";
import { CHORD_QUALITIES, generateChordBoardNotes, hasChordVoicing } from "./chords.js";
import { INSTRUMENTS, getInstrument } from "./instruments.js";
import { KEYS, SCALES, getKey, getScale, keySignatureFor } from "./scales.js";
import { stateFromSources, stateToSearchParams } from "./state.js";
import { loadStoredState, saveStoredState } from "./storage.js";
import { BUILT_IN_TUNINGS } from "./tunings.js";

const form = document.querySelector("#settings-form");
const instrumentSelect = document.querySelector("#instrument");
const tuningSelect = document.querySelector("#tuning");
const keySelect = document.querySelector("#key");
const scaleSelect = document.querySelector("#scale");
const chordRootSelect = document.querySelector("#chord-root");
const chordQualitySelect = document.querySelector("#chord-quality");
const notationOutput = document.querySelector("#notation-output");
const fretboardOutput = document.querySelector("#fretboard-output");
const tunings = [...BUILT_IN_TUNINGS];

function tuningsFor(instrumentId) {
  return tunings.filter((tuning) => tuning.instrument === instrumentId);
}

populateSelect(instrumentSelect, INSTRUMENTS.map((instrument) => ({ value: instrument.id, label: instrument.name })));
populateSelect(keySelect, KEYS.map((key) => ({ value: key.value, label: key.label })));
populateSelect(scaleSelect, SCALES.map((scale) => ({ value: scale.id, label: scale.name })));
populateSelect(chordRootSelect, KEYS.map((key) => ({ value: key.value, label: key.label })));
populateSelect(chordQualitySelect, CHORD_QUALITIES.map((quality) => ({ value: quality.id, label: quality.label })));

let state = stateFromSources(loadStoredState(), new URLSearchParams(location.search), {
  instruments: INSTRUMENTS.map((instrument) => instrument.id),
  tunings: tunings.map((tuning) => tuning.id),
  keys: KEYS.map((key) => key.value),
  scales: SCALES.map((scale) => scale.id),
  chordRoots: KEYS.map((key) => key.value),
  chordQualities: CHORD_QUALITIES.map((quality) => quality.id)
});
if (!tuningsFor(state.instrument).some((tuning) => tuning.id === state.tuning)) {
  state = { ...state, tuning: tuningsFor(state.instrument)[0].id };
}
populateSelect(tuningSelect, tuningsFor(state.instrument).map((tuning) => ({ value: tuning.id, label: `${tuning.name} (${tuning.shortName})` })));
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
  const instrument = data.get("instrument");
  const instrumentChanged = instrument !== state.instrument;
  const tuning = instrumentChanged ? tuningsFor(instrument)[0].id : data.get("tuning");
  state = {
    ...state,
    instrument,
    tuning,
    key: data.get("key"),
    scale: data.get("scale"),
    view: data.get("view"),
    chordRoot: data.get("chordRoot"),
    chordQuality: data.get("chordQuality"),
    fretboardOrientation: data.get("fretboardOrientation")
  };
  if (instrumentChanged) {
    populateSelect(tuningSelect, tuningsFor(instrument).map((item) => ({ value: item.id, label: `${item.name} (${item.shortName})` })));
    writeForm(state);
  }
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
  const instrument = getInstrument(tuning.instrument) || getInstrument(state.instrument);
  const key = getKey(state.key);
  const scale = getScale(state.scale);
  const chordRoot = getKey(state.chordRoot);
  const chordQuality = CHORD_QUALITIES.find((quality) => quality.id === state.chordQuality);
  const title = `${instrument.name} — ${tuning.name} — ${key.value} ${scale.name} — Frets 0–${state.maxFret}`;
  const fretboardTitle = `${instrument.name} — ${tuning.name}`;
  const notes = generateNotes({ ...state, tuning, key, scale });
  updateChordOptionAvailability(tuning);
  const chordBoard = generateChordBoardNotes(tuning, chordRoot.pitchClass, chordQuality.id);

  notationOutput.replaceChildren(renderNotation(notes, title, { ...state, tuning, keySignature: keySignatureFor(key, scale) }));
  fretboardOutput.replaceChildren(renderChordBoard(chordBoard, fretboardTitle, tuning, chordRoot, chordQuality, state.fretboardOrientation));
  notationOutput.hidden = state.view === "fretboard";
  fretboardOutput.hidden = state.view === "notation";
  document.querySelector("#chord-root-control").hidden = state.view !== "fretboard";
  document.querySelector("#chord-quality-control").hidden = state.view !== "fretboard";
  document.querySelector("#orientation-control").hidden = state.view !== "fretboard";
  document.querySelector("#key-control").hidden = state.view === "fretboard";
  document.querySelector("#scale-control").hidden = state.view === "fretboard";
  document.title = `${key.value} ${scale.name} — FretMap`;
  saveStoredState(state);
  const query = stateToSearchParams(state).toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
}
