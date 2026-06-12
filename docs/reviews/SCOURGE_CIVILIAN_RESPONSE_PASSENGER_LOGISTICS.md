# STARWEFT Scourge Civilian Response and Passenger Logistics

Status: implementation specification and systems review

Related requirement families: `SCR`, `PASS`, `RIV`, `OPS`, `COM`, `END`, `UX`, `PERF`, `SAVE`

## Hard constraints

- Zero dependencies, zero build step, direct `file://` play.
- Simulation remains deterministic and DOM-free.
- All player mutations route through `SW.game.actions.*`.
- People are not reskinned commodity units: passenger transport has distinct capacity, consent, urgency, destination and consequence semantics.
- The system must deepen GATHER -> MOVE -> DELIVER rather than become a separate minigame.
- Do not simulate individual civilians. Represent meaningful cohorts and flows at the smallest scale that creates decisions.

---

# 1. Executive assessment

The Scourge currently changes the world mostly by changing system state:

- frontier pressure selects a threatened system;
- a visible warning timer begins;
- bastions may block corruption;
- corruption destroys the local market and infrastructure;
- one quarter of the population is immediately reassigned to a lane-reachable haven;
- remaining population is counted as lost;
- rival presence partially withdraws to safe holdings.

This is already more causal than a simple expanding danger circle. However, the most important human event in the game -- a civilisation deciding whether and how to flee -- happens as an instantaneous accounting mutation. The player sees the result, but cannot participate in the movement that produced it.

That leaves several promises under-served:

- the Scourge is an extinction event, but often feels like a map timer;
- population is economically important, but rarely feels mobile or political;
- factions have different descriptions, but respond to crisis through similar abstractions;
- bastions exist, but worlds do not visibly decide to fortify, evacuate, bargain or fracture;
- passenger transport, rescue, resettlement and tourism are absent from the core logistics grammar;
- the new Living Weave visualises cargo flow but not the movement of people under pressure.

The target is a **civilian-response layer** in which the Scourge changes what every world wants, every faction does and every route means.

When the front approaches, worlds should visibly choose among:

- fortifying;
- evacuating;
- rationing;
- seeking relief;
- preserving industry or culture;
- closing borders;
- accepting refugees;
- exploiting the crisis;
- refusing to believe it.

The player then acts through familiar logistics verbs:

- move civilians;
- supply a bastion;
- escort a convoy;
- deliver medicines and fuel;
- establish a haven;
- choose who receives scarce berths;
- decide where displaced populations rebuild.

The strategic result is not only "population saved." The pattern of survival changes demand, research, faction presence, industrial capacity, relationships and the eventual shape of the bubble.

---

# 2. Design pillars

## 2.1 People move through the same geography as goods

Passenger journeys use actual lane paths, travel time, danger and destination capacity. No instantaneous cross-bubble relocation.

## 2.2 Crisis creates logistics, not modal interruption

The default response to a threatened world is an actionable pressure surface and optional hail, not a forced scene. The player can intervene manually, automate policy or ignore it and accept the consequence.

## 2.3 Factions express values through material decisions

Faction personality should appear in:

- what they save;
- what they abandon;
- what they build;
- where they send people;
- who they admit;
- what contracts they offer;
- what risks they tolerate.

## 2.4 Rescue has opportunity cost

Passenger space, time, fuel, escorts and destination capacity compete with ordinary trade and Panacea logistics. Rescue should be generous and meaningful without becoming a universally dominant credit strategy.

## 2.5 The player shapes demography rather than merely preserving a total

Moving a cohort to a new system should alter that destination. Saving everyone into one haven can create famine, overcrowding and political conflict. Distributing people can seed new markets and settlements.

## 2.6 Abstraction remains legible

Background civilian movement may be simulated in aggregated cohorts. The player sees enough detail to understand cause and effect without managing millions of individual passengers.

---

# 3. Population representation

