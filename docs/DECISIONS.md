# Decision Log

One entry per consequential or hard-to-reverse decision: date, the call,
why, and what it supersedes. Newest first. Check here before re-opening a
settled design.

## 2026-07-16 — LOOM.md is the world bible; the cut-the-weave canon; craft laws

Final coherence pass before implementation. Two commitments logged so content
stays coherent: (1) `LOOM.md` is the narrative/world bible — wins on tone,
REWEAVE wins on mechanics. (2) **Canon:** the Sundering was chosen — the
Loomkeepers cut the weave themselves to starve the Fray, which spread *along
the lanes*. So "Scourge spreads along lanes" is now the *myth made playable*,
and the win condition is a "better knot" (connection the rot can't travel), not
a weapon. This retroactively makes the core mechanics thematic; keep it.
REWEAVE §12 adds the roguelike-craft guardrails (from the genre-design
breakdown), with **mechanic-over-stat** named as the spine — enforced by a
boot-test assertion that no Chronicle unlock mutates a `D.TUNE` base number
(to be written at R8). No code yet; docs only.

## 2026-07-16 — REWEAVE ratified: roguelike frame, REWEAVE.md is the contract

The owner ratified the v4 reframe in a clarifying-question session (answers
recorded in REWEAVE.md §0): **one persistent campaign galaxy with mortal
Threads** (permadeath kills the captain-instance, never the world), an **act
ladder** of ~25–35 min acts with an explicit bank-or-push boundary, a new
slot-limited **Charter** synergy layer plus an interaction rework of existing
systems, and **wider-never-stronger** meta (Chronicle unlocks widen the
possibility space, never raise numbers). Engine stays **Canvas 2D only**.
`REWEAVE.md` replaces `SPEC.md` as the design contract; SPEC.md is demoted to
historical reference/backlog (banner added). The current sandbox survives as
"Long Weave (classic)" during migration and becomes the earned endgame
(graduation) at R9. Still open: ratifying the core-verb candidate (REWEAVE §5
presents PLEDGE / TENSION / CAST and argues for PLEDGE) — log that call here
when made.

## 2026-06-13 — Tech tree: polish the atlas, don't redesign it

The 2026-06-12 "atlas wins" decision stands. A complaint that the tree
"needs reworking" was diagnosed as an *execution* problem, not an approach
problem: (1) a real bug — clicking a node left the pointer captured, stuck
in pan mode; (2) generic boxes/tiny fonts/hardcoded colors that didn't match
the menus. Fix, not rewrite: released pointer capture on every up/leave/cancel
(+ regression test); reskinned nodes to read the live CSS palette, added a
status pip, hover edge-lighting, and a light-up at-cursor tooltip showing each
node's effect + prereqs + unlocks. Explicitly NOT done (ruled bloat by the
owner): the planet/star visual metaphor. If the tree is reconsidered again,
it's the canvas-atlas execution to refine — the metaphor question is closed.

## 2026-06-13 — Living Galaxy update specced as SPEC §15, not built

Anchorage autobuild, diverse stellar systems (white-dwarf slingshot etc.),
supernova-class rare events, AI/alien encounters, more conditions, and a daily
amplifier were captured as a design addendum (SPEC §15) rather than implemented,
at the owner's request ("worth speccing as a larger update for the future").
Build order and per-item feasibility live there. Anchorage autobuild is the
recommended first build (reuses existing supply/build verbs).

## 2026-06-12 — One tech tree: the full-viewport atlas

`js/ui_tech.js` (canvas tree + docked detail pane, landed in `bdd16bd`) is
THE tech tree. Two parallel rewrites were retired the same day:

- **PR #15 "research constellation"** (radial stars/planets/orbits metaphor,
  separate `tech.css`) — closed, branch deleted. It was green on its own
  branch, so this was a consolidation call, not a quality one: it textually
  conflicted with the atlas and duplicated its purpose. Its strongest idea —
  clicking a node *selects* while only an explicit button *spends* — already
  exists in the atlas (`data-act="techSelect"` vs `data-act="research"`).
- **`tech-tree-rewrite` worktree variant** — an older iteration; its
  `ui_market.js`/`ui_routes.js` changes had already landed on main, so the
  worktree and branch were deleted outright.

Worth revisiting from #15 if the atlas evolves: a dedicated `tech.css` to
keep `style.css` lean, and shape-first state glyphs (star/planet/orbit)
instead of chips.

## 2026-06-12 — Branch hygiene: one main, short-lived branches

Everything lives on `main`, and both test suites must be green at every
commit. The motivating failure: `8309477` was committed with its smoke
assertions but without the implementing working tree, leaving the branch
red standalone for hours. Rules of thumb:

- A commit carries its own implementation AND its tests; never split them.
- Spec/review docs merge fast — `docs/reviews/` is backlog, not contract;
  `SPEC.md` wins on conflict.
- Worktrees live under `.claude/worktrees/` (gitignored) and are deleted
  as soon as their branch lands or loses.
