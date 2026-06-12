# STARWEFT Galactic Scale, Local Stellar Distribution and In-System Life

Status: implementation specification and world/presentation review

Related requirement families: `GEN`, `SYS`, `EXPL`, `UX`, `PERF`, `ONB`, `BAD`, `VIS`

## Hard constraints

- Zero dependencies, zero build, direct `file://` play.
- Real astronomical data and procedural generation must remain local repository data or deterministic code.
- The map remains the game; in-system play is a deeper scale of the same logistics game, not a separate physics simulator.
- The world must remain deterministic and headless-testable.
- Visual richness must degrade gracefully by LOD and reduced-motion settings.
- Sol is the player's origin, not the geometric or narrative centre of the universe.

---

# 1. Executive assessment

STARWEFT currently has two impressive but weakly joined scales:

- a generated local bubble centred mathematically on Sol;
- a distant Milky Way context rendered as a separate galactocentric point cloud.

It also has a functional system view with bodies, sites and facilities, but most meaningful decisions still happen in aggregate system markets. The player knows there are planets, stations, asteroids and rare bodies, yet they rarely create enough local movement, discovery or consequence to make entering a system feel like a change of scale.

The result is a contradiction in the game's fantasy:

- the player begins as one probe in Sol, but does not deeply inhabit Sol;
- the bubble is meant to feel like a real local stellar neighbourhood, but its density and frontier radiate around Sol;
- the Milky Way is meant to provide sublime context, but the Orion Spur reads as a detached decorative segment rather than the structure containing the player;
- hundreds of systems exist, but individual systems can feel like a market row with orbital scenery.

The target is one continuous astronomical model across four scales:

```text
surface/site
  -> body/orbit
    -> stellar system
      -> local stellar neighbourhood
        -> Orion Spur
          -> Milky Way
```

At every scale, geography should create logistics decisions.

The player should begin inside a materially legible Sol system, learn the verb through local movement, leave the heliosphere, and gradually realise that Sol occupies one unprivileged point inside a much larger and uneven stellar field.

---

# 2. World-space model

## 2.1 Separate player origin from generation domain

Current generation samples a sphere around Sol. This guarantees connectivity and a clear start, but makes Sol the centre of density, frontier depth and visual composition.

Replace the conceptual model:

```text
Sol at (0,0,0)
playable world = sphere centred on Sol
```

with:

```text
Sol at a real local coordinate
playable world = selected connected window through a larger local-star field
```

Sol may remain `(0,0,0)` in local coordinates for numerical convenience, while the playable domain is offset and asymmetric around it.

Example domain:

```js
world.bounds = {
  center: { x: +18, y: -8, z: +2 },
  radii: { x: 95, y: 75, z: 32 }
};
```

Exact values require generation evidence. The principle is that Sol need not lie at the centre.

## 2.2 One galactocentric transform

Define a consistent transformation between:

- local heliocentric coordinates used for gameplay;
- galactic Cartesian coordinates;
- renderer's distant Milky Way representation.

The renderer should know where the local bubble sits inside the Orion Spur. The Orion Spur should be generated as part of the same galactic disk model, not appended as a disconnected point strip.

Required concepts:

```js
GALACTIC_FRAME = {
  sunGalactocentric: { x, y, z },
  localToGalacticMatrix,
  diskPlane,
  armModel,
  spurModel
};
```

The exact astronomical convention may be simplified, but it must be internally coherent.

## 2.3 Playable-domain selection

Generate or load a larger candidate field, then select a connected playable region that:

- contains Sol near but not at its centre;
- includes several real catalogue anchors;
- has multiple expansion directions;
- has at least one sparse edge and one denser association;
- creates meaningful bridges and voids;
- remains connected under starting travel rules or has explicit gated regions;
- supports the opening-economy validator;
- places the Scourge origin according to strategic criteria, not simply farthest radial distance.

## 2.4 Do not force uniformity where reality is structured

“Equally distributed” should mean avoiding a Sol-centred radial bias, not placing stars on an artificial even grid.

The local neighbourhood should include:

- associations and moving groups;
- sparse voids;
- binaries and multiples;
- vertical disk thickness;
- spectral/metallicity gradients where useful;
- catalogue stars at recognisable positions;
- procedural fill that matches local density statistics rather than convenience alone.

---

# 3. Real-star catalogue strategy

## 3.1 Catalogue-first, procedural-second

