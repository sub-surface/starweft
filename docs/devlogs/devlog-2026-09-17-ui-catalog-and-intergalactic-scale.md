# Devlog: Isolated UI Catalog, Orbital Ring Polish, and Intergalactic Scale

**Date:** 2026-09-17  
**Author:** AI Pair Programmer  
**Focus:** Visual polish harness, subpixel glyph alignment, rapid test execution (`--quick`), Local Group & Intergalactic Loom scales (`SPEC[SW-VIS-002]`, `SPEC[SW-VIS-004]`, `SPEC[SW-IG-001]`).

---

## 1. Context & Motivation

Following the radial tech tree astrolabe overhaul, our focus turned toward:
1. Creating an isolated component catalog (`test/ui_catalog.html`) to visually inspect, screenshot, and refine every atomic UI element.
2. Perfecting orbital system ring alignment, optical glyph centering, button spacing, and label placement.
3. Accelerating test execution with a `--quick` toggle in `test/smoke.js` to ensure rapid, sub-25-second feedback loops during iterative changes.
4. Implementing the backend and frontend for the macro scales of the campaign: extending beyond the Orion Spur to the Milky Way spiral, and scaling out to the Local Group (Andromeda M31, Triangulum M33, LMC, SMC) with Precursor Weft filaments.

---

## 2. Key Implementations

### 2.1 Isolated UI Catalog & Subpixel Ring Polish (`test/ui_catalog.html`, `style.css`, `js/render.js`)
- **`test/ui_catalog.html`:** An isolated component showroom rendering:
  - 6-verb orbital system command ring.
  - 4-verb scout / minimal system command ring.
  - System badge callouts and ship command bar with module sockets.
  - Pledge exchange cards and status indicators.
  - 4-tier celestial astrolabe starbursts.
- **Optical Glyph Centering:** Resolved subtle baseline drops in unicode glyphs (`⚡`, `🔍`, `◈`, `⇄`) using `.ringGlyph` flex centering with micro-pixel transforms (`.glyph-enterSys`, `.glyph-ringSend`, etc.).
- **Ring Orbit Track:** Injected `.ringTrack` SVG circular orbit guide with subtle dashed borders and celestial glow.
- **Label Separation:** Dynamic orbital button radius expansion (`btns.length >= 5 ? 40 : 35`) and offset target system label placement (`p.y + radius + 56`), eliminating all visual clipping.

### 2.2 Rapid Verification Suite (`test/smoke.js`)
- Added `--quick` command-line flag to clamp headless bot soak ticks from 3,000 to 400.
- Preserves full deterministic test assertions, schema validation, and replay checks, dropping run time from ~31 seconds to ~22 seconds (102,701 checks, 0 failures).

### 2.3 Full Galaxy & Intergalactic Scale Backend (`js/galaxy.js`, `js/campaign.js`, `js/acts.js`)
- **Local Group Astronomy:** Authored astronomical coordinate anchors for:
  - **Milky Way:** Barred spiral disc $(0, 0, 0)$.
  - **Large Magellanic Cloud (LMC):** Satellite disc at $(12000, -25000, -14000)$.
  - **Small Magellanic Cloud (SMC):** Dwarf irregular at $(15000, -32000, -18000)$.
  - **Andromeda (M31):** Grand spiral inclined at $(80000, 105000, -38000)$.
  - **Triangulum (M33):** Flocculent pinwheel at $(95000, 140000, -28000)$.
- **Precursor Weft Filaments:** Defined cosmic corridors (*Magellanic Arc*, *Magellanic Bridge*, *The Great Starbridge*, *Triangulum Filament*).
- **Campaign Capabilities & Summit Unlock (`SW.campaign`):**
  - Completed threads record archetype capabilities: *Reach* (Cartographer/Courier), *Resilience* (Stationwright/Warden), and *Accord* (Envoy).
  - Unlocks macro-logistics Summit operations (*The Andromeda Bridge*, *The Triangulum Exodus*, *The Magellanic Bastion*) when capabilities are assembled (`SPEC[SW-IG-001]`).
- **Scale Traversal (`SW.acts`):**
  - Act 1: `system` scale.
  - Act 2: `bubble` scale.
  - Act 3+: `galaxy` scale.
  - Summit: `summit` scale (`SPEC[SW-VIS-002]`).

### 2.4 Cosmic Scale Visuals (`js/render.js`)
- Extended `DIST_MAX` to $160,000\text{ ly}$.
- Generated distinct point cloud distributions for M31, M33, LMC, and SMC.
- Added deep camera scale filtering: intergalactic names and corridors smoothly fade into view only beyond $28,000\text{ ly}$, keeping local spiral arms uncluttered.
- Animated traveling cosmic pulses (`drawCosmicPulses`) along precursor corridors.

---

## 3. Verification & Evidence

1. **Headless Smoke Suite:**
   - Command: `node test/smoke.js --quick`
   - Result: **102,701 checks, 0 failures.**
   - Command: `node test/smoke.js`
   - Result: **161,556 checks, 0 failures.**
2. **Browser Boot Suite:**
   - Command: `node test/browser_boot.js`
   - Result: **71/71 steps passed.**
3. **Playwright Visual Validations:**
   - `04_ui_catalog.png` — Isolated UI catalog overview.
   - `05_orbital_ring_closeup.png` — High-res orbital ring closeup with centered glyphs.
   - `06_galaxy_orion_spur.png` — Orion Spur local sector.
   - `07_galaxy_milky_way.png` — Full Milky Way galactic disc.
   - `08_intergalactic_loom.png` — Local Group intergalactic scale showing Andromeda M31 and cosmic filaments.
