# REWEAVE — The STARWEFT v4 Rewrite Contract

*The worlds drifted apart. You are the thread. Now pull.*

Status: **proposed v4 contract.** Written as a full rewrite specification —
strip-down to the functional core, rebuild with intention, retain what worked.
Supersedes `SPEC.md` upon owner acceptance; until then `SPEC.md` remains the
shipped game's contract and this document is the argument for replacing it.
The tech-tree material in `docs/` is explicitly ignored here per the owner's
direction; `docs/DECISIONS.md` entries about the atlas apply to the old game,
not this one. The decision-texture analysis in
`docs/reviews/DECISION_TEXTURE_AND_CORE_VERB_OVERHAUL.md` is absorbed:
its theory section (§1: situational vs non-situational decisions, verb power,
the exception economy) is carried forward as foundation; its mechanical
proposals are re-expressed inside the new verb rather than bolted onto the
old one.

Four scope decisions this contract commits to:

1. **Run shape:** focused runs (1–3 hours) with a persistent meta layer (the
   Chronicle). Runs end — in triumph, in ruin, or in flight — and ending is
   what makes risks and builds real.
2. **Render core:** Canvas 2D, kept. The continuous-zoom architecture (§8)
   does the heavy lifting; raw hand-written WebGL2 (still zero-dependency)
   is a sanctioned escape hatch *only* if the F3 budgets fail after the LOD
   work lands — same doctrine as the old spec's WASM/Tauri clauses.
3. **Verb:** one, fully committed, designed end-to-end (§4). Runners-up
   documented in §15 so the road not taken stays visible.
4. **Constraints kept, verbatim:** zero dependencies, zero build, `file://`
   playable; DOM-free deterministic sim; one JSON state object; seeded RNG
   only; journaled actions; both test suites green at every landing.

---

# 1. Critique — an honest read of the shipped game

Before rebuilding, say plainly what is on the table. This is written as a
review by a dev who likes this game and has shipped enough of them to know
which affections to distrust.

## 1.1 What genuinely works (the protected core)

- **The engineering discipline is rare and precious.** Seed + journal =
  replay; sim runs headless; ~110k assertions across two dependency-free
  suites; state is one JSON object. Most indie codebases never achieve this.
  Every line of the rewrite inherits it unchanged.
- **Materials-on-site construction.** Building anything *somewhere* requires
  physically getting stuff *there*. This single rule makes geography matter
  forever and is the most distinctive mechanic in the game. Kept, and made
  more central (§7.4).
- **Prosperity as the progression engine.** Worlds you feed thrive, and
  thriving worlds power your advancement. The "nice strategy" being the
  engine is the game's moral signature. Kept, re-plumbed (§6.3).
- **The tone.** Cozy-but-vast, monochrome restraint, ≤50-word events, the
  quiet dread of the Scourge. The writing voice survives the rewrite intact.
- **Watching the weave hum.** The automation dopamine — trades pulsing,
  threads thickening — is the reward the whole game is built to deliver.
  The rewrite keeps the reward and *changes what earns it*.

## 1.2 What accreted (the honest part)

Fifteen thousand lines, thirty-seven files, twelve audit documents. The
audits themselves are the tell: a game that needs twelve reviews to describe
its own behavior is a game whose design debt is being *managed*, not
resolved. Specifics:

- **The verb fragmented.** "Send ships to move things" is expressed through
  at least ten command forms: manual send, fetch intent, routes with five
  stop-action types, smart routes, directives, chain routes, supply
  missions, auto-yards, exchange bulk-assign, auto-explore policies. Each
  is individually defensible; together they are three parallel automation
  abstractions with three UIs teaching three mental models for one idea.
  The player's mastery curve is spent learning *interfaces*, not the world.
- **Two disconnected map views.** The galaxy map and the in-system view are
  separate modes with separate cameras, separate selection semantics, and a
  seam (`#main.inSystem`) that the codebase itself keeps tripping over
  (overlay-collision fixes in the decision log). The universe should be one
  continuous place.
