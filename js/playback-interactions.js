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

export function replaceChildrenIfChanged(element, children, key = (child) => child) {
  const nextKeys = children.map(key);
  const currentKeys = [...element.children].map(key);
  if (nextKeys.length === currentKeys.length && nextKeys.every((value, index) => value === currentKeys[index])) return false;
  element.replaceChildren(...children);
  return true;
}
