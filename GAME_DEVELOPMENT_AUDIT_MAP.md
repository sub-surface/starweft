# STARWEFT Whole-Game Development Audit Map

Status: review framework and sequencing document

This document defines the major areas that should remain visible throughout development, not only when a particular feature is being built. It is intended to prevent local polish from hiding systemic weaknesses and to give future reviews a shared vocabulary.

## Hard constraints

STARWEFT remains:

- zero dependency;
- zero build step;
- playable from `file://` by opening `index.html`;
- plain HTML, CSS, JavaScript, Canvas 2D and WebAudio;
- deterministic and headless-friendly;
- testable with Node's standard library;
- readable from source without framework knowledge.

A proposal that requires npm, a package runtime, a CDN, a bundler, a transpiler, a server, a framework, a test package, or a native/WASM toolchain is out of scope unless the project explicitly changes its founding distribution promise.

---

# 1. The permanent game-development review areas

Every meaningful release should be reviewed through the following lenses.

## 1.1 Vision, pillars and scope

Questions:

- What is the game fundamentally about?
- Which activity should occupy most player attention?
- What emotional rhythm should a session produce?
- Which proposed features reinforce the core fantasy, and which merely add surface area?
- What is explicitly not being built?

For STARWEFT, the governing test is:

> Does this feature deepen gathering, moving, delivering, discovering what should move next, or protecting the movement of it?

The map remains the game. Panels should explain and command the map rather than replacing it with a spreadsheet game.

Review outputs:

- pillar compliance notes;
- feature cuts;
- non-goals;
- an explicit statement of the player's current fantasy at early, mid and late game.

## 1.2 Core loop and verbs

Questions:

- What does the player do every thirty seconds?
- Is the basic action satisfying before progression systems are added?
- Do advanced systems automate or deepen the same verbs, or replace them with unrelated play?
- Is the result of an action visible, legible and emotionally meaningful?
- Can the player recover when the loop fails?

STARWEFT's loop should remain:

1. detect need or opportunity;
2. choose cargo, source and destination;
3. dispatch a ship;
4. observe travel and consequence;
5. improve or automate the route;
6. respond when the world changes.

Review outputs:

- loop timing;
- friction inventory;
- action-to-feedback latency;
- failure and recovery paths;
- automation ladder.

## 1.3 Controls, commands and interaction grammar

Questions:

- Can the player express intent directly?
- Is command state visible?
- Can every automated unit explain what it is doing and why?
- Is cancellation safe and obvious?
- Do similar actions behave consistently across panels?
- Does scale increase power without destroying manual control?

Review outputs:

- command grammar;
- queue model;
- selection model;
- interrupt rules;
- keyboard and pointer interaction map;
- bulk-operation rules.

## 1.4 Onboarding, teaching and first-hour structure

Questions:

- What does the player understand after one minute, ten minutes and one hour?
- Does the tutorial teach by making the player perform the real loop?
- Are concepts introduced in dependency order?
- Can an experienced player skip or accelerate teaching?
- Does failure during teaching produce a useful recovery path rather than a dead run?

Review outputs:

- first-session storyboard;
- concept dependency graph;
- tutorial state machine;
- skip/replay policy;
- first-hour economy guarantees.

## 1.5 Progression and pacing

Questions:

- What new decisions become available over time?
- Does power growth remove tedium without removing consequence?
- Is there a stable rhythm of mastery, pressure and payoff?
- Are research, money, fleet size and map reach advancing at compatible rates?
- Can the player become permanently stalled or accidentally trivialize the game?

Review outputs:

- milestone curve;
- unlock schedule;
- resource sinks and faucets;
- soft and hard gates;
- catch-up and anti-snowball systems;
- endgame readiness conditions.

## 1.6 Economy and balance

Questions:

- Are resources generated, transformed and consumed for understandable reasons?
- Does scarcity create decisions rather than helplessness?
- Are prices measuring real conditions or merely producing arbitrary profit windows?
- Can one dominant strategy erase the rest of the game?
- Does player success visibly alter worlds?

Review outputs:

- economy graph;
- stock-flow accounting;
- balance telemetry;
- dominant-strategy tests;
- deprivation and abundance scenarios;
- economic health indicators.

## 1.7 World simulation and systemic consequence

Questions:

- Does the world evolve when the player is not looking?
- Are systems causally linked rather than separately animated?
- Do geography, travel time and network structure matter?
- Can players understand the causes of major world changes?
- Are off-screen systems simulated at the right level of detail?

Review outputs:

- tick pipeline;
- causal diagrams;
- simulation levels of detail;
- event provenance;
- world-state explanations;
- invariant checks.

## 1.8 AI, rivals and opposition

Questions:

- Do opponents operate through the same world rules?
- Can the player read, predict and counter them?
- Are they pursuing goals or merely applying modifiers?
- Do rivals create stories through logistics rather than cheating?
- Does opposition scale through strategy rather than inflated numbers alone?

