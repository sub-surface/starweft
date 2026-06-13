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
    **Search → card:** the topbar "search systems" should resolve into this same
    system card — selecting a result opens the card (a rich preview: type/region/
    market snapshot/your presence), not just a camera pan. The card is the single
    canonical "what is this system" surface, reached from search, map-click, or
    ticker. **UI/UX cleanup that rides along:** audit fixed-position overlays for
    collisions (the "← THE BUBBLE" button vs the system panel was one — fixed
    2026-06-13 via `#main.inSystem` insetting the panel; sweep for others:
    infobox vs dock at small heights, command bar vs bottom bar), and make the
    panel chrome consistent (bordered buttons, hover states) with the menu pass.
13. SoA core only if profiling demands.

## 14. Non-Goals

No frameworks, no bundlers, no npm. No multiplayer. No 3D engine. No second
language without a profile. No tutorial longer than one sitting. No feature
that can't explain itself in the infobox.

## 15. The Living Galaxy update (design addendum — future)

Status: **design only, not yet built.** This section specs a coherent content
update: richer worlds, rarer and bigger events, named encounters, and deeper
in-system construction — all seeded into normal runs and *amplified* in the
Daily Weave. It builds directly on the systems that already landed: weave
conditions (`D.CONDITIONS`) and decoupled threat (`D.THREAT`) in §13.8, the
sites/anchorage layer (`js/sites.js`), and the seeded deterministic core.

**Design rule for everything here:** every new dynamic must (a) flow through the
seeded RNG so runs stay replayable, (b) be communicable — the player learns what
happened and why through the ticker, infobox, a toast, or a dedicated brief, and
(c) default to off/rare so the baseline game and old saves are untouched.

### 15.1 Anchorage autobuild + supply (the cheapest win)

**Goal:** the autobuild/keep-stocked logic that systems have should extend to
**anchorage sites** (per-body facilities in `js/sites.js`), so a player can set
a site to auto-construct and auto-resupply the way directives already keep a
*system* stocked.

**Feasibility (verified against the code):** sites already share most of the
machinery — `S.buildSite` enforces the same credits + on-site-materials rules as
system buildings, `slotCap(body)` is the "anchorage left" capacity, and
`supplyMission` already routes haulers to deliver materials to a body. What's
missing is the *policy* layer: a per-site directive equivalent. The work:

- Extend the directive model (`state.directives`) with a `site` target kind:
  `{ kind:'site', sys, body, fac }` meaning "keep enough materials here to build
  `fac`, then build it; once built, keep its inputs stocked."
- Reuse `A.supplyMission`/`pickLogisticsShip` for the haul; reuse the
  auto-yard/keep-stocked tick that systems use (game.js pipeline) to fire builds
  when materials are present.
- UI: a "▣ auto-build here" toggle on the site card in the system panel, mirroring
  the existing supply button. Communicated via the same toast + ticker line.
- Tests: smoke drives `A.*` to set a site directive, ticks, and asserts the site
  builds and restocks; browser_boot checks the toggle renders + dispatches.

This is the lowest-risk item — it's wiring existing verbs to a new target, no
new sim concepts. Recommended first build when this update starts.

### 15.2 Diverse systems — stellar variety with mechanics

Today system identity is `type` (frontier/pop/gas/derelict/wonder) + region +
spectral class (`spec`). Add **stellar-class variants that change how the galaxy
plays**, not just labels:

- **White dwarf — slingshot lanes.** A dense remnant whose gravity grants a
  one-hop **travel speedup** to ships routing *through* it (a "gravity assist"):
  reduces effective lane time on its links. Surfaces as a fast-travel hub once
  charted. Hook: lane-time calc in `ships.js` checks endpoint star class.
- **Neutron star / magnetar — research wonder + hazard.** Drains the existing
  Penrose-tap idea (already a vanguard tech) but as a *site*: a magnetar
  installation yields a steady research/power trickle, at the cost of periodic
  flares that damage idle ships in-system (ties to the existing `flarezone`
  region behavior).
