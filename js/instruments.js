export const INSTRUMENTS = [
  { id: "banjo5", name: "5-String Banjo", clef: "treble" },
  { id: "banjo4", name: "4-String Banjo", clef: "treble" },
  { id: "guitar", name: "Guitar", clef: "treble" },
  { id: "bass", name: "Bass Guitar", clef: "bass" },
  { id: "mandolin", name: "Mandolin", clef: "treble" },
  { id: "ukulele", name: "Ukulele", clef: "treble" }
];

export function getInstrument(id) {
  return INSTRUMENTS.find((instrument) => instrument.id === id);
}
