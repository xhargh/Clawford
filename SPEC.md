# Banjo Note-to-Fret Diagram Generator — Specification

## 1. Overview

Build a small client-side web application that generates note-to-string/fret reference diagrams for 5-string banjo.

The application is intended primarily as a learning and reference tool for players who read standard notation and want to quickly answer:

> "Where can I play this written note on the banjo in the current tuning?"

The generated diagram should resemble a compact translation table between standard music notation and banjo positions. For example, in Open G tuning:

- D → `4:0`
- E → `4:2`
- F# → `4:4`
- G → `4:5` or `3:0`
- A → `3:2`
- B → `3:4` or `2:0`
- C → `2:1`
- D → `2:3` or `1:0`

The app must support multiple banjo tunings, multiple musical keys/scales, alternate fretboard positions, and responsive layouts for both desktop and mobile.

The application should run entirely in the browser using HTML, CSS, and JavaScript.

---

## 2. Goals

### Primary goals

1. Generate a correct note-to-string/fret diagram for any supported 5-string banjo tuning.
2. Let the user select a musical key and scale.
3. Show all valid string/fret positions for each displayed note within a configurable fret range.
4. Make the relationship between:
   - standard notation,
   - pitch name,
   - string number,
   - fret number,
   easy to understand.
5. Work well on phones, tablets, and desktop browsers.
6. Produce diagrams suitable for:
   - on-screen reference,
   - printing,
   - saving as an image or SVG.
7. Require no server.

### Secondary goals

- Make it easy to add new tunings.
- Keep tuning definitions data-driven.
- Allow configurable position-selection rules.
- Support both simple beginner diagrams and more complete advanced diagrams.

---

## 3. Non-goals

The first version is **not** intended to be:

- a tablature editor,
- a sheet-music editor,
- an audio pitch detector,
- an automatic transcription tool,
- a MIDI sequencer,
- a complete music-theory application,
- a chord-diagram generator,
- a banjo lesson application.

These may be added later but should not complicate the initial architecture.

---

## 4. Musical assumptions

### 4.1 String numbering

Use conventional 5-string banjo numbering:

| String | Description |
|---|---|
| 1 | highest-pitched long string |
| 2 | second long string |
| 3 | third long string |
| 4 | lowest-pitched long string |
| 5 | short drone string |

For Open G:

| String | Open pitch |
|---|---|
| 1 | D4 |
| 2 | B3 |
| 3 | G3 |
| 4 | D3 |
| 5 | G4 |

Internally, pitches must include octave information. Displaying octave numbers to the user should be optional.

### 4.2 Fret notation

The main compact notation is:

`string:fret`

Examples:

- `1:0` = open first string
- `2:3` = third fret, second string
- `3:4` = fourth fret, third string

Multiple possible locations are separated visually, for example:

`4:5 / 3:0`

The app must never assume that a note has only one playable position.

### 4.3 Fifth-string behavior

The fifth string requires special handling because it starts partway up the neck.

For pitch calculations, treat the open fifth string as its configured pitch, normally G4 in Open G.

The application must support two fifth-string fret-numbering display modes:

1. **Physical fret number**
   - The number corresponds to the fret position on the banjo neck.
   - Example: a fifth-string note two semitones above open G may be shown at physical fret 7.

2. **Relative fret number**
   - Open fifth string is `5:0`.
   - Two semitones above open is `5:2`.

Default: **physical fret number**, because it corresponds to the visible fret on the instrument.

The fifth string should be configurable as:

- included,
- excluded,
- drone-only.

Default for note-reading diagrams: **excluded**, since beginners commonly learn melodic note locations first on strings 1–4.

### 4.4 Written vs sounding pitch

Banjo notation conventions may treat written pitch differently from sounding pitch.

The pitch model must therefore separate:

- internal concert/sounding pitch,
- displayed written pitch.

Provide a setting:

- `Written pitch`
- `Sounding pitch`

Default: `Written pitch`.

Standard five-string banjo notation is written one octave above sounding pitch. For example, sounding `D3` is placed on the staff as written `D4`; this does not change its string/fret mapping.

