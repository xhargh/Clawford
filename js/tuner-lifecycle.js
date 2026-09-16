export class TunerLifecycle {
  #createSession;
  #onStarted;
  #onError;
  #session = null;
  #transition = 0;

  constructor({ createSession, onStarted = () => {}, onError = () => {} }) {
    this.#createSession = createSession;
    this.#onStarted = onStarted;
    this.#onError = onError;
  }

  get session() {
    return this.#session;
  }

  async enter() {
    if (this.#session) return;
    const transition = ++this.#transition;
    const session = this.#createSession();
    this.#session = session;
    try {
      await session.start();
      if (transition !== this.#transition || this.#session !== session) {
        return;
      }
      this.#onStarted(session);
    } catch (error) {
      if (transition === this.#transition && this.#session === session) {
        this.#session = null;
        this.#onError(error);
      }
    }
  }

  start() {
    return this.enter();
  }

  async leave() {
    ++this.#transition;
    const session = this.#session;
    this.#session = null;
    await session?.stop();
  }

  stop() {
    return this.leave();
  }
}
