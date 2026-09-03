# Clawford

<img src="img/clawford-180.png" alt="Clawford, a banjo-playing ferret" width="120" align="right">

Clawford is a client-side web app that generates note-to-string/fret reference
diagrams for fretted instruments. It answers the question:

> "Where can I play this written note on my instrument in its current tuning?"

It renders a translation between standard music notation and instrument
positions (string + fret), for a chosen key/scale or chord, and supports
both a notation view and a fretboard view.

⚠ **Untested**: this tool has not been verified against real instruments.
Double-check every note before relying on it.

## Features

- Multiple instruments: 5-string banjo, 4-string banjo, guitar, bass guitar,
  mandolin, ukulele.
- Multiple tunings per instrument.
- Key/scale selection, or chord root/quality selection.
- Notation view and fretboard view, with vertical or horizontal orientation.
- Print-friendly output (separate print stylesheet).
- Runs entirely in the browser — no server or build step required.
- Installable as a PWA with offline support (see [PWA support](#pwa-support)).

## Getting started

This is a static site with no build process. To run it locally, serve the
project directory with any static file server, for example:

```bash
npx serve .
```

Then open the printed URL in your browser.

Alternatively, open `index.html` directly in a browser (some browsers may
restrict ES module loading over the `file://` protocol, so a local server is
recommended).

## Project structure

```
index.html                 Entry point / page markup
manifest.webmanifest        PWA manifest (name, icons, display mode)
sw.js                       Service worker: caches the app shell for offline use
favicon.ico                 Legacy multi-res favicon fallback
img/                        Project mascot (banjo-playing ferret), various sizes
css/
  app.css                   Application styles
  print.css                 Print-specific styles
js/
  app.js                    App bootstrap / UI wiring
  chords.js                 Chord definitions and logic
  fretboard-renderer.js     Renders the fretboard view
  notation-renderer.js      Renders the standard-notation view
  instruments.js            Supported instrument definitions
  tunings.js                Built-in tunings per instrument
  mapping.js                Note <-> string/fret mapping logic
  pitch.js                  Pitch parsing/formatting utilities
  scales.js                 Scale definitions and logic
  state.js                  Application state management
  storage.js                Persisted user settings
tests/                      Unit tests (node:test)
deploy.sh                   Deploys the static site over SSH/SCP
SPEC.md                     Full project specification
```

## Testing

Tests are written using Node's built-in test runner:

```bash
npm test
```

## Deployment

`deploy.sh` copies `index.html`, `css/`, and `js/` to a remote host via
`scp`:

```bash
./deploy.sh [remote-host] [remote-path]
```

Defaults to host `fsdata` and path `~/www/clawford`.

## PWA support

Clawford ships as an installable Progressive Web App:

- `manifest.webmanifest` declares the name, icons, and standalone display mode.
- `sw.js` is a service worker that caches the app shell (HTML/CSS/JS/icons) on
  first load, so the app keeps working offline and on flaky connections.
  It's registered from `index.html`.

Requirements to actually get the install prompt / offline behavior:

- **HTTPS** (or `localhost`) — service workers refuse to register over plain
  HTTP on any other host. `npx serve .` and `localhost` are fine for testing;
  the production `deploy.sh` target must be served over HTTPS.
- Everything the service worker caches is listed explicitly in `sw.js`'s
  `APP_SHELL` array. If you add a new CSS/JS/image file that the app needs at
  load time, add it to that list too, otherwise it won't be available offline.
- Cache invalidation is automatic on deploy: `deploy.sh` hashes the contents
  of the shipped files and stamps that hash into `sw.js`'s `CACHE_VERSION`
  before uploading, so any change to a shipped file (CSS, JS, icon, etc.)
  gives returning clients a fresh cache name and they pick up the update.
  `sw.js` in this repo carries a `clawford-dev` placeholder that's only used
  when serving locally (`npx serve`, opening `index.html` directly) — it's
  never the value actually deployed.

## Documentation

See [SPEC.md](SPEC.md) for the full design specification, including musical
assumptions, position-selection rules, and UI requirements.

## License

The source code and documentation are licensed under the [MIT License](LICENSE).

The Clawford name, logo, and branding are not licensed as trademarks.