The exact octave convention must be isolated in one conversion function rather than spread throughout the application.

---

## 5. Built-in tunings

Initial release must include at least:

### Open G

`gDGBD`

| String | Pitch |
|---|---|
| 5 | G4 |
| 4 | D3 |
| 3 | G3 |
| 2 | B3 |
| 1 | D4 |

### Sawmill / Mountain Minor

`gDGCD`

| String | Pitch |
|---|---|
| 5 | G4 |
| 4 | D3 |
| 3 | G3 |
| 2 | C4 |
| 1 | D4 |

### Double C

`gCGCD`

| String | Pitch |
|---|---|
| 5 | G4 |
| 4 | C3 |
| 3 | G3 |
| 2 | C4 |
| 1 | D4 |

### Standard C

`gCGBD`

| String | Pitch |
|---|---|
| 5 | G4 |
| 4 | C3 |
| 3 | G3 |
| 2 | B3 |
| 1 | D4 |

The tuning system must be data-driven so additional tunings can be added without changing the mapping algorithm.

---

## 6. Custom tunings

Custom tuning is not exposed in the simplified interface. The underlying tuning model remains data-driven so additional tunings can be added later without changing the mapping algorithm.

For each string:

- note name,
- accidental,
- octave.

Example:

```text
5: A4
4: D3
3: A3
2: C#4
1: E4
```

The application does not persist custom tunings.

Validation must reject impossible or malformed pitch names but should not impose assumptions about traditional banjo tunings.

---

## 7. Keys and scales

Tuning determines **where notes are playable**.

Key/scale determines **which notes are emphasized or included**.

These concepts must remain separate internally.

### 7.1 Supported keys

Support all 12 chromatic tonic pitches, using context-appropriate enharmonic spelling where practical:

- C
- C# / Db
- D
- D# / Eb
- E
- F
- F# / Gb
- G
- G# / Ab
- A
- A# / Bb
- B

### 7.2 Initial scales

At minimum:

- Major
- Natural minor
- Major pentatonic
- Minor pentatonic
- Mixolydian
- Dorian

Optional later additions:

- Aeolian
- Ionian
- Phrygian
- Lydian
- Locrian
- harmonic minor
- melodic minor

### 7.3 Scale behavior

The diagram always displays scale notes only. There is no all-chromatic display toggle.

For a G-major diagram, the displayed pitch classes would therefore be:

G A B C D E F#

across the selected octave/range.

### 7.4 Enharmonic spelling

The notation layer should prefer musically sensible note spelling for the selected key.

Examples:

- G major → F#, not Gb
- F major → Bb, not A#
- D major → F# and C#

Pitch identity and note spelling must be separate concepts internally.

Internally, C# and Db can both map to pitch class `1`, but the notation renderer must display the appropriate spelling.

---

## 8. Display range

The generated pitch range is determined automatically. Note-range and staff-range controls are not exposed.

### 8.1 Automatic

Determine a useful range from:

- selected tuning,
- selected maximum fret,
- included strings.

### 8.2 Note range

Example:

- lowest note: D3
- highest note: G4

### 8.3 Staff range

Allow the user to extend the diagram by a chosen number of ledger lines.

Default for Open G beginner mode should approximately cover the useful first-position range on strings 1–4.

---

## 9. Maximum fret

The maximum fret is fixed at `5`.

A low maximum fret is useful for beginner translation charts.

A higher maximum fret exposes alternative positions.

---

## 10. Position-generation algorithm

For each pitch in the selected diagram range:

1. Convert the target note to an absolute chromatic pitch value.
2. For every enabled string:
   1. get the open-string pitch,
   2. calculate semitone distance from the open string,
   3. reject negative distances,
   4. convert distance to fret position,
   5. reject positions beyond the configured maximum fret,
   6. account for fifth-string fret-numbering rules.
3. Store every valid position.
4. Sort positions according to the selected preference.
5. Render one or more positions.

The mapping algorithm must not contain hard-coded Open G note mappings.

---

## 11. Position preference

The interface always shows every valid position. Position-preference controls are not exposed.

