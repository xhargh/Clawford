// Adapted with permission from BanjoTabTs's MIT-licensed audio synthesis code.
// See this repository's LICENSE.

export const BANJO_PROFILE = Object.freeze({
  name: "banjo",
  strings: Object.freeze([
    stringParams(1, 0.997, 1, 0.62),
    stringParams(2, 0.996, 1, 0.66),
    stringParams(3, 0.995, 1, 0.70),
    stringParams(4, 0.994, 0.9, 0.74),
    stringParams(5, 0.992, 0.8, 0.78)
  ]),
  bodyMix: 0.28,
  bodyResonances: defaultResonances()
});

export const GUITAR_PROFILE = Object.freeze({
  name: "guitar",
  strings: Object.freeze([
    stringParams(1, 0.9965, 0.9, 0.70),
    stringParams(2, 0.9965, 0.95, 0.68),
    stringParams(3, 0.996, 1, 0.65),
    stringParams(4, 0.9955, 1, 0.61),
    stringParams(5, 0.995, 1, 0.57),
    stringParams(6, 0.9945, 1, 0.53)
  ]),
  bodyMix: 0.24,
  bodyResonances: Object.freeze([
    resonance(110, 3.5, 0.18),
    resonance(220, 4.5, 0.13),
    resonance(440, 5, 0.08)
  ])
});

function stringParams(number, damping, excitation, brightness) {
  return Object.freeze({ number, damping, excitation, brightness });
}

function resonance(frequencyHz, q, gain) {
  return Object.freeze({ frequencyHz, q, gain });
}

function defaultResonances() {
  return Object.freeze([
    resonance(280, 4.5, 0.16),
    resonance(520, 5, 0.11),
    resonance(920, 3.5, 0.07)
  ]);
}

