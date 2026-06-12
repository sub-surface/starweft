# STARWEFT Documentation Architecture and Traceability Review

Status: proposed project-wide documentation standard

## Constraint

Documentation must preserve STARWEFT's founding production model: zero dependencies, zero build step, direct `file://` play, plain-text repository-local records, and no external wiki or hosted service required to reconstruct the project.

---

# 1. Why documentation matters here

STARWEFT is not only software. It is simultaneously:

1. a promised player experience;
2. a collection of interacting rules;
3. a changing body of content;
4. a deterministic simulation;
5. a balance experiment;
6. an interface for understanding causality;
7. a product that must survive saves and versions;
8. a history of accepted and rejected decisions.

Documentation should preserve the relationship between these layers. For every major feature it should answer:

- Why does it belong?
- What should the player experience?
- What exact rules produce that experience?
- What systems does it depend on or alter?
- How does the player understand and control it?
- How can it fail or recover?
- What state must be saved and migrated?
- What evidence demonstrates that it works?
- What alternatives were rejected, and why?

The purpose is not bureaucracy. It is to stop a systemic game becoming a collection of locally reasonable but globally contradictory features.

---

# 2. Current diagnosis

## 2.1 `SPEC.md` is the correct north star, but it is overloaded

It currently acts as:

- creative vision;
- completeness definition;
- feature design;
- status report;
- migration plan.

It is strongest when describing the whole game: one deeply served logistics verb, the map as the game, the Sol cold open, curved deprivation, cartography as a profession, four UX surfaces, three endings, deterministic replay and zero dependencies.

It is less precise about:

- partial implementation;
- exact command semantics;
- formulas;
- failure and recovery;
- accessibility;
- save compatibility;
- performance targets;
- evidence and tests;
- dependencies between workstreams.

The answer is not to make `SPEC.md` enormous. It should remain concise and authoritative about the finished game, while detailed system specs and a requirements index hold implementation truth.

## 2.2 The review PRs need one traceability spine

The current review series covers:

- Market Terminal and Known Economy;
- whole-game audit;
- core loop, onboarding and progression;
- commands, automation and fleet control;
- world simulation, balance and systemic content;
- presentation, performance and accessibility;
- reliability, saves and developer tooling.

These documents contain a strong implementation layer, but without a central index they remain parallel essays. The project needs to distinguish:

- proposal;
- accepted requirement;
- implemented behavior;
- verified behavior;
- shipped behavior;
- open question;
- superseded decision.

## 2.3 Binary completeness markers are insufficient

A single `✅` may mean code exists, a prototype exists, tests exist, or the full intended experience exists. Those are different states.

Examples:

- command grammar v1 exists, while queue editing and interrupts remain;
- market source/sink indexing exists, while macroeconomic health does not;
- a journal exists, while replay compatibility and state hashes remain undefined;
- an opening sanity test exists, while full seed viability validation remains future work.

## 2.4 Terminology needs correction

- “Pure-function core” should become “deterministic DOM-free simulation core with centralized mutation boundaries.”
- “Price index” must distinguish source/sink lookup from macroeconomic price level.
- “Replay complete” should require action schemas, migration compatibility and verification.
- “Throughput,” “inflation,” “profit per tick” and “utilisation” should appear only when measured.
- WASM or Tauri should not be presented as ordinary runtime options while zero dependencies and zero build remain pillars.

---

# 3. Proposed documentation architecture

```text
SPEC.md                       north-star completeness specification
REQUIREMENTS_INDEX.md         traceability and status spine
DOCUMENTATION_RIGOR_REVIEW.md this standard

docs/
  glossary.md
  architecture.md
  state-model.md
  test-strategy.md
  balance-strategy.md
  typing-guide.md
  release-checklist.md

  systems/
    commands.md
    onboarding-progression.md
    market-economy.md
    world-generation.md
    in-system-logistics.md
    exploration.md
    rivals.md
    scourge.md
    combat-defence.md
    operations-contracts.md
    encounters-cast.md
    identity-aptitudes-stance.md
    endings.md
    badlands.md
    presentation-accessibility.md
    audio.md
    saves-replay.md

  decisions/
    ADR-0001-classic-scripts.md
    ADR-0002-zero-dependency-definition.md
    ADR-0003-state-mutation-model.md
    ADR-0004-typed-javascript.md

  evidence/
    opening-balance.md
    market-performance.md
    command-replay.md
    accessibility-pass.md
    save-migrations.md
    endgame-bots.md

  releases/
    v3.0.0.md
```

