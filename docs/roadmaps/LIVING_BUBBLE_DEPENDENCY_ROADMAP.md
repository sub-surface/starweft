# STARWEFT Living Bubble Dependency Roadmap

Status: proposed tracked roadmap

Baseline: `main` at `894f8ea` (`UI surface modules + Living Weave`)

This roadmap turns the current design prompt into dependency-ordered work. It does not replace `SPEC.md`; `SPEC.md` remains the contract until explicitly updated. Detailed review documents remain backlog/reference until accepted.

Related proposed specifications:

- `docs/reviews/SCOURGE_CIVILIAN_RESPONSE_PASSENGER_LOGISTICS.md`
- `docs/reviews/PROGRESSION_RESEARCH_APTITUDES_MILESTONES.md`
- `docs/reviews/COMMAND_HAIL_RELAY_SUPPLY_CONSOLIDATION.md`
- `docs/reviews/GALAXY_SCALE_AND_IN_SYSTEM_LIFE.md`

---

# 1. Outcome

The work is complete when STARWEFT feels like a living stellar region rather than a set of panels around a centred graph:

- the player begins inside a materially playable Sol;
- the wider stellar field is asymmetric, larger and astronomically coherent;
- systems contain local logistics, stations, features and discoveries;
- cargo, civilians and factions visibly move through the weave;
- the Scourge causes worlds and factions to make different material choices;
- passenger transport, rescue and resettlement become a real profession;
- Research, Aptitudes and Milestones have one coherent responsive home;
- fleet control, supply, relay growth and information are orchestrated from a lighter map-first cockpit;
- recurring events communicate through grouped non-blocking hails rather than obstructive repetition;
- every stage remains deterministic, tested, zero dependency and directly playable.

---

# 2. Current foundation

Already present at the baseline:

- [x] zero-dependency classic-script architecture;
- [x] deterministic simulation and action journal;
- [x] command queue and initial FETCH intent;
- [x] routes and directives;
- [x] cartography data held and sold by ships;
- [x] world run parameters;
- [x] path-aware rival travel and refugee haven choice;
- [x] frontier-weighted Scourge spread;
- [x] market analytics module and known-space scope correction;
- [x] UI split into major classic-script modules;
- [x] Living Weave cargo flow visualisation;
- [x] system bodies, sites and facilities;
- [x] research tree, aptitudes and milestone point grants;
- [x] smoke and browser-boot suites.

Important limitations at baseline:

- [ ] hailing chips/protocol not implemented;
- [ ] repeated story log remains ungrouped;
- [ ] supply UI remains project/resource-specific;
- [ ] relay expansion remains manual;
- [ ] selected ship is represented by overlapping status/control surfaces;
- [ ] tech mini view duplicates the full tree;
- [ ] aptitudes wrap poorly and progression lacks one coherent home;
- [ ] refugees still transfer instantly rather than travelling as cohorts;
- [ ] no passenger capacity, hull line or manifest;
- [ ] faction crisis response is mostly abstract;
- [ ] Sol remains the centre of the generated playable domain;
- [ ] Orion Spur remains weakly integrated with the galaxy model;
- [ ] system play remains shallow relative to available content;
- [ ] no hot/warm/cold system simulation LOD.

---

# 3. Dependency graph

```text
Measurement + fixtures
        |
        +--> Hail Protocol -----------------------------+
        |                                               |
        +--> Supply planner --> Relay one-shot ----------+--> Command Console reduction
        |                                               |         |
        +--> Progression audit --> Development surface --+         |
        |                                                         |
        +--> Passenger foundation --------------------------------+--> Scourge civilian response
        |                                                                  |
        +--> Galactic frame --> Off-centre generation --> Discovery -------+
        |                                      |                           |
        |                                      +--> Authored Sol ----------+--> In-system logistics
        |                                                                      |
        +--> Population/faction flow reports -----------------------------------+--> Map overlays
                                                                               |
        +--> Sim LOD ------------------------------------------------------------+--> Wide/deep world
                                                                               |
        +--> Endgame/Chronicle integration <------------------------------------+
```

Key rule:

> Do not build the rich crisis layer before the game can communicate requests, plan supply, represent passengers and show world movement.

---

# 4. Wave 0 -- baselines, fixtures and terminology

Purpose: measure current behaviour before changing several coupled systems.

## World and rendering

- [ ] Record current Sol radial density and graph centrality.
- [ ] Record lane-length, degree, bridge and travel-time distributions for fixed seeds.
- [ ] Capture deterministic screenshots/fixtures at system, network, regional and galactic zoom.
- [ ] Document current local/galactic coordinate conventions.
- [ ] Record renderer object/particle counts through F3.

## UI and communication

- [ ] Inventory every permanent panel, chip, launcher and duplicated ship/system fact.
- [ ] Record viewport occupation at wide, laptop and narrow sizes.
- [ ] Count story-log entries by dedupe category across long runs.
- [ ] Count modal interruptions and their causes.
- [ ] Identify all supply/build/relay entry points.

## Progression

- [ ] Inventory every technology, aptitude and milestone.
- [ ] Classify each technology as verb, scale, geography, information, hull/facility, strategy or passive modifier.
- [ ] Classify each aptitude by player identity and overlap with technology/origin.
- [ ] Record research and aptitude timing from fixed saves/bot runs.
- [ ] Identify filler, duplicate and unclear nodes.

## Scourge and population

- [ ] Record current threatened-system outcomes across fixed seeds.
- [ ] Measure current refugee totals, destinations and market shocks.
- [ ] Define population unit and proposed berth scale.
- [ ] Create deterministic fixtures for one threatened population system, one bastion and one severed path.

### Gate 0

- [ ] Baseline evidence is committed.
- [ ] Terms are defined before data structures change.
- [ ] Both existing test suites remain green.

---

# 5. Wave 1 -- Hail Protocol

Purpose: establish the communication channel every later crisis, contract and project will use.

## Simulation/data

- [ ] Define hail priority, lifecycle and status.
- [ ] Add deterministic dedupe keys and occurrence aggregation.
- [ ] Define ignore, expire, resolve and escalation semantics.
- [ ] Keep active hail state bounded.
- [ ] Route consequences through game actions/event definitions.

## UI

- [ ] Add small Hails/Signals launcher with actionable count.
- [ ] Add non-blocking hail chip.
- [ ] Add Signals inbox/archive.
- [ ] Group routine repeated events.
- [ ] Preserve Chronicle-significant choices.
- [ ] Retain developer-level detail outside the player-facing archive.

## Migration

- [ ] Old story log remains readable as legacy archive.
- [ ] No historical log entry becomes an active decision.

### Gate 1

- [ ] Long simulation no longer produces an obstructive wall of identical entries.
- [ ] Actionable requests persist without pausing ordinary play.
- [ ] Critical events remain visible and focusable.
- [ ] Hail state survives save/load and remains bounded.

---

# 6. Wave 2 -- General Supply planner

Purpose: replace construction-specific resource plumbing with one first-class material outcome.

## Planner

- [ ] Define fixed quantity, reserve target, project package and relief-package requirements.
- [ ] Calculate local, inbound, reserved and uncovered amounts.
- [ ] Rank sources and eligible ships.
- [ ] Preview cost, travel time, risk and completion policy.
- [ ] Prevent duplicate reservation/dispatch.
- [ ] Compile visible ordinary command queues.

## Projects

- [ ] Represent construction requirements as projects.
- [ ] Support multi-resource package completion.
- [ ] Build/deposit/maintain completion policies.
- [ ] Map existing single-resource supply actions to the planner.

## UI

- [ ] One `SUPPLY` action from system pressure, construction and market surfaces.
- [ ] One confirmation showing the whole requirement.
- [ ] Clear blocked reason and resumption behavior.

### Gate 2

- [ ] A building can be supplied through one legible plan.
- [ ] Inbound cargo prevents duplicate work.
- [ ] Material truth is conserved.
- [ ] Existing routes/directives resume or remain paused exactly as previewed.

---

# 7. Wave 3 -- Relay Protocol

Purpose: let the player express network expansion as an intention rather than manually repeating material steps.

