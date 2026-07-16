# STARWEFT — Decision Texture & the Central Verb: Overhaul Specification

Status: design specification (backlog/reference per repo policy; `SPEC.md` wins
on conflict). Written as a ludology-first overhaul: it names the theory, audits
the shipped game against it, and specs the mechanical package that closes the
gap. Everything here respects the hard rules (zero-dep, DOM-free sim, journaled
actions, seeded determinism) and the SPEC pillars — it sharpens pillar 6
("one verb, deeply served") rather than replacing it.

---

# 1. The theory this spec is built on

## 1.1 Situational vs non-situational decisions

A **situational decision** is one whose best answer is a function of the
current, unrepeatable configuration of the run: this shortage, this hold, this
lane, this clock. It cannot be cached. Answering it well is *play*.

A **non-situational decision** is one whose best answer can be computed away
from the game — a build order, a tech priority, an "always take X" perk. Once
solved (by the player, a wiki, or a spreadsheet), it stops being a decision
and becomes execution.

Neither is bad. The classic roguelike stack needs both:

- **Non-situational choices give runs authorship and identity.** Origin,
  doctrine, tech direction — these are the player saying *what kind of run
  this is*. They should be few, chunky, and expressive.
- **Situational choices are where moment-to-moment play lives.** They are the
  reason a run can't be played from memory.

The two failure modes are precise:

- **All non-situational** → the game is a spreadsheet with a wiki answer.
  Runs converge on one optimal script; the midgame becomes maintenance.
- **All situational** → noise. Without a stable spine, situations can't be
  *read against* anything; mastery has no ladder.

The design target is not a 50/50 count. It is a **layering**: non-situational
choices set the parameters; situational choices are evaluated *through* those
parameters, so the same situation demands a different answer from a different
run. That cross-product — situation × identity — is where roguelike
replayability actually comes from.

## 1.2 Verb power and verb centrality

Rogue's genius verb is *move*: one input that, by context, means explore,
attack, flee, position, wait. The measure of a verb:

- **Power** = how many distinct, meaningful outcomes one verb can express,
  resolved by context rather than by menu.
- **Centrality** = what fraction of total play routes through it.

A powerful central verb is what makes situational decisions cheap to *offer*:
the game doesn't need a new interface per situation, it needs a new situation
per interface. When the verb is weak, every new pressure ships with a new
button, and the decision surface fragments into chores.

STARWEFT's verb is **DELIVER**. The thesis of this overhaul: the game already
contains, in fragments, one of the most elegant verb designs in the strategy
space — building is delivering materials, winning is delivering the cure,
rescue is delivering people, exploration is delivering data home — and it has
not yet committed to it. Several subsystems still route around the verb
(instant effects, flat buffs, menu-verbs), and the situations that would make
each delivery *a decision* are underpowered.

## 1.3 The automation paradox

Pillar 2 says automation is the reward. Automation, by definition, converts
situational decisions into non-situational policy — that conversion *is* the
feeling of mastery, and this spec protects it. But every decision automated is
a decision removed from play, so an automation game must **replenish the
situational layer at each new scale** or the endgame becomes a screensaver.

The governing rule of this overhaul, stated once and enforced everywhere:

> **Automation may absorb any decision the player has already solved.
> The world must keep generating decisions automation is not allowed to
> solve.** Routes and directives handle the steady state; the player plays
> the exceptions. Every system that generates exceptions must deliver them
> to the player as a situation with a deadline and a one-verb answer.

Call this the **exception economy**. It is the design contract between the
sim (which generates situations), the command grammar (which lets one verb
answer them), and the UI (which must make the situation legible in one look).

---

# 2. Decision audit of the shipped game

An honest inventory, classified. Evidence from code cited so the audit stays
falsifiable.

## 2.1 Non-situational decisions (solved once, then executed)