This is a target structure. Existing documents can be absorbed gradually.

---

# 4. Document responsibilities

## `SPEC.md`

Owns:

- vision and fantasy;
- pillars;
- core verb;
- player journey;
- major system relationships;
- UX ontology;
- intended endings;
- architectural constraints;
- high-level sequence;
- non-goals.

It should not own every formula, edge case, state field or test detail.

## `REQUIREMENTS_INDEX.md`

Owns one row per independently verifiable requirement:

- ID;
- outcome;
- design status;
- implementation status;
- verification status;
- release status;
- owning spec;
- code/test/evidence paths;
- dependencies and blockers.

## System specifications

Each major system doc should contain:

1. player fantasy;
2. relation to GATHER → MOVE → DELIVER;
3. current behavior;
4. problems observed;
5. target experience;
6. terminology;
7. rules and formulas;
8. authoritative and derived state;
9. commands and automation;
10. UI and feedback;
11. failure and recovery;
12. cross-system interactions;
13. accessibility;
14. performance;
15. save/migration impact;
16. telemetry;
17. tests and evidence;
18. phased implementation;
19. acceptance criteria;
20. non-goals and open questions.

## Decision records

Use short ADRs for choices with meaningful alternatives or long-term consequences. Record context, decision, alternatives, consequences, migration and the evidence that would justify reopening it.

## Evidence reports

Evidence reports record question, build, seeds/scenario, method, metrics, results, limitations and resulting status change. Balance and performance claims should point to evidence rather than memory.

---

# 5. Requirement identity and status

Use stable families:

- `VIS` vision and pillars
- `LOOP` core logistics loop
- `CMD` commands and automation
- `ONB` onboarding
- `PROG` progression
- `GEN` world generation
- `ECON` economy and prosperity
- `MKT` Market Terminal
- `SYS` in-system logistics
- `EXPL` exploration
- `RIV` rivals
- `SCR` Scourge
- `COM` combat and defence
- `OPS` contracts and operations
- `NAR` encounters and cast
- `YOU` identity, aptitudes, doctrine and stance
- `END` endings
- `BAD` Badlands
- `UX` interface
- `A11Y` accessibility
- `AUDIO` audio
- `PERF` performance
- `SAVE` saves and migration
- `REP` replay and journal
- `TEST` testing
- `TOOL` developer tooling
- `DIST` distribution
- `DOC` documentation
- `TYPE` static type model

Example IDs:

```text
CMD-001 General FETCH intent
CMD-002 Visible atomic queue
CMD-003 Queue editing
CMD-004 Injectable interrupts
MKT-001 Known-space scope
MKT-002 Weave Health
GEN-001 Opening viability validator
END-001 Cure readiness model
```

### Design status

`IDEA`, `PROPOSED`, `ACCEPTED`, `EXPERIMENTAL`, `SUPERSEDED`, `REJECTED`

### Implementation status

`NONE`, `PROTOTYPE`, `PARTIAL`, `IMPLEMENTED`, `LEGACY`

### Verification status

`UNTESTED`, `INVARIANT`, `SCENARIO`, `BROWSER`, `BALANCE`, `MANUAL`, `VERIFIED`

### Release status

`UNPLANNED`, `BACKLOG`, `TARGETED`, `BLOCKED`, `CANDIDATE`, `SHIPPED`

IDs are never recycled. Rejected and superseded requirements remain visible with reasons.

---

# 6. Typed JavaScript as documentation that can argue back

## Decision

Adopt TypeScript-powered checking for ordinary JavaScript through JSDoc, `// @ts-check`, `jsconfig.json` and declaration files.

Do not migrate the shipped source to `.ts` while zero build remains a pillar.

This preserves:

- direct browser execution;
- direct Node execution;
- classic scripts;
- zero runtime dependency;
- zero build step.

It adds structural checks for state and subsystem contracts.

## Proposed files

```text
jsconfig.json

types/
  starweft.d.ts
  state.d.ts
  commands.d.ts
  saves.d.ts
  events.d.ts
  reports.d.ts

docs/typing-guide.md
```

A single `types/starweft.d.ts` is acceptable initially.

