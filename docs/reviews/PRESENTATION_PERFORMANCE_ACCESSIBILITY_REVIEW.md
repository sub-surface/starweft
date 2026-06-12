# STARWEFT Presentation, Performance and Accessibility Review

Status: implementation specification

## Hard constraints

The game remains a zero-dependency, zero-build, offline browser program. Use plain HTML/CSS/JavaScript, Canvas 2D, generated WebAudio and the existing Node standard-library test harnesses. No UI framework, charting library, icon package, font download, CDN, image pipeline or browser automation dependency.

---

# 1. Executive assessment

STARWEFT's presentation already has a distinct identity: monochrome operational surfaces, restrained spectral color, a 3D-feeling Canvas 2D galaxy, generated star fields, route lines, system views, portraits, WebAudio and a dense but coherent cockpit layout.

The main risks are now:

- presentation hierarchy becoming flatter as more systems arrive;
- `ui.js` and `render.js` becoming increasingly monolithic;
- full-panel `innerHTML` replacement creating avoidable layout work and interaction jitter;
- effects and labels competing at far zoom;
- controls relying on icons, color and pointer hover;
- performance work being guided by intuition instead of frame/tick profiles;
- accessibility being added after UI structure hardens.

The goal is not to make STARWEFT look like a modern web dashboard. It is to make its existing command-console aesthetic more legible, stable, tactile and scalable while keeping the map primary.

---

# 2. Information hierarchy

## 2.1 Every surface needs one primary question

Recommended responsibilities:

- **Map**: Where is the network, what is moving, and where is pressure forming?
- **System panel**: What is true here, what does this place need, and what can be built or dispatched?
- **Selected ship command home**: What is this ship doing and what should it do next?
- **Dock tabs**: What persistent fleet, route, operation, research or identity systems need management?
- **Market Terminal**: Is the known economy healthy, where are failures, and what should move?
- **Infobox**: Explain the currently hovered or selected concept.
- **Ticker/alerts**: What changed that deserves attention?
- **Modal**: What decision is important enough to interrupt play?

When a surface cannot state its primary question, it is likely accumulating unrelated controls.

## 2.2 Stable placement over adaptive jumping

Panels may collapse, but important controls should not move unpredictably when data changes.

Rules:

- selected-ship current action stays in the same region;
- close/back controls stay at consistent corners;
- primary actions are not replaced by unrelated state text;
- optional sections expand below stable summaries;
- alerts do not resize the whole topbar violently;
- disabled actions remain visible when teaching a future capability is useful, with an explanation.

## 2.3 Decision-first grouping

Group information by decisions, not by implementation object.

Example for a system:

1. immediate pressure;
2. available dispatch actions;
3. market and reserves;
4. production and facilities;
5. local actors and threats;
6. descriptive detail.

Do not lead with an exhaustive data dump and place the actual action at the bottom.

---

# 3. Visual language

## 3.1 Semantic palette

Keep the restrained palette, but formalize roles:

- neutral ink: ordinary information;
- dim ink: secondary context;
- player accent: selection, route ownership and positive focus;
- green/cool cue: favorable price or restored condition;
- amber/orange cue: pressure, volatility or caution;
- red: immediate harm, loss or irreversible threat;
- purple/black: Scourge corruption;
- faction colors: identity only, never the sole state cue.

Every colored state also needs one of:

- shape;
- glyph;
- label;
- line style;
- numeric sign.

## 3.2 Typography

No external fonts.

Use the system stack and current monospace/operational styling deliberately:

- large headings are rare;
- labels use consistent case;
- numbers align with tabular/monospace treatment where supported;
- long prose is kept out of narrow tables;
- minimum interactive text size is defined in CSS variables;
- abbreviations have tooltips or infobox entries.

## 3.3 Icon grammar

Create a small internal icon dictionary rather than choosing symbols ad hoc.

Each icon must have:

- one semantic meaning;
- a text label in accessible name;
- consistent use across panels;
- a fallback if glyph support is poor.

Examples:

- focus;
- send;
- fetch;
- route;
- pause;
- warning;
- threat;
- survey;
- data;
- build;
- market;
- queue.

The dictionary can live in `data.js` or a DOM-free UI constants module.

---

# 4. Map readability

## 4.1 Draw-order policy

Define draw order explicitly:

1. background/sky;
2. regions and broad environmental fields;
3. distant galaxy context;
4. inactive lanes;
5. active route/rival/front overlays;
6. systems;
7. ships and trails;
8. selections and warnings;
9. labels;
10. transient effects;
11. performance/debug overlay.

This prevents new effects from accidentally obscuring core navigation.

## 4.2 LOD by decision relevance

