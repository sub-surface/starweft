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
    reroute:      { actions: ['createRoute', 'assignShip'], requires: 'lane-path' },
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
      if (new Set(objective.responses).size !== objective.responses.length) errors.push('objective response classes must be distinct');
    }
    if (objective && objective.deadline !== null && objective.deadline !== undefined &&
        (!Number.isInteger(objective.deadline) || objective.deadline <= objective.createdAt)) errors.push('objective deadline invalid');
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

  function deadlineAllows(state, objective, ticks) {
    return objective.deadline === null || objective.deadline === undefined || state.tick + ticks <= objective.deadline;
  }

  function canEnter(state, target) {
    if (!target) return false;
    if (target.scourge === 2 && !(SW.tech && SW.tech.has(state, 'scourge2'))) return false;
    if (target.badlands && !(SW.tech && SW.tech.has(state, 'deepdrives'))) return false;
    return true;
  }

  function pathBetween(state, fromId, targetId) {
    const target = state.systems[targetId];
    if (!canEnter(state, target)) return null;
    return SW.ships.findPath(state, fromId, targetId);
  }

  function shipPath(state, ship, targetId) {
    if (!ship || !Number.isInteger(ship.at) || !state.systems[ship.at]) return null;
    return pathBetween(state, ship.at, targetId);
  }

  function pathTicksForShip(state, ship, path) {
    if (!path) return Infinity;
    let ticks = 0;
    const speed = SW.ships.speed(state, ship);
    for (let i = 1; i < path.length; i++) {
      ticks += Math.max(2, Math.round(SW.util.dist(state.systems[path[i - 1]], state.systems[path[i]]) / speed));
    }
    return ticks;
  }

  function upkeepFor(state, ship, target) {
    const hull = D.HULLS[ship.hull];
    return (hull.upkeep || 0) * (SW.ships.inRange(state, target) ? 1 : 2);
  }

  function targetRoom(target, commodity) {
    const cap = (target.capacity && target.capacity[commodity]) || D.TUNE.capDefault;
    return Math.max(0, cap - ((target.stocks && target.stocks[commodity]) || 0));
  }

  function cargoShips(state, predicate) {
    return (state.ships || []).filter(function (ship) {
      const hull = D.HULLS[ship.hull];
      return hull && ship.mode === 'idle' && Number.isInteger(ship.at) &&
        (predicate ? predicate(ship, hull) : (hull.cap || 0) > 0);
    });
  }

  function candidateCommodities(objective) {
    if (objective.need && D.COMMODITIES[objective.need] && !D.COMMODITIES[objective.need].locked) return [objective.need];
    return D.COMM_IDS.filter(function (c) { return D.COMMODITIES[c] && !D.COMMODITIES[c].locked; });
  }

  function deliveryProbe(state, objective, target) {
    if (!target.discovered || !canEnter(state, target)) return { ok: false, reason: 'target knowledge or access unavailable' };
    for (const ship of cargoShips(state)) {
      const free = SW.ships.cap(state, ship) - SW.ships.cargoTotal(ship);
      for (const commodity of candidateCommodities(objective)) {
        if (targetRoom(target, commodity) < 1 && !((target.cons && target.cons[commodity]) > 0)) continue;
        const carried = (ship.cargo && ship.cargo[commodity]) || 0;
        if (carried > 0) {
          const path = shipPath(state, ship, target.id);
          const ticks = pathTicksForShip(state, ship, path) + 1;
          const cost = path ? upkeepFor(state, ship, target) : Infinity;
          if (path && state.credits >= cost && deadlineAllows(state, objective, ticks)) {
            return { ok: true, ship: ship.id, commodity: commodity, source: ship.at, path: path, ticks: ticks, cost: cost };
          }
        }
        if (free < 1) continue;
        for (const source of state.systems) {
          if (source.id === target.id || !source.discovered || source.scourge === 2) continue;
          if (Math.floor((source.stocks && source.stocks[commodity]) || 0) < 1) continue;
          const toSource = shipPath(state, ship, source.id);
          const toTarget = pathBetween(state, source.id, target.id);
          if (!toSource || !toTarget) continue;
          const path = toSource.concat(toTarget.slice(1));
          const ticks = pathTicksForShip(state, ship, path) + 2;
          const unit = SW.economy.buyPrice(state, source, commodity, 'player');
          const cost = upkeepFor(state, ship, source) + upkeepFor(state, ship, target) + Math.max(0, unit);
          if (state.credits >= cost && deadlineAllows(state, objective, ticks)) {
            return { ok: true, ship: ship.id, commodity: commodity, source: source.id, path: path, ticks: ticks, cost: cost };
          }
        }
      }
    }
    return { ok: false, reason: 'no affordable owned delivery path' };
  }

  function constructionProbe(state, objective, target) {
    const building = D.BUILDINGS.relay;
    if (!target.discovered || !canEnter(state, target)) return { ok: false, reason: 'target knowledge or access unavailable' };
    if (target.scourge === 2 || target.buildings.indexOf('relay') >= 0) return { ok: false, reason: 'target is not buildable' };
    const need = building.mats.ALLOY || 0;
    let local = (target.depot && target.depot.ALLOY) || 0;
    for (const ship of state.ships) if (ship.at === target.id && ship.mode === 'idle') local += (ship.cargo.ALLOY || 0);
    if (local >= need && state.credits >= building.cost && deadlineAllows(state, objective, 1)) {
      return { ok: true, building: 'relay', ticks: 1, cost: building.cost, localAlloy: local };
    }
    const shortage = Math.max(0, need - local);
    for (const ship of cargoShips(state, function (owned) {
      return SW.ships.cap(state, owned) - SW.ships.cargoTotal(owned) >= shortage;
    })) {
      for (const source of state.systems) {
        if (!source.discovered || source.scourge === 2 || Math.floor((source.stocks && source.stocks.ALLOY) || 0) < shortage) continue;
        const toSource = shipPath(state, ship, source.id);
        const toTarget = pathBetween(state, source.id, target.id);
        if (!toSource || !toTarget) continue;
        const path = toSource.concat(toTarget.slice(1));
        const ticks = pathTicksForShip(state, ship, path) + 3;
        const materialCost = SW.economy.buyPrice(state, source, 'ALLOY', 'player') * shortage;
        const cost = building.cost + materialCost + upkeepFor(state, ship, source) + upkeepFor(state, ship, target);
        if (state.credits >= cost && deadlineAllows(state, objective, ticks)) {
          return { ok: true, building: 'relay', ship: ship.id, source: source.id, path: path, ticks: ticks, cost: cost };
        }
      }
    }
    return { ok: false, reason: 'relay materials, access, credits, or time unavailable' };
  }

  function routeProbe(state, objective, target, filter, extraTicks) {
    if (!target.discovered || !canEnter(state, target)) return { ok: false, reason: 'target knowledge or access unavailable' };
    for (const ship of cargoShips(state, filter)) {
      const path = shipPath(state, ship, target.id);
      if (!path) continue;
      const ticks = pathTicksForShip(state, ship, path) + (extraTicks || 0);
      const cost = upkeepFor(state, ship, target);
      if (state.credits >= cost && deadlineAllows(state, objective, ticks)) {
        return { ok: true, ship: ship.id, path: path, ticks: ticks, cost: cost };
      }
    }
    return { ok: false, reason: 'no eligible owned ship can reach target in budget' };
  }

  function rerouteProbe(state, objective, target) {
    if (!state.story || !state.story.flags || !state.story.flags.routes_unlocked) {
      return { ok: false, reason: 'route authoring is not unlocked' };
    }
    if (!target.discovered || !canEnter(state, target) || !SW.ships.inRange(state, target)) {
      return { ok: false, reason: 'target is not a charted command-range route stop' };
    }
    for (const ship of cargoShips(state)) {
      for (const source of state.systems) {
        if (!source || source.id === target.id || !source.discovered || !canEnter(state, source) || !SW.ships.inRange(state, source)) continue;
        const toSource = shipPath(state, ship, source.id);
        const toTarget = pathBetween(state, source.id, target.id);
        if (!toSource || !toTarget) continue;
        const commodity = candidateCommodities(objective).find(function (id) {
          const free = SW.ships.cap(state, ship) - SW.ships.cargoTotal(ship);
          return (free >= 1 || ((ship.cargo && ship.cargo[id]) || 0) >= 1) &&
            Math.floor((source.stocks && source.stocks[id]) || 0) >= 1 &&
            (targetRoom(target, id) >= 1 || ((target.cons && target.cons[id]) || 0) > 0);
        });
        if (!commodity) continue;
        const path = toSource.concat(toTarget.slice(1));
        const ticks = pathTicksForShip(state, ship, path) + 1;
        const purchase = ((ship.cargo && ship.cargo[commodity]) || 0) >= 1
          ? 0 : Math.max(0, SW.economy.buyPrice(state, source, commodity, 'player'));
        const cost = (toSource.length > 1 ? upkeepFor(state, ship, source) : 0) + upkeepFor(state, ship, target) + purchase;
        if (state.credits >= cost && deadlineAllows(state, objective, ticks)) {
          return {
            ok: true,
            ship: ship.id,
            path: path,
            ticks: ticks,
            cost: cost,
            commodity: commodity,
            stops: [{ sys: source.id, action: 'buy', c: commodity }, { sys: target.id, action: 'sell', c: commodity }]
          };
        }
      }
    }
    return { ok: false, reason: 'no executable two-stop route is charted, in range, affordable, and timely' };
  }

  function evacuationProbe(state, objective, target) {
    const cohort = (state.cohorts || []).find(function (item) {
      return item && item.from === target.id && item.n > 0 && Number.isInteger(item.haven);
    });
    const haven = cohort && state.systems[cohort.haven];
    if (!cohort || !haven || haven.id === target.id || !haven.discovered || haven.scourge === 2 || !(haven.pop > 0)) {
      return { ok: false, reason: 'no waiting cohort with a known safe haven' };
    }
    if (!target.discovered || !canEnter(state, target) || !canEnter(state, haven)) {
      return { ok: false, reason: 'cohort or haven access unavailable' };
    }
    for (const ship of cargoShips(state, function (owned, hull) { return (hull.berths || 0) > 0; })) {
      const toCohort = shipPath(state, ship, target.id);
      const toHaven = pathBetween(state, target.id, haven.id);
      if (!toCohort || !toHaven) continue;
      const path = toCohort.concat(toHaven.slice(1));
      const ticks = pathTicksForShip(state, ship, path) + 2;
      const cost = (toCohort.length > 1 ? upkeepFor(state, ship, target) : 0) + upkeepFor(state, ship, haven);
      if (state.credits >= cost && deadlineAllows(state, objective, ticks)) {
        return { ok: true, ship: ship.id, cohort: cohort.id, haven: haven.id, path: path, ticks: ticks, cost: cost };
      }
    }
    return { ok: false, reason: 'no berth-equipped ship can complete the cohort journey in budget' };
  }

  function solutionProbe(state, id, objective, context) {
    const solution = O.SOLUTIONS[id];
    const target = state.systems[objective.sys];
    if (!solution || !actionsExist(solution) || !target) return { id: id, ok: false, reason: 'solution seam unavailable' };
    let result;
    if (id === 'delivery') result = deliveryProbe(state, objective, target);
    else if (id === 'construction') result = constructionProbe(state, objective, target);
    else if (id === 'reroute') result = rerouteProbe(state, objective, target);
    else if (id === 'reserve') {
      result = target.depot ? deliveryProbe(state, objective, target) : { ok: false, reason: 'target has no owned reserve' };
    } else if (id === 'survey') {
      if (target.surveyed) result = { ok: false, reason: 'target is already surveyed' };
      else result = routeProbe(state, objective, target, function (ship, hull) { return (hull.survey || 0) > 0; }, 3);
    } else if (id === 'evacuation') {
      result = evacuationProbe(state, objective, target);
    } else if (id === 'combat') {
      if (target.id === state.homeId || target.scourge === 2) {
        result = { ok: false, reason: 'the raid action forbids this target' };
      } else {
        result = routeProbe(state, objective, target, function (ship) {
          return SW.combat && SW.combat.power(state, ship) >= 3;
        }, 4);
        if (result.ok) {
          const combatShip = state.ships.find(function (ship) { return ship.id === result.ship; });
          const readyAt = Math.max(state.tick + result.ticks, combatShip.raidCooldownUntil || 0);
          result.ticks = readyAt - state.tick;
          if (!deadlineAllows(state, objective, result.ticks)) result = { ok: false, reason: 'armed ship cooldown exceeds the deadline' };
        }
      }
    } else result = { ok: false, reason: 'solution probe missing' };
    result.id = id;
    return result;
  }

  function validateFamilies(state, context) {
    const results = {};
    const errors = [];
    Object.keys(O.FAMILIES).forEach(function (family) {
      const available = O.FAMILIES[family].responses.filter(function (id) {
        return O.SOLUTIONS[id] && actionsExist(O.SOLUTIONS[id]);
      });
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
      const probes = (objective.responses || []).map(function (id) { return solutionProbe(state, id, objective, context); });
      const responses = probes.filter(function (probe) { return probe.ok; }).map(function (probe) { return probe.id; });
      const reachable = (state.ships || []).some(function (ship) { return !!shipPath(state, ship, objective.sys); });
      return {
        id: objective.id,
        sys: objective.sys,
        known: !!state.systems[objective.sys].discovered,
        reachable: reachable,
        solutions: responses,
        probes: probes
      };
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
    const home = state.systems[state.homeId];
    const canRebuild = !!home && home.discovered && home.scourge !== 2 && state.credits >= SW.ships.hullCost(state, 'sparrow');
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
