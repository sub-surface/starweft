# Starweft Agent Notes

Canonical onboarding lives in [CLAUDE.md](CLAUDE.md) — read that first.
It covers hard rules, file map, test commands and workflow.

Quick essentials:

- Zero-dependency browser game; classic scripts on the `SW` namespace; no build step.
- Sim files never touch the DOM; only render.js / ui.js / audio.js / main.js do.
- Mutations go through `SW.game.actions.*`; determinism via seeded RNG in util.js.
- Verify with BOTH: `"C:\Program Files
odejs
ode.exe" test\smoke.js` and `... testrowser_boot.js`.
- `SPEC.md` is the contract; `docs/reviews/` is backlog/reference.