Existing distance thresholds are a good start. Refine LOD around what the player can decide at each scale.

### Local/system scale

Show:

- bodies;
- facilities;
- local flows;
- selected ship detail;
- construction sites;
- local pressure.

### Network scale

Show:

- systems;
- lanes;
- player routes;
- ships;
- shortages and threat markers;
- labels for selected, hovered and urgent systems.

### Regional scale

Show:

- clusters;
- major flows;
- rival territories;
- Scourge front;
- relay coverage;
- only high-priority labels.

### Galactic context scale

Show:

- bubble as aggregate;
- Badlands bridges;
- arm/context labels;
- major endgame destination;
- no individual ship labels.

LOD should remove low-value detail before it removes state-critical markers.

## 4.3 Label budget

Labels need a collision and priority policy.

Priority order:

1. selected;
2. hovered;
3. threatened/critical objective;
4. bookmarked;
5. major known hub;
6. contextual region/arm label;
7. ordinary systems.

Use a fixed per-frame label budget and simple overlap rejection. No external spatial library is required.

## 4.4 Route and traffic legibility

Player, rival and emergency movement should differ by more than color:

- player route: solid or gently pulsing;
- rival line: dashed or segmented;
- emergency/evacuation: directional pulses;
- blocked lane: broken/crossed;
- Scourge front: pressure glow or advancing stipple;
- selected route: increased weight and reduced surrounding noise.

At high traffic, aggregate route activity into lane heat rather than drawing every trail at full intensity.

## 4.5 Camera behavior

Camera actions should be predictable:

- focus preserves orientation where possible;
- dramatic zoom is bounded and interruptible;
- manual pan cancels follow;
- selection does not unexpectedly enter system view;
- entering and exiting system view preserve a sensible galaxy return position;
- keyboard focus actions and pointer actions use the same camera rules;
- reduced-motion mode shortens or removes easing.

---

# 5. UI architecture without frameworks

## 5.1 Split by surface, not by tiny component

`ui.js` is large, but atomizing every button into a component system would add ceremony.

Recommended classic-script modules:

- `ui_market.js`
- `ui_ship.js`
- `ui_system.js`
- `ui_routes.js`
- `ui_tech.js`
- `ui_modals.js`
- `ui_accessibility.js`

Each attaches a small object to `SW`, accepts data/action callbacks and owns one stable root. `ui.js` remains the coordinator and event dispatcher during migration.

## 5.2 Render stamps

Each surface should render only when its relevant inputs change.

Examples:

- system panel stamp: selected system, tick bucket, expanded sections;
- ship panel stamp: selected ship, queue revision, tick bucket;
- market stamp: commodity, report tick bucket, unlock state;
- route panel stamp: route revision, assignment revision;
- tech panel stamp: research, unlocked set, viewport state.

Avoid deep state comparison. Maintain small revision counters for player mutations where useful and use coarse tick buckets for live simulation data.

## 5.3 Event delegation

Keep event delegation, but split action handling into named maps or surface handlers rather than one ever-growing switch.

Pattern:

```js
const handlers = {
  focusSys: handleFocusSys,
  fetchOp: handleFetch,
  quickRoute: handleQuickRoute,
};
```

Requirements:

- unknown actions report in development mode;
- disabled actions cannot fire through nested elements;
- actions parse and validate dataset inputs centrally;
- simulation mutations continue through `SW.game.actions`.

## 5.4 Safe markup helpers

Do not add a templating library.

Provide a few internal helpers:

- escape text;
- numeric formatting;
- accessible icon-button markup;
- progress bar markup;
- empty state markup;
- semantic status badge markup.

Avoid a general home-grown framework.

---

# 6. Accessibility specification

## 6.1 Keyboard operation

Required global keys:

- Space: pause;
- 1/2/3: speed;
- Escape: close topmost surface or cancel current targeting mode;
- `/`: focus search;
- `F`: focus selected system/ship where not editing text;
- optional documented keys for dock tabs and command actions.

Rules:

- keys do not trigger while typing in input/select/textarea/contenteditable;
- every pointer-only action receives a keyboard path;
- map selection can be navigated through search/bookmarks even if full spatial keyboard navigation is deferred;
- focus is returned sensibly after modal close.

## 6.2 Focus

- never remove visible focus outlines without replacement;
- modal focus is contained while open;
- first meaningful control receives focus;
- closing a modal returns focus to its opener;
- panel rerenders preserve focus when possible;
- destructive actions require clear labels and confirmation proportional to consequence.

## 6.3 Semantic controls

- use `<button>` for actions;
- use `<input>` and `<select>` with labels;
- icon-only buttons have `aria-label` and `title`;
- toggle buttons expose `aria-pressed`;
- tabs use appropriate roles or at minimum explicit selected state;
- tables use captions/headings and true header cells;
- progress bars expose value text;
- alerts use a restrained live region only for important changes.

