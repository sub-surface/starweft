# STARWEFT Core Loop, Onboarding and Progression Review

Status: implementation specification

## Hard constraints

This specification assumes the existing zero-dependency, zero-build, `file://`-playable architecture. All changes must use the current plain HTML/CSS/JavaScript stack, classic `SW` namespace, Canvas 2D, WebAudio and Node standard-library tests.

---

# 1. Executive assessment

STARWEFT already has the right high-level loop and many of the right systems. The early story teaches delivery, routes and relays; the economy makes stock movement matter; routes and directives automate increasingly large scales; prosperity turns helpful logistics into research; the Scourge converts the network into an endgame machine.

The weakness is not conceptual absence. It is that the first hour currently asks the player to infer too much from a large galaxy surface before the game's central verb has become embodied.

The current tutorial begins with a text objective instructing the player to click a nearby system, buy something cheap and send a probe where it sells high. That is accurate, but it exposes several concepts at once:

- selecting a system;
- reading prices;
- selecting a ship;
- knowing where the ship currently is;
- buying cargo;
- judging demand;
- sending;
- deciding whether to sell on arrival;
- understanding travel and upkeep;
- recognizing successful delivery.

The design specification's proposed Sol cold open is stronger because it constrains the decision space and teaches the actual logistics loop inside one system before opening the whole bubble.

The progression curve also risks becoming feature-shaped rather than mastery-shaped. Unlocking routes after three deliveries is thematically good, but the game needs clearer proof that the player understands manual delivery before automating it, clearer intermediate goals after the first route, and more visible transformations in the worlds being served.

The target is a progression in which the player's verbs remain constant while the scale, reliability and stakes change:

```text
carry one crate
-> define one errand
-> repeat one loop
-> maintain one reserve
-> coordinate one region
-> stabilize a galaxy
-> deliver the cure
```

---

# 2. Core-loop review

## 2.1 The loop must begin with a need, not a price table

The player's fantasy is not abstract arbitrage. It is becoming the missing connective tissue between deprived worlds.

The opening should therefore present:

- a named place with a visible shortage;
- a visible source of the needed good;
- one ship that can solve it;
- a before/after consequence.

The first objective should not be "buy low and sell high" in general. It should be closer to:

> Earth Anchorage is short of FOOD. The Belt has stock. Send Stitch to collect five units and deliver them.

Price discovery can be taught through that concrete need. Profit is reinforcement, not the first semantic frame.

## 2.2 Each loop needs five readable phases

Every manual or automated logistics action should expose:

1. **Need** — who wants what and why.
2. **Plan** — source, cargo, destination and expected result.
3. **Commitment** — which ship is handling it and what is queued.
4. **Transit** — where the ship is and how long remains.
5. **Consequence** — stock, prosperity, production, research, payment or crisis change.

Current systems cover these phases unevenly. Transit and market consequence exist, but planning and consequence are spread across panels, while need is often reduced to price.

Required design rule:

> Every major shortage, objective and market row must be able to answer “what can I send?”; every dispatched ship must answer “what problem am I solving?”

## 2.3 The feedback loop should show world repair

A successful delivery currently produces credits and a floater. The game should also surface one concise world consequence where relevant:

- `Earth FOOD reserve: 8 -> 13`
- `Need satisfaction: 42% -> 76%`
- `Alloy line restarted`
- `Prosperity trend stabilized`
- `Research output restored`

Do not display all of these every time. Select the strongest causal result.

This is crucial: the player should learn that profit follows service, not that service is decorative flavor around price arbitrage.

## 2.4 Failure should keep the loop alive

Early runs can stall through poor purchases, upkeep, full destination stores, route mistakes or insufficient building materials.

The first hour needs soft recovery rules:

- the tutorial's required source always has enough stock;
- its destination always has enough capacity;
- the first few tutorial trips cannot bankrupt the player through upkeep;
- if the tutorial ship becomes stranded, provide a one-time Guild emergency tow or credit advance;
- if the player sells or moves required materials incorrectly, regenerate or reissue the tutorial objective rather than deadlocking;
- tutorial objectives detect completion from state, not only from exact click sequence.

