# STARWEFT Requirements Index

Status: initial audit; statuses are provisional until each owning system specification is accepted.

This file is the traceability spine between `SPEC.md`, detailed system documents, code, tests and evidence. It is intentionally concise.

## Status vocabulary

- Design: `IDEA`, `PROPOSED`, `ACCEPTED`, `EXPERIMENTAL`, `SUPERSEDED`, `REJECTED`
- Implementation: `NONE`, `PROTOTYPE`, `PARTIAL`, `IMPLEMENTED`, `LEGACY`
- Verification: `UNTESTED`, `INVARIANT`, `SCENARIO`, `BROWSER`, `BALANCE`, `MANUAL`, `VERIFIED`
- Release: `BACKLOG`, `TARGETED`, `BLOCKED`, `CANDIDATE`, `SHIPPED`

`IMPLEMENTED` means the behavior exists. `VERIFIED` means the accepted definition of done is supported by appropriate automated and/or manual evidence.

---

## Vision and distribution

| ID | Requirement | Design | Impl. | Verification | Release | Owner/spec |
|---|---|---:|---:|---:|---:|---|
| VIS-001 | All major play serves GATHER → MOVE → DELIVER, discovery of what should move, or protection of movement | ACCEPTED | PARTIAL | MANUAL | TARGETED | `SPEC.md` |
| VIS-002 | The map remains the primary game surface; panels explain and command it | ACCEPTED | PARTIAL | MANUAL | TARGETED | presentation spec |
| VIS-003 | Complexity appears as decisions and causality rather than maintenance | ACCEPTED | PARTIAL | UNTESTED | TARGETED | whole-game audit |
| DIST-001 | Double-click `index.html` to play | ACCEPTED | IMPLEMENTED | BROWSER | SHIPPED | `index.html`, browser boot |
| DIST-002 | No runtime dependencies, package manager, bundler or server | ACCEPTED | IMPLEMENTED | MANUAL | SHIPPED | `SPEC.md`, source audit |
| DIST-003 | No required build step | ACCEPTED | IMPLEMENTED | MANUAL | SHIPPED | `SPEC.md` |
| DIST-004 | Release remains copyable, offline and archivally intelligible | ACCEPTED | PARTIAL | UNTESTED | TARGETED | release policy missing |

---

## Core loop, onboarding and progression

| ID | Requirement | Design | Impl. | Verification | Release | Owner/spec |
|---|---|---:|---:|---:|---:|---|
| LOOP-001 | Delivery exposes need, plan, commitment, transit and consequence | ACCEPTED | PARTIAL | UNTESTED | TARGETED | onboarding spec |
| LOOP-002 | Successful logistics shows the strongest world consequence, not only credits | ACCEPTED | PARTIAL | UNTESTED | TARGETED | onboarding/presentation |
| LOOP-003 | Every shortage/opportunity can lead directly to an actionable dispatch | ACCEPTED | PARTIAL | BROWSER | TARGETED | commands/market |
| LOOP-004 | Manual control remains available at every automation tier | ACCEPTED | PARTIAL | SCENARIO | TARGETED | commands spec |
| ONB-001 | First run begins in a constrained Sol system view | ACCEPTED | NONE | UNTESTED | TARGETED | `SPEC.md`, onboarding spec |
| ONB-002 | First lesson solves a named shortage with a real FETCH/delivery | ACCEPTED | NONE | UNTESTED | TARGETED | onboarding spec |
| ONB-003 | Prologue teaches production chain, route, on-site build and first jump in dependency order | ACCEPTED | NONE | UNTESTED | TARGETED | onboarding spec |
| ONB-004 | Tutorial goals are state-driven and tolerate alternate valid solutions | ACCEPTED | NONE | UNTESTED | TARGETED | onboarding spec |
| ONB-005 | Tutorial has bounded recovery for misplaced cargo, bankruptcy and stranded ship | ACCEPTED | NONE | UNTESTED | TARGETED | onboarding spec |
| ONB-006 | Prologue skip creates an equivalent valid start state | ACCEPTED | NONE | UNTESTED | TARGETED | onboarding/save specs |
| PROG-001 | Progression follows errand → loop → reserve → region → history | ACCEPTED | PARTIAL | MANUAL | TARGETED | onboarding spec |
| PROG-002 | Unlocks demonstrate relevant behavior rather than only counts | PROPOSED | NONE | UNTESTED | BACKLOG | onboarding spec |
| PROG-003 | Pacing milestones are measured across fixed seeds and play/bot scenarios | ACCEPTED | NONE | UNTESTED | TARGETED | balance strategy |
| PROG-004 | Detect and recover from terminal early-game stalls | ACCEPTED | NONE | UNTESTED | TARGETED | onboarding/reliability |
| PROG-005 | Late-game automation removes repetition without removing strategic responsibility | ACCEPTED | PARTIAL | MANUAL | TARGETED | commands/endings |