## Priority types

- `GameState`
- `SystemState`
- `Ship`
- `ShipControl`
- `Route`
- `Directive`
- `CommandAtom`
- `Intent`
- `ActionResult`
- entity ID unions
- `Rival`
- `ScourgeState`
- `EventDefinition`
- `SaveEnvelope`
- `MarketReport`
- `WeaveHealthReport`
- telemetry samples.

Use discriminated unions for command atoms, intents, event outcomes and statuses.

Documentation explains meaning and transitions. Types enforce legal structure. Runtime validators still protect saves, imports and localStorage data.

## Rollout

1. define declarations;
2. type pure reports and validators;
3. type saves and migrations;
4. type command compiler and action results;
5. type economy/generation;
6. type rivals/Scourge;
7. type split UI modules;
8. migrate legacy monoliths last.

Policy:

> New modules must be type-checked. Substantially changed modules become type-clean within the changed boundary. Untouched legacy code migrates incrementally.

Avoid enabling the whole repository and then hiding errors with `any` or `@ts-ignore`.

A full `.ts` migration requires an explicit future decision to change the zero-build contract.

---

# 7. Ideas from the review series to enter the requirements index

## Core loop and onboarding

- opening begins with a named need, not generic arbitrage;
- delivery exposes need, plan, commitment, transit and consequence;
- successful logistics shows world repair;
- Sol prologue uses real actions and state-driven goals;
- tutorial has recovery and equivalent skip state;
- progression is errand → loop → reserve → region → history;
- unlocks represent mastery;
- pacing is measured across seeds.

## Commands and automation

- separate intent, queue and persistent assignment;
- define ownership precedence;
- FETCH is first-class;
- pause, clear, cancel and unassign are distinct;
- blocked ships expose reasons;
- routes expose health;
- directives account for inbound cargo and use hysteresis;
- interrupts are visible and journaled;
- automation never removes manual control;
- every ship explains itself.

## Market and economy

- known metrics never leak undiscovered systems;
- economic policy lives in DOM-free analytics;
- Weave Health is decomposable;
- base and nominal inventory values are distinct;
- price level differs from source/sink lookup;
- sources and sinks are both shown;
- systemic pressures are actionable;
- estimates and measurements are labelled honestly.

## World simulation and content

- one physical stock-flow truth;
- event provenance and factory blocked reasons;
- opening viability validator;
- structural run fingerprints;
- path-aware geography;
- partial capability rather than universal emptiness;
- rivals use goals, real paths, cargo and solvency;
- Scourge forms a readable front;
- threat creates emergency logistics;
- refugees are path-aware;
- encounters have mechanical signatures;
- balance uses reproducible bots.

## Presentation and accessibility

- every surface has one primary question;
- map remains primary;
- color is never the only state cue;
- LOD follows decision relevance;
- labels use priority and budgets;
- UI splits by major surface without a framework;
- render stamps limit unnecessary updates;
- keyboard, focus, contrast and reduced motion are defined;
- feedback uses routine, milestone and crisis tiers;
- F3 measures frame, tick, draw, labels and UI work.

## Reliability and tooling

- explicit save envelope and authoritative state;
- previous autosave recovery;
- deterministic migrations and fixtures;
- repair/refusal policy;
- versioned journal actions;
- state hashes and replay verification;
- local reproducible bug reports;
- dependency-free batch runs;
- source, encoding, ID and reference validation.

---

# 8. Unfulfilled `SPEC.md` areas requiring dedicated specs

## In-system logistics

Define local inventories, shuttle capacity/timing, site queues, visible arcs, aggregation into system markets, moon shipyards, exotic installations, hot/cold behavior and save representation.

## Exploration and Cartography

Define discovery/survey/scan states, unsold knowledge, data capacity, duplicate policy, buyer preferences, vendor behavior, theft/loss, Cartographer's desk and exploration contracts.

## YOU surface

Define identity, aptitude progression, doctrine, stance, milestones, respec/permanence, relation to research and Chronicle integration.

## Combat and defence

Define interception, patrol, escort, convoy visibility, resolution, damage, repair, retreat, cargo loss, privateering, infamy and how combat remains subordinate to logistics.

## Operations and contracts

Define generation, negotiation, deadlines, reservations, partial fulfilment, emergencies, consequences, reputation and interaction with routes/directives.

