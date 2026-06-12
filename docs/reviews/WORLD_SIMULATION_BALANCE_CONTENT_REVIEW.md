# STARWEFT World Simulation, Balance and Content Review

Status: implementation specification

## Hard constraints

All changes remain zero dependency, zero build step and playable from `file://`. Simulation logic stays DOM-free and deterministic. Testing and telemetry use Node's standard library and existing browser APIs only.

---

# 1. Executive assessment

STARWEFT already has an unusually coherent causal simulation for a small browser game:

- systems produce, transform and consume real stock;
- prices derive from fill ratio;
- prosperous populations generate research;
- rivals buy and sell actual goods;
- rival shipments exist while in transit;
- the Scourge destroys markets, redirects refugees and collapses networks;
- world generation ties economies to planetary profiles and geography;
- exploration banks data aboard ships until it is sold.

The next risk is not lack of systems. It is systemic opacity and uneven pressure.

Several world-changing processes are currently driven by broad heuristics or random selection:

- rival line choice samples a local zone and chooses margin;
- rival travel time is based on direct distance rather than actual lane path;
- Scourge spread selects a random corrupted source and random eligible neighbor;
- refugee relocation chooses nearest safe population center by Euclidean distance;
- economic balance is validated largely through invariants rather than target curves;
- encounters can still be mechanically isolated from the simulation that triggered them.

These choices are valid prototypes, but as the world grows they can produce outcomes that are technically consistent yet strategically unreadable.

The target is a world where:

- geography creates explainable strategic regions;
- supply shocks propagate through actual chains;
- rivals pursue visible logistics goals;
- the Scourge creates fronts and emergencies rather than lottery losses;
- content attaches to real system states;
- balance is tuned against reproducible seeded scenarios;
- every major world event has a causal explanation available to player and developer.

---

# 2. Simulation truth and scope

## 2.1 One physical accounting model

All actors should obey one stock-flow truth wherever practical.

For commodities:

```text
opening stock
+ direct production
+ facility production
+ player deliveries
+ rival deliveries
- factory inputs
- population consumption
- player purchases
- rival purchases
- destruction/loss
= closing stock
```

The simulation does not need to store a full ledger every tick, but debug instrumentation should be capable of reconciling these flows for selected systems and commodities.

This allows both balance work and player explanation:

> Mars ALLOY fell because two factories consumed 18 ORE, the Belt route was blockaded, and no inbound cargo arrived.

## 2.2 Separate authoritative state from derived analysis

Authoritative state includes:

- stocks, capacities, production, consumption;
- population, prosperity and satisfaction;
- ships and cargo;
- rival cargo and routes;
- Scourge state;
- buildings, facilities, presence and flags.

Derived state includes:

- economic health;
- shortage rankings;
- region pressure;
- route viability;
- front shape;
- balance metrics;
- content candidates.

Derived reports should be transient or sampled into capped telemetry. Do not duplicate economic truth into UI-owned fields.

## 2.3 Event provenance

Every significant system mutation should have a stable cause code, even when no prose is shown.

Examples:

- `PRODUCTION_DIRECT`
- `PRODUCTION_SITE`
- `FACTORY_INPUT`
- `POP_CONSUMPTION`
- `PLAYER_TRADE`
- `RIVAL_TRADE`
- `REFUGEE_INFLUX`
- `SCOURGE_CORRUPTION`
- `WORLD_EVENT`
- `BUILDING_EFFECT`

This can be implemented as optional debug counters rather than a permanent event object for every unit.

---

# 3. World generation review

## 3.1 Generation must guarantee a viable opening

Every non-challenge preset should guarantee within the opening neighborhood:

- at least one source of each tutorial-critical raw good;
- at least one population demand center;
- at least one viable positive-margin or essential-service route;
- access to required early building material;
- no unavoidable lane dependency on a soon-to-be-corrupted bottleneck;
- enough stock and capacity for the prologue;
- at least two strategically distinct expansion directions.

These are validators, not hand-authored identical maps.

## 3.2 Distinct runs need structural variation

Variation should arise from network topology and economic arrangement, not only changed names and coordinates.

Run-level structural features:

- bridge systems and chokepoints;
- local clusters;
- sparse corridors;
- producer-rich but population-poor regions;
- population clusters dependent on distant inputs;
- rival office placement;
- frontier depth;
- badlands bridge placement;
- Scourge-origin relation to major flows.

Each generated run should produce a short fingerprint:

```text
systems / mean lane length / bridge count / cluster count
population concentration / producer concentration
opening opportunity count / critical bottleneck count
rival overlap / Scourge distance
```

