# STARWEFT Market Terminal and Systems Review

Status: implementation specification

Scope: targeted review of the current `main` branch, with the first implementation target being the Market Terminal and the Known Economy index.

## Non-negotiable constraint: zero dependencies

STARWEFT remains a plain HTML/CSS/JavaScript game that runs by double-clicking `index.html`.

This work must not introduce:

- npm, package managers, lockfiles, bundlers, transpilers, or build steps;
- third-party JavaScript, CSS, fonts, icons, charting packages, or CDN assets;
- framework runtimes or declarative UI libraries;
- Jest, Mocha, Playwright, Puppeteer, jsdom, or any other test dependency;
- a server requirement;
- an ES-module migration that breaks reliable `file://` boot;
- a WebAssembly or native compilation toolchain;
- a worker architecture that cannot run from `file://` in the supported browsers.

All implementation should use the existing classic-script `SW` namespace, browser APIs, Canvas 2D, CSS, and Node's standard library. New source files are welcome when they reduce coupling, but they must load through ordinary `<script src="...">` tags and remain compatible with `require()` in the headless tests.

The no-dependency constraint is not a temporary limitation. It is part of the product: the game is a durable object that can be copied, archived, opened offline, and understood from source.

---

## Executive assessment

STARWEFT is substantially healthier than a quick first reading suggests. The deterministic DOM-free simulation split is real, the action journal already exists, the smoke suite is extensive, the browser boot harness exercises the full stack, and the code has a coherent house style. The project does not need a framework transplant. It needs sharper boundaries inside its existing architecture.

The current Market Terminal is the clearest place to make that improvement visible. It already contains commodity selection, a tape, a supply map, opportunities, movers, bulletins, fleet information, and route summaries. The problem is not absence of features. The problem is hierarchy and truthfulness:

1. the panel calls itself a market but is trying to be an economy dashboard, route planner, fleet dispatcher, and fiction terminal at once;
2. its headline "Known Economy" metrics do not yet describe the known economy accurately;
3. commodity data dominates the main surface, while the more strategically important systemic picture remains three text rows;
4. several calculations belong in simulation analytics rather than UI rendering;
5. the panel rebuilds and rescans more state than necessary every refresh;
6. some labels imply measurements the game does not actually track.

The target is not a larger spreadsheet. The target is a readable economic instrument: one glance should answer whether the known weave is healthy, where it is failing, why it is failing, and what the player can do next.

---

# Part I — Critical code review

## 1. Architecture: preserve the shape, improve the seams

### What is already correct

The existing architecture makes several good decisions that should not be discarded:

- simulation files are DOM-free and runnable under Node;
- state is JSON-serializable and uses IDs rather than object references;
- UI mutations are generally routed through `SW.game.actions`;
- the game uses classic scripts so offline `file://` boot remains dependable;
- the smoke and browser-boot scripts provide a dependency-free test surface;
- the global `SW` namespace is crude but explicit, inspectable, and appropriate to the distribution model.

A migration to imported ES modules would be architectural churn with a real compatibility cost. It is not part of this plan.

### What needs improvement

The global namespace is acceptable; uncontrolled cross-module knowledge is not. The current problem is not `SW` itself but that UI code owns economic policy and repeats broad state scans.

Examples in the Market Terminal:

- `marketTarget()` lives in `ui.js`, despite defining what counts as adequate supply.
- `inboundCargo()` lives in `ui.js`, despite interpreting missions and directives.
- `marketRole()` lives in `ui.js`, despite classifying systems economically.
- `renderExchange()` calculates wealth, fleet value, routes, market rows, depth, opportunities, movers, fleet utilisation, and route summaries in one rendering function.

These should move into a small DOM-free analytics module. The UI should receive a report object and render it. This preserves the current architecture while removing policy from presentation.

### Required boundary

Add a classic-script module:

`js/market_analytics.js`

It should expose pure functions under `SW.market` or `SW.marketAnalytics`, use no DOM APIs, and be loaded before `ui.js`. It should also be added to the file lists in `test/smoke.js` and `test/browser_boot.js`.

The module owns:

- known/live system filtering;
- market targets;
- inbound and committed cargo accounting;
- commodity depth rows;
- local and galaxy-wide price momentum;
- the Known Economy report;
- source lookup using a supplied or cached market index;
- formatting-neutral classifications such as `needs`, `covered`, `producer`, and `stock`.

