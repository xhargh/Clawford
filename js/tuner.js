import { midiToPitch, pitchToMidi } from "./pitch.js";

export function selectTunerTargets({ mode = "chromatic", tuning } = {}) {
  if (mode === "tuning") {
    if (!tuning || !Array.isArray(tuning.strings)) throw new Error("A tuning is required for tuning targets");
    return tuning.strings.map((string) => ({ string: string.number, pitch: string.pitch, midi: pitchToMidi(string.pitch) }));
  }
  if (mode !== "chromatic") throw new Error(`Invalid tuner mode: ${mode}`);
  return Array.from({ length: 128 }, (_, midi) => ({ midi, pitch: midiToPitch(midi) }));
}
