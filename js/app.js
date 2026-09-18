import { renderChordBoard, renderScaleBoard } from "./fretboard-renderer.js";
import { generateNotes } from "./mapping.js";
import { renderNotation } from "./notation-renderer.js";
import { CHORD_QUALITIES, generateChordBoardNotes, hasChordVoicing } from "./chords.js";
import { INSTRUMENTS, getInstrument } from "./instruments.js";
import { CHROMATIC_SCALE, KEYS, SCALES, getKey, getScale, keySignatureFor } from "./scales.js";
import { stateFromSources, stateToSearchParams } from "./state.js";
import { loadStoredState, saveStoredState } from "./storage.js";
import { BUILT_IN_TUNINGS } from "./tunings.js";
import { AudioPlayer } from "./audio/player.js";
import { BANJO_PROFILE, GUITAR_PROFILE } from "./audio/synth.js";
import { crossedStrings, selectTone, selectedFretsFromVoicing } from "./playback-interactions.js";
import { generateScaleBoardNotes } from "./scale-board.js";
import { MicrophoneSession } from "./audio/microphone-session.js";
import { estimatePitch, PitchStabilizer } from "./audio/pitch-detector.js";
import { selectTunerTarget, selectTunerTargets } from "./tuner.js";
import { renderTunerOutput } from "./tuner-renderer.js";
import { viewControlVisibility } from "./view-controls.js";
import { TunerLifecycle } from "./tuner-lifecycle.js";
import { Metronome } from "./metronome.js";
import { renderMetronomeOutput } from "./metronome-renderer.js";
import { FUN_FACTS } from "./fun-facts.js";
import { renderHarmonyOutput } from "./harmony-renderer.js";
import { generateDiatonicChords } from "./harmony.js";

const form = document.querySelector("#settings-form");
const instrumentSelect = document.querySelector("#instrument");
const tuningSelect = document.querySelector("#tuning");
const keySelect = document.querySelector("#key");
const scaleSelect = document.querySelector("#scale");
const chordRootSelect = document.querySelector("#chord-root");
const chordQualitySelect = document.querySelector("#chord-quality");
const notationOutput = document.querySelector("#notation-output");
const fretboardOutput = document.querySelector("#fretboard-output");
const tunerOutput = document.querySelector("#tuner-output");
const metronomeOutput = document.querySelector("#metronome-output");
const harmonyOutput = document.querySelector("#harmony-output");
const funFactImage = document.querySelector("#fun-fact-image");
const funFactPreview = document.querySelector("#fun-fact-preview");
const warningBanner = document.querySelector("#warning-banner");
const tunerControls = document.querySelector("#tuner-controls");
const metronomeControls = document.querySelector("#metronome-controls");
const harmonyControls = document.querySelector("#harmony-controls");
const generalControls = document.querySelector("#general-controls");
const tunerInputDevice = document.querySelector("#tuner-input-device");
const tunerStart = document.querySelector("#tuner-start");
const tunerStop = document.querySelector("#tuner-stop");
const tunings = [...BUILT_IN_TUNINGS];
const FRETBOARD_SCALES = [...SCALES, CHROMATIC_SCALE];
const HARMONY_SCALES = SCALES.filter((scale) => ["major", "natural-minor"].includes(scale.id));
const scaleOptionValue = (scale) => `scale:${scale.id}`;

function tuningsFor(instrumentId) {
  return tunings.filter((tuning) => tuning.instrument === instrumentId);
}

populateSelect(instrumentSelect, INSTRUMENTS.map((instrument) => ({ value: instrument.id, label: instrument.name })));
populateSelect(keySelect, KEYS.map((key) => ({ value: key.value, label: key.label })));
populateSelect(scaleSelect, SCALES.map((scale) => ({ value: scale.id, label: scale.name })));
populateSelect(chordRootSelect, KEYS.map((key) => ({ value: key.value, label: key.label })));
populateFretboardPatterns();

