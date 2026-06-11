# STARWEFT — Design Document

*"The worlds drifted apart. You are the thread."*

A cozy-but-deep space logistics game. You are **WEFT-7**, an autonomous logistics
intelligence reawakened by a dying courier guild. Humanity's star systems have
drifted into isolation. You weave them back together with a growing network of
automated probes — buying low at mining worlds, feeding factories, selling to
hungry population centers — while **the Scourge**, a misaligned terraforming
swarm, eats the galaxy from the rim inward.

Elite Dangerous' background economy, foregrounded. FTL's drop-in stories, kept
short. Factorio's "watch the network you built hum" joy, on a star map.

---

## 1. Pillars

1. **The map is the game.** One big living star map. Probes visibly fly, trades
   visibly pulse, the Scourge visibly creeps. Panels support the map, never
   replace it.
2. **Automation is the reward.** You start hand-delivering crates; you end
   conducting an orchestra of self-balancing trade loops. Every tier of
   automation is unlocked, not given.
3. **Logistics all the way down.** Building anything *somewhere* requires
   physically delivering materials *there*. Expansion is itself a logistics
   problem.
4. **Reading is seasoning, not the meal.** Story events are ≤ 50 words with 2–3
   choices and real mechanical consequences.
5. **A clock you can hear ticking.** The Scourge gives the sandbox a spine:
   expand fast, but not recklessly; eventually turn and fight with the only
   weapon a courier has — delivery.

## 2. Format & Tech

- **Plain HTML/CSS/JS (Canvas 2D), zero dependencies, zero build step.**
  Double-click `index.html` and play. Works on `file://`.
- Classic scripts sharing one `SW` namespace on `globalThis` so the simulation
  files also run headless under Node for smoke tests (logic files never touch
  the DOM; only `render.js` / `ui.js` / `audio.js` / `main.js` do).
- Fixed-timestep simulation: **1 tick = 500 ms at 1× speed** (pause / 1× / 3× /
  10×). Rendering at requestAnimationFrame with interpolation for ship motion.
- Save: autosave + 1 manual slot in `localStorage`, plus JSON export/import.
  Saves are versioned; loading validates and migrates or politely refuses.
- Audio: small synthesized WebAudio blips (no assets), mutable, initialized on
  first user gesture.

## 3. The Galaxy

- Seeded procedural generation, ~64 systems, min-distance rejection sampling in
  an ellipse. Lanes from a **Gabriel graph** (planar, pretty), patched to be
  fully connected.
- **System types** (color-coded, iconed):
  - **Mining** — produces ORE and/or CRYSTAL. Rim-biased.
  - **Gas siphon** — produces GAS.
  - **Agriworld** — produces BIO.
  - **Industrial hub** — has factory slots running recipes (inputs → outputs).
  - **Population center** — consumes needs/wants, pays credits, generates
    Research when prosperous. Core-biased.
  - **Frontier** — empty; can be developed with buildings.
  - Rare spice: **Derelict** (story), **Ancient Relay** (story/tech flavor).
- **Home system**: modest pop + 1 factory, near the core. **Scourge origin**:
  the rim system farthest from home.
- Fog of light: undiscovered systems are dim silhouettes; a probe's first
  arrival reveals them (and may trigger an event).

## 4. Economy

**Commodities (9):**

| Tier | Goods |
|---|---|
| Raw | ORE, GAS, BIO, CRYSTAL |
| Refined | ALLOY (2 ORE), FUEL (2 GAS), FOOD (2 BIO) |
| Advanced | TECH (1 ALLOY + 1 CRYSTAL), MEDS (1 BIO + 1 GAS) |
| Endgame | PANACEA (1 MEDS + 1 TECH + 1 CRYSTAL) — recipe locked behind research |

- Every system has per-commodity `stock` and a `capacity`. **Price is a smooth
  function of fill ratio**: `price = base × clamp(1.7 − 1.5·(stock/cap), 0.35, 2.75)`.
  Producers glut and get cheap; consumers run dry and pay dearly. All profit
  comes from moving things along that gradient.