## 3.1 Keep `sys.pop` as the authoritative resident total

Do not replace the existing population model with individual entities.

Add a small number of explicit cohort records only when people are displaced or travelling:

```js
state.populationFlows = [
  {
    id: 'pf-17',
    kind: 'civilian' | 'specialist' | 'pilgrim' | 'tourist' | 'militia' | 'refugee',
    origin: 42,
    destination: 7,
    population: 0.8,
    status: 'waiting' | 'reserved' | 'in_transit' | 'arrived' | 'lost' | 'stranded',
    urgency: 0.0,
    createdAt: 1200,
    deadline: 1260,
    owner: null | 'player' | rivalId,
    transportId: null,
    faction: 'synod',
    needs: { FOOD: 2, MEDS: 1 },
    tags: ['families'],
    sourceCause: 'scourge_warning'
  }
]
```

`population` remains in the same abstract millions-scale unit as `sys.pop` unless testing shows another unit is clearer.

## 3.2 Cohort creation

Cohorts are created by meaningful events:

- Scourge warning;
- blockade or war;
- famine or market collapse;
- contract tourism;
- pilgrimage;
- specialist relocation;
- new settlement drive;
- post-cure return migration.

Do not generate constant low-value passenger noise at every inhabited system.

## 3.3 Resident-to-waiting transfer

When a cohort commits to leave:

- reserve the cohort from the origin population;
- represent it as waiting population at the port;
- continue some local consumption while waiting;
- apply panic, congestion or productivity effects;
- return survivors to resident population if evacuation is cancelled before departure.

Avoid double-counting people as both resident and in transit.

## 3.4 Destination capacity

A destination's capacity is derived from:

- current population;
- prosperity;
- habitat/facility capacity;
- food and medicine reserves;
- ideology/faction policy;
- current refugee load;
- Scourge risk;
- player-built haven or relief infrastructure.

A destination can be:

- `OPEN` -- accepts the cohort;
- `STRAINED` -- accepts with penalties or support needs;
- `CLOSED` -- refuses unless policy/reputation/payment changes;
- `UNSAFE` -- cannot accept due to threat or path;
- `SPECIAL` -- accepts only certain cohort types.

The UI must explain the cause of refusal or strain.

---

# 4. Passenger capacity and ships

## 4.1 Separate berths from cargo hold

Ships gain optional passenger capacity:

```js
hull.berths = 0;
ship.passengers = [];
```

Cargo and passenger capacity remain distinct. Food/medicine consumed by a journey may still occupy cargo space.

This prevents absurd choices such as representing civilians as FOOD-like inventory and enables passenger-specialised hulls.

## 4.2 Initial hull roles

Introduce a small, legible set rather than many near-duplicates.

### Shuttle

- small berth count;
- cheap and fast;
- useful for intra-system evacuation and short hops;
- can be converted from the tutorial shuttle model if appropriate.

### Packet / Courier conversion

- modest berths through a retrofit or tech;
- preserves flexibility for early rescue work;
- less efficient than dedicated passenger hulls.

### Liner

- medium-to-large berth capacity;
- high upkeep;
- weak cargo capacity;
- good comfort and tourism value;
- poor in dangerous lanes without escort.

### Evacuation transport

- large emergency berth capacity;
- low comfort, high loading speed;
- requires relief logistics and escort;
- may unlock through milestones, stance or Scourge research.

### Colony ark / Exodus hull

- late-game settlement vessel;
- carries people plus a required infrastructure package;
- belongs to the Exodus endgame rather than ordinary passenger trade.

## 4.3 Optional modules rather than hull explosion

Where possible, support simple refits:

- passenger cabins;
- emergency bunks;
- medical ward;
- cryogenic berths;
- quarantine compartment;
- luxury cabins.

A module system should remain small and data-driven. Do not create a general ship-fitting simulator unless separately specified.

## 4.4 Journey needs