---

## Commands and automation

| ID | Requirement | Design | Impl. | Verification | Release | Owner/spec |
|---|---|---:|---:|---:|---:|---|
| CMD-001 | General one-shot FETCH intent with source, destination, quantity and arrival policy | ACCEPTED | PARTIAL | SCENARIO | TARGETED | commands spec, `ships.js` |
| CMD-002 | Intent compiles into a visible serializable atomic queue | ACCEPTED | IMPLEMENTED | SCENARIO | SHIPPED | `ships.js`, `game.js` |
| CMD-003 | Persistent assignment is distinct from current execution queue | ACCEPTED | NONE | UNTESTED | TARGETED | commands spec |
| CMD-004 | Ownership precedence between interrupts, manual atoms, intents and assignments is explicit | ACCEPTED | NONE | UNTESTED | TARGETED | commands spec |
| CMD-005 | Cancel atom, clear queue, pause assignment and unassign are distinct safe actions | ACCEPTED | PARTIAL | UNTESTED | TARGETED | commands spec |
| CMD-006 | Queue editing supports inspect/remove/reorder/insert where safe | ACCEPTED | NONE | UNTESTED | BACKLOG | commands spec |
| CMD-007 | Blocked ships expose stable status and reason codes | ACCEPTED | PARTIAL | UNTESTED | TARGETED | commands spec |
| CMD-008 | Every automated ship produces a controller-aware why-line | ACCEPTED | PARTIAL | BROWSER | TARGETED | commands spec |
| CMD-009 | Routes expose health: flowing, starved, full, blocked, shipless or paused | ACCEPTED | NONE | UNTESTED | TARGETED | commands spec |
| CMD-010 | Directives account for stock, inbound commitment and duplicate dispatch | ACCEPTED | PARTIAL | SCENARIO | TARGETED | commands/market |
| CMD-011 | Directives use hysteresis around reserve targets | ACCEPTED | NONE | UNTESTED | TARGETED | commands spec |
| CMD-012 | Visible journaled interrupts handle data-full and stranded-risk conditions | ACCEPTED | NONE | UNTESTED | TARGETED | commands spec |
| CMD-013 | Patrol, escort, evacuation and inoculation reuse the same command model | ACCEPTED | NONE | UNTESTED | BACKLOG | combat/Scourge specs missing |

---

## Economy and Market Terminal

