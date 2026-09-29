export const TPM_MIN = 30;
export const TPM_MAX = 360;

export function tickDurationSeconds(tpm) {
  return 60 / tpm;
}

export function isTapTempoShortcut(event, view) {
  const tagName = event.target?.tagName;
  return view === "metronome"
    && event.code === "Space"
    && !event.repeat
    && !["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(tagName);
}

export function tickPattern(pattern = "", length = pattern.length || 1) {
  return Array.from({ length }, (_, index) => ({ A: "accent", S: "silent", N: "normal" }[pattern[index]] || (index === 0 ? "accent" : "normal")));
}

export class Metronome {
  #contextFactory;
  #context = null;
  #timer = null;
  #nextTime = 0;
  #nextBeat = 0;
  #settings = null;
  #pendingTpm = null;
  #scheduled = [];
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
    this.#pendingTpm = null;
    this.#scheduled = [];
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
    this.#pendingTpm = null;
    this.#scheduled = [];
  }

  updateTpm(tpm) {
    if (!this.running) return;
    const nextTpm = normalizeSettings({ ...this.#settings, tpm }).tpm;
    if (nextTpm === this.#settings.tpm) {
      this.#pendingTpm = null;
      return;
    }
    this.#pendingTpm = nextTpm;
    const upcoming = this.#scheduled
      .filter(({ time }) => time >= this.#context.currentTime)
      .sort((a, b) => a.time - b.time);
    if (upcoming.length > 0) {
      const nextTick = upcoming[0];
      for (const event of upcoming.slice(1)) this.#cancelScheduled(event);
      this.#nextTime = nextTick.time;
    }
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
    const pendingTpm = this.#pendingTpm;
    const upcoming = this.#scheduled
      .filter(({ time }) => time >= this.#context.currentTime)
      .sort((a, b) => a.time - b.time);
    if (pendingTpm !== null && upcoming.length > 0) {
      const nextTick = upcoming[0];
      if (nextTick.time >= horizon) return;
      this.#settings.tpm = pendingTpm;
      this.#pendingTpm = null;
      this.#nextTime = nextTick.time + tickDurationSeconds(this.#settings.tpm);
    }
    let applyPendingAfterFirstTick = pendingTpm !== null && upcoming.length === 0;
    let interval = tickDurationSeconds(this.#settings.tpm);
    while (this.#nextTime < horizon) {
      const tick = this.#nextBeat % this.#settings.pattern.length;
      const event = { time: this.#nextTime, ...scheduleClick(this.#context, this.#nextTime, { type: this.#settings.pattern[tick] }) };
      this.#scheduled.push(event);
      this.#notifyBeat(tick + 1, event, generation);
      this.#nextBeat += 1;
      this.#nextTime += interval;
      if (applyPendingAfterFirstTick) {
        this.#settings.tpm = pendingTpm;
        this.#pendingTpm = null;
        interval = tickDurationSeconds(this.#settings.tpm);
        this.#nextTime = event.time + interval;
        applyPendingAfterFirstTick = false;
      }
    }
  }

  #notifyBeat(beat, event, generation) {
    const delay = Math.max(0, (event.time - this.#context.currentTime) * 1000);
    event.notification = setTimeout(() => {
      this.#scheduled = this.#scheduled.filter((scheduled) => scheduled !== event);
      if (this.#timer !== null && generation === this.#generation) this.#onBeat(beat);
    }, delay);
  }

  #cancelScheduled(event) {
    clearTimeout(event.notification);
    if (event.gain) {
      event.gain.gain.cancelScheduledValues(this.#context.currentTime);
      event.gain.gain.setValueAtTime(0, this.#context.currentTime);
    }
    this.#scheduled = this.#scheduled.filter((scheduled) => scheduled !== event);
  }
}

function normalizeSettings(settings = {}) {
  const tpm = Number(settings.tpm);
  const pattern = tickPattern(settings.pattern, settings.pattern?.length || 1);
  if (!Number.isFinite(tpm) || tpm < TPM_MIN || tpm > TPM_MAX) throw new RangeError("Ticks per minute is out of range");
  return { tpm, pattern };
}

function scheduleClick(context, time, { type }) {
  if (type === "silent") return {};
  const gain = context.createGain();
  gain.gain.setValueAtTime(type === "accent" ? 0.28 : 0.18, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  gain.connect(context.destination);
  const oscillator = context.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(type === "accent" ? 1100 : 820, time);
  oscillator.connect(gain);
  oscillator.start(time);
  oscillator.stop(time + 0.08);
  return { gain };
}

function defaultAudioContextFactory() {
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return Context ? new Context() : null;
}
