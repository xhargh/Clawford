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
    <dl class="ear-training-stats"><div><dt>Streak</dt><dd>${streak}</dd></div><div><dt>Attempts</dt><dd>${attempts}</dd></div></dl>
    <div class="ear-training-actions">
      <button id="ear-training-start" type="button"${running ? " disabled" : ""}>Start exercise</button>
      <button id="ear-training-stop" type="button"${running ? "" : " disabled"}>Stop</button>
    </div>
    ${error ? `<p class="ear-training-error" role="alert">${escapeHtml(error)}</p>` : ""}
  </div>`;
}

function labelFor(value) {
  return { find: "Find", follow: "Follow", simon: "Simon", free: "Low position", "same-string": "Same string", scale: "Key and scale", rolling: "Rolling", "open-string": "Open strings" }[value] || value;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
