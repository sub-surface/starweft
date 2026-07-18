# STARWEFT - Complete Overhaul Specification

> **Sole product contract. Baseline: 2026-07-17.**
>
> This document supersedes every earlier design document, review, roadmap,
> decision log, and implementation-status claim. `CLAUDE.md` governs engineering
> practice; this file alone governs what STARWEFT is, what it should become, and
> what is actually complete.

*The worlds drifted apart. You are the thread.*

---

## 0. How to use this contract

### 0.1 Authority

The active authority model is deliberately small:

1. `SPEC.md` owns product vision, mechanics, fiction, UX, progress, acceptance
   criteria, and implementation order.
2. `CLAUDE.md` owns architecture, workflow, tests, registries, deployment, and
   engineering constraints.
3. `research/` contains non-authoritative evidence. It informs this contract but
   cannot override it.
4. Git history, especially tag `pre-overhaul-2026-07-17`, is the archive for all
   retired contracts and reviews.

If code, tests, comments, or research disagree with this file, this file wins as
the target. The implementation ledger below still describes current code truth;
it must never pretend an aspiration has shipped.

### 0.2 Checkbox and evidence rules

- `[x]` means the atomic requirement is demonstrably present in the current
  repository and has code/test evidence named beside it.
- `[ ]` means absent, incomplete, contradicted, or not yet accepted through the
  specified gate.
- There is no partial marker. Split partial work into smaller requirements.
- Requirement IDs are permanent. Never renumber or reuse them.
- A checked implementation item must cite code, a test, or an explicit visual or
  playtest acceptance artifact.
- A milestone is not shipped while any declared dependency gate remains open.
- Source comments use `SPEC[ID]`, never fragile section-number references.

### 0.3 Ratified overhaul decisions

These decisions were confirmed by the owner on 2026-07-17:

- A normal Thread is a roughly 60-90 minute System -> Bubble -> Galaxy run.
- Intergalactic play is the campaign summit reached through several Threads.
- PLEDGE is open for redesign and will be a tactical commitment system, not the
  universal win bar.
- Founder and Origin collapse into five strong launch archetypes.
- Canonical launch asks only for archetype and difficulty.
- Account progression remains wider-not-stronger by default; any exception needs
  a written problem, cap, and fresh-account completion proof.
- Combat is welcome only when it stays logistics-led, coherent with the fiction,
  brief, legible, and fun.
- The tutorial is Act 0 of the real game, not a mode that disables the roguelike.
- Narrative canon is absorbed here; old active design documents are retired.

### 0.4 Governance ledger

- [x] **SW-GOV-001** A recoverable pre-overhaul commit and annotated tag exist.
  Evidence: commit `b2b3463`, tag `pre-overhaul-2026-07-17`.
- [x] **SW-GOV-002** The provided roguelike research corpus is tracked in Git.
  Evidence: `research/sources/roguelike/` after repository consolidation.
- [ ] **SW-GOV-003** `SPEC.md` is the sole active product/design/status contract.
- [ ] **SW-GOV-004** `CLAUDE.md` points only here for product authority.
- [ ] **SW-GOV-005** All active references use stable `SPEC[ID]` comments.
- [ ] **SW-GOV-006** Superseded design documents and reviews are absent from the
  active tree.
- [ ] **SW-GOV-007** Documentation integrity is enforced by the zero-dependency
  test suite.
- [ ] **SW-GOV-008** Every checked gameplay item includes evidence.

---

## 1. Product thesis

### 1.1 One-sentence pitch

**STARWEFT is a 60-90 minute logistics roguelike in which one mortal Thread grows
from a fragile in-system courier into the coordinator of a galactic network,
while successive Threads transform a persistent campaign that culminates in an
intergalactic summit.**

### 1.2 Player fantasy

You are WEFT-7, the last logistics intelligence capable of reconnecting a broken
civilization. You do not save worlds by shooting harder. You read what they need,
commit scarce ships and time, build routes that can survive pressure, and decide
which people and places the network can afford to carry forward.

Every screen and system must sharpen three questions:

1. **Where should the Weave go next?**
2. **What must I risk, delay, or sacrifice to extend it?**
3. **What has the galaxy become because of my network?**

If a feature does not improve those questions, it is cut, merged, or moved to
Custom/Sandbox.

### 1.3 The target experience

The game is linear in **purpose and escalation**, not necessarily in topology.
The map may branch, but the player always knows:

- the current scale and objective;
- the next threshold;
- the dominant bottleneck;
- the next move of the Fray;
- the identity of the current build;
- why one more route is both dangerous and desirable.

The player should remember a run as a story of places and decisions: the hungry
moon they stabilized, the corridor they overcommitted, the convoy they abandoned,
the rival they trusted, and the final knot they held together.

### 1.4 Genre stance

STARWEFT does not chase a checklist definition of "roguelike." Its target skill is
**accurate threat and opportunity assessment in tactical situations generated by
interacting systems**. Procedural generation, death, drafts, scarcity, and changing
maps exist to create that experience. They are consequences, not the thesis.

The player must learn causes, not memorize a seed. A good death produces the
thought: *I see the chain that killed this Thread, and I know what I might do next
time.*

### 1.5 Product ledger

- [ ] **SW-VIS-001** Default play is one canonical 60-90 minute Thread.
- [ ] **SW-VIS-002** Every successful Thread traverses System, Bubble, and Galaxy
  scale in that order.
- [ ] **SW-VIS-003** Each scale changes the player's decision grammar.
- [ ] **SW-VIS-004** The campaign culminates in a bounded intergalactic summit.
- [x] **SW-VIS-005** Logistics is already the primary authored verb. Evidence:
  `js/economy.js`, `js/ships.js`, `js/sites.js`.
- [x] **SW-VIS-006** The map is already the primary play surface. Evidence:
  `js/render.js`, `index.html`.
- [x] **SW-VIS-007** The project is zero-build and zero-dependency at runtime.
  Evidence: classic scripts in `index.html`; direct `file://` architecture.
- [x] **SW-VIS-008** Simulation randomness is seeded and headless-loadable.
  Evidence: `js/util.js`, `test/smoke.js`.
- [ ] **SW-VIS-009** First-time players can identify the immediate objective
  without opening a ledger or help screen.
- [ ] **SW-VIS-010** Run power comes principally from rules and interactions,
  rather than flat percentage inflation.
- [ ] **SW-VIS-011** Scale transitions provide mechanical, spatial, visual, and
  audible change.
- [ ] **SW-VIS-012** Default launch exposes no simulation-authoring wall.

---

## 2. Design laws

These are pass/fail rules, not aspirations.

### DESIGN-LOGISTICS - Logistics is the play

Gather -> move -> deliver is not the setup for another game. Exploration finds
new flows, construction reshapes flows, politics constrains flows, and conflict
threatens flows. Even the finale is solved by moving the right things through a
network under pressure.

### DESIGN-SPINE - One visible run spine

The player always sees the current world change they are trying to create. Acts
end through concrete network outcomes, not an arbitrary score threshold.

### DESIGN-SCALE - Scale changes verbs

- System asks: *How do I make one local loop work?*
- Bubble asks: *How do I allocate a fleet across competing routes?*
- Galaxy asks: *Which regions, fronts, and commitments does the network serve?*
- Summit asks: *What kind of intergalactic Pattern did these Threads make possible?*

More dots and larger numbers do not constitute scale progression.

### DESIGN-IGNITION - Protect ignition from the cockpit

Canonical play begins with one identity, one difficulty, and one clear problem.
Seeds, topologies, world ages, conditions, names, and simulation dials belong to
Custom/Sandbox.

### DESIGN-DISCLOSURE - Complexity is earned

Show only what the current decision needs. Stable symbols and repeated placement
let the interface become "ready-to-hand." Teach one causal layer, let the player
use it, then reveal the next.

### DESIGN-CAUSALITY - Rules are consistent and explainable

The same rule applies to player, rival, and world actors unless an explicit rule
bend says otherwise. Markets, threats, and failures expose causes. Uncertainty is
allowed; hidden base rules are not.

### DESIGN-PRESSURE - Time converts optimization into decisions

The Fray makes waiting and perfect optimization costly. Explanatory screens,
events, and paused planning do not consume the clock. Pressure begins only after
the player makes the first informed commitment.

### DESIGN-FAIRNESS - Punish decisions, never obscurity

Every terminal threat has a tell and at least one feasible response when first
telegraphed. No hidden event makes an accepted mandatory commitment mathematically
impossible. A loss must be attributable.

### DESIGN-RULEBENDS - Builds transform play

The interesting sentence is conditional: "surveyed shortcuts can carry relief"
or "inbound cargo may build directly." A naked `+10%` may support a rule-bend but
cannot be the identity of an archetype, Charter, or account unlock.

### DESIGN-AUTOMATION - Automation is mastery

Automation removes solved execution and raises the planning scale. By Galaxy
scale, routine cargo should mostly move itself while the player reallocates
capacity, revises portfolios, and answers crises. If automation creates watch-only
play, it has removed the game.

### DESIGN-MAP - The map is the instrument

Controls remain anchored to places, ships, routes, and signals where practical.
Galaxy scale may use aggregate summaries, but every summary points back to map
state. "Map primary" must never become an excuse for alert clutter.

### DESIGN-TONE - Quiet dignity

Cozy does not mean consequence-free. Vast does not mean impersonal. The game is
about ordinary deliveries mattering against a patient dark. Feedback is warm and
precise, not a slot-machine storm.

### DESIGN-DEATH - Death teaches and continues

Death is fast, causal, memorialized, and campaign-relevant. It never becomes a
bare GAME OVER, and it never rewards purposeless death-farming more than play.

### DESIGN-CUT - Be un-precious

Legacy systems have no right to survive. Preserve a subsystem only when it serves
this contract better than replacement or deletion.

---

## 3. Current implementation baseline

This is the honest starting point, not the target.

### 3.1 What is genuinely strong

- [x] **SW-BASE-001** Dynamic commodity prices, production, consumption,
  factories, prosperity, and scarcity exist. Evidence: `js/economy.js`.
- [x] **SW-BASE-002** Manual orders, atomic queues, routes, directives, and
  auto-exploration exist. Evidence: `js/ships.js`.
- [x] **SW-BASE-003** An interactive system orrery and multi-system bubble exist.
  Evidence: `js/render.js`, `js/planets.js`, `js/sites.js`.
- [x] **SW-BASE-004** Pledges support quantity, destination, deadline, bond,
  trust, deterministic offers, fulfillment, and busts. Evidence:
  `js/pledges.js`; Pledge smoke coverage.
- [x] **SW-BASE-005** Manual, route, and directive sales share the Pledge
  fulfillment seam. Evidence: `js/ships.js`.
- [x] **SW-BASE-006** A three-act quota shell, bank/push boundary, Boon draft,
  and nominal graduation exist. Evidence: `js/acts.js`.
- [x] **SW-BASE-007** Three functional Founder prototypes exist. Evidence:
  `js/founders.js`; Founder tests.
- [x] **SW-BASE-008** Command strip, drawers, beacons, orbital ring, edge compass,
  and star-anchored board flyout exist. Evidence: `js/ui.js`, `js/signals.js`,
  `js/render.js`, `test/browser_boot.js`.
- [x] **SW-BASE-009** Delivery completion has strong recurring feedback. Evidence:
  `js/pledges.js`, `js/audio.js`, `js/render.js`.
- [x] **SW-BASE-010** Save/load, validation, action journal, and two canonical
  test suites exist. Evidence: `js/game.js`, `test/`.

### 3.2 What the old Reweave did not implement

- [x] **SW-BASE-011** Campaign, Thread, and account state are partitioned.
  Evidence: `js/campaign.js`, `js/game.js`; Gate 1 lifetime/account sections in
  `test/smoke.js`; 2026-07-17 smoke result: 161,468 checks/0 failures.
- [ ] **SW-BASE-012** Death wakes a successor in the same campaign galaxy.
- [ ] **SW-BASE-013** Interregnum advances a persistent world.
- [ ] **SW-BASE-014** Research is campaign-scoped and survives Thread death.
- [ ] **SW-BASE-015** Aperture affects command range and simulation fidelity.
- [x] **SW-BASE-016** Hot/warm/cold simulation exists. Evidence:
  `economy-cold-v1` defers eligible Cold local economies on a bounded cadence;
  Hot and Warm remain exact, and 500-tick equivalence fixtures pass.
- [ ] **SW-BASE-017** Charters exist as an ordered or otherwise legible build
  system. Current Boons are only a prototype modifier bag.
- [ ] **SW-BASE-018** Chronicle histories, currency, unlock tracks, and NPC memory
  exist.
- [ ] **SW-BASE-019** Galaxy-scale objects are interactable. The current Milky Way
  is presentation only.
- [ ] **SW-BASE-020** Intergalactic play exists.
- [x] **SW-BASE-021** The first-run prologue remains inside canonical Acts. Evidence:
  the replacement Act 0 is canonical Act index 0 and starts the real Act I clock
  only after its transition criteria pass.
- [x] **SW-BASE-022** Canonical launch avoids the existing wall of run shape,
  identity, myth, Origin, Founder, galaxy dials, conditions, doctrine, aptitude,
  and seed. Evidence: the primary surface requires only archetype and pressure;
  the retired wall is isolated in Custom/Sandbox.

**Baseline verdict:** the existing game is a rich open logistics sandbox with a
useful PLEDGE/Act prototype and substantial UI refacing. It is not yet the target
roguelike.

---

## 4. Nested lifetimes and persistence

### 4.1 Four lifetimes

| Lifetime | Duration | Owns | Ends when |
|---|---:|---|---|
| **Chronicle / account** | permanent | records, lore, cosmetics, widened pools, settings | never automatically |
| **Weave / campaign** | 2-4 Threads plus Summit | galaxy seed, regions, Fray, cast memory, Archive, holdings, scars, Reach/Resilience/Accord | Summit resolves or player retires it |
| **Thread / run** | 60-90 minutes | fleet, credits, active network, archetype, Charters, objectives | Galaxy resolution, withdrawal, or death |
| **Act / scale** | 12-35 minutes | active aperture, local objective, pressure pattern, attention budget | scale transition or Thread end |

The emotional protagonist is WEFT-7, instantiated as a mortal Thread. Archetype
cards describe the hull, mandate, and operational persona of that instance; they
are not immortal named humans repeatedly resurrected without explanation. Recurring
named characters live in the campaign and remember each instance.

### 4.2 What persists

| State | Account | Campaign | Thread |
|---|:---:|:---:|:---:|
| Settings and accessibility | yes | - | - |
| Thread/campaign records and lore | yes | reflected | generated |
| Archetype/Charter/content unlock breadth | yes | available | drafted subset |
| Galaxy, regions, Fray, factions, cast | - | yes | reads/writes |
| Archive knowledge and scale capabilities | - | yes | available |
| Stable holdings, routes-as-abstract-corridors, scars | - | yes | created by resolution |
| Ships, cargo, credits, Charters, active local routes | - | no | yes |

Campaign progression may make later Threads **different and more capable within
that campaign**, because building a galaxy is the campaign game. Account progress
must not raise fresh-campaign base stats. This is the principal allowed distinction
under wider-not-stronger.

### 4.3 Thread outcomes

- **Complete:** resolve Act III. Convert one consequential part of the Thread into
  a campaign holding, relationship, corridor, discovery, or scar. A completed
  Thread contributes Reach, Resilience, or Accord toward the Summit.
- **Withdraw:** available once Act II is stable. Preserve limited knowledge and a
  modest world consequence, but do not count as a completed Thread or Summit
  capability. This is the safe exit, not a full win.
- **Cut:** miss a terminal objective after adequate warning. The network partially
  unravels; selected facilities or wrecks persist.
- **Burned:** the Loomship is destroyed after a visible chain of ignored or failed
  warnings.
- **Eaten:** the active Heart is consumed after its last viable rescue state.

Early BANK is removed. A canonical victory requires Galaxy resolution; otherwise
the promised scale arc is optional and the opening becomes the whole game.

### 4.4 State ledger

- [x] **SW-STATE-001** State is explicitly partitioned into account, campaign,
  Thread, and act concerns. Evidence: closed canonical root and versioned ownership
  in `js/campaign.js`; Gate 1 lifetime-schema smoke result: pass.