The UI owns:

- HTML construction;
- layout state;
- selected commodity;
- click actions;
- colors, labels, tooltips, and sparklines.

## 2. The current "Known Economy" leaks hidden information

The current `totalWealth` reduction scans every system, not only discovered systems. That contradicts the label "Known Economy" and can expose information about uncharted space through the aggregate value.

This is a correctness bug, not merely a presentation issue.

All headline economic metrics must use one explicit scope:

- `knownSystems`: discovered systems, including threatened and corrupted systems for counts and historical context;
- `liveKnownSystems`: discovered systems where `scourge !== 2`, used for active market calculations;
- `knownPopulationSystems`: discovered live systems with population greater than zero;
- `knownIndustrialSystems`: discovered live systems with one or more factory slots.

The report object should return these counts so every metric states its denominator.

## 3. "Wealth" is currently a misleading measurement

The panel values all inventory at its current local price. Because local prices rise as stocks fall, scarcity can make the same shrinking inventory appear more valuable. A starving network can therefore report impressive nominal wealth.

That number is not useless, but it is not wealth in the ordinary sense. It is marked-to-local-market inventory value, and it should not be the headline health measure.

Replace it with clearer measures:

- `inventoryValueBase`: stock valued at commodity base prices. Stable and comparable across time.
- `inventoryValueMarket`: stock valued at current local prices. Useful for nominal exposure, but labelled honestly.
- `fleetReplacementValue`: hull base costs or current hull costs, explicitly labelled.
- `playerLiquidCredits`: player credits only. System credits should not be implied unless they are a meaningful simulated quantity.

Do not merge these into one giant asset number by default. The central question is whether the weave functions, not whether every object has been assigned a price.

## 4. UI policy contains unexplained magic constants

`marketTarget()` currently embeds constants such as reserve floors, capacity fractions, consumption multipliers, and factory-input horizons directly in `ui.js`.

This creates three problems:

- the supply map can disagree with future simulation tuning;
- balance values cannot be inspected in one place;
- tests cannot validate the policy without loading the UI.

Move these values into `D.TUNE`, with names that state their purpose. Proposed keys:

```js
marketReserveMin: 12,
marketReserveCapFraction: 0.25,
marketConsumerReserveTicks: 160,
marketFactoryReserveTicks: 24,
marketMomentumSamples: 5,
marketReportEvery: 5,
```

The exact values may remain unchanged initially. The first goal is to make them named, testable, and shared.

## 5. The terminal repeats expensive scans

The current supply-map loop calls `SW.economy.cheapestSource()` for each depth row. `cheapestSource()` builds a fresh full `marketIndex()` every call. This converts a visually small table into repeated system-by-commodity scans.

The Market Terminal also separately scans systems for rows, scans ships for inbound cargo for each row, scans routes, computes opportunities, computes movers, and redraws every sparkline whenever the exchange refreshes.

With the current galaxy size this is survivable. With wider galaxies it becomes avoidable UI tax.

### Required fix

Build one market report per refresh:

```js
const report = SW.market.buildReport(state, exchangeComm);
```

Internally, `buildReport` should:

1. collect known/live systems once;
2. build or accept one `SW.economy.marketIndex(state)`;
3. build an inbound commitment map in one ship/directive pass;
4. compute headline metrics in one system pass;
5. compute the selected commodity depth using the same intermediate data;
6. return source IDs for actionable shortage rows without rebuilding the index.

The report should be a transient object. It should not be written into save state.

A small cache may be used inside the analytics module, keyed by state object, tick bucket, and selected commodity. It must never become authoritative state.

## 6. Refresh policy is too blunt

While the exchange is open, `refreshTick()` rebuilds the entire terminal whenever the simulation tick changes. That means replacing the complete `innerHTML`, reattaching commodity listeners, and redrawing spark canvases.

This is acceptable as a first implementation technique but should be throttled independently from simulation speed.

Proposed policy:

- topbar: current cadence;
- exchange headline and commodity numbers: at most every `D.TUNE.marketReportEvery` simulation ticks, unless a direct player action changes market state;
- selected-commodity switch: immediate;
- route/fetch/directive actions: immediate refresh;
- bulletins: rotate on their existing slower cadence;
- sparklines: redraw only when their `data-hist` payload changes.

