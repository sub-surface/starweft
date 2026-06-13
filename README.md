# ✦ STARWEFT

### *The worlds drifted apart. You are the thread.*

**▸ Play now — free, in your browser: [star.subsurfaces.net](https://star.subsurfaces.net)**

A cozy space-logistics strategy game. You are **WEFT-7**, an autonomous
logistics intelligence reweaving a shattered galaxy — stitching isolated star
systems back into one living trade network, one delivery at a time, while the
**Scourge** eats the worlds from the rim inward.

No install. No accounts. No timers tugging at your sleeve. Just you, a quiet
galaxy, and the slow satisfaction of watching dead trade lanes flicker back to
life.

---

## What you do

🛰️ **Trade the gaps.** Every market prices by scarcity. Buy cheap where it's
common, sell dear where it's needed, and watch a profit become a supply line.

🧵 **Weave the network.** After a few runs, lock in **Routes** — looping trade
circuits that haul themselves. The map thickens with light as the weave grows.

🌍 **Build worlds up.** Relay beacons extend your reach; belt mines, gas
skimmers, hydrofarms and orbital habitats turn barren systems into engines of
their own. Well-fed populations pay you back in **Research**.

🛡️ **Hold the dark.** Pirates raid laden ships in rough country. Escort your
routes, hire patrols, or raid back — infamy opens black markets and slams
honest doors. Take the helm yourself in a quick tactical run, or auto-resolve.

☣️ **Outrun the Scourge.** When the rot wakes, it spreads coreward-out.
Quarantine, evacuate, research the **Panacea**, and make the most important
delivery in history.

It's a builder's game with a clock — but the clock is gentle, and you set its
speed.

---

## Why you might love it

- **Zero friction.** It opens in a browser and autosaves as you play. Close the
  tab; your weave is waiting under **Continue**.
- **Hand-made, not asset-flipped.** Every hull is lathed live from an equation;
  every face is parametric line-art that blinks at you. Monochrome ink, one
  accent, all yours.
- **Readable depth.** Markets, doctrines, origins, a tech atlas, a living
  chronicle to uncover — but the map is always primary, and the infobox
  explains anything you hover.
- **Replayable.** Pick an origin and a doctrine, set the galaxy's density and
  wealth, drop in a seed, and no two weaves run the same.

---

## Getting started

1. Open **[star.subsurfaces.net](https://star.subsurfaces.net)** and click
   **New weave** (first-timers get the **Sol prologue** — a gentle hands-on
   intro).
2. **Select a system** to see its market. Drag to orbit the bubble, scroll to
   zoom, double-click a system for its close-up orbital view.
3. **Send your first ship**: pick it in the Fleet tab, buy something cheap, fly
   it somewhere hungry. That's the whole game in one verb — everything else is
   scale.

**Keys:** `Space` pause · `1 / 2 / 3` speed · `Esc` back / pause menu ·
`F` center selection · the infobox (bottom-left) documents whatever you hover.

> Prefer to run it offline? Clone the repo and **double-click `index.html`** —
> it plays straight from `file://` with no build and no internet.

---

## For developers

STARWEFT is plain HTML/CSS/JS on Canvas 2D — **zero dependencies, zero build
step**. The simulation is DOM-free and runs headless under Node; rendering and
UI are isolated. Deterministic: seed + action journal replays any run.

```
# Node is not on PATH on the dev machine — use the full path:
"C:\Program Files\nodejs\node.exe" test\smoke.js          # headless sim invariants (~127k checks)
"C:\Program Files\nodejs\node.exe" test\browser_boot.js   # stub-DOM boot: panels, modals, save/load
```

Both must pass before shipping. See **[CLAUDE.md](CLAUDE.md)** for the full
agent/onboarding guide, the file map, and the feature playbook.

- **Contract & status:** [SPEC.md](SPEC.md) (§13 tracks what's done / next)
- **Design pillars & economy:** [DESIGN.md](DESIGN.md)
- **Settled decisions:** [docs/DECISIONS.md](docs/DECISIONS.md)
- **Deploying:** [docs/DEPLOY.md](docs/DEPLOY.md) — push-to-prod flow for
  `star.subsurfaces.net`

---

*Built with care. The worlds are listening.*
