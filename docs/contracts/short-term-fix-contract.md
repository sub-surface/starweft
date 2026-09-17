# Short-Term Fix Contract: Architecture, Performance & Visual Integrity

> **Status:** Implemented & Verified (Gate Closed)  
> **Origin:** Linus Torvalds & John Carmack Critical Architecture Review (2026-09-17)  
> **Target Files:** `js/render.js`, `js/aperture.js`, `js/ui.js`, `test/smoke.js`

---

## 1. Problem Statement

A comprehensive audit of the STARWEFT codebase identified six structural flaws that compromise runtime performance, memory hygiene, and visual consistency:

1. **Inner Render Loop Heap Churn:** `drawGalaxy()` in `js/render.js` allocates multiple arrays and dozens of short-lived objects per frame (`project(sys)`, `order.push({ sys, p })`, `pickables = []`), producing severe V8 Garbage Collection pressure in 60Hz/120Hz loops.
2. **The Aperture Paradox:** `SW.aperture.sync()` runs a 10-array global index scan on every tick and executes `JSON.parse(JSON.stringify())` deep-clones and FNV-1a string hashing for cold systems—spending substantially more CPU cycles and heap allocations on bookkeeping than the raw economic formulas it attempts to defer.
3. **Tri-Timer Desynchronization:** Three unaligned timers run concurrently on the main thread: simulation tick (`setInterval` 50ms), canvas rendering (`requestAnimationFrame`), and DOM panel rendering (`setInterval` 300ms via `.innerHTML`). This causes frame hitching and layout invalidation thrashing.
4. **HTML String-Bashing & Regex Extraction:** `SW.ui.sectionizePanelHtml()` in `js/ui.js` parses generated HTML strings using regular expressions (`/<h4([^>]*)>([\s\S]*?)<\/h4>/gi`) to inject collapsible markup before writing to `.innerHTML`.
5. **Nomenclature Collision:** `state.charters` in `js/economy.js` (passenger transit fares) collides with the canonical in-Thread build system in `js/charters.js`.
6. **Orion Spur Detachment (Visual / Astronomy Bug):** In `js/render.js`, spiral arm stars in `makeGalaxy()` terminate at radius ~15,800 ly from Sagittarius A* due to an insufficient angular sweep cap (`th <= 6.8`), leaving a 10,000+ light-year empty void between the main spiral disk and the Orion Spur / Sol at (0, 0, 0).

---

## 2. Technical Specifications & Action Items

### Task 1: Reconnecting the Orion Spur & Galaxy Disk Geometry
* **File:** `js/render.js` (`makeGalaxy`, `armLabels`)
* **Cause:** The logarithmic arm loop uses `const th = 0.4 + rnd() * 6.4;` with `r = R0 * Math.exp(B * th)`. With `R0 = 3300` and `B = 0.23`, maximum radius is only `3300 * exp(0.23 * 6.8) ≈ 15,774 ly`. Sol is located at `(0, 0, 0)`—exactly `26,600 ly` from `GAL_CENTER` `(26600, 0, 0)`. Spiral arms stop 10,800 ly short of Sol!
* **Resolution:**
  1. Increase the angular sweep range of `th` to `0.4 + rnd() * 11.5` so that `r` smoothly spans out to the cutoff `r > 46000` ly.
  2. Ensure the stars in the Perseus Arm and Sagittarius Arm reach radius ~28,000–35,000 ly.
  3. Seamlessly connect the Orion Spur at `(0, 0, 0)` as a bridge filament branching off the Sagittarius Arm towards the Perseus Arm, eliminating the isolated black void gap.

### Task 2: Zero-Allocation Inner Render Loop
* **File:** `js/render.js` (`drawGalaxy`, `project`)
* **Resolution:**
  1. Pre-allocate static TypedArrays for system screen projections:
     * `const projX = new Float32Array(MAX_SYSTEMS)`
     * `const projY = new Float32Array(MAX_SYSTEMS)`
     * `const projDepth = new Float32Array(MAX_SYSTEMS)`
     * `const projScale = new Float32Array(MAX_SYSTEMS)`
     * `const projVisible = new Uint8Array(MAX_SYSTEMS)`
  2. Implement an in-place index sort buffer:
     * `const sortIndices = new Int32Array(MAX_SYSTEMS)`
     * Sort system IDs by `projDepth` without creating `{sys, p}` wrapper objects or garbage closures.
  3. Pre-allocate and reuse `pickables`, `bodyPickables`, `shipPickables`, and `beaconPickables` using fixed capacity or `.length = 0` truncation rather than assigning `[]` and `{}` every frame.

### Task 3: Streamlining Aperture Tick Overhead
* **File:** `js/aperture.js`
* **Resolution:**
  1. Eliminate `JSON.parse(JSON.stringify(value))` inside `clone()`. Replace with shallow copying of numeric/string fields for system records.
  2. Convert `A.index` into an incremental dirty-tracked index: systems are only indexed when a ship moves, a route changes, or an objective triggers, rather than performing an exhaustive O(N) multi-pass scan across all state entities every single tick.
  3. Bypass cryptographic string hashing (`digest()`) in the hot tick loop; use monotonic numeric change counters.

### Task 4: Timer & Render Loop Consolidation
* **Files:** `js/game.js`, `js/render.js`, `js/ui.js`
* **Resolution:**
  1. Eliminate the unaligned 300ms `setInterval(refreshTick)` in `ui.js`.
  2. Decouple high-frequency simulation from low-frequency DOM updates: DOM panel updates should only trigger when state meaningfully changes or on intentional player actions, not on a blind background interval.
  3. Synchronize simulation step processing with the rendering pipeline to prevent microstutter and layout thrashing.

### Task 5: Elimination of Regex Markup Parsing
* **File:** `js/ui.js` (`sectionizePanelHtml`)
* **Resolution:**
  1. Deprecate the regular expression `/<h4([^>]*)>([\s\S]*?)<\/h4>/gi` used to split and reconstruct panel HTML.
  2. Allow panels to declare structured sections (`title`, `contentHtml`, `defaultOpen`, `key`) directly in data/view definitions, building DOM elements cleanly via standard element creation or template fragments.

### Task 6: Nomenclature Disambiguation
* **Files:** `js/economy.js`, `js/ui_system.js`, `test/smoke.js`
* **Resolution:**
  1. Rename `state.charters` in `economy.js` to `state.transitFares` or `state.passengerOffers`.
  2. Reserve `SW.charters` and `state.thread.build` exclusively for the canonical in-Thread build drafting mechanic.

---

## 3. Acceptance Verification

1. **Test Invariant:** `test/smoke.js` and `test/browser_boot.js` must pass with zero failures.
2. **Visual Verification:** Visual screenshot check confirming the Orion Spur is connected to the spiral arms of the Milky Way disk with no empty black gulf.
3. **Memory Profile:** DevTools heap profiling must demonstrate flat memory allocation during map idle and smooth orbit camera panning, with no periodic garbage collector spikes.
