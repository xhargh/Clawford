import { BANJO_PROFILE, renderPluck } from "./synth.js";

const DEFAULT_FADE_SECONDS = 0.015;
const VOICE_GAIN = 0.16;

export class AudioPlayer {
  #contextFactory;
  #context = null;
  #profile;
  #seed;
  #duration;
  #cacheLimit;
  #cache = new Map();
  #active = new Map();
  #voices = new Set();
  #disposed = false;

  constructor({
    profile = BANJO_PROFILE,
    seed = 0,
    duration = 1.5,
    cacheSize = 32,
    createAudioContext = defaultAudioContextFactory
  } = {}) {
    if (!Number.isSafeInteger(cacheSize) || cacheSize < 1) throw new RangeError("cacheSize must be positive");
    if (!Number.isFinite(duration) || duration <= 0) throw new RangeError("duration must be positive");
    this.#profile = profile;
    this.#seed = seed;
    this.#duration = duration;
    this.#cacheLimit = cacheSize;
    this.#contextFactory = createAudioContext;
  }

  /** Accepts either playNote({ midi, string, when?, velocity? }) or playNote(midi, string, options?). */
  async playNote(note, physicalString, options = {}) {
    if (this.#disposed) throw new Error("AudioPlayer has been disposed");
    const request = typeof note === "object" ? note : { ...options, midi: note, string: physicalString };
    const context = await this.#readyContext();
    const prepared = this.#prepareNote(context, request);
    return this.#startVoice(context, prepared, request.when ?? context.currentTime);
  }

  async playNotes(notes, { spread = 0.025 } = {}) {
    if (this.#disposed) throw new Error("AudioPlayer has been disposed");
    if (!notes.length) return [];
    const context = await this.#readyContext();
    const prepared = notes.map((note) => this.#prepareNote(context, note));
    const start = context.currentTime + 0.005;
    return prepared.map((note, index) => this.#startVoice(context, note, start + index * spread));
  }

  async #readyContext() {
    const context = this.#ensureContext();
    if (context.state !== "running") await context.resume();
    if (this.#disposed || context.state === "closed") throw new Error("AudioContext is closed");
    return context;
  }

  #prepareNote(context, request) {
    const velocity = request.velocity ?? 1;
    const duration = request.duration ?? this.#duration;
    const key = this.#cacheKey(request.midi, request.string, velocity, duration, context.sampleRate);
    return {
      ...request,
      buffer: this.#bufferFor(context, key, request.midi, request.string, velocity, duration)
    };
  }

  #startVoice(context, request, requestedTime) {
    const when = Math.max(context.currentTime, requestedTime);
    const previous = this.#active.get(request.string);
    if (previous) this.#fadeVoice(previous, when);

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = request.buffer;
    source.connect(gain);
    gain.connect(context.destination);
    gain.gain.setValueAtTime(VOICE_GAIN, when);
    const voice = { source, gain, string: request.string };
    source.onended = () => this.#removeVoice(voice);
    this.#voices.add(voice);
    this.#active.set(request.string, voice);
    source.start(when);
    return source;
  }

  stopAll() {
    if (!this.#context) return;
    const when = this.#context.currentTime;
    for (const voice of this.#voices) this.#fadeVoice(voice, when);
    this.#active.clear();
  }

  async dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.stopAll();
    this.#cache.clear();
    const context = this.#context;
    this.#context = null;
    if (context && context.state !== "closed") await context.close();
    this.#voices.clear();
  }

  #ensureContext() {
    if (!this.#context) {
      this.#context = this.#contextFactory();
      if (!this.#context) throw new Error("Web Audio is not available");
    }
    return this.#context;
  }

  #bufferFor(context, key, midi, string, velocity, duration) {
    const cached = this.#cache.get(key);
    if (cached) {
      this.#cache.delete(key);
      this.#cache.set(key, cached);
      return cached;
    }
    const samples = renderPluck({
      midi,
      string,
      profile: this.#profile,
      sampleRate: context.sampleRate,
      duration,
      velocity,
      seed: this.#seed
    });
    const buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.getChannelData(0).set(samples);
    this.#cache.set(key, buffer);
    if (this.#cache.size > this.#cacheLimit) this.#cache.delete(this.#cache.keys().next().value);
    return buffer;
  }

  #cacheKey(midi, string, velocity, duration, sampleRate) {
    return `${sampleRate}:${midi}:${string}:${velocity}:${duration}`;
  }

  #fadeVoice(voice, when) {
    const stopTime = when + DEFAULT_FADE_SECONDS;
    try {
      voice.gain.gain.cancelScheduledValues(when);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, when);
      voice.gain.gain.linearRampToValueAtTime(0, stopTime);
      voice.source.stop(stopTime + 0.01);
    } catch {
      this.#removeVoice(voice);
    }
  }

  #removeVoice(voice) {
    this.#voices.delete(voice);
    if (this.#active.get(voice.string) === voice) this.#active.delete(voice.string);
    try { voice.source.disconnect(); } catch {}
    try { voice.gain.disconnect(); } catch {}
  }
}

function defaultAudioContextFactory() {
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return Context ? new Context() : null;
}