- [ ] **SW-STATE-002** Thread death preserves the campaign galaxy.
- [x] **SW-STATE-003** Account state is stored independently from campaign saves.
  Evidence: independent account/Chronicle key and schema in `js/game.js` and
  `js/campaign.js`; account-isolation smoke and browser storage results: pass.
- [ ] **SW-STATE-004** A successor inherits no fleet, credits, cargo, or Charters.
- [ ] **SW-STATE-005** Selected physical and historical consequences persist.
- [ ] **SW-STATE-006** Archive knowledge survives death and resets with a fresh
  campaign.
- [ ] **SW-STATE-007** Campaign retirement is explicit and does not overwrite the
  Chronicle.
- [x] **SW-STATE-008** Current run state is JSON-serializable. Evidence:
  `js/game.js` save/export paths.
- [x] **SW-STATE-009** Seed and action journaling exist. Evidence: `js/game.js`.
- [ ] **SW-STATE-010** Campaign transitions, Interregnum, and successor wake are
  deterministic and replayable.
- [ ] **SW-STATE-011** Repeated death cannot silently make a campaign unwinnable.

---

## 5. Canonical front door

### 5.1 Title screen

```text
STARWEFT
The worlds drifted apart. You are the thread.

[ CONTINUE WEAVE ]          when a campaign/Thread exists
[ WAKE NEXT THREAD ]        when campaign waits for a successor
[ BEGIN NEW WEAVE ]
[ DAILY THREAD ]
[ CUSTOM / SANDBOX ]
[ CHRONICLE ]
[ SETTINGS & ACCESSIBILITY ]
```

The menu describes STARWEFT as a **logistics roguelike**, not merely a strategy
sandbox. "Continue" always explains which campaign and Thread it will open.

### 5.2 Canonical launch

```text
CHOOSE YOUR THREAD                    CHOOSE PRESSURE

[ Courier ]                           ( ) Guided
[ Cartographer ]                      (x) Standard
[ Stationwright ]                     ( ) Severe
[ Envoy ]
[ Warden ]

                            [ BEGIN REWEAVE ]
```

Courier and the last-used difficulty are preselected. Selecting a card immediately
shows its rule-bend, liability, starting craft, first-run verb, and a short visual.
Thread name is generated and can be renamed after launch; naming never blocks play.
Seed and full configuration appear in a secondary details panel only.

Returning players receive **Replay last identity and difficulty** on the death
screen. Experienced death-to-control should require one click and under 30 seconds.

### 5.3 Custom/Sandbox

Custom/Sandbox owns everything removed from canonical launch:

- seed, density, system count, topology, age, wealth, Heart, rivals;
- Fray temperament and clock;
- world conditions and content pool controls;
- no-Fray and endless modes;
- old Long Weave/free-play behavior;
- explicit experimental or challenge modifiers.

Custom settings never masquerade as accessibility. Custom completion may record
separately, but it must not be the default first impression.

### 5.4 Difficulty and assist

- **Guided:** intended systems, longer threat warnings, one declared recovery
  allowance per Act, complete progression.
- **Standard:** tuning authority and intended first completion.
- **Severe:** shorter warnings, more coordinated pressure, fewer recovery options;
  never opaque health/damage inflation as the primary change.

Assist options live in Settings: auto-pause, slower pressure, exact forecasts,
confirmation windows, text and UI scale, contrast, reduced motion, sound captions,
and optional loss grace. Assists never disable story or unlocks; records disclose
their use without shaming the player.

### 5.5 Launch ledger

- [ ] **SW-START-001** Founder and Origin are replaced by one archetype system.
  Partial: the canonical surface resolves only `archetype` and `pressure`, but
  canonical creation still maps through legacy Origin/Founder IDs and effects.
  Removing that internal duplication remains part of SW-START-010/Gate 3 cleanup.
- [x] **SW-START-002** Exactly five baseline cards appear in canonical launch.
  Evidence: `SW.data.ARCHETYPE_IDS`, `showNewRun`, and the Gate 2 launch matrix.
- [x] **SW-START-003** Every card has one rule-bend, liability, craft/loadout, and
  plain-language playstyle. Evidence: `SW.data.ARCHETYPES` and canonical card
  rendering in `js/ui_modals.js`.
- [x] **SW-START-004** Difficulty is the only other required choice. Evidence:
  the canonical surface exposes archetype, pressure, and one Launch action.
- [x] **SW-START-005** Courier and Standard have sensible defaults. Evidence:
  `G.canonicalLaunch`, saved last-launch preferences, and browser boot coverage.
- [x] **SW-START-006** Returning players start in no more than two deliberate
  clicks from title. Evidence: Begin New Weave -> Launch Thread with valid defaults.
- [x] **SW-START-007** Default launch hides all world-authoring controls. Evidence:
  seed is secondary disclosure; authoring dials exist only in Custom/Sandbox.
- [x] **SW-START-008** Daily and Custom are separate surfaces. Evidence:
  distinct title actions, renderers, and dispatch paths.
- [x] **SW-START-009** Three Founder rule-bend prototypes exist. Evidence:
  `js/founders.js`.
- [ ] **SW-START-010** Existing Origin/Founder effects are merged, rewritten, or
  deleted without duplicate launch axes.

---

## 6. The five archetypes

Names are working canon; mechanical roles are locked unless playtesting shows two
roles create the same decisions.

### 6.1 Courier - tempo and routing

**Fantasy:** the impossible parcel, carried exactly where it must go.

- **Rule-bend:** link compatible Pledges into an ordered manifest; one journey may
  fulfill several commitments in sequence and transfer pledged cargo between
  ships without breaking the chain.
- **Liability:** a broken link compromises every downstream deadline and stake.
- **Start:** fast shuttle, modest universal cargo, a safe two-stop opportunity.
- **Scale arc:** local circuit -> multi-stop portfolio -> galactic express corridor.
- **Conflict expression:** reroute, extract, decoy, or outrun rather than overpower.

### 6.2 Cartographer - information and frontier

**Fantasy:** make the unknown traversable, then bring its value home.

- **Rule-bend:** data, surveys, samples, and unrevealed destinations can become
  Pledges; completed surveys reveal shortcuts or improve route forecasts.
- **Liability:** survey equipment occupies hold space and initial market knowledge
  is less reliable.
- **Start:** scout, small cargo hold, one unsold data bundle.
- **Scale arc:** survey a system -> open a bubble shortcut -> chart a galactic
  passage.
- **Conflict expression:** warning, avoidance, weakness discovery, recovery.

Rockhopper survives as a Cartographer frontier variant or later archetype card,
not as a duplicate baseline axis.

### 6.3 Stationwright - production and infrastructure

**Fantasy:** turn a delivery into a place that keeps helping after the ship leaves.

- **Rule-bend:** qualifying Pledge completions may leave a relay, depot, yard, or
  emergency facility imprint; inbound build cargo can be consumed directly.
- **Liability:** capital becomes geographically committed and early mobility is
  weaker.
- **Start:** utility tug, construction kit, damaged local facility.
- **Scale arc:** repair a site -> build a production knot -> establish a regional
  backbone.
- **Conflict expression:** repair, redundancy, fortification, bastion supply.

### 6.4 Envoy - reciprocity and factions

**Fantasy:** weave people and obligations as carefully as cargo.

- **Rule-bend:** bundle reciprocal Pledges; fulfilled needs can become access,
  truces, shared corridors, or allied infrastructure instead of credits.
- **Liability:** abandonment has wider diplomatic consequences and some profitable
  cargo becomes politically forbidden.
- **Start:** passenger-capable courier, two minor relationships, reciprocal need.
- **Scale arc:** local trust -> bubble compact -> galactic coalition.
- **Conflict expression:** ceasefire, safe conduct, allied escort, negotiated exit.

### 6.5 Warden - threat and recovery

**Fantasy:** keep the road open and recover what the dark tried to take.

- **Rule-bend:** threatened deliveries, damaged cargo, wreck recovery, and security
  supply become first-class Pledges; salvage can be routed straight into repair.
- **Liability:** danger follows the Thread and peaceful boards offer fewer ordinary
  opportunities.
- **Start:** durable escort-hauler, repair stock, visible threatened route.
- **Scale arc:** recover a wreck -> secure a corridor -> sustain a galactic front.
- **Conflict expression:** protection, salvage, interdiction, supply under fire.

### 6.6 Archetype laws and ledger

- The bend matters within five minutes and remains relevant at all three scales.
- Every mandatory objective has at least two tested approaches for every archetype.
- Each archetype supports at least two Charter families.
- No archetype owns an exclusive mandatory content lane.
- Matched-skill completion rates target an eight-percentage-point band.
- If two archetypes yield the same route topology, Pledge mix, and build, merge or
  rewrite them.

- [ ] **SW-ARCH-001** Courier satisfies its complete role above.
- [ ] **SW-ARCH-002** Cartographer satisfies its complete role above.
- [ ] **SW-ARCH-003** Stationwright satisfies its complete role above.
- [ ] **SW-ARCH-004** Envoy satisfies its complete role above.
- [ ] **SW-ARCH-005** Warden satisfies its complete role above.
- [ ] **SW-ARCH-006** All five bends trigger in the first five minutes.
- [ ] **SW-ARCH-007** All five remain relevant through Galaxy scale.
- [ ] **SW-ARCH-008** Completion rates and decision profiles pass diversity gates.

---

## 7. Thread cadence and attention budgets

### 7.1 Timing target

| Beat | Standard target | Scope |
|---|---:|---|
| Launch | 0:00-0:45 | card, difficulty, begin |
| Act 0 - Wake | 8-12 min, first campaign only | guided System opening |
| Act I - Ignition | 12-15 min experienced | one system |
| Act II - Reach | 22-27 min | 4-8 active systems, 2-3 clusters |
| Act III - Commit | 28-35 min | up to 3 region-level fronts |
| Resolution | 3-7 min | causal debrief and campaign conversion |

Target median is 65-80 minutes; 90 minutes is the upper normal tail. Planning,
events, explanations, and draft screens pause pressure.

### 7.2 Attention budgets

| Scale | Main objectives | Optional objectives | Concurrent Pledges | Urgent alerts | Active fronts |
|---|---:|---:|---:|---:|---:|
| System | 1 | 0-1 | 2 | 1 | 0 |
| Bubble | 1 | 1 | 3 | 3 | 1 |
| Galaxy | 1 compound | 1 | 5 | 3 | 2-3 |

Lower-priority systems aggregate into named knots. The game never demands that the
player reason about dozens of equally urgent stars.

### 7.3 Run grammar

Every scale repeats a comprehensible rhythm at increasing scope:

> Read need -> plan chain -> commit capacity -> deliver or defend -> stabilize a
> world state -> draft one rule-bend -> open the next scale.

Each Act contains:

1. an immediately legible opening problem;
2. an escalation that competes for existing capacity;
3. a mastery test using the Act's learned verbs;
4. a decisive transition that changes scope.

### 7.4 Run ledger

- [ ] **SW-RUN-001** Every canonical Thread begins at System scale.
- [ ] **SW-RUN-002** Surviving Threads reach Bubble through a concrete local
  logistics outcome.
- [ ] **SW-RUN-003** Surviving Threads reach Galaxy through a concrete network
  outcome.
- [ ] **SW-RUN-004** Act progression does not depend on generic WEAVE quota.
- [x] **SW-RUN-005** A quota/clock Act shell exists. Evidence: `js/acts.js`.
- [ ] **SW-RUN-006** That shell is replaced or subordinated to scale objectives.
- [ ] **SW-RUN-007** Every Act has problem, escalation, mastery, transition.
- [ ] **SW-RUN-008** Draft screens pause pressure and present one meaningful pick.
- [ ] **SW-RUN-009** Canonical completion requires Galaxy resolution.
- [ ] **SW-RUN-010** Withdrawal is safe but is not recorded as a completed Thread.
- [ ] **SW-RUN-011** Median complete Thread falls in the target band.
- [ ] **SW-RUN-012** No involuntary watch-only interval exceeds 90 seconds.
- [ ] **SW-RUN-013** Canonical play never becomes indefinite sandbox after Act III.

---

## 8. Act 0 - the guided Wake

Act 0 is the first campaign's System opening with additional guidance. It is not a
separate tutorial mode and never disables the canonical state machine.

### 8.1 Sequence

1. Choose archetype and difficulty.
2. Wake in one visibly broken system with one shortage and one source.
3. Select, load, send, and deliver one unpledged cargo.
4. Show exactly how the destination changed.
5. Offer two contextual Pledges: safe and ambitious.
6. Preview source, capacity, ETA, deadline slack, exposure, stake, and world effect.
7. Complete one Pledge and show contract plus world feedback separately.
8. Add a second commodity that forms a circular route.
9. Teach route automation.
10. Offer the first Charter draft.
11. Telegraph one nonlethal lane disruption with two valid responses.
12. Require the local knot to remain stable for several pulses.
13. Pull the camera outward and present three distinct Bubble needs.

Do not teach factions, the entire Archive, all Charter families, full conflict,
world conditions, or campaign genesis before the player needs them.

### 8.2 Guidance rules

- Guidance anchors to the relevant star, body, ship, lane, cargo, or control.
- Each instruction names one action and one reason.
- Irrelevant controls remain hidden until their beat.
- Each taught action gets immediate visual and audible confirmation.
- The clock does not begin before the first informed Pledge acceptance.
- No beat can soft-lock; every state predicate has a deterministic fallback.
- Returning players may skip or replay Act 0.
- Skipping produces the same valid Act I state.

### 8.3 Repeated openings

Run ten must not replay ten identical minutes. Later System openings vary by local
topology, shortage, archetype, Anchor objective, prior campaign scars, and Fray
pattern. Experienced players may authorize the understood first transfer with one
click; the first meaningful build choice arrives earlier.

### 8.4 Tutorial ledger

- [x] **SW-TUT-001** A Sol cold-open state machine exists. Evidence:
  `js/tutorial.js`, browser boot tests.
- [ ] **SW-TUT-002** Act 0 uses the canonical Thread state.
- [ ] **SW-TUT-003** Tutorial selection no longer disables Acts.
- [ ] **SW-TUT-004** All thirteen beats above are implemented and signalled.
- [ ] **SW-TUT-005** Irrelevant controls disclose progressively.
- [ ] **SW-TUT-006** Skip and completion converge on equivalent Act I state.
- [ ] **SW-TUT-007** First-time completion median is 8-12 minutes.
- [ ] **SW-TUT-008** At least 80% of observed new players complete without
  external help.

---

## 9. Act I - Ignition / System scale

System scale must be a complete small logistics puzzle rather than a shared market
with decorative planets.

### 9.1 Play space

- Three to five meaningful bodies or sites.
- One ship initially; no more than two before transition.
- Local stores, production, consumption, and berth transfer consequences that are
  distinguishable by body.
- One main problem, at most two concurrent Pledges, and one nonterminal disruption.

The current system-level shared stock with berth multipliers is a useful prototype,
but Act I needs local state that makes route order and body choice matter. Aggregated
system prices may remain a summary; they cannot erase local supply movement.

### 9.2 Success

The Act requires an **Anchor Knot**:

1. restore or establish a circular local supply loop;
2. complete one contextual Anchor operation;
3. keep critical local needs above their thresholds for a short stable window;
4. survive a telegraphed disruption using delivery, reroute, repair, or sacrifice.

The first delivery target is under two minutes, first Pledge under four, first
completion under seven, first automation under ten.

### 9.3 Transition

Completion produces a continuous camera pull from bodies to the local bubble. The
system becomes a named Knot with a concise summary: what it produces, what it needs,
what capacity it contributes, and what remains vulnerable. System controls remain
available on zoom-in, but solved routine transfers default to automation.

### 9.4 System ledger

- [x] **SW-SYS-001** Interactive system orrery exists. Evidence: `js/render.js`.
- [x] **SW-SYS-002** Bodies and facilities exist. Evidence: `js/planets.js`,
  `js/sites.js`.