Example:

```text
G    4:5 / 3:0
B    3:4 / 2:0
D    2:3 / 1:0
```

---

## 12. Main generated diagram

The primary output should visually resemble a notation reference card.

One shared staff represents the complete displayed pitch range. String/fret positions are arranged from low at the bottom to high at the top in four fixed string columns.

Recommended layout:

```text
String 4    String 3    String 2    String 1
4:5         3:0
```

The renderer must not repeat a complete staff for every note. On narrow screens, the diagram may scroll within its frame if needed.

### Required information

The diagram shows string/fret positions at their written staff pitch. Note spelling is communicated by vertical placement and the conventional key signature rather than noteheads or separate note-name labels.

A string-column layout places positions in four fixed columns ordered `4, 3, 2, 1` from left to right. Each position remains vertically aligned to its written staff pitch. This is the only notation layout, and fifth-string positions are omitted.

### Optional information

- tonic highlighting,
- open-string highlighting,
- preferred-position highlighting,
- fifth-string marker,
- interval from tonic.

---

## 13. Staff notation rendering

Prefer SVG for notation because it:

- scales cleanly,
- prints well,
- works on high-DPI phones,
- can be exported,
- allows precise positioning.

The implementation may either:

1. render notation using a lightweight music-notation library, or
2. draw the limited notation required by this application directly in SVG.

Because this application only needs isolated notes on a staff, a custom SVG renderer is acceptable and may be simpler than a full notation engine.

The renderer must support:

- treble clef,
- five staff lines,
- sharps,
- flats,
- conventional key signatures,
- four staff-aligned string/fret columns.

Accidentals that belong to the selected key and scale appear in the key signature.

The diagram does not need rhythm notation.

---

## 14. Alternative fretboard view

In addition to the staff translation diagram, provide an optional **fretboard view**.

It should show:

- strings,
- frets,
- note names,
- scale notes,
- root notes,
- open strings.

This view is useful for understanding the tuning itself.

The staff diagram remains the primary view.

Suggested view selector:

- `Notation`
- `Fretboard`

Default: `Notation`.

---

## 15. Controls

- Tuning
- Key
- Scale
- View mode

There is no Advanced section. Removed settings remain fixed at their defaults: fret 5 maximum, fifth string excluded, all positions shown, scale notes only, automatic range, written pitch, key-based spelling, normal staff size, octave/degree labels hidden, and String columns notation layout.

---

## 16. Responsive layout

The application must be designed mobile-first.

### Mobile

Target widths down to approximately 320 px.

Layout:

```text
┌─────────────────────────┐
│ Banjo Note Map          │
├─────────────────────────┤
│ Tuning     [Open G ▼]   │
│ Key        [G ▼]        │
│ Scale      [Major ▼]    │
│ Max fret   [5 ▼]        │
│                         │
│ [More settings]         │
├─────────────────────────┤
│       GENERATED         │
│        DIAGRAM          │
│                         │
└─────────────────────────┘
```

Requirements:

- no horizontal page scrolling,
- touch targets at least approximately 44×44 CSS px,
- readable without pinch zoom,
- generated diagram may scale to fit width,
- controls should use native mobile-friendly inputs where practical.

### Desktop

At larger widths, use a two-column layout:

```text
┌─────────────────────────────────────────────────┐
│ Banjo Note-to-Fret Diagram                      │
├───────────────┬─────────────────────────────────┤
│               │                                 │
│ Settings      │        Generated diagram        │
│               │                                 │
│               │                                 │
└───────────────┴─────────────────────────────────┘
```

Suggested breakpoint: approximately `800px`.

The settings panel may be sticky while scrolling the diagram.

---

## 17. Print mode

Provide print-specific CSS.

When printing:

- hide interactive controls,
- hide buttons,
- maximize diagram width,
- use a white background,
- avoid splitting a compact diagram across pages,
- include a small title describing the configuration.

Example title:

```text
5-String Banjo — Open G — G Major — Frets 0–5
```

The printed result should work well on A4 and Letter paper.

---

## 18. Export