Use real nearby stars as structural anchors.

For each catalogue object retain where available:

- common and catalogue names;
- heliocentric position;
- distance;
- spectral type;
- multiplicity;
- known planet count;
- short curated note;
- data provenance/version in documentation.

Procedural systems fill gaps and extend scale.

## 3.2 Procedural fill must preserve catalogue topology

A procedural star should not:

- displace a real catalogue star;
- create implausible dense clumps around Sol;
- erase known sparse regions;
- create lane geometry that makes all real stars irrelevant.

Use deterministic spatial sampling with a density field rather than acceptance probability based primarily on distance from Sol.

Possible density inputs:

- broad galactic radial gradient;
- vertical disk profile;
- seeded local association fields;
- exclusion around known catalogue objects;
- intentionally authored void fields.

## 3.3 Star identity tiers

- **Named real stars**: curated names/notes and strong map identity.
- **Catalogue real stars**: authentic designation and basic facts.
- **Procedural local stars**: plausible designation and generated system.
- **Badlands/deep objects**: explicitly outside reliable catalogues or old web charts.

The UI should distinguish these without implying procedural systems are false within the fiction.

## 3.4 Scale target

Do not choose system count solely from visual desire.

Evaluate presets against:

- mean lane length;
- travel commitment;
- visible label density;
- pathfinding cost;
- economy stability;
- discovery pacing;
- command-range expansion;
- Scourge front duration;
- number of meaningfully distinct regions.

A larger bubble is desirable only if systems remain consequential.

---

# 4. Lane topology and being off-centre

## 4.1 Network construction

The Gabriel graph can remain a useful basis, but validate:

- long isolated bridges;
- excessive local degree;
- centrality concentration around Sol;
- disconnected components;
- unrealistic cross-void shortcuts;
- lane length distribution;
- opening neighbourhood reachability.

Add repair rules that preserve geometry rather than connecting every component through the nearest arbitrary edge.

## 4.2 Sol should not be the inevitable traffic hub

Sol begins as Home because the player begins there, not because every shortest path passes through it.

World metrics should track:

- Sol betweenness/traffic share;
- top natural hubs;
- number of alternate corridors;
- bridge systems;
- regional centres;
- density gradient around Sol versus domain average.

The game should allow the player to build Sol into a hub, but geography should not grant it automatically.

## 4.3 Command range follows infrastructure

Initial awareness may extend beyond command range, but reliable control should grow through:

- relay/radar infrastructure;
- exploration data;
- faction intelligence;
- gates and deep drives;
- relocation of Home where unlocked.

The world should feel larger because command, knowledge and travel expand separately.

---

# 5. Discovery and map revelation

## 5.1 Begin inside Sol

The first-run state should reveal:

- Sol's star and major bodies;
- the player's immediate station/ship;
- local sites required by the prologue;
- only a small number of external stellar signals.

The full bubble should not be presented as a finished network map before the player has left Sol.

## 5.2 Knowledge states

Recommended system knowledge:

```text
UNKNOWN
SIGNAL       approximate star position/basic spectral hint
CHARTED      route/position known, local detail limited
SURVEYED     economy, bodies and sites known
PUBLISHED    cartography data sold; full persistent map detail
```

This should align with the Cartography profession rather than create a parallel discovery model.

## 5.3 First interstellar reveal

The first jump should:

- transition from system view to local neighbourhood;
- reveal lanes/systems justified by sensors and old charts;
- show Sol receding from the camera;
- establish that the player has entered an already-existing stellar field;
- avoid immediately framing Sol at the exact map centre unless the player focuses it.

## 5.4 Map bounds and camera

The camera should support:

- local operational framing;
- regional/faction/front overlays;
- full playable-domain overview;
- galactic context beyond the playable domain;
- return to selected entity without recentring the universe around Sol.

---

# 6. Milky Way and Orion Spur model

## 6.1 One continuous disk model

The galactic renderer should generate:

- bulge/bar;
- major spiral arms;
- disk infill;
- dust lanes;
- local Orion Spur/armlet;
- halo/context stars;
- the local bubble marker.

The Spur must connect visually and geometrically into neighbouring major arms or feather structures according to the chosen simplified model.

## 6.2 The local bubble is embedded, not pasted on

At deep zoom:

- the playable bubble occupies a tiny, correctly oriented volume inside the Spur;
- the player can see the direction of the galactic centre and major arms;
- arm labels attach to continuous structures;
- the Spur does not appear as a detached independent line;
- the Milky Way sky band and positioned disk agree on orientation.

## 6.3 Accuracy standard

The renderer is an atmospheric strategic map, not an astrophysical simulation. Accuracy means:

- coherent scale and orientation;
- no obvious detached structures;
- plausible arm/spur relationships;
- real local star positions where claimed;
- documented simplifications.

Do not claim precise scientific accuracy beyond the model.

---

# 7. Skybox and nebula visual pass

## 7.1 Layered sky

Build the sky from deterministic layers:

1. distant isotropic stars;
2. Milky Way band and dust extinction;
3. local bright stars with spectral tint;
4. faint integrated starlight;
5. regional nebula fields;
6. subtle parallax/context particles;
7. Scourge and event-specific distortion.

No external image assets are required.

## 7.2 Nebulae as geography

Nebulae should not be random decorative fog alone.

A region may affect:

- visibility/survey time;
- sensor uncertainty;
- travel risk;
- gas/resource profile;
- hidden sites/anomalies;
- audio/colour mood;
- faction routes.

At map scale use low-frequency fields or sparse particles with clear bounds. In system view use local haze and lighting variation.

## 7.3 Dust and depth

Use dust lanes/extinction to create galactic structure:

- modulate star density/brightness;
- avoid full-screen alpha fog;
- preserve text and lane readability;
- keep red reserved for harm;
- provide high-contrast/reduced-effects settings.

## 7.4 Particle budgets

All visual particles must be bounded by LOD.

- aggregate at regional scale;
- do not allocate per star every frame;
- cache deterministic fields;
- avoid per-object gradients where a shared layer works;
- cap trails and fade them predictably;
- report counts in F3.

---

# 8. In-system gameplay thesis

A system is not merely a market with planets behind it. It is a small logistics network whose geography and discoveries feed the aggregate interstellar economy.

The system layer should answer:

- where resources originate;
- where people live;
- what local transport capacity exists;
- which body hosts which facility;
- what has been surveyed or discovered;
- what local project is blocked;
- what rare opportunity exists here;
- how this system differs from every other market node.

## 8.1 Preserve aggregation

Do not require the player to manually route every shuttle forever.

The system layer uses two modes:

- **explicit/hot** when selected, tutorial-relevant, under crisis or hosting projects;
- **aggregate** when stable and off-screen.

Both must conserve the same production, stock and capacity truth.

## 8.2 Local nodes

Potential nodes:

- orbital stations;
- surface settlements;
- mining belts;
- moons;
- gas skimmers;
- shipyards;
- research arrays;
- derelicts;
- anomalies;
- alien/unknown sites;
- defence platforms;
- passenger terminals.

Each node needs a reason to exist mechanically.

## 8.3 Local transfer capacity

Facilities should not instantly contribute infinite output to the aggregate market.

Model a bounded local transport layer:

```js
sys.localLogistics = {
  capacityPerTick,
  assignments,
  backlog,
  efficiency,
  automated
}
```

Possible transfers:

- mine -> station market;
- farm -> habitat;
- refinery -> shipyard;
- passenger terminal -> evacuation ship;
- asteroid site -> depot;
- surface discovery -> research station.

The tutorial may expose one or two assignments. Later automation collapses routine flows into aggregate efficiency.

## 8.4 Shuttle decisions

The player can:

- assign local capacity by priority;
- add shuttles/freight infrastructure;
- automate stable flows;
- respond to local blockage;
- redirect capacity during construction or evacuation.

Avoid real-time shuttle micromanagement or physics steering.

---

# 9. Surface features and planetary character

## 9.1 Feature generation

Surveyed bodies may contain a bounded set of features:

- mineral basin;
- ice deposit;
- storm belt;
- ancient ruin;
- microbial biosphere;
- ocean vent;
- magnetospheric anomaly;
- abandoned station;
- artificial signal;
- rare geological formation;
- habitable valley;
- hostile weather zone.

Features derive from body type and system seed.

## 9.2 Feature roles

A feature should affect at least one:

- available facility;
- production/capacity;
- discovery data;
- passenger tourism;
- construction cost;
- local hazard;
- faction interest;
- event/content pool;
- Chronicle entry.

## 9.3 Rare planets and bodies

Rare objects should be rare enough to create destinations:

