# STARWEFT Command, Automation and Fleet-Control Review

Status: implementation specification

## Hard constraints

All work remains zero dependency, zero build step and compatible with `file://`. Use the current classic-script `SW` namespace, serializable state, existing action journal, plain DOM, Canvas 2D and Node standard-library tests.

---

# 1. Executive assessment

STARWEFT's control architecture is further along than its interface suggests. Ships already support manual sending, routes, directives, missions, auto-exploration and an atomic command queue. Route ships, directive ships and queued ships are processed through distinct branches in `ships.tick()`, and the current command work exposes why-lines and queue state in the selected-ship command bar.

The central problem is fragmentation. A ship can be controlled by several mutually exclusive mechanisms:

- direct send;
- mission object;
- route assignment;
- directive assignment;
- atomic queue;
- auto-explore;
- combat or special operation state.

These mechanisms work, but they do not yet form one visible interaction grammar. The player has to learn which panel owns which kind of order, what assignment overrides what, and whether cancelling one mode destroys another. `S.unassign()` currently clears route, directive, mission, queue and queue note together, which is simple but blunt. A single command may erase more intent than the player expects.

The design target is not one giant universal AI. It is a small, explicit command language with predictable ownership:

- **intent** states what outcome the player wants;
- **queue** shows the concrete steps the ship will attempt;
- **assignment** states which persistent controller may append future work;
- **interrupts** protect the ship and network under defined conditions;
- **why-line** explains the current decision;
- **history** records what happened and why it stopped.

The player should be able to answer, for any ship:

1. What are you doing now?
2. What will you do next?
3. Who assigned this work?
4. What condition could change it?
5. Why are you waiting or failing?
6. What happens if I cancel?

---

# 2. Control-model review

## 2.1 Separate order source from execution queue

A ship should have one execution queue and zero or one persistent work source.

Proposed conceptual model:

```js
ship.control = {
  source: null | { kind: 'route'|'directive'|'explore'|'patrol'|'escort', id: ... },
  queue: [],
  interrupt: null,
  status: 'running'|'waiting'|'blocked'|'paused',
  reason: '',
}
```

This does not require an immediate save-schema rewrite. Existing fields may remain during migration. The important boundary is behavioral:

- the queue contains atomic executable steps;
- a route/directive/explore controller refills the queue when appropriate;
- a one-shot intent compiles once and has no persistent source;
- cancelling the current atom is not the same as clearing the whole assignment;
- pausing an assignment is not the same as unassigning it.

## 2.2 Atomic verbs

Keep the command language deliberately small.

Required atomic verbs:

- `MOVE`
- `DOCK` if docking becomes mechanically distinct; otherwise omit it
- `BUY`
- `SELL`
- `DROP`
- `TAKE`
- `SURVEY`
- `SCAN`
- `SELL_DATA`
- `WAIT`
- `PATROL_LEG`
- `ESCORT_RENDEZVOUS`
- `DELIVER_PANACEA`
- `INOCULATE`

Each atom must define:

- serializable parameters;
- preconditions;
- success result;
- retry policy;
- terminal failure condition;
- one-line present tense explanation;
- cancellation cleanup;
- whether partial completion is valid.

Avoid atoms that encode whole strategies, such as `MAKE_PROFIT_FOREVER`. Strategy belongs in intent compilers and persistent controllers.

## 2.3 Intents

Intents are player-facing outcome requests compiled into atoms.

Minimum set:

- `GO_TO(system)`
- `FETCH(commodity, source, destination, quantity, arrivalPolicy)`
- `SELL_DATA(vendor?)`
- `SUPPLY_BUILDING(system, building)`
- `KEEP_STOCKED(system, commodity, target)`
- `EXPLORE(region|frontier|untilCondition)`
- `PATROL(lane|systems)`
- `ESCORT(ship|convoy)`
- `EVACUATE(system, destination?)`
- `INOCULATE(system)`

Every intent preview must show:

- compiled steps;
- expected source and destination;
- cargo quantity or capacity assumption;
- estimated path and duration;
- known cost;
- likely result;
- warnings;
- what will happen when a precondition fails.