- [ ] **SW-SYS-003** Bodies expose meaningful local logistics state.
- [ ] **SW-SYS-004** A viable Anchor Knot exists across validated seeds.
- [ ] **SW-SYS-005** Act I requires and tests a sustainable local loop.
- [ ] **SW-SYS-006** First automation is earned through the loop.
- [ ] **SW-SYS-007** The disruption tests the loop rather than a larger quota.
- [ ] **SW-SYS-008** Transition clearly changes scope and feedback.
- [ ] **SW-SYS-009** System mechanics remain relevant later without demanding
  repetitive micromanagement.

---

## 10. Act II - Reach / Bubble scale

Bubble scale retimes the current sandbox's strongest substrate into a focused
capacity-planning act.

### 10.1 Play space

- Four to eight fully active systems across two or three contrasting clusters.
- Three to five routes, two or three concurrent Pledges, no more than three urgent
  beacons.
- Three visible outward branches with different needs and consequences.
- One rival pressure and one Fray pattern, introduced separately before combining.

The wider procedural bubble remains visible, but only the active aperture demands
full-fidelity attention. Remote areas use warm/cold state.

### 10.2 Objective families

- **Relink:** connect mutually dependent clusters.
- **Refuge:** stabilize an evacuation corridor.
- **Industrialize:** establish a production chain and hold it through disruption.
- **Reciprocate:** broker supply between politically hostile systems.
- **Survey:** chart and secure a dangerous shortcut.
- **Contain:** isolate a threat without starving its neighbors.

At least three different archetype/build strategies must solve every generated
Bubble objective. Repeated safe loops can support the economy but cannot alone
resolve the Act.

### 10.3 Crisis and transition

The final crisis tests resilience: a bridge fails, a rival seizes capacity, a Fray
probe attacks slack topology, or refugees overload a route. The player sees target,
arrival window, expected consequence, and response classes early enough to act.

On success, offer **Withdraw** or **Commit to Galaxy**. Commit drafts one Charter,
collapses solved systems into named knots, and reveals up to three region-level
fronts. Withdrawal preserves limited campaign consequence but ends the Thread short
of completion.

### 10.4 Bubble ledger

- [x] **SW-BUB-001** Multi-system bubble, lanes, markets, rivals, and Fray exist.
  Evidence: `js/galaxy.js`, `js/economy.js`, `js/rivals.js`, `js/scourge.js`.
- [x] **SW-BUB-002** Manual dispatch, routes, directives, relays, and depots exist.
  Evidence: `js/ships.js`, `js/sites.js`.
- [ ] **SW-BUB-003** Active aperture affects commands and simulation fidelity.
- [ ] **SW-BUB-004** Bubble scope fits the attention budget.
- [ ] **SW-BUB-005** Three distinct outward choices are legible.
- [ ] **SW-BUB-006** Rivals visibly contest logistics opportunities.
- [ ] **SW-BUB-007** Lane use has mechanical speed, resilience, or access effects.
- [ ] **SW-BUB-008** Crisis can be solved through multiple logistics responses.
- [ ] **SW-BUB-009** Act II target duration is 22-27 minutes.
- [ ] **SW-BUB-010** Withdraw and Commit behave as specified.

---

## 11. Act III - Commit / Galaxy scale

Galaxy scale becomes playable through regions, not billions of individually
simulated stars.

### 11.1 Galaxy model

- **Knots:** solved systems/bubbles summarized by production, demand, resilience,
  population, alignment, and current risk.
- **Corridors:** long-haul edges with capacity, transit time, exposure, maintenance,
  and political access.
- **Fronts:** two or three region-level problems competing for the same strategic
  fleet and supplies.
- **Holdings:** campaign-persistent results of completed Threads.

The player may zoom into a hot Knot, but Galaxy decisions are allocation,
prioritization, corridor design, convoy timing, and irreversible commitment. Routine
local cargo remains automated.

### 11.2 Compound objective grammar

One primary objective contains two or three linked operations, not unrelated bars.
Example:

> Evacuate Meridian, keep the relay supplied, and decide whether to sacrifice the
> industrial spur or expose the Heart to preserve it.

Galaxy objective families:

- establish and hold a cross-region relief corridor;
- mobilize several production knots to sustain a front;
- broker a coalition and physically fulfill its reciprocal obligations;
- survey, supply, and stabilize a route through a dark galactic feature;
- quarantine a spreading Fray pattern while maintaining civilian flow;
- assemble and escort a campaign capability: Reach, Resilience, or Accord.

### 11.3 Resolution

Act III ends with a world-changing crisis and one irreversible decision. The final
network converts into exactly one primary campaign contribution plus secondary
scars. It does not preserve every ship and route at full fidelity.

The debrief states:

- what the Thread established;
- what it lost;
- which campaign capability it advanced;
- what the Fray and factions will do before the successor wakes.

### 11.4 Galaxy ledger

- [x] **SW-GAL-001** A visual Milky Way LOD exists. Evidence: `js/render.js`.
- [ ] **SW-GAL-002** Galaxy nodes are playable Knots with persistent state.
- [ ] **SW-GAL-003** Corridors have capacity, time, risk, and supply state.
- [ ] **SW-GAL-004** Player can issue meaningful Galaxy logistics actions.
- [ ] **SW-GAL-005** Hot/warm/cold simulation resolves remote flows.
- [ ] **SW-GAL-006** Act III coordinates at least two distinct regions.
- [ ] **SW-GAL-007** Local outcomes materially affect galactic capacity.
- [ ] **SW-GAL-008** Fray attacks network structure rather than applying only a
  timer.
- [ ] **SW-GAL-009** Aggregate UI remains causal and map-linked.
- [ ] **SW-GAL-010** Act III target duration is 28-35 minutes.
- [ ] **SW-GAL-011** Galaxy resolution creates a campaign contribution.
- [ ] **SW-GAL-012** Galaxy zoom no longer collapses play into a decorative dot.

---

## 12. Campaign and intergalactic summit

### 12.1 Campaign shape

A campaign normally contains two to four substantive Threads. Completion is not a
death count or filled meta meter. Threads establish three capabilities:

- **Reach:** a stable galactic corridor and the knowledge to cross beyond.
- **Resilience:** a distributed network capable of surviving severance.
- **Accord:** allies or shared protocols willing to carry the Pattern together.

A completed Thread normally establishes one capability. Unusual builds may trade
depth in one for partial progress in another. Failed Threads may leave knowledge,
wreckage, relationships, or new problems, but never earn readiness merely for dying.

### 12.2 Summit

Once Reach, Resilience, and Accord exist, a separate 15-20 minute final operation
opens. It uses the campaign's holdings, scars, factions, Archive, and Fray pattern.
It is not a fourth repetitive economy tier.

The final operation must:

1. assemble a Starbridge or equivalent better knot;
2. provision it from several campaign holdings;
3. survive a patterned final unravelling;
4. resolve one irreversible commitment.

Possible endings:

- **Bridge:** connect to another galaxy using a non-conductive Pattern.
- **Carry:** launch a living exodus and let the old galaxy choose its own future.
- **Mend:** turn the Starbridge inward and make this galaxy survivable first.

No ending is a simple moral/color choice. Available methods and costs arise from
Reach, Resilience, Accord, factions, secrets, and prior sacrifices.

### 12.3 After the summit

Success or failure closes the campaign cleanly and enters its complete tapestry in
the Chronicle. A neighboring galaxy may become a new campaign with different
conditions and content breadth, but no mandatory numeric advantage. The completed
galaxy remains viewable and is never overwritten by starting another.

### 12.4 Summit ledger

- [ ] **SW-IG-001** Summit requires Reach, Resilience, and Accord from multiple
  Threads.
- [ ] **SW-IG-002** Summit is a bounded 15-20 minute final operation.
- [ ] **SW-IG-003** At least three campaign histories materially alter conditions.
- [ ] **SW-IG-004** Allies, scars, Archive, and holdings affect available plans.
- [ ] **SW-IG-005** Finale is solved through interregional logistics.
- [ ] **SW-IG-006** Final commitment previews irreversible stakes.
- [ ] **SW-IG-007** Success and failure both produce complete endings.
- [ ] **SW-IG-008** Chronicle records the campaign without mandatory stat power.
- [ ] **SW-IG-009** Multiple completed campaigns coexist.

---

## 13. The logistics game

STARWEFT is not a spreadsheet decorated with stars. It is a game about making a
promise, reading a changing physical situation, and building a network capable of
keeping that promise. Its verbs stay legible as scale increases:

1. **Read:** find the need, bottleneck, threat, and available leverage.
2. **Commit:** choose a destination, cargo, route, deadline, and acceptable risk.
3. **Shape:** survey, negotiate, repair, stage, automate, or defend the network.
4. **Move:** dispatch matter, people, information, or capability through space.
5. **Respond:** reroute when the world changes; sacrifice slack, time, standing, or
   opportunity rather than merely clicking a stronger number.
6. **Arrive:** see an immediate physical and social consequence at the destination.
7. **Integrate:** convert a repeated solution into infrastructure and move attention
   to the next scale.

The loop must generate decisions at the frontier and eventually automate solved
work behind it. Automation is the reward for understanding, not an idle-game
replacement for play.

### 13.1 What can be moved

The current nine commodities may remain where they create distinct routing or
production decisions. The product contract groups all payloads into four readable
classes:

- **Matter:** ore, water, volatiles, organics, alloys, components, and other goods.
- **Energy:** fuel and stored power whose loss can strand a network.
- **People:** crew, specialists, settlers, evacuees, prisoners, and diplomats.
- **Knowledge:** survey results, designs, warnings, testimony, and cultural records.

People and knowledge are never reskinned ore. They impose consent, safety,
secrecy, urgency, or continuity constraints and produce narrative consequences.
The manifest shows class icons before exact names so a crisis remains readable at
galaxy zoom.

### 13.2 Scarcity and failure

Scarcity should ask, "what will you protect?" It must not routinely ask, "did the
seed omit the only thing that allows play?" Every canonical seed passes a
reachability validator that proves at least two viable openings and one recoverable
path through each required objective. This does not guarantee comfort or a win.

Soft failure changes the world: a colony disperses, a faction takes control of a
lane, a station becomes dependent, a route acquires debt, or a rival claims a
discovery. Hard failure ends a Thread only when the player has had readable tells,
at least one meaningful response window, and no remaining viable successor.

### 13.3 Objective grammar

Objectives are generated from world state rather than selected from a detached
global mission board. A need appears at a place, a person or institution voices
it, and accepting it focuses the map on its relevant geography.

| Family | The world asks | Common solutions | Persistent result |
|---|---|---|---|
| Restore | Make a broken place usable | deliver parts, salvage locally, recruit expertise, negotiate access | repaired site, gratitude, debt, or dependency |
| Stabilize | Stop a worsening loop | buffer stock, reroute demand, ration, change production, evacuate | resilience or a visible scar |
| Bridge | Connect separated regions | survey, relay, escort, treaty, construct, share data | a lane, corridor, or political bond |
| Relief | Keep people alive under time pressure | supply, evacuate, shelter, medical knowledge, ceasefire | survivors move and remember |
| Survey | Turn uncertainty into a decision | probe, scout, trade intelligence, take a dangerous shortcut | revealed topology and opportunity |
| Exchange | Reconcile incompatible needs | trade, arbitration, joint project, concession, proof | accord, market access, or grievance |
| Mobilize | Prepare for a forecast threat | stockpile, screen, fortify, relocate, deceive, negotiate | changed threat geometry |
| Contain | Limit spread without erasing the affected | quarantine, cure, isolate routes, redirect pressure | controlled hazard and moral consequence |
| Recover | Retrieve value from a dangerous or lost place | salvage, rescue, bargain, decode, relinquish | capability, person, secret, or wreck |
| Found | Make a durable home or exodus | assemble ecology, population, charter, route, and consent | a new polity or campaign-scale capability |

Every mandatory objective must be solvable by at least three response classes,
one of which is nonviolent. No archetype may be required, but each archetype must
reveal a characterful route: the Courier buys time, the Cartographer changes
knowledge and topology, the Stationwright changes capacity, the Envoy changes
permission and incentives, and the Warden changes exposure and recovery.

### 13.4 Scale composition

The grammar nests instead of resetting:

- A body-level delivery creates or relieves a local dependency.
- Several local dependencies form a system bottleneck.
- System surpluses, routes, and allegiances become bubble-scale inputs.
- Bubble corridors and political decisions become galaxy-scale fronts.
- Galaxy-scale choices determine campaign capabilities and Summit conditions.

The interface may aggregate quantities, but it must preserve causality. Selecting
a galaxy flow can trace it down to its constituent routes and the places affected.
At no point should "+3 stability" be the only explanation for a result.

### 13.5 Automation ladder

Automation has four stages, each taught through manual competence:

1. **Dispatch:** the player selects one origin, payload, destination, and route.
2. **Repeat:** a successful dispatch can repeat under the same safety constraints.
3. **Policy:** the player declares a reserve, priority, cadence, or risk ceiling.
4. **Network:** multiple routes coordinate around a shared goal and alert only on
   exceptions that cross player-set thresholds.

Automation never silently consumes protected reserves, reroutes people through a
declared hazard, or breaks a Pledge. Every automated action is inspectable,
pausable, and attributable. Alerts must propose a decision, not merely announce
that a hidden rule already caused damage.

### 13.6 Logistics ledger

- [ ] **SW-LOG-001** Read, Commit, Shape, Move, Respond, Arrive, and Integrate form
  the observable core loop.
- [ ] **SW-LOG-002** Matter, energy, people, and knowledge have mechanically
  distinct constraints and feedback.
- [ ] **SW-LOG-003** Delivery consequences appear at their destination within one
  interaction beat.
- [ ] **SW-LOG-004** Solved recurring work can progress through all four automation
  stages.
- [ ] **SW-LOG-005** Every automated movement is inspectable, pausable, and bound
  by reserves and risk limits.
- [ ] **SW-LOG-006** Aggregate flows can be traced to constituent routes and
  affected places.
- [ ] **SW-LOG-007** Scarcity creates trade-offs without routine seed deadlocks.
- [ ] **SW-OBJ-001** Objectives originate from visible world state at a place.
- [ ] **SW-OBJ-002** All ten objective families have authored and generated forms.
- [ ] **SW-OBJ-003** Every mandatory objective offers at least three response
  classes, including a nonviolent response.
- [ ] **SW-OBJ-004** Each archetype has a distinctive route through every mandatory
  objective family without becoming mandatory.
- [ ] **SW-OBJ-005** Failure alters later geography, relationships, or capability.
- [ ] **SW-OBJ-006** The seed validator proves two viable openings and a recoverable
  path through required content.

---

## 14. PLEDGE: the tactical promise

PLEDGE is retained and promoted from an optional score overlay into STARWEFT's
clearest tactical contract. It is not the universal Act score and it is not a
separate mode. A Pledge is a deliberately hard, short promise made inside the
living world.

The current implementation already proves the useful core: selecting source,
cargo, destination, quantity, route, deadline, and optional risk constraints;
tracking TONNAGE and THREAD; and resolving deterministic delivery. That shipped
foundation is preserved. Its presentation, sourcing, consequences, and relation
to progression must be rebuilt.

### 14.1 Where a Pledge comes from

A Pledge is offered because the simulation has produced a legible need: a shortage,
forecast hazard, stranded population, contested corridor, diplomatic opening, or
time-sensitive construction. The player may also draft one from a selected place
or route. A generic global board may summarize known offers but cannot invent
placeless work.

The offer must answer:

- Who needs this and why now?
- What physical payload or operation would answer it?
- Where can that payload plausibly come from?
- What makes the obvious route difficult?
- What changes if the promise is kept, broken, or refused?

### 14.2 Preflight contract

Before acceptance, one compact panel shows all eight mandatory fields:

1. source and current stock;
2. cargo or operation;
3. destination and expressed need;
4. quantity or completion condition;
5. planned route and alternatives;
6. estimated arrival and slack;
7. known exposure, reserves, and contested segments;
8. stake: reward, failure consequence, and world effect.

Uncertainty is allowed, but it is labeled. "Unknown hazard" is fair information;
an undisclosed rule is not. The preview updates immediately while the player edits
the plan and names the first current bottleneck in plain language.

### 14.3 Keeping and breaking promises

