# Devlog: 2026-09-17 — The Great Reorientation & Architectural Audit

> **Author:** Antigravity Engineering & Design Pair  
> **Topic:** Codebase Exploration, Critical Review (Linus & Carmack), Gabe Newell Narrative Philosophy, Orion Spur Diagnosis, and the Path to Gate 3

---

## 1. Context & Motivation

STARWEFT had been resting for some time. Before writing a single line of feature code, we undertook a zero-mutation, deep-dive exploration of the entire repository, followed by a rigorous critical audit embodying two of computing's sharpest architectural minds: **Linus Torvalds** (on API taste, data structures, and bloat) and **John Carmack** (on frametimes, memory allocation, and simulation vs rendering synchronization).

Following that review, the project owner requested:
1. Reorganizing and splitting the documentation into a dedicated, clean `/docs` tree while keeping the critical operational rules and gotchas front-and-center.
2. Formulating an immediate, concrete short-term fix contract addressing the architectural flaws identified.
3. Diagnosing a long-standing visual anomaly where the **Orion Spur appears completely detached from the Milky Way galaxy**.
4. Developing a creative overhaul proposal for the **Tech Tree** (abandoning boring flat stat buffs for tangible blueprints and components).
5. Reimagining the narrative architecture in the voice of **Gabe Newell** (Valve-style systemic and environmental storytelling, eliminating intrusive modal dialogs).
6. Consolidating the core gameplay loop and verbs (**Pledges vs Ops vs Directives**).

---

## 2. Key Findings & Discoveries

### Discovery A: The Orion Spur Visual Mystery
When pulling the camera back to Galactic zoom, Sol and the Orion Spur floated in deep space, completely separated from the Milky Way disk by a massive 10,000+ light-year gulf of pitch-black void.

We traced this directly to `makeGalaxy()` in `js/render.js`:
* `GAL_CENTER` is located at `(26600, 0, 0)`, placing Sol at `(0, 0, 0)` exactly 26.6 kly away.
* The spiral arm generator loop used `th = 0.4 + rnd() * 6.4` and `r = 3300 * exp(0.23 * th)`.
* This limited the maximum star generation radius to `3300 * exp(1.56) ≈ 15,774 ly`.
* **The spiral arm stars stopped generating halfway to Sol!**
* Meanwhile, the text labels for the Perseus and Outer arms were hardcoded with `th = 9.55` and `th = 10.1` (`r ≈ 33,000 ly`). The labels floated in empty space where stars were never spawned.
* **Fix:** Increasing `th` range to `0.4 + rnd() * 11.5` allows the logarithmic arms to sweep out to `45,000 ly`, cleanly embedding the Orion Spur as a bridge between the Sagittarius and Perseus arms.

### Discovery B: Inner Render Loop Memory Churn
In `js/render.js`, every single frame in `drawGalaxy` allocated a new array for projections, instantiated `{x, y, s, depth}` objects for every star, allocated a new sorting array, and reallocated pickable collections. On 60–120Hz displays, this creates thousands of short-lived heap allocations per second, provoking V8 nursery GC pauses.

### Discovery C: The Aperture Bookkeeping Paradox
`js/aperture.js` was introduced to save CPU by batching distant "Cold" economies. However, on every tick, `A.sync()` scanned 10 global arrays, allocated fresh index structures, deep-cloned objects with `JSON.parse(JSON.stringify())`, and calculated FNV-1a cryptographic hashes. The overhead of the optimization exceeded the cost of simply executing the economic math.

### Discovery D: The Modal Narrative Trap
Early in STARWEFT's life, events were presented via modal popups that froze the game and demanded reading paragraphs of text. While later mitigated by the herald/notification ticker, narrative delivery still lacked tactile integration with the player's core verb: moving cargo through space under pressure.

---

## 3. The New Modular Documentation Layout

To prepare STARWEFT for future agent and human collaboration without cognitive overload:
* **Root Authorities:**
  * `CLAUDE.md`: Preserved as the master engineering guide containing all critical gotchas (Node path, zero dependencies, no emojis, 44-file load order, test commands, Cloudflare deployment).
  * `SPEC.md`: Preserved as the master product contract, game mechanics specification, and Gate progress ledger.
  * `AGENTS.md`: Streamlined onboarding pointer for agents.
* **`/docs` Tree:**
  * `docs/README.md`: Central documentation index.
  * `docs/contracts/short-term-fix-contract.md`: Actionable plan to fix performance and visual bugs.
  * `docs/design/starmap-and-scale.md`: Deep dive into galaxy generation and scale transitions.
  * `docs/design/tech-tree-overhaul.md`: Component blueprints and network infrastructure proposal.
  * `docs/design/storytelling-and-narrative.md`: Gabe Newell-style systemic narrative philosophy.
  * `docs/design/core-loop-and-verbs.md`: Unified Logistics Exchange design.
  * `docs/devlogs/`: Historical and ongoing development logs.

---

## 4. Next Steps

With the audit and design proposals documented:
1. Align with the project owner on core design options using interactive consultation.
2. Execute the **Short-Term Fix Contract** to eliminate render loop allocations, repair the Orion Spur galaxy geometry, streamline aperture indexing, and update smoke test doc integrity checks.
3. Close the remaining Gate 1 & Gate 2 verification requirements.
4. Begin full execution of **Gate 3: One Run Spine: Objective, PLEDGE, and Charters**.