Do not introduce a virtual DOM. A two-key render stamp is enough:

```js
lastExchangeTickBucket
lastExchangeCommodity
```

## 7. The commodity tape is structurally biased

Rows are sorted cheap-first and truncated to thirty. This is useful for finding sources, but it can omit the most expensive sinks entirely. A tape that shows only one side of the market is not a market overview.

Replace the single cheap-first table with one of these dependency-free structures:

- a two-column source/sink ladder;
- a single table divided into `SUPPLY` and `DEMAND` groups;
- a compact depth strip showing the cheapest five and dearest five, with the full supply map beneath.

The recommended design is a right-hand commodity rail with:

- cheapest sources;
- dearest sinks;
- local movers;
- supply-chain recipe;
- one-click focus, fetch, route, and keep actions.

The full-system table should not be the dominant first view.

## 8. Movers are too aggregated

`tickerMovers()` averages a commodity across many systems. This can identify a broad inflationary move, but it hides local shocks: one system can be collapsing while the average remains flat.

Keep the galaxy-wide commodity mover for the ticker. Add local movers to the terminal:

- largest percentage price rise by system and commodity;
- largest percentage price fall by system and commodity;
- minimum history length before inclusion;
- clamp or flag moves caused by newly created short histories;
- click to focus the system and select the commodity.

The report should expose both:

```js
report.galaxyMovers
report.localMovers
```

## 9. Current labels overpromise what is measured

The current panel can display route count and cumulative route profit, but it does not yet have robust per-tick shipping throughput or realised trade profit statistics.

Do not label estimates as throughput.

There are two implementation levels:

### Level A — available without save-schema changes

- active routes;
- ships in transit;
- cargo currently in transit;
- committed inbound cargo;
- cumulative deliveries;
- cumulative credits earned;
- idle logistics ships;
- average prosperity;
- current stocks, capacities, production, consumption, and price ratios.

### Level B — requires explicit instrumentation

- cargo units delivered by tick window;
- realised trade profit by tick window;
- route revenue versus upkeep;
- fulfilment latency;
- shortage duration;
- factory downtime.

Level B should be added later through small cumulative counters and sampled deltas. It must include save migration and tests. The first Market Terminal pass should not fake these values from weak proxies.

## 10. Encoding and text integrity need a gate

The current terminal source contains mojibake such as `Â·`. This is visible technical debt in a game whose interface depends heavily on typographic atmosphere.

Add a dependency-free source-integrity test that scans text source files for common mojibake sequences:

- `Â`
- `Ã`
- replacement character `�`

The test should fail with file and line information. This can live inside `test/smoke.js` or a new `test/source_integrity.js` using only `fs` and `path`.

Do not normalize the entire repository casually. Fix confirmed sequences and preserve intentional Unicode symbols.

## 11. Accessibility should be built into the terminal pass

The interface uses color effectively, but color is often carrying semantic load alone.

Required improvements:

- every icon-only button receives a useful `title` and `aria-label`;
- price direction uses a glyph and signed number, not only green/orange;
- all tables include a `<caption>` or an accessible heading association;
- actionable rows use real buttons, not click handlers on inert text;
- keyboard focus remains visible;
- commodity chips are buttons or expose button semantics and pressed state;
- the selected commodity is announced through `aria-pressed` or an equivalent state;
- the terminal can be closed with Escape without losing map focus permanently.

No accessibility library is needed.

---

# Part II — Product specification

## 12. Product goal

The Market Terminal should answer four questions in this order:

1. **Is the known weave healthy?**
2. **What is changing?**
3. **Where is the most important failure or opportunity?**
4. **What can I dispatch right now?**

The existing panel answers question four well and question three partially. The redesign must make questions one and two primary without burying the operational controls.

The commodity market is retained, but moved into a secondary side rail. It remains actionable and useful; it no longer defines the whole information hierarchy.

## 13. Layout

### Wide layout

The panel uses three conceptual regions:

```text
+---------------------------------------------------------------+
| THE MARKET / KNOWN WEAVE                         close / help  |
+--------------------------------------+------------------------+
|                                      | COMMODITY RAIL         |
| KNOWN ECONOMY                        | selected commodity     |
| headline index + trend               | sources / sinks        |
|                                      | movers / recipe        |
| prosperity / essentials / industry  | fetch / route / keep   |
| alerts and pressure map              |                        |
+--------------------------------------+------------------------+
| SYSTEMIC SHORTAGES / OPPORTUNITIES / ROUTE HEALTH             |
+---------------------------------------------------------------+
```

Recommended width split:

- main economy surface: roughly two thirds;
- commodity rail: roughly one third;
- bottom action surface: full width where space allows.

### Narrow layout

At narrow widths:

1. Known Economy headline;
2. subindices;
3. urgent pressures;
4. commodity selector and depth;
5. opportunities and routes.

Horizontal tables should become compact row cards before they create page-level horizontal scrolling.

### Relationship to the map

The map remains the game. The terminal should not become a permanent management replacement for it.

- clicking a system action closes or de-emphasizes the terminal and centers the map;
- the panel remains visually lighter than a separate full-screen application;
- the terminal should explain and dispatch, while the map shows consequences.

## 14. The headline: Weave Health

Add one aggregated score called **WEAVE HEALTH**, scaled from 0 to 100.

It is a summary, not a victory score. It must always be decomposable into visible subindices.

Proposed formula:

```text
Weave Health =
  35% Population Prosperity
+ 30% Essential Supply
+ 20% Industrial Continuity
+ 15% Logistics Coverage
```

Each component is clamped to 0–100.

### Population Prosperity

Population-weighted average prosperity across known live population systems:

```text
sum(system.prosperity * system.pop) / sum(system.pop)
```

If no population is known, return `null`, not 0.

### Essential Supply

Population-weighted average of current need satisfaction across known live population systems.

Prefer the simulation's current `sys.satNeed` because it reflects realised FOOD/FUEL consumption. The panel may also show reserve cover separately.

```text
100 * sum(sys.satNeed * sys.pop) / sum(sys.pop)
```

### Industrial Continuity

Fraction of known factory slots that could currently execute their assigned recipe for one normal run, including output-capacity availability.

For `ANY` fabricators, the slot is active if at least one currently unlocked valid recipe can run.

```text
100 * runnableSlots / totalSlots
```

If no industrial slots are known, return `null` and reweight the remaining components rather than treating absence as collapse.

### Logistics Coverage

Measures how much of identified reserve demand is already covered by stock and committed inbound cargo.

For each demanded system/commodity pair:

```text
coverage = clamp((stock + inbound) / target, 0, 1)
weight = target
```

Then:

```text
100 * sum(coverage * weight) / sum(weight)
```

This rewards the player for building a network that is already responding, not merely for having ships.

### Missing components

When a component is not applicable, omit it and renormalize the remaining weights. The report should expose the effective weights for transparency and tests.

## 15. Headline presentation

The main surface shows:

- `WEAVE HEALTH 73`;
- plain-language state: `STABLE`, `STRAINED`, `FRACTURING`, or `THRIVING`;
- a compact trend glyph if historical samples exist;
- the four component scores;
- the strongest positive driver;
- the strongest negative driver.

Suggested thresholds:

- 85–100: THRIVING
- 65–84: STABLE
- 40–64: STRAINED
- 0–39: FRACTURING

These labels should be tuning constants.

Example explanation:

```text
WEAVE HEALTH 58 — STRAINED
Prosperity 71 · Essentials 43 · Industry 62 · Coverage 55
Pressure: FOOD reserves failing across 4 population systems.
Strength: 78% of industrial slots remain supplied.
```

The player should never need to guess why the score moved.

## 16. Secondary economic indicators

The main surface should also show a small set of truthful indicators.

### Known systems

- discovered / total;
- live / threatened / corrupted;
- known population.

This establishes the scope of every other number.

### Base inventory value

Value all live known system stock at commodity base prices. This is a stable physical-capital proxy.

### Market inventory value

Value the same stock at current local prices. Label it as nominal market value.

### Price level

A fixed-basket price index, where 100 equals base prices.

For each unlocked commodity:

1. average `price / base` across live known systems;
2. weight by `1 + tier * 0.5`;
3. compute the weighted mean and multiply by 100.

This is a legible index, not academically perfect macroeconomics. It should be named `PRICE LEVEL`, not inflation unless a time comparison is shown.