| Decision | Where | Verdict |
|---|---|---|
| Tech order | `tech.js`, `D.TECHS` | Mostly solvable offline. Worse: several techs are **flat strict upgrades** — `cargopods` +25% cap, `iondrives` +25% speed, `foundries` −25% hull cost (`ships.js:9-26`). A strict upgrade is not a decision at all; it is a tax on clicking. |
| Hull ladder | `D.HULLS` | Strictly monotone (bigger = better per ¤ at scale). The only situational texture is shipyard geography. |
| Building loadout per system type | `D.BUILDINGS` | Converges on a template per system type by hour 3. |
| Route templates | `ui_routes.js`, smart stops | Correct by construction once analytics exist; the projection *tells you* the answer. Good automation, zero decision. |
| Aptitudes, origin, doctrine, world dials | perks, §18 New Weave | Correctly non-situational — this is the identity spine. Healthy. |
| Reserve targets / directives | `market_analytics.js` reserve math | The game computes the right number (`marketConsumerReserveTicks`); the player rubber-stamps it. Healthy *as automation*, but it is presented as if it were a decision. |

## 2.2 Situational decisions that exist but are underpowered

| Decision | Where | Why it underdelivers |
|---|---|---|
| Where to expand next | relays, range, geography | The best situational decision in the game (geography is run-unique) — but shortage pressure is ambient, not *addressed to you*, so expansion is paced by comfort, not by pull. |
| Scourge triage (bastion / evacuate / inoculate / abandon) | `scourge.js` | The sim already computes a weighted frontier of next targets (`scourge.js:88-101`) **and throws it away after picking one**. The player triages blind, so the rational play is insensitive: bastion everything rich, ignore the rest. Blind triage is not triage. |
| Charters / evacuation | `TUNE.charter*`, cohorts | Real deadlines (`charterTtl`), real exclusivity (berths) — the right shape! — but they arrive on three disconnected channels (hail chips, ticker lines, panel rows), compete with nothing, and pay flat rates. Answering costs almost no opportunity. |
| Event choices | `events_data.js` | Many choices are flat (flavor A vs flavor B) or dominated (take the credits). The good ones (req-gated, stance-shifting) show the standard the rest should meet. |
| Per-trip routing | `S.findPath` | BFS returns *the* path. Blockades and corruption prune it, but the player never chooses between a fast risky lane and a slow safe one — there is no cost model to choose over (`ships.js:68-91` is unweighted). |
| Raids, escorts, retainers | combat layer | Priced in ¤ and cooldowns, so they resolve to an EV calculation, not a read of the moment. |

## 2.3 Degenerate decisions (feel like choices, aren't)

- "Sell here or two hops over?" once the Exchange ranks opportunities — the
  UI answers its own question.
- "Which idle ship should take this?" — `pickLogisticsShip` exists; asking
  the player is friction, not play.
- Any strict-upgrade research node.

These should be **automated or deleted without guilt**. Removing false
decisions is as important as adding true ones: they camouflage the real ones.

## 2.4 The shape of the imbalance

Hour 0–1 is decision-dense and situational (scarcity, one ship, everything
manual) — the reviews agree it's the best part. By hour 3 the network runs on
solved policy, and the situational layer that remains (Scourge, raids,
charters) arrives as *interruptions to be dismissed* rather than *situations
to be played*, because (a) they aren't addressed to the player's scarce
attention as a competitive set, (b) they lack the information needed to
choose well (hidden frontier weights, no path costs), and (c) the verb that
answers them is fragmented across bespoke buttons.

The overhaul, in one sentence: **make every pressure in the world arrive as a
call that one universal verb can answer, make answering one call cost the
ability to answer another, and give the player the information to triage.**

---

# 3. The Central Verb: DELIVER, made total

## 3.1 The commitment

Pillar 6 sharpened into a testable rule:

> **Every noun in the game is one of: something to deliver, somewhere to
> deliver it, something that carries a delivery, or something that threatens
> a delivery.** Any mechanical effect the player can cause must be caused by
> a delivery arriving. Anything that can't be phrased that way is a curiosity
> and must justify itself in the decision log.