| ID | Requirement | Design | Impl. | Verification | Release | Owner/spec |
|---|---|---:|---:|---:|---:|---|
| ECON-001 | Commodity movement obeys one reconcilable stock-flow model | ACCEPTED | PARTIAL | INVARIANT | TARGETED | economy/world spec |
| ECON-002 | Prosperity and research causality is visible and measurable | ACCEPTED | PARTIAL | SCENARIO | TARGETED | economy/progression |
| ECON-003 | Opening deprivation is partial capability, not universal emptiness | ACCEPTED | PARTIAL | UNTESTED | TARGETED | world spec |
| ECON-004 | Factories expose running and blocked reasons | ACCEPTED | NONE | UNTESTED | TARGETED | world spec |
| ECON-005 | Price model passes boundedness, same-market arbitrage and delivery-impact stress tests | ACCEPTED | PARTIAL | INVARIANT | TARGETED | economy tests |
| MKT-001 | Known Economy excludes undiscovered systems and distinguishes live/known scope | ACCEPTED | LEGACY | UNTESTED | TARGETED | Market Terminal spec |
| MKT-002 | Weave Health decomposes into prosperity, essentials, industrial continuity and logistics coverage | ACCEPTED | NONE | UNTESTED | TARGETED | Market Terminal spec |
| MKT-003 | Base inventory value differs from nominal market inventory value | ACCEPTED | NONE | UNTESTED | TARGETED | Market Terminal spec |
| MKT-004 | Price level differs from source/sink market index and price change has a stated horizon | ACCEPTED | PARTIAL | UNTESTED | TARGETED | Market Terminal spec |
| MKT-005 | Commodity view shows both cheapest sources and dearest sinks | ACCEPTED | LEGACY | BROWSER | TARGETED | Market Terminal spec |
| MKT-006 | Systemic shortages and bottlenecks are ranked, explained and actionable | ACCEPTED | PARTIAL | BROWSER | TARGETED | Market Terminal spec |
| MKT-007 | Market report is DOM-free and avoids repeated full scans per row | ACCEPTED | NONE | UNTESTED | TARGETED | Market Terminal spec |
| MKT-008 | Metrics use honest names; throughput/profit rates require instrumentation | ACCEPTED | LEGACY | UNTESTED | TARGETED | Market Terminal spec |
| MKT-009 | Cartographer's desk belongs in the Market surface | ACCEPTED | NONE | UNTESTED | BACKLOG | exploration/market |

---

## World generation, rivals and Scourge

| ID | Requirement | Design | Impl. | Verification | Release | Owner/spec |
|---|---|---:|---:|---:|---:|---|
| GEN-001 | Every standard seed passes opening viability constraints | ACCEPTED | PARTIAL | SCENARIO | TARGETED | world spec |
| GEN-002 | Runs vary structurally through clusters, voids, bridges and dependencies | ACCEPTED | PARTIAL | UNTESTED | TARGETED | world spec |
| GEN-003 | Generation produces a deterministic strategic fingerprint | ACCEPTED | NONE | UNTESTED | BACKLOG | world spec |
| GEN-004 | Trade viability and emergencies use actual path/travel time where relevant | ACCEPTED | PARTIAL | UNTESTED | TARGETED | world spec |
| GEN-005 | Run presets expose density, wealth, Scourge clock, rivals, Badlands and ironman | ACCEPTED | PARTIAL | BROWSER | TARGETED | `SPEC.md` |
| RIV-001 | Rival archetypes have explicit readable goals | ACCEPTED | PARTIAL | UNTESTED | TARGETED | rivals/world spec |
| RIV-002 | Rival cargo travels as inspectable convoy entities on valid lane paths | ACCEPTED | PARTIAL | SCENARIO | TARGETED | rivals/world spec |
| RIV-003 | Rivals obey affordability, reserve, contraction and insolvency rules | ACCEPTED | PARTIAL | UNTESTED | TARGETED | rivals/world spec |
| RIV-004 | Player counterplay is logistical: out-serve, undercut, escort, embargo, raid or aid | ACCEPTED | PARTIAL | UNTESTED | BACKLOG | rivals/Ops/combat |
| SCR-001 | Scourge expansion forms a readable weighted frontier rather than opaque lottery spread | ACCEPTED | LEGACY | UNTESTED | TARGETED | Scourge/world spec |
| SCR-002 | Threatened systems generate evacuation, relief, defence and inoculation logistics | ACCEPTED | PARTIAL | UNTESTED | TARGETED | Scourge/commands |
| SCR-003 | Refugee movement is path-aware, delayed and visible | ACCEPTED | LEGACY | UNTESTED | BACKLOG | Scourge/world spec |
| SCR-004 | Defences expose layered effects and supply requirements | PROPOSED | PARTIAL | UNTESTED | BACKLOG | Scourge/combat |