- **The tech tree is a shopping list.** Flat multipliers (+25% cap, +25%
  speed, −25% cost) bought with a currency. Strict upgrades are not
  decisions; a tree of them is a chore with a progress bar. (The atlas UI
  work was good execution of content that didn't deserve it.)
- **Systems as barnacles.** Combat, civics, quests, codex, star catalogue,
  world events, lore, portraits, market analytics — each fine alone, none
  load-bearing, all demanding UI surface and tick time. The dock has seven
  tabs. Pillar 3 says panels serve the map; the panels won.
- **Risk without stakes.** Ships are cheap, upkeep is small, the Scourge is
  slow, saves are free. Nothing the player wagers can really be lost, so
  nothing the player wins really lands. The game has *pressure* but not
  *risk* — and risk is the thing the roguelike frame exists to provide.
- **render.js at 1,833 lines and ui.js at 1,108** with a monolithic
  dispatch switch: the code shape mirrors the design shape. Not a
  criticism of craft — a symptom of accretion.

## 1.3 The rewrite thesis

Strip the game to its five protected assets (§1.1). Rebuild around **one
scale-invariant verb** that carries risk in its grammar (§4), inside **one
continuous zoomable universe** (§8), under a **roguelike run structure**
where builds are drafted and losses are real (§5), wearing an **AMOLED
skin** where every photon is spent deliberately (§9.5). Everything else —
economy, opposition, story, meta — is rebuilt as a servant of those four.

---

# 2. Design theses

Stated once, enforced everywhere. These replace the old pillar list.

1. **One verb, fractal.** The same gesture plays at every scale: between
   moons, between stars, between galaxies. If a feature cannot be expressed
   as the verb or a modifier of the verb, it does not ship.
2. **The zoom is the game's body.** Not two views stitched together — one
   camera from Earth's orbit to the cosmic web. Scale is progression,
   spectacle, and interface all at once: how far you can *see* tracks how
   far you can *reach*.
3. **Risk is the texture of every decision.** Every act of expansion is a
   stake that can be lost. The player is always somewhere on the curve
   between banking and pressing — and the game always shows the exact odds
   (roguelike fairness: no hidden dice, ever).
4. **Runs end.** A run is an authored arc of 1–3 hours with three endings
   and real death. The Chronicle makes endings additive across a career.
5. **Builds are drafted, not shopped.** Identity comes from seeded 1-of-3
   choices under pressure, not from a solved purchase order.
6. **Automation is still the reward** — but what you automate is what you
   have *won*, not what you have configured. An anchored thread runs itself
   forever; nothing else runs at all.
7. **Legible opposition.** The Scourge and the rivals play the same board
   with telegraphed moves. The player should feel like they are reading an
   opponent, not weathering a weather system.
8. **Darkness is the canvas.** True black, light as currency. If a pixel is
   lit, it is information or it is beauty, and usually both.

---

# 3. The player's journey (UX from cold start to career, in one pass)

The whole experience, narrated from the player's chair, before any mechanics
are formalized. Everything in later sections exists to make this hour true.

**Minute 0.** Black screen. A single white point — Earth — and a caption:
*"The worlds drifted apart."* The point grows as the camera falls in: a
night-side disc, city lights. One more line: *"You are the thread."* A
gentle pulsing ring around the Moon: the first signal. No menu, no logo
wall; the title *is* the first play surface. (Returning players get the
front door — §10.4 — but a fresh install boots into this.)

**Minute 1 — the first cast.** The tutorial voice (the Guild's last
archivist, text-only, ≤50 words a beat) says: *"Drag from Earth to the
Moon."* The player drags. A luminous thread arcs out, a small stake chip
(*"◈ 50 staked"*) rides it, and when it lands, the Moon's card flips face-up:
what it has (regolith, cold), what it wants (food, air). Two buttons rise on
the thread itself: **ANCHOR** and **PRESS**. The voice: *"Anchor it."* Click.
The thread hardens from gossamer to cable, tiny freight grains begin to flow
along it both ways, and a counter ticks up: the first income. The player has
learned 80% of the game in ninety seconds, and every bit of it was diegetic.

**Minutes 2–10 — Sol, the safe table.** Casts to Mars, the Belt, Europa.
Sol is *safe water*: threads here cannot snap, and the tutorial says so in
exactly those words — training wheels that are named, so their removal
later is a felt event. The player learns PRESS (extend the thread onward
from Mars to the Belt before anchoring — the multiplier chip climbs), CUT
(abandon a cast, recover most of the stake), and the hole card (unsurveyed
bodies show face-down cards — press to reveal). One construction beat:
the Moon anchorage wants a hydrofarm; materials must *arrive*; the player
casts a supply thread carrying cargo. Prosperity blooms visibly; the first
**Aurora** fires (§5.2) and offers the first draft: three skill cards, pick
one. The camera has been quietly pulling back this whole time, a few
percent per milestone — by minute ten, Sol is a small bright knot and the
nearest stars are faintly visible. The zoom-out was never a button; it was
*earned framing*.

**Minutes 10–15 — the first real cast.** Alpha Centauri glows with a
signal ring. The voice: *"Out there, nothing is promised. Every cast is a
wager now."* The cast UI now shows what Sol hid: the **tension meter** and
an exact snap chance per press. First interstellar anchor lands; the run
proper begins; the title card finally drops — fifteen minutes in, the way
Hades or Outer Wilds trusts its opening.

**The first hour — the weave.** The bubble unfolds. Casting, pressing,
anchoring; Auroras every few minutes early, slowing later; the first rival
weaver's threads appear at the fringe, unmistakably *cast by someone
playing your game* — you watch them press, you watch one of theirs snap.
Anchored threads staff themselves from the hull pool (there is no route
editor in this game — see §6.4); the player's clicks are spent almost
entirely on frontier decisions, which is the point.

**The mid game — the wake.** The Scourge wakes with a name, and the board
changes character: its next moves are *declared* on a visible ladder (§6.2).
The game stops being solitaire and becomes chess with a dealer. Threads near
the front carry surcharged tension; some anchors must be reinforced,
evacuated, or coldly written off. Drafts from here on are triage-flavored.

**The end game — three doors.** Cure (a final convoy cast into corrupted
space — the hardest table in the game), Fortress (close the Ring and hold),
or Exodus (the Long Cast: a multi-stage intergalactic press with no anchor
until the far shore — the ultimate hand, played at a zoom band the player
has never needed before and suddenly *needs*). Or death: home severed, or
the bankroll busted with no anchored income. Death gets a dignified
epitaph screen, not a punishment screen.

**After.** Zoom out past everything. The player's run — win or lose — is
burned into the deep field as a faint constellation among their previous
runs: the Chronicle (§10), literally visible at universe scale. New
origins, starting decks, and codex pages unlock. NEW WEAVE.

Every mechanical section below is in service of that arc.

---

# 4. THE VERB: CAST

## 4.1 One gesture

> **Drag from anywhere you hold to anywhere you want.** That is the entire
> input model of expansion. No panel, no mode, no click-click. Tap
> inspects; drag casts; scroll moves through scale. The whole game is
> playable with a mouse, a trackpad, or a thumb.

A **cast** launches a thread: a luminous line that flies from your network's
edge toward the target, carrying a **stake**. The thread is not a ship
order, a route, or a mission — it is all of those, unified: the single
first-class object of play.

## 4.2 The blackjack grammar

The verb's risk rules map deliberately onto the most legible gambling
grammar ever designed. The mapping is structural, not cosmetic:

| Blackjack | REWEAVE | Meaning |
|---|---|---|
| The bet | **Stake** | Credits + hull-time committed when the cast launches. Lost if the thread snaps. |
| The deal | **Reveal** | Arriving at a body/system flips its card: yields, wants, hazards. Unsurveyed space is face-down. |
| Hit | **PRESS** | Extend the thread onward to another target before banking. Multiplier rises; so does tension. |
| Stand | **ANCHOR** | Bank the hand. The thread hardens into permanent infrastructure: an auto-staffed supply line + a claim on every system it touches. |
| Bust | **SNAP** | Tension check fails on a press: the thread breaks, the stake is gone, the casting hull is stranded or lost. |
| Double down | **OVERSTAKE** | Double the stake mid-flight for double the anchored yield — one press only, no cut allowed after. |
| Split | **SPLICE** (skill) | Cut a live thread into two independently-anchorable halves. |
| Insurance | **BACKSTAY** (skill) | First snap per act refunds half the stake. |
| Card counting | **Reading the board** | Not a skill — *the game itself*. Hole cards, hazard fields, and the Scourge ladder are partial information the player learns to read. Skills widen the read (§5.3). |
| Surrender | **CUT** | Abandon a live cast; recover `1 − cutLoss` of the stake. Always available. Folding is a skill in this game, and the UI never shames it. |
| The dealer | **The Scourge's tempo** | The house pressure that rises every act (§6.2). You are not playing against the odds; you are playing against a clock that worsens them. |

**Tension** is the bust meter: a single number per thread, starting at the
region's base hazard and rising with every press (distance pressed, hazard
of the space crossed, Scourge proximity, rival contest). On each press's
reveal the game rolls once against tension — **and the exact snap
percentage is printed on the button before you press it.** No hidden dice,
no fudging, ever. Deterministic via `U.rand(state)`; the journal replays
every hand.

