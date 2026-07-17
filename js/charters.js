/* STARWEFT charters.js - one canonical in-Thread build schema.
   Content arrives in Gate 3; this boundary prevents another modifier namespace.
   Headless. SPEC[SW-BLD-003], SPEC[SW-TECH-001]. */
var SW = globalThis.SW = globalThis.SW || {};

SW.charters = (function () {
  'use strict';
  const C = {};
  C.VERSION = 1;
  C.SLOTS = 4;
  C.POOL_SIZE = 18;
  C.catalog = Object.create(null);

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