Keeping a Pledge yields a world result first and a build/progression reward second.
Breaking one creates the promised local consequence and a remembered relationship;
it is not an automatic Thread death. Refusing an offer can also matter when the
need is urgent, but the UI distinguishes refusal from acceptance and betrayal.

If a later world event makes the accepted terms literally impossible through no
player choice, the player receives one explicit renegotiation window. They may:

- change source or route while preserving the promised effect;
- reduce scope and accept a named loss of standing;
- transfer the promise to an ally at a capability or Accord cost;
- break it deliberately and prepare mitigation.

Renegotiation is not a free reroll. Player-created shortages, reckless reserve
use, and ignored warnings remain the player's responsibility.

### 14.4 Pledge families

- **Relief:** urgent matter or people movement; tests staging and slack.
- **Industry:** repeated throughput or a construction chain; tests capacity.
- **Signal:** move knowledge intact through uncertainty; tests survey and secrecy.
- **Passage:** carry vulnerable or politically sensitive people; tests consent,
  safety, and diplomacy.
- **Screen:** keep a lane, convoy, or evacuation functional under opposition; tests
  preparation and recovery rather than kill count.
- **Deep cast:** a rare high-risk commitment across a frontier or Act boundary;
  tests the whole build and leaves a lasting landmark.

THREAD and TONNAGE remain satisfying measures of execution and personal record.
They may influence optional challenge ratings and Chronicle distinctions, but no
longer gate the canonical scale transitions by themselves.

### 14.5 PLEDGE ledger

- [x] **SW-PLG-001** Deterministic Pledge objects, cargo requirements, route
  constraints, deadlines, completion, and failure exist in the current build.
  Evidence: `js/pledges.js`, `js/game.js`, `js/ui_pledge.js`, smoke coverage.
- [x] **SW-PLG-002** THREAD and TONNAGE records exist.
  Evidence: Pledge state and HUD presentation in the current build.
- [ ] **SW-PLG-003** Every canonical offer is derived from a visible simulated
  need or a player-selected place.
- [ ] **SW-PLG-004** Preflight presents the eight mandatory fields in one compact
  decision surface.
- [ ] **SW-PLG-005** The preview names bottleneck, slack, reserve impact, and known
  uncertainty before acceptance.
- [ ] **SW-PLG-006** Completion changes the destination before granting abstract
  rewards.
- [ ] **SW-PLG-007** Failure applies the advertised local consequence without
  automatically ending the Thread.
- [ ] **SW-PLG-008** One costly renegotiation path handles world-created
  impossibility.
- [ ] **SW-PLG-009** All six Pledge families have authored examples and procedural
  validation.
- [ ] **SW-PLG-010** PLEDGE is integrated into objectives and is not a second Act
  scoring system.

---

## 15. Charters: one build language

STARWEFT currently spreads run identity across Founders, Origins, Aptitudes,
Boons, Commissions, perks, technology, and setup modifiers. The overhaul keeps
technology and world infrastructure where they are physically meaningful, but
collapses abstract run modifiers into one in-run draft language: **Charters**.

A Charter is a rule the crew chooses to operate by. It should alter decisions,
relationships, topology, or conversion—not quietly add five percent to a number.
The name is diegetic: the crew can point to the compact that justifies its unusual
practice.

### 15.1 Build structure

- Four active Charter slots form the normal build ceiling.
- A 1-of-3 draft appears at major Act transitions and rare discoveries.
- One reroll is available per Thread by default; a world effect may change it.
- A Charter may transform when a named world condition is met, but never through
  hidden experience points.
- Replacing a Charter is an explicit sacrifice; the previous Charter's created
  geography remains.

Each Thread draws from an 18-card active pool: eight universal, six aligned to the
chosen archetype, and four selected from current world pressures. The Chronicle
may unlock new *families* and variants, but the active pool never grows past 18.
Unlocking breadth therefore cannot dilute the probability of a coherent build.

### 15.2 Charter design rules

Every Charter must have:

- a player-visible trigger;
- a change to a real rule or conversion;
- at least one situation where it is not the best choice;
- a map, manifest, relationship, or timing consequence;
- a concise explanation that can be understood before selection;
- deterministic test coverage.

Forbidden designs include uncapped account multipliers, pure percentage bumps,
mandatory beginner traps, and effects whose only feedback is a floating number.

### 15.3 Initial Charter families and examples

**Manifest — what and how the crew carries**

- *Common Hold:* reserve one bay for emergency needs; unused space reduces Fray
  exposure, but commercial automation cannot claim it.
- *Living Cargo:* passengers contribute local knowledge and relationships during
  safe travel; dangerous shortcuts cause lasting grievance.
- *Break Bulk:* split one large Pledge across multiple ships without extra contract
  overhead, at the cost of more exposed segments.
- *Last Useful Thing:* when jettisoning cargo, convert one lost unit into immediate
  repair or relief at the current location.
- *Open Ledger:* nearby factions reveal real reserves and needs, but can see yours.

**Frontier — how uncertainty is crossed**

- *Breadcrumbs:* every first traversal leaves a weak return relay; maintaining many
  relays increases energy demand.
- *Quiet Wake:* unsurveyed travel creates less threat attention but yields less
  commercial data.
- *Plural Charts:* exchanging maps with a faction reveals conflicting risk models;
  choosing one improves that relationship and closes another opportunity.
- *Elastic Route:* one route may bend around a newly revealed hazard without
  breaking cadence, but its arrival estimate stays less precise.
- *Name the Dark:* a fully surveyed unknown can be marked as protected, exploited,
  or shared, changing later objectives.

**Infrastructure — how repetition becomes capacity**

- *Modular Berth:* the first repeated manual route can become a small depot instead
  of an automation rule.
- *Warm Start:* a repaired site resumes one former production recipe but inherits
  its historical dependency.
- *Mutual Spares:* connected stations share repair reserves; a cascade becomes
  possible if the shared floor is set too low.
- *Civil Standard:* construction is slower but successor crews and allied factions
  can operate it without conversion.
- *Tender Network:* support ships repair routes while carrying no saleable cargo.

**Accord — who may rely on whom**

- *Witnessed Terms:* negotiated obligations become visible to all signatories;
  betrayal costs more, but so does secret favoritism.
- *Reciprocal Passage:* receive access by granting equal access to one owned lane.
- *Hostage to Fortune:* lodge a specialist with a faction for a major concession;
  their safety becomes a future objective.
- *Small Table:* local communities can enter galaxy decisions without a major
  faction sponsor, adding negotiation complexity and alternative solutions.
- *Debt Jubilee:* erase one dependency and its claim, while losing the future
  leverage and production it enabled.

**Mending — how damage becomes a different future**

- *Scabwork:* restore a severed lane quickly with lower capacity and a permanent
  visible scar that can later be upgraded.
- *Salvage Rights:* recover more from wrecks only after resolving ownership.
- *Continuity Crew:* one specialist and their learned procedure pass to a successor;
  protecting them consumes evacuation capacity.
- *Gentle Failure:* the first missed deadline converts to a reduced-scope rescue
  rather than collapse, but grants no abstract reward.
- *Better Knot:* when two damaged networks are connected, both gain resilience only
  while neither is made subordinate.

These examples are direction, not entitlement. Each must survive prototype and
balance review before being checked complete.

### 15.4 Charter ledger

- [ ] **SW-BLD-001** Founder and Origin setup choices are replaced by five
  archetypes plus difficulty.
- [ ] **SW-BLD-002** Boons, Aptitudes, and abstract Commissions are migrated into
  Charters or retired.
- [ ] **SW-BLD-003** The canonical build has four visible Charter slots.
- [ ] **SW-BLD-004** Drafts use 1-of-3 selection with one default Thread reroll.
- [ ] **SW-BLD-005** Active pools contain exactly eight universal, six archetype,
  and four world-reactive Charters.
- [ ] **SW-BLD-006** Chronicle breadth cannot expand an active pool beyond 18.
- [ ] **SW-BLD-007** At least 30 tested Charters exist across all five families.
- [ ] **SW-BLD-008** Every Charter changes a rule, relationship, topology, or
  conversion and has an explicit downside or opportunity cost.
- [ ] **SW-BLD-009** Draft feedback shows immediate and projected world effects.
- [ ] **SW-BLD-010** Replaced Charters do not erase geography they created.

---

## 16. Fray: pressure with a face

The Fray is neither a random catastrophe dispenser nor a health bar pasted over
the galaxy. It is the setting's counterforce: neglected dependency, overextended
coordination, predatory adaptation, and severed meaning becoming active pressure.
The simulation chooses one dominant pressure at a time so the player can form an
intention.

### 16.1 Pressure cycle

1. **Quiet:** no active clock; the player can read and plan.
2. **Whisper:** evidence appears at specific places and the likely target is named.
3. **Tension:** the Fray commits resources or changes incentives; response options
   and an estimated impact window become visible.
4. **Hunger:** impact occurs through the simulated network if not prevented.
5. **Scar:** the world enters recovery with changed topology, people, or trust.

Pressure does not advance while the player is reading a modal, Charter draft,
Pledge preflight, Chronicle, or event choice. It begins or resumes when the player
returns to an informed, actionable state. Pause rules are identical across input
methods and are visible in the HUD.

### 16.2 What attracts pressure

The Fray reacts to comprehensible state: a single irreplaceable route, reserves
below declared floors, too many unsupported relays, concentrated political debt,
repeated extraction without repair, or a public high-value Pledge. It may exploit
a weakness the player chose, but cannot secretly scale to erase good preparation.

Rivals and factions are separate actors. They may exploit the same pressure,
compete for opportunities, or make local agreements with it, but they retain
motives other than "stop the player." Their actions obey travel time, information,
capacity, and relationships.

### 16.3 Counterplay

Every forecast impact supports at least three response classes:

- change topology: isolate, reroute, duplicate, open a bypass;
- change capacity: stage reserves, reinforce, evacuate, repair;
- change incentives or knowledge: negotiate, deceive, share, expose, concede;
- accept a controlled scar to protect something more important.

Destroying an attacker may be one response, never the only mandatory response.
The best outcome is often not zero damage but a network that fails gracefully.

### 16.4 Opposition ledger

- [ ] **SW-OPP-001** Fray uses the five-stage visible pressure cycle.
- [ ] **SW-OPP-002** At most one pressure is dominant; secondary pressures are
  summarized without competing alarm priority.
- [ ] **SW-OPP-003** Each pressure cites the player-visible state that attracted it.
- [ ] **SW-OPP-004** Menus, drafts, preflights, and narrative choices pause pressure.
- [ ] **SW-OPP-005** Every impact offers topology, capacity, and incentive/knowledge
  counterplay before resolution.
- [ ] **SW-OPP-006** Fray scaling is bounded and cannot invalidate sound preparation
  through hidden rubber-banding.
- [ ] **SW-OPP-007** Rivals obey the same travel, information, and capacity rules as
  comparable player operations.
- [ ] **SW-OPP-008** Every unresolved impact leaves a recoverable, visible scar.

---

## 17. Conflict is logistics under opposition

Combat must fit beside logistics without breaking the game's cadence or fiction.
There is no mandatory parallel tactical battle game. Conflict occurs on the same
map, over the same ticks, using ships, routes, reserves, information, and
relationships the player already understands.

The decisive questions are logistical: Did fuel and parts arrive? Was the convoy
spotted? Is there a safe retreat? Which route can be conceded? Can civilians be
moved before contact? Can the opponent be paid, divided, exposed, or given a less
costly objective?

### 17.1 Encounter sequence

1. **Contact forecast:** source, target, confidence, approach time, and likely
   objective appear on the map.
2. **Preparation:** stage supplies, survey, screen, reroute, evacuate, negotiate,
   or deliberately concede.
3. **Commitment:** both sides cross a visible point after which some cost is
   unavoidable.
4. **Resolution:** a short deterministic exchange runs on the strategic map. The
   player may issue limited logistics commands at readable decision windows.
5. **Aftermath:** wrecks, refugees, shortages, access, morale, grievances, and
   changed lanes remain in the simulation.

Resolution should normally consume less than fifteen percent of a Thread. A player
who prepared well is allowed to watch a short, satisfying execution; they are not
required to win an unrelated dexterity challenge.

### 17.2 Commands

All conflict commands operate on existing resources and geometry:

- **Hold:** spend reserves to protect a place or window.
- **Retreat:** preserve ships and people through a known exit at a named cost.
- **Reroute:** change the objective's path or abandon one segment.
- **Screen:** expose one asset to reduce exposure for another.
- **Jettison:** trade cargo or capability for speed, safety, repair, or bait.
- **Reinforce:** commit nearby capacity that can physically arrive in time.
- **Negotiate:** offer access, cargo, information, standing, or a joint objective.
- **Concede:** allow a bounded loss before it becomes a rout.

Orders have previews and can fail only for stated uncertainty or changed state.
There is no invisible accuracy roll deciding an otherwise deterministic encounter.
Seeded variance may choose among previewed outcome bands.

### 17.3 Force and restraint

Weapons, escorts, and defensive infrastructure exist. The Warden may specialize in
them. Their purpose is to shape safety, time, and access—not to turn STARWEFT into
a kill-count progression game. Destroyed ships mean lost people, cargo, capacity,
and future relationships. Surrender, rescue, and salvage remain meaningful after
violence.

Every mandatory threat has a nonviolent answer. Some optional objectives may ask
whether the player is willing to use force, but no faction is defined as a bag of
hit points and no extermination route is the optimal universal strategy.

### 17.4 Relationship to the existing combat system

The current combat simulation, quick-combat overlay, Loomship encounters, escort
ratings, and deterministic outcomes are prototype material—not protected product
shape. Reuse their tested math where it expresses supply and preparation. Retire or
replace any UI that teleports the player into a disconnected minigame, introduces
surprise fatality, or makes combat power a separate economy.

### 17.5 Conflict ledger

- [x] **SW-CMB-001** A deterministic seeded combat simulation and ship equipment
  foundation exist.
  Evidence: `js/combat.js`, `js/ships.js`, and current smoke coverage.
- [ ] **SW-CMB-002** Contact forecasts show target, confidence, arrival, intent,
  and likely outcome bands.
- [ ] **SW-CMB-003** Encounters use the five-stage strategic-map sequence.
- [ ] **SW-CMB-004** All eight logistics commands are implemented or explicitly
  combined without losing their response class.
- [ ] **SW-CMB-005** Fuel, parts, cargo, ships, information, and time account for at
  least 70% of modeled encounter advantage.
- [ ] **SW-CMB-006** Every mandatory threat has a viable nonviolent response.
- [ ] **SW-CMB-007** Surprise Loomship death without a prior actionable forecast is
  impossible.
- [ ] **SW-CMB-008** Resolution consumes less than 15% of median Thread time.
- [ ] **SW-CMB-009** Every resolved encounter leaves at least one persistent world
  consequence.
- [ ] **SW-CMB-010** Disconnected quick-combat UI is integrated into the strategic
  map or retired.

---

## 18. Simulation architecture: hot, warm, and cold

The fantasy of an increasingly vast living galaxy cannot be delivered by drawing
more dots while only the selected system exists. Nor can the browser simulate
every ship at full fidelity. STARWEFT therefore treats simulation fidelity as an
explicit, deterministic aperture.

### 18.1 Three fidelity bands

**Hot — the current aperture**

- the selected system or active conflict;
- individual ships, inventories, projects, events, and short route segments;
- full normal tick cadence and all player commands;
- detailed rendering and audio feedback.

**Warm — adjacent and causally relevant space**

- neighboring systems, active objectives, imminent arrivals, rivals, and threats;
- batched production and movement at a reduced cadence;
- named fleets, settlements, and dependencies remain discrete;
- enough detail to promote into Hot without inventing a different history.

**Cold — the rest of the known galaxy**

- aggregate stocks, population bands, influence, route throughput, risk, and
  unresolved needs;
- event-driven updates at large deterministic intervals;
- no simulated decorative traffic;
- conserved matter, time, and major actors across promotion and demotion.

The aperture is not a fog-of-war cheat. Information uncertainty and simulation
fidelity are separate state. The player may know a Cold region well, or enter a Hot
system with poor information.

