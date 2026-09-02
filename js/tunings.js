export const BUILT_IN_TUNINGS = [
  makeTuning("banjo5", "open-g", "Open G", "gDGBD", ["D4", "B3", "G3", "D3", "G4"], { droneIndex: 4 }),
  makeTuning("banjo5", "sawmill", "Sawmill / Mountain Minor", "gDGCD", ["D4", "C4", "G3", "D3", "G4"], { droneIndex: 4 }),
  makeTuning("banjo5", "double-c", "Double C", "gCGCD", ["D4", "C4", "G3", "C3", "G4"], { droneIndex: 4 }),
  makeTuning("banjo5", "standard-c", "Standard C", "gCGBD", ["D4", "B3", "G3", "C3", "G4"], { droneIndex: 4 }),

  makeTuning("banjo4", "tenor-standard", "Tenor (Standard)", "cGDA", ["C3", "G3", "D4", "A4"]),
  makeTuning("banjo4", "plectrum-standard", "Plectrum (Standard C)", "cGBD", ["C3", "G3", "B3", "D4"]),

  makeTuning("guitar", "guitar-standard", "Standard", "EADGBE", ["E2", "A2", "D3", "G3", "B3", "E4"]),

  makeTuning("bass", "bass-standard", "Standard", "EADG", ["E1", "A1", "D2", "G2"]),

  makeTuning("mandolin", "mandolin-standard", "Standard", "GDAE", ["G3", "D4", "A4", "E5"]),

  makeTuning("ukulele", "ukulele-c", "C Tuning (Reentrant)", "gCEA", ["G4", "C4", "E4", "A4"]),
  makeTuning("ukulele", "ukulele-d", "D Tuning (Reentrant)", "aDF#B", ["A4", "D4", "F#4", "B4"])
];

function makeTuning(instrument, id, name, shortName, pitches, options = {}) {
  const { droneIndex } = options;
  return {
    id,
    name,
    shortName,
    instrument,
    strings: pitches.map((pitch, index) => ({
      number: index + 1,
      pitch,
      kind: index === droneIndex ? "drone" : "long",
      ...(index === droneIndex ? { startsAtPhysicalFret: 5 } : {})
    }))
  };
}

export function createCustomTuning(name, pitches, options = {}) {
  if (!Array.isArray(pitches) || pitches.length < 1) throw new Error("A custom tuning requires at least one pitch");
  const instrument = options.instrument || (pitches.length === 5 ? "banjo5" : "custom");
  const droneIndex = options.droneIndex ?? (instrument === "banjo5" ? 4 : undefined);
  return makeTuning(instrument, "custom", name || "Custom", pitches.join(" "), pitches, { droneIndex });
}