### Price change

Inflation/deflation is the percentage change in the price level between sampled report history points.

```text
(currentPriceLevel / previousPriceLevel - 1) * 100
```

The sample horizon must be displayed in a tooltip.

### Capacity fill

```text
total stock / total capacity
```

Show it as `stores 46% full`, not industrial utilisation. Stock fullness and factory utilisation are different concepts.

### Network load

For the first pass:

- ships in transit;
- cargo units in transit;
- active routes;
- idle eligible logistics ships.

Do not call this throughput until delivery-window counters exist.

## 17. Pressure list

Below the headline, show the most consequential systemic pressures, not every deficit.

Each pressure is derived from report data and is actionable.

Examples:

- `FOOD — 4 worlds below reserve, 26 units committed, 81 still missing`
- `FUEL — average price 41% above base`
- `ALLOY — 6 factory slots input-starved`
- `Meds — prosperity drag concentrated in the Reach`
- `Scourge — 2 known markets removed from the weave`

Selection rules:

- rank by weighted unmet target value;
- boost FOOD and FUEL because they affect needs;
- boost inputs that block multiple factory slots;
- merge many local shortages into one systemic pressure;
- provide a disclosure action to show constituent systems.

Each pressure offers the smallest useful actions:

- focus worst system;
- select commodity;
- issue fetch;
- create route if unlocked;
- create or edit directive if unlocked.

## 18. Commodity rail

The commodity rail keeps the existing usefulness but becomes compact and directional.

### Commodity selection

Use real buttons with:

- icon;
- short name;
- current known price-level ratio;
- up/down/flat momentum glyph;
- accessible selected state.

Locked commodities remain hidden until appropriate.

### Selected commodity summary

Show:

- average known price;
- price level versus base;
- total known stock / capacity;
- direct production per tick;
- direct consumption per tick;
- committed inbound cargo;
- number of systems below target;
- largest local rise and fall.

### Source and sink ladder

Show the cheapest sources and dearest sinks side by side or in clearly separated groups.

Each row includes only what supports a decision:

- system;
- stock or free capacity;
- price;
- recent direction;
- focus/fetch/route action.

Do not truncate a cheap-first list and pretend it represents both sides.

### Supply chain

For manufactured goods, show the recipe and current bottleneck input. `weave route` remains available when the relevant tech is unlocked.

### Full depth

The existing supply map can remain as an expandable detail section rather than the first dominant table.

## 19. Opportunities

The current opportunity list optimizes margin with a distance dampener. The redesigned list should present the score honestly.

Each opportunity row should show:

- commodity;
- source and destination;
- unit margin;
- route distance or estimated travel ticks;
- estimated cargo fit for the selected/default hull;
- approximate gross value per trip;
- a warning when the destination gap is already covered by inbound cargo.

A later pass may add profit per tick. Do not display `¤/tick` until the estimate includes travel path, hull speed, upkeep, loading assumptions, and route stop behavior.

## 20. Diegetic material

Bulletins, classifieds, faction advertisements, trader characters, and numbers-station fragments remain part of the design, but they must not interrupt the data hierarchy.

Rules:

- fiction occupies a clearly marked broadcast strip or side section;
- urgent economic alerts outrank flavor;
- repeated lines rotate slowly and deterministically;
- actionable classifieds must be real game objects, not decorative fake buttons;
- if two bulletins differ only in prose, prefer one stronger template.

The terminal can be atmospheric without becoming noisy.

---

# Part III — Implementation plan

## 21. Phase 1: analytics extraction and correctness

Files:

- add `js/market_analytics.js`;
- update `index.html` load order;
- update `test/smoke.js` file list and analytics tests;
- update `test/browser_boot.js` file list;
- add named tuning values to `js/data.js`;
- remove market policy helpers from `js/ui.js` after callers move.

Deliverables:

- explicit known/live scope;
- no hidden-system leakage;
- one-pass inbound commitment map;
- one market index per report;
- commodity depth report;
- Weave Health components;
- stable/base and nominal inventory values;
- price level;
- pressure ranking;
- no visible UI redesign yet beyond swapping calculations to the report.

Acceptance gate:

- both existing test scripts pass;
- new analytics tests pass;
- same seed produces identical report data;
- report construction never mutates state;
- corrupted and undiscovered systems are handled according to scope rules.