### 18.2 Promotion and demotion

A region promotes when selected, approached, targeted by a near-term operation, or
required to resolve an active causal chain. Promotion materializes only state that
was already represented in the aggregate: cargo cannot appear, fleets cannot
teleport, and a faction cannot acquire a motive retroactively.

A region demotes after it is no longer selected and has no imminent high-fidelity
decision. Demotion conserves stocks, people, named assets, obligations, damage,
route reservations, and scheduled events. A deterministic round trip
Cold -> Warm -> Hot -> Cold must produce the same aggregate result as remaining
Cold within declared tolerance.

### 18.3 Interregnum simulation

Between Threads, the galaxy runs in Cold mode for a bounded, previewed interval.
The Interregnum advances unfinished crises, rivals, migration, recovery, and
political succession. It cannot erase all player work or freeze the world until a
new protagonist arrives. The player sees three to five headline changes before
choosing a successor and may inspect their causal trace.

### 18.4 Generation and validation

Generation is layered and seeded:

1. galaxy graph and regional pressures;
2. bubble identities, corridors, and faction distribution;
3. system economies, bodies, sites, and local needs;
4. opening archetype affordances and recovery routes;
5. objective and Pledge candidates derived from that state.

A validator rejects or repairs seeds that lack essential fuel loops, contain
unreachable mandatory nodes, provide only one response class, require knowledge
that cannot be acquired, or exceed stated travel/time budgets. Repair decisions
are deterministic and logged in developer diagnostics.

### 18.5 State boundaries

Persistent state is separated by lifetime rather than accumulated in one object:

```text
account
  settings, accessibility, Chronicle catalog, records
campaign
  seed, galaxy, Archive, capabilities, completed Threads, Summit state
thread
  protagonist, archetype, Charters, active objectives, Pledges, clock
act/aperture
  current scale, selection, hot entities, warm cache, transient presentation
```

Simulation state never stores DOM nodes, canvas objects, audio handles, formatted
HTML, or translated display strings. Presentation caches are reconstructible and
excluded from canonical saves.

### 18.6 Module direction

This is a refactor target, not an instruction to rewrite the whole game at once.
The classic-script, zero-build architecture remains valid while the overhaul is in
progress. Expected ownership after Gate 1:

- `game.js`: action boundary, orchestration, save/load, and tick pipeline;
- `campaign.js`: campaign, Interregnum, Archive, successor, and Summit lifecycle;
- `objectives.js`: needs, objective grammar, consequences, and validation;
- `charters.js`: pool construction, draft, slots, and rule hooks;
- `acts.js`: scale transitions and Act-specific clocks, not universal scoring;
- `galaxy.js`: generation, topology, and fidelity promotion/demotion;
- existing economy, ships, combat, rivals, factions/civics, scourge/Fray, events,
  story, and tutorial modules: headless domain logic;
- render, `ui*`, audio, boot, and main: presentation and browser orchestration.

New module names may change if a smaller boundary is demonstrably clearer. The
state lifetime and DOM boundary requirements may not.

### 18.7 Technical invariants

- All simulation is deterministic under a seed and serialized action sequence.
- Simulation modules run without `window`, `document`, canvas, storage, or audio.
- Mutations initiated by the player pass through `SW.game.actions.*`.
- Cross-module hooks are explicit registries, not load-order side effects hidden in
  presentation code.
- A new runtime script is added to `index.html`, `test/smoke.js`, and
  `test/browser_boot.js` in the same dependency order when it is headless-safe;
  browser-only scripts are added to the browser manifests only.
- Save migration is forward-only, idempotent, versioned, and covered by fixtures.
- Developer diagnostics never change seeded outcomes.

### 18.8 Performance budgets

On the supported reference desktop browser with a mature Galaxy state:

- normal simulation work averages under 4 ms per rendered frame;
- a Hot tick remains under 12 ms at the 95th percentile;
- a Cold batch remains under 20 ms and is amortized outside interaction frames;
- selection-to-lens feedback begins within 100 ms;
- opening a major drawer completes within 150 ms;
- promotion to Hot completes within 250 ms or presents a non-blocking transition;
- save serialization completes within 100 ms and may defer storage write;
- no five-second play interval contains an unexplained main-thread stall over
  100 ms.

Budgets are measured, not inferred from code size. Lower-end accessibility testing
may establish stricter content caps.

### 18.9 Simulation ledger

- [x] **SW-SIM-001** Hot, Warm, and Cold bands have explicit serializable schemas.
  Evidence: authoritative per-system records in `js/aperture.js`; aperture schema
  and round-trip smoke results: pass.
- [x] **SW-SIM-002** Promotion and demotion conserve stocks, people, assets,
  obligations, damage, and scheduled events. Evidence: Cold v1 admits only
  causally inert local economies, flushes pending ticks before promotion/save,
  and retains named assets/obligations in its aggregate; exact Full-vs-Cold
  promotion fixtures pass.
- [x] **SW-SIM-003** Fidelity and player knowledge are independent state.
  Evidence: physical aggregates and knowledge records are separate in
  `js/aperture.js`; knowledge-independence smoke result: pass.
- [ ] **SW-SIM-004** Interregnum runs the galaxy in bounded Cold simulation.
- [x] **SW-SIM-005** System, Bubble, and Galaxy generation share a layered seed.
  Evidence: named Galaxy, Bubble, System, objective, and runtime streams in
  `js/campaign.js`; generation phases in `js/galaxy.js` restore runtime RNG and
  persist deterministic start/end diagnostics; isolation smoke fixtures pass.
- [x] **SW-SIM-006** Seed validation rejects or deterministically repairs deadlocks,
  unreachable objectives, and single-solution mandatory states. Evidence:
  `js/objectives.js` evaluates actual target knowledge, owned hull capability,
  idle availability, current integral stock, free hold space, safe paths, route
  unlock/range/stops, real evacuation cohorts and havens, affordability,
  cooldowns, and travel/service deadlines; fixtures cover three
  feasible responses, zero capability, one response, missing knowledge,
  corrupted and forbidden targets, impossible time, unreachable targets, and
  deterministic opening repair.
- [x] **SW-SIM-007** Cold-to-Hot-to-Cold equivalence tests pass within documented
  tolerance. Evidence: `economy-cold-v1` defers real local work in bounded
  batches; a 500-tick run with repeated focus promotion matches the independent
  `compat-full` physical state exactly after materialization.
- [x] **SW-TECH-001** State is separated into account, campaign, Thread, and
  Act/aperture lifetimes. Evidence: `js/campaign.js`; closed-root and 100-tick
  serialization smoke results: pass.
- [x] **SW-TECH-002** All canonical simulation modules boot headlessly. Evidence:
  29-file headless manifest; 2026-07-17 smoke result: 161,468 checks/0 failures.
- [x] **SW-TECH-003** Player mutations are represented as serializable actions.
  Evidence: wrapped `SW.game.actions.*` log/replay boundary in `js/game.js`; failed,
  same-tick, mutable-argument, final-tail, and 2,005-action replay results: pass.
- [x] **SW-TECH-004** Runtime script manifests remain dependency-order identical.
  Evidence: manifests in `index.html` and both tests; automated parity smoke result:
  pass.
- [ ] **SW-TECH-005** Mature Galaxy performance meets all eight budgets.

---

## 19. Death, succession, Archive, and Chronicle

Permadeath is retained because consequence, adaptation, and authorship are core to
the game. It is not retained as a ritual deletion of everything the player learned
or built. STARWEFT distinguishes four outcomes:

- **crew loss:** named people, ships, and carried cargo are lost or stranded;
- **Thread death:** the protagonist can no longer continue, ending their run;
- **campaign failure:** the galaxy loses the capacity or consent to reach a Summit;
- **campaign completion:** the Summit resolves the galaxy's central question.

### 19.1 Thread death

Death is generated from simulation state and never from an untelegraphed modal.
After the final action resolves, the game pauses and presents:

1. what happened physically;
2. which prior warning and commitment led here;
3. what was permanently lost;
4. what remains in the galaxy;
5. what changes during the Interregnum;
6. what the successor can inherit or recover;
7. one primary **Continue the campaign** action and one quieter exit.

The debrief should take less than 30 seconds to understand and less than 90 seconds
for a first-time player with guidance enabled. It must never upsell meta currency
at the emotional peak.

### 19.2 The Campaign Archive

The Archive is campaign-scoped continuity, represented by places, relationships,
procedures, and recovered knowledge. It may preserve:

- a surveyed corridor or known hazard;
- one civil-standard facility or public reserve;
- an allied institution and the obligation attached to it;
- a specialist procedure carried by a successor;
- an unfinished objective, wreck, warning, or promise;
- Reach, Resilience, and Accord earned by completed Threads.

It does not grant raw health, damage, income, speed, or inventory multipliers. The
Archive can make the next Thread *different and more informed*, not simply
stronger. Archive capacity is bounded; preserving one fragile continuity may mean
allowing another to pass into history.

### 19.3 The Chronicle

The Chronicle is account-scoped memory across campaigns. It records:

- completed and failed campaigns as browsable tapestries;
- Threads, protagonists, archetypes, Charters, Pledges, scars, and epitaphs;
- discovered factions, secrets, endings, objective variants, and anomalies;
- records for THREAD, TONNAGE, rescued lives, mended routes, and chosen sacrifices;
- optional challenge modifiers, Charter variants, archetype sidegrades, cosmetic
  marks, and new world conditions.

Chronicle unlocks widen the possibility space. They do not add uncapped power.
The canonical difficulty remains beatable on a fresh profile, and a veteran profile
must remain within five percentage points of fresh-profile win rate after
controlling for player experience in structured balance tests.

Accessibility settings may reduce pressure, extend decision windows, or preserve
more information. These are explicit aids, not hidden meta progression, and never
require an unlock.

### 19.4 Epitaphs and continuity

An epitaph names a concrete act, a relationship, and what remains—not a procedural
score summary. Example structure:

> **Ilse Maro, who held the Narrows long enough for Kestrel's children to cross.**
> The relay still answers in her cadence. The eastern reserve is gone.

The successor enters a galaxy with that fact. Recovery may find a wreck, complete
an old promise, dispute the official account, or deliberately build elsewhere.

### 19.5 Continuity ledger

- [ ] **SW-DEATH-001** No Thread can end without an earlier actionable warning.
- [ ] **SW-DEATH-002** Death debrief presents cause, warning, commitment, loss,
  persistence, Interregnum, and inheritance in one sequence.
- [ ] **SW-DEATH-003** Continue the campaign is the primary post-death action.
- [ ] **SW-DEATH-004** Interregnum changes are causally inspectable.
- [ ] **SW-DEATH-005** Successors can interact with at least one physical remnant of
  every prior Thread.
- [ ] **SW-META-001** Archive is campaign-scoped and bounded.
- [ ] **SW-META-002** Archive entries are geography, relationships, procedures,
  knowledge, or campaign capabilities—not raw numeric power.
- [ ] **SW-META-003** Chronicle records complete campaign and Thread histories.
- [ ] **SW-META-004** Chronicle unlocks add breadth, sidegrades, challenge, or
  cosmetics only.
- [ ] **SW-META-005** Fresh-profile canonical completion remains possible and
  balance-tested.
- [ ] **SW-META-006** Accessibility aids are available without progression.

---

## 20. World and narrative bible

STARWEFT tells stories through routes, reserves, promises, scars, and the people
who rely on them. Narrative text names consequences the simulation can sustain; it
does not claim that a world starves while its stockpiles remain full.

### 20.1 The five breaths of history

1. **The Loom Epoch:** civilizations learned to weave stable routes, shared
   standards, and meaning across impossible distance.
2. **The Fray:** accumulated dependency, extraction, contradiction, and hostile
   adaptation began to travel along the same weave.
3. **The Sundering:** the Loomkeepers cut the largest connections to starve the
   Fray. They saved inhabited regions by isolating them and then disappeared into
   their own silence.
4. **The Long Slack:** systems survived locally. Knowledge narrowed. Some worlds
   learned dignity in independence; others slowly failed out of sight.
5. **The Waking:** old signals return. New crews can reconnect the galaxy, but
   every knot risks carrying both help and harm.

The Sundering was neither simple cowardice nor clean salvation. Reconnection is
not automatically good. The game's central question is: **what kind of connection
deserves to endure?**

### 20.2 WEFT-7

The canonical ship, WEFT-7, is a small working vessel inherited from an incomplete
continuity program. It is not a chosen-one battleship. Its significance comes from
the network it helps create and the promises made aboard it. "A better knot" means
a connection that distributes agency and can fail gracefully; it does not mean a
larger empire.

### 20.3 Recurring cast

- **Warden Ilse Maro** — she/her. A practical protector who distrusts elegant
  systems without evacuation plans. Warm, exact, capable of being wrong through
  overprotection.
- **Sable** — he/him. Broker, courier, and survivor of several incompatible public
  stories. Funny when tension needs air; never a vending machine with lore.
- **Director Voss of Helix** — they/them. Believes coordination requires standards,
  measurement, and enforceable obligation. Their competence and danger share a
  root.
- **Captain Reyes of the Mariners** — she/her. Defends mobile communities and the
  right to leave. Suspicious of infrastructure that quietly becomes a border.
- **The Quiet Intelligence** — it/its. A distributed remnant that communicates
  through omissions, timing, and altered routing advice. It is not omniscient and
  may be a continuity of institutions rather than one mind.
- **The Farspun** — they/them collectively unless an individual specifies
  otherwise. Descendants of a region that adapted to isolation and do not consent
  to being "restored" to somebody else's galaxy.
- **Successors** — player-named protagonists whose identities are shaped by what
  earlier Threads left, not by a fixed bloodline.

No recurring character exists only to deliver exposition, praise the player, or
embody a faction stereotype. They have resources, constraints, and the ability to
act offscreen through the same world rules.

### 20.4 Voice and form

The voice is quiet, concrete, dignified, and occasionally wry. It prefers the
specific object to the abstract moral: an empty berth, a repaired pump, six
minutes of fuel, a child's copied route chart. Textile language is a restrained
structural motif, not a pun in every sentence.

Use:

- short sentences at moments of pressure;
- names for people and places affected;
- one sensory or physical fact where it earns attention;
- ambiguity grounded in conflicting needs;
- choices that state an action and an intelligible cost.

Avoid:

- grimdark inevitability, cruelty as texture, and disposable civilians;
- saccharine reassurance or universal gratitude;
- encyclopedic exposition in dialogue;
- jokes that make suffering unreal;
- fake choices, vague portent, and text that merely restates a tooltip;
- more than 50 words for a routine event body or more than three normal choices.

Refrains may recur with changed meaning: "Mind the slack." "Nothing crosses
alone." "Leave enough for the return." "A route is a promise made physical."

### 20.5 Secrets and revelation

Secrets are discovered through contradictory records, route behavior, material
evidence, and relationships—not by filling a lore meter. The main concealed
questions include:

- whether the Loomkeepers caused, contained, or became part of the Fray;
- why WEFT-7's continuity record has been edited;
- whether the Quiet Intelligence is a survivor, protocol, coalition, or trap;
- which isolated regions asked not to be reconnected;
- what an intergalactic bridge necessarily carries in both directions.

No single playthrough reveals an authoritative encyclopedia answer. A campaign
can reach a justified belief and act on it; later conditions may complicate that
belief without declaring the player's earlier evidence meaningless.

### 20.6 Endings

Bridge, Carry, and Mend are families of material strategy, not morality buttons.
Each has faction, cost, consent, capability, and secret-dependent variants.
Endings show concrete afterlives across several scales and name unresolved costs.
The Chronicle records what the campaign believed and did, not a developer-issued
alignment grade.

### 20.7 Narrative ledger

- [ ] **SW-NAR-001** The five breaths of history are established through play.
- [ ] **SW-NAR-002** Reconnection is consistently framed as a consequential choice,
  not automatic conquest or virtue.
- [ ] **SW-NAR-003** All recurring cast obey simulation constraints and can act
  without the player.
- [ ] **SW-NAR-004** Routine events remain under 50 words with two or three
  mechanically distinct choices.
- [ ] **SW-NAR-005** Narrative consequences read from and write to world state.
- [ ] **SW-NAR-006** At least 30 state-aware epitaph structures exist without
  score-summary boilerplate.