- habitable terrestrial worlds;
- ocean worlds;
- rogue/outer objects;
- neutron-star systems;
- white dwarfs;
- magnetars;
- unusual binaries;
- ringed giants;
- artificial megastructures;
- alien ecologies or traces.

Their value should exceed a flavour note while avoiding guaranteed huge rewards.

## 9.4 Aliens and unknown intelligence

Do not immediately turn alien content into a conventional faction empire.

Initial forms may be:

- biosignatures;
- ruins;
- signals;
- automated probes;
- ambiguous artefacts;
- extinct infrastructure;
- rare living encounters.

They should deepen exploration, logistics and ethical decisions. Any full alien polity requires a separate specification.

---

# 10. Stations and local economy

## 10.1 Station roles

A system may contain one or more station roles:

- market/anchorage;
- refinery;
- shipyard;
- cartographer vendor;
- passenger terminal;
- faction office;
- research archive;
- military picket;
- relief depot.

A station is a service bundle and physical anchor, not just a decorative sprite.

## 10.2 Market aggregation

The system market remains the main interstellar interface. Local nodes feed it through local logistics.

Rules:

- production enters the aggregate market subject to local capacity;
- construction draws from local/depot/project reservations;
- local shortage can block facility output;
- local passenger terminals affect boarding rate;
- stable automated systems can be simulated as aggregate rates;
- entering system view reveals causes without changing economic truth.

## 10.3 Asteroid mining

Asteroid belts should support:

- survey to locate deposits;
- build mine or dispatch specialised miner;
- finite/rich deposit variation where useful;
- local haul capacity to station;
- rare crystal/metal finds;
- depletion or maintenance only if it creates strategic decisions.

Avoid click-to-mine repetition.

---

# 11. System-view presentation

## 11.1 Readable orbital map

Show:

- star and orbital hierarchy;
- body type/scale cues;
- stations/sites;
- local transfer arcs;
- selected project;
- local ships/passenger movements;
- discoveries and unknown signals;
- threat effects.

## 11.2 Selection

Selecting a body/node should expose:

- known physical facts;
- features;
- current facility;
- output/input;
- local backlog;
- available project;
- relevant passenger/tourism demand;
- survey state.

## 11.3 Local flows

Use small directional arcs or particles:

- resource transfer;
- passenger shuttle;
- construction supply;
- evacuation;
- defence movement.

These are local equivalents of the Living Weave and should use the same visual grammar.

## 11.4 Do not bury system play in one long panel

Use contextual body cards, local project chips and the shared Command/Supply surfaces. Entering a system should not merely reveal a taller system panel.

---

# 12. Sol as authored opening system

Sol may be more authored than ordinary systems while still using the same rules.

Required local anchors:

- Earth Anchorage/population demand;
- Belt mining source;
- Mars industrial or construction need;
- one local station/shipyard;
- one first facility project;
- a clear local shuttle route;
- a jump-capable ship or repair project;
- first external signal toward Alpha Centauri or another real neighbour.

The prologue teaches:

1. select a local node;
2. move a required resource;
3. restore or build local capacity;
4. automate the local flow;
5. obtain interstellar capability;
6. leave Sol and reveal the neighbourhood.

Sol should feel inhabited before the galaxy opens.

---

# 13. Sim LOD and materialisation

## 13.1 Cohorts

### Hot

- selected/current system;
- detailed bodies, sites, local flows and projects;
- frequent local updates.

### Warm

- nearby, active routes, crisis, construction or passenger flows;
- materialised sites and aggregate local-capacity state;
- slower update cadence.

### Cold

- distant stable systems;
- archetype, seed and aggregate economy;
- no per-shuttle entities;
- deterministic materialisation when becoming warm/hot.

## 13.2 Conservation

Moving between LODs must preserve:

- stocks;
- production/consumption;
- local backlog;
- project progress;
- population;
- passenger commitments;
- facility state;
- discovery state.

Materialisation cannot create or erase resources.

## 13.3 Persistence

Save authoritative aggregate and authored changes. Do not save every decorative orbit particle or generated visual detail.

---

# 14. Implementation phases

## Phase 0 -- coordinate and distribution evidence

- document current coordinate conventions;
- measure Sol centrality, lane lengths, density by radius and graph metrics;
- validate Orion Spur/disk orientation;
- create deterministic screenshots/fixtures at key zoom levels;
- do not change gameplay yet.