Passenger journeys may require:

- FOOD proportional to people and travel time;
- MEDS for crisis or vulnerable cohorts;
- FUEL through ordinary movement cost;
- escort for routes above a known danger threshold;
- quarantine inspection after exposure.

The first implementation may bundle these into a calculated provisioning requirement rather than consuming supplies every tick.

---

# 5. Passenger intents and contracts

## 5.1 Core intents

Passenger work should compile into the existing command grammar.

Proposed intents:

```text
BOARD(cohort, origin)
MOVE_PASSENGERS(cohort, destination)
EVACUATE(origin, destinationPolicy, quantityPolicy)
RELIEF_SHUTTLE(origin, destination, repeatUntil)
TOUR(origin, itinerary, return)
RESETTLE(origin, destination, package)
```

Likely atomic additions:

```text
BOARD_PASSENGERS
DISEMBARK_PASSENGERS
PROVISION
QUARANTINE
WAIT_FOR_BOARDING
```

Do not create an unrelated passenger AI system. Persistent evacuation policies refill ordinary visible queues.

## 5.2 Crisis rescue contracts

A threatened world can issue:

- open evacuation bounty;
- priority rescue for vulnerable civilians;
- specialist extraction;
- last ship out;
- medical transport;
- convoy escort;
- bastion worker delivery;
- post-fall search and rescue if the fiction supports survivors.

Contract information:

- people waiting;
- origin and acceptable destinations;
- deadline;
- minimum berth requirement;
- provisioning requirement;
- route risk;
- payment/reputation/research effects;
- consequence of failure;
- whether partial rescue is accepted.

Partial completion should usually save the transported share rather than fail the entire contract.

## 5.3 Tourism and ordinary passenger work

Passenger systems should exist before the Scourge wakes.

Low-frequency ordinary contracts provide teaching and economic use:

- scientists travelling to a wonder;
- pilgrims visiting a Loom site;
- tourists touring rare stellar bodies;
- engineers moving to an industrial hub;
- diplomats attending negotiations;
- settlers founding a frontier habitat.

This prevents the passenger hull line becoming useless in relaxed mode and allows players to learn the interface before crisis.

## 5.4 Rewards

Passenger rewards may include:

- credits;
- faction reputation;
- aptitude milestone progress;
- research from saved specialists;
- destination prosperity;
- new production or facility capability;
- Chronicle entries;
- political obligations.

Avoid paying so much that deliberately waiting for disaster becomes the obvious optimal economy.

---

# 6. Autonomous world response

## 6.1 System response state

A threatened inhabited system derives or stores a crisis response:

```js
sys.crisis = {
  stage: 'watch' | 'mobilising' | 'evacuating' | 'fortifying' | 'siege' | 'aftermath',
  policy: 'hold' | 'partial_evac' | 'full_evac' | 'deny' | 'profit' | 'wait',
  confidence: 0.0,
  desiredEvac: 0,
  reservedEvac: 0,
  fortificationNeed: {},
  havenPreferences: [],
  updatedAt: tick
}
```

Prefer derived values when possible; save only choices and commitments that must persist.

## 6.2 Response drivers

Policy is influenced by:

- local ideology;
- dominant faction/presence;
- prosperity and resources;
- distance to the front;
- number of escape routes;
- existing bastion;
- local industry or wonder value;
- population composition;
- history of prior attacks;
- player reputation and stance;
- available faction convoy capacity.

## 6.3 Faction proclivities

These are tendencies, not deterministic moral labels.

### Vigil

- fortifies early;
- imposes quarantine;
- prioritises defensible evacuation corridors;
- asks for ALLOY, MEDS and escorts;
- may restrict movement from exposed systems.

### Synod Relief Chain

- evacuates families and vulnerable cohorts;
- opens havens beyond comfortable capacity;
- asks for FOOD, MEDS and passenger lift;
- can become overextended.

### Helix Combine