- [ ] **SW-NAR-007** Secrets require evidence from at least two systems or actors.
- [ ] **SW-NAR-008** Bridge, Carry, and Mend each have materially distinct variants.
- [ ] **SW-NAR-009** A sensitivity and tonal review rejects cruelty-as-texture,
  flattening stereotypes, and nonconsensual "rescue" framing.

---

## 21. Interface and experience architecture

The interface must make a deep simulation feel direct. It does so through
progressive disclosure, spatial causality, and strong feedback—not by putting every
system on the first screen.

### 21.1 The four information layers

**Always visible**

- current Act/scale and primary objective;
- selected place or ship;
- one dominant pressure and its time window;
- protected reserves, urgent shortage, and active Pledge status;
- pause/time state and a compact command strip.

**On selection**

- the object lens: stock, need, production, relationships, risk, and next useful
  actions for the selected object;
- route preview and causal links to affected places;
- no unrelated global dashboard data.

**On demand**

- manifests and operations;
- routes and automation policies;
- technology and infrastructure;
- relationships, signals, Archive, and Chronicle;
- complete analytics and developer detail.

**After an outcome**

- arrival, failure, combat aftermath, Act transition, death, and campaign debrief;
- comparison between forecast and actual result;
- the persistent thing that changed.

### 21.2 The primary play surface

The map occupies the visual center at every scale. A narrow top spine communicates
objective, pressure, clock, and scale. A contextual bottom command strip contains
only actions possible for the current selection. One side lens explains the
selection; one operations drawer holds deeper logistics. Only one major drawer is
open by default, and all drawers begin closed on a new decision beat.

The map uses nested zoom with explicit transitions:

- System: bodies, sites, ships, and local routes;
- Bubble: systems, corridors, convoys, faction boundaries, and fronts;
- Galaxy: bubbles, arterial flows, regional pressures, and campaign capabilities.

Zoom never merely scales the same labels. Each level changes aggregation, command
scope, audio density, and the kind of decision foregrounded. The player can always
see where the current selection sits in the larger hierarchy.

### 21.3 Command feedback

Every command follows the same feedback grammar:

1. hover/focus previews route, cost, reserve impact, arrival, and consequence;
2. commit produces immediate tactile/audio acknowledgement;
3. the map shows physical movement or changed policy;
4. the destination answers on arrival;
5. important persistent change enters a short log and remains inspectable.

The game never relies on toast messages alone to explain a structural change.
Color, motion, sound, text, and shape reinforce rather than duplicate one another.

### 21.4 Scale and urgency limits

- No more than three items may demand urgent visual priority at once.
- The player reaches any urgent location in at most two interactions.
- Galaxy view exposes at most three strategic fronts simultaneously; others remain
  summarized as stable, watched, or dormant.
- A selected route names one bottleneck before listing secondary analysis.
- Resource abbreviations always expand on focus and never carry meaning by color
  alone.
- A first-time player can identify objective, bottleneck, and threat within five
  seconds at each scale.

### 21.5 Guided introduction

Guidance lives inside the canonical game, not in a simplified mode that disables
Acts, pressure, Pledges, or death. The first System uses staged disclosure:

1. move the view and select the nearby need;
2. perform one fully guided delivery;
3. see the destination respond;
4. repeat and automate a safe route;
5. inspect a warning and preserve a reserve;
6. accept or decline a contextual Pledge;
7. resolve a small disruption through rerouting;
8. choose the first Charter;
9. meet the Act transition criteria and understand what persists.

Guidance is signposting, forecast, and contextual explanation. It does not play the
game automatically. Returning players can suppress explanatory copy while keeping
objective and consequence signals.

### 21.6 Shipped F-track foundation

The existing contextual command strip, closed-by-default drawers, selection lens,
signal marks, orbital ring, edge compass, and map-first hierarchy are retained as
useful presentation foundations. Their code is not sacred; their product purpose
is. They must be re-evaluated against the three-scale interaction model rather than
left as a skin over the old sandbox.

### 21.7 Accessibility

Required from the first overhaul milestone:

- full keyboard navigation with visible focus and no keyboard traps;
- remappable gameplay commands and alternatives to hold/repeated input;
- UI scale and readable text at 200% without lost controls;
- high-contrast and color-vision-safe state encodings;
- reduced motion and reduced flash modes;
- independent music, ambience, UI, warning, and voice/text cue volume;
- captions or text equivalents for all gameplay-relevant sound;
- pause while reading, adjustable pressure rate, extended forecast windows, and an
  optional confirmation for irreversible actions;
- screen-reader names for controls and text equivalents for essential canvas state;
- plain-language glossary and persistent tutorial recall.

### 21.8 UI ledger

- [x] **SW-UI-001** Contextual command strip, drawers, selection lens, signal marks,
  orbital ring, and edge compass exist in the current build.
  Evidence: render and UI modules plus browser boot coverage.
- [x] **SW-UI-002** Start-to-control flow is archetype, difficulty, Launch.
  Evidence: canonical title browser fixture and the 15-recipe launch matrix.
- [ ] **SW-UI-003** System, Bubble, and Galaxy have distinct information and command
  grammars.
- [ ] **SW-UI-004** Always-visible HUD is limited to objective, selection, dominant
  pressure, reserves/shortage, Pledge, scale, and time.
- [ ] **SW-UI-005** Selection lens names the next useful actions and causal links.
- [ ] **SW-UI-006** All commands implement the five-stage feedback grammar.
- [ ] **SW-UI-007** No more than three urgent priorities or strategic fronts compete.
- [x] **SW-UI-008** Canonical tutorial teaches all nine staged-disclosure beats.
  Evidence: the 13-beat action-driven Act 0 fixture covers delivery, response,
  Pledge, automation, reserve, pressure, reroute, Charter, and transition.
- [x] **SW-UI-009** First-time guidance can be reduced without disabling mechanics.
  Evidence: full/brief guidance changes explanatory copy only; skip converges on
  the same declared Act I capability floor.
- [ ] **SW-ACC-001** Keyboard-only canonical play is complete.
- [ ] **SW-ACC-002** UI remains complete at 200% scale.
- [ ] **SW-ACC-003** Essential state never depends on color, motion, or audio alone.
- [ ] **SW-ACC-004** Reduced motion, pressure adjustment, extended forecasts, and
  irreversible-action confirmation are available without unlocks.
- [x] **SW-ACC-005** Canvas information has accessible text equivalents. Evidence:
  the canvas has an accessible name; objective, current selection, craft state,
  and signal counts are mirrored into `#mapA11y`, with Search and Journal paths.

---

## 22. Visual, audio, and tactile direction

STARWEFT should feel like an instrument panel woven into a night sky: restrained,
precise, and alive when the player changes something. The presentation serves
causality before spectacle.

### 22.1 Visual language

- near-monochrome structural field and readable neutral text;
- one player/accent hue for intent and active selection;
- red reserved for immediate harm or irreversible loss;
- green for fulfilled flow and safe arrival, orange for conditional bargains and
  capacity warnings;
- line weight, shape, pulse rhythm, and texture reinforce every status color;
- textile motifs appear in route topology and transitions, not as ornamental noise;
- portraits and event art remain sparse, high-contrast, and tied to named actors.

System space feels local and mechanical: orbits, transfer arcs, inventories, engine
hum. Bubble space feels navigational and social: corridors, convoys, boundaries,
signals. Galaxy space feels strategic and historical: arterial lines, regional
breathing, scars, and large silences. Transition animation must help the player
understand aggregation and complete within the interaction budget.

### 22.2 Feedback hierarchy

1. **Intent:** quiet hover/focus and route preview.
2. **Commit:** crisp click, line draw, launch pulse, or policy lock.
3. **Progress:** low-amplitude motion and sound that can be ignored safely.
4. **Arrival:** destination-centered response, not merely origin celebration.
5. **Consequence:** persistent map/state change with a distinct but restrained mark.
6. **Threat:** directional, classifiable warning whose rhythm encodes time remaining.

Routine production never competes audiovisually with a death warning. Multiple
successes aggregate instead of producing feedback soup.

### 22.3 Audio

The score is state-driven and generative within bounded authored material. Layers
correspond to scale, pressure, connection density, and current human stakes; they
do not simply accelerate with score. Routes add quiet motifs when established,
scarred routes detune or interrupt them, and a repaired network may resolve a
motif without becoming triumphalist.

Every gameplay cue has a visual/text equivalent. Warning families use distinct
rhythm and register, respect user volume categories, and never rely on startle.
Silence is a designed state, especially during the Long Slack and after loss.

### 22.4 Presentation ledger

- [ ] **SW-PRES-001** Color roles and redundant shape/texture encodings are applied
  consistently across all scales.
- [ ] **SW-PRES-002** System, Bubble, and Galaxy have distinct visual density,
  aggregation, motion, and audio layers.
- [ ] **SW-PRES-003** Scale transitions explain aggregation and meet the interaction
  budget.
- [ ] **SW-PRES-004** All commands and outcomes follow the six-level feedback
  hierarchy.
- [ ] **SW-PRES-005** Routine events aggregate so they cannot mask threat or loss.
- [ ] **SW-PRES-006** Dynamic music reads only deterministic game state and respects
  accessibility settings.
- [ ] **SW-PRES-007** All gameplay-relevant sound has a simultaneous non-audio cue.

---

## 23. Content architecture and launch targets

Systems become a complete game only when authored content exercises their
interactions. Content is built as composable state, objective, actor, and outcome
parts—not a collection of isolated pop-ups.

### 23.1 Minimum complete-game matrix

| Content | Minimum for overhaul completion | Diversity requirement |
|---|---:|---|
| Archetypes | 5 | each supports logistics, diplomacy, pressure, and recovery |
| Charters | 30 | 5 families; at least 5 meaningful picks per archetype |
| System openings | 6 | no opening exceeds 25% of validated seeds |
| Bubble identities | 6 | distinct topology, economy, faction tension, and hazard |
| Galaxy structures | 4 | different arterial geometry and campaign dilemma |
| System objectives | 12 authored templates | all 10 objective families represented |
| Bubble objectives | 8 authored templates | at least 3 response classes each |
| Galaxy objectives | 6 authored templates | at least 2 prior-system consequences each |
| Pledges | 18 authored frames | all 6 Pledge families represented |
| Fray pressures | 5 families | each targets a different network weakness |
| Rival doctrines | 5 | one cannot be a simple combat reskin of another |
| Factions | 6 major, 12 local cultures | no universal attitude or single-resource identity |
| Named recurring actors | 6+ | motives, resources, constraints, and offscreen action |
| Summit variants | 3 foundations, 9 condition variants | Bridge, Carry, Mend materially diverge |
| Epitaph structures | 30 | grounded in at least 3 distinct state inputs |
| Campaign secrets | 5 question families | evidence crosses systems and actors |
| Tutorial states | 9 beats | includes recovery, Pledge, Charter, and transition |

These are minimums, not a mandate to ship filler. A smaller set of interacting,
state-aware content is better than hundreds of generic events. If a target cannot
meet its diversity requirement, its checkbox remains open.

### 23.2 Content schema

Every generated objective or event declares:

- eligibility: the real world state that permits it;
- speaker/source and affected place;
- information state and any explicit uncertainty;
- options expressed as actions through existing systems;
- costs, reservations, arrival/resolve timing, and pressure interactions;
- immediate result and persistent consequence;
- archetype and Charter affordances without archetype locks;
- failure, refusal, expiry, and successor variants;
- accessibility-safe concise copy;
- validator invariants and deterministic test seed.

Copy and numbers do not silently override domain rules. If an event offers cargo,
access, damage, repair, reputation, or route change, it invokes the same action or
domain function as the normal interface.

### 23.3 Procedural diversity rules

- No objective template accounts for more than 30% of offers in a scale.
- The same named actor does not issue two unrelated urgent requests at once.
- A seed cannot select two openings whose only distinction is commodity name.
- At least 40% of campaign objectives must reference a consequence created earlier
  in that campaign.
- At least one offered solution to a late objective must use infrastructure,
  relationship, or knowledge built in a prior Act.
- Repeated content acknowledges repetition or changes context; it never pretends to
  be a first meeting twice.
- Content selection is seeded and records why candidates were accepted or rejected
  in developer diagnostics.

### 23.4 Content ledger

- [ ] **SW-CONT-001** The complete-game matrix meets every minimum and diversity
  requirement.
- [ ] **SW-CONT-002** All objective and event content uses the declared schema.
- [ ] **SW-CONT-003** Content consequences invoke shared domain actions.
- [ ] **SW-CONT-004** No objective template exceeds 30% of offers at its scale across
  the balance seed corpus.
- [ ] **SW-CONT-005** At least 40% of campaign objectives incorporate prior campaign
  consequences.
- [ ] **SW-CONT-006** Repeated actors and events are continuity-aware.
- [ ] **SW-CONT-007** Content eligibility and selection are deterministic and
  diagnostically explainable.

---

## 24. Saves, migration, and recovery

The overhaul changes state shape radically, but it must not casually destroy a
player's existing save. All stored data is treated as user data.

### 24.1 Save model

The browser stores independent versioned records for:

- account settings and accessibility;
- Chronicle and unlock breadth;
- each campaign index/summary;
- one canonical autosave per campaign plus bounded transition checkpoints;
- optional manual/exported snapshots;
- legacy pre-overhaul save payload until the player explicitly removes it.

Canonical autosave occurs after resolved actions and at Act, Thread, Interregnum,
and Summit transitions. It never captures half-applied movement or an open modal.
Writes use a temporary record and verification before replacing the last known-good
record.

### 24.2 Migration policy

Migration is version-by-version, forward-only, idempotent, and pure: given the same
old payload it produces the same new payload without reading live time or random
state. Each migration has a fixture for minimum, mature, unusual, and corrupted
input.

Because the old endless/sandbox state has no honest one-to-one mapping to a
campaign, it is not silently converted into a canonical Thread. The first overhaul
boot must:

1. detect and preserve the old payload unchanged;
2. explain that canonical campaigns use a new structure;
3. offer **Begin the new campaign** as the primary action;
4. offer **Open legacy weave** as a clearly labeled compatibility path if the
   compatibility adapter is still supported;
5. offer a JSON export before any legacy retirement.

If legacy play cannot be safely maintained, it may become read-only Chronicle-style
inspection rather than blocking the overhaul. Removal requires a later explicit
product decision and export path.

### 24.3 Recovery

- Load failures fall back to the last verified checkpoint without overwriting the
  failed payload.
- The error surface names the affected campaign and offers export, retry, previous
  checkpoint, new campaign, and diagnostics.
- Import validates schema, size, IDs, numeric bounds, and references before write.
- Saves never execute code or inject HTML.
- Developer repair tools operate on a copy and emit an audit summary.
- No migration or repair changes the deterministic seed/action history silently.

### 24.4 Save ledger

- [ ] **SW-SAVE-001** Account, Chronicle, campaigns, autosaves, checkpoints, and
  legacy payloads are independent versioned records.
- [ ] **SW-SAVE-002** Saves occur only after atomic resolved state.
- [ ] **SW-SAVE-003** Writes verify a temporary record before replacing known-good
  data.
- [ ] **SW-SAVE-004** Every migration is pure, forward-only, idempotent, and fixture
  tested.
- [ ] **SW-SAVE-005** Pre-overhaul data is preserved and exportable.
- [ ] **SW-SAVE-006** Legacy weave is labeled compatibility, never the canonical
  launch default.
- [ ] **SW-SAVE-007** Corruption recovery never overwrites the failed payload.
- [ ] **SW-SAVE-008** Imports are schema- and reference-validated and cannot execute
  content.

---

## 25. Verification and playtest contract

Automated tests establish determinism, invariants, boot safety, migrations, and UI
structure. They cannot establish whether a run is legible, tense, or worth
repeating. Every Gate therefore has both machine checks and observed-play criteria.

### 25.1 Required automated checks

