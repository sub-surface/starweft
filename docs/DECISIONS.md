# Decision Log

One entry per consequential or hard-to-reverse decision: date, the call,
why, and what it supersedes. Newest first. Check here before re-opening a
settled design.

## 2026-07-16 — R4 shipped: the Act Ladder (focused runs, Commissions, Boons)

`js/acts.js` (DOM-free) turns a run into 1..3 Guild Charter acts, each a WEAVE
quota + a tick clock. Meeting the quota opens the boundary: **BANK** (a clean
win) or **PUSH** — draft one of three **Boons** and take a harder, richer act.
Three deaths with epitaphs: **Cut** (clock out, quota unmet), **Burned** (the
Loomship — the flagship carrying the WEFT core, unscrappable — destroyed),
**Eaten** (the Heart corrupted). The summit (act III) offers RETIRE or
GRADUATE into the open Long Weave (acts off, keep everything).

Diversity engine (the replayability ask): **Commissions** are seeded per-act
themes (Long Drought, Tithe of the Front, Salt Roads, Relic Run, …) that tint
the pledge economy; **Boons** are per-run rule-benders drafted at each push
(Ghost Manifest, Fifth Seal, Shortage Sense, Guild Grace, Wayleave, …) — the
seed of the future Charter layer (R6). Commission × Boons × the base haul
cross-multiply in `SW.acts.scoreCompletion`, so builds emerge (REWEAVE §12.4).
All effects bend rules, never flat stats (REWEAVE §12.8).

Structural reframe, done cleanly per the "strip/de-slop with care" latitude:
the ladder is gated entirely behind `state.acts.on`, so PLEDGE + acts are the
**focused-run spine** while a bare run stays the classic Long-Weave sandbox
(untouched — same code, two shapes). `game.checkEnd` now delegates to
`SW.acts.checkEnd` for focused runs and keeps the classic Scourge/bankruptcy
paths for the sandbox. New-run menu gains a run-shape toggle (default Focused;
absent control ⇒ sandbox, so headless tests and the prologue stay classic).

UI: act HUD (quota bar + clock) and the boundary banner (bank / boon cards /
summit retire-or-graduate) on the Pledges tab; a topbar act chip; the epitaph
in the gameover modal. Additive state, no SAVE_VERSION bump. Both suites green
except the same two pre-existing failures (auto-explorer divergence flake in
smoke — a real minor auto-explore bug, red on clean main, flagged for a
dedicated fix; supply-mission dispatch in browser_boot).

## 2026-07-16 — Core verb ratified: PLEDGE. R3 (PLEDGE v1) shipped.

The REWEAVE §5 core-verb question is closed: **PLEDGE** wins over TENSION and
CAST. Rationale (REWEAVE §5.4): it is the only candidate where the core verb
and the scoring verb are the *same physical act* — a crate landing at a hungry
world is the fantasy, the economy, and the points at once. It hands the act
ladder its quota for free, gives Charters a clean pipeline to bend, keeps every
delivery a discrete hit, and composes *with* automation instead of fighting it.
TENSION is retained as lane *terrain* (a later Charter/laneFlow salvage); CAST
as a pledge *type* (deep-ring push-your-luck).

**Shipped this session (R3, PLEDGE v1):** new DOM-free sim module `js/pledges.js`
— Guild board of seeded offers, `WEAVE = TONNAGE × THREAD` scoring, concurrent-
pledge + streak multiplier, bond escrow, deadline busts, Guild trust. Fulfilment
is detected at the single delivery seam (`S.sell → SW.pledges.onDeliver`), so
manual/route/queue/mission deliveries all count. Board generation runs on a
dedicated serialized RNG sub-stream (`state.pledgeRng`) so it is replayable but
never perturbs the main `U.rand` stream — every prior seeded assertion is
unchanged. Actions `A.takePledge`/`A.abandonPledge` (journaled). UI: a Pledges
dock tab (`js/ui_pledge.js`) + topbar WEAVE readout + infobox topics. All
additive state, no `SAVE_VERSION` bump. Both suites green except the two
failures that predate this work (auto-explorer divergence seed-flake in smoke;
supply-mission dispatch in browser_boot) — confirmed red on clean `main`.

Naming note: `state.charters` is already the passenger-charter layer; the future
REWEAVE Charter synergy layer must use a different key (e.g. `state.exemptions`).

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
