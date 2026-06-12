# STARWEFT Reliability, Saves and Developer-Tooling Review

Status: implementation specification

## Hard constraints

STARWEFT remains a zero-dependency, zero-build, `file://`-playable project. Reliability work must use browser storage/APIs, plain JavaScript and Node's standard library. No package manager, test framework, cloud service, database, error-reporting SDK or server requirement.

---

# 1. Executive assessment

The project already has several strong reliability foundations:

- deterministic seeded generation;
- a JSON-serializable state object;
- IDs instead of object references;
- a game action boundary;
- an action journal;
- invariant validation;
- a long-running smoke suite;
- a full-stack browser-boot harness using a stub DOM;
- tick-loop error containment that pauses rather than destroys the run;
- autosave and local storage support.

The main risk is that feature growth outpaces the explicit contracts around those foundations. Save versioning is currently represented by a version number, but every new persistent field increases migration risk. The journal is useful, but it needs a defined replay contract. Tests are extensive, but source integrity, prior-version save fixtures, fault injection, reproducible bug reports and balance batch tooling need stronger structure.

The target is not enterprise infrastructure. It is a small, legible reliability layer that makes aggressive iteration safe:

- every run can be identified by seed, settings, save version and journal;
- saves validate before activation;
- migrations are explicit and chained;
- autosave failure does not overwrite the last recoverable state;
- bugs can be reproduced from a compact report;
- long simulations and UI boot checks remain package-free;
- developers can inspect and export enough state to understand failures.

---

# 2. Reliability principles

## 2.1 Refuse silent corruption

When state is invalid:

- do not continue mutating it silently;
- pause simulation;
- preserve the last valid save;
- show a concise player-safe error;
- provide a copy/export report;
- keep developer details out of ordinary prose unless expanded.

## 2.2 Validate at boundaries

Validation should occur at meaningful boundaries rather than every inner-loop operation.

Boundaries:

- new-game generation;
- save creation;
- save load before activation;
- migration output;
- import;
- replay start/end;
- developer scenario setup;
- optional periodic development-mode validation.

## 2.3 Determinism is a product feature

Given:

- code version;
- seed;
- world settings;
- difficulty/origin/aptitude;
- action journal;

The simulation should produce the same authoritative state, excluding explicitly non-authoritative presentation state and wall-clock metadata.

Any nondeterministic browser API must stay out of the simulation core.

## 2.4 Derived data is disposable

Caches, UI layout state, render effects, performance samples and market reports should not become required save state unless persistence has clear player value.

Save authoritative facts, not conveniences that can be rebuilt.

---

# 3. Save schema review

## 3.1 Explicit schema ownership

Create a DOM-free save module or formal section in `game.js` that owns:

- current save version;
- schema validation;
- migration chain;
- serialization whitelist/cleanup;
- save metadata;
- slot operations;
- import/export;
- recovery behavior.

Do not let individual UI surfaces patch missing fields while rendering.

## 3.2 Save envelope

Separate metadata from state.

Proposed shape:

```js
{
  format: 'STARWEFT_SAVE',
  version: 3,
  createdAt: 0,
  updatedAt: 0,
  gameVersion: 'commit-or-release-id',
  checksum: 'optional-lightweight-hash',
  summary: {
    seed: '...',
    tick: 1200,
    difficulty: 'standard',
    origin: 'courier',
    credits: 4200,
    fleet: 8,
    result: null
  },
  state: { ... }
}
```

Wall-clock fields and game version are metadata only and must not affect simulation determinism.

A lightweight checksum may detect truncated or accidentally modified JSON. It is not a security feature.

## 3.3 Serialization cleanup

Before saving:

- omit transient render effects;
- omit DOM state;
- cap journal/history arrays;
- normalize absent optional objects;
- reject non-finite numbers;
- reject functions and circular structures;
- ensure IDs and references are valid;
- include world settings explicitly;
- include any persistent tutorial/stance/chronicle state.

Use JSON serialization as a final structural guard, not the only validator.

## 3.4 Slot policy

Recommended local slots:

- `auto-current`;
- `auto-previous`;
- one or more manual slots if current UI supports them;
- legacy/meta storage separate from run saves.

Atomic-ish autosave process within localStorage limitations:

1. serialize and validate new envelope;
2. write temporary key;
3. read and parse temporary key;
4. move current autosave to previous;
5. write new current;
6. remove temporary.

