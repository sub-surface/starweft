# Core Loop & Verbs: Unifying Ops, Pledges, and Manifests

> **Status:** Design Specification  
> **Related Requirements:** SPEC[SW-VIS-005], SPEC[DESIGN-LOGISTICS], SPEC[DESIGN-AUTOMATION]

---

## 1. The Conflict: Competing Ontologies

Currently, a player opening STARWEFT is confronted with multiple fragmented surfaces for finding and managing work:
1. **The "Pledges" Tab:** Formal scored commitments (Quantity, Destination, Deadline, Bond, Trust).
2. **The "Ops" Tab:** Raw market analytics showing profitable commodity spreads across systems.
3. **The "Routes" Tab:** Manual route creation and automation chains.
4. **Passenger Charters:** Unpledged passenger transit requests floating in system panel drawers.

These systems frequently step on each other's toes:
* Why would a player take a risky Pledge when they can just let a route run an Op?
* Why are passenger moves treated differently from cargo commitments?
* Why do automated routes feel disconnected from the human drama of the world?

---

## 2. The Unified Logistics Exchange

We consolidate these disparate interfaces into a single, cohesive concept: **The Logistics Exchange (The Board)**.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          THE LOGISTICS EXCHANGE                           │
├────────────────────────────────┬──────────────────────────────────────────┤
│  1. PLEDGES (Commitments)      │ Formal contracts with stakes & deadlines │
│     • Food to Kepler Prime     │ Bond: 200¤ | Reward: 800¤ | 120 Ticks    │
│  2. DIRECTIVES (Automation)    │ Standing network rules for your fleet    │
│     • Keep Sol Stocked w/ Fuel │ Target: 50 units | Ships Assigned: 2     │
│  3. TRANSIT (Passage & Relief) │ Moving people, refugees, and specialists │
│     • 40k Evacuees to Haven    │ Urgent Fray evacuation | Accord impact   │
│  4. ARBITRAGE (Spot Ops)       │ Pure market data for manual trading      │
│     • Ore spread Sol -> Alpha  │ Profit: +18¤/unit | High supply at Sol   │
└────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 3. The Core Verb Loop: "Commit, Route, Resolve"

The primary loop of the game is streamlined into three tactile phases:

### Phase 1: Assess & Commit
* The player surveys the map and opens the Board.
* They choose a commitment: a high-stakes **Pledge**, a **Transit Evacuation**, or a steady **Supply Directive**.
* Every commitment clearly displays:
  * **The Need:** What must be moved and why.
  * **The Window:** How much time before the world state deteriorates.
  * **The Consequence:** Prosperity increase, faction trust, or physical infrastructure left behind.

### Phase 2: Allocate & Route
* With one click, the commitment can be assigned to:
  * An idle hauler for manual dispatch.
  * An existing automated route as a priority order.
  * A newly drafted courier fleet.

### Phase 3: Fulfill & Transform
* Delivery completion provides tactile, celebratory feedback:
  * A satisfying mechanical stamp audio cue.
  * Visual cargo transfer beams on the map canvas.
  * Permanent alteration of the destination body: population growth, lights brightening, or production unlocking.

---

## 4. Tactile Polish & Feedback Verbs

1. **Physical Manifest Cards:** Every contract is visually represented as a physical industrial dispatch slip with real stamps (`[ACCEPTED]`, `[IN TRANSIT]`, `[DELIVERED]`, `[BREACHED]`).
2. **Sound Design as Feedback:** Rich, chunky industrial sound effects (analog switches, magnetic latches, engine ignitions) replacing generic web interface clicks.
3. **Direct Map Interaction:** Dragging a route line between stars automatically previews the potential revenue and travel time directly along the lane.
