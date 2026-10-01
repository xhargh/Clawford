export function renderEarTrainingOutput({
  exercise = "find",
  variant = "free",
  running = false,
  status = "Ready",
  streak = 0,
  attempts = 0,
  sequenceLength = 0,
  sequenceIndex = 0,
  target = null,
  heard = "--",
  error = ""
} = {}) {
  const targetLabel = target?.note || (target?.midi == null ? "--" : `MIDI ${target.midi}`);
  const progress = sequenceLength ? `${sequenceIndex} / ${sequenceLength} notes` : "Single-note exercise";
  return `<div class="ear-training-card" data-running="${running}">
    <div class="ear-training-heading">
      <h2>Ear training</h2>
      <p class="ear-training-mode">${escapeHtml(labelFor(exercise))} · ${escapeHtml(labelFor(variant))}</p>
    </div>
    <div class="ear-training-status" aria-live="polite">
      <span class="ear-training-status-label">${escapeHtml(status)}</span>
      <strong class="ear-training-target">${escapeHtml(targetLabel)}</strong>
      <span>${escapeHtml(progress)}</span>
    </div>
    <p class="ear-training-heard">Heard: <strong>${escapeHtml(heard)}</strong></p>
    <dl class="ear-training-stats"><div><dt>Streak</dt><dd>${streak}</dd></div><div><dt>Attempts</dt><dd>${attempts}</dd></div></dl>
    <div class="ear-training-actions">
      <button id="ear-training-start" type="button"${running ? " disabled" : ""}>Start exercise</button>
      <button id="ear-training-stop" type="button"${running ? "" : " disabled"}>Stop</button>
    </div>
    ${error ? `<p class="ear-training-error" role="alert">${escapeHtml(error)}</p>` : ""}
  </div>`;
}

function labelFor(value) {
  return { find: "One note at a time", "open-string": "Find the string" }[value] || value;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