---

## In-system, exploration, combat and operations

| ID | Requirement | Design | Impl. | Verification | Release | Owner/spec |
|---|---|---:|---:|---:|---:|---|
| SYS-001 | Local site inventories and system-market aggregation have explicit rules | ACCEPTED | PARTIAL | UNTESTED | BLOCKED | dedicated spec missing |
| SYS-002 | Shuttle flow has visible capacity, timing and assignment | ACCEPTED | NONE | UNTESTED | BLOCKED | dedicated spec missing |
| SYS-003 | Moon shipyards, build queues and hull discounts are specified | ACCEPTED | NONE | UNTESTED | BACKLOG | dedicated spec missing |
| SYS-004 | Hot/warm/cold system behavior preserves economic truth | ACCEPTED | NONE | UNTESTED | BLOCKED | sim LOD spec missing |
| EXPL-001 | Discovery, survey, body scan and sold-chart states are distinct | ACCEPTED | PARTIAL | SCENARIO | TARGETED | exploration spec missing |
| EXPL-002 | Typed cartography data is held, lost and sold through explicit rules | ACCEPTED | IMPLEMENTED | SCENARIO | SHIPPED | `ships.js`, `SPEC.md` |
| EXPL-003 | Buyer preferences, vendor behavior and duplicate data policy are specified | ACCEPTED | PARTIAL | UNTESTED | BACKLOG | exploration spec missing |
| EXPL-004 | Auto-explore return/sell threshold is a visible interrupt policy | ACCEPTED | PARTIAL | SCENARIO | TARGETED | commands/exploration |
| COM-001 | Patrol and escort have explicit coverage, rendezvous and interruption rules | ACCEPTED | NONE | UNTESTED | BLOCKED | combat spec missing |
| COM-002 | Combat resolution, damage, repair, retreat and cargo loss are specified | ACCEPTED | PARTIAL | UNTESTED | BLOCKED | combat spec missing |
| COM-003 | Privateering, infamy and faction consequences remain legible | ACCEPTED | PARTIAL | UNTESTED | BACKLOG | combat/Ops spec missing |
| OPS-001 | Contracts define generation, negotiation, reservation, partial fulfilment and deadlines | ACCEPTED | PARTIAL | UNTESTED | BLOCKED | Ops spec missing |
| OPS-002 | Emergency work integrates with routes, directives and command queues | ACCEPTED | PARTIAL | UNTESTED | BACKLOG | Ops/commands |

---

## Narrative, identity, endings and Badlands

| ID | Requirement | Design | Impl. | Verification | Release | Owner/spec |
|---|---|---:|---:|---:|---:|---|
| NAR-001 | Encounters have unique mechanical signatures, not prose-only variation | ACCEPTED | PARTIAL | UNTESTED | TARGETED | encounters spec missing |
| NAR-002 | Most ambient encounters use optional hailing chips; only major decisions force pause | ACCEPTED | NONE | UNTESTED | TARGETED | encounters spec missing |
| NAR-003 | Recurring cast has compact persistent relationship state | ACCEPTED | NONE | UNTESTED | BACKLOG | encounters spec missing |
| YOU-001 | YOU surface owns identity, sigil, aptitudes, doctrine, stance and milestones | ACCEPTED | PARTIAL | BROWSER | TARGETED | YOU spec missing |
| YOU-002 | Aptitude, doctrine and stance progression has explicit permanence/respec rules | ACCEPTED | PARTIAL | UNTESTED | BLOCKED | YOU spec missing |
| END-001 | Cure has readiness indicators, logistics project, failure and final sequence | ACCEPTED | PARTIAL | SCENARIO | BLOCKED | endings spec missing |
| END-002 | Hold has readiness indicators, supply/defence project and survival conclusion | ACCEPTED | PARTIAL | UNTESTED | BLOCKED | endings spec missing |
| END-003 | Exodus has readiness indicators, deep route, settlement project and conclusion | ACCEPTED | PARTIAL | UNTESTED | BLOCKED | endings spec missing |
| END-004 | Each ending creates a Chronicle outcome and postgame state | ACCEPTED | NONE | UNTESTED | BACKLOG | endings/Chronicle specs missing |
| BAD-001 | Badlands has a repeatable high-risk logistics/exploration loop | ACCEPTED | PARTIAL | UNTESTED | BLOCKED | Badlands spec missing |
| BAD-002 | Deep-galaxy supply, relay and settlement requirements are explicit | ACCEPTED | PARTIAL | UNTESTED | BLOCKED | Badlands/endings |

