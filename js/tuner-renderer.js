export function renderTunerOutput({ mode = "chromatic", running = false, reading = null, targets = [], error = "" } = {}) {
  const cents = reading?.cents ?? 0;
  const meterPosition = Math.max(-50, Math.min(50, cents));
  const meterValue = reading?.cents == null ? "" : ` aria-valuenow="${meterPosition}"`;
  const status = reading?.status || (error ? "Microphone unavailable" : running ? "Play a note" : "Ready");
  const note = reading?.note || "--";
  const frequency = reading?.frequency == null ? "--" : `${Number(reading.frequency).toFixed(1)} Hz`;
  const centsLabel = reading?.cents == null ? "-- cents" : `${reading.cents > 0 ? "+" : ""}${Math.round(reading.cents)} cents`;
  const targetMarkup = mode === "tuning"
    ? [...targets].sort((left, right) => right.string - left.string).map((target) => `<button class="tuner-target string-button" type="button" data-string="${escapeAttribute(target.string)}" data-midi="${escapeAttribute(target.midi)}" aria-label="Play string ${escapeAttribute(target.string)} ${escapeAttribute(target.pitch)}"><b>${escapeHtml(target.pitch)}</b><small>String ${escapeHtml(target.string)}</small></button>`).join("")
    : "";

  return `<div class="tuner-card" data-running="${running}">
    <div class="tuner-reading" aria-live="polite">
      <span class="tuner-note">${escapeHtml(note)}</span>
      <span class="tuner-frequency">${escapeHtml(frequency)}</span>
      <span class="tuner-status">${escapeHtml(status)}</span>
    </div>
    <div class="tuner-meter" role="meter" aria-label="Tuning accuracy" aria-valuemin="-50" aria-valuemax="50"${meterValue} aria-valuetext="${escapeAttribute(reading?.cents == null ? status : centsLabel)}">
      <span class="tuner-meter-scale"><i style="--meter-position: ${meterPosition}%"></i><b></b></span>
      <span class="tuner-cents">${escapeHtml(centsLabel)}</span>
    </div>
    <div class="tuner-targets" aria-label="Target strings">${targetMarkup}</div>
    ${error ? `<p class="tuner-error" role="alert">${escapeHtml(error)}</p>` : ""}
  </div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