## One-shot relay

- [ ] Add relay project package.
- [ ] Preview newly covered systems/range.
- [ ] Select/override source and ship.
- [ ] Deliver materials and construct through visible queue.
- [ ] Produce one blocked/completed hail.

## Persistent expansion policy

- [ ] Choose direction/region/target chain.
- [ ] Choose safe/efficient/max-reach spacing.
- [ ] Set budget reserve and risk policy.
- [ ] Set stop condition.
- [ ] Score candidate systems transparently.
- [ ] Build one project at a time.
- [ ] Pause on danger, budget or missing material.

### Gate 3

- [ ] Player can establish one relay without manual cargo bookkeeping.
- [ ] Persistent protocol never creates free infrastructure.
- [ ] Chosen candidate has a readable explanation.
- [ ] Coverage preview matches actual post-build state.

---

# 8. Wave 4 -- Development surface and progression cleanup

Purpose: give Research, Aptitudes, Milestones, Doctrine and Identity one coherent responsive home.

## Data/report

- [ ] Add player-facing outcome and era/category metadata.
- [ ] Add milestone progress functions.
- [ ] Add progression definition validators.
- [ ] Add DOM-free progression report and recommendations.

## UI

- [ ] Remove compact mini tech canvas.
- [ ] Add minimal Development launcher with Research and Aptitude totals.
- [ ] Add full responsive Development surface.
- [ ] Add Network Research tab.
- [ ] Add Captain Aptitudes tab.
- [ ] Add Milestones tab with progress/recent completion.
- [ ] Add Identity/Doctrine/Stance summary.
- [ ] Ensure keyboard navigation and narrow-screen stacking.

## Content audit

- [ ] Merge/remove filler research nodes.
- [ ] Remove aptitude/research duplicates.
- [ ] Clarify doctrine permanence and location.
- [ ] Define aptitude respec policy.
- [ ] Add milestones across logistics, exploration, stewardship, fleet, conflict and history.
- [ ] Protect against milestone farming.

### Gate 4

- [ ] Both currencies are distinct and explained.
- [ ] Tree has one primary representation.
- [ ] Aptitude controls do not overlap or wrap badly.
- [ ] Every node changes network capability or player identity clearly.
- [ ] Save migration preserves/refunds earned progression.

---

# 9. Wave 5 -- Command Console and cockpit reduction

Purpose: reduce permanent UI bloat after Hails, Supply and Development have stable homes.

## Selection

- [ ] Replace large ship chip with one-line selection strip.
- [ ] Keep status, strongest pressure and compact actions.
- [ ] Move detailed manifest/service record into expanded scope.

## Launchers

- [ ] Add minimal Command launcher.
- [ ] Add minimal Fleet launcher with total/idle/blocked badge.
- [ ] Add icon rail or equivalent stable map-edge navigation.
- [ ] Preserve infobox and accessible names.

## Command Console

- [ ] Selected scope: current atom, why-line, queue and grouped actions.
- [ ] Fleet scope: filter/sort/multi-select/roles/reservations.
- [ ] Routes scope: health and assignments.
- [ ] Policies scope: directives, relay and future evacuation.
- [ ] Ops scope: contracts/crisis work.
- [ ] Signals scope: hails/archive.

## Cleanup

- [ ] Remove redundant ship/fleet facts.
- [ ] Replace wide wrapping command row with grouped vertical actions.
- [ ] Retain context when moving between hail, system, ship and plan.

### Gate 5

- [ ] Map gains visible room.
- [ ] No unique action is lost.
- [ ] Selected ship remains understandable in one glance.
- [ ] Large fleets remain searchable and operable.
- [ ] Wide, laptop and narrow fixtures pass.

---

# 10. Wave 6 -- Passenger foundation before Scourge rescue

Purpose: make passenger transport useful and teachable before crisis.

## Capacity and commands

- [ ] Add berth capacity separate from cargo hold.
- [ ] Add passenger manifest/cohort references.
- [ ] Add board/disembark/provision atoms.
- [ ] Add passenger move/itinerary intent.
- [ ] Add save validation and destruction resolution.

