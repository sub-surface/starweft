# Tech Tree Overhaul Proposal: Blueprints, Components & Network Infrastructure

> **Status:** Design Proposal  
> **Related Requirements:** SPEC[SW-VIS-010], SPEC[SW-TECH-001], SPEC[DESIGN-RULEBENDS]

---

## 1. Critique of the Current System

The current research implementation in `js/tech.js` and `js/data.js`:
* Relies on uninspired stat inflation: `+25% cargo capacity`, `+25% speed`, `ships cost 25% less`.
* Violates the foundational SPEC rule: *"A naked +10% may support a rule-bend but cannot be the identity of an archetype, Charter, or account unlock."*
* Presents a static, spreadsheet-like node graph on a flat canvas that feels detached from the tactile thrill of building a space logistics empire.
* Lacks meaningful trade-offs or tangible manifestations in the physical world.

---

## 2. The Overhaul Vision: "Tangible Engineering"

In STARWEFT, technological progress should not be an abstract numerical power creep. Technology is **the ability to solve logistics problems that were previously physically impossible**.

Every tech must unlock one of three tangible things:
1. **Ship Subsystems (Modular Blueprints):** Physical hardware components installed into ship hull sockets.
2. **Network Infrastructure (Orbital Construction):** Permanent installations anchored to bodies or lane waypoints that reshape how goods flow through space.
3. **Operational Doctrines (Systemic Verbs):** New commands and logistical capabilities for your fleet and automation network.

```
       ┌─────────────────────────────────────────────────────────────┐
       │                   THE BLUEPRINT ARCHIVE                     │
       └─────────────────────────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
  [ SHIP BLUEPRINTS ]       [ INFRASTRUCTURE ]            [ DOCTRINES ]
  • Sub-light Ramscoop      • Automated Relay Hub         • Direct Berth Siphoning
  • Magnetic Cargo Clamps   • Cryo-Depot Facility         • Slipstream Convoys
  • Inoculated Shield Core  • Sub-space Jump Pylon        • Autonomous Manifesting
```

---

## 3. The Three Research Spheres

### Sphere I: Hull & Vessel Engineering (Tactile Ships)
* **Magnetic Cargo Clamps:** Eliminates station docking delays for unpressurized bulk commodities (Ore, Water). Ships load/unload while coasting through orbit.
* **Overclocked Thruster Assemblies:** Grants burst-speed across contested or hazardous lanes, but consumes minor hull integrity or fuel reserve.
* **Sub-space Ramscoops:** Ships harvest trace hydrogen along lanes, extending operational range without requiring a local fuel depot.
* **Hazard-Inoculated Plating:** Protects hull and cargo from Scourge corruption and cosmic radiation in Badlands sectors.

### Sphere II: Network Infrastructure (World Modification)
* **Orbital Logistics Relays:** Extends command and communication range across dead zones between clusters.
* **Automated Cold Depots:** Surface installations that store overflow goods and automatically feed local planetary consumption when prices peak.
* **Deep Space Warp Pylons:** Pair two surveyed systems with an artificial high-speed conduit, cutting transit time by 75%.
* **Solar Siphons:** Orbiters constructed around class O/B stars that generate raw Energy credits to power automated fleet maintenance.

### Sphere III: Operational & Algorithmic Doctrines (New Verbs)
* **Dynamic Slipstreaming:** Multiple haulers assigned to the same route fly in convoy formation, granting mutual speed and defense bonuses.
* **Opportunistic Backhauling:** Empty return trips automatically purchase and transport high-demand local goods if profit margins exceed 30%.
* **Emergency Relief Protocol:** Ships carrying food or medical supplies can break assigned routes to answer critical starvation alerts in adjacent systems.

---

## 4. Visual & Interface Design

* **Schematic Blueprint Aesthetic:** Instead of a generic flowchart, the research interface resembles an illuminated architectural schematic or ship cutaway diagram (drawing inspiration from Homeworld and classic technical manuals).
* **Direct Inspection:** Clicking a technology highlights the ships or stations in the actual galaxy map that will physically change when unlocked.
* **Immediate Application:** Unlocking a blueprint doesn't just grant a passive bonus; it immediately equips onto newly constructed ships or offers a refit order for idle fleet units.
