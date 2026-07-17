/* STARWEFT aperture.js - deterministic Hot/Warm/Cold fidelity ownership.
   The Gate 1 compatibility engine still simulates every system every tick.
   Aperture records therefore describe and audit fidelity without changing
   outcomes; reduced-cadence execution is only enabled after equivalence tests.
   Headless. SPEC[SW-SIM-001]. */
var SW = globalThis.SW = globalThis.SW || {};

SW.aperture = (function () {
  'use strict';
  const A = {};
  A.VERSION = 1;
  // Compatibility snapshots are diagnostic: the legacy simulator remains the
  // authority, so a slow cadence avoids spending interaction frames cloning
  // hundreds of systems before the real Cold engine is enabled.
  A.COLD_REFRESH_EVERY = 120;
  A.MAX_TRANSITIONS = 64;

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function stable(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + stable(value[key]);
    }).join(',') + '}';
  }

  function digest(text) {
    let a = 2166136261, b = 2246822519;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      a = Math.imul(a ^ code, 16777619);
      b = Math.imul(b ^ code, 3266489917);
    }
    return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
  }

  function validId(state, id) {
    return Number.isInteger(id) && !!state.systems[id];
  }

  function itemKey(value) {
    if (value && value.id !== undefined) return String(value.id);
    if (value && value.key !== undefined) return String(value.key);
    return stable(value);
  }

  function sortedClones(values) {
    return values.slice().sort(function (a, b) {
      return itemKey(a).localeCompare(itemKey(b));
    }).map(clone);
  }

  function emptyIndex(state) {
    const bySystem = {};
    for (const sys of state.systems) {
      bySystem[sys.id] = {
        reasons: [], ships: [], routes: [], directives: [], projects: [],
        pledges: [], objectives: [], contracts: [], charters: [], cohorts: [],
        blockades: [], story: [], rivals: [], operations: []
      };
    }
    return bySystem;
  }

  function add(index, state, id, group, value, reason) {
    if (!validId(state, id)) return;
    const row = index[id];
    if (group && value !== undefined && row[group].indexOf(value) < 0) row[group].push(value);
    if (reason && row.reasons.indexOf(reason) < 0) row.reasons.push(reason);
  }

  function stopSystem(stop) {
    if (Number.isInteger(stop)) return stop;
    if (!stop || typeof stop !== 'object') return null;
    if (Number.isInteger(stop.sys)) return stop.sys;
    if (Number.isInteger(stop.sysId)) return stop.sysId;
    return null;
  }

  // Build all cross-system references once. Classification and aggregation
  // consume this index instead of repeatedly filtering every global array.
  A.index = function (state) {
    const index = emptyIndex(state);

    for (const ship of (state.ships || [])) {
      add(index, state, ship.at, 'ships', ship, 'ship:present');
      if (ship.leg) {
        add(index, state, ship.leg.from, 'ships', ship, 'ship:departure');
        add(index, state, ship.leg.to, 'ships', ship, 'ship:arrival');
      }
      for (const id of (ship.path || [])) add(index, state, id, 'ships', ship, 'ship:scheduled-path');
      if (ship.mission) {
        add(index, state, ship.mission.sys, 'ships', ship, 'ship:mission');
        add(index, state, ship.mission.sysId, 'ships', ship, 'ship:mission');
        add(index, state, ship.mission.to, 'ships', ship, 'ship:mission');
      }
      if (ship.pax) {
        add(index, state, ship.pax.from, 'ships', ship, 'passengers:origin');
        add(index, state, ship.pax.to, 'ships', ship, 'passengers:destination');
      }
    }

    for (const route of (state.routes || [])) {
      for (const stop of (route.stops || [])) add(index, state, stopSystem(stop), 'routes', route, 'route:stop');
    }
    for (const directive of (state.directives || [])) add(index, state, directive.sys, 'directives', directive, 'directive:active');
    for (const project of (state.projects || [])) {
      add(index, state, Number.isInteger(project.sys) ? project.sys : project.sysId, 'projects', project, 'project:active');
    }
    for (const pledge of (state.pledges || [])) {
      add(index, state, pledge.from, 'pledges', pledge, 'pledge:origin');
      add(index, state, pledge.to, 'pledges', pledge, 'pledge:destination');
    }
    const objectives = state.thread && state.thread.objectives ? state.thread.objectives.active : [];
    for (const objective of (objectives || [])) add(index, state, objective.sys, 'objectives', objective, 'objective:active');
    for (const contract of (state.contracts || [])) {
      add(index, state, contract.sysId, 'contracts', contract, 'contract:active');
      add(index, state, contract.from, 'contracts', contract, 'contract:origin');
      add(index, state, contract.to, 'contracts', contract, 'contract:destination');
    }
    for (const charter of (state.charters || [])) {
      add(index, state, charter.from, 'charters', charter, 'charter:origin');
      add(index, state, charter.to, 'charters', charter, 'charter:destination');
    }
    for (const cohort of (state.cohorts || [])) {
      add(index, state, cohort.from, 'cohorts', cohort, 'cohort:origin');
      add(index, state, cohort.haven, 'cohorts', cohort, 'cohort:haven');
      add(index, state, cohort.to, 'cohorts', cohort, 'cohort:destination');
      for (const moving of (cohort.moving || [])) {
        add(index, state, moving.from, 'cohorts', cohort, 'cohort:movement');
        add(index, state, moving.to, 'cohorts', cohort, 'cohort:movement');
      }
    }
    for (const blockade of (state.blockades || [])) {
      add(index, state, blockade.a, 'blockades', blockade, 'blockade:lane');
      add(index, state, blockade.b, 'blockades', blockade, 'blockade:lane');
    }

    const story = state.story || {};
    if (story.pending && story.ctx) add(index, state, story.ctx.sysId, 'story', { id: story.pending, ctx: story.ctx }, 'story:pending');
    for (const queued of (story.queue || [])) {
      if (queued.ctx) add(index, state, queued.ctx.sysId, 'story', queued, 'story:scheduled');
    }
    for (const hail of (story.hails || [])) {
      if (hail.ctx) add(index, state, hail.ctx.sysId, 'story', hail, 'story:hail');
    }

    for (const rival of (state.rivals || [])) {
      add(index, state, rival.office, 'rivals', rival, 'rival:office');
      for (const line of (rival.lines || [])) {
        add(index, state, line.a, 'rivals', { rival: rival.id, line: line }, 'rival:line');
        add(index, state, line.b, 'rivals', { rival: rival.id, line: line }, 'rival:line');
      }
      for (const shipment of (rival.ships || [])) {
        add(index, state, shipment.from, 'rivals', { rival: rival.id, shipment: shipment }, 'rival:shipment');
        add(index, state, shipment.to, 'rivals', { rival: rival.id, shipment: shipment }, 'rival:shipment');
      }
    }

    const ops = state.ops || {};
    if (ops.blitz) add(index, state, ops.blitz.sys, 'operations', ops.blitz, 'operation:blitz');
    if (ops.embargo) add(index, state, ops.embargo.sys, 'operations', ops.embargo, 'operation:embargo');

    // Threat and Scourge changes affect both the frontier system and its
    // immediate escape/supply neighbours.
    for (const sys of state.systems) {
      if (sys.scourge > 0 || (sys.threatAt && sys.threatAt >= state.tick)) {
        add(index, state, sys.id, null, null, sys.scourge > 0 ? 'threat:scourge' : 'threat:scheduled');
        for (const neighbor of (sys.links || [])) add(index, state, neighbor, null, null, 'threat:frontier-neighbor');
      }
    }

    Object.keys(index).forEach(function (id) { index[id].reasons.sort(); });
    return index;
  };

  function physicalSystem(sys) {
    const value = clone(sys);
    // Discovery is player knowledge, not physical simulation state. Aperture
    // records it beside the aggregate and never writes it back to the galaxy.
    delete value.discovered;
    delete value.surveyed;
    return value;
  }

  A.aggregateSystem = function (state, id, index) {
    const sys = state.systems[id];
    if (!sys) return null;
    index = index || A.index(state);
    const row = index[id];
    return {
      version: 1,
      sys: id,
      asOf: state.tick,
      system: physicalSystem(sys),
      assets: {
        ships: sortedClones(row.ships),
        routes: sortedClones(row.routes),
        directives: sortedClones(row.directives),
        rivals: sortedClones(row.rivals),
        operations: sortedClones(row.operations)
      },
      obligations: {
        projects: sortedClones(row.projects),
        pledges: sortedClones(row.pledges),
        objectives: sortedClones(row.objectives),
        contracts: sortedClones(row.contracts),
        charters: sortedClones(row.charters),
        cohorts: sortedClones(row.cohorts),
        blockades: sortedClones(row.blockades),
        story: sortedClones(row.story)
      }
    };
  };

  A.signature = function (aggregate) {
    if (!aggregate) return null;
    const value = clone(aggregate);
    delete value.asOf;
    return stable(value);
  };

  function knowledge(sys) {
    return { discovered: !!sys.discovered, surveyed: !!sys.surveyed };
  }

  function desired(state, focus, index) {
    const rows = {};
    const focusSys = state.systems[focus];
    for (const sys of state.systems) {
      const reasons = index[sys.id].reasons.slice();
      if (focusSys && focusSys.links.indexOf(sys.id) >= 0 && reasons.indexOf('focus:neighbor') < 0) reasons.push('focus:neighbor');
      if (sys.id === focus) reasons.push('focus:active');
      reasons.sort();
      rows[sys.id] = {
        band: sys.id === focus ? 'hot' : (reasons.length ? 'warm' : 'cold'),
        reasons: reasons
      };
    }
    return rows;
  }

  function logTransition(aperture, state, id, from, to, before, after, beforeKnowledge, afterKnowledge) {
    const beforeSig = A.signature(before);
    const afterSig = A.signature(after);
    const knowledgeBefore = stable(beforeKnowledge);
    const knowledgeAfter = stable(afterKnowledge);
    const entry = {
      tick: state.tick,
      sys: id,
      from: from,
      to: to,
      before: digest(beforeSig),
      after: digest(afterSig),
      beforeBytes: beforeSig.length,
      afterBytes: afterSig.length,
      knowledgeBefore: digest(knowledgeBefore),
      knowledgeAfter: digest(knowledgeAfter),
      conserved: beforeSig === afterSig && knowledgeBefore === knowledgeAfter
    };
    aperture.conservation.push(entry);
    if (aperture.conservation.length > A.MAX_TRANSITIONS) aperture.conservation.shift();
    return entry;
  }

  A.init = function (state, focus) {
    focus = validId(state, focus) ? focus : state.homeId;
    const ap = {
      version: A.VERSION,
      engine: 'compat-full',
      focus: focus,
      records: {},
      lastClassifiedTick: state.tick,
      lastAggregateTick: state.tick,
      conservation: []
    };
    state.act.aperture = ap;
    A.sync(state, { forceAggregates: true });
    return ap;
  };

  A.current = function (state) {
    const ap = state && state.act && state.act.aperture;
    if (!ap || ap.version !== A.VERSION || !ap.records) return A.init(state);
    return ap;
  };

  A.bandOf = function (state, id) {
    const record = A.current(state).records[id];
    return record ? record.band : null;
  };

  A.sync = function (state, opts) {
    opts = opts || {};
    const ap = A.current(state);
    const index = A.index(state);
    const target = desired(state, ap.focus, index);
    const refreshCold = !!opts.forceAggregates || state.tick - ap.lastAggregateTick >= A.COLD_REFRESH_EVERY;
    const next = {};
    let transitions = 0;

    for (const sys of state.systems) {
      const id = sys.id;
      const old = ap.records[id] || null;
      const plan = target[id];
      const changed = !!old && old.band !== plan.band;
      const before = changed ? A.aggregateSystem(state, id, index) : null;
      const beforeKnowledge = changed ? knowledge(sys) : null;
      let aggregate = old ? old.aggregate : null;
      if (plan.band === 'cold' && (!aggregate || refreshCold || changed)) aggregate = A.aggregateSystem(state, id, index);
      if (plan.band !== 'cold') aggregate = null;
      next[id] = {
        version: 1,
        sys: id,
        band: plan.band,
        reasons: plan.reasons,
        since: old && old.band === plan.band ? old.since : state.tick,
        asOf: state.tick,
        knowledge: knowledge(sys),
        aggregate: aggregate
      };
      if (changed) {
        const after = A.aggregateSystem(state, id, index);
        logTransition(ap, state, id, old.band, plan.band, before, after, beforeKnowledge, knowledge(sys));
        transitions++;
      }
    }
    ap.records = next;
    ap.lastClassifiedTick = state.tick;
    if (refreshCold) ap.lastAggregateTick = state.tick;
    return { ok: true, transitions: transitions, index: index };
  };

  A.focus = function (state, id) {
    if (!validId(state, id)) return { ok: false, msg: 'Unknown system.' };
    const ap = A.current(state);
    A.sync(state, { forceAggregates: true });
    const from = ap.focus;
    const priorBand = A.bandOf(state, id);
    const before = A.aggregateSystem(state, id);
    const beforeKnowledge = knowledge(state.systems[id]);
    ap.focus = id;
    const report = A.sync(state, { forceAggregates: true });
    const after = A.aggregateSystem(state, id, report.index);
    return {
      ok: true,
      from: from,
      to: id,
      priorBand: priorBand,
      conserved: A.signature(before) === A.signature(after) && stable(beforeKnowledge) === stable(knowledge(state.systems[id])),
      transitions: report.transitions
    };
  };

  // Diagnostic transitions used by equivalence tests. The classifier remains
  // authoritative and will restore the causal band on the next sync.
  A.demote = function (state, id) {
    if (!validId(state, id)) return { ok: false, msg: 'Unknown system.' };
    const ap = A.current(state);
    if (ap.focus === id) return { ok: false, msg: 'Cannot demote the active aperture.' };
    A.sync(state, { forceAggregates: true });
    const record = ap.records[id];
    const from = record.band;
    const before = A.aggregateSystem(state, id);
    const know = knowledge(state.systems[id]);
    record.band = 'cold';
    record.reasons = ['diagnostic:forced'];
    record.since = state.tick;
    record.aggregate = A.aggregateSystem(state, id);
    const after = A.aggregateSystem(state, id);
    const entry = logTransition(ap, state, id, from, 'cold', before, after, know, knowledge(state.systems[id]));
    return { ok: true, conserved: entry.conserved, aggregate: clone(record.aggregate) };
  };

  A.promote = function (state, id, band) {
    if (!validId(state, id)) return { ok: false, msg: 'Unknown system.' };
    band = band === 'hot' ? 'hot' : 'warm';
    if (band === 'hot') {
      const focused = A.focus(state, id);
      if (focused.ok) focused.band = 'hot';
      return focused;
    }
    const ap = A.current(state);
    A.sync(state, { forceAggregates: true });
    const record = ap.records[id];
    const from = record.band;
    const before = A.aggregateSystem(state, id);
    const know = knowledge(state.systems[id]);
    record.band = band;
    record.reasons = ['diagnostic:forced'];
    record.since = state.tick;
    record.aggregate = null;
    const after = A.aggregateSystem(state, id);
    const entry = logTransition(ap, state, id, from, band, before, after, know, knowledge(state.systems[id]));
    return { ok: true, band: band, conserved: entry.conserved, aggregate: after };
  };

  A.beforeTick = function (state) { return A.sync(state); };
  A.afterTick = function (state) { return A.sync(state); };
  A.tick = A.afterTick; // compatibility for older callers

  A.snapshot = function (state) {
    const index = A.index(state);
    const systems = {};
    for (const sys of state.systems) systems[sys.id] = A.aggregateSystem(state, sys.id, index);
    return { version: 1, tick: state.tick, systems: systems };
  };

  // Pure validator: it never initializes, normalizes, or writes state.
  A.validate = function (state) {
    const errors = [];
    const ap = state && state.act && state.act.aperture;
    if (!ap) return ['aperture missing'];
    if (ap.version !== A.VERSION) errors.push('aperture version invalid');
    if (ap.engine !== 'compat-full') errors.push('unproven aperture engine enabled');
    if (!validId(state, ap.focus)) errors.push('aperture focus invalid');
    if (!ap.records || typeof ap.records !== 'object') return errors.concat(['aperture records missing']);
    const ids = Object.keys(ap.records);
    if (ids.length !== state.systems.length) errors.push('aperture must own one record per system');
    let hot = 0;
    for (const sys of state.systems) {
      const record = ap.records[sys.id];
      if (!record || record.sys !== sys.id) { errors.push('aperture record missing: ' + sys.id); continue; }
      if (record.band !== 'hot' && record.band !== 'warm' && record.band !== 'cold') errors.push('aperture band invalid: ' + sys.id);
      if (record.band === 'hot') hot++;
      if (sys.id === ap.focus && record.band !== 'hot') errors.push('aperture focus is not hot');
      if (!Array.isArray(record.reasons)) errors.push('aperture reasons missing: ' + sys.id);
      if (!record.knowledge || typeof record.knowledge.discovered !== 'boolean' || typeof record.knowledge.surveyed !== 'boolean') errors.push('aperture knowledge missing: ' + sys.id);
      if (record.band === 'cold' && !record.aggregate) errors.push('cold aggregate missing: ' + sys.id);
    }
    if (hot !== 1) errors.push('aperture must have exactly one hot system');
    for (const entry of (ap.conservation || [])) if (!entry.conserved) errors.push('aperture transition failed conservation at system ' + entry.sys);
    return errors;
  };

  return A;
})();