---

## Presentation, accessibility and audio

| ID | Requirement | Design | Impl. | Verification | Release | Owner/spec |
|---|---|---:|---:|---:|---:|---|
| UX-001 | MAP, COMMAND, MARKET and YOU have explicit ownership | ACCEPTED | PARTIAL | BROWSER | TARGETED | `SPEC.md`, presentation spec |
| UX-002 | Supporting system panel, infobox, ticker, alerts and modals have one primary question | ACCEPTED | PARTIAL | MANUAL | TARGETED | presentation spec |
| UX-003 | UI splits by major surface without framework or build system | ACCEPTED | NONE | UNTESTED | TARGETED | presentation spec |
| UX-004 | Render stamps prevent hidden/unchanged surfaces rerendering constantly | ACCEPTED | NONE | UNTESTED | TARGETED | presentation spec |
| UX-005 | Map draw order, LOD and label budgets preserve decision-critical state | ACCEPTED | PARTIAL | MANUAL | TARGETED | presentation spec |
| A11Y-001 | Every core action is keyboard reachable and has visible focus | ACCEPTED | PARTIAL | MANUAL | TARGETED | presentation spec |
| A11Y-002 | Important meaning is never carried by color alone | ACCEPTED | PARTIAL | MANUAL | TARGETED | presentation spec |
| A11Y-003 | Reduced-motion and high-contrast settings are supported | ACCEPTED | NONE | UNTESTED | BACKLOG | presentation spec |
| A11Y-004 | Icon-only controls have accessible names and toggles expose state | ACCEPTED | PARTIAL | BROWSER | TARGETED | presentation spec |
| AUDIO-001 | Music has documented galaxy/system/crisis/endgame states | ACCEPTED | PARTIAL | MANUAL | BLOCKED | audio spec missing |
| AUDIO-002 | Repetition, concurrency, high-speed aggregation and mute behavior are defined | ACCEPTED | PARTIAL | UNTESTED | BACKLOG | audio spec missing |

---

## Performance, saves, replay and tooling