If any stage fails, preserve the old current save.

## 3.5 Storage failure

Handle:

- quota exceeded;
- private-mode restrictions;
- disabled storage;
- malformed existing JSON;
- partial write;
- user-cleared storage;
- imported oversized state.

The game remains playable in memory when storage is unavailable, with a visible warning and working JSON export.

---

# 4. Migration specification

## 4.1 Chained migrations

Use one migration per version step:

```js
MIGRATIONS[2] = function from2to3(envelope) { ... };
MIGRATIONS[3] = function from3to4(envelope) { ... };
```

Loading version 2 into version 5 runs 2→3→4→5.

Rules:

- each migration is deterministic;
- migrations do not access DOM, time or random APIs;
- input is cloned or treated as owned migration data;
- output validates against the next version;
- unsupported future versions are politely refused, never downgraded;
- migration warnings are returned to UI.

## 4.2 Field defaults

Defaults must reflect semantics, not merely prevent exceptions.

Examples:

- missing tutorial-complete field should derive from story flags/milestones where possible;
- missing world settings should map to the historical defaults used by that version;
- missing command queues should preserve route/directive assignments rather than silently unassigning ships;
- missing analytics history should initialize empty and not change economic state;
- missing cast records should derive known meetings from story flags where possible.

## 4.3 Fixture archive

Commit small hand-inspected save fixtures for each supported prior version under `test/fixtures/`.

Fixtures should cover:

- early game;
- route/directive state;
- active Scourge;
- late game/endgame cargo;
- corrupted system and lost rival;
- unusual origin/settings;
- a deliberately malformed file.

Keep fixtures compact. Do not commit enormous full-run archives.

---

# 5. Validation

## 5.1 Validation levels

### Envelope validation

- correct format tag;
- integer supported version;
- state object exists;
- summary fields finite/safe;
- checksum if present.

### Structural state validation

- required top-level fields;
- arrays/objects of expected type;
- IDs unique;
- system IDs index or resolve correctly;
- ship/route/directive references valid;
- world settings valid;
- story/scourge/rival state present.

### Numeric validation

- finite credits/research/population/stocks;
- stock and cargo nonnegative within tolerances;
- capacities positive;
- tick and timing fields finite and ordered;
- camera/UI state excluded or finite if persisted intentionally.

### Semantic validation

- idle ship has valid location;
- traveling ship has valid leg and destination;
- route assignments agree in both directions;
- command atom schemas valid;
- corrupted systems have compatible market/building state;
- no duplicate entity IDs;
- journal ticks monotonic;
- endgame flags do not contradict phase.

## 5.2 Repair versus refusal

Safe repairs:

- add missing optional arrays;
- clamp tiny floating-point negatives;
- remove dangling cosmetic bookmark;
- rebuild derived summaries;
- deduplicate harmless UI preference entries.

Refuse or quarantine:

- non-finite core economy values;
- missing systems array;
- impossible entity identity collisions;
- unknown future version;
- widespread invalid references;
- malformed journal commands required for replay.

Report every repair made.

---

# 6. Journal and replay

## 6.1 Replay contract

The journal should contain player-authored authoritative actions, not every simulation tick mutation.

Each entry needs:

- tick;
- action type;
- serializable arguments;
- action schema version;
- optional result code for diagnosis;
- optional state hash/checkpoint reference in development exports.

Do not store UI clicks when they do not correspond to game actions.

## 6.2 Action schema versioning

Actions evolve separately from save state. Add a small action schema version or migrate journal entries alongside save migrations.

Old actions must either:

- map deterministically to a current action;
- be replayed by a retained compatibility handler;
- cause an explicit unsupported-replay message.

## 6.3 Checkpoints

For long journals, optional periodic state checkpoints can accelerate replay debugging.

Rules:

- capped count;
- development/export feature first;
- each checkpoint records tick and hash;
- replay verifies checkpoint hashes;
- normal save does not need multiple full-state checkpoints unless proven useful.

## 6.4 State hashing

Implement a deterministic lightweight hash over canonical authoritative state for tests and bug reports.

Canonicalization must:

- sort object keys where order is not guaranteed;
- exclude transient fields;
- normalize insignificant floating precision if necessary;
- preserve array order where semantically meaningful.

The hash is for regression detection, not cryptographic security.

---

# 7. Reproducible bug reports