- **White-dwarf/neutron placement** is seeded in `galaxy.js` like the existing
  black hole / Dyson husk wonders (1–2 per bubble, off the busy lanes, gated
  behind survey). Daily turns the dial up (see §15.6).
- **Communication:** classification label on the system card (the procedural
  detail strip already labels bodies); infobox explains the mechanic; first
  charting fires a ticker headline ("A white dwarf — the lanes bend fast here").

### 15.3 Bigger, rarer events — the supernova class

Current events are per-system story beats. Add a tier of **galaxy-scale rare
events** with visible build-up and aftermath, run from `worldevents.js`:

- **Supernova.** A flagged massive star (seeded at generation, rare) enters a
  multi-stage countdown: a survey/ticker **warning** ("stellar instability at
  X"), a window to evacuate population and pull ships, then the detonation —
  destroys the system, scatters a one-time **debris/salvage bloom** in
  neighbors, and briefly disrupts adjacent lanes. A grief-and-opportunity beat.
- **Other rare-event slots** (same framework): a **rogue-world passage** that
  temporarily links two distant lanes; a **gamma burst** that forces a
  region-wide shipping pause; a **gold rush** when a derelict's cache cracks
  open. Each is a data descriptor + a staged timer + clear comms.
- **Telegraphing is mandatory.** Big events always announce before they fire
  (ticker + a dedicated alert chip in the topbar, reusing the hail-chip
  pattern), so loss is a *decision the player could have prevented*, never a
  surprise tax. Aftermath gets its own headline + a codex/chronicle fragment.

### 15.4 Encounters — unlikely allies (AI, aliens)

Today's "cast" are human factions. Add **rare named encounters** that are not
guaranteed in a run — seeded, gated behind exploration/conditions, surfaced
through the existing hail/event machinery:

- **The Quiet Intelligence (AI).** A dormant machine mind in a derelict or husk
  system. Hailing it opens a small arc: it can become a one-off **ally** (a
  unique tech, a fleet of autonomous haulers, a survey windfall) or a hazard if
  mishandled. One per run at most, seeded.
- **Drift-kin (alien contact).** A non-human trade culture met at the bubble's
  edge. Opens an alternate market with goods you can't make, a reputation track
  of its own, and lore fragments. Pure upside-with-strings, not a combat faction.
- **Framework:** these are `events_data.js` arcs with `when` predicates keyed off
  survey/region/condition state, plus a few new portrait kinds (the procedural
  portrait system already generates strangers parametrically — extend it with an
  AI/alien visual register). Encounters bank Chronicle fragments so they're
  collectible across runs.
- **Communication:** a distinct hail-chip style (these are *events*, flagged as
  rare/special), an event modal with the new portrait, and a chronicle entry.

### 15.5 More world modifiers (extend `D.CONDITIONS`)

The conditions table is the home for new run-spice. Candidates that pair with the
above:

- **Stellar Nursery** — more white dwarfs / exotic stars; the galaxy is younger
  and stranger (turns §15.2 up at run start).
- **Cataclysm** — rare events fire more often and hit harder (the §15.3 dial).
- **First Contact** — guarantees at least one §15.4 encounter this run.
- **Hermit** — no encounters, no rivals expansion; a pure solo build.
- Each is a small `fx` descriptor read by the owning subsystem, exactly like the
  conditions that landed in §13.8 — no new plumbing, just new levers.

### 15.6 Seeding + the Daily Weave amplifier

- **Normal runs:** the new content is seeded at low rates so a baseline run feels
  enriched-but-familiar — one exotic star, a rare-event *chance*, an encounter
  *maybe*. All through `U.rand`/`U.pick` so it's replayable.
- **Daily Weave:** `dailyConfig()` (already deterministic per date) gets a
  **turn-it-up** profile — it may *force* an exotic star, guarantee a rare event
  window, or seat a specific encounter, and lean harder on conditions. Because
  everyone shares the date-seed, everyone faces the same set-piece that day, which
  is what makes a daily worth comparing scores on.
- **Communication of a daily's twist:** the daily brief (already built) names the
  conditions; extend it to also preview the day's headline set-piece in-fiction
  ("Today: a star is dying in the Verge") without spoiling specifics.

### 15.7 Build order (when this update is greenlit)

1. **15.1 anchorage autobuild/supply** — lowest risk, reuses existing verbs.
2. **15.2 white-dwarf slingshot** — one new mechanic, high feel-per-effort.
3. **15.5 modifiers** for the above — cheap, makes them tunable + daily-ready.
4. **15.3 supernova** — the marquee rare event; sets the telegraph/aftermath
   pattern the others reuse.
5. **15.4 encounters** — richest, most content-heavy; lands last.
6. **15.6 daily amplifier** — woven in as each piece lands, finalized at the end.

Each step lands green on both suites and ships behind the existing default-off
discipline. None of it bumps `SAVE_VERSION` (all additive state).

## 16. The Living Market (design addendum — future)

Status: **design only, not yet built.** Today's market terminal (the WEFT
MERCANTILE WIRE, `js/ui_market.js` + `js/market_analytics.js`) is framed almost
entirely around *commodities* — a tape of prices, per-commodity system rows,
classifieds. The vision here is to make the market read as a **living economy
with culture and politics**, not a price list: a place where systems, companies,
and world-events are first-class, and where flavour and mechanics reinforce each
other. Same discipline as §15 — seeded, communicated, additive, default-quiet.