Avoid flooding screen readers with every tick update.

## 6.4 Color and contrast

Add CSS variables for:

- high-contrast mode;
- danger/caution/good states;
- focus ring;
- dim text floor;
- selected background;
- line visibility.

Provide a manual settings toggle rather than depending solely on media queries. Use labels/glyphs alongside color.

## 6.5 Motion

Reduced-motion mode should:

- disable or shorten camera easing;
- reduce pulsing glows;
- limit portrait animation;
- disable nonessential trail persistence;
- replace flashing warnings with static high-contrast markers;
- preserve essential state transitions.

Use `prefers-reduced-motion` as a default hint and allow an explicit setting.

## 6.6 Audio accessibility

Important events need non-audio cues. Separate controls for:

- master mute;
- music;
- effects;
- alert intensity where practical.

Audio initialization and missing `AudioContext` must continue to fail gracefully.

---

# 7. Game feel and feedback

## 7.1 Feedback tiers

### Tier 1 — routine

Examples:

- buy/sell;
- route stop;
- ordinary arrival.

Feedback:

- subtle sound;
- small local visual cue;
- no modal;
- optional log entry only when diagnostically useful.

### Tier 2 — milestone

Examples:

- first route loop;
- new facility;
- system restored;
- significant discovery;
- major research unlock.

Feedback:

- stronger sound;
- camera/map emphasis;
- concise toast;
- chronicle entry where appropriate.

### Tier 3 — crisis

Examples:

- system threatened;
- ship lost;
- route severed;
- rival collapse;
- Scourge phase change.

Feedback:

- clear alert;
- persistent map marker;
- actionable focus;
- stronger but non-flashing audio/visual cue;
- modal only when a decision is required.

## 7.2 Avoid feedback spam

Aggregate repetitive events:

- multiple route deliveries in one tick become one summary when not selected;
- repeated shortage warnings use cooldown and changed-severity thresholds;
- high-speed simulation batches routine toasts;
- selected ship/system may show greater detail;
- event logs retain diagnosis without covering the screen.

## 7.3 Consequence emphasis

When cargo arrives, prefer showing the most meaningful result:

- reserve restored;
- factory restarted;
- build requirement completed;
- prosperity stabilized;
- contract completed;
- price margin realized.

Credits remain visible, but not every delivery should be framed solely as money.

---

# 8. Performance review

## 8.1 Define budgets

Budgets are targets, not promises across every device.

At a representative desktop resolution:

- 60 fps target during normal map interaction;
- graceful 30 fps floor under stress;
- normal frame work under roughly 12–14 ms where possible;
- simulation tick comfortably below its 500 ms real-time interval at 1x;
- 10x speed should not accumulate an unbounded tick backlog;
- hidden panels should perform negligible work;
- full UI refresh should not occur every animation frame.

Record actual device/context when reporting measurements.

## 8.2 Instrument first

Extend F3 overlay to show:

- rolling frame time;
- draw time;
- UI update time;
- last tick time;
- systems drawn;
- lanes drawn;
- ships drawn;
- labels accepted/rejected;
- active effects;
- current LOD band;
- optional memory/allocation proxies where browser support exists.

Keep instrumentation out of save state.

## 8.3 Rendering hot spots

Audit:

- repeated projection of static points;
- lane drawing at distant scales;
- glow/shadow state changes;
- gradients created per object per frame;
- trail arrays and effect cleanup;
- label measurement;
- off-screen object work;
- high-DPR canvas cost;
- full-screen overdraw;
- system-view orbital detail.

Optimizations should preserve visual hierarchy.

## 8.4 Caching policy

Safe caches:

- static sky/galaxy point generation;
- precomputed lane endpoints in world coordinates;
- label text widths by font/text;
- derived route geometry until topology changes;
- system sprite layers by type/LOD if profiling supports it;
- market/report calculations by tick bucket.

Every cache needs an invalidation rule. Avoid hidden authoritative state.

## 8.5 DPR and resize

Current DPR cap is sensible. Add:

- performance setting for DPR scale;
- resize debounce for expensive regenerated buffers;
- minimum canvas dimensions;
- browser zoom and high-DPI checks;
- no CSS layout reads inside large draw loops.

## 8.6 UI performance

Measure:

- `innerHTML` replacement time;
- layout/reflow after large panel renders;
- listener rebinding;
- sparkline redraws;
- hidden modal construction;
- large route/fleet list rendering.

Use pagination, collapsed sections or bounded lists only where the player still has access to full data through search/filter.

Do not add a virtual DOM.

