export const TAP_TEMPO_MAX_TAPS = 8;
export const TAP_TEMPO_RESET_MS = 2000;

export class TapTempo {
  #timestamps = [];

  constructor({ maxTaps = TAP_TEMPO_MAX_TAPS, resetAfterMs = TAP_TEMPO_RESET_MS } = {}) {
    this.maxTaps = maxTaps;
    this.resetAfterMs = resetAfterMs;
  }

  tap(timestamp = performance.now()) {
    const previous = this.#timestamps.at(-1);
    if (previous !== undefined && timestamp - previous > this.resetAfterMs) this.#timestamps = [];
    this.#timestamps.push(timestamp);
    this.#timestamps = this.#timestamps.slice(-this.maxTaps);
    if (this.#timestamps.length < 2) return null;
    const intervals = this.#timestamps.slice(1).map((time, index) => time - this.#timestamps[index]);
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    return Math.round(60000 / averageInterval);
  }

  reset() {
    this.#timestamps = [];
  }
}