**Multiplier** is the greed meter: each press raises the anchored value of
the whole thread (base +25% per press, plus gradient bonuses for spanning a
genuine want — see §6.3). A three-press thread anchored through a starving
world is worth several safe one-hop anchors. That arithmetic — bank small
or ride the hand — is the heartbeat decision of the entire game, made
dozens of times per run, never the same twice because the board is never
the same twice.

## 4.3 The chess grammar

Blackjack supplies the *risk* texture; the positional layer supplies the
*opponent* texture. Threads and anchors live on the lane graph, and three
other players move on it with declared intentions:

- **The Scourge declares its reaches.** Its next 1–3 spread targets sit on
  a visible ladder with countdowns (§6.2). A declared reach is a chess
  threat: you can defend (reinforce the anchor), counter (the **Gambit** —
  anchor a fresh thread into the threatened system before the reach lands;
  if you make it, the reach is parried and the claim is doubled), evacuate,
  or concede the square deliberately.
- **Rival weavers cast visibly.** Their threads fly in real time; first
  anchor claims the system. A rival's live cast can be *raced* — counter
  casting to the same target is a tempo battle you can win with a shorter
  line or a faster hull. Late-game pacts are non-aggression agreements over
  regions of the board, and breaking one is remembered.
- **Zugzwang is real.** Because staffing draws from one hull pool (§6.4)
  and the Scourge tempo never stops, the late game reaches positions where
  every available cast weakens something — and the skill ceiling is
  choosing *which* weakness to accept. This is the "speculative interstellar
  chess" the game is named for at parties.

## 4.4 Scale invariance (the fractal clause)

CAST is the same verb at every zoom band:

- **Orbital band:** cast Earth → Moon. Tension ~0, stakes tiny. The
  tutorial table.
- **System band:** cast between planets and belts. Hazards: flares, debris.
- **Interstellar band:** the main game. Cast star to star; press along
  lanes; tension real.
- **Galactic band:** cast between *regions* — a colossal thread bridging
  the bubble to a far arm, abstracting the systems between. Endgame-tier
  stakes.
- **Intergalactic band:** the Long Cast (Exodus ending): one thread, many
  presses, no anchor possible until the far galaxy's shore. The hardest
  hand in the game, played once, for everything.

One verb, five tables, rising stakes. The continuous zoom (§8) is not a
camera feature adjacent to the verb — it is the verb's address space.

## 4.5 What happened to DELIVER

Delivery is not demoted; it is *absorbed*. An anchored thread **is** a
standing delivery: freight grains flow along it automatically, serving
wants, feeding factories, hauling construction materials. The old game's
ten command forms collapse into two:

1. **CAST** (with PRESS / ANCHOR / CUT / OVERSTAKE) — the frontier verb,
   the player's hands.
2. **Supply casts** — a cast whose stake includes cargo, used for
   materials-on-site construction (§7.4), relief (§6.3), samples, and the
   Panacea convoy. Mechanically the same gesture with a hold.

Everything the decision-texture spec wanted from "every effect is a
delivery arriving" survives: construction, cure, rescue, relief, and data
all still move as freight — but now they move along objects the player
*wagered into existence*, which is why they matter.

## 4.6 Fairness doctrine (roguelike table stakes)

- Every probability shown before every commitment, exactly.
- Every opposition move telegraphed with a countdown.
- Snaps never cascade invisibly: a snap strands the hull (recoverable via a
  rescue cast) unless tension was pressed past 100 by choice.
- No unwinnable states: the anti-stall guarantees (stipend, salvage) carry
  over as the Guild's grim generosity, throttled and diegetic.
- Determinism absolute: seed + journal = the run, including every reveal
  and every snap.

---

# 5. Risks and builds — the roguelike spine

## 5.1 The run

**Length target: 60–180 minutes.** Four acts, three endings, one death.

- **Act I — Sol (10–15 min).** The safe table. Tutorial-as-play (§3). Ends
  with the first interstellar anchor.