The simplified interface does not provide Print, Download SVG, or Download PNG actions.

---

## 19. URL state

The current diagram configuration should be serializable into the URL query string.

Example:

```text
?tuning=open-g&key=G&scale=major&maxFret=5&fifth=false
```

Benefits:

- diagrams can be bookmarked,
- links can be shared,
- browser refresh preserves the configuration.

URL state should take precedence over stored defaults.

---

## 20. Local persistence

Use `localStorage` for:

- last selected tuning,
- last selected key,
- last selected scale,
- last maximum fret,
- UI preferences,

Do not require cookies or accounts.

---

## 21. Suggested data model

### Tuning

```js
{
  id: "open-g",
  name: "Open G",
  shortName: "gDGBD",
  strings: [
    { number: 1, pitch: "D4", kind: "long" },
    { number: 2, pitch: "B3", kind: "long" },
    { number: 3, pitch: "G3", kind: "long" },
    { number: 4, pitch: "D3", kind: "long" },
    {
      number: 5,
      pitch: "G4",
      kind: "drone",
      startsAtPhysicalFret: 5
    }
  ]
}
```

### Scale

```js
{
  id: "major",
  name: "Major",
  intervals: [0, 2, 4, 5, 7, 9, 11]
}
```

### Generated note

```js
{
  midi: 67,
  pitchClass: 7,
  noteName: "G",
  octave: 4,
  scaleDegree: 1,
  positions: [
    {
      string: 1,
      fret: 5,
      physicalFret: 5
    },
    {
      string: 5,
      fret: 0,
      physicalFret: 5
    }
  ]
}
```

---

## 22. Internal pitch representation

Use a numeric chromatic pitch representation internally.

MIDI note numbers are suitable even though the application does not initially use MIDI.

For example:

```text
C4 = 60
C#4 = 61
D4 = 62
...
```

Functions should include:

```js
parsePitch("F#4")
pitchToMidi(...)
midiToPitch(...)
getPitchClass(...)
transpose(...)
```

Rendering code must not perform pitch arithmetic directly.

---

## 23. Suggested module structure

The application should remain understandable without a framework.

Suggested structure:

```text
/
├── index.html
├── css/
│   ├── app.css
│   └── print.css
├── js/
│   ├── app.js
│   ├── state.js
│   ├── pitch.js
│   ├── tunings.js
│   ├── scales.js
│   ├── mapping.js
│   ├── notation-renderer.js
│   ├── fretboard-renderer.js
│   ├── export.js
│   └── storage.js
├── tests/
│   ├── pitch.test.js
│   ├── mapping.test.js
│   └── scales.test.js
└── SPEC.md
```

Plain ES modules are preferred.

A build step should not be required for the initial version.

---

## 24. Framework and dependency policy

Preferred implementation:

- semantic HTML5,
- CSS,
- vanilla JavaScript with ES modules,
- SVG for generated graphics.

Avoid a frontend framework unless it provides a clear benefit.

The application should ideally work by serving the directory from any simple static HTTP server.

If a notation library is used, keep dependencies minimal and isolate it behind the notation-renderer module.

---

## 25. Accessibility

The UI should meet basic WCAG expectations.

Requirements:

- all controls have visible labels,
- keyboard-accessible controls,
- sufficient contrast,
- do not communicate musical meaning using color alone,
- exported diagrams remain understandable in grayscale,
- SVG elements should have meaningful accessible text where practical.

Example row accessible text:

```text
G4: third string open, or fourth string fifth fret.
```

---

## 26. Visual design

The visual style should be clean and utilitarian, resembling a good printed music reference sheet rather than a decorative music app.

Priorities:

1. clarity,
2. readability,
3. compactness,
4. musical correctness,
5. attractive appearance.

Use a neutral UI around the diagram.

The generated diagram should look good in black and white.

Root-note and preferred-position emphasis may use subtle color on screen but must also have a non-color distinction.

---

## 27. Example: Open G, G major, frets 0–5

With:

- tuning: Open G
- key: G
- scale: Major
- fifth string: excluded
- max fret: 5
- positions: show all

