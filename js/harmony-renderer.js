import { analyzeTransition, generateDiatonicChords } from "./harmony.js";

const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const toneName = (node, pitchClass) => node.toneNames[node.pitchClasses.indexOf(pitchClass)] ?? `pitch class ${pitchClass}`;

function nodeMarkup(node, selectedId, activeView, destinationIds) {
  const progressionClass = activeView === "progression"
    ? ` progression-${node.id === selectedId ? "source" : destinationIds.has(node.id) ? "destination" : "other"}`
    : "";
  return `<button class="harmony-node quality-${node.quality}${progressionClass}" data-harmony-node="${escape(node.id)}" aria-pressed="${node.id === selectedId}"><strong>${escape(node.numeral)}</strong><span>${escape(node.name)}</span><small>${escape(node.qualityLabel)}</small></button>`;
}

function relationshipMarkup(source, destination, mode, sevenths, selectedPair) {
  const analysis = analyzeTransition(source, destination, mode, sevenths);
  const selected = selectedPair?.source === source.id && selectedPair?.destination === destination.id;
  const label = analysis.functionLabel || `${analysis.tones.commonCount} shared tone${analysis.tones.commonCount === 1 ? "" : "s"}`;
  return `<button class="harmony-edge${selected ? " selected" : ""}" data-harmony-transition="${escape(source.id)}|${escape(destination.id)}" aria-pressed="${selected}"><span><b>${escape(source.numeral)}</b> <span aria-hidden="true">→</span> <b>${escape(destination.numeral)}</b></span><small>${escape(label)}</small></button>`;
}

function explanationMarkup(source, destination, mode, sevenths) {
  if (!source || !destination) return `<div class="harmony-empty"><strong>Choose a transition</strong><p>Select a chord node or an arrow to see the musical reasoning.</p></div>`;
  const analysis = analyzeTransition(source, destination, mode, sevenths);
  const { tones, voiceLeading } = analysis;
  const noteList = (values, node) => values.length ? values.map((value) => toneName(node, value)).join(", ") : "None";
  const movement = voiceLeading.pairs.map((pair) => {
    const movementClass = pair.distance === 0 ? "movement-stay" : pair.distance === 1 ? "movement-semitone" : pair.distance === 2 ? "movement-whole" : "movement-wide";
    return `<span class="${movementClass}">${toneName(source, pair.from)} → ${toneName(destination, pair.to)} <b>${pair.distance === 0 ? "stays" : `moves ${pair.distance} semitone${pair.distance === 1 ? "" : "s"}`}</b></span>`;
  }).join("");
  const tendency = source.degree === 4 && destination.degree === 0 && source.pitchClasses.includes(destination.pitchClasses[0])
    ? `<p class="harmony-callout"><b>Tendency tones:</b> ${toneName(source, source.pitchClasses.find((value) => (value - destination.pitchClasses[0] + 12) % 12 === 11)) || "the leading tone"} tends upward to ${destination.root}; the seventh of ${source.name} can fall by semitone to the third of ${destination.name}.</p>`
    : "";
  return `<div class="harmony-explanation"><div class="harmony-transition-heading"><span>${escape(source.name)}</span><span aria-hidden="true">→</span><span>${escape(destination.name)}</span></div><p><b>${escape(source.numeral)} → ${escape(destination.numeral)}</b>${analysis.functionLabel ? `: ${escape(analysis.functionLabel)}` : ". This is a possible color or connection, not a rule."}</p><dl class="harmony-facts"><div><dt>Common tones</dt><dd>${escape(noteList(tones.common, source))} <small>(${tones.commonCount})</small></dd></div><div><dt>Only in ${escape(source.name)}</dt><dd>${escape(noteList(tones.sourceOnly, source))}</dd></div><div><dt>Only in ${escape(destination.name)}</dt><dd>${escape(noteList(tones.destinationOnly, destination))}</dd></div><div><dt>Similarity</dt><dd>${Math.round(tones.jaccard * 100)}% Jaccard <small>(set overlap, not a goodness score)</small></dd></div></dl><h4>Note movement</h4><div class="harmony-movements" aria-label="Note movement">${movement || "No direct note pairing"}</div>${voiceLeading.differentSizes ? `<p class="harmony-note">These chords have different numbers of tones. The closest tones are paired for illustration; ${voiceLeading.unmatchedSource.length + voiceLeading.unmatchedDestination.length} tone${voiceLeading.unmatchedSource.length + voiceLeading.unmatchedDestination.length === 1 ? " is" : "s are"} left unmatched rather than hidden.</p>` : ""}${tendency}<details><summary>Why these numbers?</summary><p>Voice-leading distance uses the shortest path around the twelve pitch classes. Common tones stay put; semitone, whole-tone, and larger movements are shown explicitly.</p></details></div>`;
}