This is exported only for testing and run setup explanation.

## 3.3 Geography must matter through travel time

Generation and balance should use actual route distance or travel ticks, not only Euclidean distance, when evaluating:

- viable trade opportunities;
- refugee destinations;
- rival routes;
- Scourge front access;
- emergency response time;
- opening guarantees.

Euclidean distance may remain a cheap first filter, followed by path validation.

## 3.4 World presets

World settings should be flavor-forward but mechanically explicit.

Minimum axes:

- density;
- wealth/starting stock;
- rival count and aggression;
- Scourge clock;
- badlands depth;
- volatility;
- tutorial/prologue;
- ironman.

Named presets should show a concise mechanical summary on focus.

Example:

`THE LONG DROUGHT — sparse stocks, normal production, patient Scourge, two rivals.`

---

# 4. Economy and balance review

## 4.1 Balance must be measured as flows over time

Snapshot prices alone are insufficient. Balance telemetry should track curves:

- total stock by commodity;
- production and consumption per tick;
- unmet essential demand;
- average and distribution of prosperity;
- research generation;
- player and rival cargo moved;
- factory active/blocked time;
- price level and dispersion;
- route profitability;
- system deaths and recoveries;
- player liquidity and fleet replacement value.

Use capped sampling intervals, not unbounded tick logs.

## 4.2 Opening deprivation should be curved, not universal emptiness

A deprived opening works because the player becomes the missing link. Total emptiness is less interesting because it removes source choice.

Recommended opening distribution:

- producers have enough stock to enable a few meaningful exports;
- population centers have visibly low essential reserves;
- factories have partial input stocks and can demonstrate restart;
- refined goods are scarce but not absent everywhere;
- advanced goods appear in small, strategically placed pockets;
- Sol is poor in a designed, teachable way;
- outer or rival regions may begin healthier to create discovery contrast.

The player should connect islands of partial capability, not manufacture an economy from literal zero.

## 4.3 Price model stress tests

The smooth fill-ratio curve is legible, but test it against:

- tiny capacities;
- extreme producer rates;
- large single deliveries;
- high-capacity late-game systems;
- rival and player simultaneous trade;
- price oscillation around route loops;
- destination saturation;
- scarcity-driven nominal inventory inflation.

Required properties:

- finite prices;
- bounded prices;
- no profitable buy/sell loop at the same system after faction effects and rounding;
- large deliveries reduce margin predictably;
- price history does not become dominated by sampling artifacts;
- base-price midpoint remains understandable.

## 4.4 Factories need explicit blocked reasons

A factory slot should expose one of:

- `RUNNING`
- `MISSING ORE`
- `MISSING CRYSTAL`
- `OUTPUT FULL`
- `TECH LOCKED`
- `PAUSED/DAMAGED`

Track blocked ticks in debug telemetry. This reveals whether industrial chains fail because of player logistics, bad tuning or output saturation.

## 4.5 Prosperity needs inertia and causality

Prosperity drift is useful because it prevents one delivery from instantly transforming a world. Review tuning so:

- essential failure hurts faster than luxury shortage;
- recovery is visible within a reasonable session;
- huge populations do not become impossible to support without corresponding infrastructure;
- refugee influx creates a real but solvable shock;
- prosperity-generated research does not explode through population compounding.

Telemetry should separate:

- current satisfaction;
- prosperity stock;
- population growth pressure;
- research output.

---

# 5. Rival AI review

## 5.1 Rivals should have explicit goals

Current rival archetypes affect preferred goods and expansion scoring. Extend them into readable strategic goals.

Examples:

- **Combine**: maximize industrial throughput and own factory inputs.
- **Mariners**: control ports and profitable long routes.
- **Vigil**: secure the Scourge front and sell protection.
- **Synod network**: feed aligned population centers even at lower profit.
- **Severed**: exploit ruins, shortages and black markets.

Each rival needs:

- goal weights;
- budget constraints;
- preferred risk;
- expansion policy;
- retreat policy;
- relationship modifiers;
- one-line current strategy explanation.

## 5.2 Rival ships should use actual paths

Rival shipment duration and risk should be based on lane paths, not direct-distance abstraction.

A rival convoy entity should contain:

- origin and destination;
- path or next leg;
- cargo and quantity;
- owner;
- depart/arrival ticks;
- value;
- escort/strength if relevant;
- visibility state;
- route-line association.

This enables interception, escort, blockade, rescue and map legibility.

## 5.3 Rivals need solvency rules