## 7.1 Copy report

When the simulation pauses on error, provide a copyable report containing:

- error name/message/stack where available;
- seed;
- tick;
- difficulty, origin and world settings;
- save version;
- game/commit version if defined;
- selected system/ship IDs if relevant;
- last N journal entries;
- validation errors;
- state hash;
- browser user agent optionally;
- performance snapshot;
- whether storage/audio were available.

Do not include unrelated personal data or full localStorage.

## 7.2 Export bundle

Without ZIP dependencies, export either:

- one JSON bug-report object containing metadata, save and recent journal; or
- separate downloadable JSON/text files through Blob URLs.

The report should be importable into a local developer reproduction path.

## 7.3 Developer reproduce mode

Add a menu/dev action to:

- paste/import a report;
- load its save/checkpoint;
- optionally replay recent journal;
- pause at target tick;
- open F3 diagnostics;
- show validation and hash comparison.

This remains local and offline.

---

# 8. Test architecture

## 8.1 Keep the standard-library harness

The existing tests demonstrate that a framework is unnecessary here. Improve structure with small helpers:

- `assert` and section utilities;
- fixture loader;
- deterministic scenario builder;
- snapshot/hash helper;
- temporary localStorage stub;
- test filtering via command-line argument;
- clear nonzero exit code.

Do not reinvent a large test framework.

## 8.2 Test layers

### Unit-like pure tests

- prices;
- analytics;
- command compilation;
- migration functions;
- validators;
- hash/canonicalization;
- generation helpers.

### Scenario tests

- controlled trade;
- route loop;
- directive coverage;
- rival convoy;
- Scourge threat;
- endgame delivery;
- tutorial recovery.

### Long invariant runs

- multiple seeds;
- multiple difficulties/settings;
- bot actions;
- thousands of ticks;
- periodic validation;
- state hash repeat check.

### Browser wiring tests

- full script load order;
- panel/modal rendering;
- dispatch actions;
- storage/audio failure;
- import/export UI;
- settings and focus behavior.

### Source integrity tests

- no dependency manifests accidentally added;
- no external runtime script/style URLs;
- all `index.html` local script paths exist;
- expected classic-script load order;
- common mojibake sequences;
- conflict markers;
- accidental debug statements if policy forbids them;
- file encoding readable as UTF-8.

## 8.3 Fault injection

Add controlled tests for:

- localStorage `setItem` throws;
- save JSON truncation;
- unsupported future version;
- migration throws;
- invalid route reference;
- NaN injected into stock;
- missing audio API;
- UI handler throws while simulation continues;
- tick subsystem throws and pauses;
- import with huge/corrupt arrays rejected safely.

---

# 9. Developer tools

## 9.1 F3 diagnostics

Extend the existing performance overlay into a compact developer panel with tabs or modes:

- performance;
- selected entity;
- economy;
- routes/commands;
- world generation;
- Scourge front;
- journal/replay;
- validation.

Keep the default overlay small. Deep detail appears only when opened.

## 9.2 Selected-system inspector

Show raw and derived values:

- ID/name/type/region;
- coordinates/links;
- stock/capacity/prod/cons;
- satisfaction/prosperity/pop;
- factories and blocked reasons;
- presence;
- inbound cargo;
- threat/immune state;
- recent causal counters.

Developer-only edits may be allowed behind explicit cheat mode and must route through named debug actions.

## 9.3 Selected-ship inspector

Show:

- location/mode/path/leg;
- cargo/basis/data;
- queue atoms;
- controller/assignment;
- retry/blocked reason;
- service record;
- last journal/action entries involving ship.

## 9.4 Batch runner

A Node script using only standard modules should support:

```text
node test/batch.js --seeds 50 --ticks 5000 --bot governor --world drought
```

Features:

- deterministic seed list;
- interruptible with Ctrl+C;
- periodic progress/checkpoint output;
- CSV/JSON summaries;
- optional failed-run saves;
- bounded memory;
- clear exit status;
- no interactive package.

## 9.5 Source and data validators

Validate:

- commodity/recipe references;
- tech prerequisites and cycles;
- hull/building IDs;
- event IDs and choices;
- story objective references;
- region/faction definitions;
- command atom names;
- icon/infobox coverage;
- duplicate IDs;
- tuning values finite and sensible.

Run validators inside smoke tests.

---

# 10. Performance regression tooling