Already true (keep, and say it louder in UI copy):

- **Trade** — goods to a shortage.
- **Construction** — materials physically on site (`A.buildSite`,
  `supplyMission`). The game's founding insight; untouched.
- **The cure** — 20 PANACEA to the origin (`SC.deliverPanacea`).
- **Inoculation** — 2 PANACEA to a threatened system (`SC.inoculate`).
- **Rescue** — evacuees on berths to a haven (`S.landPax`, cohorts).
- **Exploration** — the ship delivers *itself* outward and delivers data home
  (§6 cartography, `A.sellData`). Data-as-cargo is exactly right.

To be converted (these currently route around the verb):

- **Diplomacy becomes relief.** Reputation, presence, and rival pacts stop
  being purchased with a button+¤. A pact is *sealed* by a physical delivery
  (a tribute run, a relief convoy to a rival's starved system, a gift of
  hulls). `sys.presence` growth from player trades already exists — extend:
  a **RELIEF delivery** (goods sold at-or-below cost into a genuine shortage)
  grants presence and reputation multiplied by the severity of the need.
  Feeding a starving world *because it is starving* becomes mechanically
  distinct from arbitrage, and the "nice strategy" (DESIGN §12) gets teeth.
- **War becomes interdiction and armament.** Escorts already ride deliveries.
  Add: **arming a militia is delivering ALLOY/TECH to a threatened system's
  garrison site** (raises its raid resistance); an embargo is *denying*
  delivery (already priced, keep); a raid is intercepting *someone else's*
  delivery (requires §10.4 rival convoys — this spec raises its priority).
- **Research spikes become sample runs.** Any event that grants research
  above a bounded trickle must instead grant *a thing to be hauled* (samples,
  a recovered archive, a defector) that pays on arrival at an enclave. The
  Scourge sample-collection mission is the model; generalize it.