Current rivals can spend into negative credits if not constrained carefully.

Define:

- minimum operating reserve;
- shipment affordability;
- emergency contraction;
- line abandonment;
- office relocation;
- insolvency warning;
- buyout opportunity;
- collapse consequences.

A rival collapse should release actual opportunities and shocks:

- cargo lost or auctioned;
- market gaps reopen;
- presence decays;
- former partner systems become vulnerable;
- player/rival reputation changes.

## 5.4 Counterplay must be logistical

Player responses should include:

- out-serving a market;
- undercutting a route;
- exclusive contract;
- joint venture;
- embargo;
- convoy escort;
- raid/privateering where stance permits;
- buyout;
- emergency aid to a collapsing rival.

Avoid opaque rubber-banding bonuses.

---

# 6. Scourge review

## 6.1 Replace lottery spread with a readable front model

Random source and random neighbor selection can create surprising movement, but it weakens strategic forecasting.

Recommended front pressure:

Each corrupted-to-safe edge accumulates pressure from:

- elapsed active time;
- number of adjacent corrupted systems;
- lane characteristics;
- local defenses;
- regional modifiers;
- player stance/interventions;
- recent failed spread attempts.

At each spread interval, choose among weighted frontier edges. Show high-pressure threatened edges on the map before the final warning.

This preserves uncertainty while making defense meaningful.

## 6.2 Threat should create logistics missions

When a system becomes threatened, generate explicit emergency needs:

- evacuate population;
- move critical cargo;
- deliver bastion materials;
- deliver Panacea;
- retrieve stranded ships;
- reroute dependencies;
- protect refugee convoy.

The player should experience the Scourge through the same verbs as the rest of the game.

## 6.3 Refugees should use routes and capacity

Refugee movement currently relocates population instantly to the nearest Euclidean population center.

Target model:

- choose reachable havens by path and capacity;
- create refugee pressure or convoy entities;
- consume transport or abstract it with a visible delay;
- increase destination consumption gradually;
- allow player aid to improve survival and integration;
- expose origin and destination in news and market pressure.

A full passenger simulation is not required initially. A delayed, path-aware transfer with visible state is enough.

## 6.4 Defense must have layered effectiveness

Bastions should not be a single binary roll only.

Potential layers:

- warning-time extension;
- pressure reduction;
- chance to repel;
- immunity window after successful defense;
- maintenance supply requirement;
- diminishing effectiveness when isolated;
- synergy with escorts or stance.

Every defense effect must be visible and measurable.

## 6.5 Endgame readiness

The cure ending should test the network rather than only accumulated research.

Readiness indicators:

- Panacea production rate;
- input-chain stability;
- safe path to origin;
- convoy cargo capacity;
- escort/defense coverage;
- time before critical systems fall;
- fallback production sites.

Hold and exodus paths should have equivalent logistical depth and distinct resource demands.

---

# 7. Content and encounter review

## 7.1 Content needs mechanical signatures

Every encounter template should define a unique consequence signature.

Examples:

- changes a lane;
- creates a temporary buyer;
- reveals a coordinate;
- alters a rival line;
- spawns cargo with risk;
- changes ideology/presence;
- offers a one-time service;
- creates a follow-up obligation;
- modifies Scourge pressure;
- introduces a persistent character.

If two encounters differ only in prose, merge or differentiate them mechanically.

## 7.2 Predicates should use real world state

Content selection should consider:

- cargo aboard;
- local shortage;
- region;
- rival ownership;
- recent price shock;
- ship history;
- player stance;
- prior choices;
- threat state;
- discovery/data state;
- route failure.

This makes events feel found in the world rather than dealt from a generic deck.

## 7.3 Recurring characters

Recurring traders, inspectors, cartographers and rival agents should have small persistent records:

```js
state.cast[id] = {
  met: true,
  relation: 1,
  lastSeen: tick,
  flags: {},
}
```

Keep the state compact. A character becomes memorable through recurrence and consequence, not long dialogue.

## 7.4 Non-blocking delivery

Most ambient content should arrive as:

- hailing chip;
- ticker item;
- market bulletin;
- system note;
- optional short scene.

Only strategic, irreversible or stance-grade decisions should force pause.

Ignoring a hail may itself set a small state outcome.

## 7.5 Content budget

For each content family define:

- trigger frequency;
- repeat cooldown;
- maximum concurrent obligations;
- once/repeat behavior;
- interruption severity;
- mechanical value range;
- prose length.

This prevents content from overwhelming the logistics rhythm.

---

# 8. Balance telemetry and bot suite

## 8.1 Archetype bots

