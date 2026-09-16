export class MicrophoneSession {
  #getUserMedia;
  #createAudioContext;
  #stream = null;
  #context = null;
  #source = null;
  #analyser = null;
  #state = "idle";
  #startToken = 0;

  constructor({ getUserMedia = defaultGetUserMedia, createAudioContext = defaultAudioContextFactory } = {}) {
    this.#getUserMedia = getUserMedia;
    this.#createAudioContext = createAudioContext;
  }

  get state() {
    return this.#state;
  }

  get analyser() {
    return this.#analyser;
  }

  get sampleRate() {
    return this.#context?.sampleRate ?? null;
  }

  readFrame() {
    if (!this.#analyser) throw new Error("MicrophoneSession is not running");
    const frame = new Float32Array(this.#analyser.fftSize);
    this.#analyser.getFloatTimeDomainData(frame);
    return frame;
  }

  async start() {
    if (this.#state === "disposed") throw new Error("MicrophoneSession has been disposed");
    if (this.#state === "running") return this;
    const startToken = ++this.#startToken;
    try {
      const stream = await this.#getUserMedia({ audio: true });
      if (startToken !== this.#startToken) {
        for (const track of stream.getTracks()) track.stop();
        return this;
      }
      this.#stream = stream;
      this.#context = this.#createAudioContext();
      if (!this.#context) throw new Error("Web Audio is not available");
      this.#analyser = this.#context.createAnalyser();
      this.#source = this.#context.createMediaStreamSource(this.#stream);
      this.#source.connect(this.#analyser);
      this.#state = "running";
      return this;
    } catch (error) {
      if (startToken !== this.#startToken) return this;
      this.#releaseStream();
      this.#state = "error";
      throw error;
    }
  }

  async stop() {
    if (this.#state === "disposed") return;
    ++this.#startToken;
    if (this.#source) {
      try { this.#source.disconnect(); } catch {}
    }
    this.#releaseStream();
    if (this.#context && this.#context.state !== "closed") await this.#context.close();
    this.#source = null;
    this.#analyser = null;
    this.#context = null;
    this.#state = "stopped";
  }

  async suspend() {
    if (this.#state !== "running" || !this.#context?.suspend) return;
    await this.#context.suspend();
  }

  async resume() {
    if (this.#state !== "running" || !this.#context?.resume) return;
    await this.#context.resume();
  }

  async dispose() {
    if (this.#state === "disposed") return;
    await this.stop();
    this.#state = "disposed";
  }

  #releaseStream() {
    if (!this.#stream) return;
    for (const track of this.#stream.getTracks()) track.stop();
    this.#stream = null;
  }
}

function defaultGetUserMedia(constraints) {
  if (!globalThis.navigator?.mediaDevices?.getUserMedia) throw new Error("Microphone access is not available");
  return globalThis.navigator.mediaDevices.getUserMedia(constraints);
}

function defaultAudioContextFactory() {
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return Context ? new Context() : null;
}