## Hulls/refits

- [ ] Add early shuttle/courier berth option.
- [ ] Add Liner or dedicated passenger hull.
- [ ] Define evacuation transport unlock path.
- [ ] Reserve colony ark for Exodus work.

## Ordinary profession

- [ ] Tourism to rare bodies/wonders.
- [ ] Specialist relocation.
- [ ] Pilgrimage/diplomatic travel.
- [ ] Frontier settlement contract.
- [ ] Passenger terminal/service integration.

### Gate 6

- [ ] Passenger work exists in relaxed/no-Scourge mode.
- [ ] Boarding and arrival conserve population/manifests.
- [ ] Passenger hulls have a viable economic role.
- [ ] The interface is learned before emergency use.

---

# 11. Wave 7 -- Unified galactic frame and sky model

Purpose: repair the relationship between the local field, Orion Spur and Milky Way before changing world distribution.

## Coordinate model

- [ ] Define local-to-galactocentric transform.
- [ ] Embed local bubble in one galactic frame.
- [ ] Align sky band and positioned galaxy.
- [ ] Integrate Orion Spur with disk/arm structures.
- [ ] Document simplifications and orientation.

## Visual layers

- [ ] Add bounded dust/extinction layer.
- [ ] Add regional nebula fields.
- [ ] Improve spectral/local bright-star treatment.
- [ ] Add deep-zoom local bubble marker.
- [ ] Add F3 layer/particle counts.
- [ ] Add reduced-effects mode.

### Gate 7

- [ ] Orion Spur no longer reads as detached.
- [ ] Skybox and galaxy model agree.
- [ ] Visual pass preserves map labels and lane readability.
- [ ] Normal/stress rendering remains within measured budget.

---

# 12. Wave 8 -- Off-centre local stellar field

Purpose: remove Sol-centred generation while preserving a viable game.

## Candidate field

- [ ] Catalogue-first real-star anchors.
- [ ] Deterministic density field for procedural fill.
- [ ] Associations, voids and disk thickness.
- [ ] Larger candidate field than playable domain.

## Domain selection

- [ ] Select asymmetric connected window containing Sol.
- [ ] Ensure multiple expansion directions.
- [ ] Validate opening economy and travel.
- [ ] Validate Sol centrality is not structurally dominant.
- [ ] Validate graph bridges/degree/lane length.
- [ ] Adapt camera fit and run presets.

## Scourge placement

- [ ] Choose origin using strategic/topological criteria.
- [ ] Ensure intended warning/endgame viability.

### Gate 8

- [ ] Sol is not the generation centre.
- [ ] Real catalogue stars remain correctly positioned.
- [ ] Playable region stays connected and economically viable.
- [ ] Larger scale creates decisions rather than empty padding.

---

# 13. Wave 9 -- Sol cold open and discovery reveal

Purpose: make the player begin somewhere real before presenting the full map.

## Authored Sol

- [ ] Earth Anchorage and visible population need.
- [ ] Belt resource source.
- [ ] Mars industrial/construction need.
- [ ] One station/shipyard.
- [ ] One local facility project.
- [ ] One shuttle-flow assignment.
- [ ] Jump-capable Sparrow/recovery project.

## Knowledge states

- [ ] UNKNOWN.
- [ ] SIGNAL.
- [ ] CHARTED.
- [ ] SURVEYED.
- [ ] PUBLISHED/sold cartography where accepted.

## First jump

- [ ] Limited external signals before launch.
- [ ] First interstellar destination.
- [ ] Map reveal justified by sensors/charts.
- [ ] Camera does not imply Sol is the universal centre.
- [ ] Equivalent skip-prologue state.

### Gate 9

- [ ] New player completes meaningful local logistics before galaxy map unlock.
- [ ] Sol feels inhabited and materially connected.
- [ ] Discovery changes knowledge, not only colour.
- [ ] Skip path preserves a valid equivalent state.

---

# 14. Wave 10 -- In-system logistics and planetary life

Purpose: make entering a system reveal a small causal logistics network.

## Local nodes