let state = stateFromSources(loadStoredState(), new URLSearchParams(location.search), {
  instruments: INSTRUMENTS.map((instrument) => instrument.id),
  tunings: tunings.map((tuning) => tuning.id),
  keys: KEYS.map((key) => key.value),
  scales: SCALES.map((scale) => scale.id),
  chordRoots: KEYS.map((key) => key.value),
  chordQualities: [...CHORD_QUALITIES.map((quality) => quality.id), ...FRETBOARD_SCALES.map(scaleOptionValue)]
});
let audioPlayer = createAudioPlayer(state.instrument);
let selectedFretsByString = new Map();
let selectedTonesByString = new Map();
let fretboardSelectionKey = "";
let strumGesture = null;
let suppressClicksUntil = 0;
let tunerAnimationFrame = null;
let tunerStabilizer = new PitchStabilizer();
let tunerReading = null;
let tunerError = "";
let metronomeBeat = 0;
let metronomeError = "";
let harmonyView = "map";
let harmonySelectedNode = null;
let harmonySelectedPair = null;
let harmonyTrail = [];
let harmonyTrailPlayback = null;
let currentFunFact = -1;
let funFactsActive = false;
let funFactHoverTimer = null;
const metronome = new Metronome({ onBeat: (beat) => { metronomeBeat = beat; renderMetronome(); } });
const tunerLifecycle = new TunerLifecycle({
  createSession: createMicrophoneSession,
  onStarted: (session) => {
    render();
    readTunerFrame(session);
  },
  onError: (error) => {
    tunerError = error.message || "Unable to start microphone";
    render();
  }
});
if (!tuningsFor(state.instrument).some((tuning) => tuning.id === state.tuning)) {
  state = { ...state, tuning: tuningsFor(state.instrument)[0].id };
}
populateSelect(tuningSelect, tuningsFor(state.instrument).map((tuning) => ({ value: tuning.id, label: `${tuning.name} (${tuning.shortName})` })));
writeForm(state);

let fitScheduled = false;
render();
window.setTimeout(() => {
  funFactsActive = true;
  showRandomFunFact(false);
  window.setInterval(showRandomFunFact, 60_000);
}, 60_000);
if (state.view === "tuner") {
  void loadInputDevices();
  void tunerLifecycle.enter();
}

form.addEventListener("input", updateFromForm);
tunerInputDevice.addEventListener("change", handleTunerInputDeviceChange);
tunerStart.addEventListener("click", startTuner);
tunerStop.addEventListener("click", () => { void stopTuner(); });
metronomeOutput.addEventListener("click", (event) => {
  if (event.target.closest("#metronome-start")) void startMetronome();
  if (event.target.closest("#metronome-stop")) stopMetronome();
});
harmonyOutput.addEventListener("click", handleHarmonyClick);
funFactImage.addEventListener("click", showRandomFunFact);
funFactImage.addEventListener("pointerenter", startFunFactPreview);
funFactImage.addEventListener("pointerleave", stopFunFactPreview);
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
window.addEventListener("pagehide", () => { void stopTuner(); stopMetronome(); });
document.addEventListener("visibilitychange", handleVisibilityChange);

function createAudioPlayer(instrumentId) {
  return new AudioPlayer({ profile: instrumentId.startsWith("banjo") ? BANJO_PROFILE : GUITAR_PROFILE });
}

function showRandomFunFact(updateBanner = true) {
  if (!funFactsActive) return;
  let next = Math.floor(Math.random() * FUN_FACTS.length);
  if (FUN_FACTS.length > 1) {
    while (next === currentFunFact) next = Math.floor(Math.random() * FUN_FACTS.length);
  }
  currentFunFact = next;
  const number = String(next + 1).padStart(3, "0");
  funFactImage.querySelector("img").src = `img/fun/${number}.webp`;
  funFactImage.querySelector("img").alt = `Clawford fact ${next + 1}`;
  if (updateBanner) warningBanner.textContent = FUN_FACTS[next];
  funFactImage.disabled = false;
}

function startFunFactPreview() {
  if (!funFactsActive || funFactHoverTimer !== null) return;
  funFactHoverTimer = window.setTimeout(() => {
    funFactHoverTimer = null;
    const image = funFactImage.querySelector("img");
    const previewImage = funFactPreview.querySelector("img");
    previewImage.src = image.src;
    previewImage.alt = image.alt;
    funFactPreview.hidden = false;
    funFactPreview.setAttribute("aria-hidden", "false");
  }, 1_000);
}