| ID | Requirement | Design | Impl. | Verification | Release | Owner/spec |
|---|---|---:|---:|---:|---:|---|
| PERF-001 | F3 reports frame, tick, draw, label, effect and UI costs | ACCEPTED | PARTIAL | MANUAL | TARGETED | presentation/tooling |
| PERF-002 | Optimization follows measured scenarios before SoA or alternate runtimes | ACCEPTED | PARTIAL | MANUAL | TARGETED | architecture |
| PERF-003 | Hot/warm/cold simulation LOD supports wider worlds | ACCEPTED | NONE | UNTESTED | BLOCKED | sim LOD spec missing |
| SAVE-001 | Save envelope distinguishes metadata and authoritative state | ACCEPTED | NONE | UNTESTED | TARGETED | reliability spec |
| SAVE-002 | Autosave preserves current and previous recoverable slots | ACCEPTED | PARTIAL | UNTESTED | TARGETED | reliability spec |
| SAVE-003 | Deterministic chained migrations have historical fixtures | ACCEPTED | NONE | UNTESTED | TARGETED | reliability spec |
| SAVE-004 | Invalid import/load has explicit repair-versus-refusal behavior | ACCEPTED | PARTIAL | UNTESTED | TARGETED | reliability spec |
| REP-001 | Journal action schemas are versioned | ACCEPTED | NONE | UNTESTED | TARGETED | reliability spec |
| REP-002 | Seed, settings and journal reproduce deterministic state hashes | ACCEPTED | PARTIAL | UNTESTED | TARGETED | reliability spec |
| TOOL-001 | Local bug report exports seed, tick, settings, validation and recent journal | ACCEPTED | NONE | UNTESTED | BACKLOG | reliability spec |
| TOOL-002 | Node standard-library batch runner is deterministic and interruptible | ACCEPTED | PARTIAL | SCENARIO | TARGETED | balance/tooling |
| TOOL-003 | Source/data validator checks paths, IDs, encoding and dependency policy | ACCEPTED | PARTIAL | INVARIANT | TARGETED | reliability/docs |

---

## Documentation and type model

| ID | Requirement | Design | Impl. | Verification | Release | Owner/spec |
|---|---|---:|---:|---:|---:|---|
| DOC-001 | `SPEC.md` remains concise north-star documentation | ACCEPTED | IMPLEMENTED | MANUAL | SHIPPED | `SPEC.md` |
| DOC-002 | Requirements have stable IDs and distinct design/implementation/verification/release status | ACCEPTED | PARTIAL | MANUAL | TARGETED | this index |
| DOC-003 | Major systems use the common specification template | ACCEPTED | PARTIAL | MANUAL | TARGETED | documentation rigor |
| DOC-004 | Long-lived alternatives and rationale use decision records | ACCEPTED | NONE | UNTESTED | BACKLOG | documentation rigor |
| DOC-005 | Balance, performance, accessibility and migration claims use evidence reports | ACCEPTED | NONE | UNTESTED | BACKLOG | documentation rigor |
| DOC-006 | Documentation conventions have a dependency-free integrity check | ACCEPTED | NONE | UNTESTED | BACKLOG | documentation rigor |
| TYPE-001 | Plain JS uses JSDoc/TypeScript language-service checking without a build step | ACCEPTED | NONE | UNTESTED | TARGETED | typing guide missing |
| TYPE-002 | Core serialized/public state has canonical declaration types | ACCEPTED | NONE | UNTESTED | TARGETED | `types/` missing |
| TYPE-003 | New modules are type-checked and changed legacy boundaries migrate incrementally | ACCEPTED | NONE | UNTESTED | TARGETED | typing guide missing |
| TYPE-004 | Runtime validators remain authoritative for saves/imports | ACCEPTED | PARTIAL | INVARIANT | TARGETED | reliability/type model |
| TYPE-005 | Full `.ts` migration requires an explicit decision to change the zero-build contract | ACCEPTED | IMPLEMENTED | MANUAL | SHIPPED | documentation rigor |

---

## Immediate blockers revealed by this index

1. Command ownership/cancellation must stabilize before the Sol tutorial, patrol, escort and emergency missions.
2. UI surface boundaries must stabilize before the tutorial, Market redesign, YOU surface and hailing chips.
3. Typed state declarations and save migration policy should precede large persistent-state changes.
4. World validation and telemetry should precede firm balance claims and endgame tuning.
5. Rival convoy entities should precede deep escort/privateering design.
6. Scourge front semantics should precede Hold balancing and refugee redesign.
7. Dedicated specs are still required for in-system logistics, exploration, YOU, combat, Ops, endings, Badlands, encounters, audio and release policy.

## Maintenance rule

Every substantial behavior PR should update the affected rows. No requirement is marked `VERIFIED` or `SHIPPED` without named evidence or a deliberate documented exception.