- **Act II — The Weave (30–60 min).** The bubble. Rivals. Auroras and
  drafts. Bankroll and identity compound. Ends when the Scourge wakes
  (clock seeded per difficulty, telegraphed by rim whispers).
- **Act III — The Wake (30–60 min).** The board polarizes. Tempo rises.
  Triage, gambits, losses. The three endgame doors unlock their entry
  conditions.
- **Act IV — The Door (15–30 min).** Cure, Fortress, or Exodus (§5.4). Or
  the epitaph.

Real-time with pause, 1×/3×/10× kept — but **press decisions auto-pause**.
The game breathes in real time and thinks in turns; FTL proved the blend.

**Death:** home severed by the Scourge, or bankroll ≤ 0 with no anchored
income (a bust with no hand left). Death ends the run — no save-scumming;
autosave is continuous and singular. (A "Drift" assist toggle — death
becomes a heavy setback — exists in settings for players who want a
sandbox; it marks the Chronicle entry accordingly, without shame.)

## 5.2 Auroras — the draft clock

Prosperity milestones (network-wide thriving, the protected engine from
§1.1) fire **Auroras**: draft 1 of 3 skills. Offers are seeded per run and
weighted by your school lean (below) and your board state — a run bleeding
snaps sees more Knot cards; a run swimming in bankroll sees Warp bait.
~10–12 Auroras per run; the pace front-loads (every few minutes in Act II,
scarce in Act IV, so late drafts feel enormous).

The old research currency, tech tree, and atlas UI are **deleted**. The
draft *is* progression. Prosperity → Aurora → skill: the causal chain that
made research legible survives with one link fewer.

## 5.3 Schools and skills

Three schools, named for the loom. Each skill modifies the verb — its
odds, its reads, its stakes, or its aftermath. **No flat multipliers.**
The audit rule from the decision-texture spec is law: *an unlock must
change what you consider, not multiply what you were already maximizing.*

**WARP — the long threads (casting, reach, nerve):**

| Skill | Effect |
|---|---|
| Lodestone Sense | See one extra ring of hole-card info before each press. |
| Overreach | May press past tension 100; snap odds ramp double, multiplier +50% per press out there. |
| Twin Cast | Once per cast, fork the thread; halves share the stake, anchor independently. |
| Ghost Thread | Live casts invisible to rivals until anchored — no races against you. |
| Long Arm | Casts may originate from any anchored system, not just the network edge. |
| Gambit Master | Parried reaches (Gambit, §4.3) also refund the cast's stake. |
| Featherline | The first press of every cast adds no tension. |
| Star Reader | Hole cards in surveyed regions are permanently face-up. |

**WEFT — the cross threads (bankroll, flow, greed):**

| Skill | Effect |
|---|---|
| Compounding | Anchored threads yield +2% per act of age (cap +30%). |
| Arbitrage Eye | The three steepest live value-gradients glow as auroras on the map. |
| Deep Pockets | Once per act, a bust to ≤0 bankroll sets you to 100 instead. |
| Silk Route | Threads spanning 3+ anchors gain a caravan bonus to yield. |
| Tariff | Rival threads crossing your claims pay you a toll. |
| Quartermaster | Supply casts carry +50% cargo per stake. |
| Festival | Anchoring into a starving world triggers an immediate prosperity surge (and often an early Aurora). |
| Overstaker | OVERSTAKE may be used twice per cast. |

**KNOT — the anchors (defense, salvage, cold blood):**

| Skill | Effect |
|---|---|
| Backstay | First snap each act refunds half its stake. |
| Hard Anchor | Each anchor shrugs off one Scourge reach (once). |
| Splice | CUT a live thread into two anchored halves — salvage a bad hand. |
| Redundancy | Systems inside an anchored *loop* (a cycle) cannot be isolated by severs. |
| Watchtower | Anchors reveal hole cards in a radius. |
| Cold Iron | Pirates never strike anchored threads. |
| Triage | Evacuation casts stake nothing. |
| The Knot | Capstone: one system, once per run, made permanently unseverable. |

Two dozen shown; target ~36 at content-complete, all in one data table.
School lean (majority of drafts) unlocks a **capstone stance** in Act III
that colors the ending you're best equipped for — Warp leans Exodus, Weft
leans Cure, Knot leans Fortress — *leans*, never locks.

## 5.4 The three doors

- **CURE.** Research the Panacea (sample supply-casts from the front → an
  enclave anchor), manufacture it along your weave, then run the final
  convoy: a supply cast into corrupted space where tension starts at 80 and
  every press is a held breath. Delivering the full dose at the origin ends
  the run in dawn. The old game's ending, now played entirely in the verb.
- **FORTRESS.** Close **the Ring**: a continuous anchored loop enclosing a
  chosen heartland, every arc reinforced, then survive a named number of
  tempo escalations as the Scourge throws everything at it. A defense
  ending that is *built*, not weathered.
