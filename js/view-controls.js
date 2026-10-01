export function viewControlVisibility(view) {
  return {
    instrument: view !== "metronome",
    tuning: view !== "metronome" && view !== "play-along",
    key: view === "notation" || view === "ear-training" || view === "play-along",
    scale: view === "notation" || view === "ear-training",
    chordRoot: view === "fretboard",
    chordQuality: view === "fretboard",
    tunerControls: view === "tuner",
    metronomeControls: view === "metronome",
    earTrainingControls: view === "ear-training",
    playAlongControls: view === "play-along",
    notationOutput: view === "notation",
    fretboardOutput: view === "fretboard",
    tunerOutput: view === "tuner",
    metronomeOutput: view === "metronome",
    earTrainingOutput: view === "ear-training",
    playAlongOutput: view === "play-along"
  };
}

export function viewControlHidden(view) {
  return Object.fromEntries(Object.entries(viewControlVisibility(view)).map(([control, visible]) => [control, !visible]));
}
