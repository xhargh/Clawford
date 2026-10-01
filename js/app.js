import { renderChordBoardWithShape, renderScaleBoard } from "./fretboard-renderer.js";
import { generateNotes } from "./mapping.js";
import { renderNotation } from "./notation-renderer.js";
import { CHORD_QUALITIES, findChordVoicing, generateChordBoardNotes, getChordQuality, hasChordVoicing } from "./chords.js";
import { INSTRUMENTS, getFretboardFrets, getInstrument } from "./instruments.js";
import { CHROMATIC_SCALE, KEYS, SCALES, getKey, getScale, keySignatureFor } from "./scales.js";
import { stateFromSources, stateToSearchParams, updateSettings } from "./state.js";
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
import { viewControlHidden, viewControlVisibility } from "./view-controls.js";
import { TunerLifecycle } from "./tuner-lifecycle.js";
import { isTapTempoShortcut, TPM_MAX, TPM_MIN, Metronome } from "./metronome.js";
import { renderMetronomeOutput } from "./metronome-renderer.js";
import { TapTempo } from "./tap-tempo.js";
import { FUN_FACTS, funFactPresentation } from "./fun-facts.js";
import { createEarTrainingSession, PitchAnswerGate } from "./ear-training.js";
import { renderEarTrainingOutput } from "./ear-training-renderer.js";
import { midiToPitch, pitchToMidi } from "./pitch.js";
import { PATTERNS, PRESET_PROGRESSIONS, actionsForInstrument, bassNoteForChord, beatsPerMeasure, chordNotesFromShape, customPatternFamily, cyclePatternStep, meterStepCount, parseChordSymbol, patternForInstrument, patternNoteIndexes, patternNoteVelocity, patternPlaybackProfile, playAlongPosition, playAlongSubdivisionSchedule, playAlongTickState, progressionLabel, resolveProgression, stepsPerBeat } from "./play-along.js";
import { renderPlayAlongOutput } from "./play-along-renderer.js";
import { getChordShapes, getPreferredChordShape } from "./chord-shapes.js";

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
const earTrainingOutput = document.querySelector("#ear-training-output");
const playAlongOutput = document.querySelector("#play-along-output");
const funFactImage = document.querySelector("#fun-fact-image");
const funFactPreview = document.querySelector("#fun-fact-preview");
const warningBanner = document.querySelector("#warning-banner");
const tunerControls = document.querySelector("#tuner-controls");
const metronomeControls = document.querySelector("#metronome-controls");
const earTrainingControls = document.querySelector("#ear-training-controls");
const earTrainingHeading = document.querySelector("#ear-training-heading");
const earExerciseControl = document.querySelector("#ear-exercise-control");
const earVariantControl = document.querySelector("#ear-variant-control");
const playAlongControls = document.querySelector("#play-along-controls");
const generalControls = document.querySelector("#general-controls");
const metronomeTpmValue = document.querySelector("#metronome-tpm-value");
const metronomeTicksValue = document.querySelector("#metronome-ticks-value");
const tunerInputDevice = document.querySelector("#tuner-input-device");
const tunerStart = document.querySelector("#tuner-start");
const tunerStop = document.querySelector("#tuner-stop");
const playAlongProgression = document.querySelector("#play-along-progression");
const playAlongPattern = document.querySelector("#play-along-pattern");
const playAlongBpm = document.querySelector("#play-along-bpm");
const playAlongBpmValue = document.querySelector("#play-along-bpm-value");
const playAlongTechniqueControl = document.querySelector("#play-along-technique-control");
const playAlongTechniqueSelect = document.querySelector("#play-along-technique");
const playAlongMeterControl = document.querySelector("#play-along-meter-control");
const playAlongMeterSelect = document.querySelector("#play-along-meter");
const fretboardModeControl = document.querySelector("#fretboard-mode-control");
const fretboardShapeSelectControl = document.querySelector("#fretboard-shape-select-control");
const fretboardShapeSelect = document.querySelector("#fretboard-shape-select");
const tunings = [...BUILT_IN_TUNINGS];
const FRETBOARD_SCALES = [...SCALES, CHROMATIC_SCALE];
const scaleOptionValue = (scale) => `scale:${scale.id}`;

function tuningsFor(instrumentId) {
  return tunings.filter((tuning) => tuning.instrument === instrumentId);
}

populateSelect(instrumentSelect, INSTRUMENTS.map((instrument) => ({ value: instrument.id, label: instrument.name })));
populateSelect(keySelect, KEYS.map((key) => ({ value: key.value, label: key.label })));
populateSelect(scaleSelect, SCALES.map((scale) => ({ value: scale.id, label: scale.name })));
populateSelect(chordRootSelect, KEYS.map((key) => ({ value: key.value, label: key.label })));
populateFretboardPatterns();

