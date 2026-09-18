import test from "node:test";
import assert from "node:assert/strict";
import { analyzeTransition, chordToneAnalysis, functionalRelationship, generateDiatonicChords, pitchClassDistance, voiceLeadingAnalysis } from "../js/harmony.js";
import { renderHarmonyOutput } from "../js/harmony-renderer.js";

test("generates correctly spelled major and natural-minor diatonic triads", () => {
  const g = generateDiatonicChords("G", "major");
  assert.deepEqual(g.map((chord) => chord.name), ["G", "Am", "Bm", "C", "D", "Em", "F#°"]);
  assert.deepEqual(generateDiatonicChords("Eb", "major").map((chord) => chord.root), ["Eb", "F", "G", "Ab", "Bb", "C", "D"]);
  assert.deepEqual(generateDiatonicChords("A", "natural-minor").map((chord) => chord.name), ["Am", "B°", "C", "Dm", "Em", "F", "G"]);
});

test("derives seventh qualities, including dominant seventh V", () => {
  const chords = generateDiatonicChords("G", "major", true);
  assert.equal(chords[4].name, "D7");
  assert.deepEqual(chords[4].toneNames, ["D", "F#", "A", "C"]);
});

test("calculates chord intersections and Jaccard similarity independently from function", () => {
  const chords = generateDiatonicChords("G");
  const [g, ii, , , d, em] = chords;
  assert.deepEqual(chordToneAnalysis(g, em), { common: [7, 11], sourceOnly: [2], destinationOnly: [4], commonCount: 2, jaccard: 0.5 });
  assert.equal(chordToneAnalysis(g, chords[1]).commonCount, 0);
  assert.equal(functionalRelationship(ii, d), "predominant -> dominant");
  assert.equal(functionalRelationship(d, g), "strong dominant resolution");
});

test("uses shortest pitch-class distance and economical voice leading", () => {
  assert.equal(pitchClassDistance(11, 0), 1);
  const d7 = generateDiatonicChords("G", "major", true)[4];
  const g = generateDiatonicChords("G")[0];
  const analysis = voiceLeadingAnalysis(d7, g);
  assert.equal(analysis.differentSizes, true);
  assert.ok(analysis.pairs.some((pair) => pair.from === 6 && pair.to === 7 && pair.distance === 1));
  assert.ok(analysis.pairs.some((pair) => pair.from === 0 && pair.to === 11 && pair.distance === 1));
  assert.ok(analyzeTransition(d7, g, "major", true).functionLabel.includes("dominant"));
});

test("keeps directional relationships distinct", () => {
  const [g, , , , d] = generateDiatonicChords("G");
  assert.equal(functionalRelationship(d, g), "strong dominant resolution");
  assert.notEqual(functionalRelationship(g, d), functionalRelationship(d, g));
});

test("renders accessible map, progression, and matrix views", () => {
  const output = renderHarmonyOutput({ keyValue: "G", mode: "major", includeSevenths: true, activeView: "map" });
  assert.match(output, /data-harmony-node=/);
  assert.match(output, /D7/);
  assert.match(output, /aria-label="Accessible relationship list"/);
  assert.match(renderHarmonyOutput({ keyValue: "G", mode: "major", includeSevenths: false, activeView: "matrix" }), /Directional chord relationship matrix/);
  assert.match(renderHarmonyOutput({ keyValue: "A", mode: "natural-minor", includeSevenths: false, activeView: "progression" }), /Where next\?/);
});

test("makes progression view source-focused instead of rendering the full map", () => {
  const chords = generateDiatonicChords("G", "major");
  const map = renderHarmonyOutput({ keyValue: "G", mode: "major", selectedNodeId: chords[4].id, activeView: "map" });
  const progression = renderHarmonyOutput({ keyValue: "G", mode: "major", selectedNodeId: chords[4].id, activeView: "progression" });
  assert.match(map, /data-harmony-transition="G-major-0-3\|G-major-4-3"/);
  assert.doesNotMatch(progression, /data-harmony-transition="G-major-0-3\|G-major-4-3"/);
  assert.match(progression, /data-harmony-transition="G-major-4-3\|G-major-0-3"/);
  assert.match(progression, /progression-destination/);
  assert.match(progression, /progression-other/);
});

test("renders trail playback and undo controls", () => {
  const empty = renderHarmonyOutput({ keyValue: "G", mode: "major", trail: [] });
  assert.match(empty, /data-harmony-play disabled/);
  assert.match(empty, /data-harmony-undo disabled/);
  const chords = generateDiatonicChords("G", "major");
  const output = renderHarmonyOutput({ keyValue: "G", mode: "major", trail: chords.slice(0, 2).map((chord) => chord.id) });
  assert.match(output, /data-harmony-play/);
  assert.doesNotMatch(output, /data-harmony-play disabled/);
  assert.match(output, /data-harmony-undo/);
});