the mapping around the common first position should include:

| Note | Position |
|---|---|
| D3 | `4:0` |
| E3 | `4:2` |
| F#3 | `4:4` |
| G3 | `4:5 / 3:0` |
| A3 | `3:2` |
| B3 | `3:4 / 2:0` |
| C4 | `2:1` |
| D4 | `2:3 / 1:0` |
| E4 | `1:2` |
| F#4 | `1:4` |
| G4 | `1:5` |

This is an important reference case and should become an automated test.

If the fifth string is enabled, G4 should additionally include the open fifth string according to the selected fifth-string notation convention.

---

## 28. Testing

The pitch and fret mapping logic must have automated tests.

### Required mapping tests

For Open G:

```text
D3 -> 4:0
E3 -> 4:2
F#3 -> 4:4
G3 -> 4:5 and 3:0
A3 -> 3:2
B3 -> 3:4 and 2:0
C4 -> 2:1
D4 -> 2:3 and 1:0
E4 -> 1:2
F#4 -> 1:4
G4 -> 1:5
```

Tests must also cover:

- Double C,
- Sawmill,
- custom tuning,
- notes outside playable range,
- maximum-fret filtering,
- fifth-string handling,
- enharmonic spelling,
- scale generation.

### Responsive testing

Manually verify at minimum:

- 320×568
- 375×667
- 390×844
- 768×1024
- 1366×768
- 1920×1080

---

## 29. Error handling

The app should fail gracefully.

Examples:

### Invalid custom pitch

Show:

```text
Invalid pitch: H3
```

### No playable positions

A note can either:

- be omitted, or
- be shown with `—`

depending on user preference.

Default: omit notes with no playable positions.

### URL configuration error

Ignore invalid parameters individually and fall back to defaults.

The app must still load.

---

## 30. Initial UI defaults

The simplified interface fixes the following behavior:

```text
Tuning: Open G
Key: G
Scale: Major
Display: Scale notes only
Maximum fret: 5
Fifth string: Excluded
Position preference: Show all
View: Notation
Pitch display: Written pitch
Show octave number: Off
Staff size: Normal
Notation layout: String columns
```

These defaults intentionally reproduce the common beginner diagram represented by the original hand-written reference.

---

## 31. Future extensions

The architecture should leave room for:

- capo support,
- railroad-spike / fifth-string capo support,
- chord tones,
- chord diagrams,
- melody-range analysis,
- left-handed display,
- 4-string banjo,
- 6-string banjo,
- guitar,
- mandolin,
- ukulele,
- MIDI input,
- click a staff note to hear it,
- click a fretboard position to hear it,
- automatic fingering suggestions,
- user-defined scales,
- multiple simultaneous diagrams,
- lesson/exercise mode.

### Capo support

A later version should distinguish between:

- actual string tuning,
- capo position,
- sounding key.

This is deliberately not part of the minimum viable version, but the pitch model should not make adding it difficult.

---

## 32. MVP acceptance criteria

The MVP is complete when all of the following are true:

1. The application runs entirely in a modern browser.
2. Open G, Sawmill, Double C, and Standard C are selectable.
3. A user can select key and scale.
4. Notes are generated algorithmically from tuning + scale.
5. Correct string/fret positions are generated for each note.
6. Multiple positions are shown when applicable.
7. Maximum fret is fixed at 5.
8. The fifth string is excluded.
9. A readable treble-clef notation diagram is rendered.
10. The interface works at 320 px width without horizontal page scrolling.
11. The desktop interface uses available screen space effectively.
12. Current visible settings can be represented in the URL.
13. Core pitch/mapping functions have automated tests.
14. The Open G / G major reference mapping in section 27 passes exactly.

---

## 33. Implementation principle

The most important architectural rule is:

> **Pitch calculation, musical spelling, fret mapping, and visual rendering must be separate concerns.**

The generated diagram should be a view of a musical data model, not the source of musical truth.

A change from Open G to Double C, or from G major to G Mixolydian, should cause the same generic mapping engine to regenerate the diagram without any tuning-specific rendering logic.