const validSettings = {
  instruments: INSTRUMENTS.map((instrument) => instrument.id),
  tunings: tunings.map((tuning) => tuning.id),
  keys: KEYS.map((key) => key.value),
  scales: SCALES.map((scale) => scale.id),
  chordRoots: KEYS.map((key) => key.value),
  chordQualities: [...CHORD_QUALITIES.map((quality) => quality.id), ...FRETBOARD_SCALES.map(scaleOptionValue)]
};
let state = stateFromSources(loadStoredState(), new URLSearchParams(location.search), validSettings);
let sharedAudioContext = null;
let audioPlayer = createAudioPlayer(state.instrument);
let selectedFretsByString = new Map();
let selectedTonesByString = new Map();
let fretboardSelectionKey = "";
let fretboardShapeSelectionKey = "";
let fretboardShapeId = "";
let fretboardShapeEdited = false;
let strumGesture = null;
let suppressClicksUntil = 0;
let tunerAnimationFrame = null;
let tunerStabilizer = new PitchStabilizer();
let tunerReading = null;
let tunerAudioRms = 0;
let tunerError = "";
let metronomeBeat = 0;
let metronomeError = "";
let earTrainingEngine = null;
let earTrainingSession = null;
let earTrainingGate = null;
let earTrainingStabilizer = null;
let earTrainingAnimationFrame = null;
let earTrainingPlaybackUntil = 0;
let earTrainingStatus = "Ready";
let earTrainingError = "";
let earTrainingRunToken = 0;
let earTrainingDetectedMidi = null;
let tapBpm = null;
let currentFunFact = -1;
let funFactsActive = false;
let funFactHoverTimer = null;
let playAlongPatternFamily = "strum";
let playAlongTechnique = "clawhammer";
let playAlongSteps = [...PATTERNS[2].steps];
let playAlongTargets = [...(PATTERNS[2].targets || [])];
let playAlongAccents = [...(PATTERNS[2].accents || [])];
let playAlongPatternName = PATTERNS[2].name;
let playAlongMeter = PATTERNS[2].meter;
let playAlongSubdivision = PATTERNS[2].subdivision;
let playAlongGrouping = PATTERNS[2].grouping || [];
let playAlongProgressionId = PRESET_PROGRESSIONS[0].id;
let playAlongBpmSetting = 90;
let playAlongTick = 0;
let playAlongVisualTick = -1;
let playAlongClockTick = 0;
let playAlongScheduledBeat = 0;
let playAlongVisualGeneration = 0;
let playAlongVisualTimers = [];
let playAlongPhase = "idle";
let playAlongLoop = true;
let playAlongError = "";
let playAlongStartGeneration = 0;
const metronome = new Metronome({
  createAudioContext: createSharedAudioContext,
  closeAudioContext: false,
  onSchedule: ({ time, currentTime }) => {
    if (state.view !== "play-along") return;
    const countInBeats = beatsPerMeasure(playAlongMeter);
    const scheduledBeat = playAlongScheduledBeat++;
    if (scheduledBeat < countInBeats) return;
    const beatTick = scheduledBeat - countInBeats;
    const stepCount = stepsPerBeat(playAlongMeter, playAlongSubdivision);
    const subdivisionDuration = 60 / playAlongBpmSetting / stepCount;
    for (const { tick, delay } of playAlongSubdivisionSchedule(beatTick, stepCount, subdivisionDuration)) {
      const stepTime = time + delay;
      playAlongAudioStep(stepTime, tick, subdivisionDuration);
      const generation = playAlongVisualGeneration;
      const visualDelay = Math.max(0, (stepTime - currentTime) * 1000);
      playAlongVisualTimers.push(window.setTimeout(() => {
        if (generation !== playAlongVisualGeneration || state.view !== "play-along" || tick <= playAlongVisualTick) return;
        playAlongVisualTick = tick;
        playAlongTick = tick;
        renderPlayAlong();
      }, visualDelay));
    }
  },
  onBeat: ({ index: beat }) => {
  if (state.view === "play-along") {
    const wasCountIn = playAlongPhase === "count-in";
    playAlongClockTick += 1;
    const tickState = playAlongTickState(playAlongClockTick - 1, playAlongMeter);
    playAlongPhase = tickState.phase;
    if (playAlongPhase === "count-in") playAlongTick = tickState.tick;
    if (wasCountIn && playAlongPhase === "playing") metronome.setMuted(true);
    renderPlayAlong();
  } else {
    metronomeBeat = beat;
    renderMetronomeBeat();
  }
} });
const tapTempo = new TapTempo();
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
syncPlayAlongPatternOptions();
syncPlayAlongProgressionOptions();
writeForm(state);

let fitScheduled = false;
persistSettings();
render();
window.setTimeout(() => {
  funFactsActive = true;
  showRandomFunFact();
  window.setInterval(showRandomFunFact, 60_000);
}, 60_000);
if (state.view === "tuner") {
  void loadInputDevices();
  void tunerLifecycle.enter();
}

form.addEventListener("input", updateFromForm);
document.querySelector("#tool-navigation").addEventListener("input", updateFromForm);
fretboardShapeSelect.addEventListener("change", () => { fretboardShapeId = fretboardShapeSelect.value; fretboardShapeEdited = false; render(); });
document.addEventListener("keydown", (event) => {
  if (!isTapTempoShortcut(event, state.view)) return;
  event.preventDefault();
  tapMetronome();
});
tunerInputDevice.addEventListener("change", handleTunerInputDeviceChange);
tunerStart.addEventListener("click", startTuner);
tunerStop.addEventListener("click", () => { void stopTuner(); });
earTrainingOutput.addEventListener("click", (event) => {
  if (event.target.closest("#ear-training-start")) void startEarTraining();
  if (event.target.closest("#ear-training-stop")) void stopEarTraining();
});
playAlongOutput.addEventListener("pointerdown", (event) => {
  if (!event.target.closest("#play-along-stop")) return;
  stopPlayAlong();
});
playAlongOutput.addEventListener("click", handlePlayAlongClick);
tunerOutput.addEventListener("pointerdown", handleTunerTargetPointerdown);
tunerOutput.addEventListener("click", handleTunerTargetClick);
tunerOutput.addEventListener("keydown", handleTunerTargetKeydown);
metronomeOutput.addEventListener("click", (event) => {
  if (event.target.closest("[data-tick-index]")) cycleMetronomeTick(Number(event.target.closest("[data-tick-index]").dataset.tickIndex));
  if (event.target.closest("#metronome-start")) void startMetronome();
  if (event.target.closest("#metronome-stop")) stopMetronome();
  if (event.target.closest("#tap-tempo-button")) tapMetronome();
  if (event.target.closest("#tap-tempo-reset")) resetTapTempo();
});
playAlongControls.addEventListener("input", handlePlayAlongControls);
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
window.addEventListener("pagehide", () => { void stopTuner(); stopMetronome(); stopPlayAlong(); void stopEarTraining(); });
document.addEventListener("visibilitychange", handleVisibilityChange);

