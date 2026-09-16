import { centsOffset, frequencyToNote, midiToPitch, pitchToMidi } from "./pitch.js";

export function selectTunerTargets({ mode = "chromatic", tuning } = {}) {
  if (mode === "tuning") {
    if (!tuning || !Array.isArray(tuning.strings)) throw new Error("A tuning is required for tuning targets");
    return tuning.strings.map((string) => ({ string: string.number, pitch: string.pitch, midi: pitchToMidi(string.pitch) }));
  }
  if (mode !== "chromatic") throw new Error(`Invalid tuner mode: ${mode}`);
  return Array.from({ length: 128 }, (_, midi) => ({ midi, pitch: midiToPitch(midi) }));
}

export function selectTunerTarget({ frequency, mode = "chromatic", tuning, a4 = 440 } = {}) {
  const targets = selectTunerTargets({ mode, tuning });
  if (mode === "chromatic") {
    const note = frequencyToNote(frequency, { a4 });
    return { ...targets[note.midi], note: note.note, cents: centsOffset(frequency, note.midi, { a4 }) };
  }
  return targets.reduce((closest, target) => {
    const cents = centsOffset(frequency, target.midi, { a4 });
    return !closest || Math.abs(cents) < Math.abs(closest.cents) ? { ...target, cents } : closest;
  }, null);
}