Review outputs:

- rival goals;
- action budgets;
- information model;
- convoy and route representation;
- counterplay;
- failure and recovery behavior.

## 1.9 Challenge, failure and recovery

Questions:

- What can go wrong at local, regional and run-wide scales?
- Can the player diagnose the failure?
- Is the loss proportional to the mistake?
- Are there meaningful emergency actions?
- Is defeat earned, surprising in a good way, and replayable?

Review outputs:

- failure taxonomy;
- warning windows;
- emergency verbs;
- bankruptcy recovery;
- unwinnable-state detection;
- defeat explanation.

## 1.10 Narrative, content and worldbuilding

Questions:

- Does content create a mechanical situation unavailable elsewhere?
- Does prose clarify consequence rather than pause the game for flavor alone?
- Are characters persistent enough to be remembered?
- Does content react to the simulation state?
- Are repeated events varied mechanically, not only verbally?

Review outputs:

- content templates;
- stateful predicates;
- character recurrence rules;
- consequence signatures;
- repetition budgets;
- content coverage matrix.

## 1.11 Game feel and feedback

Questions:

- Does every important action have visual, audio and textual confirmation?
- Is feedback proportional to significance?
- Can the player see the network becoming stronger?
- Does the game feel alive while paused, slow and fast?
- Are failures communicated before they become mysterious?

Review outputs:

- feedback matrix;
- sound hierarchy;
- animation timing;
- camera responses;
- celebration and warning tiers;
- reduced-motion alternatives.

## 1.12 Information design and user interface

Questions:

- What is the most important question on each screen?
- Is information organized by decision rather than data type?
- Are panels stable or visually jittery?
- Is the map still readable beneath supporting surfaces?
- Can the player move from diagnosis to action without losing context?

Review outputs:

- screen hierarchy;
- panel responsibilities;
- action proximity;
- information density rules;
- narrow-screen behavior;
- interaction consistency.

## 1.13 Accessibility

Questions:

- Is meaning carried by more than color?
- Can controls be reached and understood with keyboard navigation?
- Are icon-only controls named?
- Can motion, flashing and audio intensity be reduced?
- Is text legible at different sizes and contrast needs?

Review outputs:

- semantic control audit;
- focus-order audit;
- contrast and color audit;
- reduced-motion policy;
- audio-independent cues;
- text scaling behavior.

## 1.14 Visual direction and rendering

Questions:

- Does the visual language reinforce hierarchy and mood?
- Is visual complexity spent where it supports decisions?
- Are far-zoom and close-zoom views both legible?
- Do effects communicate state rather than obscure it?
- Is the renderer stable across device pixel ratios and window sizes?

Review outputs:

- LOD policy;
- draw-order specification;
- palette roles;
- icon language;
- camera rules;
- render-budget targets.

## 1.15 Audio direction

Questions:

- Does audio communicate state as well as mood?
- Are repeated operational sounds fatigue-resistant?
- Does music respond smoothly to danger, discovery and system view?
- Can the game remain understandable when muted?
- Are browser autoplay and missing-audio cases safe?

Review outputs:

- event-to-sound map;
- dynamic music states;
- repetition limits;
- mute and accessibility behavior;
- performance budget.

## 1.16 Performance and scalability

Questions:

- Which costs scale with systems, ships, routes, effects and panel rows?
- Is work repeated within the same tick or frame?
- Are hidden surfaces still rendering or recalculating?
- Does simulation speed remain stable at 10x?
- Are optimizations based on profiles rather than intuition?

Review outputs:

- frame and tick budgets;
- complexity notes;
- benchmark scenarios;
- allocation audit;
- caching policy;
- simulation and render LOD.

## 1.17 Reliability, saves and migration

Questions:

- Can a run survive reload, version updates and partial corruption?
- Are saves validated before becoming active?
- Are migrations explicit and testable?
- Is autosave atomic enough for browser storage?
- Can the player export and recover their run?

Review outputs:

- save schema;
- migration chain;
- validation rules;
- fallback slots;
- corruption recovery;
- replay and journal policy.

## 1.18 Testing and determinism

Questions:

- Can bugs be reproduced from seed and journal?
- Are core invariants tested over long runs?
- Does full browser wiring load without a real browser?
- Are balance claims tested with bots rather than anecdotes?
- Are source encoding and offline boot protected?

Review outputs:

- deterministic fixtures;
- invariant suite;
- browser-boot checks;
- seeded scenario tests;
- performance smoke tests;
- source-integrity tests.

## 1.19 Developer tools and telemetry

Questions:

- Can a developer understand why the simulation produced a result?
- Can balance curves be exported without external services?
- Are hot systems, blocked factories and failed commands inspectable?
- Can long bot runs be started, stopped and compared?
- Can content and tuning be validated automatically?