- protects industrial specialists, research assets and profitable infrastructure;
- may finance bastions where production value is high;
- offers lucrative but ethically selective extraction work;
- relocates industry alongside people when possible.

### Mariner Syndicate

- mobilises shipping quickly;
- prices risk openly;
- creates efficient convoy schedules;
- may demand payment, guarantees or shared profit;
- becomes a valuable evacuation partner if relations are good.

### Loomward Tithes

- prioritises archives, relic keepers and culturally important communities;
- may refuse to abandon sacred systems until late;
- establishes pilgrim refuges.

### Severed Freeholds

- runs blockade routes and unlicensed extraction;
- accepts dangerous or politically excluded cohorts;
- may traffic in exploitative passage contracts;
- also provides rescue where formal networks refuse.

### Independent systems

- use local traits, prosperity and history;
- should produce varied responses rather than a neutral default every time.

## 6.4 Autonomous bastion construction

Worlds may decide to fortify, but construction must obey material truth.

A system can:

1. recognise threat;
2. create a bastion project;
3. reserve local ALLOY/TECH/MEDS;
4. request missing supplies through hails/contracts;
5. receive rival or player deliveries;
6. complete before the deadline or fail partially.

No free bastion should appear solely because a faction personality roll succeeded.

## 6.5 Autonomous evacuation

Factions and civilian networks can dispatch background convoys using actual paths and capacity budgets.

The player is not the only actor, but their fleet can:

- take contracts other networks cannot cover;
- escort background convoys;
- alter destinations;
- subsidise passage;
- block or prioritise routes;
- provide emergency depots and havens.

---

# 7. Making the Scourge more materially present

## 7.1 Keep the core states simple

The authoritative system states may remain:

- safe;
- threatened;
- corrupted.

Add derived or short-lived pressure information rather than multiplying permanent states unnecessarily.

## 7.2 Front pressure

Expose:

- frontier edges;
- estimated pressure;
- pincer risk;
- warning-time modifiers;
- bastion effect;
- evacuation demand;
- likely next targets.

Forecasts should be imperfect but based on actual state, not pure fiction.

## 7.3 Scourge signatures

Make the approaching threat visible through systemic effects:

- communications noise;
- market hoarding;
- falling route confidence;
- flight demand;
- abandoned cargo;
- research anomalies;
- quarantine rules;
- local visual distortion;
- changes in music and sky treatment.

These effects should grow with pressure and proximity.

## 7.4 Exposure and quarantine

A later phase may add exposure risk to ships leaving a threatened system.

Requirements before implementation:

- clearly forecast risk;
- provide inspection/quarantine actions;
- avoid punishing rescue without counterplay;
- do not add hidden random infection that destroys a destination;
- make faction response and passenger type matter.

This is optional until passenger movement and front pressure are already legible.

---

# 8. Consequences of migration

## 8.1 Destination demand shock

Arriving civilians increase:

- FOOD and MEDS consumption;
- housing pressure;
- local route demand;
- labour and production potential;
- research potential after integration;
- faction/political pressure.

Apply change over an integration window rather than instant full productivity.

## 8.2 Overcrowding

A strained haven may suffer:

- lower prosperity;
- rationing;
- temporary disease/medical demand;
- price spikes;
- political conflict;
- new relief contracts;
- onward migration.

This creates second-order logistics rather than ending the story at disembarkation.

## 8.3 Specialists and cultural cohorts

Small tagged cohorts may alter systems:

- engineers restore a factory slot;
- medics reduce crisis mortality;
- cartographers reveal routes;
- researchers add research output;
- farmers improve FOOD production;
- archivists preserve Chronicle fragments;
- militia improves defence but consumes supplies.

Keep bonuses bounded and understandable.

## 8.4 Abandoned worlds

A successfully evacuated world may still fall, but its people, skills and story continue elsewhere. This creates a different history from a world that is simply erased.