The compiler may be invisible during ordinary play, but its output must never be invisible.

## 2.4 Ownership precedence

Define one explicit precedence order.

Recommended:

1. hard safety interrupt;
2. player-injected immediate atom;
3. current one-shot intent queue;
4. persistent assignment queue;
5. idle behavior.

Examples:

- `stranded-risk` can pause a route before it spends the last credits;
- `data bank full` can inject `SELL_DATA` into auto-explore;
- a player may insert `MOVE` at the front of a route queue, after which the route resumes;
- clearing the one-shot queue should not silently delete the route unless the player chooses `UNASSIGN`.

Current mutually exclusive mode checks should be migrated carefully rather than rewritten at once.

---

# 3. Selected-ship command home

## 3.1 Stable layout

The command bar should be the canonical home for the selected ship. It must not jump between unrelated layouts based on minor state changes.

Recommended structure:

```text
SHIP / HULL / LOCATION / CONDITION
CURRENT: [atom] [progress] [cancel atom]
WHY: one-line reason
QUEUE: 1. MOVE ... 2. BUY ... 3. MOVE ... 4. SELL ...
ASSIGNMENT: Route 2 [pause] [edit] [unassign]
INTERRUPTS: data-full -> sell / stranded-risk -> hold
COMMANDS: go / fetch / supply / explore / patrol / escort / clear
```

Collapsed states are acceptable, but the same conceptual regions should stay in the same order.

## 3.2 Status language

Use a small status vocabulary:

- `EN ROUTE`
- `LOADING`
- `UNLOADING`
- `SURVEYING`
- `WAITING FOR STOCK`
- `WAITING FOR CAPACITY`
- `WAITING FOR CREDITS`
- `OUT OF RANGE`
- `NO SAFE PATH`
- `PAUSED BY PLAYER`
- `PAUSED BY INTERRUPT`
- `IDLE`

Do not use generic `idle` for a ship that is blocked by a failed automation condition.

## 3.3 Queue editing

Required operations:

- inspect full queue;
- cancel current atom;
- remove a future atom;
- move a future atom up or down where safe;
- clear one-shot queue;
- pause queue;
- resume queue;
- append a manual move;
- insert an emergency action at front;
- retain or discard persistent assignment explicitly.

Safety rules:

- atoms already partially executed show what was spent or loaded;
- removing `SELL` does not delete cargo;
- removing `BUY` after purchase does not pretend the purchase never occurred;
- cancelling travel cannot teleport the ship; either continue to current endpoint or define a costly diversion mechanic;
- edit operations are journaled.

## 3.4 Why-lines

A why-line should cite the active controller and relevant condition.

Good:

- `Route “Sol Relief” sent Stitch to Mars to buy ALLOY for the next stop.`
- `Directive “Keep Earth FOOD 60” found a 19-unit uncovered gap.`
- `Auto-explore is returning because chart value reached 640¤.`
- `Waiting: The Belt has only 2 of the requested 10 ORE.`

Bad:

- `Executing order.`
- `AI decision.`
- `Waiting.`

Why-lines should be generated in the simulation/controller layer, not reconstructed from UI guesses.

---

# 4. Fetch as the primary intent

FETCH is the most important command because it directly expresses the core verb.

## 4.1 Fetch grammar

```text
FETCH [quantity|fill hold] [commodity]
FROM [source|best known source]
TO [destination]
ON ARRIVAL [sell|drop|hold|satisfy target]
THEN [stop|return|resume assignment]
```

The common case remains one click from a shortage or market row.

## 4.2 Source selection

When the player chooses `best source`, source ranking must consider:

- actual stock;
- buy price;
- path availability;
- travel time;
- upkeep;
- command range;
- destination need still uncovered after inbound cargo;
- rival or Scourge risk where known;
- ship capacity.

Do not choose a nominally cheap source that is strategically worse than a nearby adequate source without showing why.

## 4.3 Quantity semantics

Support explicit choices:

- `5`, `10`, `25`;
- `fill hold`;
- `fill uncovered gap`;
- `fill destination to target`;
- `one recipe batch`;
- `building requirement`.