- **Story effects prefer freight.** Event `fx` that today teleports goods or
  credits should, where dramatic, spawn a delivery instead ("the medicine is
  at X; the plague is at Y; you have 60 ticks").

## 3.2 The universal command

One interaction, available from every surface that can express a need:

> **Point at a need → the game assembles the delivery → confirm or edit.**

Mechanically this is the shipped FETCH intent (`S.intent`, `A.order`)
generalized into **DELIVER(need)**: given a need (a shortage row, a call, a
build site, a threatened system, a cohort), the compiler picks the cheapest
source (`E.cheapestSource` exists), the best idle ship (`pickLogisticsShip`
exists), the path, and the arrival policy (sell / drop / hold / land / arm /
inoculate — resolved by the need's type, not by a menu). The player sees the
assembled plan as the visible queue and can override any element. The ⇄ / ⤳
affordances on market rows already prototype this; the overhaul makes the
same affordance appear on *every* need in the game — ticker items, call
cards, site cards, threatened systems, cohorts, rival hails.

Two grammar rules carried forward unchanged: never remove manual control
(the Avorion lesson), and every ship answers "why are you doing this?" in
one line.

## 3.3 Why this serves the decision balance

A total verb collapses interface cost to zero, which is what lets the game
afford *many* situations. When answering any pressure is one confirm, the
design can put the difficulty where it belongs: **in choosing which pressure
to answer**, not in operating the answer. That is the decision texture this
game wants — triage, not micromanagement.

---

# 4. THE CALLS — the situational engine

The centerpiece new system. One unified surface for every time-boxed,
addressed-to-you pressure. It replaces nothing in the sim; it *federates*
what exists (hails, charters, evac cohorts, shortage alerts, contract world
events) into one decision economy with shared rules.

## 4.1 Anatomy of a call

```js
// state.calls[] — additive, JSON-safe, ids not references
{
  id: 'call12',
  kind: 'shortage'|'charter'|'evac'|'relief'|'sample'|'escort'|'arm'|'rumor',
  sysId: 14,               // where the need is
  need: { c: 'FOOD', qty: 20 },   // or pax / escort target / site, by kind
  postedAt: 3120,
  deadline: 3320,          // hard TTL; expiry has a consequence
  payout: { credits: 900, research: 0, presence: 1.2, rep: 'helix:+1' },
  urgency: 2,              // 1 calm / 2 pressing / 3 critical (drives UI + decay)
  claimedBy: null,         // shipId once a delivery is en route
  rivalEta: 3260,          // tick a rival will answer it, if any (see 4.4)
  source: 'sim'|'event'|'rival'|'story',
}
```

Rules, all of them load-bearing:

1. **Calls are generated from real sim state**, never conjured. The shortage
   detector already exists (`market_analytics` reserve math: a consumer below
   `marketConsumerReserveTicks` of cover *is* a shortage). Cohorts, charters,
   and contract world-events are calls the moment they spawn. `G.news` lines
   about shortages become the *announcement* of a call, not the whole event.
2. **The hand is bounded.** At most `TUNE.callsMax` (start: 7) calls visible;
   generation beyond that queues by urgency. A bounded hand is what makes
   the set readable as a *hand* — you fold, you play, you never scroll.
3. **Every call expires, and expiry means something.** Shortage unanswered →
   prosperity dip lands (it would anyway — the call just made it *attributable*);
   evac unanswered → the cohort's fate (already true); relief unanswered →
   presence/rep decays toward whoever did answer; rumor unanswered → gone.
   No fake urgency: the deadline is the sim's own timetable, surfaced.
4. **Answering commits a ship.** The cost of a call is never mainly credits —
   it is *a hull and its hours*, the one genuinely scarce resource in an
   automation game. Claiming a call binds the DELIVER queue to it; the call
   card shows the ship, the ETA, and turns from a question into a promise.
5. **One call, one verb.** Every call card carries the universal DELIVER
   affordance and nothing else. If a call needs a second verb, it is two calls.

## 4.2 Why calls create situational decisions

Each call alone is trivial. The *hand* is the decision:

- Seven calls, four idle hulls, deadlines interleaved with your route
  network's steady state → **triage**. Which promise do you make?
- Calls are geographically scattered → answering the far one parks a hull
  for 30 ticks → **opportunity cost is spatial**, which makes geography (the
  run-unique element) the substrate of every choice.
- Payouts scale with response margin (`payout × f(deadline − eta)`) →
  a fast-but-small ship vs a slow-but-full one is a real read.
- Your identity re-prices the hand: a Wayfinding build sees rumor calls pay
  double; a doctrine of the hearth sees relief calls weigh presence heavier.
  **Same hand, different best answer per run** — the cross-product of §1.1.

## 4.3 Pull, not push (fixing expansion pacing)

Calls from *undiscovered or out-of-range* space arrive as faint rumors
("someone out past the Verge is asking for MEDS — relay range insufficient").
Expansion stops being paced by comfort: the frontier *asks for you*. A rumor
call answered (relay built, delivery landed) converts to discovery, presence,
and usually a permanent market. This is the missing "pull" identified in
§2.2, built from existing pieces (range check `S.inRange`, relays, fog).

## 4.4 Rivals bid on the hand

Rivals (`rivals.js`) evaluate open calls each `rivalTradeEvery` and claim
ones near their lines: the call card shows a **rival ETA**. Beat it and the
payout is yours plus a presence swing; lose the race and watch their hull
land the goods — the world was served, but not by you, and the presence
needle moves the other way. This turns the existing abstract presence war
into legible, per-call races, and it makes *ignoring* a call a priced choice
rather than a dismissal. (Depends on nothing new from rivals except an ETA
estimate; full raidable convoys — SPEC §10.4 — make the race physical later.)

## 4.5 What the Scourge does to the hand

When the front moves, the hand polarizes: evac calls, bastion-supply calls,
sample calls, relief calls for refugee-swollen havens (`settle()` already
swells their consumption — that spike should ring a call). Late game, the
player's job is exactly the exception economy promised in §1.3: the network
hauls; *you* answer what the network can't know matters.

---

# 5. The informed front — Scourge triage becomes play

The single highest-leverage change per line of code in this spec:

**Expose the frontier forecast the sim already computes.** `scourge.tick`
builds `frontier[]` — every corrupted→eligible edge with a weight
(population pull, pincer pressure, temperament richBias) — then picks one
and discards the rest (`scourge.js:88-104`). Persist the top of that
distribution to `state.scourge.forecast` (top 3–5 candidates with relative
weights, recomputed per spread attempt) and render it: candidate systems get
a threat-halo scaled by weight; the infobox says why ("populous; two
corrupted neighbors").

Now triage is a real decision under partial information (it's a weighted
draw, not a promise — the capricious temperament stays capricious):

- **Bastion** the likely target? Materials must be delivered (already true) —
  a bastion is a *bet placed in freight*, and `bastionBlock` (0.8) means even
  the right bet can break your heart. Correct roguelike texture; keep.
- **Evacuate early** (cheaper, calm) or **hold and inoculate** (2 PANACEA at
  the door — `SC.inoculate` — the expensive clutch play)?
- **Abandon** — pull the depot and route around. Sometimes right! Making
  abandonment *visibly considered* (a call card: "withdraw from X?") is what
  turns loss into a decision rather than a tax.

Add one scarcity valve so triage can't be solved by saturation:
`TUNE.bastionCap` — bastions draw from a shared maintenance pool (crews,
in fiction), soft-capping simultaneous bastions to ~⌈corrupted/3⌉+2. Beyond
the cap, each additional bastion dilutes `bastionBlock` for all. Now "bastion
everything rich" (§2.2) stops being the answer, and *which three* is the
question — situational, spatial, per-run.

---

# 6. Lane weather — the per-trip decision

Give `S.findPath` a cost model and the player a choice over it:

- **Path options**: `S.findPath(state, a, b, {mode})` with `mode: 'fast'`
  (fewest ticks, ignores risk) vs `'safe'` (weights lane risk). The DELIVER
  confirm shows both when they differ: "12 ticks past the Reach raids, or 19
  ticks around." Risk inputs all exist: raid activity (`raidBaseEvery`,
  infamy geography), blockades (`worldevents.laneBlocked`), flare regions,
  the Scourge front, badlands. One derived per-lane scalar, cached per tick
  like `laneStyleCache`.
- **Legibility first**: the map already draws lane flow; add a risk tint
  (red is reserved for harm — this is harm). No hidden dice: the tooltip
  states the per-hop loss chance in plain numbers.
- **Escort as a queue atom**: PATROL/ESCORT intents (SPEC §13.6 "remaining")
  slot here — an escort is a delivery whose cargo is protection.
- Route projections price risk into ¤/tick, so automation *can* absorb the
  solved cases (safe network interior) while the frontier stays a per-trip
  read — the exception economy again.

---

# 7. The non-situational spine, pruned and re-cut

Keep it small, chunky, and modulating. Three moves:

## 7.1 Kill strict upgrades

Audit rule for every tech, perk, and building: **an unlock must change what
you consider in a situation, not multiply a number you were already
maximizing.** Applied to the known offenders:

- `cargopods` → +35% cap, −15% speed (the freighter question, per hull, per
  route — suddenly situational).
- `iondrives` → +25% speed, +30% upkeep (fast networks are expensive
  networks; matters more the sparser the map).
- `foundries` → hulls −25% ¤ but +materials-on-site (a shipyard *delivery*
  — routes cost through the verb).
- Strict-upgrade nodes that survive the audit must be **fusions** (unlock a
  new consideration alongside the buff) or become milestones (free,
  automatic, not presented as choices).

## 7.2 Identity re-prices the situational layer

Every origin/aptitude/doctrine must state its effect *on the hand*: which
call kinds it up-pays, which risks it discounts, which arrival policies it
unlocks. (Wayfinding: rumor calls +100% and rumor hand-slot +1. Hearth
doctrine: relief presence ×1.5. Warden: escort atoms free inside your
presence.) This is cheap — mostly re-expressing existing perks in call
vocabulary — and it is what makes §4.2's "same hand, different answer" true.

## 7.3 Run dials stay dials

§18's world authoring is healthy non-situational design (authorship, not
optimization) — no changes, except every new condition should state which
call kinds it amplifies (Pilgrim Tide → charter/evac; The Long Memory →
rival call-bidding gets grudgy). Conditions become the difficulty knob *of
the situational layer*, which is where difficulty belongs.

---

# 8. Automation under the exception economy

Restating §1.3 as concrete rules for the shipped automation tiers:

1. **Routes and directives never answer calls.** They keep the steady state
   that *prevents* shortage calls from spawning in the interior — visible,
   attributable prevention ("no calls from the Hearthworlds in 400 ticks"
   is a chronicle-worthy stat).
2. **Automation escalates, never absorbs, novelty.** A route hitting a newly
   risky lane doesn't silently reroute; it raises a call ("Loop 3 is crossing
   the front — reroute, escort, or suspend?") with a default it will take on
   expiry. The player's late game is these cards, not route maintenance.
3. **Degenerate decisions get automated away** (§2.3): ship-picking,
   sell-side selection, reserve numbers — all default-computed, all
   overridable, none presented as questions.
4. **The Exchange prices attention.** Employ-idle and bulk-assign gain a
   "reserve N hulls for calls" setting — the player explicitly budgets
   steady-state vs situational capacity. That budget *is* the macro decision
   of the midgame.

---

# 9. Fairness doctrine (roguelike table stakes, mostly already held)

- **Telegraph everything** (SPEC §15.3 already commits to this): calls
  announce before they expire; the front forecasts; lane risk is printed.
  Loss must always decompose into "I chose not to prevent that."
- **Determinism survives**: calls, forecasts, rival bids all flow through
  `U.rand(state)`/`U.weightedPick`; the journal replays them. No wall-clock,
  no UI-side dice in sim.
- **No unwinnable hands, only expensive ones**: the anti-stall machinery
  (stipends, salvage advances) already guarantees continuation; calls add
  the rule that at least one call in the hand is always answerable by the
  player's current fleet (generation checks reachability — cheap via
  `S.inRange` + `S.findPath`).
