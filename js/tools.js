export const TOOL_CATEGORIES = [
  { id: "explore", name: "Explore" },
  { id: "practice", name: "Practice" }
];

export const TOOLS = [
  { id: "notation", name: "Notation", category: "explore", description: "Explore written musical notes." },
  { id: "fretboard", name: "Fretboard", category: "explore", description: "Explore notes, scales, and chords on the neck." },
  { id: "tuner", name: "Tuner", category: "practice", description: "Tune your instrument." },
  { id: "metronome", name: "Metronome", category: "practice", description: "Find and keep your pulse." },
  { id: "ear-training", name: "Ear training", category: "practice", description: "Listen, then find the note." },
  { id: "play-along", name: "Play along", category: "practice", description: "Practice chords and patterns in time." }
];

export function getTool(id) {
  return TOOLS.find((tool) => tool.id === id) || TOOLS[0];
}
