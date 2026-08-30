export const BUILT_IN_TUNINGS = [
  makeTuning("open-g", "Open G", "gDGBD", ["D4", "B3", "G3", "D3", "G4"]),
  makeTuning("sawmill", "Sawmill / Mountain Minor", "gDGCD", ["D4", "C4", "G3", "D3", "G4"]),
  makeTuning("double-c", "Double C", "gCGCD", ["D4", "C4", "G3", "C3", "G4"]),
  makeTuning("standard-c", "Standard C", "gCGBD", ["D4", "B3", "G3", "C3", "G4"])
];

function makeTuning(id, name, shortName, pitches) {
  return {
    id,
    name,
    shortName,
    strings: pitches.map((pitch, index) => ({
      number: index + 1,
      pitch,
      kind: index === 4 ? "drone" : "long",
      ...(index === 4 ? { startsAtPhysicalFret: 5 } : {})
    }))
  };
}

export function createCustomTuning(name, pitches) {
  if (!Array.isArray(pitches) || pitches.length !== 5) throw new Error("A custom tuning requires five pitches");
  return makeTuning("custom", name || "Custom", pitches.join(" "), pitches);
}
