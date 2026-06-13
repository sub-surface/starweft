# STARWEFT — v3 Completeness Specification

*The worlds drifted apart. You are the thread.*

This is the whole dream in one document: every system shipped, every system
intended, and how they fit together — written to be edited and argued with
before anything else gets built. v3 is a **completeness pass**: not more
features bolted on, but the existing wealth of systems composed into one
coherent game with a beginning, a middle, three ends, and a UX ontology that
can carry the depth.

---

## 1. Vision & Pillars

A cozy-but-vast logistics strategy game where an automated trade network grows
from one probe in Sol to a weave spanning hundreds of star systems — against a
spreading galactic extinction. Elite's living economy and sense of scale,
FTL's drop-in story, roguelite path-dependence, real astronomy.

**Pillars — violate these for nothing:**

1. **Double-click to play.** Zero dependencies, zero install, zero build.
2. **Deterministic, headless, tested.** Seed + action journal = the run.
3. **The map is the game.** Panels serve the map.
4. **Read at a glance.** Monochrome ink, one accent (yours), red only for harm,
   green/orange only for deals.
5. **Minimal reading, maximal systems.**
6. *(new)* **One verb, deeply served.** Everything orbits GATHER → MOVE →
   DELIVER. Exploration finds the next thing worth moving; combat protects the
   moving of it. If a feature doesn't feed the loop, it's a curiosity.

---

## 2. The Core Verb & the Three Branches

### 2.1 The loop

**Send ships to gather things and deliver them where they're needed.** That is
the looped verb, and the command system must make it effortless at every
scale of automation:

| Scale | Command | Status |
|---|---|---|
| One errand | "fetch X from A, deliver to B" — a single first-class order, not a route | ◌ *missing — supplyMission is close but targets builds only; generalize to `fetch` with sell/drop/hold on arrival* |
| A loop | routes with stop actions, smart cargo | ✅ |
| A policy | directives ("keep X stocked"), chain routes (Weftworks), auto-yards | ✅ |
| A fleet | Exchange bulk-assign, employ-idle | ✅ |

v3 closes the gap with a **command grammar** (per the design-research report):
a small set of atomic verbs — MOVE, DOCK, BUY, SELL, SURVEY, SCAN, SELL_DATA,
PATROL, WAIT — that **intents compile into visible queues**. The player issues
intents ("fetch X from A to B", "explore and report"); the compiler is
invisible, the queue is not. **Interrupts** add conditional self-care without
opacity: "data bank full → route to vendor and sell", "stranded-risk → hold".
Rules: never remove manual control (the Avorion lesson); every ship can answer
*"why are you doing this?"* in one line. FETCH is the first intent; every
market row and ticker shortage is one click from "a ship is handling this."

### 2.2 The two open branches

- **Discovery & exploration** — feeds the loop new geography, new markets,
  new wonders. v3 gives it a real profession (§6: cartography data).
- **Combat & defence** — protects the loop and taxes other people's loops.
  Already rich (raids, escorts, retainers, simulacrum); v3 mostly needs the
  rivals to run real convoys worth hitting/guarding (§10.4).

### 2.3 The world evolves from logistics

Demand is the engine of history: deprived worlds stagnate, supplied worlds
grow, growth shifts demand, rivals chase the same gradients, refugees and
stances bend them. The simulation already does most of this (prosperity,
pop growth, refugee waves, rival lines); v3 makes it *legible* — the ticker,
the market terminal, and trend analytics exist to let the player watch the
world they're causing.

---

## 3. The V3 Player Journey

### 3.1 Main menu (full)