function createAudioPlayer(instrumentId) {
  return new AudioPlayer({
    profile: instrumentId.startsWith("banjo") ? BANJO_PROFILE : GUITAR_PROFILE,
    createAudioContext: createSharedAudioContext,
    closeAudioContext: false
  });
}

function createSharedAudioContext() {
  if (sharedAudioContext) return sharedAudioContext;
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  sharedAudioContext = Context ? new Context() : null;
  return sharedAudioContext;
}

function showRandomFunFact() {
  if (!funFactsActive) return;
  let next = Math.floor(Math.random() * FUN_FACTS.length);
  if (FUN_FACTS.length > 1) {
    while (next === currentFunFact) next = Math.floor(Math.random() * FUN_FACTS.length);
  }
  currentFunFact = next;
  const presentation = funFactPresentation(next);
  funFactImage.querySelector("img").src = presentation.image;
  funFactImage.querySelector("img").alt = `Clawford fact ${next + 1}`;
  warningBanner.textContent = presentation.text;
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

function handleTunerTargetClick(event) {
  if (event.detail > 0) return;
  const target = event.target.closest(".string-button");
  if (target) playNotes([noteFromElement(target)]);
}

function handleTunerTargetPointerdown(event) {
  if (!event.isPrimary || event.button !== 0) return;
  const target = event.target.closest(".string-button");
  if (target) playNotes([noteFromElement(target)]);
}

function handleTunerTargetKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = event.target.closest(".string-button");
  if (!target) return;
  event.preventDefault();
  playNotes([noteFromElement(target)]);
}