Review outputs:

- F3 diagnostics;
- CSV/JSON exports;
- seeded batch runner;
- balance dashboards;
- content validators;
- reproducible bug report format.

## 1.20 Replayability, endings and long-term structure

Questions:

- What differs meaningfully between seeds and run settings?
- Do origins, aptitudes, stances and rivals change decisions?
- Are endings produced by the run's logistics history?
- Does the late game ask the player to use the network they built?
- Is meta-progression additive rather than a substitute for mastery?

Review outputs:

- run-variation matrix;
- endgame readiness checks;
- ending-state branches;
- legacy unlock policy;
- postgame and sandbox rules.

## 1.21 Distribution and archival durability

Questions:

- Can the game still be copied as a folder and opened offline?
- Are all assets local or generated?
- Are browser APIs used with graceful fallbacks?
- Is the source understandable without reconstructing a toolchain?
- Can an old build remain playable years later?

Review outputs:

- offline boot test;
- dependency scan;
- asset inventory;
- browser support statement;
- archival release checklist.

---

# 2. Review cadence

## Every change

Check:

- pillar relevance;
- deterministic behavior;
- no dependency/build-step regression;
- action routing through established simulation boundaries;
- tests touched when behavior changes;
- no hidden-state leakage;
- no `NaN`, `undefined`, encoding corruption or silent failure in UI.

## Every feature milestone

Review:

- first-use discoverability;
- interaction consistency;
- performance at standard and stress-scale seeds;
- accessibility;
- save compatibility;
- feedback quality;
- whether the feature creates a new decision or merely more maintenance.

## Every release candidate

Run:

- full smoke suite;
- browser boot suite;
- deterministic replay fixtures;
- save round-trip and prior-version migration tests;
- all-seed bot scenarios;
- narrow and wide layout checks;
- keyboard-only pass;
- audio-muted pass;
- 1x, 3x and 10x simulation stress runs;
- source and dependency integrity scan.

---

# 3. Current STARWEFT priority map

## Priority A — core comprehension and control

1. First-hour Sol tutorial and explicit first fetch.
2. Selected-ship command home, queue editing and interrupts.
3. Known Economy / Weave Health terminal.
4. Clear progression from manual errand to route to directive to fleet policy.

Why first: deeper simulation is wasted when players cannot understand or command it cleanly.

## Priority B — world consequence

1. Rival convoys as inspectable entities.
2. Scourge pressure that creates regional logistics emergencies rather than random attrition.
3. Economic pressure explanations and balance telemetry.
4. World-generation validation for viable but distinct openings.

Why second: the game's promise depends on the network changing history.

## Priority C — presentation and durability

1. UI surface decomposition without frameworks.
2. Accessibility and input consistency.
3. render/UI profiling and explicit budgets.
4. save migration, journal replay and reproducible bug reports.

Why third: these allow the project to grow without losing the simplicity that makes it distinctive.

## Priority D — content breadth

1. stateful encounter scenes;
2. recurring traders and factions;
3. Badlands-specific discoveries;
4. stance-specific late-game situations;
5. chronicle and post-run causal summary.

Why fourth: content should inhabit stable systems rather than compensate for unclear ones.

---

# 4. Proposed specification series

This audit map is followed by targeted documents covering:

1. `CORE_LOOP_ONBOARDING_PROGRESSION_REVIEW.md`
2. `COMMAND_AUTOMATION_CONTROL_REVIEW.md`
3. `WORLD_SIMULATION_BALANCE_CONTENT_REVIEW.md`
4. `PRESENTATION_PERFORMANCE_ACCESSIBILITY_REVIEW.md`
5. `RELIABILITY_SAVES_TOOLING_REVIEW.md`
6. `MARKET_TERMINAL_REVIEW.md`

Each document should remain independently reviewable and should define:

- observed current behavior;
- critical weaknesses;
- target player experience;
- implementation boundary;
- phased changes;
- dependency-free tests;
- acceptance criteria;
- explicit non-goals.

---

# 5. Whole-game definition of healthy development

STARWEFT is developing healthily when:

- new features strengthen the logistics fantasy;
- complexity appears as richer decisions, not merely more controls;
- automation rewards mastery while remaining inspectable;
- the world changes because goods, ships, people and threats actually move;
- the player can understand cause and effect;
- the map stays primary;
- failure creates emergency logistics rather than arbitrary punishment;
- content changes mechanics and remembers prior choices;
- performance work follows measurement;
- saves and deterministic tests make experimentation safe;
- every build remains a folder that can be opened offline;
- no dependency becomes necessary to understand, build or preserve the game.

The purpose of this framework is not to slow development with checklists. It is to preserve the unusual thing STARWEFT is already becoming: a small, inspectable program capable of producing a large and legible world.