export function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function createSeededRandom(seed = 0) {
  let state = Number(seed) >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

/**
 * Render a deterministic mono pluck.
 *
 * A profile has `strings: [{ number, damping, excitation, brightness }]` and
 * may define `bodyMix` and `bodyResonances`. String numbers need not be
 * contiguous, which lets callers model any physical instrument layout.
 */
export function renderPluck({
  midi,
  string: stringNumber,
  profile = BANJO_PROFILE,
  sampleRate = 44100,
  duration = 1.5,
  velocity = 1,
  seed = 0
}) {
  validateRenderOptions(midi, stringNumber, profile, sampleRate, duration, velocity);
  const params = profile.strings.find((candidate) => candidate.number === stringNumber);
  const frames = Math.max(1, Math.round(duration * sampleRate));
  const frequency = midiToFrequency(midi);
  const delaySamples = sampleRate / frequency;
  const capacity = Math.ceil(sampleRate / midiToFrequency(0)) + 4;
  const delay = new Float32Array(capacity);
  const random = createSeededRandom(seed ^ Math.imul(stringNumber, 0x9e3779b9) ^ Math.imul(1, 0x85ebca6b));
  const activeLength = Math.min(capacity, Math.ceil(delaySamples) + 2);
  let priorNoise = 0;

  for (let index = 0; index < activeLength; index += 1) {
    const white = random() * 2 - 1;
    delay[(capacity - activeLength + index) % capacity] =
      (white * 0.65 + priorNoise * 0.35) * velocity * params.excitation;
    priorNoise = white;
  }

  const resonators = createResonators(sampleRate, profile.bodyResonances ?? [], profile.bodyMix ?? 0);
  const output = new Float32Array(frames);
  const attackFrames = Math.max(1, Math.round(sampleRate * 0.002));
  const attackNoiseFrames = Math.max(1, Math.round(sampleRate * 0.01));
  const releaseFrames = Math.min(frames, Math.max(1, Math.round(sampleRate * 0.012)));
  let writeIndex = 0;
  let previousDelayed = 0;
  let attackNoisePrior = 0;
  let attackNoiseFiltered = 0;

  for (let frame = 0; frame < frames; frame += 1) {
    let readPosition = writeIndex - delaySamples;
    while (readPosition < 0) readPosition += capacity;
    const first = Math.floor(readPosition) % capacity;
    const fraction = readPosition - Math.floor(readPosition);
    const current = delay[first] * (1 - fraction) + delay[(first + 1) % capacity] * fraction;
    const averaged = (current + previousDelayed) * 0.5;
    delay[writeIndex] = (current * params.brightness + averaged * (1 - params.brightness)) * params.damping;
    previousDelayed = current;
    writeIndex = (writeIndex + 1) % capacity;

    const attack = frame < attackFrames ? (frame + 1) / attackFrames : 1;
    const release = frame < frames - releaseFrames ? 1 : (frames - frame - 1) / releaseFrames;
    let attackNoise = 0;
    if (frame < attackNoiseFrames) {
      const white = random() * 2 - 1;
      const highPassed = white - attackNoisePrior;
      attackNoisePrior = white;
      attackNoiseFiltered = attackNoiseFiltered * 0.55 + highPassed * 0.45;
      attackNoise = attackNoiseFiltered * 0.08 * velocity * (attackNoiseFrames - frame) / attackNoiseFrames;
    }
    const sample = current * attack * release + attackNoise;
    output[frame] = release === 0 ? 0 : Math.tanh(processResonators(resonators, sample) * 0.8);
  }

  return output;
}

function validateRenderOptions(midi, stringNumber, profile, sampleRate, duration, velocity) {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127 || midiToFrequency(midi) >= sampleRate / 2) {
    throw new RangeError(`MIDI note is not renderable: ${midi}`);
  }
  if (!Number.isSafeInteger(sampleRate) || sampleRate <= 0) {
    throw new RangeError(`Sample rate must be a positive integer: ${sampleRate}`);
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new RangeError(`Duration must be positive: ${duration}`);
  }
  if (!Number.isFinite(velocity) || velocity < 0 || velocity > 1) {
    throw new RangeError(`Velocity must be in [0, 1]: ${velocity}`);
  }
  if (!profile || !Array.isArray(profile.strings)) throw new TypeError("Profile requires a strings array");
  const params = profile.strings.find((candidate) => candidate.number === stringNumber);
  if (!params) throw new RangeError(`Profile has no physical string ${stringNumber}`);
  if (![params.damping, params.excitation, params.brightness].every(Number.isFinite) ||
      params.damping < 0 || params.damping >= 1 || params.excitation < 0 ||
      params.brightness < 0 || params.brightness > 1) {
    throw new RangeError(`Invalid synthesis parameters for physical string ${stringNumber}`);
  }
}

function createResonators(sampleRate, definitions, mix) {
  if (!Array.isArray(definitions) || definitions.length > 16) {
    throw new RangeError("Body resonances must be an array of at most 16 entries");
  }
  if (!Number.isFinite(mix) || mix < 0 || mix > 1) throw new RangeError("Body mix must be in [0, 1]");
  const states = definitions.filter(({ frequencyHz }) => frequencyHz < sampleRate * 0.45).map((definition) => {
    const { frequencyHz, q, gain } = definition;
    if (!Number.isFinite(frequencyHz) || frequencyHz < 20 || !Number.isFinite(q) || q <= 0 ||
        !Number.isFinite(gain) || gain < 0) throw new RangeError("Invalid body resonance");
    const radius = Math.exp(-Math.PI * frequencyHz / (q * sampleRate));
    return {
      coefficient: 2 * radius * Math.cos(2 * Math.PI * frequencyHz / sampleRate),
      radiusSquared: radius * radius,
      inputScale: 1 - radius,
      gain,
      previous: 0,
      older: 0
    };
  });
  return { states, mix: states.length === 0 ? 0 : mix };
}

function processResonators({ states, mix }, input) {
  let body = 0;
  for (const state of states) {
    const value = input * state.inputScale + state.coefficient * state.previous - state.radiusSquared * state.older;
    state.older = state.previous;
    state.previous = Number.isFinite(value) ? value : 0;
    body += state.previous * state.gain;
  }
  const value = input * (1 - mix) + body * mix;
  return Number.isFinite(value) ? value : 0;
}
