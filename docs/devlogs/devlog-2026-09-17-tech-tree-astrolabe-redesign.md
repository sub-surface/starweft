# Devlog: Tech Tree Radial Astrolabe Redesign & Playwright Verification
**Date:** 2026-09-17
**Scope:** Interactive Research Tree Redesign, Playwright Screen Verification, Spec Contract Closure

---

## 1. Context & Motivation

Following the execution of Phases 1, 2, and 3, user review identified two central directives:
1. Test the running game with Playwright, capture screenshots, identify visual/interaction issues, patch, and iterate.
2. Complete redesign of the Tech Tree from a dull Cartesian grid into the hand-drawn celestial concept sketch (`uploaded_media_1789659837500.png`): a central celestial core ring ("WEAVE CORE / ARCHIVE") radiating branches outward like an astronomical astrolabe / starburst constellation chart with asterisk star-motes (`*`), celestial filaments, and elegant space styling consistent with the monochrome geometric design language.

---

## 2. Playwright Test Harness & Headless Rendering Stabilization

- **Harness Implementation:** Created [`test/take_screenshots.js`](../../test/take_screenshots.js) utilizing Chromium via local Playwright runtime.
- **Compositor Deadlock Elimination:** Discovered that forcing `--use-gl=angle` and `--use-angle=swiftshader` on Windows headless caused compositor deadlocks during repeated canvas screenshot captures. Because Starweft uses pure 2D Canvas rendering, removing swiftshader flags reduced capture latency from >30s (timeout) to ~370ms per screenshot.
- **Boot State Handoff:** Injected `sw_boot_seen: '1'` and `skipBoot: true` in localStorage so Playwright lands directly in the playable galaxy map without title delays.
- **Captured Baselines:**
  - `01_galaxy_map.png`: Validated Sol system, market panel, region boundaries, command bar module tags (`▲ Ion Burner`), and camera reticles.
  - `02_radial_tech_tree.png`: Validated new celestial astrolabe research graph.
  - `03_logistics_exchange.png`: Validated the unified Logistics Exchange and Pledges board.

---

## 3. Tech Tree Radial Astrolabe Overhaul

### 3.1 Architectural Layout (`computeLayout`)
- Replaced the Cartesian row/column grid with a polar coordinate layout:
  - Center: $(CX, CY)$ at $(850, 850)$ within a generous $1700 \times 1700$ virtual square.
  - Central Weave Core: radius $R_{\text{core}} = 64\text{px}$.
  - Doctrine Orbit: radius $R_{\text{doc}} = 108\text{px}$.
  - Tier Orbits: $R_1 = 180\text{px}, R_2 = 305\text{px}, R_3 = 430\text{px}, R_4 = 555\text{px}$ (generous 125px tier radial step).
  - Outer Bounding Orbit: $R_{\text{outer}} = 760\text{px}$ with a 90px boundary buffer.
- **Five Dedicated Celestial Domains & Color Palette:**
  - `CORE PROTOCOLS`: Cyan (`#9bd6ea`), sector span $[-112^\circ, -68^\circ]$ (Propulsion & bulk systems).
  - `LOGISTICS MATRIX`: Solar Amber (`#eac36e`), sector span $[-68^\circ, +48^\circ]$ (Commerce, freight & automation).
  - `DEEP FRONTIER`: Starlight Mint (`#6fe0b6`), sector span $[+48^\circ, +132^\circ]$ (Survey, cartography & warp gates).
  - `VANGUARD FORCES`: Cerulean Steel (`#8ca8f5`), sector span $[+132^\circ, +212^\circ]$ (Defense, strike & naval arms).
  - `SCOURGE ANALYSIS`: Abyssal Rose (`#f76a76`), sector span $[+212^\circ, +248^\circ]$ (Bio-anomaly & inoculation).
- **Tier-by-Tier Prerequisite Azimuth Sorting:**
  - Nodes in each tier are sorted by the average angular azimuth of their prerequisites, eliminating filament crossings across all paths.
  - Alternating radial staggering ($\Delta r \in [-24\text{px}, +32\text{px}]$) prevents label collisions in dense tiers.

### 3.2 Visual Rendering & Drawing (`drawTechTree`)
- **Domain Washes & Sector Hairlines:**
  - 2% opacity annular background washes delineating each realm.
  - Dashed radial boundary dividers with boundary ticks along `SECTOR_BOUNDARIES`.
  - Outer domain banners at $R = 792\text{px}$ displaying domain glyph, title, and discipline subtitle.
- **Concentric Coordinate Circles & Clean Cutouts:**
  - Orbital tier rings at $R_1 \dots R_4$ with Roman numeral labels (`TIER I · FOUNDATION` through `TIER IV · MASTERY`) rendered with true-black pill cutouts for zero filament interference.
- **Central WEAVE ARCHIVE Core Hub:** Concentric rings with radial compass ticks, soft ambient glow gradient, and live research point telemetry (`◇ RES`).
- **Filament Conduits:**
  - Spoke filaments connecting the Core Hub to Tier 1 root nodes styled with domain colors.
  - Constellation prerequisite filaments: solid vibrant domain colors for owned paths, dashed domain colors for available next steps, and faint hairlines for locked paths.
- **Tier Visual Hierarchy for Starburst Nodes:**
  - **Tier 1 (Foundation):** 4-pointed diamond starburst with central diamond core mote.
  - **Tier 2 (Expansion):** 6-pointed astrolabe starburst with concentric satellite orbit ring.
  - **Tier 3 (Ascendance):** 8-pointed celestial astrolabe starburst with corner reticle brackets.
  - **Tier 4 (Mastery / Capstone):** 12-pointed radiant nova starburst with outer stellar halo.
- **Meridian Typography Alignment:**
  - Left hemisphere nodes align text to the left (`textAlign = 'right'`).
  - Right hemisphere nodes align text to the right (`textAlign = 'left'`).
  - Top/bottom meridian nodes float vertically above/below the starburst.
  - Tuned non-selected node dimming alpha (0.58) and minimum typography font sizes (9.5px name, 8.0px status) for crisp readability on AMOLED void.
- **Doctrine Keystones:** Rendered as orbital diamond seals (`◆`) around the central core hub, styled with domain colors.

---

## 4. Verification & Contracts

- **Node Test Suite (`test/smoke.js`):** 161,556 checks passed (0 failures).
- **DOM & Render Test Suite (`test/browser_boot.js`):** 71 checks passed (0 failures), verifying pan, zoom, wheel zoom, double-click direct research, and detail pane synchronization.
- **Canonical Ledger (`SPEC.md`):** Registered `- [x] **UI-TECH-ASTROLABE**` in the formal progress ledger.
- **Zero-Dependency Constraint:** Fully preserved; zero external build steps, 100% `file://` compatible.