- **EXODUS.** The Long Cast (§4.4): stake nearly everything on one
  intergalactic thread. Multi-stage presses across the dark between
  galaxies — each stage a reveal (void stations, drifting wrecks, the
  intergalactic medium's strange weather) — no anchor until the far shore.
  Arrival founds the new weave and ends the run in departure. The camera
  work alone (§8) makes this the game's poster.

## 5.5 Difficulty

One dial with named tables, all modifying the *dealer*, never the player's
odds display: **Kind** (slow tempo, generous reveals), **Standard**,
**Sharp** (faster tempo, more face-down space), **Knife** (Act III starts
earlier, snaps strand hulls permanently). Plus the **Daily Weave**: shared
seed, fixed draft offers, one board for everyone — the score is compared
because the hands were the same.

---

# 6. The world — economy, opposition, automation

## 6.1 Strip-down inventory

| Old system | Fate |
|---|---|
| Routes, directives, chain routes, exchange, auto-yards | **Deleted.** Anchored threads self-staff (§6.4). |
| Tech tree, research currency, atlas UI | **Deleted.** Auroras + drafts (§5.2). |
| Combat layer (raids, retainers, blitz, embargo, infamy) | **Folded** into thread hazards + the Tariff/Cold Iron/Gambit skill space. Piracy is weather with a face; war is contested casting. |
| Civics, quests, star catalogue, codex-as-tab | **Folded** into events, the Chronicle, and system cards. |
| Berth micro / in-system hops | **Folded** into orbital-band casting — same verb, smaller table. |
| Market terminal, analytics, price history | **Rebuilt small**: one market lens on the system card + the gradient auroras. The economy is read on the map, not in a spreadsheet. |
| Rival trade-line sim | **Rebuilt** as rival weavers (§6.2). |
| Story/event engine, hails, portraits | **Kept**, pruned to the encounter principles (a deal, a dilemma, a person; ≤50 words; ignoring is an answer). Events now deal in the verb's nouns: a stranger sells a face-up card; a toll buys safe tension through a strait; a defector is cargo. |
| Scourge, prosperity, materials-on-site, seeded gen, journal | **Kept and promoted.** |

## 6.2 The opposition

**The Scourge is the dealer.** Named and tempered per run (kept from §18 of
the old spec — good design survives). It plays on a visible **ladder**: a
column of declared moves with countdowns — REACH (spread to a named
system), SEVER (cut an unanchored thread crossing its aura), TIDE (raise a
region's base tension), and, for the capricious temperament only, FEINT (a
declared reach that may swap targets at half-count — *and the swap odds are
printed on the ladder*, because fairness outranks drama). Tempo — the
ladder's speed — rises each act. The player is always reading a hand the
house shows.

**Rival weavers** (0–3 per run) play the player's literal game: visible
casts, presses, anchors, snaps. Their AI is legible-by-construction — each
has a named style (the Actuary banks at two presses, always; the Gambler
rides to four; the Cartographer hunts face-down space) so reading them is
learnable. First anchor claims a system; claims gate yields; races and
pacts follow (§4.3). When the Scourge takes a rival's heartland, you watch
their weave go dark thread by thread — the mid-game memento mori.

## 6.3 The economy, rebuilt honest

Systems keep wants, stocks, and prosperity — the simulation heart is
retained but simplified to what the verb reads:

- Every system card shows **makes / wants / mood** in one glance. Prices
  collapse into **gradient**: the steepness between what's cheap here and
  dear there. Gradients are what casting *across* pays.
- **Anchored threads serve gradients automatically** and yield bankroll per
  tick proportional to gradient served × prosperity of the served end.
  Serving a starving world (a **relief anchor**) pays less cash but more
  prosperity — and prosperity is the Aurora clock. Greed and grace are two
  yields on one meter, chosen thread by thread.
- **Prosperity remains the only progression currency.** Feeding worlds is
  still the engine of everything.

## 6.4 Automation: the hull pool

There are no ship orders. There is a **hull pool**: freighters, built at
yards (materials-on-site), that auto-staff anchored threads by simple
visible rules (nearest idle, biggest gradient first). The pool size is the
player's one logistics dial: too few hulls and anchors under-serve
(visibly — thin, flickering flow); too many and upkeep bleeds the
bankroll. Casting itself always requires a dedicated **loom-ship** — the
player's handful of named, precious casting vessels (start with one; a run
might end with four). Loom-ships are the run's real fleet: losing one to a
deep snap *hurts*, and that hurt is the risk economy working.

This resolves the automation paradox by construction: the network runs
itself because the network is *made of banked hands*; the player's
attention lives permanently at the frontier, where the verb is.

---

# 7. Construction, relief, and the supply cast

## 7.1 Anchors have slots

An anchor is a place. It holds 1–3 **works**: Bastion (reach resistance),
Yard (hulls + loom-ship repair), Enclave (Panacea research), Gate (a
standing shortcut lane — late, precious), Beacon (extends cast origin
range), Berth (evacuation capacity). Six works total. Not thirty. Each is
a real decision because slots are scarce and materials must arrive.

## 7.2 Materials-on-site, kept sacred

Every work is built by a **supply cast** — the same drag, with a hold. The
old game's founding insight now rides the new verb: building the Ring in
Act III is a *logistics campaign of wagers*, which is the entire game in
one project.

## 7.3 Relief and rescue

Relief anchors (§6.3) and evacuation casts (Berths, Triage skill) make the
humane play a first-class use of the verb — and the Scourge's ladder makes
them urgent. The refugee cohort system survives in simplified form:
threatened worlds queue souls; berthed threads and NPC convoys drain the
queue; whoever remains when the reach lands is lost with the world. Some
hands you play for people, not payout, and the Chronicle remembers which.

---

# 8. THE LOOM ENGINE — one continuous universe

## 8.1 The camera

One camera, one coordinate: **Z, the log-scale zoom**, from planetary
orbits (~10⁷ m) to the cosmic web (~10²⁵ m). Pan and zoom are the only
camera verbs; double-tap focuses; the scale ruler (a thin luminous log
ruler, part of the AMOLED chrome) always shows where you are. There are no
view modes, no seams, no `#main.inSystem`. The de-split is total.

**Coordinates are hierarchical to defeat float death:** position =
(universe cell → galaxy id → sector → system-local AU → body-local km),
each level a float comfortably within precision. The camera holds a *focus
node* plus local offset and re-parents as Z crosses band boundaries.
Deterministic, JSON-safe, and — crucially — cheap: any object's world
position is only ever computed *relative to the current focus*, so the
render never touches numbers bigger than a band's span.