function selectAndPlayFretboardTone(element) {
  const note = noteFromElement(element);
  selectedFretsByString = selectTone(selectedFretsByString, note.string, Number(element.dataset.fret));
  if (state.fretboardMode === "shape") fretboardShapeEdited = true;
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
  const next = updateSettings(state, Object.fromEntries(data), validSettings, tunings);
  const instrument = next.instrument;
  const instrumentChanged = instrument !== state.instrument;
  const earSettingsChanged = ["instrument", "tuning", "key", "scale", "earExercise", "earVariant", "earSequenceLimit"]
    .some((key) => next[key] !== state[key]);
  state = next;
  persistSettings();
  if (instrumentChanged) {
    void audioPlayer.dispose();
    audioPlayer = createAudioPlayer(instrument);
    populateSelect(tuningSelect, tuningsFor(instrument).map((item) => ({ value: item.id, label: `${item.name} (${item.shortName})` })));
    syncPlayAlongPatternOptions();
    writeForm(state);
  }
  if (previousView === "tuner" && state.view !== "tuner") void stopTuner();
  if (previousView === "metronome" && state.view !== "metronome") stopMetronome();
  if (previousView === "play-along" && state.view !== "play-along") stopPlayAlong();
  if (previousView === "ear-training" && state.view !== "ear-training") void stopEarTraining();
  if (state.view === "ear-training" && earSettingsChanged && earTrainingSession) void stopEarTraining();
  if (previousView !== "tuner" && state.view === "tuner") {
    void loadInputDevices();
    void tunerLifecycle.enter();
  }
  render();
  if (state.view === "metronome" && metronome.running) {
    const metronomeChanged = ["metronomeTpm", "metronomeTicks", "metronomePattern"]
      .filter((key) => state[key] !== previousMetronome[key]);
    if (metronomeChanged.length === 1 && metronomeChanged[0] === "metronomeTpm") metronome.updateTpm(state.metronomeTpm);
    else if (metronomeChanged.length > 0) void startMetronome();
  }
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
  const view = {
    notation: ["Notation", "Select a note to hear it. Explore where it lives on each string."],
    fretboard: ["Fretboard", "Select tones to build a shape, or swipe across the strings to strum."],
    tuner: ["Tuner", "Listen to your instrument. In Strings mode, select an open string to hear its reference pitch."],
    metronome: ["Metronome", "Find your pulse. Tap a beat to change its accent, or tap along to set the tempo."],
    "ear-training": ["Ear training", "Listen, then find the note on your instrument or the fretboard below."],
    "play-along": ["Play along", ""]
  }[state.view];
  document.querySelector("#workspace-title").textContent = view[0];
  document.querySelector("#workspace-hint").textContent = view[1];
  const tuning = tunings.find((item) => item.id === state.tuning) || tunings[0];
  const instrument = getInstrument(tuning.instrument) || getInstrument(state.instrument);
  const fretboardFrets = getFretboardFrets(instrument.id);
  const key = getKey(state.key);
  const scale = getScale(state.scale);
  const chordRoot = getKey(state.chordRoot);
  const scaleId = state.chordQuality.startsWith("scale:") ? state.chordQuality.slice(6) : null;
  const fretboardScale = scaleId ? FRETBOARD_SCALES.find((item) => item.id === scaleId) : null;
  const chordQuality = scaleId ? null : CHORD_QUALITIES.find((quality) => quality.id === state.chordQuality);
  const title = `${instrument.name} — ${tuning.name} — ${key.value} ${scale.name} — Frets 0–${state.maxFret}`;
  const fretboardTitle = `${instrument.name} — ${tuning.name}`;
  const notes = generateNotes({ ...state, tuning, key, scale });
  updateChordOptionAvailability(tuning);
  const nextSelectionKey = `${tuning.id}:${chordRoot.pitchClass}:${state.chordQuality}:${state.fretboardMode}`;
  const importedShapes = chordQuality ? getChordShapes({ instrumentId: instrument.id, tuning, rootPitchClass: chordRoot.pitchClass, qualityId: chordQuality.id }) : [];
  const selectionChanged = nextSelectionKey !== fretboardSelectionKey;
  if (nextSelectionKey !== fretboardSelectionKey) {
    if (fretboardScale) {
      selectedFretsByString = new Map();
    } else {
      const initialBoard = generateChordBoardNotes(tuning, chordRoot.pitchClass, chordQuality.id);
      selectedFretsByString = selectedFretsFromVoicing(initialBoard.voicing);
    }
    fretboardSelectionKey = nextSelectionKey;
  }
  const shapeKey = `${nextSelectionKey}:${importedShapes.length}`;
  if (shapeKey !== fretboardShapeSelectionKey) {
    fretboardShapeId = "";
    fretboardShapeEdited = false;
    fretboardShapeSelectionKey = shapeKey;
  }
  const selectedShape = importedShapes.find((shape) => shape.id === fretboardShapeId) || importedShapes[0] || null;
  fretboardShapeId = selectedShape?.id || "";
  fretboardShapeSelect.replaceChildren(...importedShapes.map((shape, index) => new Option(`${shape.tags.includes("open") ? "Open" : "Alternate"} ${index + 1}${shape.tags.includes("preferred") ? " · preferred" : ""}`, shape.id)));
  fretboardShapeSelect.value = fretboardShapeId;
  const importedShape = state.fretboardMode === "shape" && !fretboardShapeEdited ? selectedShape : null;
  if (importedShape && selectionChanged) selectedFretsByString = selectedFretsFromShape(importedShape, tuning);
  const fretboardBoard = fretboardScale
    ? generateScaleBoardNotes(tuning, chordRoot, fretboardScale, { displayMaxFret: fretboardFrets, selectedFretsByString })
    : generateChordBoardNotes(tuning, chordRoot.pitchClass, chordQuality.id, { minDisplayFret: fretboardFrets, selectedFretsByString });
  selectedTonesByString = importedShape ? selectedToneMap(fretboardBoard, importedShape, tuning) : new Map(fretboardBoard.tones.filter((tone) => tone.isSelected).map((tone) => [tone.string, tone]));

  notationOutput.replaceChildren(renderNotation(notes, title, { ...state, tuning, keySignature: keySignatureFor(key, scale), clef: instrument.clef }));
  fretboardOutput.replaceChildren(fretboardScale
    ? renderScaleBoard(fretboardBoard, fretboardTitle, tuning, chordRoot, fretboardScale)
     : renderChordBoardWithShape(fretboardBoard, fretboardTitle, tuning, chordRoot, chordQuality, importedShape));
  const hiddenControls = viewControlHidden(state.view);
  generalControls.hidden = !viewControlVisibility(state.view).instrument;
  notationOutput.hidden = hiddenControls.notationOutput;
  fretboardOutput.hidden = hiddenControls.fretboardOutput;
  tunerOutput.hidden = hiddenControls.tunerOutput;
  metronomeOutput.hidden = hiddenControls.metronomeOutput;
  earTrainingOutput.hidden = hiddenControls.earTrainingOutput;
  playAlongOutput.hidden = hiddenControls.playAlongOutput;
  tunerControls.hidden = hiddenControls.tunerControls;
  metronomeControls.hidden = hiddenControls.metronomeControls;
  earTrainingControls.hidden = hiddenControls.earTrainingControls;
  const earTrainingComponentCount = [earExerciseControl, earVariantControl].filter((control) => control.querySelector("select").options.length > 1).length;
  earTrainingHeading.hidden = earTrainingComponentCount === 0;
  earExerciseControl.hidden = earExerciseControl.querySelector("select").options.length <= 1;
  earVariantControl.hidden = earVariantControl.querySelector("select").options.length <= 1;
  playAlongControls.hidden = hiddenControls.playAlongControls;
  fretboardModeControl.hidden = state.view !== "fretboard" || Boolean(fretboardScale);
  fretboardShapeSelectControl.hidden = state.view !== "fretboard" || state.fretboardMode !== "shape" || importedShapes.length < 2;
  metronomeTpmValue.value = state.metronomeTpm;
  metronomeTpmValue.textContent = state.metronomeTpm;
  metronomeTicksValue.value = state.metronomeTicks;
  metronomeTicksValue.textContent = state.metronomeTicks;
  document.querySelector("#chord-root-control").hidden = hiddenControls.chordRoot;
  document.querySelector("#chord-quality-control").hidden = hiddenControls.chordQuality;
  document.querySelector("#instrument-control").hidden = hiddenControls.instrument;
  document.querySelector("#tuning-control").hidden = hiddenControls.tuning;
  document.querySelector("#key-control").hidden = hiddenControls.key;
  document.querySelector("#scale-control").hidden = hiddenControls.scale;
  document.title = `${view[0]} — Clawford`;
  renderTuner(tuning);
  renderMetronome();
  renderPlayAlong();
  renderEarTraining(tuning);
  scheduleDiagramFit();
}

function persistSettings() {
  saveStoredState(state);
  const query = stateToSearchParams(state).toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
}

function selectedFretsFromShape(shape, tuning) {
  const strings = tuning.strings.filter((string) => string.kind !== "drone");
  if (shape.stringOrder !== "tuning") strings.sort((a, b) => pitchToMidi(a.pitch) - pitchToMidi(b.pitch));
  return new Map(strings.map((string, index) => [string.number, shape.frets[index]]).filter(([, fret]) => fret >= 0));
}

function selectedToneMap(board, shape, tuning) {
  const selected = selectedFretsFromShape(shape, tuning);
  return new Map([...selected.entries()].map(([string, fret]) => [string, board.tones.find((tone) => tone.string === string && tone.fret === fret)]).filter(([, tone]) => tone));
}