function stopFunFactPreview() {
  if (funFactHoverTimer !== null) {
    window.clearTimeout(funFactHoverTimer);
    funFactHoverTimer = null;
  }
  funFactPreview.hidden = true;
  funFactPreview.setAttribute("aria-hidden", "true");
}

function playNotes(notes) {
  void audioPlayer.playNotes(notes).catch((error) => console.warn("Unable to play audio", error));
}

function harmonyChordNotes(chord) {
  return chord.pitchClasses.map((pitchClass, index) => ({
    midi: 60 + pitchClass,
    string: index + 1,
    velocity: 0.8
  }));
}

function playHarmonyChord(chord) {
  if (chord) playNotes(harmonyChordNotes(chord));
}

function stopHarmonyTrailPlayback() {
  if (harmonyTrailPlayback) {
    harmonyTrailPlayback.timers.forEach((timer) => window.clearTimeout(timer));
    harmonyTrailPlayback = null;
  }
  audioPlayer.stopAll();
}

function playHarmonyTrail() {
  const chords = generateDiatonicChords(state.key, state.scale, state.harmonySevenths);
  const playback = { timers: [] };
  stopHarmonyTrailPlayback();
  harmonyTrailPlayback = playback;
  harmonyTrail.map((id) => chords.find((chord) => chord.id === id)).filter(Boolean).forEach((chord, index) => {
    playback.timers.push(window.setTimeout(() => {
      if (harmonyTrailPlayback === playback) playHarmonyChord(chord);
    }, index * 700));
  });
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
  const tone = event.target.closest(".fretboard-tone");
  if (tone) selectAndPlayFretboardTone(tone);
}

function handleFretboardKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const tone = event.target.closest(".fretboard-tone");
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
  const svg = event.target.closest(".fretboard-board");
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

function populateFretboardPatterns() {
  const chordGroup = document.createElement("optgroup");
  chordGroup.label = "Chords";
  chordGroup.append(...CHORD_QUALITIES.map((quality) => new Option(quality.label, quality.id)));
  const scaleGroup = document.createElement("optgroup");
  scaleGroup.label = "Scales";
  scaleGroup.append(...FRETBOARD_SCALES.map((scale) => new Option(scale.name, scaleOptionValue(scale))));
  chordQualitySelect.replaceChildren(chordGroup, scaleGroup);
}

function writeForm(values) {
  for (const [key, value] of Object.entries(values)) {
    const controls = form.elements.namedItem(key);
    if (!controls) continue;
    if (controls instanceof RadioNodeList) controls.value = String(value);
    else if (controls.type === "checkbox") controls.checked = Boolean(value);
    else controls.value = String(value);
  }
}

function updateFromForm() {
  const previousView = state.view;
  const previousMetronome = state;
  const data = new FormData(form);
  const tunerA4 = Number(data.get("tunerA4"));
  const tunerA4Input = form.elements.namedItem("tunerA4");
  const validTunerA4 = Number.isFinite(tunerA4) && tunerA4 >= 400 && tunerA4 <= 480;
  tunerA4Input.setCustomValidity(validTunerA4 ? "" : "A4 must be between 400 and 480 Hz.");
  const instrument = data.get("instrument");
  const instrumentChanged = instrument !== state.instrument;
  const tuning = instrumentChanged ? tuningsFor(instrument)[0].id : data.get("tuning");
  const selectedScale = data.get("view") === "harmony" && !HARMONY_SCALES.some((scale) => scale.id === data.get("scale")) ? "major" : data.get("scale");
  state = {
    ...state,
    instrument,
    tuning,
    key: data.get("key"),
    scale: selectedScale,
    view: data.get("view"),
    tunerMode: data.get("tunerMode"),
    tunerA4: validTunerA4 ? tunerA4 : state.tunerA4,
    metronomeBpm: validMetronomeBpm(data.get("metronomeBpm")) ? Number(data.get("metronomeBpm")) : state.metronomeBpm,
    metronomeNumerator: validMetronomeNumerator(data.get("metronomeNumerator")) ? Number(data.get("metronomeNumerator")) : state.metronomeNumerator,
    metronomeDenominator: Number(data.get("metronomeDenominator")),
    metronomeFirstAccent: data.get("metronomeFirstAccent") === "on",
    metronomeOddAccent: data.get("metronomeOddAccent") === "on",
    chordRoot: data.get("chordRoot"),
    chordQuality: data.get("chordQuality"),
    harmonySevenths: data.get("harmonySevenths") === "on"
  };
  if (instrumentChanged) {
    void audioPlayer.dispose();
    audioPlayer = createAudioPlayer(instrument);
    populateSelect(tuningSelect, tuningsFor(instrument).map((item) => ({ value: item.id, label: `${item.name} (${item.shortName})` })));
    writeForm(state);
  }
  if (previousView === "tuner" && state.view !== "tuner") void stopTuner();
  if (previousView === "metronome" && state.view !== "metronome") stopMetronome();
  if (previousView !== "tuner" && state.view === "tuner") {
    void loadInputDevices();
    void tunerLifecycle.enter();
  }
  render();
  if (state.view === "metronome" && metronome.running && ["metronomeBpm", "metronomeNumerator", "metronomeDenominator", "metronomeFirstAccent", "metronomeOddAccent"].some((key) => state[key] !== previousMetronome[key])) void startMetronome();
}

