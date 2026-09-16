export function renderMetronomeOutput({ beat = 0, numerator = 4, running = false, error = "" } = {}) {
  const beats = Array.from({ length: numerator }, (_, index) =>
    `<span class="metronome-beat${beat === index + 1 ? " active" : ""}" aria-label="Beat ${index + 1}">${index + 1}</span>`).join("");
  return `<div class="metronome-card"><p class="metronome-status" aria-live="polite">${running ? "Playing" : "Stopped"}</p><div class="metronome-beats" aria-label="Current beat">${beats}</div><div class="metronome-actions"><button id="metronome-start" type="button"${running ? " disabled" : ""}>Start</button><button id="metronome-stop" type="button"${running ? "" : " disabled"}>Stop</button></div>${error ? `<p class="metronome-error" role="alert">${error}</p>` : ""}</div>`;
}