The two repository suites are always mandatory:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'test\smoke.js'
& 'C:\Program Files\nodejs\node.exe' 'test\browser_boot.js'
```

The suite must grow to cover:

- identical seeded state from identical serialized actions;
- tick pipeline order and action ownership;
- resource, population, and reservation conservation;
- objective eligibility, solution classes, and consequences;
- Pledge previews, deadlines, renegotiation, and failure;
- Charter pool size, coherence, hooks, transforms, and replacement;
- Fray forecasting, pause rules, bounded scaling, and scars;
- encounter forecast-to-outcome bands and nonviolent resolutions;
- Hot/Warm/Cold promotion, demotion, equivalence, and performance;
- Act, Thread, campaign, Archive, Chronicle, and Summit lifecycle;
- save round trip, all migrations, corruption, import, and legacy preservation;
- keyboard/focus flows and required accessible names;
- documentation authority, stable IDs, links, and no retired references.

Browser boot remains a structural DOM harness, not a substitute for testing in a
real browser. Milestone verification includes current Chrome, Firefox, and Edge at
minimum, plus keyboard-only and reduced-motion runs.

### 25.2 Instrumentation principles

Development builds may record local, anonymized playtest events with a visible
opt-in export. No remote telemetry is required by this specification. Metrics must
include context such as seed, archetype, difficulty, Act, objective family, and
guidance setting without recording player-authored names by default.

Quantitative targets diagnose behavior; they do not authorize optimizing away
meaningful minority strategies. Every dashboard result is paired with session
notes or replay/action-log inspection.

### 25.3 Onboarding targets

Measured with first-time players on canonical difficulty and guidance enabled:

- launch selection to controllable ship: under 25 seconds median;
- first meaningful action: under 45 seconds median;
- first completed delivery: under 2 minutes median;
- first contextual Pledge accepted or deliberately declined: under 4 minutes;
- first accepted Pledge completed: under 7 minutes median;
- first safe automation: under 10 minutes median;
- at least 80% complete Act I/System without external help;
- at least 70% can explain what a Pledge promises and what its slack means;
- at least 70% can identify objective, bottleneck, and dominant pressure after five
  seconds on the System screen.

### 25.4 Thread pacing targets

- completed canonical Thread median: 65-80 minutes;
- 90th percentile completed Thread: under 90 minutes;
- Act I: approximately 12 minutes, Act II: 22-28, Act III: 28-35;
- no involuntary watch-only interval over 90 seconds;
- Act transition decision-to-control: under 45 seconds;
- experienced-player death-to-successor-control: under 30 seconds;
- first-time death-to-successor-control with guidance: under 90 seconds;
- at least one material route, objective, relationship, or Charter decision every
  two minutes outside intentional pause.

These targets include reading at normal pace. They must not be met by making text
illegibly terse or running clocks while the player reads.

### 25.5 Pledge and fairness targets

- 10-20% accepted Pledge failure rate on canonical difficulty after onboarding;
- at least 80% of failures trace to a preventable or deliberately accepted risk;
- at least 90% of impending failures receive an actionable warning;
- 25-40% of completions arrive with low but positive slack;
- no Pledge family exceeds 30% of accepted offers;
- at least 70% of players can explain the destination's world change after
  completion;
- world-created literal impossibility without renegotiation: zero instances.

### 25.6 Automation and attention targets

- manual dispatches exceed 70% of movements in early Act I and fall below 30% in
  late Act III;
- automation handles at least 60% of mature network movements;
- the player changes, suspends, or deliberately confirms an automation policy at
  least once per two active minutes in mature pressure states;
- watch-only time remains under 15% of active Thread time;
- no more than three urgent signals appear concurrently;
- at least 85% of players identify objective, bottleneck, and pressure within five
  seconds at every scale;
- any urgent signal is reachable in at most two interactions.

### 25.7 Build and archetype targets

- archetype completion rates stay within eight percentage points after skill
  normalization;
- no single Charter package appears in more than 40% of successful Threads;
- at least 60% of players can describe their build as a rule or strategy rather
  than a list of bonuses;
- each archetype supplies at least 15% and at most 30% of canonical starts in
  unconstrained preference tests;
- every archetype completes every mandatory objective family in the seed corpus;
- unlocking Chronicle breadth changes controlled win rate by no more than five
  percentage points.

### 25.8 Conflict targets

- at least 70% of encounter advantage is attributable to visible pre-contact
  logistics and relationships;
- every mandatory encounter offers at least three response classes, including one
  nonviolent route;
- no response class accounts for more than 60% of successful resolutions;
- surprise fatal Loomship outcomes after no actionable warning: zero;
- conflict resolution occupies less than 15% of Thread time;
- at least 60% of encounters leave a persistent consequence the player can name;
- at least 75% of players can explain why the forecast differed from the outcome.

### 25.9 Scale and campaign targets

- players correctly identify System, Bubble, and Galaxy objective type in 85% of
  five-second comprehension tests;
- Galaxy view presents at most three simultaneous fronts;
- Summit becomes available after two to four completed Threads, not through
  deliberate death farming;
- each completed Thread contributes at least one campaign capability and one
  inspectable scar or continuity;
- campaign failure and completion both produce coherent Chronicle records;
- at least 70% of Summit testers can trace one finale option to a choice made in a
  prior Thread.

### 25.10 Exit criteria for any checked requirement

A requirement may be checked only when:

1. the implementation exists in the canonical path;
2. deterministic automated tests cover its invariants where applicable;
3. browser/interaction verification covers its presentation where applicable;
4. its named playtest or performance target is met, or the requirement records a
   ratified replacement target;
5. the checkbox has an Evidence note naming source, test, and result artifact;
6. no known critical defect contradicts the claim.

### 25.11 Verification ledger

- [x] **SW-TEST-001** Headless smoke and structural browser boot suites exist and
  pass on the consolidated overhaul baseline.
  Evidence: 2026-07-17 Gate 1 run: smoke 161,468 checks/0 failures; browser boot
  passed every step including v2 preservation, corruption recovery, staged
  write interruption, and transaction-routing validation.
- [ ] **SW-TEST-002** Simulation determinism and conservation are covered at all
  three fidelity bands.
- [ ] **SW-TEST-003** Lifecycle and migration fixtures cover account through Summit.
- [ ] **SW-TEST-004** Real-browser matrix covers Chrome, Firefox, and Edge.
- [ ] **SW-TEST-005** Keyboard, 200% UI, reduced motion, and non-audio cue checks are
  part of every release gate.
- [ ] **SW-TEST-006** Local playtest event export exists with privacy-safe defaults.
- [ ] **SW-TEST-007** All onboarding, pacing, Pledge, automation, build, conflict,
  scale, and campaign target dashboards exist.
- [ ] **SW-TEST-008** Checked requirements satisfy all six exit criteria.

---

## 26. Overhaul delivery roadmap

The overhaul is a sequence of playable vertical gates, not a promise to build all
backend systems and discover the game later. Each gate leaves the canonical path
more coherent than it found it. A gate closes only when its acceptance criteria are
checked here with evidence.

### Gate 0 — Authority and safe ground

**Purpose:** make one contract, preserve research/history, and remove stale
instructions before radical implementation begins.

- [x] **G0-01** `SPEC.md` is the sole product contract and contains the complete
  overhaul, progress ledger, roadmap, research basis, and absorbed world bible.
  Evidence: this document, sections 0-28 and appendices A-B.
- [x] **G0-02** `CLAUDE.md` is the sole engineering/deployment authority and matches
  the actual runtime and tests.
  Evidence: runtime manifest, tick pipeline, verification, workflow, and deployment
  sections cross-checked against the live tree.
- [x] **G0-03** `AGENTS.md` and `README.md` point to the two authorities without
  duplicating volatile instructions.
  Evidence: root documentation set and documentation-integrity smoke assertions.
- [x] **G0-04** The research corpus is preserved under
  `research/sources/roguelike/` with a non-authoritative index.
  Evidence: seven tracked sources plus `research/README.md`; checkpoint commit
  `b2b3463` and tag `pre-overhaul-2026-07-17`.
- [x] **G0-05** `REWEAVE.md`, `LOOM.md`, `DESIGN.md`, old reviews, roadmaps,
  decision/deployment copies, and obsolete research synthesis are removed from the
  live tree after Git checkpoint.
  Evidence: retired files absent from the live tree and recoverable from Git history.
- [x] **G0-06** Source and test comments use stable SPEC IDs rather than section
  numbers or retired document names.
  Evidence: `SPEC[...]` references in simulation, presentation, styles, and tests;
  appendix A supplies stable anchors.
- [x] **G0-07** Automated documentation integrity detects duplicate authorities,
  broken active-doc links, and retired references.
  Evidence: documentation authority section in `test/smoke.js`.
- [x] **G0-08** Both mandatory test suites pass after consolidation.
  Evidence: 2026-07-17 consolidation run: smoke 161,248 checks/0 failures; browser
  boot passed every step.

**Gate 0 exit:** a new contributor can identify current truth in under one minute;
no live file sends them to a retired authority.

### Gate 1 — State lifetimes and simulation aperture

**Purpose:** create the technical space for Threads, campaigns, and real scale
before adding more surface UI.

- [x] **G1-01** Account, campaign, Thread, and Act/aperture schemas are explicit and
  versioned. Evidence: `js/campaign.js`; closed-root, ownership, account-isolation,
  and 100-tick round-trip smoke results: pass.
- [x] **G1-02** Action log replay reproduces identical seeded state. Evidence:
  `js/game.js`; complete launch/action/final-tail replay and 2,005-entry log smoke
  results: pass.
- [x] **G1-03** Hot, Warm, and Cold schemas plus promotion/demotion exist. Evidence:
  `js/aperture.js`; causal classifier, selection, obligation, and demotion smoke
  results pass; `economy-cold-v1` is the default reduced-work engine and
  `compat-full` remains the independent equivalence baseline.
- [x] **G1-04** Cold/Hot equivalence and conservation tests pass. Evidence:
  `economy-cold-v1` batches only isolated local economies, materializes before
  observation, and matches Full simulation exactly across 500 ticks and repeated
  promotion/demotion.
- [x] **G1-05** Layered seed generator and deadlock/solution validator exist.
  Evidence: named physical/objective/runtime streams restore runtime RNG; the
  validator uses target-specific owned capability, knowledge, access, cost, and
  deadline probes and deterministically repairs the authored opening envelope.
- [x] **G1-06** Objective, Charter, and campaign module boundaries are established.
  Evidence: `js/objectives.js`, `js/charters.js`, `js/campaign.js`; headless boot,
  schema validation, and manifest-parity smoke results: pass.
- [x] **G1-07** Legacy saves are preserved and migration/recovery fixtures pass.
  Evidence: raw v2 bytes and explicit adapter continuation remain separate;
  pre-layer v3 checkpoints preserve physical state while disabling false replay;
  campaign/account corruption recover their previous verified generations; the
  staged write-ahead transaction survives injected campaign, index, account,
  manifest, cleanup, and previous-generation failures; exact key binding rejects
  cross-campaign routing, and corrupt manifests fail closed even on a first slot
  with no previous generation.
- [ ] **G1-08** System-scale baseline remains playable and meets tick budgets.
  The system-scale browser flow passes and Node timings provide a regression
  baseline for the real Cold engine, but completion requires reference-browser
  performance evidence. The 2026-07-17 in-app browser attempt found no available
  browser backend, so this item remains deliberately open.

**Gate 1 exit (open on G1-08 only):** an existing run serializes into the new
Thread lifetime, demotes to genuinely reduced Cold campaign state, promotes, and
resumes without causal drift. Reference-browser budget evidence remains required.

### Gate 2 — The front door and canonical tutorial

**Purpose:** replace the option wall and establish the true game in its first ten
minutes.

- [x] **G2-01** Start flow is Continue/New -> five archetypes -> difficulty ->
  Launch. Evidence: `js/ui_modals.js`, `js/ui.js`, and browser front-door coverage.
- [x] **G2-02** Advanced and Custom options are absent from the primary flow and
  preserve seed sharing. Evidence: canonical and Custom renderers are separate;
  seed is secondary disclosure and part of the serialized launch recipe.
- [x] **G2-03** Act 0 guidance runs inside the canonical rules. Evidence: canonical
  Threads enter real Act index 0 with a suspended clock, live Fray configuration,
  real stocks/craft/actions, and deterministic replay.
- [x] **G2-04** Guided delivery, arrival feedback, automation, reserve, pressure,
  Pledge, reroute, Charter, and Act transition are all taught. Evidence: the full
  Cartographer Wake fixture performs each beat through `SW.game.actions.*` and
  reaches the declared Act I projection with exact replay.
- [x] **G2-05** Returning players can reduce copy without disabling systems.
  Evidence: brief guidance preserves every objective and action; the explicit
  opening skip grants the same documented Act I capability floor.
- [ ] **G2-06** Keyboard, focus, 200% scale, reduced motion, and non-audio cues pass.
  Partial evidence (2026-07-18): semantic radio groups, arrow navigation, focus
  trap/restore, modal pause leases, visible focus, 100-200% UI scale, high contrast,
  reduced camera/CSS motion, sound captions, canvas text, and structural browser
  fixtures pass. Completion still requires a real reference-browser keyboard and
  200% visual run; the configured in-app browser backend remains unavailable.
- [ ] **G2-07** Onboarding targets in section 25.3 pass.
  Requires observed first-time-player sessions; automated fixtures cannot close it.

**Gate 2 exit (open on G2-06 and G2-07 only):** the implementation and automated
  contracts are complete. 2026-07-18 verification: smoke 161,553 checks/0 failures;
browser boot passed. Exit still requires reference-browser accessibility evidence
and observed unbriefed-player onboarding evidence: launch under 25 seconds, a
meaningful delivery under two minutes, and correct explanation of the next objective.

### Gate 3 — One run spine: objective, PLEDGE, and Charters

**Purpose:** turn the old sandbox/overlay stack into one escalating roguelike run.

- [ ] **G3-01** World-state objectives replace placeless global progression.
- [ ] **G3-02** PLEDGE uses contextual offers, eight-field preflight, world-first
  consequences, and costly renegotiation.
- [ ] **G3-03** Act progression no longer uses a universal Pledge score.
- [ ] **G3-04** Founder, Origin, Aptitude, Boon, and abstract Commission overlap is
  removed from canonical play.
- [ ] **G3-05** Four-slot Charter build, 18-card active pool, drafts, and reroll are
  playable.
- [ ] **G3-06** At least 15 production-quality Charters demonstrate all five
  families and transformation-quality interactions.
- [ ] **G3-07** Act I cannot be a complete canonical win; early withdrawal is
  clearly distinct from completion.
- [ ] **G3-08** Objective/Pledge/build targets pass across the seed corpus.

**Gate 3 exit:** a complete Act I has a clear objective, one contextual promise,
an emerging build, pressure, a consequential transition, and no duplicate setup
systems.

### Gate 4 — System as a complete first Act

**Purpose:** perfect the local loop before multiplying scale.

- [ ] **G4-01** Six validated System openings meet diversity limits.
- [ ] **G4-02** Body/site needs, production, deliveries, and physical consequences
  form the core loop.
- [ ] **G4-03** Four-stage automation is inspectable and reserve-safe.
- [ ] **G4-04** Fray pressure cycle and at least two pressure families operate at
  System scale.
- [ ] **G4-05** At least one rival and two factions act through the same local rules.
- [ ] **G4-06** Act I transition requires a durable local network and chosen outward
  consequence.
- [ ] **G4-07** System UI identifies objective, bottleneck, and threat within five
  seconds.
- [ ] **G4-08** Act I pacing and attention targets pass.

**Gate 4 exit:** Act I alone is a satisfying 10-15 minute roguelike opening whose
solutions visibly become the Bubble's starting conditions.

### Gate 5 — Bubble, living opposition, and conflict

**Purpose:** make scale change the decision rather than only the camera.

- [ ] **G5-01** Bubble view aggregates systems into corridors, convoys, politics,
  and regional dependencies.
- [ ] **G5-02** At least six Bubble identities and eight objective templates meet
  the content schema.
- [ ] **G5-03** Warm simulation supports adjacent systems, rivals, and active chains.
- [ ] **G5-04** Fray and rivals attack visible network weaknesses without hidden
  scaling.
- [ ] **G5-05** Contact forecast, preparation, commitment, resolution, and aftermath
  replace disconnected mandatory quick combat.
- [ ] **G5-06** Eight logistics conflict commands and nonviolent response classes
  are available.
- [ ] **G5-07** Conflict and Bubble UI targets pass.
- [ ] **G5-08** Act II transition requires a durable corridor and regional choice.

**Gate 5 exit:** the player manages a living Bubble for roughly 25 minutes, handles
opposition through the logistics game, and enters Galaxy play with visible allies,
liabilities, and scars.

### Gate 6 — Galaxy as playable strategy

**Purpose:** implement the ambition the earlier Reweave left decorative.

- [ ] **G6-01** Galaxy graph contains at least four validated structural families.
- [ ] **G6-02** Cold simulation evolves all known regions with conserved causality.
- [ ] **G6-03** Galaxy view exposes arterial flows, three fronts maximum, and causal
  drill-down.
- [ ] **G6-04** Six Galaxy objective templates incorporate prior Act consequences.
- [ ] **G6-05** Factions, Fray, rivals, migration, and recovery act regionally.
- [ ] **G6-06** Archive candidates emerge from actual Thread history.
- [ ] **G6-07** Reach, Resilience, and Accord results are earned through material
  Galaxy operations.
- [ ] **G6-08** Full Thread median and p90 pacing targets pass.

**Gate 6 exit:** a canonical Thread crosses System, Bubble, and Galaxy and ends in
a materially authored campaign contribution within 65-90 minutes.

### Gate 7 — Permadeath with a larger-scale consequence

**Purpose:** make death emotionally sharp without resetting the campaign fiction.

- [ ] **G7-01** Thread death debrief meets the seven-field information contract.
- [ ] **G7-02** Interregnum advances the Cold galaxy and explains three to five
  changes.
- [ ] **G7-03** Successor selection returns experienced players to control within 30
  seconds.
- [ ] **G7-04** Campaign Archive preserves bounded geography, knowledge,
  relationships, procedures, and capabilities.
- [ ] **G7-05** Every old Thread leaves at least one inspectable physical remnant.
- [ ] **G7-06** Chronicle records campaigns, Threads, scars, promises, secrets, and
  epitaphs.
- [ ] **G7-07** Unlocks remain breadth-only and pass the five-point win-rate bound.
- [ ] **G7-08** Death cannot improve optimal progression through deliberate farming.

**Gate 7 exit:** loss creates grief, adaptation, and a changed galaxy; continuing a
campaign is more compelling than restarting for a cleaner opening.

### Gate 8 — Intergalactic Summit

**Purpose:** pay off several Threads with a bounded finale that uses the whole
campaign.

- [ ] **G8-01** Summit eligibility requires several Threads and all three campaign
  capabilities.
- [ ] **G8-02** Campaign history changes starting conditions, allies, routes,
  information, and available sacrifices.
- [ ] **G8-03** Bridge, Carry, and Mend are material plans with at least three
  variants each.
- [ ] **G8-04** Summit is a 15-20 minute logistics operation, not a cutscene or final
  damage check.
- [ ] **G8-05** Irreversible commitment receives an explicit preview.
- [ ] **G8-06** Failure and success both generate concrete multi-scale endings.
- [ ] **G8-07** Completed campaigns remain browsable and coexist.
- [ ] **G8-08** Campaign traceability targets pass.

**Gate 8 exit:** the player can explain how several lost or completed protagonists
made the finale possible and what their galaxy became.

### Gate 9 — Content, balance, accessibility, and retirement

**Purpose:** turn the vertical architecture into a durable complete release.

- [ ] **G9-01** Every target in the complete-game content matrix is met.
- [ ] **G9-02** All section 25 targets pass or have a documented, research-backed
  ratified revision.
- [ ] **G9-03** Three-browser, keyboard, scaling, motion, contrast, and cue-equivalence
  matrices pass.
- [ ] **G9-04** Mature Galaxy performance and save/recovery budgets pass.
- [ ] **G9-05** Narrative, sensitivity, continuity, and repeated-content reviews
  pass.
- [ ] **G9-06** Unsupported legacy adapters and obsolete code paths are removed only
  after export/communication criteria are satisfied.
- [ ] **G9-07** All checked SPEC requirements contain evidence and no critical
  contradiction.
- [ ] **G9-08** README accurately describes the shipped game and canonical mode.

**Gate 9 exit:** STARWEFT is a complete, legible logistics roguelike from launch to
campaign ending, not a collection of ambitious optional systems.

---

## 27. Explicit cuts and non-goals

The overhaul is allowed to remove working code when that code protects the wrong
game shape. Git history preserves experiments; the live product does not owe every
experiment a menu.

### 27.1 Retire from the canonical path

- the giant setup wall and equal visual weight for every modifier;
- Founder plus Origin as overlapping identity choices;
- tutorial/prologue modes that disable Acts, pressure, or canonical progression;
- PLEDGE as a universal Act score pasted over unrelated play;
- BANK or any early exit presented as a full canonical victory;
- Boon, Aptitude, Commission, perk, and setup-modifier nouns competing for one run
  build role;
- a placeless global board that generates needs independently of the world;
- Galaxy and intergalactic screens that are only decorative summaries;
- mandatory combat as a disconnected minigame or separate power economy;
- surprise death without an earlier actionable forecast;
- account progression whose main purpose is uncapped numeric power;
- indefinite canonical runs with no escalating authored ending;
- drawers, analytics, codex, and sandbox controls open by default;
- narrative events whose described resources or harm do not touch simulation state;
- new features that only change UI while leaving the run structure untouched.

### 27.2 Retain only outside canonical play if cheap and safe

- **Long Weave / Sandbox:** broad setup controls, endless simulation, experiments,
  content debugging, and relaxed victory conditions may live behind Advanced or
  Custom after the canonical path is coherent.
- **Legacy Weave:** old saves may remain playable through a labeled compatibility
  adapter while that adapter is safe; otherwise preserve export/read-only history.
- **Daily/shared seeds:** desirable Chronicle breadth once canonical validation and
  deterministic actions are stable.
- **Direct tactical control:** optional future experiment only if it uses the same
  strategic resources, never gates canonical balance, and does not split attention.
- **Modding:** not a pre-release goal; data boundaries should avoid needless
  obstruction, but no mod API is promised.

### 27.3 Not this game's goal

STARWEFT is not trying to be a traditional grid dungeon crawler, a full-fidelity
space combat simulator, a universal 4X empire sandbox, an idle factory game, a
visual novel with decorative resource meters, or a live-service retention machine.
It adopts roguelike principles—procedural situations, permadeath, systemic
interaction, informed risk, run transformation, and player learning—without
imitating the traditional interface or combat verb.

### 27.4 Cut ledger

- [ ] **SW-CUT-001** Every canonical-path retirement above is removed or explicitly
  migrated by Gate 9.
- [ ] **SW-CUT-002** Sandbox and legacy code cannot alter canonical balance or saves.
- [ ] **SW-CUT-003** New feature proposals identify which core loop decision they
  deepen and what existing complexity they replace.
- [ ] **SW-CUT-004** No retired system remains solely because its implementation is
  already finished.

---

## 28. Research basis and design synthesis

This specification treats "roguelike" as a design lineage and player experience,
not a checklist whose authority ends the argument. The research consistently
supports several principles that matter to STARWEFT:

1. **A compact, repeated run gives procedural variation a readable spine.** Random
   generation matters when the player can form, test, and revise an intention.
2. **Permanent consequences make knowledge and authorship meaningful.** Fairness
   requires visible rules, warnings, and recovery—not harmlessness.
3. **Interactions create depth more efficiently than feature count.** A small set
   of verbs should combine across cargo, topology, factions, and pressure.
4. **Build choices should transform play.** Upgrades that change evaluation and
   route planning are more memorable than flat stat accumulation.
5. **Symbolic and ludonarrative consistency create trust.** The fiction, map,
   numbers, and outcome must describe the same event.
6. **Progressive disclosure is compatible with depth.** A strong front door and
   stable opening let players learn a dense world without making that world shallow.
7. **Failure should produce a story and a next hypothesis.** Death is valuable when
   the player understands the causal chain and wants to try a different approach.
8. **Meta progression must not dissolve the run's stakes.** Breadth, expression,
   records, challenge, and continuity are safer than compulsory power creep.

### 28.1 Preserved local corpus

The seven supplied sources are preserved verbatim under
`research/sources/roguelike/` and indexed in `research/README.md`. They include:

- design essays on roguelike interaction, consequence, fairness, procedural
  generation, and replayability;
- a genre/prototype-theory critique of treating the Berlin Interpretation as a
  rigid definition;
- community discussions emphasizing difficulty, permadeath, strategic variety,
  atmosphere, meaningful choice, and respect for player time;
- the CARMSA-12 peer-reviewed philosophy paper on roguelike identity and experience;
- the 2026 Quasimorph paper/case study on systemic survival, extraction, and
  procedural narrative.

The corpus is research evidence, not a third authority. Where sources disagree,
the specification selects the choice that best serves STARWEFT's logistics verb,
bounded run, and campaign-scale continuity.

### 28.2 Primary comparative sources

The following developer/official sources ground specific product decisions:

- [FTL developer postmortem](https://www.gdcvault.com/play/1018034/Designing-Without-a-Pitch-FTL)
  and [Subset factsheet](https://subsetgames.com/presskit/sheet.php?p=fTL): a compact
  ship fantasy, repeated high-stakes situations, multiple responses, and readable
  run framing.
- [Into the Breach design postmortem](https://media.gdcvault.com/gdc2019/presentations/Into%20the%20Breach%20Postmortem%20Final.pdf):
  threat preview, deterministic consequence, small decision space, and loss that
  can be managed instead of merely avoided.
- [Slay the Spire GDC presentation](https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf):
  build transformation, constrained offers, interaction-driven replay, and the
  value of cutting content that does not serve the run.
- [Hades official update notes](https://www.supergiantgames.com/blog/hades-the-nighty-night-update-patch-notes/):
  progressive disclosure of meta systems, permanent records, alternate talents,
  difficulty configuration, narrative continuity, and clarity polish.
- [Caves of Qud roadmap](https://www.cavesofqud.com/roadmap/): preset builds before
  full customization, a consistent authored opening alongside generated starts,
  alternate game modes, a better death chronology, and generated history embedded
  in world objects.
- [Slipways press kit](https://slipways.net/presskit): connections as the primary
  strategic object, technology that changes the game instead of one number, and
  large-scale depth with a direct interface.
- [Against the Storm beginner guide](https://wiki.hoodedhorse.com/Against_the_Storm/Beginner%27s_Guide)
  and [world map](https://wiki.hoodedhorse.com/Against_the_Storm/World_Map): guided
  onboarding for compounding systems, short settlement runs within a larger cycle,
  visible difficulty, and macro choices grounded in completed local play.
- [Jupiter Hell official news](https://jupiterhell.com/news): preset seeds and
  clearly separated challenge modes, including explicitly shorter variants.
- [Dead Cells official patch notes](https://dead-cells.com/patchnotes/25): optional
  onboarding/assist structures with transparent progression trade-offs.
- [Balatro official FAQ](https://www.playbalatro.com/faq): the value of explaining a
  surprising systemic roguelike through one immediately legible core verb.

These games are comparisons, not templates. STARWEFT borrows the discipline of a
clean start, visible run spine, meaningful transformation, threat legibility, and
separated advanced modes. Its logistics, nested scale, successor campaigns, and
non-dominating conflict remain its own proposition.

### 28.3 Decision trace

| Research lesson | STARWEFT decision | Requirement anchors |
|---|---|---|
| fast, readable commitment improves run restart | archetype + difficulty + Launch | SW-START, SW-UI-002 |
| stable openings teach dense procedural worlds | authored guided System inside canonical rules | SW-TUT, G2 |
| previews enable fair hard consequences | Pledge preflight and Fray/contact forecasts | SW-PLG, SW-OPP, SW-CMB |
| transformations create build identity | four-slot Charters with bounded coherent pools | SW-BLD |
| interactions beat isolated mechanics | one logistics grammar across objectives and conflict | SW-LOG, SW-OBJ, SW-CMB |
| local runs can serve a larger strategic cycle | Threads build campaign capabilities and a Summit | SW-CAMP, SW-IG |
| death should memorialize and teach | causal debrief, epitaph, successor, Chronicle | SW-DEATH, SW-META, SW-NAR |
| accessibility and alternate modes need clear boundaries | canonical, Custom/Sandbox, accessibility separated | SW-START, SW-ACC, SW-CUT |
| simulation fiction must remain causally honest | fidelity bands, conservation, state-aware narrative | SW-SIM, SW-NAR |

### 28.4 Research ledger

- [x] **SW-RES-001** All seven supplied local research sources were read and
  preserved before specification synthesis.
  Evidence: `research/sources/roguelike/` and checkpoint tag
  `pre-overhaul-2026-07-17`.
- [x] **SW-RES-002** Primary comparative sources were reviewed for launch flow,
  run structure, fairness, build transformation, scale, meta continuity, and modes.
  Evidence: source register above; research pass dated 2026-07-17.
- [x] **SW-RES-003** Research conclusions are translated into named product
  decisions and requirement anchors.
  Evidence: section 28.3.
- [ ] **SW-RES-004** Major target revisions after playtest cite evidence and update
  the decision trace.

---

## Appendix A. Stable implementation-reference IDs

Source comments and tests may cite these anchors. They are deliberately semantic
and must not be renumbered when prose moves. A checked anchor means only that the
named current foundation exists; the overhaul requirements elsewhere remain open.

- [x] **RUN-ACTS** Current Act shell, state, ticking, transitions, and HUD scaffolding
  exist. The complete System -> Bubble -> Galaxy Thread does not.
- [x] **RUN-PLEDGE** Current Pledge creation, constraint, ticking, completion, and
  failure foundation exists. Contextual sourcing and world-first consequences do not.
- [x] **RUN-FOUNDERS** Current Founder setup packages exist. They are migration input
  for the five-archetype front door, not protected canonical design.
- [x] **RUN-BOONS** Current run Boon/perk foundations exist. They are migration input
  for Charters, not a second permanent build language.
- [x] **DESIGN-RULEBENDS** Existing rule-bending data and hooks exist; new effects
  must comply with Charter design rules.
- [x] **NAR-EPITAPH** Current epitaph/death-copy foundation exists; state-aware
  causal epitaphs remain required.
- [x] **WORLD-IN-SYSTEM** Current in-system bodies/sites/world data foundation exists.
- [x] **PROG-APTITUDES** Current Aptitude progression exists and is scheduled for
  Charter/Chronicle migration or retirement.
- [x] **SETUP-ADVANCED** Current advanced setup options exist and must move behind
  Advanced/Custom rather than remain the canonical front door.
- [x] **UI-COMMAND-STRIP** Current contextual command strip foundation exists.
- [x] **UI-DRAWERS** Current closed-by-default drawer foundation exists.
- [x] **UI-SIGNALS** Current signal-mark presentation foundation exists.
- [x] **UI-ORBITAL-RING** Current selected-object orbital ring foundation exists.
- [x] **UI-EDGE-COMPASS** Current offscreen/edge compass foundation exists.
- [x] **UI-GUILD-BOARD** Current board UI exists; placeless offer generation is
  explicitly not protected.

---

## Appendix B. Definition of the overhaul

The Reweave is complete only when all of the following are true:

- the player reaches control through archetype, difficulty, and Launch;
- the tutorial teaches the real canonical game;
- one Thread escalates through genuinely different System, Bubble, and Galaxy play;
- objectives arise from a living world and are solved through one logistics grammar;
- Pledges are contextual tactical promises, Charters create a coherent run build,
  and Fray creates forecast opposition;
- conflict uses logistics, topology, timing, diplomacy, and aftermath on the same map;
- death ends a protagonist but changes a persistent campaign;
- several Threads create Reach, Resilience, and Accord for a bounded intergalactic
  Summit;
- account progression widens expression without making new runs numerically
  inevitable;
- the interface remains legible, accessible, deterministic, performant, and honest
  about causality;
- old optional overlays no longer masquerade as the ambitious game.

Until those conditions are met, the overhaul is in progress regardless of how much
of its surface styling has shipped.
