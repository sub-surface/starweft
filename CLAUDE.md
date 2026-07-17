# STARWEFT engineering guide

STARWEFT is a zero-dependency browser logistics game: plain HTML, CSS, and
classic JavaScript, rendered with Canvas 2D, with no build step. It runs from
`file://` by opening `index.html` and is hosted as static assets.

Read this file completely before changing the repository. Read [SPEC.md](SPEC.md)
before making a product, mechanic, narrative, UX, or roadmap decision.

## Authority

There are exactly two living authorities:

- `SPEC.md` owns the product: overhaul vision, game rules, world/narrative bible,
  acceptance criteria, progress checkboxes, research synthesis, and roadmap.
- `CLAUDE.md` owns engineering: architecture, file manifests, verification,
  workflow, and deployment operations.

`README.md` is a public introduction. `AGENTS.md` is a pointer to this guide.
Files under `research/` are evidence, not product authority. Git history preserves
retired proposals and reviews; do not recreate a third live contract.

Requirement comments cite stable identifiers such as `SPEC[RUN-PLEDGE]` or
`SPEC[SW-PLG-004]`, never section numbers. A checked SPEC item requires the
evidence defined in `SPEC.md`; do not check work merely because a UI exists.

## Hard rules

1. **Zero dependencies and zero build.** Do not add npm, packages, frameworks,
   bundlers, transpilers, modules, or generated bundles. Runtime files are classic
   scripts sharing `SW` on `globalThis`.
2. **The simulation is headless.** Domain behavior must run without `window`,
   `document`, canvas, audio, or browser storage. Browser/storage access in
   `game.js` is guarded so the same file boots under Node.
3. **Presentation owns browser APIs.** `audio.js`, `portraits.js`, `codex.js`,
   `render.js`, every `ui*.js`, `boot.js`, and `main.js` may use browser or canvas
   APIs. Do not move game rules into them.
4. **Player mutations go through `SW.game.actions.*`.** UI code may inspect state
   freely but may not mutate gameplay state directly. Actions validate, invoke the
   owning domain function, return `{ok, msg?}`, and are journaled where applicable.
5. **State is JSON-serializable.** Store IDs rather than object references. No DOM
   nodes, functions, canvas objects, audio handles, or formatted HTML in canonical
   state.
6. **The simulation is deterministic.** All gameplay randomness uses the seeded
   helpers in `util.js`, such as `U.rand(state)`, `U.pick(state, ...)`, and
   `U.weightedPick(...)`. Never use `Math.random()` in simulation. Wall-clock and
   performance time may measure presentation/performance only and may not change a
   seeded outcome.
7. **Preserve load order.** Classic scripts have implicit dependencies. Any runtime
   file addition or move must update every applicable manifest in the same order.
8. **Keep source text healthy.** Use ASCII unless an existing UI string deliberately
   needs a real Unicode glyph. Never paste mojibake. Tests scan for common encoding
   corruption.

## Verification

Node is not on PATH on the primary Windows development machine. Run both suites
before claiming work complete:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'test\smoke.js'
& 'C:\Program Files\nodejs\node.exe' 'test\browser_boot.js'
```

- `test/smoke.js` boots the headless-safe stack and checks multi-seed simulation,
  deterministic behavior, domain invariants, migrations, and documentation.
- `test/browser_boot.js` boots the full stack against a stub DOM/storage/canvas and
  exercises panels, modals, save/load, and the frame loop.

The browser harness is structural, not a real-browser replacement. UI, canvas,
input, timing, or accessibility changes also require an interactive browser check.
Add tests with new behavior; the repository uses its own `assert()` and `section()`
helpers rather than a framework.

## Runtime manifest

`index.html` and `test/browser_boot.js` load all runtime scripts in this exact
dependency order:

```text
 1 util.js              12 combat.js             23 charters.js
 2 data.js              13 rivals.js             24 aperture.js
 3 perks.js             14 scourge.js            25 founders.js
 4 starcat.js           15 tech.js               26 pledges.js
 5 lore.js              16 story.js              27 acts.js
 6 events_data.js       17 worldevents.js        28 signals.js
 7 planets.js           18 tutorial.js           29 game.js
 8 sites.js             19 quests.js             30 audio.js
 9 galaxy.js            20 civics.js             31 portraits.js
