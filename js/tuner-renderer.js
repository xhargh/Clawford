export function renderTunerOutput({ mode = "chromatic", running = false, reading = null, audioRms = reading?.rms, targets = [], error = "" } = {}) {
  const cents = reading?.cents ?? 0;
  const meterPosition = Math.max(-50, Math.min(50, cents));
  const meterValue = reading?.cents == null ? "" : ` aria-valuenow="${meterPosition}"`;
  const colors = tunerColorsForRms(audioRms);
  const status = reading?.status || (error ? "Microphone unavailable" : running ? "Play a note" : "Ready");
  const note = reading?.note || "--";
  const frequency = reading?.frequency == null ? "--" : `${Number(reading.frequency).toFixed(1)} Hz`;
  const centsLabel = reading?.cents == null ? "-- cents" : `${reading.cents > 0 ? "+" : ""}${Math.round(reading.cents)} cents`;
  const targetMarkup = mode === "tuning"
    ? [...targets].sort((left, right) => right.string - left.string).map((target) => `<button class="tuner-target string-button" type="button" data-string="${escapeAttribute(target.string)}" data-midi="${escapeAttribute(target.midi)}" aria-label="Play string ${escapeAttribute(target.string)} ${escapeAttribute(target.pitch)}"><b>${escapeHtml(target.pitch)}</b><small>String ${escapeHtml(target.string)}</small></button>`).join("")
    : "";

  return `<div class="tuner-card" data-running="${running}" style="--tuner-warm: ${colors.warm}; --tuner-accent: ${colors.accent}">
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

function tunerColorsForRms(rms) {
  const numericRms = Number(rms);
  const level = Number.isFinite(numericRms) ? Math.max(0, Math.min(1, (numericRms - 0.01) / 0.34)) : 0;
  return {
    warm: mixColor("#984325", "#ff7a2f", level),
    accent: mixColor("#285a45", "#36c979", level)
  };
}

function mixColor(start, end, amount) {
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);
  const rgb = startRgb.map((channel, index) => Math.round(channel + (endRgb[index] - channel) * amount));
  return `rgb(${rgb.join(", ")})`;
}

function hexToRgb(hex) {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