## 8.2 The LOD bands

Seven bands. Each declares what is drawn, what is interactable, what the
sim does, and its render budget. Budgets are contracts, enforced by the F3
overlay and a headless test (§12).

| Band | Z range (m, order) | Drawn | Interactable | Budget/frame |
|---|---|---|---|---|
| **Surface/Orbital** | 10⁶–10⁹ | Body disc w/ procedural detail, moons, stations, local threads | Orbital casts, works, berths | ≤600 primitives |
| **System** | 10⁹–10¹² | Orrery: bodies, belts, in-system threads, freight grains | System casts, anchor slots | ≤900 |
| **Neighborhood** | 10¹²–10¹⁷ | ~10–40 stars, lanes, live threads, the front's edge | The main game: interstellar casting | ≤1,200 |
| **Bubble** | 10¹⁷–10¹⁸ | Whole weave, claims as tinted fields, ladder overlays, rival weaves | Casting, strategic reads | ≤1,500 |
| **Galactic** | 10¹⁸–10²¹ | Density-field arms (pre-rendered layers), regions, the bubble as a bright stitch | Region casts (colossal threads) | ≤800 + cached fields |
| **Intergalactic** | 10²¹–10²³ | Local Group galaxies as procedural sprites; the Long Cast | Exodus only | ≤400 |
| **Universe** | 10²³–10²⁵ | The cosmic web (deterministic noise field, one cached layer); the Chronicle constellations | Contemplation; Chronicle browsing | ≤300 |

**Band mechanics:**

- **Hysteresis + cross-fade.** Bands switch with a ~15% overlap and a
  300 ms alpha cross-fade so the zoom reads as one continuous fall, never
  a pop. (Cheap: two band draw passes only during the fade.)