10 economy.js           21 campaign.js           32 codex.js
11 ships.js             22 objectives.js         33 render.js
34 market_analytics.js  38 ui_routes.js          42 ui.js
35 ui_market.js         39 ui_pledge.js           43 boot.js
36 ui_ship.js           40 ui_tech.js             44 main.js
37 ui_system.js         41 ui_modals.js
```

`test/smoke.js` loads the headless-safe domain stack in the same relative order:
scripts 1-29 plus `market_analytics.js`. It deliberately excludes audio, canvas
helpers, render, UI, boot, and main.

When adding a script:

- all runtime scripts go in `index.html` and `test/browser_boot.js`;
- a headless-safe script also goes in `test/smoke.js`;
- domain scripts load before `game.js`; presentation surface modules load before
  their orchestrator (`ui.js` or `main.js`);
- add a manifest parity assertion when introducing a new category.

## File ownership

### Foundations and content

| File | Owns |
|---|---|
| `js/util.js` | seeded RNG, path/math/format helpers, name generation |
| `js/data.js` | registries and tuning: commodities, hulls, buildings, technologies, flags, `D.TUNE`, save version |
| `js/perks.js` | aptitude/perk state and effects; migration input for SPEC Charters |
| `js/starcat.js` | real-star catalog data |
| `js/lore.js` | lore/codex data and helpers |
| `js/events_data.js` | event content definitions |
| `js/planets.js` | planet generation and planet state |
| `js/sites.js` | orbital/site definitions, projects, and local facilities |

### Headless simulation

| File | Owns |
|---|---|
| `js/galaxy.js` | galaxy/system generation, topology, and lanes |
| `js/economy.js` | production, consumption, prices, prosperity, market queries |
| `js/ships.js` | ships, cargo, travel, routes, directives, command queue, pathing |
| `js/combat.js` | seeded encounter/combat resolution foundation |
| `js/rivals.js` | rival movement and trade behavior |
| `js/scourge.js` | Scourge spread/response foundation; migration input for Fray |
| `js/tech.js` | technology state and research |
| `js/story.js` | pending event/story engine |
| `js/worldevents.js` | simulated world events |
| `js/tutorial.js` | current prologue/tutorial state and predicates |
| `js/quests.js` | quest state and resolution |
| `js/civics.js` | factions, ideology, presence, and civic state |
| `js/campaign.js` | account/campaign/Thread/Act schemas, migrations, seed layers, Chronicle registration |
| `js/objectives.js` | objective grammar, executable solution classes, seed validation and repair |
| `js/charters.js` | Charter schema, slots, pool registration, and validation |
| `js/aperture.js` | Hot/Warm/Cold records, causal classification, aggregate snapshots, conservation diagnostics |
| `js/founders.js` | current Founder packages; migration input for archetypes |
| `js/pledges.js` | Pledge construction, constraints, progress, completion/failure |
| `js/acts.js` | current Act shell and transitions; target shape is in SPEC |
| `js/signals.js` | signal data/selection helpers used by presentation |
| `js/game.js` | canonical state, action boundary, journal, tick orchestration, validation, save/load, browser loop |
| `js/market_analytics.js` | headless market analysis used by UI and tests |

### Browser presentation

| File | Owns |
|---|---|
| `js/audio.js` | browser audio, music, and sound preferences |
| `js/portraits.js` | canvas portrait drawing helpers |
| `js/codex.js` | canvas codex/ship drawing helpers |
| `js/render.js` | map canvas, camera, layers, selection marks, LOD, render caches |
| `js/ui_market.js` | market surface |
| `js/ui_ship.js` | fleet/ship surface |
| `js/ui_system.js` | system/object lens and system drawers |
| `js/ui_routes.js` | route/automation surface |
| `js/ui_pledge.js` | Pledge surface |
| `js/ui_tech.js` | research/technology surface |
| `js/ui_modals.js` | title, setup, event, death, and other modal surfaces |
| `js/ui.js` | UI orchestration, command strip, input/event delegation, shared information |
| `js/boot.js` | browser power-on presentation and preference guard |
| `js/main.js` | browser-only wiring, initialization, loop start, and title handoff |

### Shell and verification

| File | Owns |
|---|---|
| `index.html` | DOM shell and authoritative browser script order |
| `style.css` | all visual layout and styles |
| `test/smoke.js` | headless simulation, invariant, determinism, and doc-integrity checks |
| `test/browser_boot.js` | full-stack stub-browser boot and interaction checks |
| `test/debug_bot.js` | scripted pacing/diagnostic runs; not a release suite |
| `wrangler.jsonc` | Cloudflare Worker static-asset service configuration |

## Tick pipeline

`G.tick(state)` currently executes in this order:

```text
guard state/gameOver
increment tick
economy
ships
projects
combat
rivals
civics
lane-flow decay
scourge
world events
pledges
acts (only while active)
story
tutorial
stranded guard
perks
aperture classification/snapshot
infamy legacy flag
end-state check
periodic autosave
performance measurement
```

`G.tick` itself is not wrapped in a catch. The browser loop in `game.js` catches a
tick failure, pauses, and emits a visible simulation-error toast. Tests should see
uncaught domain failures. Preserve order intentionally: a change can alter every
seeded run and must receive regression coverage and a SPEC rationale.

## State, actions, and hooks

- Initialize additive old-save-safe state defensively at the owning boundary.
  Structural lifetime changes require a versioned migration; do not pretend they
  are harmless additive fields.
- `G.validate(state)` owns cross-domain invariant diagnostics. It never runs inside
  the normal tick and never repairs state.
- `G.emit(type, payload)` is the headless-safe presentation boundary. Browser-only
  handlers are wired in `main.js`.
- Useful state includes `sys.presence`, `sys.ideology`, `state.laneFlow`, and entity
  IDs. Prefer the owning domain query over duplicating derived state.
- New story flags must be registered in `D.FLAGS`.
- New tuning values belong in `D.TUNE` unless they are a true local structural
  constant.
- Interactive UI actions use `data-act` dispatch and call a domain action. New
  controls need a keyboard path, visible focus, and an explanation (`data-info` or
  a clearer persistent label).
- Render calculations that depend on state use caches keyed by relevant state/tick;
  do not move simulation into the frame loop.

## Feature workflow

1. Find the requirement and acceptance criteria in `SPEC.md`. Add or refine a
   stable ID before implementing ambiguous product behavior.
2. Read the owning data, simulation, action, presentation, and test neighbors.
3. Add data/registries and tuning first.
4. Implement domain behavior headlessly with seeded decisions.
5. Expose player mutation through `SW.game.actions.*`.
6. Add state-aware content through shared domain functions rather than special-case
   UI mutation.
7. Add the smallest map-first presentation and full command feedback.
8. Add smoke assertions; add browser-boot coverage for presentation; perform a real
   browser check when interaction or rendering changes.
9. Run both mandatory suites.
10. Update the SPEC checkbox only if all exit criteria in `SW-TEST-008` are met and
    attach evidence below the item.

Prefer existing namespace functions (`E.foo`, `S.bar`) and small explicit
functions over classes or framework-like abstraction. Reuse patterns where their
behavior is still correct; the overhaul explicitly authorizes replacing old product
shape that contradicts the SPEC.

## Worktree and Git safety

- Inspect `git status --short` before and after work.
- Existing changes belong to the user unless this task created them. Do not discard,
  rewrite, stage, or commit unrelated work.
- Stage explicit paths; do not use `git add -A` in a mixed worktree.
- Do not use destructive reset/checkout commands.
- Do not commit, push, merge, deploy, or open a PR unless the user authorizes that
  operation. Authorization to edit does not imply authorization to publish.
- Keep commits scoped and explain migrations or intentional retirements in the body.
- Preserve research and retired design through Git history before deleting the live
  copies.

## Deployment operations

Recorded production is [star.subsurfaces.net](https://star.subsurfaces.net), hosted
on Cloudflare as a Worker with static assets. The service name is `starweft`; it is
not a classic Pages project. The Git remote is `sub-surface/starweft`, and `main` is
configured as the production auto-deploy branch.

The `digital-garden-v2` Worker serving the broader `subsurfaces.net` garden is a
separate service. Never change, deploy, or reconfigure it while working on
STARWEFT.

Before an authorized production push:

1. run both mandatory suites;
2. inspect and stage only intended paths;
3. commit on the intended branch and review the diff;
4. use a Cloudflare branch preview when the change benefits from visual review;
5. push `main` only with explicit publishing authority;
6. wait for the Git-connected deployment and verify the changed asset plus the live
   page rather than assuming the push shipped.

Wrangler is recorded at
`C:\Users\Leon\AppData\Roaming\npm\wrangler.cmd`. Authentication uses a scoped
Cloudflare token. Confirm account and service before any mutation. Read-only
diagnostics include `wrangler whoami`, `wrangler deployments list`, and
`wrangler tail starweft`; exact CLI syntax may change, so consult current official
Cloudflare documentation before operational use.

Rollback is either promoting a known-good `starweft` deployment in Cloudflare or an
authorized `git revert` followed by the normal production push. Never "fix" a
STARWEFT rollback by touching `digital-garden-v2`.

## Current work

The overhaul sequence and current truth live only in `SPEC.md`, section 26. Begin at
the first unchecked Gate requirement whose prerequisites are complete. Do not add a
volatile "resume at R5" instruction here.