function updateChordOptionAvailability(tuning) {
  for (const option of chordRootSelect.options) {
    option.disabled = !state.chordQuality.startsWith("scale:")
      && CHORD_QUALITIES.every((quality) => !hasChordVoicing(tuning, getKey(option.value).pitchClass, quality.id));
  }
  const chordRootPitchClass = getKey(state.chordRoot).pitchClass;
  for (const option of chordQualitySelect.options) {
    option.disabled = !option.value.startsWith("scale:") && !hasChordVoicing(tuning, chordRootPitchClass, option.value);
  }
}

function render() {
  strumGesture = null;
  const tuning = tunings.find((item) => item.id === state.tuning) || tunings[0];
  const instrument = getInstrument(tuning.instrument) || getInstrument(state.instrument);
  const key = getKey(state.key);
  const scale = getScale(state.scale);
  const chordRoot = getKey(state.chordRoot);
  const scaleId = state.chordQuality.startsWith("scale:") ? state.chordQuality.slice(6) : null;
  const fretboardScale = scaleId ? FRETBOARD_SCALES.find((item) => item.id === scaleId) : null;
  const chordQuality = scaleId ? null : CHORD_QUALITIES.find((quality) => quality.id === state.chordQuality);
  if (state.view === "harmony" && !HARMONY_SCALES.some((item) => item.id === state.scale)) state = { ...state, scale: "major" };
  syncHarmonyScaleOptions();
  const title = `${instrument.name} — ${tuning.name} — ${key.value} ${scale.name} — Frets 0–${state.maxFret}`;
  const fretboardTitle = `${instrument.name} — ${tuning.name}`;
  const notes = generateNotes({ ...state, tuning, key, scale });
  updateChordOptionAvailability(tuning);
  const nextSelectionKey = `${tuning.id}:${chordRoot.pitchClass}:${state.chordQuality}`;
  if (nextSelectionKey !== fretboardSelectionKey) {
    if (fretboardScale) {
      selectedFretsByString = new Map();
    } else {
      const initialBoard = generateChordBoardNotes(tuning, chordRoot.pitchClass, chordQuality.id);
      selectedFretsByString = selectedFretsFromVoicing(initialBoard.voicing);
    }
    fretboardSelectionKey = nextSelectionKey;
  }
  const fretboardBoard = fretboardScale
    ? generateScaleBoardNotes(tuning, chordRoot, fretboardScale, { selectedFretsByString })
    : generateChordBoardNotes(tuning, chordRoot.pitchClass, chordQuality.id, { selectedFretsByString });
  selectedTonesByString = new Map(fretboardBoard.tones.filter((tone) => tone.isSelected).map((tone) => [tone.string, tone]));

  notationOutput.replaceChildren(renderNotation(notes, title, { ...state, tuning, keySignature: keySignatureFor(key, scale), clef: instrument.clef }));
  fretboardOutput.replaceChildren(fretboardScale
    ? renderScaleBoard(fretboardBoard, fretboardTitle, tuning, chordRoot, fretboardScale)
    : renderChordBoard(fretboardBoard, fretboardTitle, tuning, chordRoot, chordQuality));
  notationOutput.hidden = state.view !== "notation";
  fretboardOutput.hidden = state.view !== "fretboard";
  tunerOutput.hidden = state.view !== "tuner";
  metronomeOutput.hidden = state.view !== "metronome";
  harmonyOutput.hidden = state.view !== "harmony";
  tunerControls.hidden = state.view !== "tuner";
  metronomeControls.hidden = state.view !== "metronome";
  harmonyControls.hidden = state.view !== "harmony";
  document.querySelector("#chord-root-control").hidden = state.view !== "fretboard";
  document.querySelector("#chord-quality-control").hidden = state.view !== "fretboard";
  const hiddenControls = viewControlVisibility(state.view);
  generalControls.hidden = state.view === "metronome";
  document.querySelector("#instrument-control").hidden = !hiddenControls.instrument;
  document.querySelector("#tuning-control").hidden = !hiddenControls.tuning;
  document.querySelector("#key-control").hidden = !hiddenControls.key;
  document.querySelector("#scale-control").hidden = !hiddenControls.scale;
  document.title = state.view === "metronome" ? "Metronome — Clawford" : state.view === "harmony" ? `Harmony — ${state.key} — Clawford` : `${key.value} ${scale.name} — Clawford`;
  renderTuner(tuning);
  renderMetronome();
  renderHarmony();
  saveStoredState(state);
  const query = stateToSearchParams(state).toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
  scheduleDiagramFit();
}