- **Ignoring is an answer** (Encounters v2 principle, now economy-wide):
  every consequence of expiry is bounded and stated on the card.

---

# 10. Measurement — balance by telemetry, not vibes

Extend the archetype bots (SPEC §12) and `test/debug_bot.js`:

- **Decision cadence**: calls generated/answered/expired per 100 ticks, by
  kind, by hour-of-run. Target shape: never below ~4 live calls after hour 1;
  answered fraction 40–70% (below = noise, above = no triage happening).
- **Answer diversity**: across seeds, the distribution of *which* calls a
  greedy bot answers should not collapse to one kind (if it does, payouts
  are mispriced — the situational layer has a dominant strategy, i.e. it
  has gone non-situational).
- **Tech divergence**: bots with different identities should buy different
  tech orders post-§7.1. If orders converge, the audit failed.
- **Triage sensitivity**: a bot given the front forecast should out-survive
  a forecast-blind bot by a measurable margin — proof the information is
  decision-relevant, not decoration.
- Smoke invariants: calls always JSON-safe, bounded (`callsMax`), never
  reference dead systems/ships, always expire, forecast always matches a
  legal frontier edge, replay determinism with calls active.

---

# 11. Migration plan (each step lands green on both suites)

Ordered by leverage per risk; sim before expression before UI, per SPEC §13's
sequencing argument. Layer references follow the CLAUDE.md playbook.