- [ ] Stations and service roles.
- [ ] Surface settlements/habitats.
- [ ] Mining belts and gas skimmers.
- [ ] Shipyards/research arrays.
- [ ] Passenger terminals.
- [ ] Derelicts/anomalies/unknown sites.

## Local logistics

- [ ] Local transfer capacity.
- [ ] Assignment/priority/backlog.
- [ ] Facility input/output connection.
- [ ] Stable-flow automation.
- [ ] Aggregation contract with system market.
- [ ] Material conservation across view/LOD changes.

## Features

- [ ] Deterministic body-compatible surface features.
- [ ] Asteroid mining loop.
- [ ] Rare planets/bodies.
- [ ] Tourism hooks.
- [ ] Alien biosignatures/ruins/signals.
- [ ] Faction/content hooks.

## UI/render

- [ ] Contextual body/node cards.
- [ ] Local flow arcs.
- [ ] Project/pressure markers.
- [ ] Shared Supply/Command actions.
- [ ] Avoid one enormous system panel.

### Gate 10

- [ ] Entering a system exposes decisions unavailable from the aggregate row.
- [ ] Stable systems remain automatable.
- [ ] Local and aggregate economy agree.
- [ ] Rare content creates destinations without guaranteed jackpots.

---

# 15. Wave 11 -- Scourge civilian response

Purpose: replace instant refugee accounting with visible choices and movement.

## Cohorts

- [ ] Create waiting civilian/specialist/refugee cohorts.
- [ ] Reserve origin population without double-counting.
- [ ] Define deadlines and urgency.
- [ ] Define destination acceptance/capacity.
- [ ] Integrate arrival over time.

## Player rescue

- [ ] Evacuation contracts.
- [ ] Partial completion.
- [ ] Repeat shuttle policy.
- [ ] Convoy escort hooks.
- [ ] Provisioning/medical needs.
- [ ] Destination choice and consequences.

## Autonomous response

- [ ] System crisis state/report.
- [ ] Faction-specific policy tendencies.
- [ ] Material bastion projects.
- [ ] Background passenger convoy budgets.
- [ ] Border/haven policy.
- [ ] Crisis hails.

## Consequences

- [ ] Food/medicine/housing pressure.
- [ ] Integration and labour/research effects.
- [ ] Overcrowding and onward migration.
- [ ] Specialist cohort effects.
- [ ] Post-cure return/reconstruction.

### Gate 11

- [ ] Refugees travel through actual paths and capacity.
- [ ] Player and autonomous actors both matter.
- [ ] Factions visibly respond according to proclivity and material means.
- [ ] Bastions are supplied projects, not free personality rolls.
- [ ] Rescue changes the later economy and Chronicle.

---

# 16. Wave 12 -- Population, faction and crisis overlays

Purpose: show the scale of the living bubble after the underlying data is real.

## Population flow

- [ ] Directional lane summaries.
- [ ] Player passenger path highlight.
- [ ] Waiting/outflow/inflow markers.
- [ ] Haven capacity/overcrowding view.
- [ ] Reduced-motion directional dashes.

## Faction view

- [ ] Influence field derived from presence.
- [ ] Contested systems.
- [ ] Relief/trade/defence corridors.
- [ ] Selected faction policy/goals.
- [ ] Texture/outline labels in addition to colour.

## Crisis/front

- [ ] Frontier pressure overlay.
- [ ] Likely targets/uncertainty.
- [ ] Bastion and evacuation status.
- [ ] Convoy distress/route severing.

## Living Weave composition

- [ ] Cargo flow remains lane thickness/brightness.
- [ ] Population appears as direction over flow.
- [ ] Faction view tints/textures when selected.
- [ ] Corruption distorts/removes threads.

### Gate 12

- [ ] Overlays represent real state, not decorative animation.
- [ ] Layers remain individually toggleable and readable.
- [ ] Particle/label counts remain bounded.
- [ ] Colour-independent cues pass accessibility review.

---

# 17. Wave 13 -- Sim LOD and wider/deeper world

Purpose: support the larger field and richer system state without scaling every detail linearly.

## Cohorts

