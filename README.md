# ✦ STARWEFT

*The worlds drifted apart. You are the thread.*

A cozy space-logistics strategy game. You are **WEFT-7**, an autonomous
logistics intelligence weaving isolated star systems back into a living trade
network — while the **Scourge** eats the galaxy from the rim.

## Play

**Double-click `index.html`.** That's it — no install, no build, no internet.
Works in any modern browser (Chrome/Edge/Firefox).

## How to play

1. **Select a system** (click it) to see its market. **Drag** to pan,
   **scroll** to zoom.
2. **Send your probe**: pick a ship in the Fleet tab (or click it on the map),
   buy something cheap, fly it somewhere it's expensive. Profit.
3. **Automate**: after a few deliveries you unlock **Routes** — looping trade
   circuits with smart buy/sell. Watch the weave thicken.
4. **Expand**: build **Relay Beacons** to extend your reach. Buildings need
   materials *delivered to that system* — the "supply mission" button plans it
   for you.
5. **Thrive**: well-fed population centers generate **Research** → better
   hulls, smarter automation, warp gates.
6. **Survive**: when the Scourge wakes, quarantine, evacuate, research the
   **Panacea**, and make the most important delivery in history.

**Keys**: `Space` pause · `1/2/3` speed · `Esc` close panels.

Autosaves continuously; difficulties from Relaxed (no Scourge sandbox) to
Brutal.

## Dev

- Plain HTML/CSS/JS, Canvas 2D, zero dependencies. The simulation is DOM-free
  and runs headless.
- Smoke test (uses any Node):
  `& "$env:ProgramFiles\nodejs\node.exe" test\smoke.js`
- Design doc: [DESIGN.md](DESIGN.md)

## Roadmap Notes

- In-system depth (v1 landed: per-body facilities — belt mines, gas skimmers,
  hydrofarms, crystal crucibles, cryo-archives, orbital habitats — built from
  the orbital view, feeding the system market). Still open: intra-system
  shuttles as a managed constraint, moon shipyards with build queues,
  neutron-star/magnetar/white-dwarf exotic installations, and deeper governor
  tooling. See [SPEC.md](SPEC.md) §5 for the full design.

- Unique hull actions beyond cargo, tied to system type and quests: scouts survey
  anomalies, escorts stabilize dangerous lanes, freighters seed depots, and late
  hulls alter production or evacuation pressure.
- Market terminal overhaul (Elite × Mass Effect): make THE MARKET feel like a
  real in-world trading terminal — diegetic advertisements and faction
  bulletins between the numbers, cute worldbuilding copy (shipping notices,
  classifieds, lost-and-found), deeper trend analytics (emerging shortages,
  price momentum, "movers" feed off the existing price-history buffers), and
  easter-egg side content discovered through the terminal itself: odd
  classifieds that become small quests, recurring NPC traders with running
  jokes, a numbers-station channel for Loomkeeper fragments.
- RTS-inspired command layer: selected-unit command home, clearer send/queue
  feedback, tactical stance buttons, strategic orders, and fewer layout jumps.
- Badlands (v1 landed: ~90 systems in a dark shell beyond the bubble — rich
  untouched veins, salvage-hoarding dead stations, sparse long lanes, a few
  bridge weftlines, all gated behind Deep Drives; survey rewards scale up to
  3× out there). Still open: badlands-specific secrets/encounters, sim-LOD
  cohorts if the shell grows, neutron-star wonders.
- Tech tree rebuild from first principles: stable pan/zoom canvas, legible
  branch identity, clearer dependency paths, build synergies, and fewer cramped
  text/list hybrids.
- 100x-dev wish list: scalable map LOD for thousands of visible stars, robust
  command queue UX, inspectable economy/supply-chain solver, automated balance
  telemetry, and richer quest hooks for ship/system-specific actions.
