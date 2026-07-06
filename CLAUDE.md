# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deploy

**Always run `deploy.bat` on Windows** — never `git push` from the Linux sandbox (no credentials, NTFS lock issues).

```bat
deploy.bat
```

`deploy.bat` cleans git lock files, commits, and pushes to GitHub. Vercel is connected to the `stefanogriante-dev/giochi-coro` repo and auto-deploys on push to `main`. Live at `giochi-coro.vercel.app`.

## Syntax check

```bash
node --check js/main.js
node --check js/note-accordi.js
# etc.
```

## Architecture

Vanilla JS SPA — no framework, no bundler, no build step. Single `index.html` with all screens present in the DOM simultaneously.

**Navigation** (`js/main.js` → `App` IIFE): `App.goTo(screenName)` removes `.active` from all `.screen` divs and adds it to `#screen-{screenName}`. Current screens: `home`, `ritmica`, `livello`, `game`, `metronomo`, `note-accordi`.

**Script load order** in `index.html`:
1. `js/i18n.js` — must be first (all others call `I18n.t()`)
2. `js/metronomo.js`
3. `js/games/*.js` — game classes (`SimonGame`, `TrenoGame`, `PuzzleGame`, `BattiTempoGame`, `IngressiGame`)
4. `js/note-accordi.js` — `NoteAccordi` IIFE (not a game)
5. `js/main.js` — `App` + `Celebration` IIFEs; must be last

**Cache busting**: all CSS/JS links use `?v=4`. Bump the version number whenever changing these files.

## Game system

Games live in `js/games/`. Each is a class instantiated by `main.js` via:
```js
currentGameObj = new XxxGame(area, gameState);
```
where `area` is `#game-area` (emptied before each instantiation) and `gameState` is a shallow copy of `App`'s state (`{ bpm, level, mode, _savedSlots, … }`).

**Required interface** for every game class:
- `start()` — begin/resume playback
- `pause()` — pause playback
- `stop()` — full teardown (clear timers, stop audio, release resources)
- `updateBpm(val)` — called live when BPM changes, even before `start()`

`App.resetGame()` saves `currentGameObj._slots` into `state._savedSlots` before destroying the game (used by `IngressiGame` to persist slot config across resets).

## Audio

All audio uses Web Audio API (`AudioContext` → `OscillatorNode` → `GainNode` → destination). Each module maintains its own `AudioContext`. Resume suspended contexts before playing:
```js
if (ctx.state === 'suspended') ctx.resume();
```

`NoteAccordi` routes all sound through a `DynamicsCompressor` node. Low-frequency notes (< 250 Hz) use gain `0.92`; others use `0.55` (Fletcher-Munson compensation).

## Key modules

**`js/main.js`** — Two IIFEs: `App` (navigation, BPM, game lifecycle) and `Celebration` (confetti + victory sound + banner). `Celebration.celebrate(msg)` is called by games when a round ends.

**`js/i18n.js`** — `I18n.t(key)` returns a translated string. Default language: `it`. Language stored in `localStorage`. Elements with `data-i18n` attributes are re-rendered on language switch.

**`js/games/ingressi.js`** (`IngressiGame`) — All styles are inline (no CSS classes) to avoid cache issues. Uses a config phase (`_buildConfig()`) and a game phase (`_build()`); each must call `this.container.innerHTML = ''` before rendering to avoid duplicate panels.

**`js/note-accordi.js`** (`NoteAccordi`) — IIFE, not a game class. Builds its UI into `#na-content` on `DOMContentLoaded`. Manages three independent audio states: `_noteStates{}` (multiple simultaneous notes, keyed by freq string), `_chordState` (single exclusive sustained chord), `_arpState` (single exclusive arpeggio, plays once then stops).

## Critical: editing large JS files

The `Edit` tool silently truncates large files. **Always write large JS files with Python**:

```python
open('/path/to/file.js', 'w', encoding='utf-8').write(complete_code_string)
```

After any write, verify with `node --check`. If null bytes appear (causing `SyntaxError: Invalid or unexpected token`), clean them:

```python
data = open(path, 'rb').read()
open(path, 'wb').write(data.replace(b'\x00', b''))
```

To repair a truncated file, find the truncation point with `data.rfind('last_good_fragment')` and append the missing closing code.
