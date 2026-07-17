# STARWEFT

*The worlds drifted apart. You are the thread.*

[Play the current build in your browser](https://star.subsurfaces.net)

STARWEFT is a zero-dependency space-logistics game about reconnecting a fractured
galaxy. You move scarce cargo, build routes and infrastructure, respond to a
spreading threat, and watch isolated systems become a living network. It runs as
plain HTML, CSS, and JavaScript with no install, account, package manager, or build
step.

The repository is beginning a ground-up overhaul into a more focused logistics
roguelike. The target game has a fast archetype-and-difficulty launch, a strongly
guided canonical opening, 65-90 minute Threads that escalate from System to Bubble
to Galaxy, and several mortal protagonists whose consequences accumulate toward an
intergalactic campaign finale. The complete contract and live progress checklist
are in [SPEC.md](SPEC.md); features described there should not be assumed shipped
unless their requirement is checked with evidence.

## Current playable foundation

The existing browser build already supports a broad simulation foundation:

- scarcity-priced trade and physical ship movement;
- repeatable routes, directives, projects, and automation;
- system bodies, sites, construction, technologies, factions, and rivals;
- Pledges, an Act shell, Founder packages, deterministic combat, and the Scourge;
- seeded generation, JSON saves, an action boundary, and headless simulation tests;
- a map-first canvas interface with contextual commands and detail drawers.

The overhaul is deliberately willing to reorganize or retire these systems where
they preserve a sandbox option wall instead of the intended roguelike run.

## Play locally

Clone the repository and open `index.html` directly. The game supports `file://`;
no local server or build is required.

In the current build, choose **New weave**. New players receive the Sol prologue.
Select a system, inspect its market, select a ship, buy a needed commodity, and send
it to a hungry destination. `Space` pauses, `1`/`2`/`3` change speed, `Esc` goes
back or opens pause, and `F` centers the selection.

## Develop

The simulation uses classic scripts on the global `SW` namespace. Gameplay logic
runs headlessly; browser presentation is isolated. Seeded RNG and player actions
make runs reproducible.

On the primary Windows development environment, run both suites with:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'test\smoke.js'
& 'C:\Program Files\nodejs\node.exe' 'test\browser_boot.js'
```

Both must pass before a change is considered verified.

- [CLAUDE.md](CLAUDE.md) is the engineering, architecture, workflow, test, and
  deployment guide.
- [SPEC.md](SPEC.md) is the product, narrative, UX, research, roadmap, and progress
  contract.

Research evidence is preserved under `research/` but is not an additional design
authority.
