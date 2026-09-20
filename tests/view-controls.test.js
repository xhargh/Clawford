import test from "node:test";
import assert from "node:assert/strict";
import { viewControlHidden, viewControlVisibility } from "../js/view-controls.js";

test("shows the controls required by each view", () => {
  assert.deepEqual(viewControlVisibility("notation"), {
    instrument: true, tuning: true, key: true, scale: true,
    chordRoot: false, chordQuality: false, tunerControls: false, metronomeControls: false,
    notationOutput: true, fretboardOutput: false, tunerOutput: false, metronomeOutput: false
  });
  assert.deepEqual(viewControlVisibility("fretboard"), {
    instrument: true, tuning: true, key: false, scale: false,
    chordRoot: true, chordQuality: true, tunerControls: false, metronomeControls: false,
    notationOutput: false, fretboardOutput: true, tunerOutput: false, metronomeOutput: false
  });
  assert.deepEqual(viewControlVisibility("tuner"), {
    instrument: true, tuning: true, key: false, scale: false,
    chordRoot: false, chordQuality: false, tunerControls: true, metronomeControls: false,
    notationOutput: false, fretboardOutput: false, tunerOutput: true, metronomeOutput: false
  });
  assert.deepEqual(viewControlVisibility("metronome"), {
    instrument: false, tuning: false, key: false, scale: false,
    chordRoot: false, chordQuality: false, tunerControls: false, metronomeControls: true,
    notationOutput: false, fretboardOutput: false, tunerOutput: false, metronomeOutput: true
  });
});

test("hides only controls that are not available in each mode", () => {
  assert.deepEqual(viewControlHidden("fretboard"), {
    instrument: false, tuning: false, key: true, scale: true,
    chordRoot: false, chordQuality: false, tunerControls: true, metronomeControls: true,
    notationOutput: true, fretboardOutput: false, tunerOutput: true, metronomeOutput: true
  });
});
