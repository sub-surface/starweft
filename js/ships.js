/* STARWEFT ships.js — fleet, shipments, routes, smart trading, directives. DOM-free. */
var SW = globalThis.SW = globalThis.SW || {};

SW.ships = (function () {
  const U = SW.util, D = SW.data;
  const S = {};

  // ---- Stats with tech ----
  S.cap = function (state, ship) {
    const h = D.HULLS[ship.hull];
    return Math.floor(h.cap * (hasTech(state, 'cargopods') ? 1.25 : 1));
  };
  S.speed = function (state, ship) {
    const h = D.HULLS[ship.hull];
    let v = h.speed * (hasTech(state, 'iondrives') ? 1.25 : 1);
    if (state.story && state.story.flags.cats_aboard) v *= 1.03; // cats improve everything
    if (state.story && state.story.flags.crew_hired) v *= 1.03;
    return v;
  };
  S.cargoTotal = function (ship) {
    let n = 0; for (const c in ship.cargo) n += ship.cargo[c];
    return n;
  };
  S.hullCost = function (state, hullId) {
    return Math.floor(D.HULLS[hullId].cost * (hasTech(state, 'foundries') ? 0.75 : 1));
  };
  function hasTech(state, id) { return state.tech.unlocked.indexOf(id) >= 0; }

  // Service record: every hull quietly accumulates its history.
  function rec(ship, key) { ship.rec = ship.rec || {}; ship.rec[key] = (ship.rec[key] || 0) + 1; }
  S.rec = rec;

  // ---- Range (command web) ----
  S.rangeAnchors = function (state) {
    const out = [];
    for (const sys of state.systems) {
      if (sys.scourge === 2) continue;
      if (sys.id === state.homeId || sys.buildings.indexOf('relay') >= 0) out.push(sys);
    }
    return out;
  };
  S.rangeOf = function (state) {
    let R = D.TUNE.baseRange * (hasTech(state, 'relays2') ? D.TUNE.rangeBoost : 1);
    if (hasTech(state, 'doc_wayfarer')) R *= 1.2;
    if (hasTech(state, 'loomres')) R *= 1.25;
    // those who fled deep coreward hear the lanes differently
    if (state.story && state.story.flags && state.story.flags.deep_exodus) R *= 1.15;
    if (state.scourgeStance === 'exodus') R *= 1.05;
    if (SW.perks && SW.perks.has(state, 'voidborn')) R *= 1.1;
    return R;
  };
  S.inRange = function (state, sys) {
    const R = S.rangeOf(state);
    for (const a of S.rangeAnchors(state)) if (U.dist(a, sys) <= R) return true;
    return false;
  };

  // ---- Pathfinding (lanes + warp gates, avoiding corruption) ----
  function neighbors(state, sys) {
    let n = sys.links.slice();
    if (sys.buildings.indexOf('gate') >= 0) {
      for (const o of state.systems) {
        if (o.id !== sys.id && o.buildings.indexOf('gate') >= 0) n.push(o.id);
      }
    }
    return n;
  }
  S.findPath = function (state, fromId, toId) {
    const inoc = hasTech(state, 'scourge2');
    if (fromId === toId) return [fromId];
    const prev = {}; prev[fromId] = fromId;
    const q = [fromId];
    while (q.length) {
      const cur = q.shift();
      for (const nb of neighbors(state, state.systems[cur])) {
        if (prev[nb] !== undefined) continue;
        const nsys = state.systems[nb];
        if (nb !== toId && nsys.scourge === 2 && !inoc) continue; // can't route through corruption
        if (nsys.badlands && !hasTech(state, 'deepdrives')) continue; // the dark between webs
        if (SW.worldevents.laneBlocked(state, cur, nb)) continue;  // pirate blockades close lanes
        prev[nb] = cur;
        if (nb === toId) {
          const path = [toId]; let p = toId;
          while (p !== fromId) { p = prev[p]; path.push(p); }
          return path.reverse();
        }
        q.push(nb);
      }
    }
    return null;
  };

  // ---- Creation ----
  S.create = function (state, hullId, sysId, name) {
    const ship = {
      id: 'sh' + (state.nextId++),
      name: name || U.shipName(state, state.stats.shipsBuilt || 0),
      hull: hullId, at: sysId, cargo: {}, basis: {},
      mode: 'idle', leg: null, path: [],
      body: null, hop: null,   // in-system berth + shuttle leg
      mission: null, routeId: null, stopIdx: 0, directiveId: null,
      retryAt: 0, stranded: false,
    };
    state.ships.push(ship);
    state.stats.shipsBuilt = (state.stats.shipsBuilt || 0) + 1;
    return ship;
  };

  S.berths = function (ship) { return D.HULLS[ship.hull].berths || 0; };

  // Land the souls aboard: evacuees disembark at any safe population center
  // (their destination is a suggestion, not a cage); charter passengers only
  // pay where the contract says. Population and fares are conserved here.
  S.landPax = function (state, ship) {
    const pax = ship.pax;
    if (!pax) return { ok: false, msg: 'No passengers aboard.' };
    if (ship.mode !== 'idle' || ship.at === null) return { ok: false, msg: ship.name + ' is in flight.' };
    const sys = state.systems[ship.at];
    if (sys.scourge === 2) return { ok: false, msg: 'No one disembarks into that.' };
    if (pax.kind === 'charter' && sys.id !== pax.to) return { ok: false, msg: 'The charter pays at ' + state.systems[pax.to].name + '.' };
    if (pax.kind === 'evac' && !(sys.pop > 0)) return { ok: false, msg: 'Evacuees need a population center.' };
    const ratio = (sys.pop + pax.n) / Math.max(1, sys.pop);
    sys.pop += pax.n;
    for (const c in sys.cons) sys.cons[c] *= ratio;
    const fare = pax.kind === 'charter' ? pax.fare : Math.round(pax.n * D.TUNE.evacFarePerPop);
    state.credits += fare;
    if (pax.kind === 'evac') {
      state.stats.popSaved = Math.round(((state.stats.popSaved || 0) + pax.n) * 100) / 100;
      rec(ship, 'rescues');
    }
    ship.pax = null;
    SW.game.emit('toast', { kind: 'good', text: '⇣ ' + ship.name + ' lands ' + U.fmt1(pax.n) + 'M souls at ' + sys.name + ' (+' + U.fmt(fare) + '¤).' });
    SW.game.emit('sfx', 'sell');
    return { ok: true, fare: fare };
  };

  S.destroy = function (state, ship, reason) {
    const i = state.ships.indexOf(ship);
    if (i >= 0) state.ships.splice(i, 1);
    if (ship.pax) { // the manifest had names on it
      state.stats.popLost = Math.round(((state.stats.popLost || 0) + ship.pax.n) * 100) / 100;
      ship.pax = null;
    }
    if (ship.routeId) {
      const r = state.routes.find(function (x) { return x.id === ship.routeId; });
      if (r) { const j = r.ships.indexOf(ship.id); if (j >= 0) r.ships.splice(j, 1); }
    }
    state.stats.shipsLost = (state.stats.shipsLost || 0) + 1;
    const dataLost = S.dataValue(ship);
    SW.game.emit('toast', { kind: 'bad', text: '† ' + ship.name + ' lost — ' + reason + (dataLost ? ' ' + U.fmt(dataLost) + '¤ of unsold charts went with her.' : '') });
    SW.game.emit('sfx', 'loss');
  };

  // ---- Cartography data: the explorer's cargo ----
  S.dataValue = function (ship) {
    let v = 0;
    for (const b of (ship.data || [])) v += b.c;
    return v;
  };
  S.sellData = function (state, ship) {
    if (ship.mode !== 'idle' || ship.at === null) return { ok: false, msg: ship.name + ' is in flight.' };
    const sys = state.systems[ship.at];
    if (!sys || sys.type !== 'pop' || sys.scourge === 2) return { ok: false, msg: 'Cartographers buy at populated systems.' };
    const data = ship.data || [];
    if (!data.length) return { ok: false, msg: 'No charts aboard.' };
    // local buyers pay over the odds for the kinds they covet
    const buyer = D.DATA_BUYERS[sys.ideology] || {};
    let credits = 0, research = 0;
    for (const b of data) {
      credits += Math.round(b.c * (buyer[b.kind] || 1));
      research += b.r;
      const src = state.systems[b.sys];
      if (src) src.charted = true; // officially on the maps now
    }
    const n = data.length;
    ship.data = [];
    state.credits += credits;
    state.research += research;
    state.stats.creditsEarned = (state.stats.creditsEarned || 0) + credits;
    state.stats.dataSold = (state.stats.dataSold || 0) + credits;
    SW.game.emit('toast', { kind: 'good', text: '◈ ' + ship.name + ' sold ' + n + ' chart' + (n === 1 ? '' : 's') + ' at ' + sys.name + ': +' + U.fmt(credits) + '¤, +' + research + '◇.' });
    SW.game.emit('sfx', 'sell');
    SW.game.news(state, '◈ ' + sys.name + ' cartographers log ' + n + ' new chart' + (n === 1 ? '' : 's') + ' from ' + ship.name, sys.id);
    return { ok: true, credits: credits, research: research, bundles: n };
  };

  // ---- Trade primitives (ship at a market) ----
  S.buy = function (state, ship, c, qty) {
    const sys = state.systems[ship.at];
    if (!sys || sys.scourge === 2) return { ok: false, msg: 'No market here.' };
    const space = S.cap(state, ship) - S.cargoTotal(ship);
    qty = Math.min(qty, space);
    if (qty <= 0) return { ok: false, msg: 'Cargo hold is full.' };
    const unitPrice = SW.economy.buyPrice(state, sys, c, 'player', ship.body);
    const afford = Math.floor(state.credits / Math.max(1, unitPrice));
    qty = Math.min(qty, afford);
    if (qty <= 0) return { ok: false, msg: 'Not enough credits.' };
    const t = SW.economy.marketBuy(state, sys, c, qty, 'player', ship.body);
    if (t.qty <= 0) return { ok: false, msg: 'None in stock.' };
    state.credits -= t.cost;
    const had = ship.cargo[c] || 0;
    ship.basis[c] = ((ship.basis[c] || 0) * had + t.cost) / (had + t.qty);
    ship.cargo[c] = had + t.qty;
    return { ok: true, qty: t.qty, cost: t.cost };
  };

  S.sell = function (state, ship, c, qty) {
    const sys = state.systems[ship.at];
    if (!sys || sys.scourge === 2) return { ok: false, msg: 'No market here.' };
    qty = Math.min(qty, ship.cargo[c] || 0);
    if (qty <= 0) return { ok: false, msg: 'Nothing to sell.' };
    const t = SW.economy.marketSell(state, sys, c, qty, 'player', ship.body);
    if (t.qty <= 0) return { ok: false, msg: 'Their stores are full.' };
    ship.cargo[c] -= t.qty;
    if (ship.cargo[c] <= 0) { delete ship.cargo[c]; }
    state.credits += t.revenue;
    state.stats.creditsEarned = (state.stats.creditsEarned || 0) + t.revenue;
    const profit = t.revenue - (ship.basis[c] || 0) * t.qty;
    if (state.tutorial && state.tutorial.active && sys.id === state.homeId && ship.body === 'Earth' && c === 'ORE' && profit > 0) {
      state.tutorial.profitableOreSale = true;
    }
    SW.worldevents.onPlayerSell(state, sys.id, c, t.qty);
    // PLEDGE fulfilment seam: every delivery route (manual, route, queue,
    // mission, directive) lands here, so pledge progress is checked in one place.
    if (SW.pledges) SW.pledges.onDeliver(state, sys.id, c, t.qty);
    SW.game.emit('fx', { kind: 'floater', sysId: sys.id, text: '+' + U.fmt(t.revenue) + '¤', good: profit >= 0 });
    return { ok: true, qty: t.qty, revenue: t.revenue, profit: profit };
  };

  S.sellAll = function (state, ship) {
    let total = 0, profit = 0;
    for (const c of Object.keys(ship.cargo)) {
      const r = S.sell(state, ship, c, ship.cargo[c]);
      if (r.ok) { total += r.revenue; profit += r.profit; }
    }
    return { revenue: total, profit: profit };
  };

  // ---- In-system shuttle hops (berth to berth) ----
  // sqrt(a) spacing matches the orrery's radial mapping: Neptune is far,
  // but not thirty-AU-of-real-time far.
  S.hopTicks = function (state, sysId, fromName, toName) {
    const from = SW.planets.body(state, sysId, fromName);
    const to = SW.planets.body(state, sysId, toName);
    if (!to) return D.TUNE.hopTicksBase;
    const a0 = from ? Math.sqrt(from.a) : 0; // null berth = inner anchorage
    return Math.max(D.TUNE.hopTicksBase,
      Math.round(D.TUNE.hopTicksBase + D.TUNE.hopTicksPerAU * Math.abs(a0 - Math.sqrt(to.a))));
  };
  S.canHop = function (state, ship, bodyName) {
    if (ship.mode !== 'idle') return { ok: false, msg: ship.name + ' is in flight.' };
    if (ship.at === null || ship.at === undefined) return { ok: false, msg: 'Not in a system.' };
    const sys = state.systems[ship.at];
    if (!sys || sys.scourge === 2) return { ok: false, msg: 'Nothing answers in that system.' };
    const body = SW.planets.body(state, ship.at, bodyName);
    if (!body) return { ok: false, msg: 'No such body here.' };
    if ((ship.body || null) === bodyName) return { ok: false, msg: 'Already berthed there.' };
    return { ok: true, body: body };
  };
  S.hop = function (state, ship, bodyName) {
    const check = S.canHop(state, ship, bodyName);
    if (!check.ok) return check;
    const ticks = S.hopTicks(state, ship.at, ship.body, bodyName);
    ship.hop = { from: ship.body || null, to: bodyName, depart: state.tick, arrive: state.tick + ticks };
    ship.mode = 'shuttle';
    ship.idleSince = null;
    return { ok: true, eta: ticks };
  };
  function arriveHop(state, ship) {
    ship.body = ship.hop.to;
    ship.hop = null;
    ship.mode = 'idle';
    ship.idleSince = state.tick;
    SW.game.emit('sfx', 'click');
    SW.game.emit('hopArrive', { shipId: ship.id, sysId: ship.at, body: ship.body });
  }

  // ---- Travel ----
  S.canSend = function (state, ship, destId) {
    if (ship.mode !== 'idle') return { ok: false, msg: ship.name + ' is in flight.' };
    if (ship.at === destId) return { ok: false, msg: 'Already there.' };
    const dest = state.systems[destId];
    if (!dest) return { ok: false, msg: 'No such destination.' };
    if (dest.scourge === 2 && !hasTech(state, 'scourge2')) return { ok: false, msg: 'That system is corrupted. Ships entering would be unmade.' };
    if (dest.badlands && !hasTech(state, 'deepdrives')) return { ok: false, msg: 'The dark between webs swallows ordinary drives. Research Deep Drives.' };
    const path = S.findPath(state, ship.at, destId);
    if (!path) return { ok: false, msg: 'No safe lane exists.' };
    const upkeep = D.HULLS[ship.hull].upkeep * (S.inRange(state, dest) ? 1 : 2);
    if (state.credits < upkeep) return { ok: false, msg: 'Cannot afford jump upkeep (' + upkeep + '¤).' };
    return { ok: true, path: path, upkeep: upkeep };
  };
  S.send = function (state, ship, destId, mission) {
    const check = S.canSend(state, ship, destId);
    if (!check.ok) { if (/upkeep/.test(check.msg || '')) ship.stranded = true; return check; }
    const path = check.path, upkeep = check.upkeep;
    state.credits -= upkeep;
    ship.stranded = false;
    ship.path = path.slice(1);
    ship.mission = mission || null;
    startLeg(state, ship, ship.path.shift());
    return { ok: true };
  };

  function startLeg(state, ship, toId) {
    const from = state.systems[ship.at], to = state.systems[toId];
    const gateJump = from.links.indexOf(toId) < 0; // only possible via gates
    const ticks = gateJump ? 2 : Math.max(2, Math.round(U.dist(from, to) / S.speed(state, ship)));
    ship.leg = { from: ship.at, to: toId, depart: state.tick, arrive: state.tick + ticks, gate: gateJump };
    ship.mode = 'travel';
    ship.at = null;
    ship.body = null; ship.hop = null; // leaving the system clears the berth
    ship.idleSince = null;
  }

  // ---- Routes ----
  S.createRoute = function (state, stops, name) {
    const route = {
      id: 'rt' + (state.nextId++),
      name: name || ('Route ' + (state.routes.length + 1)),
      stops: stops, ships: [], totalProfit: 0, loopStartCredits: 0, lastLoopProfit: 0, paused: false,
    };
    state.routes.push(route);
    return route;
  };
  S.assignToRoute = function (state, ship, route) {
    S.unassign(state, ship);
    ship.routeId = route.id; ship.stopIdx = 0; ship.directiveId = null;
    route.ships.push(ship.id);
  };
  S.unassign = function (state, ship) {
    if (ship.routeId) {
      const r = state.routes.find(function (x) { return x.id === ship.routeId; });
      if (r) { const j = r.ships.indexOf(ship.id); if (j >= 0) r.ships.splice(j, 1); }
    }
    ship.routeId = null; ship.directiveId = null; ship.mission = null;
    ship.queue = []; ship.queueNote = null;
  };

  // Projected profit per loop for the route editor (advisory only).
  S.projectRoute = function (state, stops, hullId) {
    const cap = Math.floor(D.HULLS[hullId].cap * (hasTech(state, 'cargopods') ? 1.25 : 1));
    let profit = 0, dist = 0;
    for (let i = 0; i < stops.length; i++) {
      const a = state.systems[stops[i].sys], b = state.systems[stops[(i + 1) % stops.length].sys];
      dist += U.dist(a, b);
      const stop = stops[i];
      let c = stop.c;
      if (stop.action === 'smart' || (stop.action === 'buy' && !c)) c = bestCommodity(state, a, b, cap).c;
      if ((stop.action === 'buy' || stop.action === 'smart') && c) {
        const margin = SW.economy.sellPrice(state, b, c, 'player') * D.TUNE.sellFriction - SW.economy.buyPrice(state, a, c, 'player');
        if (margin > 0) profit += margin * Math.min(cap, Math.floor(a.stocks[c] || 0));
      }
      profit -= D.HULLS[hullId].upkeep;
    }
    return { profit: Math.round(profit), dist: Math.round(dist) };
  };

  function bestCommodity(state, here, next, cap) {
    let best = { c: null, margin: 0, qty: 0 };
    for (const c of D.COMM_IDS) {
      const stock = Math.floor(here.stocks[c] || 0);
      if (stock < 1) continue;
      if (D.COMMODITIES[c].locked && !hasTech(state, 'panacea')) continue;
      const buyP = SW.economy.buyPrice(state, here, c, 'player');
      const sellP = SW.economy.sellPrice(state, next, c, 'player');
      // pessimism: selling qty units moves the price down; approximate with friction
      const margin = sellP * D.TUNE.sellFriction - buyP;
      const qty = Math.min(cap, stock);
      if (margin > D.TUNE.smartMinProfit && margin * qty > best.margin * best.qty) {
        best = { c: c, margin: margin, qty: qty };
      }
    }
    return best;
  }

  // ---- Per-tick ----
  S.tick = function (state) {
    for (const ship of state.ships.slice()) {
      if (ship.mode === 'travel') {
        if (state.tick >= ship.leg.arrive) arrive(state, ship);
      } else if (ship.mode === 'shuttle') {
        if (!ship.hop) { ship.mode = 'idle'; } // load from a save mid-cleanup
        else if (state.tick >= ship.hop.arrive) arriveHop(state, ship);
      } else if (ship.mode === 'idle') {
        if (ship.pax && ship.at === ship.pax.to) S.landPax(state, ship); // souls walk off at the contracted port
        if ((D.HULLS[ship.hull].survey || 0) > 0) tickSurvey(state, ship);
        if (ship.routeId) tickRouteShip(state, ship);
        else if (ship.directiveId) tickDirectiveShip(state, ship);
        else if (ship.queue && ship.queue.length) tickQueueShip(state, ship);
        else if (ship.autoExplore) tickAutoExplore(state, ship);
        // idle-time bookkeeping for the Tessellation Yards
        if (!ship.routeId && !ship.directiveId && !ship.autoExplore && !ship.mission && !(ship.queue && ship.queue.length)) {
          if (ship.idleSince == null) ship.idleSince = state.tick;
        } else ship.idleSince = null;
      }
    }
    if (hasTech(state, 'autoyards') && !state.autoYardsOff && state.tick % D.TUNE.autoYardEvery === 0) {
      tickAutoYards(state);
    }
  };

  // ---- Surveys: scouts chart what they idle over ----
  function tickSurvey(state, ship) {
    const sys = state.systems[ship.at];
    if (!sys || sys.surveyed || sys.scourge === 2) return;
    let rate = D.HULLS[ship.hull].survey || 0;
    if (hasTech(state, 'doc_wayfarer')) rate *= 2;
    if (state.originBonusSurvey) rate *= 1.5;
    if (SW.perks && SW.perks.has(state, 'keeneyes')) rate *= 1.25;
    if (D.condFx) rate *= D.condFx(state, 'surveyMult', 1); // Wanderlust
    sys.surveyProg = (sys.surveyProg || 0) + rate;
    if (sys.surveyProg < D.TUNE.surveyTicks) return;
    sys.surveyed = true;
    delete sys.surveyProg;
    let research = D.TUNE.surveyResearch, credits = D.TUNE.surveyChart;
    // the frontier pays for risk: rewards scale with distance from home and region danger
    const home = state.systems[state.homeId];
    const distMult = 1 + D.TUNE.surveyDistFactor * Math.min(2, (home ? U.dist(home, sys) : 0) / D.TUNE.bubbleR);
    const regMult = (D.REGIONS[sys.region] && D.REGIONS[sys.region].surveyMult) || 1;
    research *= distMult * regMult;
    credits *= distMult * regMult;
    if (hasTech(state, 'deepcharts')) { research *= 1.5; credits *= 1.5; }
    if (sys.region === 'oldstream') research *= 1.5;
    // synergy: a Surveyor origin under Wayfarer doctrine sells charts dear
    if (state.origin === 'surveyor' && hasTech(state, 'doc_wayfarer')) credits *= 1.5;
    // cartography data: value is fixed here, paid only when sold at a
    // populated port. Until then it rides aboard — and dies with the ship.
    ship.data = ship.data || [];
    ship.data.push({
      kind: sys.wonder ? 'wonderRecord' : (sys.badlands ? 'deepFieldMap' : 'survey'),
      sys: sys.id, c: Math.round(credits), r: Math.round(research),
    });
    state.stats.surveys = (state.stats.surveys || 0) + 1;
    rec(ship, 'surveys');
    SW.game.emit('toast', { kind: 'good', text: '⌖ ' + ship.name + ' charted ' + sys.name + ' — data worth ' + Math.round(credits) + '¤ + ' + Math.round(research) + '◇ aboard. Sell at a populated port.' });
    SW.game.emit('sfx', 'discover');
    // lore surfaces where people dig
    const fragChance = sys.region === 'oldstream' ? 0.5 : (sys.type === 'derelict' ? 0.6 : 0.2);
    if (U.chance(state, fragChance)) SW.story.grantFragment(state);
    // anomaly finds: the burst rewards that make a prospector's career
    let findChance = hasTech(state, 'deepcharts') ? D.TUNE.surveyFindChanceDeep : D.TUNE.surveyFindChance;
    if (state.originBonusSurvey) findChance *= 1.25;
    if (SW.perks && SW.perks.has(state, 'starread')) findChance *= 1.5;
    if (U.chance(state, findChance)) surveyFind(state, sys, ship, distMult);
    // wonders change everything
    if (sys.wonder === 'blackhole' && !state.story.flags.hole_surveyed) {
      state.story.flags.hole_surveyed = true;
      state.research += D.TUNE.wonderResearch;
      SW.game.legacySet('wonder');
      SW.story.schedule(state, 'ev_hole', 1, { sysId: sys.id, shipId: ship.id });
    }
    if (sys.wonder === 'husk' && !state.story.flags.husk_surveyed) {
      state.story.flags.husk_surveyed = true;
      state.research += D.TUNE.wonderResearch;
      SW.game.legacySet('wonder');
      SW.story.schedule(state, 'ev_husk', 1, { sysId: sys.id, shipId: ship.id });
    }
  }

  // Anomaly finds roll one of three rewards; barren systems fall back to salvage.
  function surveyFind(state, sys, ship, distMult) {
    const roll = U.rnd(state);
    let text;
    if (roll < 0.3) {
      const r = Math.round(U.rf(state, 40, 90) * distMult);
      state.research += r;
      text = '✦ ' + ship.name + ' recovered a data vault at ' + sys.name + ' (+' + r + '◇).';
    } else if (roll < 0.55 && Object.keys(sys.prod || {}).length) {
      sys.prodBoostUntil = Math.max(sys.prodBoostUntil || 0, state.tick + 400);
      text = '✦ ' + ship.name + ' charted a rich vein at ' + sys.name + ' — production surges.';
    } else {
      const c = Math.round(U.rf(state, 220, 520) * distMult);
      state.credits += c;
      text = '✦ ' + ship.name + ' salvaged a relic cache at ' + sys.name + ' (+' + c + '¤).';
    }
    ship.data = ship.data || [];
    ship.data.push({ kind: 'anomalyTrace', sys: sys.id, c: Math.round(70 * distMult), r: Math.round(18 * distMult) });
    state.stats.finds = (state.stats.finds || 0) + 1;
    SW.game.emit('toast', { kind: 'good', text: text });
    SW.game.emit('sfx', 'discover');
  }

  function tickAutoExplore(state, ship) {
    if (state.tick < ship.retryAt) return;
    if (!(D.HULLS[ship.hull].survey > 0)) { ship.autoExplore = false; return; }
    const here = state.systems[ship.at];
    if (!here || here.scourge === 2) return;
    if (!here.surveyed) return; // finish the local survey before moving on
    // sell-policy: cash the charts at any populated port we're already in,
    // and head home deliberately once the bank is worth the trip
    if ((ship.data || []).length && here.type === 'pop') S.sellData(state, ship);
    if (S.dataValue(ship) >= D.TUNE.dataSellAt) {
      let vendor = null, vd = Infinity;
      for (const sys of state.systems) {
        if (sys.type !== 'pop' || !sys.discovered || sys.scourge === 2) continue;
        const path = S.findPath(state, ship.at, sys.id);
        if (path && path.length < vd) { vd = path.length; vendor = sys; }
      }
      if (vendor) {
        const rv = S.send(state, ship, vendor.id, { kind: 'autoExplore' });
        if (!rv.ok) ship.retryAt = state.tick + 18;
        return;
      }
    }
    const target = autoExploreTarget(state, ship);
    if (!target) {
      ship.retryAt = state.tick + 40;
      ship.mission = null;
      return;
    }
    const r = S.send(state, ship, target.id, { kind: 'autoExplore' });
    if (!r.ok) ship.retryAt = state.tick + 18;
  }

  function autoExploreTarget(state, ship) {
    // loose awareness of the other explorers: their targets (and the space
    // around them) are someone else's chart. Meeting by accident stays
    // possible; convoying down the same path does not.
    const claimed = [];
    for (const other of state.ships) {
      if (other.id === ship.id || !other.autoExplore) continue;
      // claim the other scout's *final* destination, not its current hop —
      // multi-hop paths through a shared gateway would otherwise hide the
      // real target and let two scouts convoy to the same system
      const tid = (other.mode === 'travel' && other.leg)
        ? ((other.path && other.path.length) ? other.path[other.path.length - 1] : other.leg.to)
        : other.at;
      if (tid !== null && tid !== undefined && state.systems[tid]) claimed.push(state.systems[tid]);
    }
    let best = null, bestScore = Infinity;
    for (const sys of state.systems) {
      if (sys.id === ship.at || sys.scourge === 2) continue;
      if (sys.discovered && sys.surveyed) continue;
      const path = S.findPath(state, ship.at, sys.id);
      if (!path) continue;
      const hops = path.length - 1;
      let score = hops * 1000 + U.dist(state.systems[ship.at], sys) + (sys.discovered ? -120 : 0);
      // every scout reads the charts a little differently (stable per pair)
      score += (U.seedFrom(ship.id + '|' + sys.id) % 1000) * 0.8;
      // avoid another scout's claim and the space around it. Targeting the very
      // same system is all but disqualified (a big flat penalty that beats any
      // hops/distance advantage); nearby space is discouraged on a falloff. The
      // radius scales with star spacing so it bites at any distance scale (was a
      // flat 12 ly with a graded penalty — too weak once distances doubled and a
      // closer-by-one-hop shared target could still win).
      const avoidR = Math.max(12, (D.TUNE.minSysDist || 3) * 2.5);
      for (const c of claimed) {
        if (c.id === sys.id) { score += 100000; continue; }
        const d = U.dist(sys, c);
        if (d < avoidR) score += 2600 - (d / avoidR) * 2160;
      }
      if (score < bestScore) { bestScore = score; best = sys; }
    }
    return best;
  }

  function arrive(state, ship) {
    const sysId = ship.leg.to, sys = state.systems[sysId];
    const legFrom = ship.leg.from; // capture before clearing
    ship.at = sysId; ship.mode = 'idle'; ship.leg = null;

    // Living Weave: record this hop's cargo contribution to lane flow.
    // Player ships add their cargo total (or 1 for empty — presence matters).
    (function () {
      const lf = state.laneFlow || (state.laneFlow = {});
      const minId = Math.min(legFrom, sysId), maxId = Math.max(legFrom, sysId);
      const k = minId + '-' + maxId;
      const cargo = S.cargoTotal(ship);
      lf[k] = (lf[k] || 0) + (cargo > 0 ? cargo : 1);
    })();

    if (sys.scourge === 2 && !hasTech(state, 'scourge2')) {
      S.destroy(state, ship, 'unmade by the Scourge at ' + sys.name);
      return;
    }
    if (!sys.discovered) {
      sys.discovered = true;
      state.stats.discovered = (state.stats.discovered || 0) + 1;
      // first-light: the sighting itself is data, banked aboard until sold
      const home = state.systems[state.homeId];
      const bounty = Math.round(D.TUNE.discoverCredits * (1 + Math.min(2, (home ? U.dist(home, sys) : 0) / D.TUNE.bubbleR)));
      ship.data = ship.data || [];
      ship.data.push({ kind: 'firstlight', sys: sysId, c: bounty, r: 0 });
      rec(ship, 'charted');
      SW.game.emit('toast', { kind: 'good', text: '✧ ' + ship.name + ' sighted ' + sys.name + ' (data +' + bounty + '¤)' });
      SW.game.emit('sfx', 'discover');
      SW.story.onArrival(state, sysId, ship);
    }

    if (ship.path.length > 0) { // continue multi-hop journey
      const upkeep = D.HULLS[ship.hull].upkeep;
      if (state.credits >= upkeep) {
        state.credits -= upkeep;
        startLeg(state, ship, ship.path.shift());
        return;
      }
      ship.path = []; ship.stranded = true;
      SW.game.emit('toast', { kind: 'bad', text: ship.name + ' stranded at ' + sys.name + ' — no upkeep funds.' });
    }
    // final arrival
    if (ship.mission && ship.mission.kind === 'manual') {
      if (ship.mission.sellOnArrive) {
        S.sellAll(state, ship);
        state.stats.deliveries = (state.stats.deliveries || 0) + 1;
        rec(ship, 'hauls');
        SW.game.emit('sfx', 'sell');
      }
      ship.mission = null;
    } else if (ship.mission && ship.mission.kind === 'supply') {
      tickSupply(state, ship);
    } else if (ship.mission && ship.mission.kind === 'autoExplore' && ship.path.length === 0) {
      ship.mission = null;
    } else if (ship.mission && ship.mission.kind === 'queue' && ship.path.length === 0) {
      ship.mission = null;
    }
  }

  // ---- idle logistics pool: cargo hulls first, scouts never ----
  // Headless twin of the old ui.js picker so planners and projects can draft ships.
  S.freeForLogistics = function (sh) {
    const hull = D.HULLS[sh.hull];
    return sh.mode === 'idle' && !sh.routeId && !sh.directiveId && !sh.mission &&
      !(sh.queue && sh.queue.length) && !sh.stranded && hull && !hull.survey && hull.cap > 0;
  };
  function logisticsRank(sh) {
    const hull = D.HULLS[sh.hull];
    if (!hull) return 9999;
    const role = hull.line === 'trade' ? 0 : (hull.line === 'vanguard' ? 1 : 2);
    return role * 10000 - hull.cap * 20 - (hull.power || 0);
  }
  S.idleLogistics = function (state) {
    return state.ships.filter(S.freeForLogistics).sort(function (a, b) {
      return logisticsRank(a) - logisticsRank(b);
    });
  };

  // Supply missions: buy materials at a cheap source, ferry them to a build site.
  // The cargo simply waits aboard the idle ship; building consumes from local holds.
  S.supplyMission = function (state, ship, targetSysId, c, qty) {
    if (ship.mode !== 'idle') return { ok: false, msg: ship.name + ' is in flight.' };
    const best = SW.economy.cheapestSource(state, c, Math.min(qty, 5));
    if (!best) return { ok: false, msg: 'No discovered market stocks ' + D.COMMODITIES[c].name + ' right now.' };
    if (ship.at !== best.id) {
      const check = S.canSend(state, ship, best.id);
      if (!check.ok) return check;
    }
    S.unassign(state, ship);
    ship.mission = { kind: 'supply', stage: 'tobuy', c: c, qty: qty, source: best.id, target: targetSysId };
    if (ship.at === best.id) { tickSupply(state, ship); return { ok: true, source: best }; }
    const r = S.send(state, ship, best.id, ship.mission);
    if (!r.ok) { ship.mission = null; return r; }
    return { ok: true, source: best };
  };

  function tickSupply(state, ship) {
    const m = ship.mission;
    if (!m) return;
    if (m.stage === 'tobuy' && ship.at === m.source) {
      S.buy(state, ship, m.c, m.qty);
      m.stage = 'deliver';
      if (ship.at !== m.target) {
        const r = S.send(state, ship, m.target, m);
        if (!r.ok) { ship.mission = null; SW.game.emit('toast', { kind: 'bad', text: ship.name + ' supply run stalled: ' + r.msg }); }
        return;
      }
    }
    if (m.stage === 'deliver' && ship.at === m.target) {
      ship.mission = null;
      SW.game.emit('toast', { kind: 'good', text: '▢ ' + ship.name + ' delivered supplies to ' + state.systems[m.target].name + '.' });
    }
  }

  function tickRouteShip(state, ship) {
    if (state.tick < ship.retryAt) return;
    const route = state.routes.find(function (x) { return x.id === ship.routeId; });
    if (!route || route.stops.length < 2 || route.paused) return;
    const stop = route.stops[ship.stopIdx % route.stops.length];

    if (ship.at !== stop.sys) { // travel to current stop
      const r = S.send(state, ship, stop.sys, { kind: 'route' });
      if (!r.ok) ship.retryAt = state.tick + 12;
      return;
    }
    // we are at the stop: act, then head to next
    doStopAction(state, ship, route, stop);
    ship.stopIdx = (ship.stopIdx + 1) % route.stops.length;
    if (ship.stopIdx === 0) { // loop complete
      state.stats.loops = (state.stats.loops || 0) + 1;
    }
    const next = route.stops[ship.stopIdx];
    if (next.sys !== ship.at) {
      const r = S.send(state, ship, next.sys, { kind: 'route' });
      if (!r.ok) ship.retryAt = state.tick + 12;
    }
  }

  function doStopAction(state, ship, route, stop) {
    const sys = state.systems[ship.at];
    const before = state.credits;
    if (stop.action === 'sell') {
      S.sellAll(state, ship);
      state.stats.deliveries = (state.stats.deliveries || 0) + 1;
      rec(ship, 'hauls');
    } else if (stop.action === 'buy' && stop.c) {
      S.buy(state, ship, stop.c, 9999);
    } else if (stop.action === 'smart') {
      // sell anything profitable (or anything at all if hold is full and stale)
      for (const c of Object.keys(ship.cargo)) {
        const sp = SW.economy.sellPrice(state, sys, c, 'player');
        if (sp >= (ship.basis[c] || 0) * 0.98) S.sell(state, ship, c, ship.cargo[c]);
      }
      // buy the best thing for the next stop
      const nextStop = route.stops[(ship.stopIdx + 1) % route.stops.length];
      const next = state.systems[nextStop.sys];
      const cap = S.cap(state, ship) - S.cargoTotal(ship);
      const pick = bestCommodity(state, sys, next, cap);
      if (pick.c) S.buy(state, ship, pick.c, cap);
      state.stats.deliveries = (state.stats.deliveries || 0) + 1;
    } else if (stop.action === 'drop') {
      if (sys.depot) {
        const keys = stop.c ? [stop.c] : Object.keys(ship.cargo);
        for (const c of keys) {
          if (!ship.cargo[c]) continue;
          sys.depot[c] = (sys.depot[c] || 0) + ship.cargo[c];
          delete ship.cargo[c]; delete ship.basis[c];
        }
      }
    } else if (stop.action === 'take' && stop.c) {
      if (sys.depot && sys.depot[stop.c]) {
        const space = S.cap(state, ship) - S.cargoTotal(ship);
        const qty = Math.min(space, Math.floor(sys.depot[stop.c]));
        if (qty > 0) {
          sys.depot[stop.c] -= qty;
          ship.cargo[stop.c] = (ship.cargo[stop.c] || 0) + qty;
          ship.basis[stop.c] = ship.basis[stop.c] || 0;
        }
      }
    }
    route.totalProfit += state.credits - before;
  }

  // ---- Command grammar: intents compile into visible queues of atoms ----
  // Atoms: {op:'move',sys} {op:'buy',c,q} {op:'sell',c|null=all} {op:'drop',c|null}
  //        {op:'sellData'} {op:'wait',until}
  // The compiler is invisible; the queue is not. Every ship can answer
  // "why are you doing this?" via ship.queueNote + S.describeCmd(queue[0]).
  S.describeCmd = function (state, cmd) {
    if (!cmd) return 'idle';
    switch (cmd.op) {
      case 'move': return '→ ' + (state.systems[cmd.sys] ? state.systems[cmd.sys].name : '?');
      case 'buy': return 'load ' + (D.COMMODITIES[cmd.c] ? D.COMMODITIES[cmd.c].name : cmd.c);
      case 'sell': return cmd.c ? 'sell ' + D.COMMODITIES[cmd.c].name : 'sell cargo';
      case 'drop': return 'drop to depot';
      case 'sellData': return 'sell charts';
      case 'wait': return 'hold';
    }
    return cmd.op;
  };

  S.intent = function (state, ship, intent) {
    if (!intent || !intent.type) return { ok: false, msg: 'No intent.' };
    if (ship.mode !== 'idle') return { ok: false, msg: ship.name + ' is in flight.' };
    const q = [];
    let note = '';
    if (intent.type === 'fetch') {
      const from = state.systems[intent.from], to = state.systems[intent.to];
      if (!from || !to || !from.discovered || !to.discovered) return { ok: false, msg: 'Both ends must be charted.' };
      if (!D.COMMODITIES[intent.c]) return { ok: false, msg: 'Unknown commodity.' };
      if (intent.deliver === 'drop' && !to.depot) return { ok: false, msg: to.name + ' has no Depot.' };
      if (ship.at !== intent.from) {
        const firstLeg = S.canSend(state, ship, intent.from);
        if (!firstLeg.ok) return { ok: false, msg: firstLeg.msg };
        q.push({ op: 'move', sys: intent.from });
      }
      const legProbe = {
        id: ship.id, name: ship.name, hull: ship.hull, at: intent.from,
        mode: 'idle', cargo: ship.cargo || {}, basis: ship.basis || {},
      };
      const secondLeg = intent.from === intent.to ? { ok: true } : S.canSend(state, legProbe, intent.to);
      if (!secondLeg.ok) return { ok: false, msg: secondLeg.msg };
      q.push({ op: 'buy', c: intent.c, q: intent.q || 9999 });
      q.push({ op: 'move', sys: intent.to });
      q.push({ op: intent.deliver === 'drop' ? 'drop' : 'sell', c: null });
      note = 'FETCH ' + D.COMMODITIES[intent.c].name + ' · ' + from.name + ' → ' + to.name;
    } else if (intent.type === 'goSellData') {
      const to = state.systems[intent.to];
      if (!to || to.type !== 'pop') return { ok: false, msg: 'Cartographers buy at populated systems.' };
      if (ship.at !== intent.to) {
        const leg = S.canSend(state, ship, intent.to);
        if (!leg.ok) return { ok: false, msg: leg.msg };
        q.push({ op: 'move', sys: intent.to });
      }
      q.push({ op: 'sellData' });
      note = 'REPORT IN · charts → ' + to.name;
    } else {
      return { ok: false, msg: 'Unknown intent "' + intent.type + '".' };
    }
    S.unassign(state, ship);
    ship.autoExplore = false;
    ship.retryAt = 0;
    ship.queue = q;
    ship.queueNote = note;
    return { ok: true, queue: q, note: note };
  };

  function tickQueueShip(state, ship) {
    if (state.tick < ship.retryAt) return;
    const q = ship.queue;
    const cmd = q[0];
    if (!cmd) { finishQueue(state, ship); return; }
    switch (cmd.op) {
      case 'move': {
        if (ship.at === cmd.sys) { q.shift(); break; }
        const r = S.send(state, ship, cmd.sys, { kind: 'queue' });
        if (!r.ok) { ship.retryAt = state.tick + 12; }
        return;
      }
      case 'buy': {
        const r = S.buy(state, ship, cmd.c, cmd.q || 9999);
        if (!r.ok) { failQueue(state, ship, r.msg); return; }
        q.shift();
        break;
      }
      case 'sell': {
        if (cmd.c) S.sell(state, ship, cmd.c, 9999);
        else { S.sellAll(state, ship); }
        state.stats.deliveries = (state.stats.deliveries || 0) + 1;
        rec(ship, 'hauls');
        q.shift();
        break;
      }
      case 'drop': {
        const sys = state.systems[ship.at];
        if (sys && sys.depot) {
          const keys = cmd.c ? [cmd.c] : Object.keys(ship.cargo);
          for (const c of keys) {
            if (!ship.cargo[c]) continue;
            sys.depot[c] = (sys.depot[c] || 0) + ship.cargo[c];
            delete ship.cargo[c]; delete ship.basis[c];
          }
        }
        q.shift();
        break;
      }
      case 'sellData': {
        const r = S.sellData(state, ship);
        if (!r.ok) { failQueue(state, ship, r.msg); return; }
        q.shift();
        break;
      }
      case 'wait': {
        if (state.tick >= (cmd.until || 0)) q.shift();
        return;
      }
      default: q.shift();
    }
    if (!q.length) finishQueue(state, ship);
  }
  function finishQueue(state, ship) {
    if (ship.queueNote) SW.game.emit('toast', { kind: 'good', text: '✓ ' + ship.name + ': ' + ship.queueNote + ' — complete.' });
    ship.queue = [];
    ship.queueNote = null;
  }
  function failQueue(state, ship, msg) {
    SW.game.emit('toast', { kind: 'bad', text: '△ ' + ship.name + ': ' + (ship.queueNote || 'orders') + ' — ' + msg });
    ship.queue = [];
    ship.queueNote = null;
    ship.retryAt = 0;
  }

  // ---- Meta-routes (Weftworks): one route spanning a whole supply chain ----
  // Plan: buy each raw input at its cheapest source → sell at a factory →
  // buy the finished output there → sell where it's dearest.
  S.planChainRoute = function (state, out) {
    const rec = D.RECIPES.find(function (r) { return r.out === out && !r.playerFabOnly; });
    if (!rec) return { ok: false, msg: 'No factory recipe produces ' + (D.COMMODITIES[out] ? D.COMMODITIES[out].name : out) + '.' };
    const home = state.systems[state.homeId];
    const live = state.systems.filter(function (s) { return s.discovered && s.scourge !== 2; });
    let producer = null, pd = Infinity;
    for (const s of live) {
      if (s.slots.indexOf(out) < 0 && s.slots.indexOf('ANY') < 0) continue;
      const d = U.dist(home, s);
      if (d < pd) { pd = d; producer = s; }
    }
    if (!producer) return { ok: false, msg: 'No discovered factory makes ' + D.COMMODITIES[out].name + '. Build a Fabricator or find an industrial hub.' };
    const stops = [];
    for (const inp in rec.inputs) {
      let src = null, srcP = Infinity;
      for (const s of live) {
        if (s.id === producer.id) continue;
        if ((s.stocks[inp] || 0) < 10 && !(s.prod && s.prod[inp] > 0)) continue;
        const p = SW.economy.buyPrice(state, s, inp, 'player');
        if (p < srcP) { srcP = p; src = s; }
      }
      if (!src) return { ok: false, msg: 'No discovered source for ' + D.COMMODITIES[inp].name + '.' };
      stops.push({ sys: src.id, action: 'buy', c: inp });
    }
    stops.push({ sys: producer.id, action: 'sell' });          // feed the factory
    stops.push({ sys: producer.id, action: 'buy', c: out });   // collect the product
    let market = null, mP = 0;
    for (const s of live) {
      if (s.id === producer.id) continue;
      const p = SW.economy.sellPrice(state, s, out, 'player');
      if (p > mP) { mP = p; market = s; }
    }
    if (!market) return { ok: false, msg: 'No market to sell ' + D.COMMODITIES[out].name + '.' };
    stops.push({ sys: market.id, action: 'sell' });
    return { ok: true, stops: stops, name: 'Weave: ' + D.COMMODITIES[out].name, producer: producer, market: market };
  };

  // ---- Tessellation Yards: the fleet sizes itself to the work ----
  function tickAutoYards(state) {
    const T = D.TUNE;
    const starving = state.routes.find(function (r) { return !r.paused && r.stops.length >= 2 && r.ships.length === 0; });
    const idlers = state.ships.filter(function (s) {
      return s.mode === 'idle' && D.HULLS[s.hull].line === 'trade' && !s.routeId && !s.directiveId &&
        !s.autoExplore && !s.mission && !(s.queue && s.queue.length) && !s.stranded && S.cargoTotal(s) === 0;
    });
    if (starving) {
      if (idlers.length) {
        S.assignToRoute(state, idlers[0], starving);
        SW.game.emit('toast', { kind: 'good', text: '⊞ Yards assigned ' + idlers[0].name + ' to ' + starving.name + '.' });
        return;
      }
      let hullId = 'sparrow';
      for (const h of ['courier', 'freighter', 'superhauler']) {
        if (!D.HULLS[h].tech || hasTech(state, D.HULLS[h].tech)) hullId = h;
      }
      const cost = S.hullCost(state, hullId);
      if (state.credits >= cost + T.autoYardReserve) {
        state.credits -= cost;
        const ship = S.create(state, hullId, state.homeId);
        S.assignToRoute(state, ship, starving);
        state.stats.autoBuilt = (state.stats.autoBuilt || 0) + 1;
        SW.game.emit('toast', { kind: 'good', text: '⊞ Yards laid down ' + ship.name + ' for ' + starving.name + ' (−' + U.fmt(cost) + '¤).' });
        SW.game.emit('sfx', 'build');
      }
      return;
    }
    // surplus: reclaim one long-idle hauler (never the last ship)
    if (state.ships.length <= 1) return;
    const stale = idlers.find(function (s) { return s.idleSince != null && state.tick - s.idleSince >= T.autoYardIdleTicks; });
    if (stale) {
      const refund = Math.floor(S.hullCost(state, stale.hull) * T.scrapRefund);
      state.ships.splice(state.ships.indexOf(stale), 1);
      state.credits += refund;
      state.stats.autoScrapped = (state.stats.autoScrapped || 0) + 1;
      SW.game.emit('toast', { kind: 'good', text: '⊞ Yards reclaimed the idle ' + stale.name + ' (+' + U.fmt(refund) + '¤).' });
    }
  }

  // ---- Directives: "keep system X stocked with commodity C" ----
  S.createDirective = function (state, sysId, c, target) {
    const d = { id: 'dr' + (state.nextId++), sys: sysId, c: c, target: target, ships: [] };
    state.directives.push(d);
    return d;
  };
  S.assignToDirective = function (state, ship, d) {
    S.unassign(state, ship);
    ship.directiveId = d.id;
    d.ships.push(ship.id);
  };

  function tickDirectiveShip(state, ship) {
    if (state.tick < ship.retryAt) return;
    const d = state.directives.find(function (x) { return x.id === ship.directiveId; });
    if (!d) { ship.directiveId = null; return; }
    const target = state.systems[d.sys];
    const carrying = ship.cargo[d.c] || 0;

    if (carrying > 0) {
      if (ship.at === d.sys) {
        S.sell(state, ship, d.c, carrying);
        state.stats.deliveries = (state.stats.deliveries || 0) + 1;
        rec(ship, 'hauls');
      } else {
        const r = S.send(state, ship, d.sys, { kind: 'directive' });
        if (!r.ok) ship.retryAt = state.tick + 12;
      }
      return;
    }
    if ((target.stocks[d.c] || 0) >= d.target) { ship.retryAt = state.tick + 20; return; } // topped up; wait
    // cheapest source with real stock, via the shared market index
    const best = SW.economy.cheapestSource(state, d.c, 8, d.sys);
    if (!best) { ship.retryAt = state.tick + 25; return; }
    if (ship.at === best.id) {
      const r = S.buy(state, ship, d.c, 9999);
      if (!r.ok) ship.retryAt = state.tick + 15;
    } else {
      const r = S.send(state, ship, best.id, { kind: 'directive' });
      if (!r.ok) ship.retryAt = state.tick + 12;
    }
  }

  // Interpolated 3D position for rendering (and for "where is it" UI).
  S.pos = function (state, ship) {
    if (ship.mode !== 'travel' || !ship.leg) {
      const sys = state.systems[ship.at];
      return { x: sys.x, y: sys.y, z: sys.z || 0, t: 0 };
    }
    const from = state.systems[ship.leg.from], to = state.systems[ship.leg.to];
    const t = U.clamp((state.tick - ship.leg.depart) / Math.max(1, ship.leg.arrive - ship.leg.depart), 0, 1);
    return { x: U.lerp(from.x, to.x, t), y: U.lerp(from.y, to.y, t), z: U.lerp(from.z || 0, to.z || 0, t), t: t, from: from, to: to };
  };

  return S;
})();