## 8.5 Return and resettlement

After cure or successful defence:

- some cohorts wish to return;
- some remain in their new home;
- the player may support reconstruction;
- scarred systems have special requirements and opportunities;
- population movement contributes to postgame Chronicle outcomes.

---

# 9. Visualisation

## 9.1 Population-flow layer

Add a transient/decaying `populationFlow` layer distinct from cargo `laneFlow`.

Visual language:

- thin moving pulses along actual lane paths;
- direction clearly visible;
- density represents cohort scale with logarithmic saturation;
- urgency changes cadence or spacing, not only colour;
- player-carried cohorts can highlight the selected path;
- lost or severed flows terminate visibly;
- reduced-motion mode replaces moving particles with directional dashes.

Do not draw one particle per person or per cohort at distant zoom. Aggregate by lane and direction.

## 9.2 Migration overlay

A map overlay can show:

- net population inflow/outflow;
- waiting evacuees;
- haven capacity;
- active passenger convoys;
- likely crisis destinations;
- closed borders;
- overcrowding.

## 9.3 Faction view

A faction overlay should display influence as a field derived from `presence`, not rigid territorial ownership.

Show:

- dominant influence;
- contested systems;
- trade/relief corridors;
- faction crisis policies;
- player reputation where relevant;
- selected faction goals.

Use texture, outline and labels as well as colour.

## 9.4 Living Weave integration

Cargo flow, population flow and faction influence should be visually related but separable:

- cargo thickens the weave;
- civilian movement appears as directional pulses over it;
- faction view tints or textures the network;
- Scourge corruption removes or distorts threads.

---

# 10. UI and information delivery

## 10.1 Threatened-system panel

Must answer:

- how long remains;
- how many people are waiting or likely to flee;
- what local policy is;
- whether a bastion project exists;
- which destinations will accept people;
- which ships can help;
- what supplies are required;
- what background convoys are committed.

Primary actions:

- evacuate;
- establish repeat shuttle;
- supply bastion;
- escort convoy;
- inoculate;
- focus destination/haven.

## 10.2 Hails

Crisis requests should arrive through the non-blocking hail channel:

- evacuation request;
- border closure;
- bastion appeal;
- convoy distress;
- overcrowded haven;
- faction offer;
- specialist extraction.

Only irreversible political or stance-grade choices should pause the game.

## 10.3 Passenger manifest

Selected passenger ship shows:

- berth use;
- cohort names/types;
- origin and destination;
- deadline;
- provisioning;
- risk;
- expected consequences;
- current command queue.

Avoid a large separate passenger-management screen unless manifests become too complex for the selected-ship surface.

---

# 11. Performance and simulation scale

Passenger cohorts can multiply quickly during late Scourge play. Bound the system:

- aggregate cohorts with same origin, destination, type and deadline band;
- cap low-significance ambient flows per system;
- use lane-level flow summaries for rendering;
- simulate only waiting, reserved and in-transit cohorts explicitly;
- fold arrived cohorts into destination population after integration;
- prune completed history into capped Chronicle/stat counters;
- cache path choice per response update, not per frame;
- update autonomous crisis policy on a slow cadence.

No worker, package or alternate runtime is required.

---

# 12. Save and migration

Likely additive fields:

- `state.populationFlows`;
- `ship.passengers`;
- optional `ship.berthModules`;
- optional system crisis commitments;
- migration and rescue statistics;
- Chronicle summaries.

Migration rules:

- old saves initialise empty passenger/flow collections;
- existing instant-refugee behavior may remain for already-corrupted historical systems;
- do not retroactively invent cohorts for past losses;
- all quantities must be finite and references validated;
- destroyed ships resolve passenger outcomes exactly once.

A save-version bump is required once persistent cohorts or passenger manifests ship.

---

# 13. Proposed implementation phases

## Phase 0 -- measurement and terminology