function renderMetronome() {
  metronomeOutput.innerHTML = renderMetronomeOutput({ beat: metronomeBeat, tpm: state.metronomeTpm, pattern: state.metronomePattern, running: metronome.running, tapBpm, error: metronomeError });
}

function renderPlayAlong() {
  syncPlayAlongProgressionOptions();
  const progression = PRESET_PROGRESSIONS.find(({ id }) => id === playAlongProgressionId) || PRESET_PROGRESSIONS[0];
  const chords = resolveProgression(progression, state.key);
  const position = playAlongPosition(playAlongTick, chords.length, playAlongSteps.length, playAlongMeter, playAlongSubdivision);
  const playAlongTuning = tunings.find((item) => item.id === state.tuning) || tunings[0];
  const currentChord = parseChordSymbol(chords[position.chordIndex] || chords[0]);
  const playAlongShape = getPreferredChordShape({ instrumentId: state.instrument, tuning: playAlongTuning, rootPitchClass: getKey(currentChord.root).pitchClass, qualityId: currentChord.quality });
  playAlongBpmValue.value = playAlongBpmSetting;
  playAlongBpmValue.textContent = playAlongBpmSetting;
  playAlongOutput.innerHTML = renderPlayAlongOutput({
    chords,
    pattern: playAlongSteps,
    patternName: playAlongPatternName,
    bpm: playAlongBpmSetting,
    position,
    running: metronome.running && state.view === "play-along",
    phase: playAlongPhase,
    countIn: playAlongPhase === "count-in" ? Math.max(1, beatsPerMeasure(playAlongMeter) - playAlongClockTick) : 0,
    loop: playAlongLoop,
    custom: playAlongPattern.value === "custom",
    actions: actionsForInstrument(playAlongPatternFamily),
    meter: playAlongMeter,
    subdivision: playAlongSubdivision,
    grouping: playAlongGrouping,
    shape: playAlongShape,
    tuning: playAlongTuning,
    error: playAlongError
  });
  playAlongTechniqueControl.hidden = state.instrument !== "banjo5" || playAlongPattern.value !== "custom";
  playAlongMeterControl.hidden = playAlongPattern.value !== "custom";
}

function syncPlayAlongProgressionOptions() {
  const selected = playAlongProgressionId;
  playAlongProgression.replaceChildren(...PRESET_PROGRESSIONS.map((progression) => new Option(progressionLabel(progression, state.key), progression.id)));
  playAlongProgressionId = PRESET_PROGRESSIONS.some(({ id }) => id === selected) ? selected : PRESET_PROGRESSIONS[0].id;
  playAlongProgression.value = playAlongProgressionId;
}

function syncPlayAlongPatternOptions() {
  const available = patternForInstrument(state.instrument);
  const selected = playAlongPattern.value;
  const defaults = new Set({
    banjo5: ["clawhammer-bum-ditty-2-4", "clawhammer-double-thumb", "clawhammer-waltz", "roll-forward", "roll-alternating", "roll-forward-reverse", "roll-foggy-mountain"],
    banjo4: ["banjo4-four-bar", "banjo4-eighths", "banjo4-swing-four", "banjo4-charleston", "banjo4-waltz", "banjo4-6-8"],
    guitar: ["guitar-quarter-downs", "guitar-eighths", "guitar-folk-pop", "guitar-boom-chuck", "guitar-waltz", "guitar-ballad-6-8", "guitar-shuffle-12-8"],
    ukulele: ["ukulele-downs", "ukulele-eighths", "ukulele-island", "ukulele-driving", "ukulele-chunk", "ukulele-waltz", "ukulele-rocking-6-8"],
    mandolin: ["mandolin-quarter", "mandolin-eighths", "mandolin-chop", "mandolin-boom-chuck", "mandolin-waltz-boom", "mandolin-waltz-chop", "mandolin-jig"],
    bass: ["bass-quarter-roots", "bass-eighth-roots", "bass-root-fifth", "bass-root-octave", "bass-root-5-8-5", "bass-waltz-movement", "bass-6-8"]
  }[state.instrument] || []);
  const optionFor = (pattern) => new Option(`${pattern.name} · ${pattern.meter.numerator}/${pattern.meter.denominator}`, pattern.id);
  const defaultOrder = [...defaults];
  const defaultPatterns = available.filter((pattern) => defaults.has(pattern.id)).sort((a, b) => defaultOrder.indexOf(a.id) - defaultOrder.indexOf(b.id));
  const additionalPatterns = available.filter((pattern) => !defaults.has(pattern.id));
  const defaultGroup = document.createElement("optgroup");
  defaultGroup.label = "Recommended";
  defaultGroup.append(...defaultPatterns.map(optionFor));
  const additionalGroup = document.createElement("optgroup");
  additionalGroup.label = "More patterns";
  additionalGroup.append(...additionalPatterns.map(optionFor));
  playAlongPattern.replaceChildren(defaultGroup, additionalGroup, new Option("Custom pattern", "custom"));
  playAlongPattern.value = [...playAlongPattern.options].some((option) => option.value === selected) ? selected : available[0]?.id || "custom";
  const preset = PATTERNS.find((pattern) => pattern.id === playAlongPattern.value);
  if (preset) {
    playAlongPatternFamily = preset.instrument;
    playAlongSteps = [...preset.steps];
    playAlongTargets = [...(preset.targets || [])];
    playAlongAccents = [...(preset.accents || [])];
    playAlongPatternName = preset.name;
    playAlongMeter = preset.meter;
    playAlongSubdivision = preset.subdivision;
    playAlongGrouping = preset.grouping || [];
  } else {
    playAlongPatternFamily = customFamilyForInstrument(state.instrument);
    const actions = actionsForInstrument(playAlongPatternFamily);
    playAlongSteps = playAlongSteps.map((step) => actions.includes(step) ? step : "-");
    playAlongMeterSelect.value = `${playAlongMeter.numerator}/${playAlongMeter.denominator}`;
  }
}