The compiler resolves the actual amount at execution time within player-defined limits. The preview distinguishes requested and currently available quantity.

## 4.4 Arrival policies

- `sell`: ordinary market delivery;
- `drop`: player depot;
- `hold`: keep cargo aboard;
- `build`: contribute to an on-site construction requirement;
- `relief`: sell/drop only enough to reach reserve target, retain excess;
- `deliver special`: Panacea, evacuation or contract-specific action.

These policies should reuse the same atoms where possible.

---

# 5. Routes

## 5.1 Route identity

A route should represent an explicit repeated purpose, not merely a list of stops.

Store or derive:

- name;
- intent/purpose;
- stops and actions;
- assigned ships;
- paused state;
- last loop result;
- rolling success/failure reasons;
- cargo moved;
- unmet opportunities;
- health status.

## 5.2 Projection honesty

Current route projection is advisory and uses simplified margins. That is acceptable if clearly labelled.

Projection should show:

- estimated gross margin;
- estimated upkeep;
- path distance/ticks;
- capacity assumption;
- current limiting stock;
- destination capacity warning;
- confidence: `current prices`, `volatile`, or `insufficient history`.

Do not present a precise profit-per-tick number until path, speed, waits, quantity and price impact are included.

## 5.3 Route health

Classify routes:

- `FLOWING`
- `STARVED AT SOURCE`
- `DESTINATION FULL`
- `NO PROFITABLE CARGO`
- `PATH BLOCKED`
- `SHIPLESS`
- `PAUSED`
- `THREATENED`

A route that repeatedly does nothing should surface as unhealthy rather than quietly consuming player attention.

## 5.4 Route editing

Editing a live route must define when changes take effect:

- current ship finishes current atom;
- next queue refill uses new route;
- optional `apply immediately after current leg`;
- no queue mutation midway through a market transaction.

Display ships still finishing the previous version.

---

# 6. Directives and policy automation

## 6.1 Directives should solve reserve maintenance

A directive means:

> Maintain a measurable condition and explain the current plan.

Minimum directive data:

- target system;
- commodity;
- target stock;
- tolerance/hysteresis;
- assigned ship pool;
- source policy;
- max acceptable unit price or loss;
- urgency;
- pause conditions.

## 6.2 Hysteresis

Without hysteresis, ships can thrash around a threshold.

Example:

- activate below 45;
- aim for 60;
- stop dispatching above 55.

The UI should expose a simple target while advanced detail shows the band.

## 6.3 Coverage accounting

A directive must account for:

- current stock;
- cargo already inbound;
- ships currently buying for it;
- other routes expected to serve it;
- destination capacity;
- consumption during travel.

Do not dispatch multiple ships for the same uncovered quantity unless urgency or redundancy policy justifies it.

## 6.4 Directive explanation

The directive panel should show:

```text
Earth FOOD target 60
stock 24 + inbound 18 = covered 42
uncovered 18
Courier “Moth” collecting 18 at Barnard's Star
next review in 5 ticks
```

This turns automation into legible policy rather than magic.

---

# 7. Interrupts

Interrupts are small conditional rules attached to ships or assignments.

Initial set:

- `data bank >= threshold -> sell at nearest eligible vendor`;
- `credits below safe upkeep -> hold at next port`;
- `destination corrupted -> cancel and hold`;
- `destination threatened -> ask/continue/divert according to policy`;
- `cargo no longer needed -> sell best/return/hold`;
- `ship damaged or escort lost -> withdraw` if combat state supports it.

Rules:

- every interrupt is visible;
- every trigger creates a history entry;
- player can disable it;
- hard safety defaults are conservative but never conceal control;
- interrupts inject or replace queue atoms through a defined mechanism;
- interrupted assignment can resume or require acknowledgement according to severity.

---

# 8. Bulk control

Bulk tools should reduce repetition while preserving inspectability.

Required operations:

- assign all eligible idle ships to selected route;
- distribute idle ships across unhealthy routes;
- select by hull, location, assignment or status;
- pause/resume a group;
- set shared interrupt policy;
- recall to nearest safe port;
- employ idle with preview before commitment.