- **Representatives, not populations.** At Bubble and above, the renderer
  never iterates stars — it draws *density*: offscreen-canvas field layers
  rendered once per seed (or per major state change, e.g. the front
  advancing), then composited with pan/zoom transforms. The Milky Way at
  Galactic band is four cached layers (far field, arms, dust lanes, the
  player's stitch) and a handful of live sprites. This is how Canvas 2D
  serves "performance is never an issue": the frame cost is *flat by
  construction* — bounded per band regardless of universe size.
- **Impostor pipeline.** Everything glowy (threads, stars, auroras) is a
  pre-rendered sprite atlas on offscreen canvases (glow gradients are the
  classic Canvas 2D cost trap; pay it once at boot, never per frame).
- **Procedural everything, materialized on demand.** A galaxy is a seed. A
  sector is (galaxy seed, sector id). A system's bodies materialize on
  first relevance and serialize only if touched — the shipped planets.js
  already proved this pattern; the rewrite makes it the universal law.
  Memory is O(player-touched), which is what makes universe scale *free*:
  the universe is a function, not a database.

## 8.3 Sim LOD (mirrors render LOD)

- **Hot** — anchored/thread-touched systems: full tick at 500 ms cadence.
- **Warm** — discovered, unanchored: aggregate tick every 8 ticks
  (prosperity drift, stock trends — no per-good simulation).
- **Cold** — undiscovered: seed only; materialized by a reveal.
- **Abstract** — beyond the bubble: statistical regions with narrative
  state (the Scourge's off-screen weather); other galaxies: pure seeds
  until the Long Cast touches one.

Tick budget: ≤3 ms at 10× speed with a full late-game weave (measured, F3,
asserted by bot runs). The hot set is naturally small because *hot follows
anchors*, and anchors are hard-won.

## 8.4 Honesty about the top bands

Intergalactic and Universe bands carry one mechanic (the Long Cast) and one
meta surface (the Chronicle) — deliberately. Scale beyond the galaxy serves
*meaning*: the dizzying pull-back that ends every run, the constellations
of past careers, the sense that the weave is small and the dark is not.
Elegance here means refusing to invent busywork at 10²⁴ meters.

---

# 9. UX — surfaces, signalling, input, skin

## 9.1 Three surfaces, period

1. **The Loom** — the map at every band. It is the game. ~90% of playtime
   touches nothing else.
2. **The Hand** — a bottom shelf: live casts (each a card showing tension,
   multiplier, next-press odds, PRESS/ANCHOR/CUT), the draft when an Aurora
   fires, and incoming hails. The blackjack table, always one glance away,
   never covering the map.
3. **The Ledger** — one toggleable panel: bankroll flows, hull pool,
   claims, skills taken, the ladder's history, settings. Everything the
   other two don't need to be.

Seven dock tabs become zero. Every interactive element keeps the
`data-info` self-explanation contract (boot-test asserted), and the infobox
remains the only hover surface.

## 9.2 Input grammar (total)

| Input | Meaning |
|---|---|
| Drag from held → target | CAST |
| Tap | Inspect (system card / thread card) |
| Scroll / pinch | Z (the zoom) |
| Drag empty space | Pan |
| Space | Pause; 1/2/3 speeds |
| Hover | Infobox |
| P / A / C on a live cast | Press / Anchor / Cut (keyboard parity for everything; the whole game is playable without a pointer via focus-cycling — accessibility is a launch feature, not a patch) |

## 9.3 Signalling (the "highly signalled" mandate)

- **One objective chip**, always: verb + target ("CAST to Alpha Centauri").
  Clicking it focuses the camera. Never two instructions at once.
- **First-time flares:** any element's first appearance gets a soft radial
  pulse and a one-line infobox auto-open. Fires once per Chronicle, ever —
  veterans never see training chrome again.
- **The camera teaches.** Band unlocks, Aurora moments, and act
  transitions are communicated by authored camera moves (the slow pull-back
  of Act I; the snap-to-ladder when the Scourge wakes). Motion is the
  tutor; text is the caption. `prefers-reduced-motion` swaps moves for cuts.
- **Everything counted down.** Reaches, hails, charters, act clocks — all
  wear visible timers. Nothing in this game happens *to* a player who was
  shown nothing.

## 9.4 The tutorial contract

The Act I script (§3) is data-driven state predicates (the shipped
tutorial.js model — kept), never click-scripts; every beat has a fallback
timer and a recovery rule; alternate valid solutions complete beats; the
whole act is skippable after first completion with an equivalent start
state. New rule: **the tutorial may only teach the verb and its
modifiers** — if a beat needs to teach a panel, the panel is wrong, fix
the panel.

## 9.5 The skin: AMOLED with accents

- **True black** `#000` base everywhere — the map, the panels, the front
  door. On OLED the game *is* the dark; the frame disappears.
- **Ink**: one warm off-white for text and chrome strokes, at three
  opacities. Panels are hairline strokes on black — no fills, no cards, no
  shadows.
- **The player's accent** (chosen hue, kept from the old game): threads,
  claims, the objective chip, the Chronicle. The accent is *identity*.
- **Reserved semantics**: red = harm only (Scourge, snaps, severs);
  gold = value (gradients, yields, multiplier chips); cyan-white = reveal
  moments. Rivals get desaturated accents of their own.
- **Light as currency**: bloom via the impostor atlas, spent on exactly
  four things — live casts, the front, Auroras, and reveals. If everything
  glows, nothing does; the art direction bar is "a long-exposure photograph
  of a loom in a dark room."
- Contrast-checked (WCAG AA on all text opacities), and a "lantern" theme
  (dark-gray base) for LCD players who find true black harsh.

---

# 10. The meta — the Chronicle

- **Every run leaves a constellation.** At Universe band, past runs render
  as faint thread-patterns in the deep field — victories bright, deaths
  dim, each inspectable (seed, ending, skills, the epitaph line). The meta
  is *literally in the game world*, at the scale the engine earns.
- **Unlocks are optional texture, never power creep:** origins (starting
  deck leans — the Courier, the Cartographer, the Banker, the Warden, the
  Drifter), loom-ship sigils, codex pages, front-door presets, the Daily.
  A fresh install and a 200-hour Chronicle face the same odds — mastery
  and variety are the only progression. (Roguelike orthodoxy, chosen
  deliberately over roguelite power-meta; the drafts provide all the
  build-feel a run needs.)
- **The Daily Weave**: shared seed, shared draft offers, one leaderboard
  line (self-reported score string — no server, no dependency).
- **The front door** (returning players): CONTINUE / NEW WEAVE / DAILY /
  CHRONICLE / SETTINGS over the slowly-rotating universe band with your
  constellations visible. First-install boots straight into §3's cold open.

---

# 11. Architecture — the rebuild

## 11.1 Kept invariants (verbatim from the old contract)

Zero dep, zero build, `file://`. Classic scripts on the `SW` namespace.
Sim DOM-free under Node. One JSON state; ids not references; defensive
init; additive saves. All mutation through journaled `SW.game.actions.*`.
All randomness through the seeded RNG. ASCII source except deliberate
glyphs. Both suites green at every commit.

## 11.2 The new file map (target: ~16 files, none >500 lines)

| File | Owns |
|---|---|
| `js/util.js` | RNG, math, fmt, name gen (kept) |
| `js/scale.js` | hierarchical coordinates, band math, focus-node camera model (sim-safe, DOM-free) |
| `js/gen.js` | procedural universe: seeds → galaxies → sectors → systems → bodies; materialization; validation |
| `js/econ.js` | wants, stocks, gradients, prosperity, hot/warm/cold ticking |
| `js/threads.js` | **the verb**: casts, tension, presses, snaps, anchors, staffing, supply casts |
| `js/opposition.js` | the Scourge (ladder, tempo, temperaments) + rival weavers |
| `js/skills.js` | schools, Auroras, draft offers, skill fx table |
| `js/events.js` + `js/events_data.js` | encounter engine + content (pruned, verb-nouned) |
| `js/run.js` | state, actions, tick pipeline, acts, endings, death, journal, save/load, validate |
| `js/meta.js` | Chronicle, unlocks, daily seed, prefs |
| `js/render.js` | the Loom: bands, layers, impostor atlas, F3 |
| `js/ui.js` | the Hand + the Ledger + infobox + input grammar |
| `js/audio.js` | synth SFX + mood beds (kept, re-tuned to the acts) |
| `js/main.js` | boot |
| `test/smoke.js`, `test/browser_boot.js`, `test/bots.js` | §12 |

Tick pipeline (`run.js`): econ (hot) → threads → opposition → events →
auroras → act/ending checks → autosave. Try/catch pause-with-toast kept.

## 11.3 Migration: rebuild-in-place, not incremental polish

The old game is not refactored into this — it is *quarried*. Sequence,
each phase green on the suites before the next:

- **Phase 0 — the quarry.** Tag the shipped game (`v3-final`), keep it
  playable at a `/legacy` path. Nothing is deleted from history; the
  Chronicle even honors legacy saves with a founding constellation.
- **Phase 1 — the Loom.** `scale.js` + `gen.js` + `render.js` bands with
  fake sim: fly Earth → universe under budget. The engine demo is the
  milestone (and becomes the intro cinematic for free).
- **Phase 2 — the verb, vertical slice.** `threads.js` + minimal econ in
  Sol only: cast/press/anchor/cut/snap with real odds, the Hand UI, Act I
  playable start to first interstellar anchor. **This is the go/no-go
  milestone: if the verb isn't compulsive in Sol alone, stop and redesign
  the verb, not the spec's margins.**
- **Phase 3 — the run.** Bubble gen, rivals, ladder, acts, death, Cure
  ending. First complete runs; bot telemetry online.
- **Phase 4 — builds.** Auroras, schools, drafts, all skills; difficulty
  tables; Fortress ending.
- **Phase 5 — the deep field.** Galactic+ bands live, the Long Cast,
  Exodus, the Chronicle, the Daily, the front door.
- **Phase 6 — the polish contract.** AMOLED pass to final, audio moods,
  accessibility audit, `data-info` coverage test, perf soak.

## 11.4 QoL architecture rules (learned from §1.2's scar tissue)

- No file over ~500 lines; a file that grows past it is two nouns in a
  trench coat — split it.
- One dispatch surface in ui.js, but handlers live with their owning
  surface; the switch stays a table of one-line calls.
- Every magic number in one `D.TUNE`-equivalent table from day one.
- Every new flag registered; every new file in all three lists; the
  integrity scan (mojibake, registry drift) ports over unchanged.
- The F3 overlay is a launch feature: band, primitives drawn, layers
  cached, hot-set size, tick ms, frame ms — budgets asserted, not admired.

---

# 12. Telemetry, tests, acceptance

## 12.1 Bots

Three archetypes, run headless across seed batteries: **the Actuary**
(banks at ≤2 presses, drafts Knot), **the Gambler** (rides to 4+, drafts
Warp), **the Gardener** (relief-anchors everything, drafts Weft). CSV
curves: bankroll, anchors, snaps, Auroras, act timings, ending reached.

Balance assertions (the roguelike health metrics):

- All three archetypes complete runs at Standard within the 60–180 min
  envelope (at 10×-equivalent bot speed).
- No archetype's ending rate dominates across seeds (build diversity is
  real, not cosmetic).
- Observed snap rates match displayed odds within tolerance (the fairness
  contract, mechanically audited).
- Press-count distribution stays wide (if everyone banks at 2, tension is
  overtuned; if everyone rides to 5, it's toothless).

## 12.2 Suites

- **smoke.js**: verb math invariants (EV of a press equals its printed
  odds; no NaN; stakes conserved through snap/cut/anchor), determinism
  replays including full runs with drafts, gen validation (every seed's
  Act I is completable; bubble fully lane-connected), sim-LOD equivalence
  (a warm system fast-forwarded ≈ the same system ticked hot, within
  tolerance).
- **browser_boot.js**: boot, bands render under budget (primitive counts
  asserted headlessly via a counting stub context), the Hand renders and
  dispatches, tutorial beats reachable, save/load, `data-info` coverage,
  reduced-motion path.

## 12.3 Acceptance criteria (the whole contract in ten lines)

1. A newcomer reaches their first anchor inside three minutes without
   reading anything longer than 50 words.
2. The camera travels Earth-orbit → cosmic web in one unbroken gesture at
   60 fps on a mid-tier laptop, every band under its printed budget.
3. Every probability in the game is displayed before commitment and
   verified by bot audit.
4. Three bot archetypes finish runs with materially different weaves,
   drafts, and endings on the same seeds.
5. A run fits an evening; a death costs a run and never a career; the
   Chronicle shows both without judgment.
6. The verb count is one; the surface count is three; the automation the
   player owns was won hand by hand.
7. Deleting any skill, event, or work leaves the game playable (content is
   data; only the verb is structure).
8. The game is beautiful with the lights off.
9. Both suites green; seed + journal replays any run ever played.
10. `file://` double-click still boots it, forever.

---

# 13. Non-goals

No frameworks, servers, accounts, or multiplayer. No 3D. No procedural
quest text beyond the event engine's voice. No power-based meta
progression. No simulation at scales that carry no meaning (§8.4). No
second currency. No fourth surface. No verb number two.

---

# 14. Content notes (tone carries over)

The ≤50-word discipline, the Guild's dying-archive voice, the cats, the
Scourge's names and temperaments, dock gossip in the hails — all quarried
forward. New content style rule: every event speaks in the verb's nouns
(stakes, threads, anchors, hands, the dark), so the fiction and the
mechanics are one vocabulary. The Archivist arc returns as the tutorial
voice. The stowaway cats return because some decisions are not situational.

---

# 15. Runners-up — the verbs not taken

Documented so future redesigns argue against the record, not a vacuum:

- **WEFTMATE (pure positional chess).** Turn-based lane-chess against the
  Scourge: pieces are hull classes, the board is the Gabriel graph,
  economy abstracted to material count. Sharpest possible opposition read;
  rejected because it deletes the humming-network reward (§1.1's fifth
  asset) and turns a logistics fantasy into an abstract one. Its telegraphed-
  ladder DNA survives in §6.2.
- **THE AUCTION (sealed-bid poker vs rivals).** Systems come up for claim
  in rounds; players and rivals commit hidden stakes; overcommitment
  starves logistics. Delicious rival tension; rejected because hidden
  information against AI reads as RNG in disguise (fairness doctrine), and
  the map becomes a lobby. Its race-for-claims tension survives in §4.3.
- **THE SPLICE (deck-built cargo genetics).** Commodities as combinable
  cards; routes as combos. Novel, but it moves play off the map into a
  hand of literal cards — pillar violation. Its draft rhythm survives in
  the Auroras.

CAST won because it is the only candidate that is simultaneously the risk
grammar (blackjack), the opposition grammar (chess against a dealer), the
expansion gesture (one drag), and the fantasy (you are the thread) — and
because it is fractal, which is what lets one verb own a universe.

---

## Final principle

The old game asked the player to *operate* a network. This game asks the
player to *wager* one into existence, one lit thread across the dark at a
time, against a house whose hand is always showing and whose tempo never
stops. Everything else — the zoom, the black, the drafts, the endings —
exists so that the moment before the player presses, every single time,
is worth pausing on.
