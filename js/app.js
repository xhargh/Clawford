import { renderChordBoard } from "./fretboard-renderer.js";
import { generateNotes } from "./mapping.js";
import { renderNotation } from "./notation-renderer.js";
import { CHORD_QUALITIES, generateChordBoardNotes, hasChordVoicing } from "./chords.js";
import { INSTRUMENTS, getInstrument } from "./instruments.js";
import { KEYS, SCALES, getKey, getScale, keySignatureFor } from "./scales.js";
import { stateFromSources, stateToSearchParams } from "./state.js";
import { loadStoredState, saveStoredState } from "./storage.js";
import { BUILT_IN_TUNINGS } from "./tunings.js";
import { AudioPlayer } from "./audio/player.js";
import { BANJO_PROFILE, GUITAR_PROFILE } from "./audio/synth.js";
import { crossedStrings, selectTone, selectedFretsFromVoicing } from "./playback-interactions.js";

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
let audioPlayer = createAudioPlayer(state.instrument);
let selectedFretsByString = new Map();
let selectedTonesByString = new Map();
let chordSelectionKey = "";
let strumGesture = null;
let suppressClicksUntil = 0;
if (!tuningsFor(state.instrument).some((tuning) => tuning.id === state.tuning)) {
  state = { ...state, tuning: tuningsFor(state.instrument)[0].id };
}
populateSelect(tuningSelect, tuningsFor(state.instrument).map((tuning) => ({ value: tuning.id, label: `${tuning.name} (${tuning.shortName})` })));
writeForm(state);

let fitScheduled = false;
render();

form.addEventListener("input", updateFromForm);
notationOutput.addEventListener("click", handleNotationClick);
notationOutput.addEventListener("keydown", handleNotationKeydown);
fretboardOutput.addEventListener("click", handleFretboardClick);
fretboardOutput.addEventListener("keydown", handleFretboardKeydown);
fretboardOutput.addEventListener("pointerdown", handleStrumStart);
fretboardOutput.addEventListener("pointermove", handleStrumMove);
fretboardOutput.addEventListener("pointerup", handleStrumEnd);
fretboardOutput.addEventListener("pointercancel", handleStrumEnd);
window.addEventListener("resize", scheduleDiagramFit);
window.addEventListener("orientationchange", scheduleDiagramFit);

function createAudioPlayer(instrumentId) {
  return new AudioPlayer({ profile: instrumentId.startsWith("banjo") ? BANJO_PROFILE : GUITAR_PROFILE });
}

function playNotes(notes) {
  void audioPlayer.playNotes(notes).catch((error) => console.warn("Unable to play audio", error));
}

function noteFromElement(element) {
  return { midi: Number(element.dataset.midi), string: Number(element.dataset.string) };
}

function handleNotationClick(event) {
  const note = event.target.closest(".playable-note");
  if (note) playNotes([noteFromElement(note)]);
}

function handleNotationKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const note = event.target.closest(".playable-note");
  if (!note) return;
  event.preventDefault();
  playNotes([noteFromElement(note)]);
}

function selectAndPlayFretboardTone(element) {
  const note = noteFromElement(element);
  selectedFretsByString = selectTone(selectedFretsByString, note.string, Number(element.dataset.fret));
  playNotes([note]);
  render();
}

function handleFretboardClick(event) {
  if (performance.now() < suppressClicksUntil) return;
  const tone = event.target.closest(".chord-tone");
  if (tone) selectAndPlayFretboardTone(tone);
}

function handleFretboardKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const tone = event.target.closest(".chord-tone");
  if (!tone) return;
  event.preventDefault();
  selectAndPlayFretboardTone(tone);
}

function svgX(svg, clientX) {
  const bounds = svg.getBoundingClientRect();
  return svg.viewBox.baseVal.x + (clientX - bounds.left) * svg.viewBox.baseVal.width / bounds.width;
}