function customFamilyForInstrument(instrument) {
  return customPatternFamily(instrument, playAlongTechnique);
}

function setCustomMeter(value) {
  const [numerator, denominator] = value.split("/").map(Number);
  playAlongMeter = { numerator, denominator };
  playAlongMeterSelect.value = value;
  playAlongSubdivision = denominator === 8 ? 3 : 2;
  playAlongSteps = Array.from({ length: meterStepCount(playAlongMeter, playAlongSubdivision) }, () => "-");
  playAlongTargets = [];
  playAlongAccents = [];
  playAlongGrouping = denominator === 8 ? Array.from({ length: numerator / 3 }, () => 3) : numerator === 3 ? [2, 2, 2] : [];
}

function handlePlayAlongControls(event) {
  if (event.target === playAlongProgression) playAlongProgressionId = playAlongProgression.value;
  if (event.target === playAlongBpm) {
    playAlongBpmSetting = Number(playAlongBpm.value);
    if (metronome.running) metronome.updateTpm(playAlongBpmSetting);
  }
  if (event.target === playAlongTechniqueSelect) {
    playAlongTechnique = playAlongTechniqueSelect.value;
    if (playAlongPattern.value === "custom") {
      playAlongPatternFamily = customFamilyForInstrument(state.instrument);
      const actions = actionsForInstrument(playAlongPatternFamily);
      playAlongSteps = playAlongSteps.map((step) => actions.includes(step) ? step : "-");
    }
  }
  if (event.target === playAlongMeterSelect && playAlongPattern.value === "custom") setCustomMeter(playAlongMeterSelect.value);
  if (event.target === playAlongPattern) {
    const preset = PATTERNS.find((pattern) => pattern.id === playAlongPattern.value);
    if (preset) {
      playAlongPatternFamily = preset.instrument;
      playAlongSteps = [...preset.steps];
      playAlongTargets = [...(preset.targets || [])];
      playAlongAccents = [...(preset.accents || [])];
      playAlongPatternName = preset.name;
      playAlongMeter = preset.meter;
      playAlongSubdivision = preset.subdivision;
      playAlongGrouping = preset.grouping || [];
    } else {
      playAlongPatternName = "Custom pattern";
      setCustomMeter("4/4");
      playAlongPatternFamily = customFamilyForInstrument(state.instrument);
    }
  }
  renderPlayAlong();
}

function handlePlayAlongClick(event) {
  const step = event.target.closest("[data-pattern-step]");
  if (step && playAlongPattern.value === "custom") {
    const index = Number(step.dataset.patternStep);
    playAlongSteps[index] = cyclePatternStep(playAlongSteps[index], playAlongPatternFamily);
    renderPlayAlong();
    return;
  }
  if (event.target.closest("#play-along-start")) void startPlayAlong();
  if (event.target.closest("#play-along-stop")) {
    stopPlayAlong();
  }
  if (event.target.closest("#play-along-loop")) {
    playAlongLoop = event.target.checked;
    renderPlayAlong();
  }
}

async function startPlayAlong() {
  const generation = ++playAlongStartGeneration;
  playAlongError = "";
  audioPlayer.stopAll();
  clearPlayAlongVisualTimers();
  playAlongVisualGeneration += 1;
  playAlongTick = 0;
  playAlongVisualTick = -1;
  playAlongClockTick = 0;
  playAlongScheduledBeat = 0;
  playAlongPhase = "count-in";
  playAlongLoop = playAlongOutput.querySelector("#play-along-loop")?.checked ?? playAlongLoop;
  try {
    await audioPlayer.warmUp();
    if (generation !== playAlongStartGeneration) return;
    metronome.setMuted(false);
    await metronome.start({ tpm: playAlongBpmSetting, pattern: `A${"N".repeat(Math.max(0, beatsPerMeasure(playAlongMeter) - 1))}` });
    if (generation !== playAlongStartGeneration) {
      metronome.stop();
      return;
    }
  } catch (error) {
    playAlongError = error.message || "Unable to start play-along";
  }
  renderPlayAlong();
}

function stopPlayAlong() {
  playAlongStartGeneration += 1;
  metronome.stop();
  audioPlayer.stopAll();
  clearPlayAlongVisualTimers();
  playAlongVisualGeneration += 1;
  playAlongTick = 0;
  playAlongVisualTick = -1;
  playAlongClockTick = 0;
  playAlongScheduledBeat = 0;
  playAlongPhase = "idle";
  renderPlayAlong();
}

function clearPlayAlongVisualTimers() {
  for (const timer of playAlongVisualTimers) window.clearTimeout(timer);
  playAlongVisualTimers = [];
}