## Phase 1 -- unified galactic frame and visual repair

- one local-to-galactic transform;
- integrate Orion Spur into disk generation;
- align sky band and positioned galaxy;
- add subtle dust/nebula layers with budgets;
- expose local bubble position in deep zoom.

## Phase 2 -- off-centre world generation

- generate larger candidate field;
- select asymmetric connected playable domain;
- preserve real catalogue anchors;
- add density/topology validators;
- adapt camera fit and run presets;
- keep economy tuning initially unchanged.

## Phase 3 -- discovery reveal and Sol opening

- knowledge states;
- start inside authored Sol;
- limited external signals;
- first jump reveal;
- map no longer defaults to a complete Sol-centred bubble.

## Phase 4 -- in-system logistics foundation

- explicit local nodes and local transfer capacity;
- one authored Sol chain;
- aggregation contract;
- local backlog and automation;
- contextual UI.

## Phase 5 -- planetary features and professions

- feature generation;
- asteroid mining;
- station roles;
- tourism/passenger hooks;
- rare body discoveries;
- alien traces/anomalies.

## Phase 6 -- hot/warm/cold LOD

- deterministic materialisation;
- crisis/project promotion to warm/hot;
- performance evidence;
- Badlands/deep-galaxy scaling.

## Phase 7 -- content and tuning

- regional visual identities;
- broader local event pools;
- balance system-count and travel commitment;
- Chronicle/discovery outcomes;
- update SPEC status after evidence.

---

# 15. Dependency-free tests

World generation:

1. same seed/settings produce identical catalogue/procedural field;
2. Sol is inside but not required to be near domain centre;
3. radial density around Sol is not an unintended generation driver;
4. real catalogue anchors retain expected positions;
5. procedural fill respects minimum distance and exclusion rules;
6. playable graph is valid under starting travel rules;
7. opening neighbourhood remains viable;
8. lane length/degree/bridge metrics remain within tested bands;
9. multiple strategic expansion directions exist;
10. Scourge origin selection remains valid in asymmetric domains.

Coordinate/render reports:

11. local-to-galactic transform round-trips within tolerance;
12. local bubble lies inside generated Orion Spur context;
13. arm/spur labels reference generated structures;
14. sky and positioned disk orientation use the same frame;
15. particle/layer counts remain capped by LOD;
16. reduced-effects mode disables expensive nonessential layers.

In-system:

17. local production enters aggregate stock subject to capacity;
18. hot and cold simulation produce equivalent bounded results over controlled periods;
19. materialisation preserves stock, population and projects;
20. local transfer cannot duplicate resources;
21. facility input/output and backlog remain finite;
22. authored Sol prologue resources always exist;
23. first jump reveal grants only intended knowledge;
24. planetary features are deterministic and body-compatible;
25. rare feature rates stay within configured bounds;
26. system-view body/site actions route through game actions;
27. browser boot renders authored Sol, ordinary system and rare-body fixtures;
28. no dependency or server requirement is introduced.

Evidence reports:

- Sol centrality versus other hubs;
- system density by spatial region;
- lane length and travel-time distribution;
- discovery pace;
- frame time by zoom/particle setting;
- hot/warm/cold tick cost;
- percentage of systems with distinct meaningful local features;
- player time spent in system view for decisions rather than sightseeing alone.

---

# 16. Acceptance criteria

This work is complete when:

- Sol is an origin inside an asymmetric local stellar field, not the geometric centre of generation;
- real stars anchor the neighbourhood and procedural fill respects their topology;
- the playable domain feels larger through travel, command and discovery rather than empty padding;
- the Orion Spur is visibly part of the Milky Way model;
- skybox, galactic disk and local coordinate frame agree;
- nebulae and dust add geography and atmosphere without obscuring decisions;
- the first run begins materially inside Sol and reveals the map through play;
- ordinary systems contain meaningful nodes, features and local projects;
- local logistics feeds the aggregate market through explicit capacity;
- asteroid mining, stations, rare bodies and alien traces create real reasons to enter systems;
- stable systems can aggregate without losing economic truth;
- system and galaxy particle flows share a coherent visual language;
- performance scales through LOD and profiling, not a new runtime;
- all systems remain deterministic, testable, offline and zero dependency.

## Final principle

Sol should be where the player begins, not where the universe appears to have been generated around them.