- define population unit and berth scale;
- add crisis-response report without changing outcomes;
- expose front pressure and current instant-refugee accounting in F3;
- establish deterministic fixtures for one threatened system.

## Phase 1 -- passenger foundations before Scourge integration

- add berths and passenger manifests;
- add ordinary tourism/specialist contracts;
- add board/disembark atoms and passenger intent;
- add one or two passenger-capable hulls/refits;
- add selected-ship manifest UI;
- test relaxed mode.

## Phase 2 -- waiting cohorts and player evacuation

- create cohorts at threatened systems;
- reserve population correctly;
- generate partial-completion rescue contracts;
- add destination capacity and acceptance;
- integrate arrival demand shocks;
- replace player-facing instant rescue with actual transport.

## Phase 3 -- autonomous faction response

- derive crisis policy from faction/system traits;
- add material bastion projects;
- dispatch background evacuation convoys;
- add faction-specific hails and contracts;
- add overcrowding and relief follow-ups.

## Phase 4 -- visual population and faction layers

- population-flow lane summaries;
- migration overlay;
- faction influence overlay;
- selected convoy and crisis-front rendering;
- reduced-motion alternatives.

## Phase 5 -- endgame and aftermath

- Hold evacuation/defence interactions;
- Exodus colony passenger requirements;
- post-cure return migration;
- Chronicle demographic outcomes;
- bot and balance evidence.

Exposure/quarantine mechanics remain a later optional phase.

---

# 14. Dependency-free tests

Required deterministic checks:

1. cohort creation never duplicates resident population;
2. boarding removes waiting population exactly once;
3. disembarkation adds population exactly once;
4. destroyed transport resolves passenger loss exactly once;
5. partial rescue preserves the transported share;
6. destination capacity and refusal reasons are deterministic;
7. passenger path avoids corrupted/blocked nodes under the same rules as ships;
8. deadlines and travel time are finite;
9. passenger ships cannot exceed berths;
10. cargo and berth capacity remain independent;
11. provisioning requirement scales with path/time and remains finite;
12. autonomous bastion construction consumes actual materials;
13. faction response differs under controlled ideology fixtures;
14. background convoys obey actual paths and capacity budgets;
15. arrival modifies destination consumption and prosperity predictably;
16. overcrowding creates bounded, reversible pressure;
17. old saves load with empty passenger state;
18. manifest references survive save round-trip;
19. relaxed mode generates useful non-crisis passenger work;
20. high-volume crisis aggregation remains bounded;
21. browser boot renders threatened system, passenger manifest and migration overlay controls;
22. no UI action mutates passenger state outside `SW.game.actions.*`;
23. no new dependency or server requirement appears.

Balance evidence should include:

- civilians saved/lost by difficulty and seed;
- percentage moved by player, factions and unaided background flow;
- rescue profitability relative to freight;
- haven overload frequency;
- bastion completion rates;
- passenger-hull usefulness before and after Scourge activation;
- effect on Cure, Hold and Exodus viability.

---

# 15. Acceptance criteria

This system is complete when:

- passenger transport exists as a useful pre-Scourge profession;
- threatened systems create visible waiting cohorts and actionable rescue work;
- moving people uses actual ships, berths, paths and travel time;
- factions respond differently through material, legible policies;
- bastions are projects supplied by real stock rather than free rolls;
- autonomous actors can evacuate and fortify without making the player irrelevant;
- destinations have capacity, policy and second-order consequences;
- rescued populations materially alter markets, research, industry and history;
- population movement is visible at map scale without particle overload;
- faction influence can be inspected without implying rigid borders;
- hails communicate crisis unobtrusively;
- saves migrate safely and cohorts cannot duplicate or disappear silently;
- the system strengthens the same GATHER -> MOVE -> DELIVER grammar;
- all work remains deterministic, headless-testable and zero dependency.

## Final principle

The Scourge should not only remove stars from the map. It should set the whole bubble in motion.