- Production adds stock each tick; population consumption removes it.
  **Needs** (FOOD, FUEL) and **wants** (MEDS, TECH) drive a 0–100
  **prosperity** that drifts toward how well-supplied the system is.
  Prosperity drives population growth, payment volume, and **Research output**
  — your tech currency is *earned by making worlds thrive*.
- Factories at industrial hubs run recipes from local market stock each tick,
  so feeding raw goods into a hub literally industrializes the region.

## 5. Fleet & Automation (the core loop)

**Ship classes:** Sparrow (cap 10) → Courier (25, faster) → Freighter (60) →
Superhauler (150). Later hulls are tech-gated and bought at industrial/home
systems. Each jump costs a small upkeep (bigger hulls cost more).

**Progression of control** — the heart of the game:

1. **Manual shipments** (minute 1): select ship → buy cargo → pick destination
   → watch it fly, sell, profit floater. Tactile, cute, immediately legible.
2. **Trade routes** (unlocked after a few deliveries): assign ships to a
   looping route of stops. Stop actions: `smart` (sell what's profitable, buy
   whatever earns most at the next stop), `buy X`, `sell all`, `drop to depot`,
   `take X from depot`. The route editor shows **projected profit per loop**.
3. **Smart routes + Market analytics** (tech): routes self-pick commodities;
   you see live prices galaxy-wide and a "best opportunities" list.
4. **Logistics directives** (late tech): "keep System X stocked with FOOD",
   assign a ship pool, the network figures out the rest.

Ships in transit are dots with glowing trails. Deliveries pop `+¤` floaters and
a soft chime. The dopamine is *watching the weave thicken*.

## 6. Building the Network

Buildings are constructed **per system** and consume **credits + materials
that must be physically present in your depot at that system** (the "supply
mission" button auto-plans the delivery for you — anticipating the #1 player
friction).

- **Relay Beacon** — extends command range (ships can only be routed within
  range of Home/relays). The expansion mechanic.
- **Depot** — your private stockpile at a system; enables drop/take route stops.
- **Extractor / Hydroponics** — boost a producer's output.
- **Fabricator** — add/upgrade a factory slot (can industrialize a Frontier).
- **Research Enclave** — boosts a pop system's research output.
- **Quarantine Bastion** — strongly resists Scourge spread into this system.
- **Warp Gate (pair)** — late-game instant lane between two gates.

## 7. Rivals (competing networks)

1–2 AI logistics corps (e.g. **Helix Combine**, **Mariner Syndicate**) trade in
the same markets: their (visible) ships move goods, flattening the price
gradients you live on. **Collision rule — presence:** every trade grows a
faction's presence ring at a system; the dominant trader gets ~10% better
prices there. Rivals expand toward profit; you compete by out-serving systems,
or via story deals (non-compete pacts, joint ventures, late-game buyout).
Rivals also suffer the Scourge — a rival collapse is a story beat and a market
shock.

## 8. The Scourge (loss condition & clock)

- Dormant until ~tick 400 (difficulty-scaled), then announced by a story arc.
  Spreads along lanes from the origin: systems become **threatened** (one
  warning interval: evacuate ships! last-chance event) then **corrupted**
  (market dead, pop lost, your buildings destroyed, lanes through it unusable,
  purple-black visual rot). Spread accelerates slowly over time.
- **Counterplay:** Quarantine Bastions block ~80% of spread attempts into their
  system; evacuation missions rescue pop (score + research); **Scourge
  Analysis I–III** research (sample-collection mission near the front) unlocks
  the **PANACEA** recipe and **Inoculated Hulls** (ships may enter corrupted
  systems).
- **Win:** manufacture PANACEA, deliver **20 units to the Scourge origin**.
  Partial deliveries persist. Cured systems slowly recover. Victory = the
  galaxy's gratitude + score breakdown ("Weave Rating").