function syncHarmonyScaleOptions() {
  const options = state.view === "harmony" ? HARMONY_SCALES : SCALES;
  const current = state.view === "harmony" && !options.some((scale) => scale.id === state.scale) ? "major" : state.scale;
  if ([...scaleSelect.options].map((option) => option.value).join() !== options.map((scale) => scale.id).join()) populateSelect(scaleSelect, options.map((scale) => ({ value: scale.id, label: scale.name })));
  scaleSelect.value = current;
}

function renderHarmony() {
  if (state.view !== "harmony") return;
  const chords = renderHarmonyOutput({ keyValue: state.key, mode: state.scale, includeSevenths: state.harmonySevenths, selectedNodeId: harmonySelectedNode, selectedPair: harmonySelectedPair, activeView: harmonyView, trail: harmonyTrail });
  harmonyOutput.innerHTML = chords;
}

function handleHarmonyClick(event) {
  const node = event.target.closest("[data-harmony-node]");
  const transition = event.target.closest("[data-harmony-transition]");
  const view = event.target.closest("[data-harmony-view]");
  if (view) { harmonyView = view.dataset.harmonyView; renderHarmony(); return; }
  if (event.target.closest("[data-harmony-play]")) { playHarmonyTrail(); return; }
  if (event.target.closest("[data-harmony-undo]")) {
    harmonyTrail = harmonyTrail.slice(0, -1);
    harmonySelectedNode = harmonyTrail.at(-1) ?? null;
    harmonySelectedPair = null;
    renderHarmony();
    return;
  }
  if (event.target.closest("[data-harmony-reset]")) { stopHarmonyTrailPlayback(); harmonyTrail = []; harmonySelectedPair = null; harmonySelectedNode = null; renderHarmony(); return; }
  if (transition) {
    const [source, destination] = transition.dataset.harmonyTransition.split("|");
    harmonySelectedPair = { source, destination };
    harmonySelectedNode = destination;
    if (harmonyTrail.at(-1) !== source) harmonyTrail.push(source);
    if (harmonyTrail.at(-1) !== destination) harmonyTrail.push(destination);
    const chords = generateDiatonicChords(state.key, state.scale, state.harmonySevenths);
    playHarmonyChord(chords.find((chord) => chord.id === destination));
    renderHarmony();
    return;
  }
  if (node) {
    harmonySelectedNode = node.dataset.harmonyNode;
    harmonySelectedPair = null;
    if (harmonyTrail.at(-1) !== harmonySelectedNode) harmonyTrail.push(harmonySelectedNode);
    const chords = generateDiatonicChords(state.key, state.scale, state.harmonySevenths);
    playHarmonyChord(chords.find((chord) => chord.id === harmonySelectedNode));
    renderHarmony();
  }
}

