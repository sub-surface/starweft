/* STARWEFT charters.js - one canonical in-Thread build schema.
   Gate 2 provides the real opening draft; Gate 3 expands the catalog here.
   Headless. SPEC[SW-BLD-003], SPEC[SW-TECH-001]. */
var SW = globalThis.SW = globalThis.SW || {};

SW.charters = (function () {
  'use strict';
  const C = {};
  C.VERSION = 1;
  C.SLOTS = 4;
  C.POOL_SIZE = 18;
  C.catalog = Object.create(null);

  // The three opening Charters are intentionally plain: Act 0 teaches that a
  // build is a small set of legible rules, not another technology tree. Gate 3
  // expands the catalog through this same registry.
  C.registerOpening = function () {
    if (C.catalog.quick_ledger) return;
    C.register({ id: 'quick_ledger', name: 'Quick Ledger', line: 'The first kept Pledge each Act scores +25% TONNAGE.', tag: 'delivery', fx: { firstKeptChipMult: 1.25 } });
    C.register({ id: 'held_reserve', name: 'Held Reserve', line: 'With 2+ units held at home, new Pledge bonds cost 25% less.', tag: 'reserve', reserveMin: 2, fx: { bondMult: 0.75 } });
    C.register({ id: 'living_lane', name: 'Living Lane', line: 'While a staffed route is running, kept Pledges gain +0.5 THREAD.', tag: 'route', staffedRoute: true, fx: { threadBonus: 0.5 } });
  };

  C.ensure = function (state) {
    const thread = state.thread;
    thread.build = thread.build || {
      version: C.VERSION,
      slots: C.SLOTS,
      active: [],
      pool: [],
      rerolls: 1
    };
    return thread.build;
  };

  C.register = function (definition) {
    if (!definition || !definition.id) throw new Error('Charter definition needs an id.');
    if (C.catalog[definition.id]) throw new Error('Duplicate Charter: ' + definition.id);
    C.catalog[definition.id] = Object.freeze(Object.assign({}, definition));
  };

  C.openingDraft = function (state) {
    C.registerOpening();
    const build = C.ensure(state);
    if (!build.active.length && !build.pool.length) build.pool = ['quick_ledger', 'held_reserve', 'living_lane'];
    return build.pool.slice();
  };

  C.draft = function (state, id) {
    const build = C.ensure(state);
    if (build.active.length >= build.slots) return { ok: false, msg: 'All Charter slots are filled.' };
    const at = build.pool.indexOf(id);
    if (at < 0 || !C.catalog[id]) return { ok: false, msg: 'That Charter is not in the current draft.' };
    build.pool = [];
    build.active.push(id);
    return { ok: true, charter: C.catalog[id] };
  };

  C.modSources = function (state) {
    C.registerOpening();
    const build = C.ensure(state), out = [];
    const reserve = state.systems && state.systems[state.homeId] && state.systems[state.homeId].depot;
    const reserveTotal = reserve ? Object.keys(reserve).reduce(function (n, c) { return n + (reserve[c] || 0); }, 0) : 0;
    const hasRoute = (state.routes || []).some(function (r) { return !r.paused && r.ships && r.ships.length > 0; });
    build.active.forEach(function (id) {
      const def = C.catalog[id];
      if (!def || !def.fx) return;
      if (def.reserveMin && reserveTotal < def.reserveMin) return;
      if (def.staffedRoute && !hasRoute) return;
      out.push(def.fx);
    });
    return out;
  };

  C.validate = function (state) {
    const errors = [];
    const build = state && state.thread && state.thread.build;
    if (!build) return ['Charter build missing'];
    if (build.version !== C.VERSION) errors.push('Charter build version invalid');
    if (build.slots !== C.SLOTS) errors.push('Charter build must expose four slots');
    if (!Array.isArray(build.active) || build.active.length > build.slots) errors.push('active Charters exceed slots');
    if (!Array.isArray(build.pool) || build.pool.length > C.POOL_SIZE) errors.push('Charter pool exceeds 18');
    if (!Number.isInteger(build.rerolls) || build.rerolls < 0) errors.push('Charter rerolls invalid');
    return errors;
  };

  return C;
})();
