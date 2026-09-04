import { pitchToMidi } from "./pitch.js";
import { scalePitchClasses, spellScale } from "./scales.js";

export function generateScaleBoardNotes(tuning, root, scale, options = {}) {
  const { displayMaxFret = 5, selectedFretsByString } = options;
  const pitchClasses = scalePitchClasses(root.pitchClass, scale.intervals);
  const pitchClassSet = new Set(pitchClasses);
  const names = spellScale(root, scale);
  const tones = [];

  for (const string of tuning.strings.filter((item) => item.kind !== "drone")) {
    const openMidi = pitchToMidi(string.pitch);
    const availableFrets = [];
    for (let fret = 0; fret <= displayMaxFret; fret += 1) {
      if (pitchClassSet.has((openMidi + fret) % 12)) availableFrets.push(fret);
    }
    const requestedFret = selectedFretsByString?.get(string.number);
    const selectedFret = availableFrets.includes(requestedFret) ? requestedFret : availableFrets[0];

    for (const fret of availableFrets) {
      const midi = openMidi + fret;
      const pitchClass = midi % 12;
      tones.push({
        string: string.number,
        fret,
        midi,
        pitchClass,
        noteName: names[pitchClasses.indexOf(pitchClass)],
        isOpen: fret === 0,
        isRoot: pitchClass === root.pitchClass,
        isSelected: fret === selectedFret
      });
    }
  }

  return { displayMaxFret, tones };
}
