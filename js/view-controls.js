export function viewControlVisibility(view) {
  return {
    instrument: view !== "metronome",
    tuning: view !== "metronome",
    key: view === "notation",
    scale: view === "notation",
    chordRoot: view === "fretboard",
    chordQuality: view === "fretboard",
    tunerControls: view === "tuner",
    metronomeControls: view === "metronome",
    notationOutput: view === "notation",
    fretboardOutput: view === "fretboard",
    tunerOutput: view === "tuner",
    metronomeOutput: view === "metronome"
  };
}

export function viewControlHidden(view) {
  return Object.fromEntries(Object.entries(viewControlVisibility(view)).map(([control, visible]) => [control, !visible]));
}