Use coarse, metadata-rich benchmarks rather than fragile strict timings.

Scenarios:

- new game generation;
- 1000 simulation ticks with no UI;
- large fleet/route tick;
- market report construction;
- pathfinding batch;
- browser-boot refresh loops;
- stress LOD frame calls under stub canvas where meaningful.

Output:

- scenario;
- seed/settings;
- entity counts;
- runtime/version;
- mean/median/maximum;
- validation result.

Normal CI/manual smoke should fail only on catastrophic generous thresholds or algorithmic counters. Fine-grained performance comparison remains informational.

---

# 11. Security and import hygiene

Although STARWEFT is offline, imported JSON is untrusted input.

Rules:

- parse data only; never evaluate code;
- reject prototype-pollution keys where objects are merged;
- cap string lengths, array lengths and entity counts;
- validate all numeric values;
- escape imported names before HTML rendering;
- never trust imported `innerHTML` or URLs;
- do not include credentials or remote network calls;
- export uses local Blob URLs and revokes them after use.

No security package is required.

---

# 12. Implementation plan

## Phase 1 — save envelope and validators

- formal envelope;
- current-version validator;
- transient-field cleanup;
- summary metadata;
- atomic-ish autosave with previous slot;
- storage failure handling;
- tests.

## Phase 2 — migration chain and fixtures

- one migration per version;
- prior-version fixtures;
- semantic defaults;
- future-version refusal;
- migration report UI;
- round-trip tests.

## Phase 3 — journal replay contract

- action schema version;
- canonical authoritative-state hash;
- replay runner;
- checkpoint verification in development mode;
- compact replay tests.

## Phase 4 — bug-report export/reproduce

- copy report;
- JSON bundle;
- import into paused dev reproduction;
- validation/hash comparison;
- privacy-aware metadata.

## Phase 5 — developer inspectors and batch runner

- F3 modes;
- selected system/ship inspectors;
- batch CLI;
- CSV/JSON output;
- failed-run capture;
- Ctrl+C-safe progress.

## Phase 6 — source/data integrity gate

- no-dependency scan;
- script path/load-order validation;
- mojibake/conflict markers;
- data reference validation;
- release checklist.

---

# 13. Dependency-free tests

Required tests:

1. Current save round-trips to equivalent authoritative state.
2. Transient render/UI fields are excluded.
3. Non-finite values cause validation failure before write.
4. Autosave failure preserves previous current save.
5. Previous autosave loads when current is malformed.
6. Storage-unavailable mode remains playable and exportable.
7. Each committed prior-version fixture migrates and validates.
8. Future save version is refused without mutation.
9. Migration chain is deterministic.
10. Imported malicious/oversized structures are rejected safely.
11. Route/ship/directive references validate bidirectionally.
12. State hash is stable across serialization round-trip.
13. Same seed/settings/journal reproduces the same checkpoint hashes.
14. Journal ticks and action schemas validate.
15. Tick exception pauses and produces a report.
16. UI-handler exception does not kill simulation.
17. Bug report excludes full unrelated storage.
18. Browser boot exercises save, load, export and import wiring.
19. Source-integrity scan finds a synthetic external script/dependency manifest.
20. Data validator finds duplicate IDs and broken references in controlled fixtures.
21. Batch runner handles Ctrl+C and writes valid partial results.
22. Long-run validation captures failed seed and save.
23. No test requires network, package installation or browser server.
24. Opening `index.html` remains sufficient to play.

---

# 14. Acceptance criteria

This work is complete when:

- save format and authoritative state are explicitly defined;
- autosave preserves a recoverable previous slot;
- invalid saves never become active silently;
- migrations are deterministic, chained and covered by fixtures;
- future versions are refused safely;
- storage failure degrades to in-memory play plus export;
- action journal has a documented replay contract;
- deterministic hashes can verify replay checkpoints;
- simulation errors generate compact reproducible reports;
- developers can load a report and reproduce near the failure;
- F3 inspectors explain selected systems, ships and world pressure;
- batch balance runs are dependency-free, interruptible and reproducible;
- source/data validators protect offline boot and zero dependencies;
- test structure remains simple enough to understand without a framework;
- all changes preserve `file://` play and the current architecture's inspectability.

## Final design principle

Reliability is what allows the game to become stranger. A deterministic seed, a recoverable save and a reproducible failure give the project permission to take large creative risks.