**Step 1 — The front forecast** *(smallest diff, biggest honesty gain)*
Data: `TUNE.forecastTop` (4). Sim: persist top-weighted frontier edges to
`state.scourge.forecast` in `scourge.tick`. UI: threat halos + infobox
reasons. Render: halo cached per tick. Tests: forecast matches legal edges;
determinism. No actions needed — read-only surfacing.

**Step 2 — CALLS v1 (federation pass)**
Data: `TUNE.callsMax/callTtlDefault/callUrgencyDecay`. Sim: new DOM-free
`js/calls.js` (model: `tutorial.js` IIFE shape) — generation from the
shortage detector + adoption of existing charters/cohorts/contract events as
calls; expiry consequences delegated to owning systems. Actions:
`A.answerCall(callId, shipId?)` → compiles a DELIVER via `S.intent`;
`A.dismissCall`. UI: the hand — one card row surface (dock tab or command-bar
shelf), each card = need, deadline, payout, one DELIVER button. Registries:
new file into index.html + both test FILES lists; flags into `D.FLAGS`;
`data-info` for every card element. Tests: smoke drives answer/expire across
seeds; boot renders the hand.

**Step 3 — Universal DELIVER**
Sim: generalize `S.intent` FETCH into DELIVER(need) with arrival policies
(sell/drop/hold/land/inoculate); source/ship auto-pick via existing helpers.
UI: the ⇄ affordance on every need surface (market rows have it; add ticker
items, site cards, threatened systems, cohorts). Tests: each need kind
compiles to a legal queue; why-line coverage.

