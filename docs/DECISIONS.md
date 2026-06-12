# Decision Log

One entry per consequential or hard-to-reverse decision: date, the call,
why, and what it supersedes. Newest first. Check here before re-opening a
settled design.

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
