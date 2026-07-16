# STARWEFT — REWEAVE (the v4 contract)

*The worlds drifted apart. You are the thread. The thread can be cut.*

This document supersedes `SPEC.md` as the design contract. SPEC v3 described
the completeness pass on the open sandbox; everything it shipped remains real
code and real design capital. REWEAVE reframes that capital into a **roguelike
campaign structure** — runs, permadeath, builds, synergy, meta — without
shrinking the galaxy or softening the simulation. SPEC.md is demoted to
historical reference; on conflict, REWEAVE wins.

Design north stars, named honestly: **Hades** (death as narrative engine, the
world remembers, home persists), **Balatro** (one clean multiplier layer over
several base layers; unlocks widen, never strengthen; every run winnable from
zero), **FTL** (the run as a story you tell afterwards), **Slay the Spire**
(the act ladder, draft-don't-configure).

**Companion doc:** `LOOM.md` is the narrative & world bible — the fiction these
mechanics are secretly about (the cut-the-weave myth, the cast who remember
your deaths, the voice, the refrains, the epitaph). On *tone* it wins; on
*mechanics* REWEAVE wins; the two are built to agree. §12 below is the bridge:
the design guardrails that keep the roguelike craft honest.

---

## 0. Decisions locked (2026-07-16, owner-ratified)

| # | Question | Decision |
|---|---|---|
| 1 | Run shape | Mix of focused runs + persistent expeditions that can grow long after milestones; sandbox woven in as a graduation, not a mode toggle |
| 2 | Engine | **Canvas 2D only.** No WebGL. Zero dependencies stands. |
| 3 | Core verb | Present 2–3 fully-designed candidates, argue for one (§5) |
| 4 | Contract status | REWEAVE.md replaces SPEC.md's role |
| 5 | Galaxy vs permadeath | **One galaxy, mortal threads** — the campaign galaxy persists; permadeath kills the captain-instance, not the world (§2) |
| 6 | Run length | **Act ladder**: acts of ~25–35 min, explicit bank-or-push at each boundary (§4) |
| 7 | Synergy engine | **New Charter layer + interaction rework pass** on existing systems (§7, §8) |
| 8 | Meta shape | **Wider, never stronger** + narrative continuity through death (§9) |

Open for ratification: the core-verb pick (§5 argues for PLEDGE; log the call
in `docs/DECISIONS.md` when made) and final naming throughout.

---

## 1. Vision & Pillars

A cozy-but-vast logistics roguelike. One seeded galaxy is a **campaign**; you
play it as a succession of mortal **Threads** — instances of the WEFT
logistics intelligence, each woken into a new hull, each capable of dying.
The galaxy does not reset when you do. It ages, scars, and remembers. A
strong Thread graduates into the open sandbox the game used to be; a cut
Thread becomes salvage, story, and a wiser successor.

**Pillars (1–5 carried forward, violate for nothing):**

1. **Double-click to play.** Zero dependencies, zero install, zero build.
2. **Deterministic, headless, tested.** Seed + action journal = the run.
3. **The map is the game.** Panels serve the map.
4. **Read at a glance.** Monochrome ink, one accent, red only for harm,
   green/orange only for deals.
5. **Minimal reading, maximal systems.**
6. *(revised)* **One verb, deeply served — and now scored.** GATHER → MOVE →
   DELIVER is also how you *win*: every delivery can be a scoring event, not
   just a credit event (§5).
7. *(new)* **Death is a chapter, not an error.** Losing a Thread must always
   produce something: salvage in the world, a fragment in the Chronicle, a
   line from someone who knew you. Never a bare "GAME OVER".
8. *(new)* **Wider, never stronger.** Meta-progression opens doors; it never
   raises numbers. Run one and run one hundred are equally winnable.
9. *(new)* **Synergy over stats.** New player power comes from *rules
   interacting* (Founder × Charter × world × aptitude), not from bigger
   multipliers on the same rule. If two effects can't combo with anything,
   one of them is wrong.

---

## 2. The Frame — One Galaxy, Mortal Threads

### 2.1 The three nested lifetimes

| Lifetime | Noun | Contains | Dies when |
|---|---|---|---|
| **Campaign** | a Weave (one seeded galaxy) | the persistent world: systems, prices, prosperity, Scourge front, rivals, ruins, named NPCs, the research archive | the player retires it (or the Scourge consumes everything — a campaign *can* be lost) |
| **Thread** | a run (one WEFT instance) | ships, credits, Charters, aptitudes, pledges, act progress | permadeath (§4.4) |
| **Chronicle** | the account (across all campaigns) | unlocks (Founders, Charter families, conditions, myths), records of every Thread's fate | never |

Diegesis that makes it all honest: WEFT is software. When a Thread dies, the
Guild restores an **older backup** into a new hull — it has the *archive*
(campaign research, charted maps, the Chronicle) but not the *estate* (ships,
credits, Charters die with the body). Dying and returning is inside the
fiction, Hades-style, not a UI conceit.

### 2.2 What persists in the galaxy between Threads

Death triggers the **Interregnum**: a coarse headless simulation of N cycles
(seeded, deterministic) before the next Thread wakes. During it:

- **Your network decays honestly.** Unmanned ships drift → derelicts near
  their last route (salvage for the next Thread: hulls, cargo, sometimes a
  Charter in the black box). Depot stock leaks into local markets (a price
  scar the next Thread can read). Facilities you built persist but idle.
- **A Successor may rise.** If the dead Thread was big enough, a splinter
  faction inherits a slice of its routes and runs them as an NPC trade line
  (rivals machinery reused). Meeting your own ghost-company — negotiating it
  back, undercutting it, absorbing it — is a mid-campaign arc.
- **The world keeps moving.** Prosperity drifts, the Scourge front advances
  (mercy-clamped so an early death can't doom the campaign), rivals expand,
  charted systems stay charted (the archive survives).
- **Research persists.** The tech archive is campaign-scoped (§8.3). This is
  the "persistent expedition" feel: each Thread starts smarter, not richer.

### 2.3 Waking a new Thread

New Thread setup is fast and flavorful, Balatro's new-run speed: pick a
**Founder** (§6), see the galaxy brief (what changed in the Interregnum —
three ticker-style lines, not a lore dump), wake at the Heart. Two minutes
from death to next attempt, always.

### 2.4 Graduation — the Long Weave

The open sandbox (today's entire game) is not deleted; it is **earned**.
A Thread that completes the act ladder's summit (§4.3) may, instead of
retiring, **graduate**: the act clock ends, quotas end, and the Thread
continues into the Long Weave — the persistent, open, many-hour game, with
everything it built. Scourge endgames (Panacea / fortress / exodus) live
here, as does the **Allied Threads** option: a graduated campaign may wake
*additional* concurrent Threads at other anchors and switch control between
them (the owner's "switch between allied ships" instinct — fleet-of-fleets
sandbox, campaign-scale). The old game is the new game's endgame.

---

## 3. Scale & realism — how a vast galaxy fits a 30-minute act

The galaxy does **not** shrink (bubbleR ~100 ly, ~230 systems, §19 rescale
stands). Three mechanisms reconcile scale with pace:

1. **Aperture, not world size.** Command range (Home + relays, already a core
   mechanic) is the act-scoped aperture: Act I plays inside the home cluster
   (~10–15 systems), each act boundary grants a range jump + a relay, the
   summit opens the whole bubble. The far rings are *visible the entire
   time* — dim, vast, real — which is the point: you can see what you're
   graduating toward. Realism preserved; pace bounded.
2. **Travel time stays a resource** (¤/tick thinking, SPEC §4) but hop counts
   inside an act's aperture are tuned so a full circuit of the aperture fits
   the act clock. The seed validator (already required) gains an aperture
   check: every act ring must contain a viable economy (producers + consumers
   + at least one shortage worth pledging).
3. **Hot/cold simulation becomes mandatory, not aspirational** (SPEC §10.3 →
   REWEAVE hard dependency). Hot = inside aperture + player-touched; warm =
   adjacent ring; cold = seed + archetype + drift. The Interregnum is the
   cold path run coarse. This is the enabling work for everything here.

Canvas 2D is locked (Decision 2). The continuous Sol→galaxy zoom stays a
render-LOD ambition within Canvas 2D, budgeted by the F3 overlay discipline.

---

## 4. Run anatomy — the Act Ladder

### 4.1 Shape

A run is **1–3+ acts of ~25–35 minutes**. Each act is, diegetically, a
**Guild Charter period**: the Guild sets a **quota** (WEAVE score, §5) and a
**clock** (ticks). The Scourge wakes earlier and moves faster than in the old
sandbox — it is the ante ladder's pressure, tuned per act, not a distant
epilogue.

### 4.2 Act boundary — bank or push

Hit quota before the clock and the boundary offers the run's defining choice:

- **BANK** — retire the Thread in good standing. The network you built
  becomes a persistent allied holding in the campaign galaxy (it keeps
  trading, cold-sim, and future Threads dock at it). Chronicle rewards
  banked. A safe, real win — "a run" in the Balatro sense.
- **PUSH** — accept the next Charter: higher quota, faster Scourge, wider
  aperture, and a **boundary draft** (pick 1 of 3 Charters, §7, plus 1 of 3
  aptitudes, §8.2). Risk everything for a bigger chapter.

This makes "focused runs that can lead to long runs after milestones"
structural: a hot run legitimately snowballs from 30 minutes to a whole
evening, one greedy PUSH at a time, and the summit (§4.3) opens the sandbox.

### 4.3 The summit

Act III's quota is the campaign's set piece (seeded per galaxy: e.g. hold the
front while running a relief convoy; re-link three starving clusters before
the clock). Clearing it offers **RETIRE** (maximum Chronicle reward) or
**GRADUATE** (§2.4, into the Long Weave). Post-graduation "acts" become
optional prestige contracts, Heat-style: opt-in modifiers that raise
Chronicle yield — Balatro stakes wearing Hades' Pact of Punishment.

### 4.4 Death — three cuts

| Death | Trigger | Flavor |
|---|---|---|
| **Cut** | act quota missed at the clock | the Guild revokes the Charter and pulls the Thread — the Balatro loss, clean and fast |
| **Burned** | the Loomship destroyed (§4.5) | the core dies in the black — the FTL loss |
| **Eaten** | the Heart (home system) corrupted | the Scourge takes the anchor — the strategic loss |

Every death plays a short procedural epitaph (renderer-native, ~10s): the
Thread's weave dims on the map, one line from a named NPC, the Chronicle
fragment tally. Pillar 7: death always pays *something*.

### 4.5 The Loomship

The WEFT core is physically aboard one flagship, the **Loomship**. It is a
mobile mini-relay (small command bubble wherever it flies), it is where
Charters are socketed, and losing it is death. Where you *park your own
mind* — safe at the Heart vs. extending the frontier — is a permanent, free,
interesting decision, and a natural hook for Founders and Charters to bend
(twin cores, core-in-a-station, the Gambler's uninsured core).

---

## 5. The Core Verb — three candidates, one argument

Decision 3 asks for fully-designed candidates. All three keep pillar 6
(GATHER → MOVE → DELIVER); they differ in *what turns the verb into a game*.

### 5.1 Candidate A — PLEDGE (the Manifest) ★ RATIFIED (2026-07-16; shipped R3)

**One sentence:** deliveries become *scored commitments* — you pledge what
you'll deliver and by when, stacking concurrent pledges raises a fragile
multiplier, and busting one breaks the chain.

- At any **Guild board** (Heart + settled systems), take a pledge: commodity,
  quantity, destination, deadline. Freely trading is still open (credits are
  the economy); **only pledged deliveries score WEAVE** (the act quota).
- Scoring per completed pledge, Balatro-legible:
  **WEAVE = TONNAGE × THREAD** — TONNAGE (chips) from quantity × commodity
  tier × distance; THREAD (mult) from concurrent-pledge count, streaks
  (consecutive no-bust completions), Founder rules, and Charters.
- **The wager:** every additional concurrent pledge is +THREAD on *all* of
  them — but a busted deadline zeroes the streak, forfeits a bond, and
  drops Guild trust (worse boards). Hit or stand, every few minutes, with
  your whole logistics network as the hand.
- **Automation is still the reward:** pledges can be served by routes and
  directives — early acts you hand-fly single pledges; by the summit you're
  underwriting a *portfolio* served by an automated network, and the skill
  is capacity planning under overcommitment. Same verbs, mastered.
- UI cost is small: pledges are rows on the existing market/contract
  surfaces; the command bar shows the live TONNAGE × THREAD ticker; every
  market row's ⇄ fetch can be "fetch to fulfil".

### 5.2 Candidate B — TENSION (the Loom)

**One sentence:** lanes are threads under tension — every delivery tightens
the lane it used; taut lanes are faster, safer, and Scourge-resistant; slack
lanes fray; score = the size of your taut component.

Positional, chess-like: with limited flow you choose *which subgraph to keep
alive*, sacrifice outer threads to keep the core taut, race rivals for
tension on contested lanes, and read the Scourge as a player that attacks
slack. Builds directly on `state.laneFlow` (the Living Weave already ships).

**Why not the heart:** the scoring moment is diffuse (a component-size number
drifting, not a *hit*), individual deliveries stop feeling like events, and a
Charter layer has less surface to bend. **Salvaged in full:** tension ships
as *terrain* regardless — lane tiers (slack/laid/taut: speed and Scourge
resistance) driven by laneFlow, a Charter family that plays with it (§7.4),
and the summit set-pieces are tension problems. B becomes A's board.

### 5.3 Candidate C — CAST (the deep run)

**One sentence:** push-your-luck expeditions — commit a convoy through
escalating danger rings, each leg multiplies the manifest, bank the convoy
home after any leg or push one ring deeper; lose it and lose it all.

Generalizes the cartography-data treasure run. Punchy, but episodic — it's a
great *event*, not a per-minute heart, and it overlaps A's wager psychology.
**Salvaged as content:** "Deep Casts" become a pledge *type* (badlands-ring
pledges with per-leg multipliers) and an encounter family.

### 5.4 The argument

PLEDGE wins because it is the only candidate where **the core verb and the
scoring verb are the same physical act** — a crate landing at a hungry world
is simultaneously the fantasy, the economy, and the points. It gives the act
ladder its quota for free, gives Charters a clean scoring pipeline to bend
(the Joker surface), keeps every delivery a discrete dopamine event
(floaters already exist; now they carry mult), and it *composes with
automation* instead of fighting it — which is this game's soul. TENSION
becomes its board, CAST becomes its spice. One heart, two organs.

---

## 6. Founders — the character picker

Simple, strong, diegetic (Decision on run shape: "random, simple and strong
character-picker with unique starter benefits"). A Founder is the *person the
Guild seats at the Loomship's helm* — WEFT flies the network; the Founder
bends its laws. Picked at Thread start, one screen, Balatro-deck-speed.

**Design law:** each Founder = one **rule-bend** (law-level, not a percent),
one **liability**, one starting loadout, one lore line. No founder touches
base numbers that meta could later "fix" (pillar 8).

Launch eight (three at unlock zero — marked ●):

| Founder | Rule-bend | Liability |
|---|---|---|
| ● **The Courier** | first pledge completed each act scores ×2 THREAD | none — the classic |
| ● **The Underwriter** | may stack two pledges beyond the normal cap (deeper overcommit, higher mult ceiling) | busts forfeit double |
| ● **The Rockhopper** | raw goods (ORE/GAS/BIO/CRYSTAL) count one tier higher for TONNAGE; starts in the belt with a rig | settled worlds distrust: −1 board slot at pop systems |
| **The Archivist** | cartography data is pledgeable (data runs score WEAVE) | Loomship hold halved |
| **The Shipwright** | hulls cost materials only (no credits); starts at a moon shipyard | route automation unlocks one act late |
| **The Penitent** | inoculated from the start — may trade *at* the Scourge front; front deliveries score ×3 | the Scourge clock runs hungrier |
| **The Twins** | two half-range Loomships; death only when both burn | Charters socket to one twin each (split your build) |
| **The Drawn Thread** | random Founder's bend + a random Charter at start + small WEAVE head start | you don't choose — Balatro's erratic deck, as a person |

Founders unlock via Chronicle (§9) — *wider, never stronger*: The Twins is
not better than The Courier, it is a different game.

---

## 7. Charters — the synergy layer

The one new noun (Decision 7). A **Charter** is a Guild-stamped exemption —
a card-sized rule-bend socketed into the Loomship. This is the Joker layer.

### 7.1 Shape

- **5 sockets** (Founders/techs may bend this). **Order matters**: on every
  pledge completion, Charters evaluate left-to-right in the scoring pipeline
  (TONNAGE steps, then THREAD steps) — re-ordering is free at any board, so
  build-tinkering is a between-hauls pleasure, not a punishment.
- **Acquisition, all in-run:** boundary draft (pick 1 of 3 at each act push),
  Guild board vendor (credits — the credit sink that keeps the economy
  mattering), wreck salvage and encounter rewards (exploration and combat
  feed the build), one Founder-seeded start (Drawn Thread).
- Rarity tiers common/uncommon/rare/mythic; mythics are run-warping
  (Balatro legendaries), at most one seeded per campaign per family.
- Sell-back at boards for half; no duplicate stacking of the same Charter.

### 7.2 Design laws

1. A Charter bends a **rule**, never grants flat credits or flat WEAVE.
2. Every Charter must name at least one existing system it interacts with
   (pillar 9) — reviewed at content time like `data-info` coverage.
3. Legible in one infobox line + one example line. If it can't explain
   itself, it doesn't ship (existing hard rule, now applied to the pool).
4. All effects flow through the seeded RNG and the scoring pipeline —
   deterministic, journal-replayable, headless-testable.

### 7.3 The families

| Family | Bends | Example commons |
|---|---|---|
| **Manifest** | scoring pipeline | *Ghost Manifest* — empty return legs count as ballast: +1 THREAD per empty hop on the next completion. *Fifth Seal* — every 5th completion this act scores twice. |
| **Lane** | tension terrain (§5.2) | *Wayleave* — your taut lanes grant +1 TONNAGE tier to pledges crossing them. *Slackwright* — slack lanes cost no upkeep; your ships fly them 20% faster. |
| **Hold** | cargo rules | *False Bulkhead* — 10 cargo of contraband space: pledged goods in it can't be raided. *Wet Ink* — may re-declare a pledge's destination once, mid-flight. |
| **Scourge** | risk conversion | *Ashes Ledger* — data scanned in threatened systems scores WEAVE. *Tithe of the Front* — completions within 2 hops of the front: +2 THREAD, but the front creeps 5% faster. |
| **Guild** | boards & economy | *Open Books* — boards show one extra pledge slot; busts also cost reputation with rivals. *Company Scrip* — facility builds cost 30% less, paid in future WEAVE (a quota lien). |

The synergy grammar the pool is written in: Founder bends a *law* → Charters
bend the *pipeline* → aptitudes bend *tempo* (§8.2) → world conditions bend
the *board* — four layers cross-multiplying, which is where "lots of
combinations and possibilities" actually comes from. Example emergent build,
first playtest target: Rockhopper × *Wayleave* × *Ghost Manifest* × taut
ore-belt loop = the "iron shuttle" — deliberately discoverable, not scripted.

### 7.4 Pool size

Launch 40 (24 common / 10 uncommon / 5 rare / 1 mythic), grown by content
passes. Small enough to learn, big enough that boundary drafts differ
between runs. Chronicle unlocks add *families and entries*, never raise
existing numbers.

---

## 8. The interaction rework (existing systems, re-tempoed)

Decision 7's second half: the base layers must be worth multiplying.

### 8.1 What changes tempo, not identity

The sandbox systems were tuned for many-hour arcs. Under acts they re-tempo:

| System | Sandbox role | REWEAVE role |
|---|---|---|
| Routes/directives | the whole game | unlocked act I → the *means* of serving pledge portfolios |
| Rivals | background pressure | act II+ board competitors — they take pledges too, and can bust |
| Scourge | late clock | act-scaled ante pressure + the Charter/Founder risk surface |
| Encounters | drop-in spice | Charter/salvage/board-intel sources — every scene feeds the build |
| Cartography data | profession | pledgeable via Founder/Charter; board intel; Chronicle fragments |

### 8.2 Aptitudes → boundary drafts

The aptitude tree stops being a setup-time allocation and becomes the
**boundary draft**: at each act push, pick 1 of 3 aptitudes (seeded from your
run so far — drafts *react* to your build, Hades-boon style). Per-Thread,
lost at death. Small pool, law-like effects ("routes may cross one hop
beyond aperture", "the Loomship counts as a depot").

### 8.3 Tech → the Archive

Research is **campaign-scoped and survives death** (§2.2) — the one thing a
Thread leaves its successors besides ruins. Earned as today (prosperity,
data), spent on a *compressed* tree (the atlas stays; density drops): hull
classes, automation tiers, inoculation, deepdrives. This is deliberate
Rogue-Legacy-within-a-campaign: *within* one galaxy, death accretes
knowledge; *across* galaxies, pillar 8 holds absolutely (fresh campaign =
fresh archive).

### 8.4 World conditions & the New Weave dials

Everything in SPEC §18 (age, topology, heart, myths, named adversary,
conditions) becomes **campaign-genesis** authoring — set once per galaxy,
persisting across its Threads. Conditions gain build relevance (a condition
should change what Charters/Founders are strong, e.g. Pilgrim Tide makes
passenger pledges a real archetype). The Daily Weave becomes a shared
**one-Thread challenge**: date-seeded galaxy + forced Founder + curated
Charter pool + one act — score compared, Balatro-daily shaped.

---

## 9. The Chronicle — meta, wider never stronger

The account-level layer (Decision 8). One currency: **fragments** (earned by
Thread fates — banked, burned, or eaten, every death yields; better fates
yield more). Fragments **unlock, never upgrade**:

- **Founders** (the five beyond the starting three).
- **Charter families/entries** entering the in-run pool.
- **World conditions, myths, adversary temperaments** for campaign genesis.
- **Cosmetic/lore**: sigils, codex arcs, epitaph variants.

**Narrative continuity, the Hades trick:** named NPCs (the Guildmaster, the
Cartographer, rival captains, the Quiet Intelligence) are campaign-persistent
and *remember Threads*. Dialogue predicates read Chronicle facts ("the last
of you overreached at Meridian; the boards remember"). The campaign's story
advances **through** dying — death is narrative fuel, so losing never feels
like content denied. The Chronicle screen (main menu, SPEC §3.1) is the
trophy room: every Thread's name, fate, epitaph, and weave-print.

**The line we never cross:** no fragment purchase raises a number a run
could have had at unlock zero. Difficulty stays honest forever.

---

## 10. What carries forward unchanged (hard rules)

1. Zero dependencies, zero build, classic scripts, `SW` namespace.
2. Sim files never touch the DOM; headless under Node.
3. All mutations via `SW.game.actions.*`, journaled; seed + journal = run.
4. One JSON-serializable state object; ids, not references; additive fields
   read defensively. Campaign/Thread/Chronicle split is a *partition of that
   object's concerns*, not new persistence machinery: `state.campaign` (world
   + archive), `state.thread` (mortal estate), `localStorage` chronicle blob.
5. Determinism: `U.rand(state)` only; the Interregnum sim included.
6. Both test suites green at every commit; new systems land with sections.
7. Canvas 2D only (Decision 2). LOD + budget discipline, F3-instrumented.
8. Monochrome + one accent; infobox self-explanation for every element —
   including every Charter, Founder, and pledge row.

---

## 11. Migration plan (each step lands green on both suites)

The sandbox stays playable throughout as **Long Weave (classic)** — a
main-menu path running exactly today's game — until R9 formalizes
graduation. No flag-day rewrite; the roguelike frame grows alongside.

| Step | Lands | Notes |
|---|---|---|
| **R1** | Hot/cold sim + aperture plumbing | the enabler (§3.3); SPEC §10.3 promoted to prerequisite; F3 counts prove budget |
| **R2** | Campaign/Thread state split + death + Interregnum v1 | die → coarse sim → wake; ruins/salvage minimal (derelicts only) |
| **R3** | ✅ PLEDGE v1 | `js/pledges.js` — Guild board, TONNAGE × THREAD, bonds, busts, streaks, trust; fulfilment at the `S.sell` seam; dedicated serialized RNG sub-stream; `A.takePledge`/`A.abandonPledge`; Pledges dock tab + topbar WEAVE. Remaining for R3+: act quota + clock + Cut death (folds into R4) |
| **R4** | ✅ Act ladder | `js/acts.js` — acts with WEAVE quota + tick clock; **Commissions** (seeded per-act themes) and **Boons** (boundary draft, seed of the Charter layer) cross-multiply the pledge economy; bank-or-push, aperture growth + reveal, Cut/Burned/Eaten deaths + epitaphs, summit → retire/graduate into the Long Weave. Gated by `state.acts.on` (classic sandbox untouched). Menu run-shape toggle. |
| **R5** | Founders v1 | the three ● founders + picker screen |
| **R6** | Charters v1 | 5 sockets, ~16 commons across 3 families, boundary draft + board vendor |
| **R7** | Interaction pass | aptitude drafts, Archive re-scope of tech, rivals on boards, lane tension terrain (B-salvage), conditions × builds |
| **R8** | Chronicle | fragments, unlock tracks, NPC memory predicates, Chronicle screen |
| **R9** | Graduation + Long Weave unification | summit set-pieces, Allied Threads switching, classic mode folds in |
| **R10** | Balance + Daily | archetype bots emit per-act curves; quota/clock tuned against bots, not vibes; daily challenge profile |

Backlog relationship: SPEC §15 (Living Galaxy), §16 (Living Market), §17
(soundtrack), §19.4–19.5 (in-system richness, nebulae) remain live backlog —
they slot in as content for this frame (encounters feed Charters, market
life feeds boards) and none of them block R1–R10.

## 12. The roguelike craft checklist — design guardrails

The genre's craft, distilled into laws we can test against. Ordered as the
canonical roguelike-design breakdown orders them, each mapped to where it
already lives here so nothing is a new pillar — this is the coherence net.
Where a law can become a boot-test assertion or a bot metric, it says so.

### 12.1 Uniqueness from the start (→ §6, §8.4)
No two runs may *open* the same. The opening state is
`Founder × Founding Myth × Heart × starting board × first draft` — that
product must vary run-to-run. **Law:** a fresh Thread's first minute presents
at least one lever the last one didn't. **Test:** bot harness asserts opening
Founder/board/first-pledge tuples differ across seeded new-Threads.

### 12.2 Risk vs. reward (→ §5.1, §4.2)
Every risk is legible *before* it is taken and every reward is visible.
PLEDGE's overcommit wager and the bank-or-push boundary are the two risk
engines; both show the stake and the upside in-line. **Law (sacred):** loss is
always a decision the player could have prevented — the Fray telegraphs, the
clock is visible, a bust is never a surprise tax. No hidden-information deaths.

### 12.3 Diversity (→ §7.4, §8.2)
Variety is drafted, not configured. **Law:** boundary drafts (Charters +
aptitudes) must present meaningfully different options run-to-run — target
<40% option overlap between consecutive runs of the same Founder. **Metric:**
archetype bots (trader/explorer/warlord/governor) must each reach the summit by
a *different* build; if one build dominates the bot field, the pool is too flat.

### 12.4 Synergies (→ §7.3)
The four-layer cross-multiply (Founder law × Charter pipeline × aptitude tempo
× world board) is the whole point. **Law:** every Charter names ≥1 existing
system it interacts with (content-review gate, like `data-info` coverage);
a Charter that combos with nothing is cut. The reward for a *seen* synergy is
a discovery, not a tutorial — never explain a combo the player could find.

### 12.5 Repeated "level" design (→ §3, §4.1, SPEC §4/§19)
Our "levels" are the galaxy and its apertures; the freshness problem is
procedural-generation quality. **Law:** the seed validator (already required)
gains an **aperture check** — every act ring must hold a viable economy
(producers + consumers + ≥1 shortage worth pledging) and ≥1 *memorable
landmark* (a void, a tight cluster, a named feature, a wonder). No two
apertures should feel like the same corridor. Voids/clusters (SPEC §4) are the
"rooms"; landmarks are the anchors that make a map recountable afterward.

### 12.6 Enemy design — the Fray as a player, not weather (→ §2.2, §18.5, LOOM §2)
The Scourge is the game's one antagonist and must *read* like one. **Laws:**
(a) it has **tells** — the warning interval before a take is inviolable;
(b) it has **patterns** — it attacks slack lanes and overreached frontier
(it plays the tension board, §5.2), which the player can learn and exploit;
(c) it has **personality** — the seeded name + temperament (patient / ravenous
/ capricious) so a campaign's Fray feels like *someone*; (d) it is
**counterable** by weaving, not just walls — the cure is a *better knot*
(LOOM §2), connection the rot can't travel. Never a random tax; always a
legible opponent making legible moves.

### 12.7 Secrets & unique encounters (→ LOOM §10, SPEC §8/§15.4)
The Noita promise: the world is deeper than it shows. **Law:** every campaign
seeds ≥1 thing the player *discovers*, on no menu — the Loom-shard's arc, a
Charter in a wreck's black box, the numbers-station fragments, a wonder worth
the detour. A secret that appears in a menu is not one. Each bears a Chronicle
fragment so discovery pays into the meta.

### 12.8 Mechanic changes over stat changes — THE SPINE (→ pillars 8/9, §6, §7.2)
This is the genre's deepest lesson and this game's whole thesis: **power comes
from rules bending, not numbers rising.** It is already pillars 8 (wider never
stronger) and 9 (synergy over stats); named here as the single law every other
system answers to. **Laws:** (a) a Founder/Charter/aptitude/boon that only adds
a flat percent is a code smell — rewrite it as a rule-bend or cut it;
(b) meta-progression *only* widens the pool, never raises a value a run could
have had at unlock zero (**boot-test assertion:** no Chronicle unlock mutates a
`D.TUNE` base number); (c) the interesting sentence is always a *conditional*
("empty holds count as ballast", "the 5th completion doubles"), never a
multiplier on the same old thing.

### 12.9 Charm & visuals (→ §9? see below, Pillar 4, LOOM §9)
Juice serves legibility and soul, never noise. Monochrome + one accent holds;
the accent is the one warm thread. The delivery floater/chime is the game's
heartbeat and now carries the mult so completions *land*. Death is
renderer-native and dignified (the epitaph, LOOM §7). **Law:** every juice
touch must also make something clearer — if it only decorates, it fights
Pillar 4.

### 12.10 Audio (→ SPEC §17, LOOM §9)
A generative, zero-asset bed that breathes with the run — region, Fray
pressure, prosperity, combat. **Law:** mood keys off real sim state so the
music *means* something (determinism exempt — audio is presentation); silence
as the Fray nears is a choice, not a gap; degrades gracefully with no
`AudioContext` (boot-test asserts this already).

### 12.11 Juice & QoL — the elevatory bar (Hades / Noita)
The cheeky, high-care touches that separate a spec from a game people love.
Tracked as commitments (detail in LOOM §9):
- **Fiddle freely:** re-order Charter sockets at any board, no penalty.
- **Reroll once:** a per-boundary draft reroll token.
- **Name your Thread:** it rides into the epitaph, Chronicle, and Successor.
- **Always new to hear:** cast lines keyed to your Chronicle; true-fact ads.
- **Kindness opt-in:** stipend, possible first-Cut grace (§15 Q4), an
  escalating-mercy dial — warmth available, honesty default.
- **Fast wake:** under two minutes from cut to next Thread.
- **Everything self-explains:** infobox coverage over every new noun
  (Charter/Founder/pledge/lane-state) — a boot-test assertion, not a hope.

## 13. UI/UX — the diegetic face (owner-directed, 2026-07-16)

Status: **spec ratified, foundation shipped (F1), F2–F8 not yet built.** The
sandbox's UX was a control panel bolted beside a map. REWEAVE's frame — mortal
Threads, a scored core verb, acts with a clock — deserves a face that feels
like *itself*: an instrument panel a courier would actually fly from, not a
strategy game's sidebar. This section is the contract for that face. It does
not replace any subsystem — **same organs, new frame**: every existing
renderer (`ui_ship.renderFleet`, `ui_routes.renderRoutes/renderOps/renderYou/
renderLog`, `ui_pledge.renderPledges`, `ui_market`, `ui_tech`, `ui_system`)
keeps its function signature and DOM target; what changes is how that content
is *summoned, framed, and anchored*. Zero dependencies, Canvas 2D, hard rules
(§10) all still apply.

**Governing law:** the map is not a background the UI sits on top of — the
map *is* the instrument, and every control that can be diegetic (anchored to
the star, ship, or signal it acts on) must be. Only what genuinely has no
home in space — settings, the codex, save/load, the full fleet ledger — lives
in a drawer, and drawers are closed by default, summoned by intent, never
ambient furniture.

### 13.1 Foundation (F1 — shipped)

AMOLED true-black tokens (`--bg:#000`, hairline `--surface`/`--surface-2`
compartments, no drop-shadow elevation), mobile viewport + safe-area insets,
touch-first responsive layout (dock as bottom sheet, `body.dockOpen`,
`ui.isTouch()` gated on `matchMedia('(pointer:coarse)')`), two-finger
pinch-zoom/pan on the canvas alongside the existing mouse-drag orbit. This is
the *material* the rest of this section builds on — the black is real, the
touch targets are ≥40px, the drawers already know how to be sheets.

### 13.2 One Command Strip (F2)

`#topbar` and `#bottombar` collapse into a single slim strip (one `<div>`,
one z-layer). Contents, left to right: sigil/menu (☰), the live read-outs
that matter every second (**WEAVE ◈**, credits ¤, and — only when
`SW.acts.active(state)` — the act chip: `◈ II 63% ⧗340`, tapping it opens the
Pledges drawer at the act HUD), speed controls, and a compact "more" glyph
that opens a slide-down strip for the rarer buttons (Development, Market,
Codex, mute, music) — these do not need to be one tap away every second, so
they earn their keep behind one extra tap rather than eating strip width.
The objective line and ticker fold into the strip's second row on desktop
(a 2-line strip, still thinner than today's topbar+bottombar combined) and
collapse to the objective alone on mobile (ticker is a drawer, not ambient).
**Implementation:** `index.html` merges `#topbar`+`#bottombar` markup into
`#strip`; `ui.js` keeps `renderTopbar()`'s logic, just retargets selectors.
No action semantics change — this is a pure chrome consolidation, the
lowest-risk step, and should land first.

### 13.3 Drawers (F3) — same organs, closed by default

`#sysPanel`, `#dock`, `#exchange`, `#techOverlay` become **edge drawers**:
off-canvas by default, sliding in on summon, each with one obvious dismiss
(tap the scrim, `Esc`, or re-tap the opener — the existing `Esc`-walks-back-
one-level rule from SPEC §7 holds). Desktop: drawers dock left (`#sysPanel`)
or right (`#dock`) as slim rails that expand on hover-intent *or* pinned open
via a thumbtack toggle, so a player who wants the old always-visible panels
can still have them — default is closed, preference is sticky
(`localStorage` prefs, existing pattern). Mobile: the shipped bottom-sheet
behavior (§13.1) *is* this drawer model already; no further work needed
there. **Nothing inside a drawer changes** — `renderFleet`, `renderRoutes`,
`renderExchange`, etc. render into the same `#dockBody`/`#sysPanel` targets
exactly as today. The only new code is the open/close/pin state machine
(`ui.drawer.open(id)` / `close(id)` / `toggle(id)`) and the CSS transform for
slide-in. `#commandBar` (the selected-ship strip) is the one panel that stays
*always* visible when a ship is selected — it is the cockpit, not a drawer.

### 13.4 Signal beacons (F4) — the map tells you, not the topbar

Every alert that today lives in `#alerts` (threatened systems, stranded
ships, expiring contracts, hails) and every new REWEAVE signal (open Guild
board offers, an act boundary at the Heart) gets a **beacon drawn directly on
the map**, at the system it concerns, canvas-native (same layer as the
existing pulsing-threat rendering `render.js` already does for `sys.scourge
=== 1`). Beacon glyph + behavior by kind:

| Signal | Glyph @ system | Pulse | Tap does |
|---|---|---|---|
| Threatened (scourge warning) | △ | urgent, red | centers camera + opens the system drawer |
| Stranded ship | ▲ | slow, ink-dim | selects the ship, opens `#commandBar` |
| Hail waiting | ◌ | steady, accent | opens the hail (`A.openHail`) |
| Guild board offer(s) here | ◈ | gentle, accent | opens the compact board flyout (§13.7) |
| Act boundary open (at the Heart) | ◈◈ | strong, accent, radiates | opens the Pledges drawer at the act HUD |

Only a genuine crisis (Eaten-risk, i.e. Heart under active corruption)
pulses fast/red; everything else is a *quiet, steady* light — REWEAVE §12.9
("juice serves legibility, never noise") and LOOM §3 ("quiet dignity") both
hold. `#alerts` in the strip shrinks to a single overflow counter ("△2 ◈3")
for beacons currently off-screen or below a size threshold, which is also
the seam into §13.6.

### 13.5 The orbital ring (F5) — selection becomes controls, not a panel jump

Selecting a system in galaxy view no longer force-opens `#sysPanel`. Instead
a ring of 3–6 glyph buttons appears *orbiting the star itself* — a small DOM
overlay (real `<button>`s for hover/focus/ARIA/touch, not canvas-drawn, so
accessibility is free) positioned each frame at the system's projected
screen coordinate. **Implementation:** `render.js` already computes this
every frame into `pickables` (`{x,y,r,sys}`); expose `R.screenPosOf(sysId)`
(a lookup into that array, O(1) via a parallel map) and drive the ring's
`style.transform` from it inside the existing `frame()` loop's post-render
step — no separate polling interval, so it never desyncs from camera motion.
Ring contents are contextual (a `data-info`-documented set, same self-
explaining-element rule as everything else):

- always: **⏵ enter** (dblclick's action, now also one tap), **ⓘ details**
  (opens the system drawer — the *full* old `sysPanel` content is one tap
  away, never deleted, just no longer the default reflex)
- if a ship is selected and can reach it: **➤ send here**
- if the system is a live pledge destination: **◈ board** (§13.7 flyout)
- **☆ bookmark** toggle
- if buildable and in range: **▦ build** (opens the build drawer scoped to
  this system — reuses the existing construction UI verbatim)

The ring replaces the reflexive "click a star, panel eats the sidebar"
pattern with "click a star, the star offers you verbs." This is the single
biggest feel-change in this section and the reason it reads as a new
interface despite reusing every renderer underneath.

### 13.6 Edge compass (F6) — the vast bubble stays legible off-screen

For any system carrying a beacon (§13.4) that falls outside the current
viewport, draw a small arrow at the *viewport edge*, clamped to the screen
bounds, pointing along the direction from camera-center to the system
(reuse `project()`'s direction math, clip to the rect). Tapping it eases the
camera toward that system (`R.centerOn`, already exists). This is the answer
to REWEAVE §3's "far rings are visible the entire time" promise at UI scale:
a 100 ly bubble with a threatened system four screens away should never
require the player to remember it exists — the edge itself reminds them,
diegetically, the way a cockpit RWR does.

### 13.7 The Guild board, on the map (F7) — pledges are read from the galaxy

Per the ratified decision: **open pledge offers glow at their destination
system**, not in a list. A system with ≥1 open board offer carries the ◈
beacon (§13.4); tapping it (or the ring's **◈ board** entry, §13.5) opens a
**compact flyout** — not the full Pledges drawer — anchored near the star:
offer terms, one **take** button per offer, dismiss on tap-away. This makes
"where's work to be had" a *visual scan of the lit galaxy*, which is the
most diegetic possible reading of a trade-logistics board and the entire
point of putting it on the map rather than behind a tab.
Your **held manifest** (pledges in flight) is not per-system, so it keeps a
home in the Pledges drawer — but the drawer's act HUD (quota bar, boundary
banner) is important enough to also condense into the Command Strip's act
chip (§13.2), so the two surfaces reinforce rather than duplicate: the strip
says *where you are in the run*, the map says *what's available right now*,
the drawer says *what you're already carrying*.

### 13.8 What does not change

Simulation files are untouched — this is presentation only. `js/pledges.js`,
`js/acts.js`, and every `SW.game.actions.*` call keep their exact signatures;
the new UI only calls them from new triggers (a ring button, a beacon tap)
instead of old ones (a dock tab, a panel button). The command grammar
(SPEC §2.1 — FETCH intents, the queue, the why-line) is untouched and still
lives in `#commandBar`. No `SAVE_VERSION` bump — this section adds zero new
save-state (drawer-open/pin preferences are UI prefs in `starweft_prefs`,
like reduce-motion already is).

### 13.9 Build order (F-track — parallel to the R-track, resume R5 after F8)

This work is orthogonal to REWEAVE §11's R-numbered mechanical build order
(Founders, Charters, Chronicle) — it re-faces what already exists rather
than adding a new subsystem, so it is sequenced as its own **F-track** and
should be finished (or at least F2–F5 landed) before resuming R5, so Founders
and Charters are designed against the *new* face, not bolted onto the old
one and re-skinned twice.

| Step | Lands | Risk |
|---|---|---|
| **F1** | ✅ AMOLED tokens, mobile viewport, touch pinch/pan, bottom-sheet dock | shipped |
| **F2** | One Command Strip (topbar+bottombar merge) | low — pure chrome, no new state |
| **F3** | Drawer state machine (`ui.drawer.*`) for sysPanel/dock/exchange/tech | low — reuses every renderer verbatim |
| **F4** | Signal beacons on the map (canvas), `#alerts` becomes an overflow counter | medium — new render-layer, needs a boot-test pass for beacon presence |
| **F5** | Orbital ring (DOM overlay synced to `frame()`) | medium — new interaction surface, most new test surface |
| **F6** | Edge compass pings | low — pure derived-position rendering |
| **F7** | Guild board on the map (beacons + flyout) | medium — touches pledge-take flow's entry point, not its logic |
| **F8** | Mobile parity pass: ring/flyout/compass all confirmed usable at touch scale; screenshot pass at 390×844 and 1280×800 | verification only |

Each step lands green on both suites, same discipline as the R-track. Test
strategy per SPEC precedent: smoke.js can't see pixels but can assert state
(`ui.drawer.isOpen('dock')`, beacon list contents, ring's contextual-action
set for a given selection) the way the pledge/acts sections already do;
browser_boot's stub DOM can drive `fireClick` on ring/beacon/flyout buttons
exactly as it does for `takePledge`/`pushThread` today. Visual verification
(does it actually look right) is a headless-Chromium screenshot pass, not a
suite assertion — do it at the end of F4, F5, F7, and F8 at minimum.

## 14. Non-goals

No frameworks, no bundlers, no npm, no multiplayer, no 3D, no WebGL. No
meta-progression that raises numbers. No run longer than the player chose at
a boundary. No death without an epitaph. No Charter that can't explain
itself in one infobox line.

## 15. Open questions (small residue, none blocking R1–R2)

1. ✅ Core verb ratified: PLEDGE (see `docs/DECISIONS.md`, shipped R3).
2. Naming pass: Thread/Loomship/Charter/WEAVE/fragments — placeholder-final.
3. Interregnum length & mercy-clamp tuning (needs R2 bots).
4. Whether quota-miss (Cut) offers a one-time "grace extension" encounter on
   a first offense per campaign — kindness vs. Balatro cleanliness.
5. Allied Threads control model (full switch vs. directives-only for
   non-active threads) — decided at R9 with play feel.