## Three endings

For Cure, Hold and Exodus define readiness, logistics project, resource/infrastructure requirements, rival response, Scourge behavior, failure, final sequence, victory state, postgame and Chronicle outcome.

## Badlands

Define the repeatable deep-space loop, navigation/supply pressure, special industry, secrets, deep rivals, exodus settlement, cold-cohort materialization and reward/return risk.

## Main menu, intro and Chronicle

Define save summaries, invalid-save handling, run presets, intro skip/reduced motion, Chronicle schema, past-run fates and legacy unlocks.

## Encounters and cast

Define hailing-chip lifecycle, ignoring, expiry, concurrency, recurring characters, follow-ups, content validation and modal escalation.

## Audio

Define music states, transitions, event hierarchy, repetition, high-speed behavior, accessibility and performance limits.

## Release and archival policy

Define browser support, save compatibility, artifact contents, source/dependency scan, version identity, known issues, rollback and archival verification.

---

# 9. Workflow

## Proposal

- identify pillars and requirement families;
- add/update proposed requirements;
- update system spec;
- record dependencies and open questions;
- create ADR when alternatives have long-term consequences;
- define evidence before implementation.

## Implementation

- link PRs to requirement IDs;
- update types for changed structures;
- update runtime validators for persistent/external data;
- add tests;
- record save/migration impact;
- do not mark verified merely because code lands.

## Verification

- run invariant, scenario and browser tests;
- collect balance/performance evidence where relevant;
- perform manual UX/accessibility checks;
- update statuses and exceptions.

## Release

- list included requirement IDs;
- identify deferred/blocked work;
- document save migration and compatibility;
- attach evidence;
- record known issues;
- perform offline archival check.

---

# 10. Pull-request documentation standard

Substantial PRs should include:

```markdown
## Player outcome
## Requirement IDs
## Current problem
## Behavior change
## Architecture/state change
## Save/migration impact
## Accessibility impact
## Performance impact
## Tests and evidence
## Documentation updated
## Known limitations
## Follow-up requirements
## Zero-dependency/offline verification
```

---

# 11. Dependency-free documentation checks

A small Node standard-library script should detect:

- duplicate requirement IDs;
- invalid status values;
- broken relative links;
- accepted requirements without acceptance criteria;
- verified requirements without test/evidence references;
- shipped requirements with unresolved blockers;
- missing files;
- common mojibake;
- conflict markers;
- external runtime/dependency references that violate policy.

Markdown remains human-readable and authoritative; the checker only validates conventions.

---

# 12. Migration plan

## Phase 1 — establish the spine

- merge this standard;
- add `REQUIREMENTS_INDEX.md`;
- define statuses and requirement families;
- add glossary corrections;
- record ADRs for zero dependencies, mutation model and typed JavaScript.

## Phase 2 — absorb the review series

Convert the seven review documents into system specs or linked accepted proposals and assign IDs without rewriting every paragraph.

## Phase 3 — document unfulfilled areas

Write dedicated specs for in-system logistics, exploration, YOU, combat, Ops, endings, Badlands, menu/Chronicle/intro, encounters/cast, audio and release policy.

## Phase 4 — align code, types and validators

Add `jsconfig.json`, declarations and type-checking incrementally. Link code/test paths to requirements and correct ambiguous terminology.

## Phase 5 — evidence and release gates

Add balance, performance, accessibility and migration evidence reports, then make release records standard.

---

# 13. Acceptance criteria

This initiative is successful when:

- `SPEC.md` clearly communicates the complete intended game;
- developers can find exact accepted rules for every major system;
- significant requirements have stable IDs;
- design, implementation, verification and release statuses are distinct;
- the review PRs form one traceable plan;
- all unfulfilled `SPEC.md` promises are visible workstreams;
- terminology matches actual architecture and measurement;
- types, validators, documentation and saves describe compatible state shapes;
- decisions retain alternatives and rationale;
- balance and performance claims point to evidence;
- release readiness can be assessed without reconstructing intent from commit history;
- documentation remains plain text, local, offline and dependency-free;
- the process remains light enough to enable development rather than replace it.

## Final principle

STARWEFT's complexity should be intentional, not archaeological. The repository should connect the dream, the rules, the code, the tests and the evidence without losing either the atmosphere or the truth.