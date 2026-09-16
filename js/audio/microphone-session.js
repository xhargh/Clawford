export class MicrophoneSession {
  #getUserMedia;
  #createAudioContext;
  #stream = null;
  #context = null;
  #source = null;
  #analyser = null;
  #state = "idle";

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

  readFrame() {
    if (!this.#analyser) throw new Error("MicrophoneSession is not running");
    const frame = new Float32Array(this.#analyser.fftSize);
    this.#analyser.getFloatTimeDomainData(frame);
    return frame;
  }

  async start() {
    if (this.#state === "disposed") throw new Error("MicrophoneSession has been disposed");
    if (this.#state === "running") return this;
    try {
      this.#stream = await this.#getUserMedia({ audio: true });
      this.#context = this.#createAudioContext();
      if (!this.#context) throw new Error("Web Audio is not available");
      this.#analyser = this.#context.createAnalyser();
      this.#source = this.#context.createMediaStreamSource(this.#stream);
      this.#source.connect(this.#analyser);
      this.#state = "running";
      return this;
    } catch (error) {
      this.#releaseStream();
      this.#state = "error";
      throw error;
    }
  }

  async stop() {
    if (this.#state === "disposed") return;
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