function renderMetronome() {
  metronomeOutput.innerHTML = renderMetronomeOutput({ beat: metronomeBeat, numerator: state.metronomeNumerator, running: metronome.running, error: metronomeError });
}

async function startMetronome() {
  metronomeError = "";
  metronomeBeat = 0;
  try {
    await metronome.start({ bpm: state.metronomeBpm, numerator: state.metronomeNumerator, denominator: state.metronomeDenominator, firstBeatAccent: state.metronomeFirstAccent, oddBeatAccent: state.metronomeOddAccent });
  } catch (error) {
    metronomeError = error.message || "Unable to start metronome";
  }
  renderMetronome();
}

function stopMetronome() {
  metronome.stop();
  metronomeBeat = 0;
  renderMetronome();
}

function validMetronomeBpm(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 30 && number <= 300;
}

function validMetronomeNumerator(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 12;
}

function renderTuner(tuning) {
  const targets = selectTunerTargets({ mode: state.tunerMode, tuning });
  tunerOutput.innerHTML = renderTunerOutput({
    mode: state.tunerMode,
    running: tunerLifecycle.session?.state === "running",
    reading: tunerReading,
    targets,
    error: tunerError
  });
  tunerStart.disabled = tunerLifecycle.session?.state === "running";
  tunerStop.disabled = tunerLifecycle.session?.state !== "running";
}

async function loadInputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
  const current = tunerInputDevice.value;
  tunerInputDevice.replaceChildren(new Option("Default microphone", ""), ...devices
    .filter((device) => device.kind === "audioinput")
    .map((device, index) => new Option(device.label || `Microphone ${index + 1}`, device.deviceId)));
  tunerInputDevice.value = [...tunerInputDevice.options].some((option) => option.value === current) ? current : "";
}

function createMicrophoneSession() {
  const selectedDevice = tunerInputDevice.value;
  const getUserMedia = (constraints) => navigator.mediaDevices.getUserMedia(selectedDevice
    ? { ...constraints, audio: { deviceId: { exact: selectedDevice } } }
    : constraints);
  return new MicrophoneSession({ getUserMedia });
}

async function startTuner() {
  resetTunerState();
  await tunerLifecycle.start();
}

async function handleTunerInputDeviceChange() {
  const restart = state.view === "tuner" && Boolean(tunerLifecycle.session);
  resetTunerState();
  if (restart) await tunerLifecycle.restart();
  render();
}

function resetTunerState() {
  if (tunerAnimationFrame !== null) cancelAnimationFrame(tunerAnimationFrame);
  tunerAnimationFrame = null;
  tunerError = "";
  tunerReading = null;
  tunerStabilizer = new PitchStabilizer();
}

async function stopTuner() {
  resetTunerState();
  await tunerLifecycle.stop();
  render();
}

async function handleVisibilityChange() {
  if (document.hidden) {
    if (tunerAnimationFrame !== null) cancelAnimationFrame(tunerAnimationFrame);
    tunerAnimationFrame = null;
    await tunerLifecycle.session?.suspend();
    await metronome.suspend();
    return;
  }
  if (tunerLifecycle.session?.state === "running") {
    await tunerLifecycle.session.resume();
    readTunerFrame();
  }
  await metronome.resume();
}

function readTunerFrame(session = tunerLifecycle.session) {
  if (tunerLifecycle.session !== session || session?.state !== "running") return;
  const estimate = tunerStabilizer.update(estimatePitch(session.readFrame(), { sampleRate: session.sampleRate }));
  if (!estimate.isSilent && estimate.frequency && estimate.stable) tunerReading = tunerReadingFromFrequency(estimate.frequency);
  render();
  tunerAnimationFrame = requestAnimationFrame(() => readTunerFrame(session));
}

function tunerReadingFromFrequency(frequency) {
  const tuning = tunings.find((item) => item.id === state.tuning) || tunings[0];
  const target = selectTunerTarget({ frequency, mode: state.tunerMode, tuning, a4: state.tunerA4 });
  const cents = target.cents;
  return {
    note: target.note || target.pitch,
    frequency,
    cents,
    status: Math.abs(cents) <= 5 ? "In tune" : cents < 0 ? "Tune up" : "Tune down"
  };
}