These protections end when the player completes the prologue or explicitly skips it.

---

# 3. First-session specification

## 3.1 Main-menu promise

The first menu should communicate three things before play:

- logistics is the core;
- the galaxy changes through supply;
- a spreading threat eventually tests the network.

Avoid explaining every subsystem. The menu needs a clear `NEW WEAVE` path, a concise run summary, and a visible `CONTINUE` only when a valid save exists.

## 3.2 Sol prologue structure

Recommended duration: 20–35 minutes for a new player, 5–10 minutes for an experienced player moving quickly.

### Beat 1 — wake

State:

- system view locked to Sol;
- one shuttle or Sparrow, `Stitch`;
- Earth Anchorage visibly short of FOOD or ORE-derived construction material;
- one nearby source;
- no galaxy-level market terminal;
- only controls needed for the current action are emphasized.

Teach:

- selecting the ship;
- reading one local shortage;
- issuing a fetch/deliver intent.

Completion:

- cargo reaches target;
- market visibly changes;
- one short line explains the consequence.

### Beat 2 — second link

Introduce a production chain:

- Belt ORE -> Mars ALLOY line, or equivalent;
- show that supplying input restarts output;
- require one manual order, then offer repeat.

Teach:

- raw input and manufactured output;
- why some shortages matter indirectly;
- route preview.

### Beat 3 — automation

Unlock a simple route after the player has completed two distinct deliveries, not merely three arbitrary deliveries.

Teach:

- route as repeated versions of known manual verbs;
- assigned ship and queue visibility;
- expected loop outcome;
- pause/resume and unassign.

Completion:

- route finishes one complete profitable or socially useful loop;
- player sees it operate without intervention.

### Beat 4 — building through delivery

Require materials at the construction location for a small Belt or lunar facility.

Teach:

- buildings are logistics problems;
- supply mission shortcut;
- on-site inventory;
- production feedback.

Completion:

- new facility changes a visible flow.

### Beat 5 — first jump

The Guild grants or repairs a jump-capable Sparrow. Alpha Centauri becomes the first galaxy destination.

Teach:

- galaxy camera;
- range and lanes;
- discovery;
- survey/data distinction if the chosen hull supports it.

The map unlock should feel like expansion of an already-understood game, not the point where the game finally begins.

## 3.3 Skip and replay policy

After completing the prologue once:

- `NEW WEAVE` offers `PROLOGUE` and `START IN THE BUBBLE`;
- skipping grants an equivalent starting state, not fewer resources or missing flags;
- help/codex allows replaying tutorial lessons as non-destructive simulations;
- the game remembers tutorial completion in legacy storage;
- importing a save must not accidentally reset the legacy flag.

## 3.4 Tutorial implementation model

Do not script the tutorial as a brittle sequence of exact UI clicks.

Represent tutorial beats as data-driven goals:

```js
{
  id: 'sol_feed_earth',
  available: function (state) {},
  complete: function (state) {},
  prompt: function (state) {},
  focus: { kind: 'system', id: 0 },
  recovery: function (state) {},
}
```

The tutorial system should observe state and present the next useful prompt. It should tolerate alternate valid solutions.

Keep it DOM-free. UI highlighting reads the current tutorial goal but does not own completion logic.

---

# 4. Progression review

## 4.1 Progression should unlock decision scale

Current progression contains ships, routes, directives, research, buildings, exploration, rivals, stance and endgame. These should be organized into a clear ladder.

### Tier 0 — errand

Player question:

> What needs moving right now?

Tools:

- manual fetch/deliver;
- one ship;
- direct market view;
- local system construction.

### Tier 1 — loop

Player question:

> Which movement should repeat?

Tools:

- routes;
- projected loop result;
- two to five ships;
- first relay;
- first factory chain.

### Tier 2 — reserve

Player question:

> What must stay supplied even when conditions change?

Tools:

- directives;
- market pressure alerts;
- reserve targets;
- multiple routes;
- dedicated scouts and escorts.

### Tier 3 — region

Player question:

> How should this part of the galaxy function?

