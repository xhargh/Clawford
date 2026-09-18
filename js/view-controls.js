export function viewControlVisibility(view) {
  return {
    instrument: view !== "metronome",
    tuning: view !== "metronome",
    key: view === "fretboard" || view === "tuner" || view === "harmony",
    scale: view === "fretboard" || view === "tuner" || view === "harmony"
  };
}
