export function viewControlVisibility(view) {
  return {
    key: view === "fretboard" || view === "tuner",
    scale: view === "fretboard" || view === "tuner"
  };
}