function playAlongAudioStep(when, tick = playAlongTick, stepDuration) {
  const progression = PRESET_PROGRESSIONS.find(({ id }) => id === playAlongProgressionId) || PRESET_PROGRESSIONS[0];
  const chords = resolveProgression(progression, state.key);
  const position = playAlongPosition(tick, chords.length, playAlongSteps.length, playAlongMeter, playAlongSubdivision);
  const chordSymbol = chords[position.chordIndex];
  const tuning = tunings.find((item) => item.id === state.tuning) || tunings[0];
  const chord = chordVoicing(chordSymbol, playAlongPatternFamily !== "strum");
  if (!chord.length) return;
  const action = playAlongSteps[position.stepIndex];
  const targets = playAlongTargets[position.stepIndex];
  if (playAlongPatternFamily === "bass" && action !== "-") {
    const note = bassNoteForChord(chordSymbol, action, tuning);
    const profile = patternPlaybackProfile(action, { stepDuration, noteCount: 1 });
    void audioPlayer.playNotes([{ ...note, velocity: patternNoteVelocity(action, 0, 1, playAlongAccents[position.stepIndex] || 1), duration: profile.duration }], { spread: profile.spread, when });
    return;
  }
  const indexes = patternNoteIndexes(action, playAlongPatternFamily, chord.length, targets, chord);
  const profile = patternPlaybackProfile(action, { stepDuration, noteCount: indexes.length });
  const notes = indexes.map((index, noteIndex) => chord[index]).filter(Boolean).map((note, noteIndex) => ({
    ...note,
    velocity: patternNoteVelocity(action, noteIndex, indexes.length, playAlongAccents[position.stepIndex] || 1),
    duration: profile.duration
  }));
  if (!notes.length) return;
  void audioPlayer.playNotes(notes, { spread: profile.spread, when }).catch((error) => {
    playAlongError = error.message || "Unable to play accompaniment";
    renderPlayAlong();
  });
}

function chordVoicing(symbol, includeDrone = false) {
  const { root, quality: qualityId } = parseChordSymbol(symbol);
  const tuning = tunings.find((item) => item.id === state.tuning) || tunings[0];
  const rootKey = getKey(root);
  const quality = getChordQuality(qualityId);
  const importedShape = getPreferredChordShape({ instrumentId: state.instrument, tuning, rootPitchClass: rootKey.pitchClass, qualityId });
  if (importedShape) return chordNotesFromShape(importedShape, tuning, rootKey.pitchClass, includeDrone);
  const voicing = findChordVoicing(tuning, rootKey.pitchClass, qualityId);
  if (voicing) {
    let rootSeen = false;
    const notes = voicing.notes.map((note) => {
      const midi = pitchToMidi(tuning.strings.find((string) => string.number === note.string).pitch) + note.fret;
      const role = chordRoleForMidi(midi, rootKey.pitchClass, rootSeen);
      if (role === "root") rootSeen = true;
      return { midi, string: note.string, duration: 0.35, role };
    });
    if (includeDrone && tuning.strings.some((string) => string.kind === "drone")) {
      const drone = tuning.strings.find((string) => string.kind === "drone");
      notes.push({ midi: pitchToMidi(drone.pitch), string: drone.number, duration: 0.35, role: chordRoleForMidi(pitchToMidi(drone.pitch), rootKey.pitchClass) });
    }
    return notes.sort((a, b) => a.string - b.string);
  }
  return quality.intervals.map((interval, index) => {
    const midi = pitchToMidi(`${root}3`) + interval;
    return { midi, string: index + 1, duration: 0.35, role: chordRoleForMidi(midi, rootKey.pitchClass) };
  });
}

function chordRoleForMidi(midi, rootPitchClass, rootSeen = false) {
  const interval = (midi - rootPitchClass) % 12;
  if (interval === 0) return rootSeen ? "octave" : "root";
  if (interval === 7) return "fifth";
  return null;
}

function renderEarTraining(tuning) {
  const engineState = earTrainingEngine?.state;
  const target = engineState?.target ? { ...engineState.target, note: midiToDisplayName(engineState.target.midi) } : null;
  earTrainingOutput.innerHTML = renderEarTrainingOutput({
    exercise: state.earExercise,
    variant: state.earVariant,
    running: Boolean(earTrainingSession?.state === "running"),
    status: earTrainingStatus,
    streak: engineState?.streak ?? 0,
    attempts: engineState?.attempts ?? 0,
    sequenceLength: 0,
    sequenceIndex: 0,
    target,
    heard: earTrainingDetectedMidi == null ? "--" : midiToDisplayName(earTrainingDetectedMidi),
    error: earTrainingError
  });
}

function midiToDisplayName(midi) {
  return midiToPitch(midi, state.key === "F" || state.key === "Bb" || state.key === "Eb" ? "flat" : "sharp");
}

function handleEarTrainingBoardInput(event) {
  if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
  const tone = event.target.closest(".ear-training-tone");
  if (!tone || !earTrainingEngine?.state.running || performance.now() < earTrainingPlaybackUntil) return;
  event.preventDefault();
  handleEarTrainingAnswer(Number(tone.dataset.midi), Number(tone.dataset.string));
}

function renderMetronomeBeat() {
  metronomeOutput.querySelectorAll(".metronome-tick").forEach((element, index) => {
    element.classList.toggle("active", metronomeBeat === index + 1);
  });
}

function tapMetronome() {
  const detectedBpm = tapTempo.tap();
  if (!detectedBpm) {
    renderMetronome();
    return;
  }
  tapBpm = detectedBpm;
  const settingTpm = Math.min(TPM_MAX, detectedBpm);
  if (settingTpm >= TPM_MIN) {
    state = { ...state, metronomeTpm: settingTpm };
    writeForm(state);
    if (metronome.running) metronome.updateTpm(settingTpm);
    persistSettings();
  }
  renderMetronome();
}

function resetTapTempo() {
  tapTempo.reset();
  tapBpm = null;
  renderMetronome();
}