### 16.1 Reframe: systems & companies as market actors, not just goods

- **System view of the market.** Alongside the per-commodity tape, a per-*system*
  lens: pick a system and see its economic character — what it makes, what it
  starves for, who trades there, your standing, recent price shocks. This is the
  market half of the §12 system card; the two should converge.
- **Companies / trade houses.** Promote the existing rivals (`js/rivals.js`) from
  background trade-lines into **named market actors** with visible holdings,
  price influence, and reputations. A "houses" tab: who controls which lanes,
  who's expanding, who you could buy out, partner with, or undercut. The buyout
  mechanic already exists (`A.buyoutRival`) — surface the standings that make it
  a decision.
- **A real index.** A galaxy-wide economic health read (the weave's "GDP"): total
  throughput, prosperity trend, lane-flow health (`SW.market.weaveHealth` exists).
  Gives the player a macro signal and a thing the news can comment on.

### 16.2 Procedural advertising & classifieds (deeper)

The Wire already generates classifieds from real state. Extend into **procedural
advertising** — in-fiction copy that's *generated from the simulation*, so it's
always true and always flavour:

- Producer ads ("Belt Cooperative: FUEL, freshly cracked, 12% under index — while
  the tanks last"), recruitment, propaganda from ideological systems, rival
  house boasts. Each line is a template seeded by a real fact (a surplus, a
  shortage, a presence shift), so reading the ads is reading the economy.
- Tone varies by the system's ideology/faction (`sys.ideology`, `D.IDEOLOGIES`)
  and by active conditions (§13.8) — Boom & Bust ads get frothy, Pirate Tithe ads
  get shady. Keep it ASCII-safe, monochrome, one accent.

### 16.3 Cultural & political news tied to market events

The ticker (`G.news`) currently carries mostly logistics beats. Add a **news
layer where culture/politics and the market are causally linked**, both
directions:

- **World → market:** an ideological election, a festival, a trade pact, a
  blockade, an embargo (some of these exist as mechanics already) produces a news
  headline *and* a real market move (demand spike, price floor, a lane closing).
  The player sees the cause and the effect, and can trade ahead of it.
- **Market → world:** a sustained shortage breeds unrest; a boom breeds a
  cultural golden age that lifts prosperity/research; a house cornering a
  commodity provokes a political backlash. Feedback loops, lightly tuned.
- **Implementation:** a `D.NEWS_EVENTS` table of {headline template, trigger
  predicate on world state, market effect, optional follow-on}, fired from
  `worldevents.js`/`story.js`, deterministic via the seeded RNG. Big ones get the
  topbar alert-chip; routine ones ride the ticker. Ties naturally to §15.3's rare
  events and §15.4's encounters (alien contact *is* market news).

### 16.4 Build order (when greenlit)

1. **16.2 procedural ads** — pure presentation over existing state; lowest risk,
   immediate flavour. (A tiny taste could even ship early — a few seeded ad lines
   in The Wire — without the rest.)
2. **16.3 news↔market links** — the causal layer; the highest gameplay payoff.
3. **16.1 system/company framing** — the structural reframe; converges with the
   §12 system card and the rivals sim.

As with §15: each step green on both suites, additive state, no `SAVE_VERSION`
bump, everything communicated in-fiction.

## 17. Procedural soundtrack (design note — future)

Status: **note only.** Audio today (`js/audio.js`) is a small Web Audio synth —
SFX plus an ambient bed that reacts to mood (`SW.audio.updateMood`). The ambition
is a **richer procedural soundtrack** that breathes with the run: layered ambient
beds that shift with region (the quiet vs the verge vs the reach), the Scourge's
pressure, prosperity, and combat — generative, not looped, and still zero-asset
(synthesized in-browser, no audio files, to keep the zero-dependency rule).

Constraints to honour: all synthesis stays in `audio.js` (the only audio-touching
module), must degrade gracefully where there's no `AudioContext` (the boot test
asserts this), and must never block the sim. Determinism does *not* apply to audio
(it's presentation, like `Math.random` in UI code) — but mood transitions should
key off real sim state so the music *means* something.

**Collaboration hook:** the maintainer produces ambient-jungle music in Ableton.
A future working session could capture the building blocks a generative engine
needs — pad/texture/percussion stems, chord voicings, a tempo/feel reference —
and translate those into Web Audio synthesis recipes (oscillator stacks, filter
envelopes, granular textures) so the in-browser soundtrack carries that signature
without shipping any audio files. See the memory `boot-and-audio-refs`.

## 18. New Weave — authored worlds (run-setup expansion)

Status: **shipped (Tier 1+2).** The run-setup panel (`showNewRun`) graduated
from "config dials" to "authoring a world." Everything here is additive and
JSON-serializable — no `SAVE_VERSION` bump; old saves load (read every field
defensively). The goal is texture: parameters that change a run's *story*, not
just its difficulty multiplier.

All new dials live in `D.WORLD` (galaxy shape/history) or as their own tables;
all read through `D.resolveWorld(opts)` into `state.world` so generation and the
forecast both see one resolved object. Identity gains a **Founding Myth**; the
Scourge gains a **name and temperament**; three new conditions extend
`D.CONDITIONS`.

### 18.1 Galaxy Age — *The Sundering* (`D.WORLD.age`)

How long ago the worlds drifted apart. Tints generation, not difficulty.

- `young`   — "A Recent Sundering": some old lanes survive. More pre-discovered
  systems around home (extra revealed ring), slightly denser lane graph.
- `settled` — the standard galaxy (default).
- `ancient` — "The Long Forgetting": fully dark. Fewer systems start discovered,
  but ruin-rich Halo regions are more common and pay more research.

Hook: `galaxy.generate` reads `W.age` after the home reveal (step 8) to widen or
narrow the discovered ring; `assignTypes`/region weighting nudged by age.

### 18.2 Topology — *Weave Pattern* (`D.WORLD.topology`)

A hint that biases the procedural fill's clustering, not a hard graph rewrite
(the Gabriel graph stays the lane source of truth).

- `natural`   — the existing uniform-in-volume + coreward bias (default).
- `filaments` — long sparse strings: raise `minSysDist`, lower count slightly →
  every lane precious.
- `cluster`   — tight knots with lonely bridges: fill seeds extra associations.
- `halo`      — rich discovered core ringed by a dark frontier.

Hook: `fillProcedural` reads `W.topology` to adjust jitter/clumping; pure
generation-time, no sim cost.

### 18.3 The Heart — *where you wake* (`D.HEART`, resolved to a start system)

Decouples the start system from origin. Applied in `game.newGame` after galaxy
gen, before ship creation (so origin's `startReach` still composes/overrides).

- `core`  — safe, rich, slow. Start nearer Sol/coreward-rich; Scourge reaches
  you last. (Default → home/Sol.)
- `rim`   — poor, exposed, but bought time: start at a high-`hops` frontier
  world; +starting reveal of neighbors.
- `drift` — no settled home: start at an unsettled system, claim it. Slightly
  more starting credits to compensate; story flag `heart_drift` for flavor.

### 18.4 Founding Myth — *The First Thread* (`state.identity.myth`)

One-line seed of lore chosen in Identity. Pure flavor: tints opening news and
event text; never a mechanical lever. Stored on `identity.myth` (id into
`D.MYTHS`); `D.MYTHS[id].line` is the screenshot-able sentence. A "—" option
means none. Surfaced via `G.news` on tick 0 and available to events as
`state.identity.myth`.

### 18.5 Named Adversary — *the Scourge has a name* (`state.scourge.name/temperament`)

The threat stops being a faceless clock. At `scourge.init`, seed a name (from
`D.SCOURGE_NAMES`) and a **temperament** (`D.SCOURGE_TEMPERAMENTS`) that lightly
modulates spread feel — patient (slower, steadier), ravenous (faster, greedier
toward rich worlds), capricious (more variance). Temperament defaults so that
'inherit' threat = the neutral profile (no balance change unless chosen). The
name threads into the awakening news line and existing scourge events.

Hook: `scourge.init` sets `sc.name`, `sc.temperament`; `scourge.tick` reads the
temperament multipliers where it already computes interval/target. Determinism
preserved (named via `U.pick(state, ...)`).

### 18.6 Three new conditions (extend `D.CONDITIONS` + `D.CONDITION_ORDER`)

- **The Long Memory** (`longMemory`, harder) — rivals hold grudges: undercut one
  and it presses your lanes. `fx.rivalGrudge: true`, read in `rivals.tick`.
- **Pilgrim Tide** (`pilgrimTide`, wild) — passenger demand surges; people are
  *leaving*. `fx.passengerMult: 1.8`, read where passenger offers generate.
- **The Quiet Year** (`quietYear`, kinder) — the first ~50 cycles are utterly
  still: no story/world events. `fx.quietUntil: 50`, gated in story/worldevents
  tick. A meditative opening.

### 18.7 Menu, forecast & QOL

`showNewRun` gains an **age / pattern / the heart** dial in the Galaxy column and
a **Founding Myth** select in Identity. `forecastLine` extends to mention age and
heart in plain language. `dailyConfig` derives the new dials from the date hash
so the Daily Weave stays deterministic and shared. The begin handler threads the
new fields into `newGame`.

**Layout & QOL polish** (the panel earns the "love and care" bar):

- **Aligned dial grid.** The right column is one `label | control` CSS grid
  (`.dialGrid`) — every select flush and full-width, labels right-aligned —
  instead of ragged wrapping `.row`s. `world` split into the clearer
  `systems` / `markets` rows.
- **Collapsible sections.** *Inclination* and *Weave conditions* are folded by
  default (`foldHead()` + `[data-fold]` wiring), so the whole panel fits without
  scrolling. Weave conditions shows a live **count badge** of how many stack.
- **Per-dial hover tooltips.** Native `title=` on each Galaxy label (the in-game
  infobox HUD doesn't exist behind a pre-game modal). Tip text is generated from
  the data tables (`tableTip()`) so it can never drift out of sync.
- **"✦ surprise me"** rolls every dial + a fresh myth/name/motto/sigil, then the
  player tweaks to taste (`m.surpriseWeave`). **Name reroll** (`↻` by the network
  name) draws from a small curated adjective/noun pool (`m.rerollName`). Both are
  UI-only (`Math.random`, never the sim RNG).
- **Themed form controls.** `accent-color` on range/checkbox so the hue slider
  and toggles match the monochrome + one-accent palette.

Tests: smoke (new tables resolve, determinism incl. adversary name, condition fx,
quiet-year actually stills events) + browser_boot (all selectors render, folds &
QOL controls present, randomizers run, begin still works).
