export function downloadSvg(svg, filename) {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    text { fill: #20231f; font-family: Arial, sans-serif; }
    .diagram-title { font-family: Georgia, serif; font-size: 18px; }
    .column-label, .degree-label, .empty-label, .string-number, .fret-number { fill: #687067; font-size: 11px; font-weight: bold; }
    .staff-line, .ledger-line, .stem, .fret, .nut, .string-line { stroke: #20231f; }
    .notehead { fill: #20231f; } .note-entry.tonic .notehead { fill: #285a45; stroke: #20231f; stroke-width: 2px; }
    .note-guide { fill: none; stroke: #c9cec4; } .clef { font-family: serif; font-size: 142px; }
    .accidental, .key-signature { font-family: serif; font-size: 22px; } .note-label { font-family: Georgia, serif; font-size: 20px; font-weight: bold; }
    .tonic .note-label { text-decoration: underline; } .scale-note:not(.tonic) .note-label { text-decoration: underline dotted; }
    .position-label { font-family: monospace; font-size: 17px; font-weight: bold; }
    .fret-note circle { fill: #fff; stroke: #8b9188; stroke-width: 1; } .fret-note.scale-note circle { stroke: #285a45; stroke-width: 3; } .fret-note text { font-size: 11px; font-weight: bold; }
    .fret-note.tonic circle { fill: #285a45; stroke: #20231f; stroke-width: 3; } .fret-note.tonic text { fill: #fff; text-decoration: underline; }
    .fret-note.open circle { stroke-dasharray: 3 2; }
  `;
  clone.prepend(style);
  const source = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function combineSvgs(svgs) {
  const availableSvgs = svgs.filter(Boolean);
  if (!availableSvgs.length) return null;
  const namespace = "http://www.w3.org/2000/svg";
  const combined = document.createElementNS(namespace, "svg");
  const dimensions = availableSvgs.map((svg) => svg.viewBox.baseVal);
  const width = Math.max(...dimensions.map((box) => box.width));
  const height = dimensions.reduce((total, box) => total + box.height, 0);
  combined.setAttribute("viewBox", `0 0 ${width} ${height}`);
  combined.setAttribute("role", "img");
  combined.setAttribute("aria-label", "Banjo notation and fretboard reference");
  let y = 0;
  availableSvgs.forEach((svg, index) => {
    const nested = document.createElementNS(namespace, "g");
    nested.setAttribute("transform", `translate(0 ${y})`);
    for (const child of [...svg.children]) {
      if (index > 0 && (child.localName === "title" || child.localName === "desc")) continue;
      nested.append(child.cloneNode(true));
    }
    combined.append(nested);
    y += dimensions[index].height;
  });
  return combined;
}