- **Lose:** Home corrupted, or every population center corrupted, or bankrupt
  with no ships (a rival "absorbs" you — softer fail event).
- **Difficulties:** Relaxed (no Scourge — pure sandbox), Standard, Brutal.

## 9. Story

Event engine: `{ id, trigger (predicate on state), once/weighted, text ≤ 50
words, choices: [{label, req?, effects}] }`. Effects are data-driven: credits,
goods, reveal, spawn ship, flags, schedule follow-up, scourge mercy/wrath,
reputation. Modal pauses the game. ~35 events:

- **Tutorial arc** (5): WEFT-7 wakes; first shipment; first profit; route
  automation granted by the old Guildmaster's last gift; first relay.
- **The Archivist arc**: a derelict library-ship wants its books delivered —
  teaches depots, pays in research.
- **Rival arc**: first contact, price war or pact, their Scourge crisis.
- **Scourge arc**: rim whispers → origin revealed → sample run → analysis →
  Panacea → finale convoy.
- Drop-ins: pirates demanding cargo, nebula mirages, a stowaway colony of
  cats (morale is real), market manias and crashes.
- A persistent **Objectives chip** (current act goal) keeps direction obvious
  without quest-log homework.

## 10. UI / Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│ ¤ credits   ◇ research   ▲ fleet   [⏸ 1× 3× 10×]  ⚠ alerts  │
├───────────┬──────────────────────────────────┬───────────────┤
│ SELECTED  │                                  │ DOCK (tabs)   │
│ SYSTEM    │        THE MAP (canvas)          │ Fleet/Routes/ │
│ market,   │   pan + zoom, living network     │ Tech/Rivals/  │
│ build,    │                                  │ Log           │
│ quick-send│                                  │               │
├───────────┴──────────────────────────────────┴───────────────┤
│ event ticker · toasts · objectives chip                      │
└──────────────────────────────────────────────────────────────┘
```

Aesthetic: deep-space navy, pastel neon glows, rounded panels, soft shadows;
systems as glowing orbs sized by population, typed by hue/icon; probes as
darting motes with trails. Tooltips everywhere. Space = pause, 1/2/3 = speed.

## 11. Architecture

```
starweft/
  index.html  style.css
  js/
    util.js         seeded RNG (mulberry32), name gen, math, fmt
    data.js         commodities, hulls, buildings, techs, difficulty tables
    events_data.js  story content (pure data)
    galaxy.js       map generation
    economy.js      prices, production, consumption, prosperity, markets
    ships.js        ships, shipments, routes, smart trading, directives
    rivals.js       competitor sim
    scourge.js      spread, quarantine, cure, win/lose checks
    tech.js         research tree
    story.js        event engine, objectives
    game.js         state, actions API, tick pipeline, save/load
    render.js       canvas map (DOM)        ┐
    ui.js           panels, modals (DOM)    │ browser-only
    audio.js        WebAudio blips (DOM)    │
    main.js         boot (DOM)              ┘
  test/smoke.js     headless Node: gen + 3000-tick invariant runs
```

**Tick pipeline** (`game.js`): economy → factories → ships/routes → rivals →
scourge → story triggers → research accrual → win/lose → autosave. The whole
tick is wrapped in try/catch: an error pauses the game and shows a toast with
a "copy report" button instead of crashing.

**State** is a single JSON-serializable object (ids, not object references).
All mutations go through `SW.game.actions.*` so UI and story effects share one
validated path (no negative credits, no overcap stocks, no NaN — smoke test
asserts these invariants over long runs).

## 12. Why this will feel good (design bets)

- Manual → automated is the *same verbs*, so automation feels like mastery,
  not a new game.
- Materials-on-site construction makes the map's geography matter forever.
- Prosperity→Research means the "nice" strategy (feed worlds) is the engine of
  progression, and the Scourge threatens exactly the thing you've been
  nurturing.
- Rival presence is one legible number with one legible effect (price edge) —
  competition without combat micromanagement.
- The finale converts your whole economic machine into one heroic delivery.
