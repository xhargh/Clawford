import { CHORD_SHAPES } from "./chord-shape-data.js";
import { validateChordShape } from "./chord-shape-validator.js";

export { validateChordShape };

function tuningName(tuning) {
  const value = tuning?.shortName || tuning?.strings?.filter((string) => string.kind !== "drone").map((string) => string.pitch.replace(/[0-9]/g, "")).reverse().join("");
  return value?.replace(/^([a-g])/, (_, note) => note.toUpperCase());
}

export function getChordShapes({ instrumentId, tuning, rootPitchClass, qualityId }) {
  const name = tuningName(tuning);
  return CHORD_SHAPES
    .filter((shape) => shape.instrument === instrumentId && shape.tuning.replace(/^([a-g])/, (_, note) => note.toUpperCase()) === name && shape.rootPitchClass === rootPitchClass && shape.qualityId === qualityId)
    .filter((shape) => validateChordShape(shape, tuning))
    .map((shape) => ({ ...shape, id: shape.id || `${shape.instrument}:${shape.tuning}:${shape.rootPitchClass}:${shape.qualityId}:${shape.frets.join(",")}` }))
    .sort((a, b) => (a.tags.includes("preferred") ? -1 : 0) - (b.tags.includes("preferred") ? -1 : 0) || Math.max(...a.frets, 0) - Math.max(...b.frets, 0));
}

export function getPreferredChordShape(options) {
  return getChordShapes(options)[0] || null;
}