`Employ all idle` must not silently consume scouts, escorts, special cargo carriers or ships reserved by player tags.

Introduce optional ship roles/tags:

- logistics;
- scout;
- escort;
- reserve;
- special;
- custom label.

Default inference can use hull line, but player tags override it.

---

# 9. Pathfinding and scale

Current BFS pathfinding is simple and deterministic. Keep it until profiling or design requires weighted routing.

Future weighted choices may include:

- shortest time;
- lowest upkeep;
- safest known route;
- stay in command range;
- avoid threatened systems;
- prefer gates;
- escort-compatible route.

If added, route policy must be explicit. Do not silently change from shortest-hop to a hidden score.

Cache path results only with a clear invalidation key covering:

- corruption;
- blockades;
- gate changes;
- Deep Drives/inoculation unlocks;
- relevant route policy.

---

# 10. Implementation plan

## Phase 1 — command schema and validators

- document atom schemas;
- add pure validators;
- centralize atom display names and why-lines;
- add command failure codes separate from prose;
- extend journal entries for queue edits;
- no UI redesign yet.

## Phase 2 — selected-ship command home

- stable current/why/queue/assignment layout;
- explicit pause, clear and unassign actions;
- queue history and blocked state;
- accessible buttons and keyboard actions;
- browser-boot coverage.

## Phase 3 — FETCH compiler and preview

- unify market-row, shortage, supply-building and manual fetch entry points;
- quantity and arrival policies;
- one source-ranking pass;
- preview cost/path/result;
- deterministic compilation tests.

## Phase 4 — route health and live editing

- health classifier;
- rolling failure reasons;
- versioned edit application;
- route summary in map and market surfaces;
- projection warnings.

## Phase 5 — directives and interrupts

- coverage accounting;
- hysteresis;
- duplicate-dispatch prevention;
- injectable safety rules;
- explanation surfaces.

## Phase 6 — patrol, escort and emergency intents

Add only after the control model above is stable. These should reuse the same queue, status, why-line and interrupt systems.

---

# 11. Dependency-free tests

Extend existing Node scripts.

Required tests:

1. Every atom validates or returns a stable error code.
2. Intents compile deterministically from the same state.
3. FETCH queue contains the expected movement, buy, movement and arrival atoms.
4. Requested quantity respects hold capacity, source stock, credits and destination need.
5. Cancelling current atom does not delete persistent assignment.
6. Clearing queue can retain or remove assignment according to explicit action.
7. Route refill occurs only when queue is ready.
8. Route edits apply at documented boundary.
9. Directive does not double-dispatch against inbound cargo.
10. Directive hysteresis prevents threshold thrashing.
11. Data-full interrupt inserts a vendor trip and resumes exploration.
12. Stranded-risk interrupt prevents known unaffordable departure.
13. Blocked commands expose a finite retry or terminal failure policy.
14. Why-lines mention controller and reason.
15. Journal replay reproduces queue edits and assignment changes.
16. Ship destruction removes route/directive references cleanly.
17. Bulk employ excludes reserved or incompatible roles.
18. Browser boot renders current atom, queue, assignment and blocked state.
19. Keyboard actions cannot trigger hidden or disabled commands.
20. No control operation introduces a dependency or server requirement.

---

# 12. Acceptance criteria

This overhaul is complete when:

- every selected ship has one canonical command surface;
- the player can distinguish current atom, future queue and persistent assignment;
- cancellation semantics are explicit and safe;
- FETCH is available from every meaningful shortage or market opportunity;
- routes report health rather than silently idling;
- directives account for inbound commitment and avoid duplicate work;
- interrupts are visible, editable and journaled;
- bulk tools respect ship roles and reservations;
- every automated ship can explain itself in one line;
- commands compile deterministically into serializable atoms;
- existing manual control remains available at every automation tier;
- smoke and browser-boot suites cover the new model;
- the game remains zero dependency and playable directly from `index.html`.

## Final design principle

Automation should feel like the player taught the fleet how to think, not like the game took the fleet away.