Tools:

- bulk assignment;
- chain routes;
- specialized facilities;
- rival agreements or competition;
- regional economic view;
- emergency policies.

### Tier 4 — history

Player question:

> What should the whole network become under pressure?

Tools:

- stance;
- Scourge response;
- Panacea, hold or exodus strategy;
- Weftworks and auto-yards;
- high-level intervention rather than route maintenance.

Each unlock must remove an existing burden or expose a new decision. Avoid unlocks that only increase numerical efficiency.

## 4.2 Milestone gates should test behavior

Current event triggers often use simple counts: deliveries, ships, credits, route count. Counts are useful but can unlock systems before the player understands them.

Recommended milestone predicates:

- routes unlock after two completed source-to-need deliveries to distinct destinations;
- directives unlock after the player has maintained a route long enough to experience a changed market;
- bulk fleet tools unlock after at least two routes and a meaningful idle-fleet problem;
- advanced market analytics unlock after enough systems are discovered to make comparison useful;
- stance unlocks when the Scourge has created a real strategic choice, not only at a fixed tick.

Use counts as supporting conditions, not the sole proof of mastery.

## 4.3 Research must remain causally legible

Research is generated by prosperous populations, which is one of the game's strongest design choices. The UI should preserve that causal link.

Required surfaces:

- top research-producing systems;
- systems losing research due to needs;
- expected research change from restoring supply;
- research unlock descriptions framed as new logistics capability;
- no large unexplained research grants that overpower the prosperity loop.

Event rewards can remain, but they should be bounded and described as discoveries rather than the main progression faucet.

## 4.4 Money needs durable sinks

As routes scale, credits can become a solved resource. Relevant sinks should reinforce the network:

- hull purchase and replacement;
- upkeep and dangerous-range premiums;
- facilities and upgrades;
- emergency relief procurement;
- rival treaties, insurance or buyouts;
- gate construction;
- expedition provisioning;
- optional market interventions.

Avoid arbitrary taxes detached from logistics. Credit sinks should buy resilience, reach, information or reduced manual burden.

## 4.5 Anti-snowball and anti-stall rules

### Anti-snowball

A large network should gain scope, not perfect safety.

Use:

- longer commitments;
- higher coordination cost;
- regional shocks;
- rival competition;
- Scourge-front emergencies;
- factory-chain bottlenecks;
- opportunity cost between cure, hold and exodus.

Do not merely scale enemy health or upkeep linearly with player wealth.

### Anti-stall

Detect:

- no affordable ship and no active income source;
- all ships stranded;
- no reachable profitable or essential delivery;
- tutorial materials permanently misplaced;
- critical objectives impossible because required systems fell before the relevant unlock.

Provide bounded recovery:

- emergency contract;
- salvageable loaner hull;
- one-time tow;
- rival rescue with reputation cost;
- objective reroute;
- graceful defeat when recovery is genuinely impossible.

---

# 5. Pacing targets

These are tuning targets, not rigid timers.

## First 10 minutes

Player has:

- completed one meaningful delivery;
- seen a market change;
- understood ship selection and destination;
- heard and seen clear success feedback.

## First 30 minutes

Player has:

- supplied one production chain;
- created or previewed one route;
- built one facility through delivered materials;
- understood that prosperity and research depend on supply.

## First hour

Player has:

- entered the galaxy map;
- discovered at least one new system;
- two or three ships;
- one functioning automated loop;
- one clear medium-term goal;
- evidence that their network changed a world.

## Hours 1–3

Player has:

- several routes;
- first directive or equivalent reserve policy;
- first rival relationship;
- specialized ship role;
- enough map reach to face geographic choices;
- first systemic shortage that cannot be solved by one trip.

## Midgame

Player chooses an operating identity:

- trader/governor;
- explorer/cartographer;
- defender/privateer;
- hybrid.

The choice emerges from investment and behavior, not a mandatory class selection.

## Late game

The network is mostly self-running. Player attention moves to:

- shocks;
- frontiers;
- stance;
- strategic allocation;
- final logistics project.

Late-game challenge should test network design, not force the player back into repetitive manual hauling.

