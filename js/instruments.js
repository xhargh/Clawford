export const INSTRUMENTS = [
  { id: "banjo5", name: "5-String Banjo" },
  { id: "banjo4", name: "4-String Banjo" },
  { id: "guitar", name: "Guitar" },
  { id: "bass", name: "Bass Guitar" },
  { id: "mandolin", name: "Mandolin" },
  { id: "ukulele", name: "Ukulele" }
];

export function getInstrument(id) {
  return INSTRUMENTS.find((instrument) => instrument.id === id);
}