function matrixMarkup(chords, mode, sevenths, selectedPair) {
  const cells = chords.map((source) => {
    const row = chords.map((destination) => {
      if (source.id === destination.id) return "<td class=\"matrix-self\">—</td>";
      const analysis = analyzeTransition(source, destination, mode, sevenths);
      const selected = selectedPair?.source === source.id && selectedPair?.destination === destination.id;
      const label = analysis.functionLabel || `${analysis.tones.commonCount} shared tones`;
      return `<td><button class="matrix-cell${selected ? " selected" : ""}" data-harmony-transition="${escape(source.id)}|${escape(destination.id)}" aria-label="${escape(source.name)} to ${escape(destination.name)}: ${escape(label)}"><b>${analysis.tones.commonCount}</b><small>${analysis.voiceLeading.totalDistance} move</small></button></td>`;
    }).join("");
    return `<tr><th scope="row">${escape(source.numeral)}<small>${escape(source.name)}</small></th>${row}</tr>`;
  }).join("");
  const headings = chords.map((chord) => `<th scope="col">${escape(chord.numeral)}<small>${escape(chord.name)}</small></th>`).join("");
  return `<section class="harmony-matrix" aria-labelledby="matrix-title"><div class="section-heading"><div><p class="eyebrow">Every direction</p><h3 id="matrix-title">Relationship matrix</h3></div><p class="harmony-help">Each cell is source → destination. Number = shared tones; movement = shortest pitch-class distance.</p></div><div class="matrix-scroll"><table><caption>Directional chord relationship matrix</caption><thead><tr><th scope="col">From \ To</th>${headings}</tr></thead><tbody>${cells}</tbody></table></div><p class="harmony-note">Select any cell for a detailed explanation. Function is modeled separately from similarity, so an overlap number never pretends to be a musical rating.</p></section>`;
}

export function renderHarmonyOutput({ keyValue, mode, includeSevenths, selectedNodeId, selectedPair, activeView = "map", trail = [] }) {
  const chords = generateDiatonicChords(keyValue, mode, includeSevenths);
  const selectedNode = chords.find((chord) => chord.id === selectedNodeId) ?? chords[0];
  const pair = selectedPair && chords.some((chord) => chord.id === selectedPair.source) && chords.some((chord) => chord.id === selectedPair.destination) ? selectedPair : null;
  const source = chords.find((chord) => chord.id === pair?.source) ?? selectedNode;
  const destination = chords.find((chord) => chord.id === pair?.destination);
  const progressionDestinations = new Set(chords.filter((chord) => chord.id !== selectedNode.id && analyzeTransition(selectedNode, chord, mode, includeSevenths).functionLabel).map((chord) => chord.id));
  const edges = (activeView === "progression"
    ? chords.filter((to) => progressionDestinations.has(to.id)).map((to) => relationshipMarkup(selectedNode, to, mode, includeSevenths, pair))
    : chords.flatMap((from) => chords.filter((to) => from.id !== to.id && (analyzeTransition(from, to, mode, includeSevenths).functionLabel || from.id === selectedNode.id || to.id === selectedNode.id)).map((to) => relationshipMarkup(from, to, mode, includeSevenths, pair)))).join("");
  const trailMarkup = trail.length ? trail.map((id, index) => { const chord = chords.find((item) => item.id === id); return chord ? `<span>${escape(chord.numeral)} <b>${escape(chord.name)}</b>${index < trail.length - 1 ? " → " : ""}</span>` : ""; }).join("") : "<span>Start by selecting a chord.</span>";
  const tabs = `<div class="harmony-view-tabs" role="tablist" aria-label="Harmony view"><button role="tab" aria-selected="${activeView === "map"}" data-harmony-view="map">Relationship map</button><button role="tab" aria-selected="${activeView === "progression"}" data-harmony-view="progression">Where next?</button><button role="tab" aria-selected="${activeView === "matrix"}" data-harmony-view="matrix">Relationship matrix</button></div>`;
  const header = `<header class="harmony-header"><div><p class="eyebrow">Harmony lab</p><h2>Chord progression explorer</h2><p>See how diatonic chords relate through tones, movement, and function. Similarity describes shared material; it does not decide what sounds good.</p></div>${tabs}</header>`;
  const keyStrip = `<section class="harmony-key-strip" aria-label="Diatonic chords in ${escape(keyValue)} ${escape(mode)}"><div><b>${escape(keyValue)} ${mode === "major" ? "major" : "natural minor"}</b><span>${includeSevenths ? "Seventh chords" : "Triads"} · ${chords.map((chord) => `${escape(chord.numeral)} ${escape(chord.name)}`).join(" · ")}</span></div><div class="harmony-legend"><span><i class="legend-dot tonic"></i>Tonic area</span><span><i class="legend-dot predominant"></i>Predominant</span><span><i class="legend-dot dominant"></i>Dominant</span></div></section>`;
  const body = activeView === "matrix" ? matrixMarkup(chords, mode, includeSevenths, pair) : `<div class="harmony-content"><section class="harmony-map-panel" aria-labelledby="harmony-map-title"><div class="section-heading"><div><p class="eyebrow">${activeView === "progression" ? "Possible destinations" : "Directed relationships"}</p><h3 id="harmony-map-title">${activeView === "progression" ? `From ${escape(selectedNode.name)}` : "Follow the arrows"}</h3></div><p class="harmony-help">${activeView === "progression" ? "Only conventional outgoing movements from the selected chord are shown. Choose a destination to continue the progression." : "Arrows are directional: D7 → G resolves differently from G → D7."}</p></div><div class="harmony-node-map">${chords.map((chord) => nodeMarkup(chord, selectedNode.id, activeView, progressionDestinations)).join("")}</div><div class="harmony-edges" aria-label="Accessible relationship list">${edges || `<div class="harmony-empty"><strong>No conventional destination is modeled yet.</strong><p>Select another chord or switch to Relationship map to explore other connections.</p></div>`}</div></section><aside class="harmony-detail-panel" aria-live="polite"><p class="eyebrow">Transition explanation</p>${explanationMarkup(source, destination, mode, includeSevenths)}<div class="harmony-trail"><div class="section-heading"><h3>Exploration trail</h3><div><button type="button" data-harmony-play${trail.length ? "" : " disabled"}>Play</button><button type="button" data-harmony-undo${trail.length ? "" : " disabled"}>Undo</button><button type="button" data-harmony-reset>Reset</button></div></div><div>${trailMarkup}</div></div></aside></div>`;
  return `<div class="harmony-shell">${header}${keyStrip}${body}</div>`;
}