## 22. Phase 2: information hierarchy redesign

Files:

- `js/ui.js`;
- `style.css`;
- `test/browser_boot.js`.

Deliverables:

- Known Economy becomes the main surface;
- commodity market moves to the side rail;
- source and sink groups replace the one-sided tape;
- pressures become first-class actionable rows;
- existing quick-route, fetch, focus, keep, employ-idle, and bulk assignment actions survive;
- responsive stack at narrow widths;
- accessible labels and selected states;
- fix confirmed mojibake in the touched surface.

Acceptance gate:

- no loss of current market actions;
- browser boot harness opens and refreshes the terminal;
- no horizontal page overflow at representative narrow width in the stub/manual check;
- terminal remains usable with keyboard focus;
- no third-party code or assets.

## 23. Phase 3: report history and truthful rates

This phase is optional for the initial PR and requires save-awareness.

Add a compact analytics sample history, either:

- transient for the current session; or
- versioned in state if run-history persistence is worth the save cost.

Potential counters:

- cargo units sold/delivered;
- realised trade profit;
- upkeep paid;
- factory blocked ticks;
- system shortage ticks.

Sample cumulative counters and compute window deltas. Never append unbounded per-tick logs to save state.

Acceptance gate:

- save migration is explicit;
- history arrays are capped;
- rates are reproducible under deterministic replay;
- labels state the sample horizon.

## 24. Phase 4: UI decomposition without frameworks

The Market Terminal is the first candidate for splitting `ui.js`, but this should be done only after behavior is covered.

A safe dependency-free pattern:

- `js/ui_market.js` defines `SW.uiMarket` with rendering helpers;
- it accepts state, report, selected commodity, and action-markup callbacks;
- it returns HTML strings or updates a supplied root element;
- `ui.js` remains the event-dispatch owner during the first split;
- no module loader or framework is introduced.

This reduces file size and review surface without changing runtime assumptions.

Do not perform a repository-wide UI rewrite in the same commit as the economic redesign.

---

# Part IV — Dependency-free testing plan

## 25. Extend the existing tests rather than replacing them

The repository already has meaningful tests. The earlier claim that it only had a basic smoke test was inaccurate. `test/smoke.js` exercises many subsystems and invariants; `test/browser_boot.js` loads the full browser stack against a stub DOM.

The correct move is to deepen those scripts with small test helpers, not import a framework.

## 26. Analytics test cases

Add a dedicated section to `test/smoke.js` or a new standard-library script.

Required cases:

1. **Known-scope isolation**
   - change stocks in an undiscovered system;
   - assert Known Economy metrics do not change.

2. **Corruption scope**
   - corrupt a discovered system;
   - assert it remains in known counts but leaves live market values.

3. **No mutation**
   - serialize selected state fields before and after report construction;
   - assert equality.

4. **Determinism**
   - same seeded state and commodity produce identical report JSON.

5. **Price level baseline**
   - set every live known stock to the fill ratio that yields base price;
   - assert price level is approximately 100.

6. **Essential collapse**
   - empty FOOD and FUEL at population systems;
   - tick once to update satisfaction;
   - assert Essential Supply and Weave Health fall.

7. **Industrial continuity**
   - create runnable and blocked recipe slots;
   - assert the ratio is correct.

8. **Inbound coverage**
   - add a relevant supply mission or directive cargo;
   - assert logistics coverage rises without changing stock.

9. **Index reuse behavior**
   - expose a debug counter only in the test or pass an index into report construction;
   - assert a report does not rebuild the market index per shortage row.

10. **Finite metrics**
    - empty/no-pop/no-slot edge cases return `null` or finite values, never `NaN`.

## 27. Browser-boot test cases

Extend `test/browser_boot.js` to assert:

- the terminal contains `WEAVE HEALTH`;
- the terminal renders a commodity rail;
- selecting a commodity changes the rail without throwing;
- existing quick route/fetch/focus actions remain present;
- the panel survives 300 ticks and repeated refreshes;
- icon-only close/focus buttons have accessible labels;
- the terminal handles a state with no discovered demand;
- the terminal handles a corrupted selected source cleanly.

The stub DOM may need small additions for ARIA attribute access. Keep those additions local and dependency-free.

