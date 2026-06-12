# STARWEFT — Agent Onboarding

Zero-dependency browser space-logistics game. *"The worlds drifted apart. You are the thread."*
Plain HTML/CSS/JS, Canvas 2D, no build step, playable from `file://` by double-clicking `index.html`.

## Read these before coding

- `SPEC.md` — the v3 completeness spec and migration plan. **This is the contract.** Check §13 for what's done (✅) and what's next.
- `DESIGN.md` — original design document (pillars, economy, systems).
- `docs/reviews/` — eight detailed audit/spec documents (market, onboarding, commands, world sim, presentation, reliability, docs). These are **backlog and reference, not contracts**; SPEC.md wins on conflict.

## Hard rules (violate for nothing)

1. **Zero dependencies, zero build.** No npm, no frameworks, no bundlers, no modules — classic scripts sharing the `SW` namespace on `globalThis`.
2. **Simulation files never touch the DOM.** Only `render.js`, `ui.js`, `audio.js`, `main.js` may. Everything else must run headless under Node.
3. **All gameplay mutations go through `SW.game.actions.*`** (journaled). Never mutate state directly from UI code.
4. **State is one JSON-serializable object** — ids, not object references. Seed + action journal = the run (deterministic replay).
5. **Determinism:** all randomness through the seeded RNG in `util.js` (`U.rand(state)`, `U.pick(state, ...)`). Never `Math.random()`, never `Date.now()` in sim code.
6. Use ASCII in source unless a file already uses Unicode glyphs deliberately (UI label strings do; beware mojibake — `Â·` is a bug, `·` is intended).

## Verification (run both before claiming done)

Node is NOT on PATH. Use the full path:

```
"C:\Program Files\nodejs\node.exe" test\smoke.js          # headless sim invariants, ~110k checks
"C:\Program Files\nodejs\node.exe" test\browser_boot.js   # stub-DOM boot, panels, save/load
```

In bash: `"/c/Program Files/nodejs/node.exe" test/smoke.js`. Both must pass. If you touch UI or rendering, rerun both. Add assertions for new behavior — the suites are plain `assert()`/`section()` patterns, no framework.

## File map

| File | Owns |
|---|---|
| `js/util.js` | seeded RNG (mulberry32), name gen, math, fmt |
| `js/data.js` | commodities, hulls, buildings, techs, `D.TUNE` tuning constants, `D.SAVE_VERSION` |
| `js/galaxy.js` | map generation (Gabriel graph lanes, planets, sites) |
| `js/economy.js` | prices, production, consumption, prosperity, `marketIndex`, `cheapestSource` |
| `js/ships.js` | ships, routes, directives, **command grammar**: atomic queue (`move/buy/sell/drop/sellData/wait`), `S.intent` compiler (FETCH, GO-SELL-DATA), `S.tick` dispatching to `tickRouteShip`/`tickDirectiveShip`/`tickQueueShip`/`tickAutoExplore`, BFS `S.findPath` |
| `js/rivals.js` | competitor trade-line sim |
| `js/scourge.js` | spread, bastions, cure, win/lose |
| `js/tech.js` / `js/perks.js` | research tree, aptitudes |
| `js/story.js` / `js/events_data.js` | event engine (pure data content) |
| `js/game.js` | state, `SW.game.actions.*`, tick pipeline, journal, save/load, `G.validate()` |
| `js/render.js` | canvas map, LOD bands, perf overlay (F3), cached background layer |
| `js/ui.js` | panels, modals, command bar, market terminal, event delegation via `data-act` switch |
| `test/smoke.js` | multi-seed long-run invariants |
| `test/browser_boot.js` | stub DOM/localStorage/canvas boot test |
| `test/debug_bot.js` | scripted bot for pacing runs |

Tick pipeline (game.js): economy → factories → ships → rivals → scourge → story → research → win/lose → autosave. Whole tick wrapped in try/catch → pauses with a toast instead of crashing.

## Style

- Prefer existing patterns over new abstractions. Read neighboring code first.
- Keep the map primary: panels serve the map, never replace it (Pillar 3).
- Monochrome ink + one accent; red only for harm, green/orange only for deals.
- Every interactive element must explain itself via the `data-info` infobox.
- Small functions on the existing namespace objects (`E.foo`, `S.bar`), no classes.

## Workflow for dispatched agents

- Make the change, run both test suites, report results honestly with output.
- Do NOT commit unless your dispatch prompt says to — the orchestrator reviews and commits per wave.
- If the spec you were given contradicts what you find in the code, stop and report the contradiction instead of guessing.
