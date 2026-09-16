export function estimatePitch(samples, { sampleRate, silenceRms = 0.01 } = {}) {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new RangeError("sampleRate must be positive");
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  const rms = Math.sqrt(sum / samples.length);
  const isSilent = rms < silenceRms;
  if (isSilent) return { frequency: null, confidence: 0, rms, isSilent };

  const minLag = Math.max(1, Math.ceil(sampleRate / 1000));
  const maxLag = Math.min(samples.length - 2, Math.floor(sampleRate / 50));
  let bestLag = minLag;
  let bestCorrelation = -1;
  const correlations = [];
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let product = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    for (let index = 0; index + lag < samples.length; index += 1) {
      const left = samples[index];
      const right = samples[index + lag];
      product += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }
    const correlation = product / Math.sqrt(leftEnergy * rightEnergy);
    correlations[lag] = correlation;
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }
  for (let lag = minLag + 1; lag < maxLag; lag += 1) {
    if (correlations[lag] >= 0.8 && correlations[lag] >= correlations[lag - 1] && correlations[lag] >= correlations[lag + 1]) {
      bestLag = lag;
      bestCorrelation = correlations[lag];
      break;
    }
  }
  const frequency = sampleRate / bestLag;
  return { frequency, confidence: Math.max(0, bestCorrelation), rms, isSilent };
}

export class PitchStabilizer {
  #windowSize;
  #frequencies = [];
  #latest = null;

  constructor({ windowSize = 3 } = {}) {
    if (!Number.isSafeInteger(windowSize) || windowSize < 1) throw new RangeError("windowSize must be positive");
    this.#windowSize = windowSize;
  }

  update(estimate) {
    if (estimate.isSilent || estimate.frequency === null) {
      this.#frequencies = [];
      this.#latest = { ...estimate, stable: false };
      return this.#latest;
    }
    if (this.#frequencies.length && isOctaveOutlier(estimate.frequency, this.#frequencies)) {
      return this.#latest;
    }
    this.#frequencies.push(estimate.frequency);
    if (this.#frequencies.length > this.#windowSize) this.#frequencies.shift();
    const ordered = [...this.#frequencies].sort((a, b) => a - b);
    const frequency = ordered[Math.floor(ordered.length / 2)];
    this.#latest = { ...estimate, frequency, stable: this.#frequencies.length === this.#windowSize };
    return this.#latest;
  }
}

function isOctaveOutlier(frequency, history) {
  const median = [...history].sort((a, b) => a - b)[Math.floor(history.length / 2)];
  const ratio = frequency / median;
  return ratio > 1.5 || ratio < 2 / 3;
}