## 8.7 Simulation performance

Before SoA or WASM:

1. remove repeated scans;
2. reuse indexes within a tick;
3. avoid repeated BFS for identical endpoints/policies;
4. reduce cold-system work;
5. cap history arrays;
6. profile again.

Typed arrays or alternate runtimes are not part of this specification.

---

# 9. Responsive behavior

STARWEFT is desktop-first, but it should degrade cleanly at narrower widths.

Define layout breakpoints using CSS only:

- wide cockpit;
- compact laptop;
- narrow/portrait fallback.

At narrow widths:

- map remains visible;
- one support panel is primary at a time;
- dock can become a bottom drawer;
- tables become row cards or horizontally contained local scrollers;
- close/back actions remain reachable;
- no page-level horizontal overflow;
- touch targets meet a reasonable minimum size;
- hover-only explanations are available by focus/tap.

Full mobile optimization is a non-goal unless separately committed, but broken layout is not acceptable.

---

# 10. Implementation plan

## Phase 1 — semantic and performance audit

- inventory every UI surface and primary question;
- add F3 counters;
- record baseline frame/tick/UI timings;
- audit icon-only controls, focus, labels and color dependence;
- add source-integrity checks;
- no visual redesign yet.

## Phase 2 — UI surface boundaries

- extract market/ship/system/route renderers one at a time;
- preserve existing event behavior;
- add render stamps;
- centralize safe markup helpers;
- extend browser-boot tests after each extraction.

## Phase 3 — map LOD and label policy

- explicit label priority/budget;
- traffic aggregation;
- state-critical marker preservation;
- draw counters;
- camera consistency;
- reduced-motion behavior.

## Phase 4 — accessibility pass

- semantic buttons and labels;
- focus management;
- keyboard shortcuts;
- high contrast;
- reduced motion;
- live-region restraint;
- settings persistence.

## Phase 5 — feedback hierarchy

- routine/milestone/crisis tiers;
- toast aggregation at high speed;
- consequence-first delivery feedback;
- audio mapping and repetition controls.

## Phase 6 — profile-driven optimization

- target proven hot spots;
- document before/after metrics;
- retain visual quality and determinism;
- avoid speculative architectural rewrites.

---

# 11. Dependency-free tests

Required tests and checks:

1. Full stack boots with no AudioContext.
2. Every icon-only action in core surfaces has accessible name.
3. Toggle controls expose selected/pressed state.
4. Escape closes the topmost surface and returns focus logically.
5. Typing in inputs does not trigger game shortcuts.
6. Each dock tab and modal renders after module extraction.
7. Hidden market/codex/tech surfaces do not refresh on every tick.
8. Render stamps invalidate after relevant state changes.
9. Reduced-motion setting changes camera/effect behavior without breaking state.
10. High-contrast mode keeps semantic classes and visible focus.
11. Labels prioritize selected/threatened systems under a fixed budget.
12. Every LOD band renders without exception.
13. Canvas resize at multiple DPR values produces finite dimensions.
14. Effect and trail collections remain capped during long stress runs.
15. UI never prints `NaN`, `undefined`, common mojibake or raw `[object Object]`.
16. Narrow stub dimensions do not create page-level horizontal overflow where measurable.
17. F3 instrumentation itself is bounded and optional.
18. Standard and stress frame/tick benchmarks print reproducible scenario metadata.
19. No added source references third-party URLs or package imports.
20. `index.html` remains directly playable from local files.

Manual release checks:

- keyboard-only pass;
- muted-audio pass;
- reduced-motion pass;
- high-contrast pass;
- 100%, 125%, 150% browser zoom;
- common laptop widths;
- 1x, 3x and 10x speed;
- dense fleet and route state;
- Scourge crisis state;
- system and galaxy camera transitions.

---

# 12. Acceptance criteria

This work is complete when:

- each surface has a clear primary decision;
- map readability improves rather than declining as overlays grow;
- selected, threatened and objective state survives every LOD;
- UI modules are split by major surface without a framework or new runtime;
- hidden surfaces avoid unnecessary updates;
- F3 shows meaningful frame, tick and draw diagnostics;
- optimizations are backed by measured scenarios;
- all core actions have semantic controls and visible keyboard focus;
- color is never the sole carrier of important meaning;
- reduced-motion and high-contrast options work offline and persist locally;
- high-speed simulation aggregates feedback instead of spamming it;
- important deliveries emphasize world consequence;
- the game remains atmospheric, restrained and recognizably STARWEFT;
- all existing smoke and browser-boot checks remain green;
- no dependency, build step or server is introduced.

## Final design principle

The interface should make a complicated galaxy feel graspable, not make a simple action feel complicated.