function handleStrumStart(event) {
  if (!event.isPrimary || event.button !== 0) return;
  const svg = event.target.closest(".chord-board");
  if (!svg) return;
  const stringPositions = new Map([...svg.querySelectorAll(".string-line")].map((line) => [
    Number(line.dataset.string),
    Number(line.getAttribute("x1"))
  ]));
  const x = svgX(svg, event.clientX);
  strumGesture = {
    pointerId: event.pointerId,
    svg,
    stringPositions,
    startClientX: event.clientX,
    startClientY: event.clientY,
    previousX: x,
    firstSegment: true,
    strumming: false
  };
}

function handleStrumMove(event) {
  const gesture = strumGesture;
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  if (!gesture.strumming && Math.hypot(event.clientX - gesture.startClientX, event.clientY - gesture.startClientY) < 6) return;
  if (!gesture.strumming) fretboardOutput.setPointerCapture?.(event.pointerId);
  gesture.strumming = true;
  suppressClicksUntil = performance.now() + 300;
  const currentX = svgX(gesture.svg, event.clientX);
  const strings = crossedStrings(gesture.previousX, currentX, gesture.stringPositions, gesture.firstSegment);
  gesture.firstSegment = false;
  gesture.previousX = currentX;
  const notes = strings.map((string) => selectedTonesByString.get(string)).filter(Boolean);
  if (notes.length) playNotes(notes);
}

function handleStrumEnd(event) {
  if (!strumGesture || strumGesture.pointerId !== event.pointerId) return;
  fretboardOutput.releasePointerCapture?.(event.pointerId);
  strumGesture = null;
}

function scheduleDiagramFit() {
  if (fitScheduled) return;
  fitScheduled = true;
  requestAnimationFrame(() => {
    fitScheduled = false;
    updateDiagramFit();
  });
}

function updateDiagramFit() {
  const visible = [notationOutput, fretboardOutput].find((el) => !el.hidden);
  if (!visible) return;
  // Size for the full viewport height (minus breathing room for the frame's
  // own border/padding), not the space currently left below the settings
  // panel — so once the user scrolls the settings out of view, the whole
  // diagram fits the screen.
  const margin = 32;
  const available = Math.max(200, window.innerHeight - margin);
  visible.style.setProperty("--diagram-fit-height", `${available}px`);
}

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
    chordQuality: data.get("chordQuality")
  };
  if (instrumentChanged) {
    void audioPlayer.dispose();
    audioPlayer = createAudioPlayer(instrument);
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
  strumGesture = null;
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
  const nextSelectionKey = `${tuning.id}:${chordRoot.pitchClass}:${chordQuality.id}`;
  if (nextSelectionKey !== chordSelectionKey) {
    const initialBoard = generateChordBoardNotes(tuning, chordRoot.pitchClass, chordQuality.id);
    selectedFretsByString = selectedFretsFromVoicing(initialBoard.voicing);
    chordSelectionKey = nextSelectionKey;
  }
  const chordBoard = generateChordBoardNotes(tuning, chordRoot.pitchClass, chordQuality.id, { selectedFretsByString });
  selectedTonesByString = new Map(chordBoard.tones.filter((tone) => tone.isSelected).map((tone) => [tone.string, tone]));

  notationOutput.replaceChildren(renderNotation(notes, title, { ...state, tuning, keySignature: keySignatureFor(key, scale), clef: instrument.clef }));
  fretboardOutput.replaceChildren(renderChordBoard(chordBoard, fretboardTitle, tuning, chordRoot, chordQuality));
  notationOutput.hidden = state.view === "fretboard";
  fretboardOutput.hidden = state.view === "notation";
  document.querySelector("#chord-root-control").hidden = state.view !== "fretboard";
  document.querySelector("#chord-quality-control").hidden = state.view !== "fretboard";
  document.querySelector("#key-control").hidden = state.view === "fretboard";
  document.querySelector("#scale-control").hidden = state.view === "fretboard";
  document.title = `${key.value} ${scale.name} — Clawford`;
  saveStoredState(state);
  const query = stateToSearchParams(state).toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
  scheduleDiagramFit();
}
