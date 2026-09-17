# Star Map & Scale Architecture: Orion Spur to Intergalactic Web

> **Status:** Design Proposal & Technical Specification  
> **Related Requirements:** SPEC[SW-VIS-002], SPEC[SW-VIS-011], SPEC[SW-BUB-001], SPEC[SW-RUN-002], SPEC[SW-RUN-003]

---

## 1. The Orion Spur Bug Diagnosis

### The Visual Flaw
In the tactical starmap view when pulling the camera back to Galactic zoom, the galaxy appears split into two disconnected pieces:
* On the left: The galactic core (Sagittarius A*) and tightly wound spiral arms forming an oval disc.
* On the right: An isolated, detached filament of stars labeled **Orion Spur / The Errant Knot**, separated by thousands of light-years of pitch-black empty space.

```
       [ Galactic Core: Sgr A* ]
            /  @  @  \
           (  @@@@@@  )
            \  @  @  /
             '------'            <--- 10,000+ LY EMPTY VOID --->       [ Isolated Orion Spur ]
                                                                           · · · Sol · · ·
```

### The Mathematical Cause in `js/render.js`
In `makeGalaxy()`:
```javascript
const GAL_CENTER = { x: 26600, y: 0, z: 0 }; // Sagittarius A* is 26.6 kly away from Sol at (0,0,0)
const B = 0.23, R0 = 3300;
for (let arm = 0; arm < 4; arm++) {
  for (let i = 0; i < 800; i++) {
    const th = 0.4 + rnd() * 6.4;                 // <--- PROBLEM: th tops out at 6.8 radians!
    const r = R0 * Math.exp(B * th);
    if (r > 46000) continue;
    // ...
```
1. At `th = 6.8`, `r = 3300 * exp(0.23 * 6.8) ≈ 15,774 ly`.
2. The spiral arm stars **stop generating at radius 15,774 ly**.
3. But Sol is located at `(0, 0, 0)`, which is **26,600 ly away from `GAL_CENTER`**.
4. The Perseus and Sagittarius arm labels in `armLabels` were configured with `th = 9.55` and `th = 10.1` (`r ≈ 33,000 ly`), but the stars themselves stopped at `15,800 ly`!
5. As a result, the galactic disk stopped halfway to Sol, creating a massive visual chasm between the Milky Way core and the spur where humanity lives.

### The Reconnection Solution
1. Increase `th` generation range: `const th = 0.4 + rnd() * 11.5;`.
2. This allows `r = 3300 * exp(0.23 * th)` to reach up to `45,000 ly`, cleanly populating the entire disk out to the `r > 46000` boundary.
3. Anchor the Orion Spur as a natural cross-arm bridge linking the Sagittarius Arm (~21,000–24,000 ly from core) to the Perseus Arm (~28,000–32,000 ly from core).

---

## 2. Multi-Scale Hierarchy: From Orrery to Intergalactic Web

To support the full 60–90 minute roguelike progression and the campaign-level Intergalactic Summit, the starmap must support four distinct cognitive scales:

```
[ Level 0: System Orrery ]        3–5 orbital bodies, facility berths, local shuttle hops
         ↓ (Zoom out)
[ Level 1: Local Bubble ]         30–60 stars, trade lanes, local Fray incursions, rival fleets
         ↓ (Zoom out)
[ Level 2: Galactic Sector ]      Spiral arm segments (Orion Spur, Sagittarius Arc), regional fronts
         ↓ (Zoom out)
[ Level 3: The Milky Way Disk ]   Full galaxy, coreward arteries, deep rim badlands
         ↓ (Summit Phase)
[ Level 4: Intergalactic Loom ]   Milky Way, Andromeda, Triangulum, Magellanic Clouds network
```

### Scale Transitions & Information Filtering

| Scale | Visual Representation | Player Verbs & Decision Space | Simulation Fidelity |
| :--- | :--- | :--- | :--- |
| **System** | Planetary orbits, Keplerian paths, body berths, orbital facilities. | Manual ship dispatch, local supply loops, berth trade. | **Hot:** Full discrete physics & cargo tracking. |
| **Bubble** | Network graph of stars connected by trade lanes; active ship icons. | Route creation, depot management, Pledge fulfillment. | **Warm/Hot:** Active lanes, rival convoy simulation. |
| **Sector / Galaxy** | Spiral arm density waves, regional front heatmaps, arterial flow lines. | Fleet allocation, regional compacts, front containment. | **Cold/Warm:** Batched regional trade & aggregate decay. |
| **Intergalactic** | Galactic nodes linked by deep precursor Weft corridors. | Macro-logistics, cosmic bridge construction, Summit vows. | **Summit Engine:** Abstract capability and flow resolution. |

### Sector-to-Galaxy Navigation Architecture
* **Seamless Camera Pull:** No mode-switching loading screens. Zooming with the mouse wheel or gesture glides continuously from planet surface to galactic disk.
* **Semantic Zoom LOD:**
  * When zoomed in: system names, orbital rings, and ship status tags are visible.
  * When pulling out: individual stars merge into cluster knots; trade lanes merge into illuminated arterial flow conduits showing trade volume via animated pulses.
* **Intergalactic Network Surface:** Unlocked in the endgame Summit phase, revealing the cosmic lattice linking neighboring galaxies via high-energy Weft filaments.

---

## 3. Narrative Twist: "The Sundered Spur" & The Great Void

Rather than simply erasing the visual separation as a silent bugfix, we **lean into it as an authored narrative phenomenon**:

### The In-World Lore
Centuries ago during the Weave Cataclysm, the high-energy conduit lanes connecting the Orion Spur to the Perseus and Sagittarius arms did not merely decay—they violently snapped. The gravitational wake and dimensional shearing created **The Great Void (The Severed Gulf)**: a vast zone of disrupted spacetime where normal warp drives fail.

The worlds of the Orion Spur (including Sol) believed they were all that remained of human civilization. The rest of the Milky Way was considered lost forever behind the black veil.

### The Mid-Game Strategic Breakthrough
1. **Act I & II (The Spur):** The player operates within the isolated Orion Spur, believing the local bubble is the entire world, until completing the Panacea delivery or curing the local Scourge.
2. **The Discovery:** A deep-space scout or Precursor listening post intercepts high-frequency radio echoes emanating from across the Great Void—originating from the Sagittarius Arm.
3. **The Galactic Bridge:** Building the **Deep Drive** or constructing a massive **Weft Pylon** at the Spur's edge allows humanity's first expedition ship to cross the Severed Gulf.
4. **The Expansion:** The player reaches the broader Milky Way galaxy, only to discover completely different civilizations, unfamiliar commodities, and an even greater cosmic threat waiting in the core.

---

## 4. The "Logistics Lens": Visual Cargo Traffic & Flow Overlay

Moving beyond static tables and spreadsheets, the map features an interactive **Logistics Lens** (toggleable via hotkey or UI button):

* **Color-Coded Pulse Conduits:** Every active trade lane displays real-time luminous particle streams representing the exact cargo in transit:
  * Green particles: Food / Agri shipments.
  * Cyan particles: Fuel / Water.
  * Amber particles: Ore / Heavy Metals.
  * Violet particles: Tech / Precision Electronics.
* **Flow Direction & Speed:** Particle movement speed reflects actual ship transit speeds along the corridor.
* **Planetary Aura Pressure:** Systems with acute shortages radiate a subtle rhythmic pulse in the shortage color; systems with supply gluts glow steadily.
* **Intuitive Trade Reading:** With the Logistics Lens active, a player can identify supply-demand imbalances across 50 systems in two seconds without opening a single market menu.

