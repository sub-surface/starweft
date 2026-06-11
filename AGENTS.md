# Starweft Agent Notes

This repo is a zero-dependency browser game. Keep changes small, local, and consistent with the existing plain HTML/CSS/JS architecture.

## What This Project Is

- `Starweft` is a space logistics strategy game about weaving a broken galaxy back together.
- The playable surface is the star map. Panels support the map; they should not replace it.
- The simulation is deterministic, headless-friendly, and runs without the DOM in the core game files.

## Core Structure

- `index.html` wires the shell UI.
- `style.css` holds the whole visual system.
- `js/main.js` boots the game.
- `js/game.js` owns state, actions, and the tick loop.
- `js/render.js` draws the galaxy and system views on canvas.
- `js/ui.js` owns panels, modals, commands, and user interaction.
- `js/data.js` defines techs, hulls, buildings, commodities, and tuning.
- `js/ships.js`, `js/economy.js`, `js/galaxy.js`, `js/tech.js`, `js/story.js`, `js/scourge.js`, `js/rivals.js` contain the main simulation subsystems.

## Working Rules

- Prefer existing patterns over new abstractions.
- Route gameplay mutations through `SW.game.actions.*` instead of editing state directly in UI code.
- Keep DOM-specific logic in `render.js`, `ui.js`, `audio.js`, and `main.js`.
- Keep simulation logic free of DOM access so it continues to run under Node tests.
- Use ASCII unless a file already depends on Unicode.
- Use `apply_patch` for edits.

## Verification

- Smoke test: `node test\smoke.js`
- Browser boot test: `node test\browser_boot.js`
- If you touch UI or rendering, rerun both tests.

## Important UX / Design Constraints

- The game should stay readable at a glance. Favor stable panel placement and low-jitter layouts.
- The map should stay legible when zoomed far out.
- Tech tree, command flow, and ship selection should feel like dedicated work surfaces, not floating afterthoughts.
- Ship and route control should stay explicit and discoverable.

## Current High-Priority Directions

- Improve the selected-unit command system so it has a clear home and better send/queue feedback.
- Continue the tech-tree rework toward a clearer dependency graph, better pan/zoom behavior, and more legible detail views.
- Expand ship abilities beyond cargo into ship- and system-specific functions.
- Add more long-range galaxy content beyond the settled bubble.
- Preserve and extend roadmap notes in `README.md` when a feature is out of scope for the current pass.

## Useful References

- [README.md](README.md)
- [DESIGN.md](DESIGN.md)