**Step 4 — Rival bidding** — rivals claim calls, `rivalEta` on cards,
presence swings on race outcomes. Sim-only + card field. (Raidable convoys,
SPEC §10.4, upgrade this later from race-on-paper to race-in-space.)

**Step 5 — Lane weather** — risk scalar + `findPath` modes + confirm-time
choice + route escalation calls (§8.2). Touches `ships.js` pathing, one
render tint, route projections.

**Step 6 — Tech/perk audit (§7)** — data-only re-cut of `D.TECHS`/`D.PERKS`
+ identity effects re-expressed in call vocabulary. Check
`docs/DECISIONS.md` first (the atlas is settled; this changes node *content*,
not the tree UI).

**Step 7 — Verb conversions (§3.1)** — relief deliveries (presence/rep
math), militia armament sites, sample-run generalization, event-fx freight
preference for new content. Staged; each is one action + one call kind.

**Step 8 — Bastion cap + telemetry (§5, §10)** — tuning valves and the bot
instrumentation that judges the whole overhaul.

Everything additive and JSON-serializable; defensive init at every read; no
`SAVE_VERSION` bump anticipated.

---

# 12. Non-goals

- No new resource systems, no crew management, no combat minigame. The verb
  is DELIVER; depth comes from situations, not subsystems.
- No quest log. Calls are not quests: they come from the sim, they expire,
  and the hand is bounded. The Objectives chip keeps arc goals; the hand
  keeps the moment.
- No difficulty via bigger numbers. Difficulty is call density, deadline
  tightness, rival bid speed, and front temperament — all situational dials.
- No removal of any automation tier, ever (pillar 2). We feed the automaton;
  we do not starve it to make the player busy.

---

# 13. Acceptance criteria

The overhaul has succeeded when:

1. At any point after hour 1, pausing the game shows a hand of live calls a
   new observer can read in ten seconds, each answerable with one verb.
2. Two players (or two archetype bots) with different identities, dealt the
   same seed, answer measurably different calls and buy different tech.
3. The Scourge front is played with a forecast, and bastion placement varies
   across seeds instead of converging on "everything rich."
4. No research node is a strict upgrade; every unlock names the situation it
   changes.
5. A late-game session log shows the player answering exceptions — not
   maintaining routes, and not idle.
6. Every mechanical consequence a player causes traces back through the
   journal to a delivery arriving somewhere.
7. Both suites green; replay determinism holds with every new system active.

## Final design principle

A logistics game about *being the thread* should never ask "what is optimal?"
— the network answers that by itself, and watching it do so is the reward.
It should ask, seven times an hour, with a deadline and a place on the map:
**"who do you save first?"** Everything in this document exists to make that
question arrive, make it readable, and make one verb enough to answer it.
