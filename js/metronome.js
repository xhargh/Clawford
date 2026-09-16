export const BPM_MIN = 30;
export const BPM_MAX = 300;

export function beatDurationSeconds(bpm, denominator = 4) {
  return 60 / bpm * (4 / denominator);
}

export function beatPattern({ numerator = 4, firstBeatAccent = true, oddBeatAccent = false } = {}) {
  return Array.from({ length: numerator }, (_, index) => ({
    beat: index + 1,
    accent: (index === 0 && firstBeatAccent) || (index % 2 === 0 && oddBeatAccent)
  }));
}

export class Metronome {
  #contextFactory;
  #context = null;
  #timer = null;
  #nextTime = 0;
  #nextBeat = 0;
  #settings = null;
  #onBeat;
  #generation = 0;

  constructor({ createAudioContext = defaultAudioContextFactory, onBeat = () => {} } = {}) {
    this.#contextFactory = createAudioContext;
    this.#onBeat = onBeat;
  }

  get running() { return this.#timer !== null; }

  async start(settings) {
    this.stop();
    const generation = this.#generation;
    this.#settings = normalizeSettings(settings);
    this.#context = this.#contextFactory();
    if (!this.#context) throw new Error("Web Audio is not available");
    if (this.#context.state !== "running") await this.#context.resume();
    this.#nextTime = this.#context.currentTime + 0.05;
    this.#nextBeat = 0;
    this.#schedule(generation);
    this.#timer = setInterval(() => this.#schedule(generation), 25);
  }

  stop() {
    this.#generation += 1;
    if (this.#timer !== null) clearInterval(this.#timer);
    this.#timer = null;
    if (this.#context && this.#context.state !== "closed") void this.#context.close();
    this.#context = null;
    this.#settings = null;
  }

  async suspend() {
    if (this.#context?.state === "running") await this.#context.suspend();
  }

  async resume() {
    if (this.#context?.state === "suspended") {
      await this.#context.resume();
      this.#nextTime = this.#context.currentTime + 0.05;
    }
  }

  #schedule(generation) {
    if (generation !== this.#generation) return;
    if (!this.#context || !this.#settings) return;
    const horizon = this.#context.currentTime + 0.1;
    const interval = beatDurationSeconds(this.#settings.bpm, this.#settings.denominator);
    while (this.#nextTime < horizon) {
      const beat = this.#nextBeat % this.#settings.numerator;
      const accent = (beat === 0 && this.#settings.firstBeatAccent) ||
        (beat % 2 === 0 && this.#settings.oddBeatAccent);
      scheduleClick(this.#context, this.#nextTime, { accent });
      this.#notifyBeat(beat + 1, this.#nextTime, generation);
      this.#nextBeat += 1;
      this.#nextTime += interval;
    }
  }

  #notifyBeat(beat, time, generation) {
    const delay = Math.max(0, (time - this.#context.currentTime) * 1000);
    setTimeout(() => {
      if (this.#timer !== null && generation === this.#generation) this.#onBeat(beat);
    }, delay);
  }
}

function normalizeSettings(settings = {}) {
  const bpm = Number(settings.bpm);
  const numerator = Number(settings.numerator);
  const denominator = Number(settings.denominator);
  if (!Number.isFinite(bpm) || bpm < BPM_MIN || bpm > BPM_MAX) throw new RangeError("BPM is out of range");
  if (!Number.isInteger(numerator) || numerator < 1 || numerator > 12) throw new RangeError("Invalid meter numerator");
  if (![2, 4, 8, 16].includes(denominator)) throw new RangeError("Invalid meter denominator");
  return { bpm, numerator, denominator, firstBeatAccent: Boolean(settings.firstBeatAccent), oddBeatAccent: Boolean(settings.oddBeatAccent) };
}

function scheduleClick(context, time, { accent }) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(accent ? 0.28 : 0.18, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  gain.connect(context.destination);
  const oscillator = context.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(accent ? 1100 : 820, time);
  oscillator.connect(gain);
  oscillator.start(time);
  oscillator.stop(time + 0.08);
}

function defaultAudioContextFactory() {
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return Context ? new Context() : null;
}
