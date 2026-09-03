export function selectedFretsFromVoicing(voicing) {
  return new Map((voicing?.notes ?? []).map((note) => [note.string, note.fret]));
}

export function selectTone(selectedFretsByString, string, fret) {
  const next = new Map(selectedFretsByString);
  next.set(string, fret);
  return next;
}

export function crossedStrings(previousX, currentX, stringPositions, includeStart = false) {
  if (currentX === previousX) return [];
  const movingRight = currentX > previousX;
  return [...stringPositions]
    .filter(([, x]) => movingRight
      ? x <= currentX && (includeStart ? x >= previousX : x > previousX)
      : x >= currentX && (includeStart ? x <= previousX : x < previousX))
    .sort((a, b) => movingRight ? a[1] - b[1] : b[1] - a[1])
    .map(([string]) => string);
}
