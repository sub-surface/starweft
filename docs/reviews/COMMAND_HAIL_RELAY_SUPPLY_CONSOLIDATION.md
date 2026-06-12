# STARWEFT Command Surface, Hail Protocol, Relay Expansion and Supply Consolidation

Status: implementation specification and UX review

Related requirement families: `CMD`, `OPS`, `UX`, `NAR`, `SYS`, `MKT`, `PERF`, `A11Y`

## Hard constraints

- Zero dependencies, zero build, direct `file://` play.
- The map remains the game; management surfaces must not become permanent walls around it.
- Simulation state changes only through journaled game actions.
- Existing command grammar, routes and directives are extended rather than replaced by a hidden AI layer.
- Repeated information is aggregated; important decisions remain inspectable and recoverable.
- Every automated action explains what it is doing, why, and what condition will stop it.

---

# 1. Executive assessment

STARWEFT now has several useful control surfaces:

- a selected-ship chip;
- a large selected-ship command bar;
- a Fleet tab containing every ship;
- Routes, Directives and Ops tabs;
- system construction rows with per-resource `supply` buttons;
- one-shot FETCH from market rows;
- a story Log tab;
- ticker headlines and interrupting events.

Individually these are understandable. Together they repeat identity and status, fragment orchestration, and occupy too much permanent screen area.

The player can currently encounter the same ship in:

- the map;
- the selected-ship chip;
- the command bar;
- the Fleet registry;
- a route row;
- a directive row;
- an operation or event.

The same need can appear in:

- a market row;
- a construction material list;
- a supply mission;
- a directive;
- a ticker alert;
- a story event;
- the log.

The issue is no longer absence of controls. It is that the game lacks one coherent answer to:

> What needs attention, what is already being handled, and how do I delegate the rest?

The target is a lighter map-first cockpit built around four concepts:

1. **Selection strip** -- minimal information for what is selected now.
2. **Command Console** -- one expandable home for ship, fleet and network orders.
3. **Hail Protocol** -- one unobtrusive channel for requests, decisions and significant news.
4. **Supply Intent** -- one grammar for delivering a required resource, completing a project or extending the relay web.

This should reduce UI mass while increasing control.

---

# 2. Surface responsibilities

## 2.1 Map

Owns:

- selection;
- movement;
- route/front/faction overlays;
- urgent world markers;
- contextual quick actions.

The map should not permanently display full fleet registries or command forms.

## 2.2 Selection strip

A small floating strip appears when a ship or system is selected.

For a ship:

```text
Sparrow Stitch   -> Mars  18t   hold 8/12   [orders] [focus] [x]
```

For a system:

```text
Mars   POP 8.2M   ALLOY short 17   threat 42t   [supply] [view] [x]
```

Rules:

- one line by default;
- no service-record prose unless expanded;
- status and strongest pressure only;
- tooltips/infobox explain icons;
- click opens the relevant Command Console scope;
- selection can remain visible without covering the infobox.

The current large ship chip can be removed once this strip carries its unique information.

## 2.3 Command Console

The console is the canonical place for active control. It opens from a small command/fleet icon, keyboard shortcut or selection strip.

Scopes:

- `SELECTED` -- current unit/system;
- `FLEET` -- registry, filters, assignments;
- `ROUTES` -- persistent loops and health;
- `POLICIES` -- directives, interrupts, relay expansion;
- `OPS` -- contracts, escorts, embargoes and crisis work;
- `SIGNALS` -- hails and archived decisions.

The console may be a drawer, dock or modal depending on viewport, but one scope is primary at a time.

## 2.4 Market

Owns economic diagnosis and dispatch entry points. It may create Supply/FETCH intents but does not own fleet management.

## 2.5 Hail Protocol

Owns attention and decision communication. It replaces repeated event popups and the undifferentiated story log as the main way the world speaks to the player.

---

# 3. Remove redundant permanent UI

## 3.1 Selected-ship chip