async function startMetronome() {
  metronomeError = "";
  metronomeBeat = 0;
  try {
    await metronome.start({ tpm: state.metronomeTpm, pattern: state.metronomePattern });
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

function cycleMetronomeTick(index) {
  const current = state.metronomePattern[index];
  const next = { N: "A", A: "S", S: "N" }[current] || "N";
  const pattern = [...state.metronomePattern];
  pattern[index] = next;
  state = { ...state, metronomePattern: pattern.join("") };
  persistSettings();
  if (metronome.running) void startMetronome();
  else render();
}

function renderTuner(tuning) {
  const targets = selectTunerTargets({ mode: state.tunerMode, tuning });
  tunerOutput.innerHTML = renderTunerOutput({
    mode: state.tunerMode,
    running: tunerLifecycle.session?.state === "running",
    reading: tunerReading,
    audioRms: tunerAudioRms,
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
  return new MicrophoneSession({ getUserMedia, createAudioContext: createSharedAudioContext, closeAudioContext: false });
}

async function startEarTraining() {
  if (earTrainingSession?.state === "running") return;
  const runToken = ++earTrainingRunToken;
  earTrainingError = "";
  earTrainingStatus = "Starting microphone";
  earTrainingDetectedMidi = null;
  render();
  const tuning = tunings.find((item) => item.id === state.tuning) || tunings[0];
  try {
    const key = getKey(state.key);
    const scale = getScale(state.scale);
  earTrainingEngine = createEarTrainingSession({
      exercise: state.earExercise,
      variant: state.earVariant,
      tuning,
      key,
      scale,
      maxFret: 0,
      sequenceLimit: state.earSequenceLimit
    });
    earTrainingGate = new PitchAnswerGate({ windowSize: 3, toleranceCents: 35, a4: state.tunerA4 });
    earTrainingStabilizer = new PitchStabilizer({ windowSize: 3 });
    const event = earTrainingEngine.start();
    earTrainingStatus = "Listen";
    earTrainingPlayback(event);
    try {
      earTrainingSession = createMicrophoneSession();
      await earTrainingSession.start();
      if (runToken !== earTrainingRunToken || state.view !== "ear-training") {
        await earTrainingSession.stop();
        earTrainingSession = null;
        return;
      }
      readEarTrainingFrame(earTrainingSession);
    } catch (error) {
      earTrainingSession = null;
      earTrainingError = `${error.message || "Microphone unavailable"}.`;
      earTrainingStatus = "Microphone unavailable";
    }
    render();
  } catch (error) {
    await earTrainingSession?.stop();
    earTrainingSession = null;
    earTrainingEngine = null;
    earTrainingGate = null;
    earTrainingStabilizer = null;
    earTrainingError = error.message || "Unable to start microphone";
    earTrainingStatus = "Ready";
    render();
  }
}

async function stopEarTraining() {
  ++earTrainingRunToken;
  if (earTrainingAnimationFrame !== null) cancelAnimationFrame(earTrainingAnimationFrame);
  earTrainingAnimationFrame = null;
  await earTrainingSession?.stop();
  earTrainingSession = null;
  earTrainingEngine?.stop();
  earTrainingEngine = null;
  earTrainingGate = null;
  earTrainingStabilizer = null;
  earTrainingDetectedMidi = null;
  earTrainingPlaybackUntil = 0;
  earTrainingStatus = "Ready";
  render();
}

function earTrainingPlayback(event) {
  if (!event || event.type === "ignored" || event.type === "awaiting-next") return;
  const notes = event.sequence || event.notes || (event.target ? [event.target] : []);
  if (!notes.length) return;
  const spread = event.sequence ? 0.28 : 0.18;
  const duration = event.sequence ? 1.1 : 1.25;
  const playable = notes.map((note) => ({ midi: note.midi, string: note.sourceString ?? note.string, duration }));
  earTrainingPlaybackUntil = performance.now() + (notes.length - 1) * spread * 1000 + duration * 1000;
  void audioPlayer.playNotes(playable, { spread }).catch((error) => {
    earTrainingError = error.message || "Unable to play target note";
    render();
  });
  const target = event.target || event.sequence?.[event.sequenceIndex ?? 0] || event.sequence?.[0];
  if (target) earTrainingGate?.setTarget(target.midi);
  if (event.type === "repeat-sequence") earTrainingStatus = "Listen again";
  else if (event.type === "repeat-target") earTrainingStatus = "Listen again";
  else earTrainingStatus = "Listen";
  render();
}

function readEarTrainingFrame(session) {
  if (earTrainingSession !== session || session?.state !== "running") return;
  if (performance.now() >= earTrainingPlaybackUntil && earTrainingGate) {
    const estimate = earTrainingStabilizer.update(estimatePitch(session.readFrame(), { sampleRate: session.sampleRate }));
    const answer = earTrainingGate.update(estimate);
    if (answer.accepted) handleEarTrainingAnswer(answer.midi);
  }
  earTrainingAnimationFrame = requestAnimationFrame(() => readEarTrainingFrame(session));
}

function handleEarTrainingAnswer(midi, string = null) {
  earTrainingDetectedMidi = midi;
  const event = earTrainingEngine.submitPitch(midi, string);
  earTrainingStatus = event.type === "repeat-target" ? "Try again" : "Correct";
  render();
  earTrainingPlayback(event);
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
  tunerAudioRms = 0;
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
    if (earTrainingSession) await stopEarTraining();
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
  const rms = estimate.isSilent ? 0 : estimate.rms;
  tunerAudioRms = rms;
  if (tunerReading) tunerReading = { ...tunerReading, rms };
  if (!estimate.isSilent && estimate.frequency && estimate.stable) tunerReading = tunerReadingFromFrequency(estimate.frequency, rms);
  renderTuner(tunings.find((item) => item.id === state.tuning) || tunings[0]);
  tunerAnimationFrame = requestAnimationFrame(() => readTunerFrame(session));
}

function tunerReadingFromFrequency(frequency, rms) {
  const tuning = tunings.find((item) => item.id === state.tuning) || tunings[0];
  const target = selectTunerTarget({ frequency, mode: state.tunerMode, tuning, a4: state.tunerA4 });
  const cents = target.cents;
  return {
    note: target.note || target.pitch,
    frequency,
    rms,
    cents,
    status: Math.abs(cents) <= 5 ? "In tune" : cents < 0 ? "Tune up" : "Tune down"
  };
}