---

# 6. Objective system specification

The persistent objective chip should become a layered goal surface.

At most three visible layers:

1. **Immediate** — current tutorial or emergency action.
2. **Operational** — next network milestone.
3. **Strategic** — current act or stance objective.

Example:

```text
NOW: Deliver 5 FOOD to Earth Anchorage.
NEXT: Complete one automated loop.
ARC: Restore stable supply to Sol.
```

Rules:

- objective text must name a verb and target;
- clicking focuses the relevant ship/system/panel;
- completion must derive from state;
- stale or impossible objectives are replaced;
- objectives should not duplicate every alert;
- dismissing optional guidance should not delete strategic goals.

---

# 7. Implementation plan

## Phase 1 — telemetry and first-hour diagnosis

Before redesigning the tutorial, add dependency-free instrumentation to seeded bot/manual scenarios:

- tick of first purchase;
- first send;
- first delivery;
- first route creation;
- first route loop;
- first building;
- first relay;
- first discovery;
- first research purchase;
- bankruptcy or idle-stall time.

Export as console output or CSV from Node standard-library scripts.

Goal: establish current pacing and detect seed variation.

## Phase 2 — state-driven tutorial goals

Add a DOM-free tutorial/prologue module or extend story with explicit goal objects.

Requirements:

- state predicates;
- focus hints;
- recovery hooks;
- skip/completion legacy flag;
- deterministic Sol setup;
- tests for alternate valid completion.

## Phase 3 — Sol content and UI focus

Implement:

- constrained system-view opening;
- named shortage;
- first fetch;
- production-chain lesson;
- first route;
- first facility;
- galaxy unlock.

Use existing panels and actions wherever possible. Do not create a parallel tutorial-only control scheme.

## Phase 4 — progression predicate cleanup

Replace the most brittle count-only unlocks with behavior-aware milestone predicates.

Add a developer milestone report showing:

- condition;
- current progress;
- unlocking event;
- whether it is blocked by impossible state.

## Phase 5 — anti-stall and late-game pacing

Add:

- stall detector;
- bounded recovery actions;
- stance readiness checks;
- network-readiness checks for endgame;
- chronicle entries for major progression transitions.

---

# 8. Dependency-free test plan

Extend `test/smoke.js` and `test/browser_boot.js`; no test framework.

Required tests:

1. Sol prologue seed always contains required source, destination, stock and capacity.
2. First fetch can be completed through the real command/action path.
3. Tutorial completion detects state, not exact click order.
4. Selling or moving tutorial cargo incorrectly triggers recovery.
5. Skip creates a state equivalent to completed prologue rewards and flags.
6. Routes do not unlock from meaningless repeated self-serving actions.
7. First route completion is detected only after a full loop or defined useful cycle.
8. Objectives never reference missing systems or ships.
9. Stale objectives are replaced after corruption or ship loss.
10. A set of deterministic seeds reaches first delivery, route and relay inside generous pacing bounds under a simple bot.
11. Relaxed mode and `scourge never` do not expose impossible Scourge objectives.
12. Imported old saves without tutorial fields load with sensible defaults.
13. Browser boot can render every tutorial stage and skip action.
14. Keyboard and pointer paths can complete the first command.

---

# 9. Acceptance criteria

This work is complete when:

- a new player can perform the first meaningful delivery without interpreting the whole galaxy economy;
- the first delivery visibly changes a named world condition;
- the tutorial uses real game actions and remains valid after completion;
- experienced players can skip without disadvantage;
- unlocks correspond to demonstrated behaviors rather than only counters;
- progression moves from errand to loop to reserve to region to history;
- research remains visibly tied to thriving worlds;
- early mistakes do not silently deadlock a run;
- the objective surface always provides one clear next verb;
- late-game automation preserves strategic decisions and removes repetitive maintenance;
- all implementation remains zero dependency and `file://` compatible;
- smoke and browser-boot tests remain green.

## Final design principle

The player should not learn STARWEFT by reading that logistics matters. They should feed one hungry place, watch it recover, and immediately understand why the whole galaxy needs them.