Current ship chip duplicates:

- name and hull;
- destination/status;
- cargo;
- service record;
- selection clearing.

These already appear or can appear through the command surface and map selection.

Target:

- replace with compact selection strip;
- move detailed cargo/manifest/service record into expanded selected scope;
- preserve immediate status and capacity;
- ensure no unique action is lost.

## 3.2 Large command bar

The current command bar provides useful actions but becomes a wide horizontal form with SEND, sell-on-arrival, focus, follow, auto-explore, route assignment, clear orders, release, sell data, raid, Panacea, inoculate, scrap and clear.

Target:

- keep only context-critical primary actions visible;
- move secondary/destructive/special actions into expandable groups;
- use command palette rows rather than one wrapping line;
- selected order/why-line remains always visible when the console is open;
- special actions appear under the relevant task group, not mixed with navigation.

Suggested grouping:

```text
CURRENT     status / why / queue
MOVE        go / follow / return
CARGO       fetch / sell / drop / supply
ASSIGN      route / directive / explore / escort
SPECIAL     survey / sell data / inoculate / raid
UNIT        reserve / rename / scrap / release
```

## 3.3 Fleet registry

The full fleet list should not be a permanent panel competing with the map.

Replace its launcher with a small icon and summary badge:

```text
[ fleet icon ] 12 / 3 idle / 1 blocked
```

The expanded registry supports:

- filter by status, hull, role, assignment, region and alert;
- sort by urgency, location, name or capacity;
- multi-select;
- reserve/tag ships;
- bulk pause/recall/assign;
- compact rows with expandable detail;
- no duplicate service record unless requested.

## 3.4 Floating icon rail

A minimal map-edge rail may expose:

- Command;
- Market;
- Development;
- Overlays;
- Hails;
- Pause/speed where not already stable.

Icons require accessible names and infobox descriptions. Badges show only actionable counts.

---

# 4. Hail Protocol

## 4.1 Purpose

The Hail Protocol is a central attention system for:

- optional encounters;
- contracts;
- crisis appeals;
- rival communications;
- milestone recognition;
- important route/fleet failures;
- construction completion;
- diplomatic offers;
- Chronicle fragments.

It is not a raw debug log and not a second ticker.

## 4.2 Attention levels

### Ambient

Examples:

- flavour transmission;
- market bulletin;
- ordinary arrival;
- low-priority milestone progress.

Delivery:

- ticker or quiet signal count;
- no pause;
- automatically archived if ignored.

### Actionable

Examples:

- contract offer;
- rescue request;
- blocked route requiring choice;
- relay project completed;
- rival proposition.

Delivery:

- non-blocking hail chip;
- persists until deadline/acknowledgement;
- click opens concise decision;
- map focus available.

### Critical

Examples:

- system threatened;
- convoy under attack;
- selected ending decision;
- irreversible doctrine/stance choice.

Delivery:

- prominent persistent hail;
- audio/visual crisis cue;
- no forced pause unless a decision is genuinely time-sensitive and cannot proceed safely in the background.

### Interrupting

Reserved for:

- run-defining irreversible choices;
- first-time tutorial gates;
- victory/defeat;
- explicit player-requested scene.

## 4.3 Hail data model

```js
state.hails = [
  {
    id,
    kind,
    priority: 'ambient' | 'actionable' | 'critical' | 'interrupting',
    source: { type, id },
    createdAt,
    expiresAt,
    status: 'new' | 'seen' | 'resolved' | 'ignored' | 'expired',
    title,
    summary,
    focus: { type, id },
    actionRef,
    dedupeKey,
    count,
    lastAt
  }
]
```

Prose/content may remain in event definitions; persistent hail state should be compact and serializable.

## 4.4 Deduplication and aggregation

Repeated identical events should not create dozens of log rows.

Rules:

- use `dedupeKey` by event type and relevant entity;
- increment count and update last occurrence;
- preserve first and latest timestamp;
- severity escalation may reopen a resolved group;
- routine deliveries aggregate by route or time window;
- identical route failures become one hail with affected ships/occurrences;
- player can expand a group for detail.

Example:

```text
Route “Sol Relief” delivered FOOD x18 over 6 arrivals.
```

not six nearly identical entries.

## 4.5 Ignoring is a state

A hail may:

- expire harmlessly;
- count as declining a faction request;
- allow an autonomous actor to proceed;
- worsen a crisis;
- be archived with no effect.

The consequence must be specified by the event, not guessed by UI.

## 4.6 Archive replaces the current log tab

The Signals archive shows:

- active hails;
- unresolved decisions;
- grouped recent activity;
- resolved choices;
- Chronicle-significant events.

Filters:

- crisis;
- economy;
- fleet;
- factions;
- discoveries;
- milestones;
- story.

Debug-level repeated events remain available only in developer diagnostics.

---

# 5. Generalised Supply Intent

## 5.1 Current problem

Construction currently lists missing resources and offers individual `supply` buttons. This works but exposes implementation details:

- the player must understand depot versus ship cargo;
- building requirements are split into separate resource clicks;
- supply missions are tied closely to construction;
- relay expansion requires remembering materials and repeating manual steps;
- market shortages, directives, building supply and relief use similar verbs through different interfaces.

## 5.2 Supply as one first-class outcome

Define:

```text
SUPPLY destination WITH requirement FROM sourcePolicy USING shipPolicy
```

Requirement types:

- fixed commodity quantity;
- raise stock to target;
- fill uncovered reserve gap;
- complete building material package;
- provision passenger journey;
- sustain bastion for duration;
- establish relay/radar package;
- relief package with multiple commodities.

## 5.3 Supply plan

A DOM-free planner returns:

```js
{
  destination,
  requirements: [{ commodity, required, local, inbound, uncovered }],
  sources: [...],
  ships: [...],
  estimatedCost,
  estimatedTicks,
  risks,
  steps,
  completionAction
}
```

The UI shows one confirmation rather than separate opaque missions.

## 5.4 Multi-resource project supply

For a building or relay:

```text
SUPPLY PROJECT: Relay Beacon at Epsilon Eridani
ALLOY 8: local 0, inbound 3, uncovered 5
TECH 2: local 2, inbound 0, uncovered 0

Assign:
- Moth fetches 5 ALLOY from Barnard's Star
On arrival: deposit -> complete project if all requirements met
```

The project remains real and material; the planner merely composes actions.

## 5.5 Completion policies

- `DEPOSIT_ONLY`
- `BUILD_WHEN_READY`
- `MAINTAIN_TARGET`
- `RETURN_TO_ASSIGNMENT`
- `REPEAT_UNTIL_COMPLETE`

Completion is explicit and journaled.

## 5.6 Inbound accounting

Supply planning must include:

- current depot/market/project stock;
- idle local ship cargo;
- cargo already in transit;
- existing route/directive commitments;
- destination capacity;
- consumption before arrival;
- other project reservations.

This prevents duplicate dispatch.

---

# 6. Relay Protocol

## 6.1 Player fantasy

A relay network should feel like the weave teaching itself to grow.

The player defines the frontier direction and policy; ships gather the package, deliver it, construct the relay and bring the next region into command range.

## 6.2 One-shot relay order

From a frontier system:

```text
ESTABLISH RELAY HERE
```

The planner:

1. verifies the system is discovered/surveyed as required;
2. verifies it lies outside or near the edge of current coverage;
3. calculates material package;
4. selects source(s);
5. selects eligible ship(s);
6. previews cost, route and new coverage;
7. creates project and visible queues;
8. builds when material arrives.

The player may override source and ships.

## 6.3 Persistent expansion protocol

Later automation:

```text
EXPAND NETWORK
Direction: coreward / region / selected chain / nearest uncovered
Spacing: safe / efficient / maximum reach
Budget reserve: 2,500 credits
Risk: avoid threatened / allow frontier / require escort
Stop when: N relays / target reached / budget floor / danger
```

This is a policy controller that creates one relay project at a time. It must never spawn invisible free infrastructure.

## 6.4 Candidate scoring

A relay candidate may consider:

- uncovered systems gained;
- distance from existing coverage;
- path safety;
- strategic bridge/chokepoint value;
- nearby population/industry;
- faction access;
- Scourge pressure;
- future relay options;
- material delivery cost.

Show the main reasons for the chosen candidate.

## 6.5 Failure and recovery

Protocol pauses when:

- no eligible candidate;
- budget reserve reached;
- materials unavailable;
- all assigned ships lost/blocked;
- target becomes corrupted;
- path is severed;
- player pauses policy.

It creates one actionable hail explaining the block, not repeated log spam.

---

# 7. One orchestration home

## 7.1 Policy registry

The Command Console's Policies scope lists:

- stock directives;
- relay expansion protocols;
- evacuation protocols;
- auto-explore return rules;
- auto-yard policy;
- reserved fleet roles;
- future patrol/escort policies.

Each row shows:

- desired condition;
- assigned assets;
- current action;
- covered/uncovered amount;
- health;
- pause/edit/delete;
- why it is blocked.

## 7.2 Fleet roles and reservations

Ships can be tagged:

- cargo;
- passenger;
- scout;
- escort;
- construction;
- reserve;
- special.

Policies may use allowed roles. `Employ idle` and auto-yards respect reserved/special ships.

## 7.3 Scope transitions

Clicking an entity in one scope should retain context:

- hail -> affected system -> supply plan;
- route health -> assigned ship -> queue;
- relay protocol -> candidate system -> coverage overlay;
- construction project -> missing package -> supply intent;
- fleet alert -> blocked order -> source/destination.

Avoid closing every surface and forcing the player to reconstruct context.

---

# 8. Responsive and accessible layout

## Wide

- icon rail at map edge;
- selection strip near lower map edge;
- Command Console opens as one side drawer;
- infobox retains reserved slot;
- no second permanent ship box.

## Compact laptop

- console replaces or overlays one support panel at a time;
- selected strip remains one line;
- action groups wrap vertically, not into cramped horizontal rows.

## Narrow

- bottom sheet/drawer;
- tabs become scrollable but labelled;
- primary action stays visible;
- no canvas/map interaction blocked by invisible overlay.

Accessibility:

- native buttons and labels;
- keyboard shortcut to open Command and Hails;
- focus returns to launcher/selected entity;
- badge counts have accessible text;
- urgent hails use restrained live announcements;
- icon-only rail has `aria-label` and infobox coverage.

---

# 9. Data ownership

Recommended modules:

- `SW.supply` -- DOM-free project/requirement planning;
- `SW.hails` -- DOM-free dedupe, lifecycle and consequence state;
- existing `SW.ships.intent` -- command compilation;
- existing routes/directives -- persistent controllers;
- UI modules render reports and dispatch actions.

Do not put supply policy, hail dedupe or relay candidate scoring inside UI rendering.

Derived reports:

```js
SW.commandReport.build(state, selection)
SW.supply.plan(state, request)
SW.hails.activeReport(state)
SW.relay.planExpansion(state, policy)
```

---

# 10. Save and migration

Potential additive state:

- active hails/archive summaries;
- project requirements/reservations;
- relay expansion policies;
- ship role/reservation tags;
- UI preference for console scope only if useful.

Migration:

- old story log remains readable and may be imported as archived legacy entries;
- do not convert every historical log row into an active hail;
- existing supply missions remain valid until complete or are mapped to new project intents;
- existing routes/directives retain assignments;
- default ship roles derive from hull but are not permanently written until needed;
- version and validate persistent policy shapes.

---

# 11. Implementation order