## 28. Performance test

Add a coarse benchmark mode using `process.hrtime.bigint()`:

- generate a standard game;
- reveal all systems;
- build 100 reports across commodities;
- print median/mean duration;
- do not set a fragile wall-clock assertion in the normal smoke suite;
- optionally assert a generous upper bound only for catastrophic regression detection.

The main measurable invariant should be scan count and algorithmic shape, not a machine-specific millisecond target.

---

# Part V — Broader codebase recommendations

## 29. Command grammar

The atomic command queue and journal are already present. The next improvement is not replacing mutation with an immutable reducer. Full-state immutability would generate allocation pressure and fight the current deterministic simulation style.

Instead:

- keep authoritative mutations inside game actions and simulation modules;
- keep commands as serializable data;
- add validators for command shapes;
- centralize queue compilation and why-lines;
- add queue editing and interrupts incrementally;
- require every automated ship to explain its current action in one line.

This aligns with the existing code rather than importing an alien state-management architecture.

## 30. Data orientation

Do not pre-emptively convert the simulation to Structure-of-Arrays or typed arrays.

The current object model is readable and the test suite is built around it. SoA is justified only after profiling shows a hot loop that cannot be fixed by reducing repeated work, caching derived indexes, or lowering simulation detail.

Priority order:

1. remove repeated scans;
2. cache derived indexes within a tick/report;
3. reduce cold-system simulation work;
4. profile again;
5. convert only the proven hot data path if still necessary.

## 31. Rival convoys and shared logistics

Rivals should eventually use the same economic facts and route primitives as the player, but not necessarily the same UI command compiler.

The important invariant is shared world consequence:

- rivals buy from actual stock;
- rivals sell into actual capacity;
- their cargo exists while in flight;
- they flatten or redirect price gradients;
- they can be observed, protected, taxed, or attacked;
- their collapse causes a measurable supply shock.

The Market Terminal should be able to display rival committed cargo once convoy entities exist.

## 32. Telemetry

Telemetry should remain opt-in developer instrumentation using standard APIs.

Recommended forms:

- capped arrays in memory;
- JSON or CSV export generated in the browser;
- Node bot runs writing CSV with `fs`;
- an F3 overlay drawn with existing DOM/Canvas primitives.

Do not add analytics services, remote reporting, databases, or runtime packages.

## 33. Saves and migration

Any new persistent counters or report histories require:

- `SAVE_VERSION` increment;
- a migration function with explicit old/new versions;
- validation of missing fields;
- capped arrays;
- a test loading a synthetic previous-version save.

Pure report calculations should remain transient and avoid save changes in Phase 1.

## 34. Error handling

Avoid a large logging framework. Add lightweight development assertions at module boundaries and route failures through the existing paused-simulation error path.

Useful checks:

- report values finite or explicitly `null`;
- source/sink IDs refer to live known systems;
- committed cargo never negative;
- target values finite and within capacity;
- no action generated for an invalid or corrupted endpoint;
- UI labels never display `NaN`, `undefined`, or mojibake.

---

# Part VI — Definition of done

The Market Terminal overhaul is done when:

- STARWEFT still runs by double-clicking `index.html` with no server and no build;
- the repository contains no third-party runtime or development dependency;
- `node test/smoke.js` passes;
- `node test/browser_boot.js` passes;
- Known Economy uses discovered data only and never leaks hidden systems;
- Weave Health is decomposable and tested;
- every headline metric has a clear formula and scope;
- the main panel foregrounds the galaxy-wide economy;
- the commodity market is a useful side rail rather than the whole page;
- sources and sinks are both visible;
- existing focus/fetch/route/keep actions survive;
- report construction is pure and avoids repeated market-index builds;
- the panel does not refresh more often than its data needs;
- touched controls have useful accessible labels and visible keyboard focus;
- no displayed metric claims to be throughput, profit rate, inflation, or utilisation unless the underlying quantity is actually measured;
- no confirmed mojibake remains in the touched market surface;
- the map remains the primary game surface.

## Final design principle

The terminal should not merely tell the player where prices differ. It should reveal the shape of the world they have made.

A good STARWEFT market screen says:

> Four worlds are hungry. Two are already being served. One factory chain is about to fail. Your routes can save it.

Then it puts the correct ship one click away.