A proper front door, monochrome and quiet: CONTINUE / NEW WEAVE / CHRONICLE
(meta-codex: legacy unlocks, past runs' fates, fragments found ever) /
SETTINGS (audio, perf, accessibility) / about. The galaxy slowly rotates
behind it at deep-LOD, with the player's last bubble marked.

### 3.2 Intro cinematic (~40s, skippable, all procedural)

Canvas-rendered, no assets, ambient synths: the Loom epoch in five slow
shots — lissajous threads weaving between stars → the silence spreading →
one probe (your sigil) waking in Sol orbit → pull back through the LOD stack
from Earth's orbital view to the whole Milky Way → title. Reuses the
renderer; it IS the engine demo.

### 3.3 One-time tutorial: Sol first (the cold open)

**The game starts inside the Sol system view. The galaxy map is locked.**

1. ✅ WEFT-7 wakes with one shuttle. Earth Anchorage is hungry; The Belt has
   ore. The verb is taught intra-system via **berths**: ships hop between
   bodies (`A.shipHop`, mode `shuttle`, `ship.body`), and each body prices
   the system market through its own rates (`D.BERTH` / `E.berthMult` —
   ore cheap at the Belt, food dear on settled Mars). Beats: fly to the
   Belt → fill the hold at rockhopper rates → sell at the Anchorage →
   buy alloy → anchor the Hydrofarm → watch the chain → open the Journal
   and authorize the **Sol Logistics Net** company contract → jump. Beats
   are state predicates; no beat can stall (timers/fallbacks), and a broke
   run gets a Guild stipend (`TUNE.prologueStipend`) — bankruptcy is never
   a wall. Shipyard/construction hidden while locked.
2. ✅ The in-system layer is the *first* logistics game: berth spreads are
   self-correcting (trading moves the shared system stock), so the loop
   teaches without becoming the endgame strategy.
3. ✅ The Guild's last gift (+`TUNE.prologueGift`) arrives after the Sol Net
   sign-off; route automation is installed as a company capability, the map
   unlocks, first jump lands, the title card drops. Remaining: a real intro
   cinematic (§3.2) and the named first-jump target (Alpha Centauri) as a
   beat.
4. Tutorial completion sets a legacy flag; subsequent runs offer "skip
   prologue" and start at the bubble as today.

### 3.4 Progression curve (target shape)

- **Hour 0–1 (Sol + first lanes):** manual fetch orders, 2–3 ships, first
  route, routes_unlocked. Scarcity everywhere; every delivery visibly matters.
- **Hour 1–3 (the weave):** 5–10 ships, smart routes, first facilities,
  first aptitude points, rivals met, exploration profession opens.
- **Mid (the wake):** Scourge wakes → panic → STANCE. The bubble polarizes;
  doctrine chosen; Exchange unlocked; combat or governor identity solidifies.
- **Late:** stance-specific endgames — Panacea delivery (cure), fortress
  bubble survival (hold), deep-galaxy refounding (exodus). Badlands, wonders,
  Weftworks, auto-yards: the network runs itself; the player plays history.

### 3.5 Run setup (world parameters)

Beyond origin/aptitude/difficulty/identity, a WORLD panel seeds interesting
dynamics per run:

- **Density** sparse / standard / crowded (see §4 — sparse is the realism set)
- **Wealth** deprived / standard / gilded — global stock & prod multipliers.
  Deprived is the current (good) feel: the player is the thread.
- **Scourge clock** patient / standard / hungry / never (sandbox)
- **Rivals** 0–3
- **Badlands depth** shallow / standard / deep (count + radius)
- **Ironman** no manual saves
- Presets named like sailing conditions ("A Quiet Loom", "The Long Drought",
  "Knife's Edge") so the choices read as flavor, not config.

---

## 4. World Genesis v3 (distribution realism)

**Problem observed:** the bubble reads dense at its core; travel feels free.

- Placement remains uniform-in-volume + coreward metallicity bias, but v3
  **widens the bubble and thins it** (sparse preset: ~bubbleR 75 ly, ~180
  systems; min separation 3.5 ly) so lanes are longer and the map breathes.
  True local density (~1 system per 250 ly³) is too empty to be fun; we
  approximate the *feel*: most jumps 6–12 ly, far things genuinely far.
- **Travel time becomes a resource.** Speed stays ~1–1.6 ly/tick, so a
  cross-bubble haul is a real commitment; profit per tick (not per trip)
  becomes the visible metric in route projections; the Exchange shows ¤/tick.
- Cluster structure: 2–3 deliberate *voids* and 2–3 tight associations per
  seed (real stellar neighborhoods cluster), so geography creates strategy —
  chokepoints, shortcuts worth gating, deserts worth avoiding.
- Economy seeding follows geography honestly (already true via planet
  profiles) but **deprivation is curved**: Sol-adjacent systems start poorer
  in stocks but sound in production, so the early game is about *connecting*
  capacity, not finding it.
- **Seeds are validated, not hoped for** (per the research report: internal
  economies are hypersensitive to small numbers). After generation, a
  headless no-player simulation of the opening stretch must show: no
  deadlocked inhabited worlds, real shortage pressure (prompts), and a
  healthy count of profitable routes — reject and reroll otherwise. The
  smoke-test bot infrastructure already exists to enforce this as a test.

---

## 5. The In-System Layer (shipped v1 + v3 role)

Facilities on bodies (mines/skimmers/farms/crucibles/archives/habitats) feed
system markets; one per body; constructed from on-site materials. **v3 makes
this the tutorial's stage** (§3.3) and adds: shuttle-flow as a visible
constraint (dashed arcs between sites, a capacity slider), moon shipyards
(build queue + hull discount), exotic-body installations (neutron stars,
magnetars, white-dwarf foundries — new body types in the planet generator),
and the *Stationwright* origin. Sites tick only in hot systems (§10.3).

---

## 6. Exploration v2 — the cartography profession (Elite-style)

**Explorers do work, carry value, and cash out.** Replaces instant survey
payouts with a held asset:

- Every first-discovery, survey completion, body scan, anomaly find, and
  wonder accumulates **CARTOGRAPHY DATA aboard that ship** (not credits) —
  typed bundles, not a number: `firstlight` (discovery), `survey`,
  `anomalyTrace`, `deepFieldMap` (badlands), `wonderRecord`. Value is fixed at
  collection (distance, region danger, rarity, first-ever bonus, deepcharts)
  and **paid only at sale**; different buyers can favor different kinds later.
- Data is **cashed at a Cartographer's vendor in any populated system** —
  paying credits *and* research, and *only then* revealing the fine detail to
  the player's map (until sold, systems show as "charted — data unsold").
- **Risk:** data is cargo-like. A destroyed scout loses unsold data; raids
  can take a cut; the long ride home with a full data bank is the explorer's
  version of a treasure run.
- Auto-explore gains a **"return and sell when data ≥ X"** policy so the
  profession self-loops like routes do.
- Ties together: market panel (vendor lives there), tech (deepcharts boosts
  data value; deepdrives opens the priciest data), aptitudes (Wayfinding
  chain), exodus (badlands data is the jackpot).
- **Divergent auto-explore** *(shipped with this spec)*: scouts are loosely
  aware of each other — claimed targets and their neighborhoods are
  penalized, and each scout has a personal seeded taste, so two scouts from
  the same dock fan out instead of convoying. Meeting by accident stays
  possible (and cute); duplicating a path doesn't.

---

## 7. UX Ontology — four surfaces, everything has one home

The depth now exceeds the surface. v3 commits to **four top-level surfaces**,
each owning its nouns; everything else is a drill-down within one of them:

| Surface | Owns | Today | v3 change |
|---|---|---|---|
| **MAP** (galaxy/system) | space, selection, camera | ✅ | unchanged — it's the game |
| **COMMAND** (bar + dock Fleet/Routes/Ops) | every ship/route/ops verb | ✅ mostly | add FETCH; ops stays |
| **MARKET** (Exchange + ticker) | prices, trends, opportunities, cartographer vendor, diegetic ads | partial | the terminal overhaul (§8) |
| **YOU** (new dock tab) | identity, sigil, aptitudes, doctrine, stance, milestones, chronicle/codex entry | scattered | aptitudes move here with milestone progress bars and plain-language explanations — a character sheet, not a tech-tree footnote |

**Rules of the ontology:**
- Every interactive element answers itself on hover via the infobox. If the
  infobox can't explain it, it doesn't ship. (`data-info` coverage becomes a
  boot-test assertion.)
- The infobox is the *only* hover surface (no competing tooltips), it never
  overlaps another panel (reserved layout slot), and hover targets are
  visually bounded (hover highlights the element it describes).
- Depth by drill-down, not by surface area: tabs → expanding rows →
  modals, three levels max, Esc always walks back one level.
- Encounters and events are the only modal interruptions, and they must earn
  it (§9).

**The ticker** becomes a carousel: market movers (top price swings from the
history buffers), shortage alerts, contract deadlines, rival doings, and
flavor lines (dock gossip, shipping notices, faction bulletins) rotating on a
gentle cycle; clicking a ticker item focuses the relevant system/panel.

## 8. The Market Terminal (Elite × Mass Effect)

THE MARKET becomes a diegetic terminal: faction adverts and classifieds
between the numbers; movers/shorts feeds computed from existing price
history; per-commodity depth view (producers, consumers, in-flight cargo);
the Cartographer's desk (§6); and easter eggs — classifieds that become
small quests, recurring NPC traders with running jokes, a numbers-station
channel that leaks Loomkeeper fragments. Every row actionable: quick-route,
fetch order, or focus.

## 9. Encounters v2 — scenes, not roadblocks

Principles: an encounter must do something **no other UI can do** — a deal,
a dilemma, a person. Already shipped: combo cooldowns (no reruns), stance-
aware faction weights, portraits. v3 adds:

- **Non-blocking ambient encounters**: most drop-ins arrive as a hailing chip
  (portrait + one line) the player can click to open *or ignore*; ignoring is
  an answer (factions notice). Only stance-grade events pause the game.
- **Unique-by-construction**: each situation template carries a mechanical
  signature unavailable elsewhere (the toll that buys lane intel, the
  drifter who sells a rumor coordinate, the inspector who can wipe infamy
  once). If two encounters differ only in prose, merge them.
- Portraits and ship drawings appear *in* the hailing chip, the ticker, and
  vendor desks — the cast lives in the world, not just in modals.

---

## 10. Architecture (carried from v2, statuses current)

- **10.1 Pure-function core, command journal** ✅ — seed + journal = replay.
- **10.2 Data-oriented SoA econ core** — only when a profile demands (§13.9).
- **10.3 Sim LOD** — hot/warm/cold cohorts; cold = seed + archetype,
  materialized on discovery (planets already work this way). Required for
  sparse-wide galaxies + badlands growth. ◌
- **10.4 Faction-parametric logistics** — rivals on real routes with real
  ships (trade lines ✅; raidable convoy entities ◌).
- **10.5 Price index analytics** ✅; **flags registry, validator, perf meter,
  LOD table** ✅; **UI split into per-surface modules** ✅ (`ui_market`,
  `ui_routes`, `ui_ship`, `ui_system`, `ui_tech`, `ui_modals`).
- **Runtime decision** unchanged: browser JS, data-oriented where hot, WASM/
  Tauri as escape hatches. Python remains rejected (slower + kills pillar 1).

## 11. Badlands & Deep Galaxy (shipped v1) — gated by Deep Drives, rich veins,
salvage derelicts, 3× survey value (becomes 3× *data* value under §6), bridge
weftlines, exodus endgame destination. v3 adds sim-LOD cold cohorts and
badlands-specific secrets (sleeping monitors, wrecked weftgates, neutron-star
wonders shared with §5).

## 12. Telemetry & balance — archetype bots (trader/explorer/warlord/governor)
emitting CSV curves; replay harness; invariant validator ✅; F3 meter ✅.
The §3.4 progression curve gets tuned against bot curves, not vibes.

---

## 13. Migration Plan v3 (each step lands green on both test suites)

Sequencing follows the research report's argument: **simulation first, command
expression second, UI third, narrative last** — the world must produce legible
pressures before the interface can explain them.

1. ✅ Render perf + galactic LOD · 2. ✅ price index · 3. ✅ action journal ·
4. ✅ dev fundamentals · *(v2 steps 5–9 fold into below)*
5. ✅ **Cartography data** (§6) — surveys/discoveries bank typed bundles
   (`firstlight`/`survey`/`deepFieldMap`/`wonderRecord`) aboard the ship;
   sold via `A.sellData` at populated ports for credits + research; lost with
   the ship; auto-explore sells opportunistically and routes home when the
   bank exceeds `TUNE.dataSellAt`; opening-economy no-player sanity check in
   the smoke suite. Remaining: per-kind buyers, codex chart-states, sale
   headlines in the ticker.
6. ✅ **Command grammar v1** (§2.1) — atomic queue on ships (move/buy/sell/
   drop/sellData/wait), `S.intent` compiler, `A.order`/`A.clearQueue`
   journaled actions; FETCH and GO-SELL-DATA intents; the why-line + current
   atom + steps-left always visible in the command bar; ⇄ fetch on every
   market row, ⤳ one-shot fetch on every opportunity. Remaining: interrupts
   (data-full/stranded as injectable rules), more intents (patrol, escort),
   queue editing.
7. ✅ **UI split + ontology** (§7): per-surface modules, cockpit-style
   selected ship (queue visible, tabs), YOU tab (aptitudes home), infobox
   layout slot, ticker carousel. Remaining: data-info coverage test.
8. ✅ **Main menu + intro + Sol tutorial** (§3.1–3.3) — Sol cold open
   prologue (`js/tutorial.js`), Sol Net contract beats; covered by
   browser_boot steps. **Prod-ready menu pass (live):** two-stage front
   door (landing → new-run setup), grouped pause menu, `Esc` opens it,
   Settings panel (audio / reduce-motion / boot-skip / default speed,
   persisted to `starweft_prefs`), textarea import + generic confirm,
   save-slot metadata on Continue/Load, dev/cheat panel gated behind `?dev`.
   Boot sequence (`js/boot.js`) honors reduce-motion/skip. Deployed to
   `star.subsurfaces.net` — see `docs/DEPLOY.md`.
9. **World genesis v3 + run parameters** (§3.5, §4) — density presets,
   voids/clusters, ¤/tick metrics, full seed validator.
10. **Market terminal** (§8) ✅ — WEFT MERCANTILE WIRE re-skin, The Wire
    classifieds generated from real state (`market_analytics.js`).
    **Encounters v2** (§9 — stateful predicates, hailing chips) ◌ open.
11. **Rival convoys raidable** (§10.4); **sim LOD + badlands growth** (§10.3).
12. **System card overhaul** (Elite-inspired system summary). Groundwork
    landed: damped system camera (pan/zoom, dblclick body tracking),
    per-body procedural detail + classification labels, berth pricing
    (`E.berthMult`). Remaining: consolidate the
    scattered system information (panel sections, infobox, codex, market rows)
    into one coherent card per system: a procedural planet strip at the top
    (each body drawn from its real generated details — type, rings, bands,
    caps; click a body to drill into its details, anchorages, and berth
    rates), population rendered as living particle streams between settled
    bodies and the hub, market info inline, and construction that reads as
    placing things in a place rather than rows in a list. Every facility's
    benefit visible before and after building (visual + economic feedback —
    started with `facilityFxText` and the orrery halos; finish the loop here).
13. SoA core only if profiling demands.

## 14. Non-Goals

No frameworks, no bundlers, no npm. No multiplayer. No 3D engine. No second
language without a profile. No tutorial longer than one sitting. No feature
that can't explain itself in the infobox.