Implement simple deterministic bots using public game actions:

- trader;
- governor;
- explorer;
- industrialist;
- defender;
- mixed baseline;
- intentionally poor/random bot.

Bots are not intended to play perfectly. They provide repeatable balance curves and failure modes.

## 8.2 Scenario matrix

Run across:

- several fixed seeds;
- each difficulty;
- density/wealth presets;
- rival counts;
- Scourge clocks;
- with and without prologue;
- at least one stress-scale world.

Record:

- first delivery/route/relay;
- fleet and route curves;
- credits and research;
- prosperity distribution;
- shortage burden;
- rival health;
- Scourge territory;
- ending and tick;
- reason for stall or loss.

## 8.3 Export format

Use standard-library CSV and JSON.

One summary row per run plus optional sampled time-series files. Include:

- seed;
- settings;
- code/save version;
- bot archetype;
- final result;
- key milestones;
- invariant failures;
- performance totals.

No remote analytics.

## 8.4 Balance gates

Examples of useful non-fragile gates:

- standard baseline bot should not fail before a minimum window on most validation seeds;
- relaxed mode should sustain population without Scourge loss;
- no commodity should trend to zero galaxy-wide in every standard seed without player involvement unless intentionally designed;
- at least one viable opening task exists;
- rival shipment accounting conserves stock;
- all generated worlds remain connected under relevant tech rules;
- Panacea chain is physically possible before total population loss under intended difficulty assumptions.

These are distributions and sanity ranges, not demands for identical outcomes.

---

# 9. Implementation plan

## Phase 1 — causal telemetry

- add optional stock-flow counters;
- factory blocked reasons;
- sampled economy summaries;
- seeded bot runner;
- generation fingerprints;
- no major gameplay change.

## Phase 2 — generation validator

- opening viability;
- topology fingerprint;
- path-aware checks;
- reroll or repair only failed constraints;
- expose validation report in tests.

## Phase 3 — rival convoy entities

- actual paths;
- affordability;
- convoy visibility;
- solvency and contraction;
- shared market accounting;
- map and terminal inspection.

## Phase 4 — Scourge front and emergencies

- weighted frontier pressure;
- visible front forecast;
- path-aware refugee pressure;
- emergency logistics objectives;
- layered defenses.

## Phase 5 — content predicates and recurring cast

- consequence signatures;
- stateful cast records;
- hailing-chip delivery;
- content validator;
- repetition budget.

## Phase 6 — stance-specific endgame validation

- cure/hold/exodus readiness;
- bot scenarios;
- chronicle outcomes;
- post-run causal summary.

---

# 10. Dependency-free test plan

Required tests:

1. Commodity stock-flow reconciliation for controlled systems.
2. Rival purchases and sales conserve stock and credits within defined rules.
3. Rival cannot dispatch unaffordable shipment below reserve policy.
4. Rival convoy uses a valid path and finite travel time.
5. Rival collapse cleans lines, ships and presence safely.
6. Every standard world passes opening viability validator.
7. Generation remains deterministic for seed and settings.
8. Run fingerprints differ across structurally distinct presets.
9. No generated path uses forbidden badlands/corrupted nodes without tech.
10. Factory blocked reason matches controlled input/output states.
11. Scourge frontier pressure remains finite and deterministic.
12. Bastion/defense effects measurably alter pressure or warning.
13. Threatened system creates valid emergency objectives.
14. Refugee destination is reachable and not corrupted.
15. Content predicates do not mutate state.
16. Every event choice has a valid mechanical signature or explicit flavor-only exemption.
17. Repeat cooldowns prevent immediate recurrence.
18. Cast records survive save round-trip if introduced.
19. Bot runner exports valid CSV/JSON using standard library only.
20. Long runs remain invariant-clean across validation seeds.

---

# 11. Acceptance criteria

This work is complete when:

- generated runs are viable but structurally distinct;
- travel topology matters to AI, emergencies and balance checks;
- factories, shortages and world changes expose clear causes;
- rivals move actual cargo through actual paths and obey solvency rules;
- rival strategy can be summarized in one line;
- Scourge movement forms a readable pressure front;
- threat creates emergency logistics using existing verbs;
- refugee shocks are path-aware and visible;
- encounters arise from world state and produce distinct consequences;
- balance tuning uses reproducible bot curves and scenario matrices;
- no external analytics, packages or services are introduced;
- all simulation logic remains deterministic, DOM-free and testable under Node.

## Final design principle

The world should not feel alive because many random things happen. It should feel alive because every movement changes what can happen next.