import { getChordQuality } from "./chords.js";
import { pitchToMidi } from "./pitch.js";

export function validateChordShape(shape, tuning) {
  if (!shape || !tuning || !Array.isArray(shape.frets)) return false;
  const strings = tuning.strings.filter((string) => string.kind !== "drone");
  if (shape.stringOrder !== "tuning") strings.sort((a, b) => pitchToMidi(a.pitch) - pitchToMidi(b.pitch));
  if (shape.frets.length !== strings.length) return false;
  if (shape.fingers && (shape.fingers.length !== strings.length || shape.fingers.some((finger) => !Number.isInteger(finger) || finger < 0 || finger > 4))) return false;
  const quality = getChordQuality(shape.qualityId);
  if (!quality || !Number.isInteger(shape.rootPitchClass)) return false;
  const pitchClasses = new Set(quality.intervals.map((interval) => (shape.rootPitchClass + interval) % 12));
  const sounding = [];
  for (let index = 0; index < strings.length; index += 1) {
    const fret = shape.frets[index];
    const finger = shape.fingers?.[index] ?? 0;
    if (!Number.isInteger(fret) || fret < -1 || (fret === 0 && finger !== 0) || (fret === -1 && finger !== 0)) return false;
    if (fret >= 0) sounding.push((pitchToMidi(strings[index].pitch) + fret) % 12);
    if (fret >= 0 && !pitchClasses.has(sounding.at(-1))) return false;
  }
  for (const interval of quality.intervals) {
    const required = (shape.rootPitchClass + interval) % 12;
    const isFifth = interval === 7;
    if (!isFifth && !sounding.includes(required)) return false;
  }
  if (shape.drone && !["open", "mute"].includes(shape.drone.state)) return false;
  return true;
}