- [ ] Hot selected/crisis/project systems.
- [ ] Warm nearby/active systems.
- [ ] Cold stable aggregate systems.
- [ ] Deterministic promotion/materialisation.
- [ ] Conservation across transitions.

## Scheduling

- [ ] Slow cadence for crisis policy where safe.
- [ ] Slow cadence for distant local logistics.
- [ ] Path/report caches with explicit invalidation.
- [ ] Bounded histories and flow summaries.

## Evidence

- [ ] Tick cost by entity/system count.
- [ ] 1x/3x/10x backlog behaviour.
- [ ] Hot versus cold equivalence fixtures.
- [ ] Badlands/deep-world stress runs.

### Gate 13

- [ ] Wider worlds remain responsive without SoA/native runtime.
- [ ] Materialisation does not create or destroy stock/population/projects.
- [ ] Crisis systems remain detailed regardless of distance.

---

# 18. Wave 14 -- Endgames, Chronicle and final balance

Purpose: make the richer world history matter at the end of the run.

## Cure

- [ ] Passenger/refugee aftermath.
- [ ] Panacea production/readiness indicators.
- [ ] Safe convoy path and final delivery.
- [ ] Return/reconstruction outcomes.

## Hold

- [ ] Bastion network and civilian shelter capacity.
- [ ] Supply sustainment and evacuation trade-offs.
- [ ] Survival threshold and conclusion.

## Exodus

- [ ] Colony ark/passenger requirements.
- [ ] Deep-galaxy relay/supply chain.
- [ ] Settlement package and destination viability.
- [ ] Who leaves and who remains.

## Chronicle

- [ ] Population saved/lost/resettled.
- [ ] Systems fortified/abandoned/rebuilt.
- [ ] Faction alliances and betrayals.
- [ ] Progression identity/doctrine/stance.
- [ ] Living Weave map snapshot or summary.

## Balance

- [ ] Archetype bots adapted to passengers/crisis.
- [ ] Rescue profitability versus freight.
- [ ] Research/aptitude pacing.
- [ ] World-size and Scourge-clock viability.
- [ ] Ending success distributions.

### Gate 14

- [ ] Each ending tests a different network the player actually built.
- [ ] Population/faction choices produce distinct outcomes.
- [ ] Chronicle explains causal history rather than listing counters.
- [ ] Release evidence and save migration are complete.

---

# 19. Cross-wave rules

Every wave must:

- [ ] keep `SPEC.md` authoritative until deliberately updated;
- [ ] use requirement IDs in implementation PRs;
- [ ] define current versus target behavior;
- [ ] route gameplay mutations through game actions;
- [ ] update save version/migration when persistent semantics change;
- [ ] add deterministic assertions;
- [ ] rerun smoke and browser-boot tests;
- [ ] preserve `file://` boot;
- [ ] introduce no dependency/build step;
- [ ] measure performance before optimisation claims;
- [ ] avoid UI claims unsupported by actual instrumentation;
- [ ] update this roadmap checkbox only when evidence exists.

---

# 20. Suggested PR sizing

Prefer small implementation PRs inside each wave:

```text
foundation/data model
-> pure planner/report
-> simulation actions
-> minimal UI
-> migration/tests
-> polish/evidence
```

Do not land passenger cohorts, faction AI, visual particles and a complete UI in one implementation PR.

Good examples:

- `feat: add hail lifecycle and dedupe`
- `feat: route optional story events through hails`
- `feat: add DOM-free multi-resource supply planner`
- `feat: establish relay project through supply intent`
- `ui: replace ship chip with selection strip`
- `feat: add passenger berths and ordinary itineraries`
- `render: unify local and galactic coordinate frames`
- `gen: select off-centre playable domain`
- `feat: add local logistics capacity to hot systems`
- `feat: create waiting evacuation cohorts`

---

# 21. Roadmap definition of done

The roadmap is complete when all wave gates are checked with linked code/tests/evidence, and the resulting `SPEC.md` accurately describes the shipped game rather than the intended backlog.

## Final principle

Build the channels before the traffic, the traffic before the spectacle, and the spectacle only where it reveals a world that is genuinely moving.