const SUBDIVISIONS = ["1", "&", "2", "&", "3", "&", "4", "&"];

export function renderPlayAlongOutput({
  chords = [], pattern = [], patternName = "Custom pattern", bpm = 90, position = {}, running = false,
  loop = true, custom = false, actions = [], error = "", phase = "idle", countIn = 0
} = {}) {
  const chord = chords[position.chordIndex ?? 0] || chords[0] || "G";
  const next = chords.length > 1 ? chords[((position.chordIndex ?? 0) + 1) % chords.length] : "--";
  const steps = pattern.map((step, index) => `<button class="play-along-step${index === position.stepIndex ? " active" : ""}" type="button" ${custom ? `data-pattern-step="${index}"` : "disabled"} aria-label="${SUBDIVISIONS[index % 8]}: ${step === "-" ? "rest" : step}"><span>${step}</span><small>${SUBDIVISIONS[index % 8]}</small></button>`).join("");
  const actionButtons = custom ? pattern.map((step, index) => `<button class="play-along-custom-step${index === position.stepIndex ? " active" : ""}" type="button" data-pattern-step="${index}" aria-label="Edit pattern step ${index + 1}">${step}</button>`).join("") : "";
  const status = phase === "count-in" ? `Count in · ${countIn}` : running ? "Playing" : "Ready to play";
  return `<div class="play-along-card">
    <div class="play-along-heading"><p class="eyebrow">${status}</p><strong class="play-along-chord" aria-live="polite">${chord}</strong><p class="play-along-next">next: <b>${next}</b></p></div>
    <p class="play-along-pattern-name">${patternName} <span>${bpm} BPM</span></p>
    <div class="play-along-pattern" aria-label="Current pattern">${steps}</div>
    ${custom ? `<div class="play-along-custom" aria-label="Custom pattern editor"><p>Tap a cell to cycle: ${actions.join(" ")}</p><div>${actionButtons}</div></div>` : ""}
    <p class="play-along-position" aria-live="polite">Beat ${position.beat || 1} <span>${position.subdivision || "1"}</span> · measure ${(position.chordIndex ?? 0) + 1} of ${chords.length || 1}</p>
    <div class="play-along-actions"><button id="play-along-start" type="button"${running ? " disabled" : ""}>Play</button><button id="play-along-stop" type="button"${running ? "" : " disabled"}>Stop</button><label><input id="play-along-loop" type="checkbox"${loop ? " checked" : ""}> Loop</label></div>
    ${error ? `<p class="play-along-error" role="alert">${error}</p>` : ""}
  </div>`;
}
