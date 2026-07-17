/* STARWEFT objectives.js - objective grammar and deterministic seed validation.
   Headless. SPEC[SW-OBJ-001], SPEC[SW-SIM-006]. */
var SW = globalThis.SW = globalThis.SW || {};

SW.objectives = (function () {
  'use strict';
  const O = {};
  const D = SW.data;

  O.VERSION = 1;
  O.OPENING_MAX_HOPS = 4;
  O.OPENING_MAX_TRAVEL = 90;

  // These are executable solution seams, not prose labels. Availability checks
  // prove that the generated world and shipped action grammar can support the
  // response; later Gates attach objective-specific costs and consequences.
  O.SOLUTIONS = {
    delivery:     { actions: ['shipSend', 'order'], requires: 'commodity-loop' },
    construction: { actions: ['build', 'buildSite'], requires: 'buildable-world' },
    reroute:      { actions: ['createRoute', 'order'], requires: 'lane-path' },
    reserve:      { actions: ['depotDrop', 'build'], requires: 'depot-path' },
    survey:       { actions: ['toggleAutoExplore', 'order'], requires: 'survey-path' },
    evacuation:   { actions: ['boardEvac', 'landPax'], requires: 'berth-path' },
    combat:       { actions: ['raid'], requires: 'armed-path' }
  };

  O.FAMILIES = {
    restore:   { responses: ['delivery', 'construction', 'reroute'] },
    stabilize: { responses: ['delivery', 'reserve', 'evacuation', 'reroute'] },
    bridge:    { responses: ['survey', 'construction', 'reroute'] },
    relief:    { responses: ['delivery', 'evacuation', 'reroute'] },
    survey:    { responses: ['survey', 'delivery', 'reroute'] },
    exchange:  { responses: ['delivery', 'reserve', 'reroute'] },
    mobilize:  { responses: ['delivery', 'reserve', 'combat', 'reroute'] },
    contain:   { responses: ['reserve', 'combat', 'evacuation', 'reroute'] },
    recover:   { responses: ['survey', 'delivery', 'construction', 'reroute'] },
    found:     { responses: ['construction', 'delivery', 'reroute'] }
  };

  O.ensure = function (state) {
    const thread = state.thread;
    thread.objectives = thread.objectives || {
      version: O.VERSION,
      active: [],
      completed: [],
      failed: [],
      nextId: 1
    };
    return thread.objectives;
  };

  O.create = function (state, spec) {
    const store = O.ensure(state);
    spec = spec || {};
    if (!O.FAMILIES[spec.family]) return { ok: false, msg: 'Unknown objective family.' };
    if (!Number.isInteger(spec.sys) || !state.systems[spec.sys]) return { ok: false, msg: 'Objective needs a valid place.' };
    const objective = {
      version: O.VERSION,
      id: 'objective-' + store.nextId++,
      family: spec.family,
      sys: spec.sys,
      source: spec.source || 'world',
      need: spec.need || null,
      responses: (spec.responses || O.FAMILIES[spec.family].responses).slice(),
      status: 'active',
      createdAt: state.tick,
      deadline: spec.deadline === undefined ? null : spec.deadline,
      consequence: spec.consequence || null
    };
    const errors = O.validate(objective, state);
    if (errors.length) return { ok: false, msg: errors.join('; ') };
    store.active.push(objective);
    return { ok: true, objective: objective };
  };

  O.validate = function (objective, state) {
    const errors = [];
    if (!objective || objective.version !== O.VERSION) errors.push('objective schema invalid');
    if (!objective || !O.FAMILIES[objective.family]) errors.push('objective family invalid');
    if (!objective || !Number.isInteger(objective.sys) || !state.systems[objective.sys]) errors.push('objective place invalid');
    if (!objective || !Array.isArray(objective.responses) || objective.responses.length < 3) errors.push('objective needs three response classes');
    else {
      const unknown = objective.responses.filter(function (id) { return !O.SOLUTIONS[id]; });
      if (unknown.length) errors.push('objective response is not executable: ' + unknown.join(','));
    }
    return errors;
  };

  function graphReachable(state, start, passable) {
    const seen = Object.create(null);
    const q = [start];
    seen[start] = true;
    while (q.length) {
      const id = q.shift();
      const sys = state.systems[id];
      for (const next of (sys.links || [])) {
        if (seen[next] || !state.systems[next]) continue;
        if (passable && !passable(state.systems[next])) continue;
        seen[next] = true;
        q.push(next);
      }
    }
    return seen;
  }

  function openingScope(state) {
    const depth = Object.create(null);
    const q = [state.homeId];
    depth[state.homeId] = 0;
    while (q.length) {
      const id = q.shift();
      if (depth[id] >= O.OPENING_MAX_HOPS) continue;
      for (const next of (state.systems[id].links || [])) {
        const sys = state.systems[next];
        if (!sys || sys.badlands || sys.scourge === 2 || depth[next] !== undefined) continue;
        depth[next] = depth[id] + 1;
        q.push(next);
      }
    }
    return Object.keys(depth).map(Number).filter(function (id) {
      const sys = state.systems[id];
      return sys && (id === state.homeId || (sys.discovered && SW.ships.inRange(state, sys)));
    }).sort(function (a, b) { return a - b; });
  }

  function fastestOpeningSpeed(state) {
    let speed = 0;
    for (const ship of (state.ships || [])) {
      if ((D.HULLS[ship.hull].cap || 0) > 0) speed = Math.max(speed, SW.ships.speed(state, ship));
    }
    return speed || 1;
  }

  function travelTicks(state, path) {
    const speed = fastestOpeningSpeed(state);
    let ticks = 0;
    for (let i = 1; i < path.length; i++) {
      ticks += Math.max(2, Math.round(SW.util.dist(state.systems[path[i - 1]], state.systems[path[i]]) / speed));
    }
    return ticks;
  }

  function openingLoops(state, scope) {
    const allowed = new Set(scope);
    const loops = [];
    for (const c of D.COMM_IDS) {
      const def = D.COMMODITIES[c];
      if (!def || def.locked) continue;
      const sources = scope.map(function (id) { return state.systems[id]; }).filter(function (sys) {
        return ((sys.prod && sys.prod[c]) || 0) > 0 || ((sys.stocks && sys.stocks[c]) || 0) >= 12;
      });
      const needs = scope.map(function (id) { return state.systems[id]; }).filter(function (sys) {
        const cap = (sys.capacity && sys.capacity[c]) || D.TUNE.capDefault;
        return ((sys.cons && sys.cons[c]) || 0) > 0 || ((sys.stocks && sys.stocks[c]) || 0) <= cap * 0.25;
      });
      let best = null;
      for (const source of sources) {
        for (const need of needs) {
          if (source.id === need.id) continue;
          const path = SW.ships.findPath(state, source.id, need.id);
          if (!path || path.some(function (id) { return !allowed.has(id); })) continue;
          const ticks = travelTicks(state, path);
          if (ticks > O.OPENING_MAX_TRAVEL) continue;
          const row = { commodity: c, source: source.id, need: need.id, path: path, travelTicks: ticks };
          if (!best || row.travelTicks < best.travelTicks ||
              (row.travelTicks === best.travelTicks && (row.source < best.source || (row.source === best.source && row.need < best.need)))) best = row;
        }
      }
      if (best) loops.push(best);
    }
    return loops;
  }

  function actionsExist(solution) {
    const actions = SW.game && SW.game.actions;
    return !!actions && solution.actions.every(function (id) { return typeof actions[id] === 'function'; });
  }

  function solutionAvailable(state, id, context) {
    const solution = O.SOLUTIONS[id];
    if (!solution || !actionsExist(solution)) return false;
    const scope = context.scope;
    if (id === 'delivery') return context.loops.length > 0 && state.ships.some(function (ship) { return D.HULLS[ship.hull].cap > 0; });
    if (id === 'construction') {
      const alloy = context.loops.some(function (loop) { return loop.commodity === 'ALLOY'; }) ||
        state.systems.some(function (sys) { return (sys.prod.ALLOY || 0) > 0 || (sys.stocks.ALLOY || 0) >= 5; });
      return alloy && Object.keys(D.BUILDINGS).length > 0 && Object.keys(D.FACILITIES).length > 0;
    }
    if (id === 'reroute') return context.loops.length > 0 && scope.length >= 2;
    if (id === 'reserve') return !!D.BUILDINGS.depot && state.ships.some(function (ship) { return D.HULLS[ship.hull].cap > 0; });
    if (id === 'survey') return Object.keys(D.HULLS).some(function (hull) { return (D.HULLS[hull].survey || 0) > 0; }) &&
      state.systems.some(function (sys) { return !sys.surveyed && !sys.badlands; });
    if (id === 'evacuation') return Object.keys(D.HULLS).some(function (hull) { return (D.HULLS[hull].berths || 0) > 0; }) &&
      state.systems.some(function (sys) { return sys.pop > 0; });
    if (id === 'combat') return Object.keys(D.HULLS).some(function (hull) { return (D.HULLS[hull].power || 0) >= 3; });
    return false;
  }

  function validateFamilies(state, context) {
    const results = {};
    const errors = [];
    Object.keys(O.FAMILIES).forEach(function (family) {
      const available = O.FAMILIES[family].responses.filter(function (id) { return solutionAvailable(state, id, context); });
      results[family] = available;
      if (available.length < 3) errors.push(family + ':' + available.join(','));
    });
    return { results: results, errors: errors };
  }

  O.validateSeed = function (state) {
    const all = graphReachable(state, state.homeId);
    const scope = openingScope(state);
    const loops = openingLoops(state, scope);
    const context = { scope: scope, loops: loops };
    const families = validateFamilies(state, context);
    const mandatory = state.thread && state.thread.objectives ? state.thread.objectives.active || [] : [];
    const mandatoryReport = mandatory.map(function (objective) {
      const responses = (objective.responses || []).filter(function (id) { return solutionAvailable(state, id, context); });
      return { id: objective.id, sys: objective.sys, reachable: !!all[objective.sys], solutions: responses };
    });
    const errors = [];
    if (Object.keys(all).length !== state.systems.length) errors.push('galaxy graph disconnected');
    if (!state.systems[state.homeId]) errors.push('home system missing');
    if (!state.ships || !state.ships.length) errors.push('opening fleet missing');
    if (scope.length < 2) errors.push('opening aperture has fewer than two reachable systems');
    if (loops.length < 2) errors.push('fewer than two viable opening commodity loops');
    if (loops.some(function (loop) { return !state.systems[loop.source].discovered || !state.systems[loop.need].discovered; })) errors.push('opening loop requires unavailable knowledge');
    if (families.errors.length) errors.push('objective families lack three executable solutions: ' + families.errors.join(';'));
    mandatoryReport.forEach(function (objective) {
      if (!objective.reachable) errors.push('mandatory objective unreachable: ' + objective.id);
      if (objective.solutions.length < 3) errors.push('mandatory objective has fewer than three solutions: ' + objective.id);
    });
    const canRebuild = state.credits >= SW.ships.hullCost(state, 'sparrow') || typeof SW.game.actions.buyShip === 'function';
    if (!canRebuild) errors.push('no deterministic recovery path from fleet loss');
    return {
      version: 1,
      seed: state.seed,
      layers: Object.assign({}, state.campaign.seeds),
      layerStates: { objectives: state.campaign.seeds.objectives },
      graph: { connected: Object.keys(all).length === state.systems.length, reached: Object.keys(all).length, total: state.systems.length },
      opening: { systems: scope, loops: loops, maxHops: O.OPENING_MAX_HOPS, maxTravelTicks: O.OPENING_MAX_TRAVEL },
      solutions: families.results,
      mandatoryObjectives: mandatoryReport,
      recovery: { rebuild: canRebuild },
      errors: errors,
      repairs: []
    };
  };

  O.repairSeed = function (state, report) {
    report = report || O.validateSeed(state);
    const repairs = (report.repairs || []).slice();
    let objectiveState = state.campaign.seeds.objectives;
    if (report.opening.loops.length < 2 && state.systems[state.homeId]) {
      const home = state.systems[state.homeId];
      const neighbor = (home.links || []).slice().sort(function (a, b) { return a - b; })
        .map(function (id) { return state.systems[id]; })
        .find(function (sys) { return sys && !sys.badlands && sys.scourge !== 2; });
      const objectiveRng = SW.campaign.seedStream(state, 'objectives');
      const choices = D.COMM_IDS.filter(function (c) { return !D.COMMODITIES[c].locked; }).slice(0, 2);
      // The layer chooses direction, while the two tier-zero inputs keep every
      // repair inside the opening market grammar (no exotic/derived goods).
      if (SW.util.rnd(objectiveRng) >= 0.5) choices.reverse();
      if (neighbor) {
        neighbor.discovered = true;
        neighbor.surveyed = true;
        if (!SW.ships.inRange(state, neighbor) && neighbor.buildings.indexOf('relay') < 0) {
          neighbor.buildings.push('relay');
          repairs.push({ kind: 'opening-anchor-template', system: neighbor.id });
        }
        choices.forEach(function (c, i) {
          const source = i ? neighbor : home;
          const need = i ? home : neighbor;
          source.prod[c] = Math.max(source.prod[c] || 0, 1);
          source.stocks[c] = Math.max(source.stocks[c] || 0, 20);
          need.cons[c] = Math.max(need.cons[c] || 0, 1);
          need.stocks[c] = Math.min(need.stocks[c] || 0, 2);
          repairs.push({ kind: 'opening-loop-template', commodity: c, source: source.id, need: need.id });
        });
      }
      objectiveState = objectiveRng.rngState;
    }
    const checked = O.validateSeed(state);
    checked.repairs = repairs;
    checked.layerStates.objectives = objectiveState;
    return checked;
  };

  O.initializeGeneration = function (state) {
    O.ensure(state);
    let report = O.validateSeed(state);
    if (report.errors.length) report = O.repairSeed(state, report);
    state.campaign.generation = report;
    if (report.errors.length) throw new Error('Seed validation failed: ' + report.errors.join('; '));
    return report;
  };

  return O;
})();
