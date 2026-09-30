import { centsOffset, frequencyToNote, noteToFrequency } from "./pitch.js";
import { getAutomaticRange, positionsForMidi, stringMaxFrets } from "./mapping.js";
import { scalePitchClasses } from "./scales.js";

const DEFAULT_TOLERANCE_CENTS = 35;
const DEFAULT_MAX_FRET = 5;

export function matchPitch({ targetMidi, frequency, toleranceCents = DEFAULT_TOLERANCE_CENTS, a4 = 440 } = {}) {
  if (!Number.isInteger(targetMidi) || !Number.isFinite(frequency) || frequency <= 0) return false;
  return Math.abs(centsOffset(frequency, targetMidi, { a4 })) <= toleranceCents;
}

export class PitchAnswerGate {
  #targetMidi;
  #windowSize;
  #frequencies = [];
  #locked = false;

  constructor({ targetMidi, windowSize = 3, toleranceCents = DEFAULT_TOLERANCE_CENTS, a4 = 440 } = {}) {
    if (!Number.isInteger(windowSize) || windowSize < 1) throw new RangeError("windowSize must be positive");
    this.#targetMidi = targetMidi;
    this.#windowSize = windowSize;
    this.toleranceCents = toleranceCents;
    this.a4 = a4;
  }

  setTarget(targetMidi) {
    this.#targetMidi = targetMidi;
    this.#frequencies = [];
  }

  update(estimate) {
    if (estimate.isSilent || estimate.frequency === null) {
      this.#frequencies = [];
      if (this.#locked) {
        this.#locked = false;
        return { status: "released", accepted: false };
      }
      return { status: "silent", accepted: false };
    }
    if (this.#locked || estimate.confidence < 0.8) {
      return { status: this.#locked ? "awaiting-release" : "listening", accepted: false };
    }
    this.#frequencies.push(estimate.frequency);
    if (this.#frequencies.length > this.#windowSize) this.#frequencies.shift();
    if (this.#frequencies.length < this.#windowSize) return { status: "stabilizing", accepted: false };
    this.#locked = true;
    return { status: "accepted", accepted: true, midi: frequencyToNote(estimate.frequency, { a4: this.a4 }).midi };
  }
}

export function createEarTrainingSession({
  exercise = "find",
  variant = "free",
  tuning,
  key,
  scale,
  maxFret = DEFAULT_MAX_FRET,
  fifthMode = "excluded",
  random = Math.random,
  sequenceLimit = 5
} = {}) {
  if (!tuning?.strings?.length) throw new Error("A tuning is required");
  if (!["find", "follow", "simon"].includes(exercise)) throw new Error(`Invalid exercise: ${exercise}`);
  if (!["free", "same-string", "scale", "rolling", "open-string"].includes(variant)) throw new Error(`Invalid variant: ${variant}`);
  if (!Number.isSafeInteger(sequenceLimit) || sequenceLimit < 1) throw new RangeError("sequenceLimit must be positive");

  const candidates = createCandidates({ tuning, key, scale, maxFret, fifthMode, variant, exercise });
  if (!candidates.length) throw new Error("No playable ear-training notes");
  let target = null;
  let sequence = [];
  let sequenceIndex = 0;
  let running = false;
  let streak = 0;
  let attempts = 0;

  const state = () => ({ running, target, sequence: [...sequence], sequenceIndex, streak, attempts, exercise, variant });

  function start() {
    running = true;
    streak = 0;
    attempts = 0;
    sequenceIndex = 0;
    if (exercise === "simon") {
      sequence = [chooseCandidate(candidates, null, random)];
      return { type: "play-sequence", sequence: [...sequence], state: state() };
    }
    target = chooseCandidate(candidates, null, random);
    return { type: "play-target", target, notes: [target], state: state() };
  }

  function stop() {
    running = false;
    return { type: "stopped", state: state() };
  }

  function submitPitch(midi, string = null) {
    if (!running) return { type: "ignored", state: state() };
    attempts += 1;
    if (exercise === "simon") return submitSimonPitch(midi);
    const correctPitch = midi === target.midi;
    const correctString = variant !== "open-string" || string === target.string;
    if (!correctPitch || !correctString) {
      streak = 0;
      return { type: "repeat-target", target, notes: [target], state: state() };
    }
    streak += 1;
    const previous = target;
    target = chooseCandidate(candidates, exercise === "follow" ? previous : null, random);
    return { type: "advance", previous, target, notes: [previous, target], state: state() };
  }

  function submitSimonPitch(midi) {
    if (midi !== sequence[sequenceIndex].midi) {
      streak = 0;
      sequenceIndex = 0;
      return { type: "repeat-sequence", sequence: [...sequence], state: state() };
    }
    sequenceIndex += 1;
    if (sequenceIndex < sequence.length) return { type: "awaiting-next", sequenceIndex, state: state() };
    streak += 1;
    const next = chooseCandidate(candidates, sequence.at(-1), random);
    sequence = variant === "rolling" ? [...sequence, next].slice(-sequenceLimit) : [...sequence, next];
    sequenceIndex = 0;
    return { type: "extend-sequence", sequence: [...sequence], state: state() };
  }

  return { get state() { return state(); }, start, stop, submitPitch, submitSimonPitch };
}

function createCandidates({ tuning, key, scale, maxFret, fifthMode, variant, exercise }) {
  const limits = stringMaxFrets(tuning, maxFret);
  const range = getAutomaticRange(tuning, maxFret, fifthMode, limits);
  const allowedClasses = variant === "scale" ? new Set(scalePitchClasses(key.pitchClass, scale.intervals)) : null;
  const candidates = [];
  for (let midi = range.low; midi <= range.high; midi += 1) {
    if (allowedClasses && !allowedClasses.has(midi % 12)) continue;
    const positions = positionsForMidi(midi, tuning, { maxFret, fifthMode, stringMaxFrets: limits });
    for (const position of positions) {
      if (variant === "same-string" && position.string === 5) continue;
      if (variant === "open-string" && position.fret !== 0) continue;
      candidates.push({ midi, string: position.string, fret: position.fret, sourceString: position.string, frequency: noteToFrequency(midi) });
    }
  }
  if (exercise === "follow" || variant === "same-string") return candidates.filter((candidate) => candidate.string !== 5);
  return candidates;
}

function chooseCandidate(candidates, previous, random) {
  let choices = candidates;
  if (previous) {
    const nearby = candidates.filter((candidate) => candidate.sourceString === previous.sourceString && candidate.midi !== previous.midi && Math.abs(candidate.midi - previous.midi) <= 4);
    choices = nearby.length ? nearby : candidates.filter((candidate) => candidate.midi !== previous.midi);
  }
  return choices[Math.min(choices.length - 1, Math.floor(randomValue() * choices.length))];

  function randomValue() {
    return Math.max(0, Math.min(0.999999999, random()));
  }
}
