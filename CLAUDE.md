# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build step. Open `index.html` directly in any modern browser.

## Architecture

Single-page vanilla JS app with three files:
- [index.html](index.html) — DOM structure (controls + SVG timer)
- [style.css](style.css) — CSS custom properties for theming, responsive layout using `80vmin`
- [script.js](script.js) — all logic, wrapped in an IIFE to avoid global scope pollution

### State (script.js)

Four module-level variables drive everything: `totalSeconds`, `remaining`, `running`, and `timerId` (the active `requestAnimationFrame` handle).

### Key functions

| Function | Role |
|---|---|
| `setFromInputs()` | Reads minute/second inputs → sets `totalSeconds` and `remaining`, calls `render()` |
| `tick()` | Single animation step: computes delta time, decrements `remaining`, calls `render()` |
| `loop()` | Recursive `requestAnimationFrame` loop; `tick()` only decrements when `running` is true |
| `render()` | Computes fraction remaining, updates SVG path via `sectorPath()`, updates time label |
| `sectorPath(fraction)` | Converts `[0,1]` fraction to an SVG wedge path using polar coordinates |
| `polar(angle, r, cx, cy)` | Maps angle + radius to SVG `{x, y}` — the math core of the sector drawing |

### Animation pattern

The RAF loop runs continuously (even while paused) so that toggling pause/resume is instant — `running` gates whether `remaining` actually decrements, not whether the loop runs.

### UI labels

Button text uses the `LABELS` constant object with Unicode symbols (`▶ ⏸ ⏮`). Update text there, not inline.
