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

## Adding a feature — the playbook

Features slot into fixed layers. Work top to bottom; most features touch 3-4 of them.

| Layer | Where | Pattern to copy |
|---|---|---|
| 1. Data | `data.js` tables: `D.TUNE` (every magic number), `D.COMMODITIES/HULLS/BUILDINGS/FACILITIES/TECHS/PERKS/IDEOLOGIES/RIVAL_DEFS` | nearest existing row |
| 2. Sim | the owning subsystem file, or a new DOM-free file. Hook into `G.tick` pipeline (game.js ~line 110: economy → ships → combat → rivals → laneFlow decay → scourge → story → tutorial → research → win/lose → autosave) | `js/tutorial.js` is the model new-module shape: IIFE on `SW.*`, init/tick/predicates |
| 3. Actions | `game.js` `A.*` — every player-initiated mutation, returns `{ok, msg?}`, auto-journaled | `A.buildSite` (thin wrapper) or `A.shipSend` (guards first) |
| 4. Content | `events_data.js` events `{id, title, weight, when(s), text ≤50 words, choices[{label, req?, fx}]}` | `ev_first_thread` |
| 5. UI | the owning `ui_*.js` surface module; wire buttons via `data-act` + a case in ui.js's dispatch switch that CALLS the module; hover docs via `data-info` (`ui:topic` entries live in `UI_TOPICS`, ui.js ~line 166) | any `data-act` case |
| 6. Render | `render.js`; per-tick caches keyed off `st.tick` (see `laneStyleCache`), never per-frame recompute | `drawBodySites` |
| 7. Tests | smoke.js section (headless, drive via `A.*` exactly as a player would) + browser_boot.js step if UI-facing | `section('Sol prologue (tutorial)')` |

**State rules (the contract that makes everything composable):**
- New state = additive, JSON-serializable, ids not references. Init defensively at every read (`state.foo || (state.foo = {})`) so old saves load; never bump SAVE_VERSION for additive fields.
- Randomness only via `U.rand(state)` / `U.pick` / `U.weightedPick` (seeded). `Math.random`/`Date.now` in sim code breaks replay and will fail review.
- Sim files never touch the DOM. UI reads state freely but mutates only through `A.*`.

**Registries that bite if forgotten (tests enforce all of these):**
- New story flag → add to `D.FLAGS` (data.js ~line 208) or the flag-registry test fails.
- New js file → THREE lists: index.html script tags (sim files before game.js; ui_*.js before ui.js), smoke.js FILES, browser_boot.js FILES.
- Unicode glyphs: paste real glyphs (▦ ✕ ◎ ·). The integrity scan fails on mojibake telltales (Â Ã â– etc.).
- New interactive element → `data-info` hover entry; new TUNE constant for any number you'd otherwise inline.

**Useful hooks already in place:** `G.news(state, text, sysId)` (ticker feed), `G.emit('toast'|'sfx'|...)` (headless-safe), `sys.presence` (faction trade influence), `sys.ideology` (D.IDEOLOGIES), `state.laneFlow` (Living Weave, key `minId-maxId`), `SW.market.weaveHealth`, `U.findPath(state, a, b, opts)` (lane BFS).

## Workflow for dispatched agents

- Your dispatch prompt + this file carry the context you need. Read ONLY the specific files/regions your task names — resist exploratory sweeps; the playbook table above tells you where things live.
- Do NOT invoke superpowers skills, write plan files, or create scratch documents.
- Do NOT run the test suites unless your prompt says to — the orchestrator verifies at the end. Quick `node -e` syntax checks on files you edited are fine.
- Do NOT commit unless told to.
- If the spec you were given contradicts what you find in the code, stop and report the contradiction instead of guessing.
- Final message = file:line summary of changes + anything you're unsure survives a test run. Raw data, not prose.