## Phase 0 -- inventory and baseline

- map every current ship/fleet/route/ops/log control to an owner;
- record screen occupancy and duplicate information;
- count repeated log/event categories in long runs;
- identify every construction/supply entry point.

## Phase 1 -- Hail Protocol foundation

- add hail lifecycle and dedupe;
- route new optional events to hails;
- retain current log as fallback archive;
- aggregate routine repeats;
- add Signals launcher and active count.

This should land early because later systems communicate through it.

## Phase 2 -- general Supply planner

- multi-resource requirements;
- local/inbound/uncovered accounting;
- project reservation;
- existing construction buttons call one planner;
- visible queue and completion policy.

## Phase 3 -- Relay one-shot protocol

- relay project package;
- coverage preview;
- ship/source selection;
- build-on-arrival;
- blocked hail.

## Phase 4 -- Command Console and UI reduction

- minimal selection strip;
- remove redundant ship chip;
- small fleet/command launchers;
- grouped selected-unit actions;
- responsive fleet registry;
- Signals archive replaces raw log as player-facing history.

## Phase 5 -- persistent relay/network policies

- relay candidate scoring;
- budget/risk/stop settings;
- one-project-at-a-time orchestration;
- policy registry;
- fleet roles/reservations.

## Phase 6 -- extend to passengers, patrols and emergencies

Passenger evacuation, escort and Scourge response reuse the same hails, supply projects, policy registry and command console.

---

# 12. Dependency-free tests

Required tests:

1. hail dedupe groups repeated identical events;
2. severity escalation reopens a grouped hail correctly;
3. ignored/expired/resolved hail consequences execute once;
4. routine grouped events do not grow state unbounded;
5. legacy log imports as archive without active consequences;
6. supply plan accounts for local, inbound and reserved quantities;
7. two planners cannot reserve the same cargo twice;
8. multi-resource project completes only when all requirements are satisfied;
9. building completion action executes once;
10. relay coverage preview matches post-build command range;
11. relay planner never creates free materials or credits;
12. persistent expansion respects budget floor and stop conditions;
13. corrupted/unreachable relay candidate pauses with one hail;
14. supply/relay queues remain visible and deterministic;
15. existing routes/directives remain intact after one-shot project work where policy says resume;
16. ship role reservations survive save round-trip;
17. employ-idle excludes reserved/special ships;
18. selected strip renders ship and system states without duplicate permanent box;
19. Command Console renders at wide, compact and narrow fixture dimensions;
20. no horizontal action-row overlap/wrapping corruption;
21. Signals archive filters and expands grouped detail;
22. every icon launcher has accessible name and infobox text;
23. all mutations route through `SW.game.actions.*`;
24. no dependency or build step is introduced.

Performance evidence:

- active/archived hail count over long runs;
- DOM update time before/after log aggregation;
- Command Console render time for large fleets;
- supply planning time with wide galaxies;
- relay candidate scoring cadence.

---

# 13. Acceptance criteria

This work is complete when:

- selecting a ship no longer opens redundant large status surfaces;
- the player can reach fleet and command orchestration from small stable launchers;
- one Command Console owns selected, fleet, route, policy and Ops control;
- the current order, queue and why-line remain easy to inspect;
- repeated events are aggregated rather than painting an obstructive log;
- optional world communication arrives through non-blocking hails;
- important unresolved hails remain discoverable without constant interruption;
- construction, relief and relay needs use one Supply intent and planner;
- multi-resource projects show local, inbound and uncovered requirements;
- a one-shot relay order can source, deliver and construct transparently;
- a later expansion protocol grows the network under explicit budget/risk rules;
- automated policies pause and explain blocks rather than silently failing;
- the map gains space rather than losing it;
- responsive and keyboard behavior is defined and tested;
- all systems remain deterministic, journaled, offline and zero dependency.

## Final principle

The player should command a civilisation through a few clear signals and intentions, not supervise the plumbing of every panel.