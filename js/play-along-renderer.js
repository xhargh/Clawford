function stepLabel(index, meter, subdivision) {
  if (meter.denominator === 8) return index % subdivision === 0 ? String(Math.floor(index / subdivision) + 1) : index % subdivision === 1 ? "trip" : "let";
  if (subdivision === 1) return String(index + 1);
  return index % subdivision === 0 ? String(Math.floor(index / subdivision) + 1) : "&";
}

function startsGroup(index, grouping) {
  let start = 0;
  for (const size of grouping) {
    if (start === index && index > 0) return true;
    start += size;
  }
  return false;
}

export function renderPlayAlongOutput({
  chords = [], pattern = [], patternName = "Custom pattern", bpm = 90, position = {}, running = false,
  loop = true, custom = false, actions = [], error = "", phase = "idle", countIn = 0,
  meter = { numerator: 4, denominator: 4 }, subdivision = 2, grouping = []
} = {}) {
  const chord = chords[position.chordIndex ?? 0] || chords[0] || "G";
  const next = chords.length > 1 ? chords[((position.chordIndex ?? 0) + 1) % chords.length] : "--";
  const steps = pattern.map((step, index) => `<button class="play-along-step${index === position.stepIndex ? " active" : ""}${startsGroup(index, grouping) ? " grouped" : ""}" type="button" ${custom ? `data-pattern-step="${index}"` : "disabled"} aria-label="${stepLabel(index, meter, subdivision)}: ${step === "-" ? "rest" : step}"><span>${step}</span><small>${stepLabel(index, meter, subdivision)}</small></button>`).join("");
  const actionButtons = custom ? pattern.map((step, index) => `<button class="play-along-custom-step${index === position.stepIndex ? " active" : ""}" type="button" data-pattern-step="${index}" aria-label="Edit pattern step ${index + 1}">${step}</button>`).join("") : "";
  const status = phase === "count-in" ? `Count in · ${countIn}` : running ? "Playing" : "Ready to play";
  return `<div class="play-along-card">
    <div class="play-along-heading"><p class="eyebrow">${status}</p><strong class="play-along-chord" aria-live="polite">${chord}</strong><p class="play-along-next">next: <b>${next}</b></p></div>
     <p class="play-along-pattern-name">${patternName} <span>${meter.numerator}/${meter.denominator} · ${bpm} BPM</span></p>
   <div class="play-along-pattern meter-${meter.numerator}-${meter.denominator}" style="--step-count:${pattern.length}" aria-label="Current pattern">${steps}</div>
     ${custom ? `<div class="play-along-custom" aria-label="Custom pattern editor"><p>Tap a cell to cycle: ${actions.join(" ")}</p><div style="--step-count:${pattern.length}">${actionButtons}</div></div>` : ""}
     <p class="play-along-position" aria-live="polite">Beat ${position.beat || 1} · measure ${(position.chordIndex ?? 0) + 1} of ${chords.length || 1}</p>
    <div class="play-along-actions"><button id="play-along-start" type="button"${running ? " disabled" : ""}>Play</button><button id="play-along-stop" type="button"${running ? "" : " disabled"}>Stop</button><label><input id="play-along-loop" type="checkbox"${loop ? " checked" : ""}> Loop</label></div>
    ${error ? `<p class="play-along-error" role="alert">${error}</p>` : ""}
  </div>`;
}
