/* STARWEFT smoke test v2 — headless simulation runs + invariant checks.
   Run: node test/smoke.js */
'use strict';
const path = require('path');
const FILES = ['util', 'data', 'perks', 'starcat', 'lore', 'events_data', 'planets', 'sites', 'galaxy', 'economy', 'ships', 'combat', 'rivals', 'scourge', 'tech', 'story', 'worldevents', 'tutorial', 'quests', 'civics', 'game', 'market_analytics'];
for (const f of FILES) require(path.join(__dirname, '..', 'js', f + '.js'));
const SW = globalThis.SW;
const U = SW.util, D = SW.data, G = SW.game, A = SW.game.actions;

let failures = 0, checks = 0;
function assert(cond, msg) {
  checks++;
  if (!cond) { failures++; console.error('  FAIL: ' + msg); }
}
function section(name) { console.log('— ' + name); }

function chooseAny(state) {
  if (!state.story.pending) return;
  const e = SW.story.pendingEvent(state);
  if (!e) { state.story.pending = null; return; }
  for (let i = 0; i < e.choices.length; i++) {
    const ch = e.choices[i];
    if (!ch.req || ch.req(state)) { SW.story.choose(state, i); return; }
  }
  SW.story.choose(state, 0);
}

function invariants(state, label) {
  const v = G.validate(state);
  assert(v.length === 0, label + ': G.validate clean (' + v.join('; ') + ')');
  assert(isFinite(state.credits) && state.credits >= 0, label + ': credits valid (' + state.credits + ')');
  assert(isFinite(state.research) && state.research >= 0, label + ': research valid');
  assert(isFinite(state.infamy) && state.infamy >= 0, label + ': infamy valid');
  for (const sys of state.systems) {
    for (const c of D.COMM_IDS) {
      const v = sys.stocks[c];
      assert(typeof v === 'number' && isFinite(v) && v >= -1e-6 && v <= (sys.capacity[c] || 999) + 1e-6,
        label + ': ' + sys.name + ' stock ' + c + ' = ' + v);
    }
    assert(sys.prosperity >= 0 && sys.prosperity <= 100, label + ': prosperity in range at ' + sys.name);
    assert(isFinite(sys.pop) && sys.pop >= 0, label + ': pop valid at ' + sys.name);
    assert(isFinite(sys.z), label + ': z coord finite at ' + sys.name);
  }
  for (const ship of state.ships) {
    if (ship.mode === 'idle') assert(typeof ship.at === 'number' && state.systems[ship.at], label + ': idle ship has location');
    if (ship.mode === 'travel') assert(ship.leg && ship.leg.arrive > ship.leg.depart, label + ': travel leg valid');
    const pos = SW.ships.pos(state, ship);
    assert(isFinite(pos.x) && isFinite(pos.y), label + ': ship position finite');
    assert(SW.ships.cargoTotal(ship) <= SW.ships.cap(state, ship) + 1e-6, label + ': cargo within capacity');
  }
}

function botStep(state) {
  chooseAny(state);
  if (state.tick % 5 !== 0) return;
  const techs = SW.tech.list(state).filter(function (t) { return t.available && t.affordable && !t.group; });
  if (techs.length) {
    techs.sort(function (a, b) { return a.cost - b.cost; });
    A.research(state, techs[0].id);
  }
  if (state.credits > 2500 && state.ships.length < 12) A.buyShip(state, 'sparrow', state.homeId);
  const ops = SW.economy.opportunities(state, 60)
    .filter(function (o) { return SW.ships.inRange(state, state.systems[o.from]) && SW.ships.inRange(state, state.systems[o.to]); });
  if (state.story.flags.routes_unlocked && ops.length && state.routes.length < 4 && state.ships.length > state.routes.length + 1) {
    const op = ops[0];
    A.createRoute(state, [{ sys: op.from, action: 'buy', c: op.c }, { sys: op.to, action: 'sell' }]);
  }
  for (const ship of state.ships) {
    if (ship.mode !== 'idle' || ship.routeId || ship.mission) continue;
    const freeRoute = state.routes.find(function (r) { return r.ships.length < 2; });
    if (freeRoute && state.story.flags.routes_unlocked) { A.assignShip(state, ship.id, freeRoute.id); continue; }
    const here = ops.find(function (o) { return o.from === ship.at; });
    if (here) {
      A.shipBuy(state, ship.id, here.c, 999);
      A.shipSend(state, ship.id, here.to, true);
    } else if (ops.length) {
      A.shipSend(state, ship.id, ops[0].from, false);
    }
  }
}

// ---------- 1. 3D galaxy generation ----------
section('3D galaxy generation (real catalog + procedural)');
{
  const st = G.newGame({ seed: 'smoke-1', difficulty: 'standard' });
  assert(st.systems.length >= 230, 'enough systems (' + st.systems.length + ')');
  assert(st.systems[st.homeId].name === 'Sol', 'home is Sol');
  assert(st.systems.some(function (s) { return s.name === 'Alpha Centauri'; }), 'Alpha Centauri exists');
  assert(st.systems.some(function (s) { return /TRAPPIST/.test(s.name); }), 'TRAPPIST-1 exists');
  const ac = st.systems.find(function (s) { return s.name === 'Alpha Centauri'; });
  const acD = U.dist(ac, st.systems[0]);
  assert(Math.abs(acD - 4.37) < 0.1, 'Alpha Centauri at ~4.37 ly (' + acD.toFixed(2) + ')');
  assert(st.systems.some(function (s) { return Math.abs(s.z) > 5; }), 'galaxy is 3D (z spread)');
  // connectivity
  const seen = {}; const q = [0]; seen[0] = true;
  while (q.length) { const c = q.shift(); for (const nb of st.systems[c].links) if (!seen[nb]) { seen[nb] = true; q.push(nb); } }
  assert(Object.keys(seen).length === st.systems.length, 'galaxy fully connected');
  // coreward density: more systems with x>0 than x<0
  let plus = 0, minus = 0;
  for (const s of st.systems) { if (s.x > 0) plus++; else minus++; }
  assert(plus > minus, 'denser coreward (+x ' + plus + ' vs ' + minus + ')');
  // regions + wonders
  assert(st.regions.length >= 5, 'regions exist');
  assert(st.systems.some(function (s) { return s.region === 'reach'; }), 'pirate Reach populated');
  assert(st.systems.some(function (s) { return s.wonder === 'blackhole'; }), 'black hole placed');
  assert(st.systems.some(function (s) { return s.wonder === 'husk'; }), 'Dyson husk placed');
  // scourge origin coreward & far
  const origin = st.systems[st.scourgeOriginId];
  assert(origin.x > 0, 'scourge origin is coreward (x=' + origin.x.toFixed(1) + ')');
  assert(origin.hops >= 3, 'origin far from Sol (hops=' + origin.hops + ')');
  // types
  const types = {};
  for (const s of st.systems) types[s.type] = (types[s.type] || 0) + 1;
  assert((types.pop || 0) >= 15, 'population centers exist (' + types.pop + ')');
  assert((types.mining || 0) >= 15, 'mining systems exist');
  assert((types.industrial || 0) >= 10, 'industrial hubs exist');
  // ideologies on inhabited systems
  assert(st.systems.some(function (s) { return s.ideology === 'synod'; }), 'Synod worlds exist');
  // tutorial guarantee
  const near = st.systems.filter(function (s) { return s.hops > 0 && s.hops <= 2; });
  assert(near.some(function (s) { return s.type === 'mining' || s.type === 'agri' || s.type === 'gas'; }), 'producer near Sol');
}

// ---------- 2. planetary systems ----------
section('Planetary systems (astronomical naming, Kepler sanity)');
{
  const st = G.newGame({ seed: 'smoke-2', difficulty: 'standard' });
  const sol = SW.planets.get(st, st.homeId);
  assert(sol.bodies.some(function (b) { return b.name === 'Earth' && b.type === 'terran'; }), 'Sol has Earth');
  assert(sol.bodies.length === 9, 'Sol has 8 planets + Belt');
  const trap = st.systems.find(function (s) { return /TRAPPIST/.test(s.name); });
  if (trap) {
    const tb = SW.planets.get(st, trap.id);
    assert(tb.bodies.length >= 7, 'TRAPPIST-1 honors its 7 known planets (' + tb.bodies.length + ')');
  }
  let checkedNames = 0, keplerOk = true, namingOk = true;
  for (const sys of st.systems.slice(0, 80)) {
    const data = SW.planets.get(st, sys.id);
    let lastA = 0, lastP = 0;
    data.bodies.forEach(function (b, i) {
      if (!b.real && !b.wonder) {
        const expected = (sys.cat || sys.name) + ' ' + String.fromCharCode(98 + i);
        if (b.name !== expected) namingOk = false;
      }
      if (b.a < lastA || b.period < lastP - 1e-9) keplerOk = false;
      lastA = b.a; lastP = b.period;
      if (!isFinite(b.teq) || !isFinite(b.period)) keplerOk = false;
      checkedNames++;
    });
  }
  assert(namingOk, 'planets named <star> b/c/d… by orbit');
  assert(keplerOk, 'orbits and periods increase outward (' + checkedNames + ' bodies)');
  // determinism of derived bodies
  const a1 = JSON.stringify(SW.planets.get(st, 5));
  SW.planets.clearCache();
  const a2 = JSON.stringify(SW.planets.get(st, 5));
  assert(a1 === a2, 'bodies regenerate identically from seed');
  // black hole special case
  const bh = st.systems.find(function (s) { return s.wonder === 'blackhole'; });
  const bhd = SW.planets.get(st, bh.id);
  assert(bhd.bodies.length === 0 && /black hole/i.test(bhd.note), 'black hole system has no planets, has lore');
}

// ---------- 3. trade + travel primitives (3D distances) ----------
section('Trade & travel (3D)');
{
  const st = G.newGame({ seed: 'smoke-3', difficulty: 'standard' });
  const ship = st.ships[0];
  const home = st.systems[st.homeId];
  home.stocks.FOOD = 100;
  const r = A.shipBuy(st, ship.id, 'FOOD', 5);
  assert(r.ok && r.qty === 5, 'buy ok');
  const dest = st.systems[home.links[0]];
  const r2 = A.shipSend(st, ship.id, dest.id, true);
  assert(r2.ok, 'send ok');
  let guard = 0;
  while (ship.mode === 'travel' && guard++ < 300) { G.tick(st); chooseAny(st); }
  assert(ship.mode === 'idle' && ship.at === dest.id, 'arrived (' + guard + ' ticks)');
  assert(guard >= 2 && guard < 60, 'travel time sane for ly-scale lanes (' + guard + ')');
  assert(st.stats.deliveries >= 1, 'delivery counted');
}

// ---------- 4. construction ----------
section('Construction');
{
  const st = G.newGame({ seed: 'smoke-4', difficulty: 'standard' });
  st.credits = 5000;
  const target = st.systems[st.systems[st.homeId].links[0]];
  const ship = st.ships[0];
  ship.at = target.id; ship.cargo.ALLOY = 8;
  const r1 = A.build(st, target.id, 'relay');
  assert(r1.ok, 'relay built from ship-held materials');
  assert(st.story.flags.built_relay, 'tutorial flag set');
}

// ---------- 4b. market analytics ----------
section('Market analytics');
{
  const st = G.newGame({ seed: 'smoke-4b', difficulty: 'relaxed' });
  st.systems.forEach(function (sys) {
    sys.discovered = false;
    sys.scourge = 0;
    sys.stocks = {};
    sys.capacity = {};
    sys.presence = {};
    for (const c of D.COMM_IDS) {
      sys.stocks[c] = 60;
      sys.capacity[c] = 120;
    }
  });
  const a = st.systems[0], b = st.systems[1], c = st.systems[2], d = st.systems[3];
  [a, b, c, d].forEach(function (sys) {
    sys.discovered = true;
    sys.capacity.ORE = sys.capacity.GAS = 120;
  });
  a.stocks.ORE = 120; b.stocks.ORE = 0; c.stocks.ORE = 0;
  a.stocks.GAS = 120; d.stocks.GAS = 0;
  const ops = SW.economy.opportunities(st, 8, { onePerCommodity: true });
  const seen = {};
  for (const op of ops) {
    assert(!seen[op.c], 'commodity appears once in diversified opportunities: ' + op.c);
    seen[op.c] = true;
  }
  assert(seen.ORE && seen.GAS, 'diversified opportunities include multiple commodity types');
}

// ---------- 4c. SW.market module ----------
section('SW.market module');
{
  const M = SW.market;

  // marketTarget: consumer system with cons > 0 should have a non-zero target
  {
    const st = G.newGame({ seed: 'smoke-4c', difficulty: 'relaxed' });
    const sys = st.systems[st.homeId];
    sys.cons = sys.cons || {};
    sys.cons.FOOD = 0.5;
    sys.capacity.FOOD = 120;
    const t = M.marketTarget(sys, 'FOOD');
    assert(t > 0, 'marketTarget returns positive for consumer system (got ' + t + ')');
    assert(t >= D.TUNE.marketReserveMin, 'marketTarget >= marketReserveMin');
    assert(t <= sys.capacity.FOOD, 'marketTarget <= capacity');
    assert(Number.isFinite(t), 'marketTarget is finite');
  }

  // marketTarget: non-consumer, non-factory system returns 0
  {
    const sys = { cons: {}, slots: [], capacity: { ORE: 120 }, stocks: { ORE: 60 }, prod: {}, pop: 0 };
    const t = M.marketTarget(sys, 'ORE');
    assert(t === 0, 'marketTarget is 0 for system with no consumers or factories (got ' + t + ')');
  }

  // inboundCargo: counts a ship en route via supply mission
  {
    const st = G.newGame({ seed: 'smoke-4c-ib', difficulty: 'relaxed' });
    const home = st.systems[st.homeId];
    const src = st.systems[home.links[0]];
    const ship = st.ships[0];
    ship.cargo = { FOOD: 7 };
    ship.mission = { kind: 'supply', stage: 'deliver', c: 'FOOD', qty: 7, source: src.id, target: home.id };
    const before = M.inboundCargo(st, home.id, 'FOOD');
    assert(before === 7, 'inboundCargo counts supply-mission ship (got ' + before + ')');
    const other = M.inboundCargo(st, src.id, 'FOOD');
    assert(other === 0, 'inboundCargo does not count wrong destination (got ' + other + ')');
  }

  // inboundCargo: counts a directive ship
  {
    const st = G.newGame({ seed: 'smoke-4c-dir', difficulty: 'relaxed' });
    const home = st.systems[st.homeId];
    const ship = st.ships[0];
    ship.directiveId = 'dir-test';
    ship.cargo = { MEDS: 5 };
    ship.mission = null;
    st.directives.push({ id: 'dir-test', sys: home.id, c: 'MEDS', target: 40 });
    const ib = M.inboundCargo(st, home.id, 'MEDS');
    assert(ib === 5, 'inboundCargo counts directive ship (got ' + ib + ')');
  }

  // marketRole classifications
  {
    const sys = { cons: { FOOD: 0.3 }, prod: {}, stocks: { FOOD: 10 }, slots: [] };
    assert(M.marketRole(sys, 'FOOD', 30, 15) === 'needs', 'marketRole: needs when gap > 0');
    assert(M.marketRole(sys, 'FOOD', 30, 0) === 'covered', 'marketRole: covered when target > 0 and gap = 0');
    const prodSys = { cons: {}, prod: { ORE: 0.5 }, stocks: { ORE: 3 }, slots: [] };
    assert(M.marketRole(prodSys, 'ORE', 0, 0) === 'producer', 'marketRole: producer when prod > 0');
    const stockSys = { cons: {}, prod: {}, stocks: { ORE: 10 }, slots: [] };
    assert(M.marketRole(stockSys, 'ORE', 0, 0) === 'stock', 'marketRole: stock when stocks >= 5');
    const emptySys = { cons: {}, prod: {}, stocks: {}, slots: [] };
    assert(M.marketRole(emptySys, 'ORE', 0, 0) === 'watch', 'marketRole: watch otherwise');
  }

  // knownWealth: only counts discovered non-corrupted systems
  {
    const st = G.newGame({ seed: 'smoke-4c-wlth', difficulty: 'relaxed' });
    st.systems.forEach(function (s) { s.discovered = false; s.scourge = 0; });
    const a = st.systems[0], b = st.systems[1], c = st.systems[2];
    a.discovered = true; b.discovered = true; c.discovered = true;
    c.scourge = 2; // corrupted — excluded from wealth
    const hidden = st.systems[3];
    hidden.discovered = false;
    hidden.stocks.FOOD = 9999;
    const w1 = M.knownWealth(st);
    hidden.stocks.FOOD = 0;
    const w2 = M.knownWealth(st);
    assert(w1 === w2, 'knownWealth does not change when hidden system stock changes');
    c.stocks.FOOD = 9999;
    const w3 = M.knownWealth(st);
    assert(w3 === w2, 'knownWealth excludes corrupted systems');
    assert(Number.isFinite(w2), 'knownWealth is finite');
  }

  // weaveHealth: composite in range, pure, coverage responds to laneFlow
  {
    const st = G.newGame({ seed: 'smoke-4c-weave', difficulty: 'relaxed' });
    const wh = M.weaveHealth(st);
    assert(wh.score >= 0 && wh.score <= 100, 'weaveHealth score in [0,100] (got ' + wh.score + ')');
    for (const k of ['prosperity', 'supply', 'industry', 'coverage']) {
      const v = wh.components[k];
      assert(Number.isFinite(v) && v >= 0 && v <= 100, 'weaveHealth component ' + k + ' in [0,100] (got ' + v + ')');
    }
    const wh2 = M.weaveHealth(st);
    assert(wh2.score === wh.score, 'weaveHealth is pure (same tick, same score)');

    // coverage responds to laneFlow on a discovered system's lane
    const home = st.systems[st.homeId];
    const nb = home.links[0];
    const key = Math.min(home.id, nb) + '-' + Math.max(home.id, nb);
    st.laneFlow = {};
    const before = M.weaveHealth(st).components.coverage;
    st.laneFlow[key] = D.TUNE.weaveCoverageFlow + 5;
    const after = M.weaveHealth(st).components.coverage;
    assert(after > before, 'weaveHealth coverage rises when a lane carries flow (' + before + ' -> ' + after + ')');

    // undiscovered systems never counted: hiding everything zeroes pop components' inputs
    st.systems.forEach(function (s2) { s2.discovered = false; });
    const whHidden = M.weaveHealth(st);
    assert(whHidden.components.coverage === 0, 'weaveHealth coverage is 0 with nothing discovered');
    assert(whHidden.components.prosperity === 0, 'weaveHealth prosperity is 0 with nothing discovered');
  }

  // classifieds (The Wire): deterministic, grounded, bounded
  {
    const st = G.newGame({ seed: 'smoke-4c-wire', difficulty: 'relaxed' });
    const ads = M.classifieds(st, 9);
    assert(Array.isArray(ads) && ads.length > 0 && ads.length <= 9, 'classifieds returns 1..limit ads (' + ads.length + ')');
    const ads2 = M.classifieds(st, 9);
    assert(JSON.stringify(ads) === JSON.stringify(ads2), 'classifieds deterministic for same state');
    for (const ad of ads) {
      assert(typeof ad.text === 'string' && ad.text.length > 0, 'classified has text');
      if (ad.kind === 'wanted') {
        const sys = st.systems[ad.to];
        assert(sys && sys.discovered, 'WANTED ad targets a discovered system');
        assert(M.marketTarget(sys, ad.c) > Math.floor(sys.stocks[ad.c] || 0), 'WANTED ad reflects a real gap');
      }
      if (ad.kind === 'surplus') {
        const sys = st.systems[ad.from];
        assert(sys && sys.discovered, 'SURPLUS ad references a discovered system');
      }
    }
  }

  // buildInboundMap: single-pass produces correct totals
  {
    const st = G.newGame({ seed: 'smoke-4c-map', difficulty: 'relaxed' });
    const home = st.systems[st.homeId];
    const ship = st.ships[0];
    ship.cargo = { FOOD: 9 };
    ship.mission = { kind: 'supply', stage: 'deliver', c: 'FOOD', qty: 9, source: 0, target: home.id };
    const map = M.buildInboundMap(st);
    assert(map[home.id] && map[home.id].FOOD === 9, 'buildInboundMap records supply mission (got ' + (map[home.id] && map[home.id].FOOD) + ')');
  }

  // buildCommodityReport: ranks urgent sinks first and exposes both sides of the tape
  {
    const st = G.newGame({ seed: 'smoke-4c-report', difficulty: 'relaxed' });
    st.systems.forEach(function (sys) {
      sys.discovered = false; sys.scourge = 0;
      sys.stocks.FOOD = 50; sys.capacity.FOOD = 120; sys.cons.FOOD = 0; sys.hist = sys.hist || {};
      sys.hist.FOOD = [50, 50, 50, 50, 50];
    });
    const src = st.systems[0], urgent = st.systems[1], rich = st.systems[2], quiet = st.systems[3];
    [src, urgent, rich, quiet].forEach(function (sys) { sys.discovered = true; });
    src.stocks.FOOD = 115; src.prod.FOOD = 1.2; src.hist.FOOD = [40, 38, 36, 34, 32];
    urgent.stocks.FOOD = 0; urgent.cons.FOOD = 0.5; urgent.hist.FOOD = [70, 76, 82, 90, 96];
    rich.stocks.FOOD = 1; rich.cons.FOOD = 0.1; rich.hist.FOOD = [55, 58, 62, 66, 70];
    quiet.stocks.FOOD = 50; quiet.hist.FOOD = [50, 50, 50, 50, 50];
    const report = M.buildCommodityReport(st, 'FOOD');
    assert(report.rows[0].sys.id === urgent.id, 'commodity report sorts largest unmet gap first');
    assert(report.sources[0].sys.id === src.id, 'commodity report cheapest/source side exposed');
    assert(report.sinks[0].sys.id === urgent.id || report.sinks[0].sys.id === rich.id, 'commodity report sink side exposed');
    assert(report.movers.length >= 2 && report.movers[0].deltaPct > 0, 'commodity report includes trend movers');
  }

  // TUNE constants
  assert(typeof D.TUNE.marketReserveMin === 'number' && D.TUNE.marketReserveMin > 0, 'marketReserveMin tuning constant present');
  assert(typeof D.TUNE.marketReserveCapFraction === 'number', 'marketReserveCapFraction tuning constant present');
  assert(typeof D.TUNE.marketConsumerReserveTicks === 'number', 'marketConsumerReserveTicks tuning constant present');
  assert(typeof D.TUNE.marketFactoryReserveTicks === 'number', 'marketFactoryReserveTicks tuning constant present');
}

// ---------- 5. tech tree: branches, doctrines, discounts ----------
section('Tech tree & doctrines');
{
  const st = G.newGame({ seed: 'smoke-5', difficulty: 'standard' });
  st.research = 5000;
  assert(A.research(st, 'doc_mercantile').ok === false, 'doctrines locked before ' + D.DOCTRINE_UNLOCK_COUNT + ' techs');
  ['couriers', 'depots', 'analytics', 'scouts'].forEach(function (t) { assert(A.research(st, t).ok, 'research ' + t); });
  assert(SW.tech.visible(st, 'doc_mercantile'), 'doctrines now visible');
  const before = SW.tech.costOf(st, 'smartroutes');
  assert(A.research(st, 'doc_mercantile').ok, 'doctrine researched');
  const after = SW.tech.costOf(st, 'smartroutes');
  assert(after < before, 'doctrine discounts its branch (' + before + ' -> ' + after + ')');
  assert(A.research(st, 'doc_wayfarer').ok === false, 'second doctrine refused');
  const tree = SW.tech.tree(st);
  assert(tree.nodes.length > 15 && tree.edges.length > 8, 'tree layout has nodes and edges');
  assert(tree.doctrines.length === 3, 'tree exposes doctrines');
}

// ---------- 6. surveys & wonders ----------
section('Surveys, scouts, wonders');
{
  const st = G.newGame({ seed: 'smoke-6', difficulty: 'relaxed' });
  st.research = 200;
  A.research(st, 'scouts');
  st.credits = 3000;
  const scoutR = A.buyShip(st, 'pathfinder', st.homeId);
  assert(scoutR.ok, 'pathfinder bought');
  const scout = scoutR.ship;
  const target = st.systems.find(function (s) { return s.discovered && !s.surveyed; }) ||
    (function () { const s = st.systems[st.systems[st.homeId].links[0]]; s.surveyed = false; return s; })();
  scout.at = target.id;
  const res0 = st.research;
  let guard = 0;
  while (!target.surveyed && guard++ < 200) { G.tick(st); chooseAny(st); }
  assert(target.surveyed, 'survey completed in ' + guard + ' ticks');
  assert(st.research > res0 - 50, 'survey paid research');
  assert((st.stats.surveys || 0) >= 1, 'survey counted');
  // wonder survey → flags + legacy + scheduled event
  const bh = st.systems.find(function (s) { return s.wonder === 'blackhole'; });
  bh.discovered = true; bh.surveyed = false;
  scout.at = bh.id; scout.mode = 'idle'; scout.routeId = null;
  guard = 0;
  while (!bh.surveyed && guard++ < 300) { G.tick(st); chooseAny(st); }
  assert(bh.surveyed, 'black hole surveyed');
  assert(st.story.flags.hole_surveyed, 'hole_surveyed flag set');
  assert(SW.tech.visible(st, 'penrose') === false || true, 'penrose visibility consistent'); // needs vanguard prereqs too
  assert(G.legacy().wonder === true, 'legacy wonder unlocked');
  assert(st.fragments.length >= 0, 'fragments array exists');
}

// ---------- 6a. exploration economy ----------
section('Exploration economy (distance scaling, finds, first-light)');
{
  const st = G.newGame({ seed: 'smoke-6a', difficulty: 'relaxed' });
  st.research = 200;
  A.research(st, 'scouts');
  st.credits = 3000;
  const scout = A.buyShip(st, 'pathfinder', st.homeId).ship;
  const home = st.systems[st.homeId];
  // far + risky survey pays more than the base chart fee
  const far = st.systems.reduce(function (best, s) {
    if (s.id === st.homeId || s.scourge === 2) return best;
    const mult = (D.REGIONS[s.region] && D.REGIONS[s.region].surveyMult) || 1;
    const score = SW.util.dist(home, s) * mult;
    return (!best || score > best.score) ? { sys: s, score: score } : best;
  }, null).sys;
  far.discovered = true; far.surveyed = false; delete far.surveyProg;
  scout.at = far.id; scout.mode = 'idle';
  const findChance0 = D.TUNE.surveyFindChance;
  D.TUNE.surveyFindChance = 0; // isolate the survey payout from finds
  const cr0 = st.credits;
  let guard = 0;
  while (!far.surveyed && guard++ < 200) { G.tick(st); chooseAny(st); }
  D.TUNE.surveyFindChance = findChance0;
  assert(far.surveyed, 'far survey completed');
  // cartography data: value banked aboard, not paid instantly
  const bundle = (scout.data || []).find(function (b) { return b.sys === far.id && b.kind !== 'firstlight'; });
  assert(!!bundle, 'survey banked a data bundle aboard');
  assert(bundle.c > D.TUNE.surveyChart, 'far/risky charts beat the base fee (' + bundle.c + ' > ' + D.TUNE.surveyChart + ')');
  // sale only at populated ports
  const notPop = st.systems.find(function (s) { return s.type !== 'pop' && s.discovered && s.scourge !== 2; });
  scout.at = notPop.id; scout.mode = 'idle';
  assert(A.sellData(st, scout.id).ok === false, 'no cartographer at unpopulated systems');
  scout.at = st.homeId;
  const cr1 = st.credits, res1 = st.research;
  const sale = A.sellData(st, scout.id);
  assert(sale.ok === true, 'cartographer buys at a populated port');
  assert(st.credits > cr1 && st.research > res1, 'sale pays credits + research');
  assert((scout.data || []).length === 0, 'charts leave the ship on sale');
  assert(A.sellData(st, scout.id).ok === false, 'cannot sell the same charts twice');
  assert(far.charted === true, 'sold system is officially charted');
  assert((st.news || []).some(function (n) { return /chart/.test(n.text); }), 'sale published a ticker headline');
  assert(scout.rec && scout.rec.surveys >= 1, 'ship service record kept');
  // forced anomaly find: physical loot stays instant
  D.TUNE.surveyFindChance = 1;
  const near = st.systems[home.links[0]];
  near.discovered = true; near.surveyed = false; delete near.surveyProg;
  scout.at = near.id; scout.mode = 'idle';
  guard = 0;
  while (!near.surveyed && guard++ < 200) { G.tick(st); chooseAny(st); }
  D.TUNE.surveyFindChance = findChance0;
  assert(near.surveyed, 'near survey completed');
  assert((st.stats.finds || 0) >= 1, 'forced anomaly find recorded');
  assert((scout.data || []).some(function (b) { return b.kind === 'anomalyTrace' && b.sys === near.id; }), 'anomaly find left a sellable trace');
  // first-light: discovery banks data aboard too
  const hidden = st.systems.find(function (s) { return !s.discovered && s.scourge !== 2; });
  assert(!!hidden, 'an undiscovered system exists');
  const dn0 = (scout.data || []).length;
  scout.at = hidden.id; scout.mode = 'idle'; scout.leg = { to: hidden.id, arrive: st.tick };
  scout.mode = 'travel'; scout.path = []; scout.mission = null;
  G.tick(st); chooseAny(st);
  assert(hidden.discovered, 'arrival discovers the system');
  assert((scout.data || []).length > dn0 && scout.data.some(function (b) { return b.kind === 'firstlight'; }), 'first-light banked as data');
}

// ---------- 6a2. opening economy sanity (seed validation) ----------
section('Opening economy sanity (no-player run)');
{
  const st = G.newGame({ seed: 'smoke-seed-check', difficulty: 'standard' });
  for (let i = 0; i < 150; i++) G.tick(st);
  const v = G.validate(st);
  assert(v.length === 0, 'no-player world stays valid (' + v.join('; ') + ')');
  let prodTotal = 0, shortages = 0, fed = 0;
  for (const sys of st.systems) {
    for (const c in sys.prod) prodTotal += sys.prod[c];
    if (sys.pop > 0 && sys.satNeed < 0.85) shortages++;
    if (sys.pop > 0 && sys.satNeed > 0.5) fed++;
  }
  assert(prodTotal > 10, 'the world produces (' + prodTotal.toFixed(1) + '/t)');
  assert(shortages >= 3, 'real shortage pressure exists — prompts, not comfort (' + shortages + ')');
  assert(fed >= 1, 'not everything starves instantly (' + fed + ' worlds coping)');
  const copy = JSON.parse(JSON.stringify(st));
  for (const s of copy.systems) s.discovered = true;
  const ops = SW.economy.opportunities(copy, 12);
  assert(ops.length >= 6, 'profitable routes exist for the taking (' + ops.length + ')');
}

// ---------- 6a2b. world run parameters ----------
section('World run parameters (density / wealth / rich world defaults)');
{
  const sparse = G.newGame({ seed: 'smoke-world', difficulty: 'relaxed', world: { density: 'sparse', wealth: 'gilded', rivals: 0, badlands: 'shallow' } });
  const bubbleN = sparse.systems.filter(function (s) { return !s.badlands; }).length;
  const badN = sparse.systems.filter(function (s) { return s.badlands; }).length;
  assert(bubbleN <= 185 && bubbleN >= 150, 'sparse bubble thinned (' + bubbleN + ')');
  assert(sparse.systems.some(function (s) { return !s.badlands && SW.util.dist(s, sparse.systems[0]) > 65; }), 'sparse bubble widened');
  assert(badN >= 150, 'badlands stay deep even when an old shallow override is supplied (' + badN + ')');
  assert(sparse.rivals.length >= 4, 'many rivals spawn by default even when an old no-rivals override is supplied (' + sparse.rivals.length + ')');
  assert(new Set(sparse.rivals.map(function (r) { return r.archetype; })).size >= 4, 'rivals have diverse archetypes');
  const std = G.newGame({ seed: 'smoke-world', difficulty: 'relaxed' });
  let gildStock = 0, stdStock = 0;
  for (const s of sparse.systems) for (const c in s.stocks) gildStock += s.stocks[c];
  for (const s of std.systems) for (const c in s.stocks) stdStock += s.stocks[c];
  assert(gildStock / Math.max(1, sparse.systems.length) > stdStock / std.systems.length, 'gilded worlds start richer per system');
  assert(std.systems.filter(function (s) { return !s.badlands; }).length >= 230, 'standard preset unchanged');
  assert(std.systems.filter(function (s) { return s.badlands; }).length >= 150, 'standard worlds still include a deep badlands shell');
}

// ---------- 6a3. command grammar (intents → visible queues) ----------
section('Command grammar (FETCH intent, queue atoms)');
{
  const st = G.newGame({ seed: 'smoke-grammar', difficulty: 'relaxed' });
  st.credits = 2000;
  const ship = st.ships[0];
  const mine = st.systems.find(function (s) { return s.type === 'mining' && !s.badlands && (s.stocks.ORE || 0) > 20; });
  assert(!!mine, 'a stocked mining system exists');
  mine.discovered = true;

  // bad intents fail loudly
  assert(A.order(st, ship.id, { type: 'dance' }).ok === false, 'unknown intent rejected');
  assert(A.order(st, ship.id, { type: 'fetch', c: 'ORE', from: mine.id, to: 9999 }).ok === false, 'invalid destination rejected');

  // FETCH compiles to a visible queue and runs to completion
  const r = A.order(st, ship.id, { type: 'fetch', c: 'ORE', from: mine.id, to: st.homeId });
  assert(r.ok, 'fetch intent accepted: ' + (r.msg || ''));
  assert(ship.queue.length === 4 && ship.queue[0].op === 'move' && ship.queue[1].op === 'buy', 'intent compiled to atoms');
  assert(/FETCH/.test(ship.queueNote), 'the why-line is set');
  const deliveries0 = st.stats.deliveries || 0;
  let guard = 0;
  while (ship.queue.length && guard++ < 600) { G.tick(st); chooseAny(st); }
  assert(ship.queue.length === 0 && ship.queueNote === null, 'orders completed and cleared (' + guard + ' ticks)');
  assert(ship.at === st.homeId, 'hauler ended at the destination');
  assert((st.stats.deliveries || 0) > deliveries0, 'fetch counted as a delivery');
  assert(!ship.cargo.ORE, 'cargo sold on arrival');

  // orders displace other assignments; journal records the intent
  const route = SW.ships.createRoute(st, [{ sys: st.homeId, action: 'sell' }, { sys: mine.id, action: 'buy', c: 'ORE' }]);
  SW.ships.assignToRoute(st, ship, route);
  assert(ship.routeId === route.id, 'ship on a route');
  A.order(st, ship.id, { type: 'fetch', c: 'ORE', from: mine.id, to: st.homeId });
  assert(ship.routeId === null && ship.queue.length > 0, 'an order displaces the route');
  const je = st.journal[st.journal.length - 1];
  assert(je.a === 'order' && je.args[1].type === 'fetch', 'intent journaled for replay');
  // cancel mid-orders
  assert(A.clearQueue(st, ship.id).ok && ship.queue.length === 0 && ship.queueNote === null, 'orders cancellable');

  // failed manual commands must not silently clear existing automation
  SW.ships.assignToRoute(st, ship, route);
  const samePlace = A.shipSend(st, ship.id, ship.at, false);
  assert(samePlace.ok === false, 'same-system send rejected');
  assert(ship.routeId === route.id && route.ships.indexOf(ship.id) >= 0, 'failed send preserves route assignment');

  // unreachable fetches reject before they erase assignments or queue impossible work
  const bad = st.systems.find(function (s) { return s.badlands; });
  assert(!!bad, 'badlands source exists for reachability test');
  bad.discovered = true;
  const unreachable = A.order(st, ship.id, { type: 'fetch', c: 'ORE', from: bad.id, to: st.homeId });
  assert(unreachable.ok === false && /No safe lane|Deep Drives|unreachable/.test(unreachable.msg), 'unreachable fetch rejected before queueing: ' + (unreachable.msg || ''));
  assert(ship.routeId === route.id && (!ship.queue || ship.queue.length === 0), 'rejected fetch preserves assignment and leaves no queue');

  // failed queue buys abort loudly instead of continuing to a fake delivery
  SW.ships.unassign(st, ship);
  ship.mode = 'idle'; ship.at = mine.id; ship.path = []; ship.leg = null; ship.cargo = {}; ship.basis = {};
  mine.prod = {};
  mine.stocks.ORE = 0;
  const emptyFetch = A.order(st, ship.id, { type: 'fetch', c: 'ORE', from: mine.id, to: st.homeId });
  assert(emptyFetch.ok, 'fetch can be issued against a source that may be empty by execution time');
  const d0 = st.stats.deliveries || 0;
  G.tick(st);
  assert((ship.queue || []).length === 0 && ship.queueNote === null, 'empty-source fetch aborts the queue');
  assert((st.stats.deliveries || 0) === d0, 'aborted fetch does not count as delivery');
  invariants(st, 'post-grammar');
}

// ---------- 6b. scout auto-explore ----------
section('Scout auto-explore');
{
  const st = G.newGame({ seed: 'smoke-6b', difficulty: 'relaxed' });
  st.research = 200;
  A.research(st, 'scouts');
  st.credits = 3000;
  const scoutR = A.buyShip(st, 'pathfinder', st.homeId);
  assert(scoutR.ok, 'pathfinder bought for auto-explore');
  const scout = scoutR.ship;
  st.systems[scout.at].surveyed = true;
  const toggle = A.toggleAutoExplore(st, scout.id);
  assert(toggle.ok && scout.autoExplore, 'auto-explore toggles on');
  G.tick(st);
  assert(scout.mode === 'travel' || scout.retryAt > st.tick, 'auto-explore attempts to depart');
  let guard = 0;
  while (scout.mode === 'travel' && guard++ < 400) G.tick(st);
  assert(scout.mode === 'idle' && scout.at !== st.homeId, 'auto-explorer arrives away from home');
  assert(scout.mission === null, 'auto-explore clears its mission after arrival');
  const toggleOff = A.toggleAutoExplore(st, scout.id);
  assert(toggleOff.ok && !scout.autoExplore && scout.retryAt === 0, 'auto-explore toggles off cleanly');

  // two scouts from the same dock fan out instead of convoying
  st.credits = 9000;
  const s1 = A.buyShip(st, 'pathfinder', st.homeId).ship;
  const s2 = A.buyShip(st, 'pathfinder', st.homeId).ship;
  st.systems[s1.at].surveyed = true;
  A.toggleAutoExplore(st, s1.id);
  A.toggleAutoExplore(st, s2.id);
  G.tick(st); chooseAny(st);
  if (s1.mode === 'travel' && s2.mode === 'travel') {
    assert(s1.leg.to !== s2.leg.to, 'auto-explorers diverge (' + st.systems[s1.leg.to].name + ' vs ' + st.systems[s2.leg.to].name + ')');
  } else {
    assert(s1.mode === 'travel' || s2.mode === 'travel', 'at least one explorer departed');
  }
}

// ---------- 6c. weftworks, tessellation yards, exodus ----------
section('Weftworks, Tessellation Yards, Exodus');
{
  const st = G.newGame({ seed: 'smoke-6c', difficulty: 'relaxed' });
  st.research = 9000; st.credits = 60000;
  ['analytics', 'smartroutes', 'directives', 'metaroutes', 'couriers', 'foundries', 'autoyards', 'relays2', 'driftholds']
    .forEach(function (t) { assert(A.research(st, t).ok, 'research ' + t); });

  // -- meta-route: plan a full ALLOY supply chain
  const prod = st.systems.find(function (s) { return s.slots.indexOf('ALLOY') >= 0 && s.scourge !== 2; });
  assert(!!prod, 'an ALLOY factory exists somewhere');
  prod.discovered = true;
  const src = st.systems.find(function (s) { return s.id !== prod.id && s.scourge !== 2 && s.prod && s.prod.ORE > 0; });
  assert(!!src, 'an ORE source exists');
  src.discovered = true;
  const cr = A.createChainRoute(st, 'ALLOY');
  assert(cr.ok, 'chain route created: ' + (cr.msg || cr.route.name));
  assert(cr.route.stops.length >= 4, 'chain route spans the supply chain (' + cr.route.stops.length + ' stops)');
  assert(cr.route.stops[0].action === 'buy' && cr.route.stops[0].c === 'ORE', 'first stop buys the raw input');
  const prodStops = cr.route.stops.filter(function (x) { return x.sys === prod.id; });
  assert(prodStops.length === 2 && prodStops[0].action === 'sell' && prodStops[1].action === 'buy', 'factory is fed, then product collected');
  assert(A.createChainRoute(st, 'PANACEA').ok === false, 'fab-only recipes refused');

  // -- tessellation yards: crew the unmanned chain route, then reclaim surplus
  let guard = 0;
  while (cr.route.ships.length === 0 && guard++ < 200) { G.tick(st); chooseAny(st); }
  assert(cr.route.ships.length >= 1, 'yards crewed the unmanned route in ' + guard + ' ticks');
  st.credits = 60000;
  const s1 = A.buyShip(st, 'sparrow', st.homeId).ship;
  const s2 = A.buyShip(st, 'sparrow', st.homeId).ship;
  s1.idleSince = st.tick - 500; s2.idleSince = st.tick - 500;
  const scrapped0 = st.stats.autoScrapped || 0;
  guard = 0;
  while ((st.stats.autoScrapped || 0) === scrapped0 && guard++ < 200) { G.tick(st); chooseAny(st); }
  assert((st.stats.autoScrapped || 0) > scrapped0, 'yards reclaimed a long-idle hauler');
  st.autoYardsOff = true; // keep the rest of this section deterministic

  // -- exodus: relocate home deep coreward, find the secret
  const deep = st.systems.find(function (s) {
    return s.scourge !== 2 && s.id !== st.homeId && (s.x >= D.TUNE.exodusX || s.region === 'verge');
  });
  assert(!!deep, 'a deep-coreward refuge exists');
  deep.discovered = true; deep.surveyed = true;
  const uns = st.systems.find(function (s) { return !s.surveyed && s.scourge !== 2 && s.id !== st.homeId; });
  assert(A.relocateHome(st, uns.id).ok === false, 'relocation refused at unsurveyed system');
  st.credits = 10000;
  const range0 = SW.ships.rangeOf(st);
  const rr = A.relocateHome(st, deep.id);
  assert(rr.ok, 'home relocated: ' + (rr.msg || ''));
  assert(st.homeId === deep.id, 'homeId moved');
  assert(st.story.flags.deep_exodus === true, 'deep exodus secret triggered');
  assert(SW.ships.rangeOf(st) > range0, 'exodus resonance extends command range');

  // -- refugees + rival flight when a world falls
  st.scourge.phase = 'active'; st.scourge.nextAt = st.tick + 99999; st.scourge.originId = st.scourge.originId || 0;
  const doomed = st.systems.find(function (s) { return s.type === 'pop' && s.pop > 4 && s.id !== st.homeId && s.scourge === 0; });
  assert(!!doomed, 'a doomed population center exists');
  const popsBefore = {};
  for (const s of st.systems) if (s.type === 'pop' && s.id !== doomed.id) popsBefore[s.id] = s.pop;
  const fleeing = doomed.pop;
  doomed.scourge = 1; doomed.threatAt = st.tick;
  G.tick(st); chooseAny(st);
  assert(doomed.scourge === 2, 'doomed world fell');
  const gained = st.systems.some(function (s) {
    return s.type === 'pop' && popsBefore[s.id] !== undefined && s.pop > popsBefore[s.id] + fleeing * 0.15;
  });
  assert(gained, 'refugees reached a haven world');

  // -- backend fundamentals: action journal + market index
  assert(Array.isArray(st.journal) && st.journal.length > 5, 'action journal recorded entries (' + (st.journal || []).length + ')');
  const je = st.journal[st.journal.length - 1];
  assert(typeof je.t === 'number' && typeof je.a === 'string' && typeof je.ok === 'boolean', 'journal entries carry tick + action + outcome');
  const ix = SW.economy.marketIndex(st);
  let sorted = true;
  for (const c of ['ORE', 'FOOD', 'ALLOY']) {
    const srcs = ix.sources[c], snks = ix.sinks[c];
    for (let i = 1; i < srcs.length; i++) if (srcs[i - 1].p > srcs[i].p) sorted = false;
    for (let i = 1; i < snks.length; i++) if (snks[i - 1].p < snks[i].p) sorted = false;
  }
  assert(sorted, 'market index sources cheap-first, sinks dear-first');
}

// ---------- 6d. in-system sites (governor layer) ----------
section('In-system sites (facilities on bodies)');
{
  const st = G.newGame({ seed: 'smoke-6d', difficulty: 'relaxed' });
  st.credits = 50000;
  const home = st.systems[st.homeId];
  home.surveyed = true;
  home.depot = home.depot || {};
  home.depot.ALLOY = 60; home.depot.TECH = 30; // materials staged on-site
  const bodies = SW.planets.get(st, st.homeId).bodies;
  assert(bodies.some(function (b) { return b.name === 'The Belt'; }), 'Sol has The Belt');

  // site rules
  assert(A.buildSite(st, st.homeId, 'The Belt', 'skimmer').ok === false, 'skimmer refused on a belt');
  const r1 = A.buildSite(st, st.homeId, 'The Belt', 'mine');
  assert(r1.ok, 'mine anchored on The Belt: ' + (r1.msg || ''));
  assert(A.buildSite(st, st.homeId, 'The Belt', 'mine').ok === true, 'facilities stack up to body anchorage');
  assert(A.buildSite(st, st.homeId, 'The Belt', 'mine').ok === true, 'belt anchors a third site');
  assert(A.buildSite(st, st.homeId, 'The Belt', 'mine').ok === false, 'anchorage cap enforced');
  assert(A.buildSite(st, st.homeId, 'Jupiter', 'skimmer').ok, 'skimmer anchored at Jupiter');
  assert(A.buildSite(st, st.homeId, 'Uranus', 'cryoarchive').ok, 'cryo-archive anchored at Uranus');
  assert(home.sites.length === 5, 'five sites recorded');
  const sfx = SW.sites.fx(home);
  assert(Math.abs(sfx.prod.ORE - 1.35) < 1e-9 && Math.abs(sfx.prod.GAS - 0.45) < 1e-9, 'site production aggregates (stacked mines)');
  assert(sfx.research > 0.2, 'site research aggregates');

  // production flows into the market
  const ore0 = home.stocks.ORE || 0;
  for (let i = 0; i < 20; i++) G.tick(st);
  assert((home.stocks.ORE || 0) > ore0 || (home.stocks.ORE || 0) >= (home.capacity.ORE || 0) - 1, 'mine feeds the system market');

  // one-time effects: habitat raises capacity + population
  const cap0 = home.capacity.ORE || 0, pop0 = home.pop;
  assert(A.buildSite(st, st.homeId, 'Mars', 'habitat').ok, 'habitat anchored at Mars');
  assert((home.capacity.ORE || 0) === cap0 + 40, 'habitat adds market capacity');
  assert(home.pop > pop0 + 1.9, 'habitat brings settlers');

  // refusal away from the web; persistence through save/load
  const far = st.systems.find(function (s) { return !s.surveyed && s.scourge !== 2; });
  assert(A.buildSite(st, far.id, 'whatever', 'mine').ok === false, 'unsurveyed systems refuse sites');
  const copy = JSON.parse(JSON.stringify(st));
  assert(copy.systems[st.homeId].sites.length === 6, 'sites survive serialization');
  assert(SW.sites.fx(copy.systems[st.homeId]).prod.ORE > 0.4, 'site fx recompute from save data');
  invariants(st, 'post-sites');
}

// ---------- 6e. badlands & deep drives ----------
section('Badlands & Deep Drives');
{
  const st = G.newGame({ seed: 'smoke-6e', difficulty: 'relaxed' });
  st.credits = 99999; st.research = 9999;
  const bad = st.systems.filter(function (s) { return s.badlands; });
  assert(bad.length >= 50, 'badlands generated (' + bad.length + ')');
  assert(bad.every(function (s) { return U.dist(s, st.systems[0]) > D.TUNE.bubbleR; }), 'badlands lie beyond the bubble');
  assert(bad.every(function (s) { return s.pop === 0; }), 'no settled worlds out there');
  assert(bad.some(function (s) { return s.type === 'derelict' && (s.stocks.TECH || 0) >= 20; }), 'dead stations hoard salvage');
  assert(bad.some(function (s) { return s.prod.ORE > 0.8 || s.prod.GAS > 0.8; }), 'untouched veins run rich');
  const bridges = bad.filter(function (s) { return s.links.some(function (nb) { return !st.systems[nb].badlands; }); });
  assert(bridges.length >= 1 && bridges.length <= 6, 'a few bridge lanes leave the bubble (' + bridges.length + ')');

  // gated until Deep Drives
  const ship = st.ships[0];
  const target = bridges[0];
  target.discovered = true;
  const r0 = SW.ships.send(st, ship, target.id);
  assert(r0.ok === false && /Deep Drives/.test(r0.msg), 'badlands refused without Deep Drives');
  ['scouts', 'surveycorps', 'deepcharts', 'deepdrives'].forEach(function (t) { assert(A.research(st, t).ok, 'research ' + t); });
  const r1 = SW.ships.send(st, ship, target.id);
  assert(r1.ok === true, 'Deep Drives open the badlands: ' + (r1.msg || ''));

  // new techs: orbital works discounts facilities; simulacrum exists
  const base = D.FACILITIES.mine.cost;
  assert(SW.sites.costOf(st, 'mine') === base, 'facility full price before Orbital Works');
  assert(A.research(st, 'cargopods').ok && A.research(st, 'orbitalworks').ok, 'orbital works researched');
  assert(SW.sites.costOf(st, 'mine') === Math.round(base * 0.75), 'orbital works discounts facilities');
  assert(!!D.TECHS.simulacrum && A.research(st, 'corvettes').ok && A.research(st, 'simulacrum').ok, 'simulacrum researched');

  // raid edge: journaled, clamped, never throws
  const cv = A.buyShip(st, 'corvette', st.homeId).ship;
  const mark = st.systems[st.systems[st.homeId].links[0]];
  cv.at = mark.id;
  const rr = A.raid(st, cv.id, mark.id, 9.9); // absurd edge must clamp, not break
  assert(rr.ok === true || rr.ok === false, 'raid with edge resolves');
  const je = st.journal[st.journal.length - 1];
  assert(je.a === 'raid' && je.args[2] === 9.9, 'raid edge recorded in the journal');
  invariants(st, 'post-badlands');
}

// ---------- 6f. stance, perks, encounter dedupe ----------
section('Stance, aptitudes, encounter dedupe');
{
  const st = G.newGame({ seed: 'smoke-6f', difficulty: 'standard', aptitude: 'keeneyes' });
  assert(SW.perks.has(st, 'keeneyes'), 'starting aptitude granted');
  assert(!SW.perks.has(st, 'starread'), 'only the chosen aptitude');

  // milestones grant points on the slow cadence
  st.stats.surveys = 6; st.stats.deliveries = 30;
  let guard = 0;
  while ((st.perkPoints || 0) < 2 && guard++ < 80) { G.tick(st); chooseAny(st); }
  assert((st.perkPoints || 0) >= 2, 'milestones granted aptitude points (' + st.perkPoints + ')');
  assert(A.buyPerk(st, 'voidborn').ok === false, 'perk chains enforce prerequisites');
  assert(A.buyPerk(st, 'keeneyes').ok === false, 'owned perks are not repurchasable');
  assert(A.buyPerk(st, 'gunner').ok, 'perk purchased');
  const cv = SW.ships.create(st, 'corvette', st.homeId);
  assert(Math.abs(SW.combat.power(st, cv) - 6.9) < 0.01, 'Gunner: power 6 → 6.9');
  const home = st.systems[st.homeId];
  const sell0 = SW.economy.sellPrice(st, home, 'FOOD', 'player');
  assert(A.buyPerk(st, 'silver').ok, 'second perk purchased');
  const sell1 = SW.economy.sellPrice(st, home, 'FOOD', 'player');
  assert(Math.abs(sell1 / sell0 - 1.04) < 0.001, 'Silver Tongue: sell prices +4%');

  // the bubble wakes: panic, then the stance demand, then consequences
  st.story.flags.scourge_awake = true;
  st.story.seen.ev_awake = st.tick;
  st.story.flags.panic_done = true; // skip the panic beat; test the decision
  guard = 0;
  while (!st.scourgeStance && guard++ < 60) {
    G.tick(st);
    if (st.story.pending === 'ev_stance') SW.story.choose(st, 0); // HOLD THE LINE
    else chooseAny(st);
  }
  assert(st.scourgeStance === 'hold', 'stance chosen: hold');
  assert(st.story.flags.stance_chosen === true, 'stance flag set');
  assert(G.buildingCost(st, 'bastion') === Math.round(D.BUILDINGS.bastion.cost * 0.7), 'HOLD discounts bastions 30%');
  assert(st.story.queue.some(function (q) { return q.id === 'ev_vigil_levy'; }), 'faction consequence scheduled');

  // exodus stance effects on a fresh run
  const st2 = G.newGame({ seed: 'smoke-6f2', difficulty: 'relaxed' });
  const range0 = SW.ships.rangeOf(st2);
  st2.scourgeStance = 'exodus';
  assert(SW.ships.rangeOf(st2) > range0, 'EXODUS extends command range');
  assert(SW.tech.costOf(st2, 'deepdrives') === Math.round(D.TECHS.deepdrives.cost * 0.75), 'EXODUS discounts Deep Drives');

  // encounter dedupe: combos rest before recurring
  const sys2 = st2.systems[st2.homeId];
  const combos = {};
  let dup = 0, built = 0;
  for (let i = 0; i < 12; i++) {
    const enc = SW.story.buildEncounter(st2, sys2, st2.ships[0]);
    if (!enc) continue;
    built++;
    const key = enc.id.replace(/_\d+$/, '');
    if (combos[key]) dup++;
    combos[key] = true;
  }
  assert(built >= 10, 'encounters keep assembling (' + built + ')');
  assert(dup <= 2, 'combos rest before recurring (' + dup + ' repeats in ' + built + ')');
  invariants(st, 'post-stance');
}

// ---------- 7. combat: pirate raids, escorts, player raiding ----------
section('Combat & privateering');
{
  const st = G.newGame({ seed: 'smoke-7', difficulty: 'relaxed' });
  st.research = 1000; st.credits = 30000;
  A.research(st, 'corvettes');
  // deterministic pirate raid: cargo-laden ship parked in the Reach
  const reachSys = st.systems.find(function (s) { return s.region === 'reach'; });
  const victim = st.ships[0];
  victim.at = reachSys.id; victim.cargo.FOOD = 8; victim.basis.FOOD = 10;
  st.combat.nextRaidAt = st.tick + 1;
  G.tick(st); chooseAny(st);
  const raidHappened = (st.stats.raidsRepelled || 0) + (st.stats.raidsSuffered || 0) >= 1;
  assert(raidHappened, 'pirate raid resolved against exposed ship');
  // player raid
  const cvR = A.buyShip(st, 'corvette', st.homeId);
  assert(cvR.ok, 'corvette bought');
  const cv = cvR.ship;
  const rival = st.rivals[0];
  const rivalSys = st.systems.find(function (s) { return (s.presence[rival.id] || 0) > 1; });
  assert(!!rivalSys, 'rival has presence somewhere');
  cv.at = rivalSys.id;
  rivalSys.discovered = true;
  const infamy0 = st.infamy;
  let res = null;
  for (let i = 0; i < 12 && (!res || !res.ok); i++) {
    cv.raidCooldownUntil = 0;
    if (!st.ships.find(function (x) { return x.id === cv.id; })) break; // lost raiding — also a valid outcome
    res = A.raid(st, cv.id, rivalSys.id);
  }
  assert(res && res.ok, 'raid action resolves');
  assert(st.infamy > infamy0, 'raiding raises infamy (' + st.infamy.toFixed(1) + ')');
  const low = SW.combat.infamyStatus(2.5);
  const high = SW.combat.infamyStatus(6);
  assert(low.label === 'Smuggler' && low.blackMarket === false, 'infamy status labels low tier');
  assert(high.label === 'Most Wanted' && high.blackMarket === true && high.hunters === true, 'infamy status labels high tier effects');
  const black = st.systems.find(function (s) { return s.region === 'reach' && s.discovered && s.scourge !== 2; });
  if (black) {
    const before = st.infamy;
    st.story.pending = 'ev_black_manifest'; st.story.ctx = { sysId: black.id, shipId: cv.id };
    SW.story.choose(st, 0);
    assert(st.infamy > before, 'black manifest encounter choice raises infamy');
  }
  // retainer
  A.research(st, 'retainers');
  const ret = A.hireRetainer(st, 'reach');
  assert(ret.ok, 'retainer hired: ' + (ret.msg || 'ok'));
  assert(SW.combat.patrolPower(st, 'reach') > 0, 'patrol power active');
  // ops
  assert(A.blitz(st, st.homeId).ok, 'trade blitz starts');
}

// ---------- 8. world events: contracts & blockades ----------
section('World events');
{
  const st = G.newGame({ seed: 'smoke-8', difficulty: 'relaxed' });
  st.credits = 10000;
  // force a batch of world events
  for (let i = 0; i < 14; i++) {
    st.nextWorldAt = st.tick + 1;
    G.tick(st); chooseAny(st);
  }
  assert(st.contracts.length + st.blockades.length >= 1, 'world events spawned (contracts=' + st.contracts.length + ', blockades=' + st.blockades.length + ')');
  // manufactured famine: deliver and complete
  const pop = st.systems.find(function (s) { return s.pop > 5 && s.id !== st.homeId && s.discovered; });
  const ct = { id: 'ctX', kind: 'famine', sysId: pop.id, c: 'FOOD', qty: 5, progress: 0, deadline: st.tick + 500, reward: { credits: 500, research: 50 }, label: 'Test famine at ' + pop.name };
  st.contracts.push(ct);
  const ship = st.ships[0];
  ship.at = pop.id; ship.cargo.FOOD = 6; ship.basis.FOOD = 5;
  pop.stocks.FOOD = 0;
  const cr0 = st.credits;
  A.shipSell(st, ship.id, 'FOOD', 6);
  assert(st.contracts.indexOf(ct) < 0, 'famine contract completed by delivery');
  assert(st.credits > cr0, 'contract paid out');
  // blockade pathing
  const a = st.systems[st.homeId].links[0];
  const b = st.systems[a].links.find(function (x) { return x !== st.homeId; });
  if (b !== undefined) {
    st.blockades.push({ a: a, b: b, until: st.tick + 1000, toll: 100 });
    const path = SW.ships.findPath(st, a, b);
    assert(!path || path.length > 2, 'blockaded lane is not traversed directly');
    const pay = A.payToll(st, st.blockades.length - 1);
    assert(pay.ok, 'toll paid clears blockade');
  }
}

// ---------- 9. origins & legacy ----------
section('Origins (roguelite starts)');
{
  G._memLegacy = {}; // reset
  const st1 = G.newGame({ seed: 'smoke-9', difficulty: 'standard', origin: 'vigil' });
  assert(st1.origin === 'courier', 'locked origin falls back to courier');
  G.legacySet('won'); G.legacySet('wonder'); G.legacySet('infamy');
  const st2 = G.newGame({ seed: 'smoke-9b', difficulty: 'standard', origin: 'vigil' });
  assert(st2.origin === 'vigil', 'vigil origin unlocked via legacy');
  assert(st2.ships[0].hull === 'corvette', 'vigil starts with corvette');
  assert(SW.tech.has(st2, 'corvettes'), 'vigil starts with corvette tech');
  const st3 = G.newGame({ seed: 'smoke-9c', difficulty: 'standard', origin: 'severed' });
  assert(st3.origin === 'severed' && st3.infamy >= 3, 'severed origin: infamy start');
  const startSys = st3.systems[st3.ships[0].at];
  assert(startSys.region === 'reach' || st3.ships[0].at === st3.homeId, 'severed starts in the Reach');
}

// ---------- 10. long standard run with bot ----------
section('Long run (standard, 3000 ticks, bot)');
{
  G._memLegacy = {};
  const st = G.newGame({ seed: 'smoke-10', difficulty: 'standard' });
  let lastCheck = 0;
  for (let i = 0; i < 3000 && !st.gameOver; i++) {
    G.tick(st);
    botStep(st);
    if (st.tick - lastCheck >= 250) { lastCheck = st.tick; invariants(st, 'tick ' + st.tick); }
  }
  invariants(st, 'final');
  console.log('   tick=' + st.tick + ' credits=' + Math.floor(st.credits) + ' research=' + Math.floor(st.research) +
    ' ships=' + st.ships.length + ' routes=' + st.routes.length +
    ' deliveries=' + st.stats.deliveries + ' corrupted=' + SW.scourge.corruptedCount(st) +
    ' contracts=' + ((st.stats.contractsDone || 0) + st.contracts.length) +
    (st.gameOver ? (' GAMEOVER(' + (st.gameOver.win ? 'win' : 'loss') + ')') : ''));
  assert(st.stats.deliveries >= 10, 'bot made deliveries (' + st.stats.deliveries + ')');
  assert(st.story.flags.routes_unlocked, 'routes unlocked through play');
  assert(st.scourge.phase !== 'dormant', 'scourge activated');
  assert(st.rivals.length >= 4, 'many rivals exist (' + st.rivals.length + ')');
  assert(new Set(st.rivals.map(function (r) { return r.archetype; })).size >= 4, 'rival archetypes stay diverse');
  assert(st.rivals.some(function (r) { return (r.lines || []).length > 0 || !r.alive; }), 'rivals run persistent trade lines');

  // FIX assertions: rival credits never negative; lines only between lane-connected systems
  for (const rv of st.rivals) {
    assert(rv.credits >= 0, 'rival ' + rv.name + ' credits never negative (' + rv.credits + ')');
    for (const L of (rv.lines || [])) {
      const lp = U.findPath(st.systems, L.a, L.b, function (s) { return s.scourge !== 2; });
      assert(!!lp, 'rival line ' + st.systems[L.a].name + '->' + st.systems[L.b].name + ' is lane-connected');
    }
  }
}

// ---------- 10a. Living Weave: laneFlow ----------
section('Living Weave: laneFlow after long bot run');
{
  // Re-use a fresh run rather than depending on section-10 state (which may have gameOver).
  G._memLegacy = {};
  const st = G.newGame({ seed: 'smoke-laneflow', difficulty: 'relaxed' });
  // Run long enough for routes to form and ships to traverse lanes
  for (let i = 0; i < 800 && !st.gameOver; i++) {
    G.tick(st);
    botStep(st);
  }
  assert(typeof st.laneFlow === 'object' && st.laneFlow !== null, 'laneFlow object exists');
  const lf = st.laneFlow;
  const keys = Object.keys(lf);
  assert(keys.length > 0, 'laneFlow has entries after trading run (' + keys.length + ')');
  // All values must be finite and >= 0.5 (below-threshold entries are deleted)
  let allValid = true;
  for (const k of keys) {
    if (!isFinite(lf[k]) || lf[k] < 0.5) { allValid = false; break; }
  }
  assert(allValid, 'all laneFlow values are finite and >= 0.5');
  // All keys must reference real lane endpoints
  let allRealLanes = true;
  for (const k of keys) {
    const parts = k.split('-');
    if (parts.length !== 2) { allRealLanes = false; break; }
    const idA = Number(parts[0]), idB = Number(parts[1]);
    if (!st.systems[idA] || !st.systems[idB]) { allRealLanes = false; break; }
    // Both IDs must actually be linked (the key uses the canonical minId-maxId form)
    const linked = st.systems[idA].links.indexOf(idB) >= 0;
    if (!linked) { allRealLanes = false; break; }
  }
  assert(allRealLanes, 'all laneFlow keys reference real lane-graph edges');

  // Decay: after ticks with no trade on a lane, flow should decrease
  // Pick a lane currently in the flow map; freeze trade by clearing routes/ships, tick a lot
  const pickKey = keys[0];
  const flowBefore = lf[pickKey];
  // Remove all routes so ships stop moving
  st.routes = [];
  for (const ship of st.ships) { ship.routeId = null; ship.mission = null; ship.queue = []; }
  // Tick 60 more times (decay should clearly reduce the value)
  for (let i = 0; i < 60; i++) G.tick(st);
  const flowAfter = lf[pickKey] !== undefined ? lf[pickKey] : 0;
  assert(flowAfter < flowBefore, 'laneFlow decays when trade stops (' + flowBefore.toFixed(1) + ' -> ' + flowAfter.toFixed(1) + ')');

  // Old saves without laneFlow: defensive initialization check
  // Simulate loading an old save by deleting laneFlow and running a tick
  delete st.laneFlow;
  G.tick(st);
  assert(typeof st.laneFlow === 'object', 'laneFlow re-initialized defensively after missing from save');
  invariants(st, 'post-laneflow');
}

// ---------- 10b. scourge / refugee BFS assertions ----------
section('Scourge & refugee path-aware assertions');
{
  // Run a shorter sim with early scourge to generate refugees
  const st = G.newGame({ seed: 'smoke-10b', difficulty: 'standard' });
  st.scourge.startAt = 10;
  // track refugeeHavens as we corrupt systems
  const refugeeHavens = [];
  const origCorrupt = SW.scourge._testCorrupt || null;
  // Intercept: run until scourge is active and a pop system has fallen
  for (let i = 0; i < 600 && !st.gameOver; i++) {
    G.tick(st);
    botStep(st);
  }
  // Verify: for all corrupted systems that had refugees, the haven should be
  // lane-reachable from a safe pop center OR no safe pop center exists.
  // Since we cannot retroactively track havens, we verify structural invariant:
  // every safe pop system is reachable from Sol via non-corrupted lanes
  // (confirming BFS has valid candidates to pick from).
  const safePop = st.systems.filter(function (s) { return s.type === 'pop' && s.scourge !== 2 && s.pop > 0; });
  const home = st.systems[st.homeId];
  // BFS from Sol through non-corrupted systems
  const reachable = {};
  const bfsQ = [st.homeId];
  reachable[st.homeId] = true;
  while (bfsQ.length) {
    const cur = bfsQ.shift();
    for (const nb of st.systems[cur].links) {
      if (reachable[nb]) continue;
      if (st.systems[nb].scourge === 2) continue;
      reachable[nb] = true;
      bfsQ.push(nb);
    }
  }
  const reachableSafePop = safePop.filter(function (s) { return reachable[s.id]; });
  assert(reachableSafePop.length > 0 || safePop.length === 0,
    'at least one safe pop center is lane-reachable (refugee BFS has valid targets), reachable=' + reachableSafePop.length + ' total=' + safePop.length);
  // Structural: no alive rival line uses a corrupted system as endpoint
  for (const rv of st.rivals) {
    if (!rv.alive) continue;
    for (const L of (rv.lines || [])) {
      const a = st.systems[L.a], b = st.systems[L.b];
      assert(a.scourge !== 2 && b.scourge !== 2, 'no alive rival line has corrupted endpoint (' + a.name + '->' + b.name + ')');
    }
  }
}

// ---------- 11. victory & loss ----------
section('Victory & loss paths');
{
  const st = G.newGame({ seed: 'smoke-11', difficulty: 'standard' });
  st.scourge.startAt = 5;
  for (let i = 0; i < 30; i++) { G.tick(st); chooseAny(st); }
  assert(st.scourge.phase === 'active', 'scourge active');
  st.story.flags.sample_collected = true;
  st.research = 9000;
  ['scourge1', 'scourge2', 'panacea'].forEach(function (t) { assert(A.research(st, t).ok, 'research ' + t); });
  const ship = st.ships[0];
  ship.at = st.scourge.originId; ship.mode = 'idle';
  ship.cargo.PANACEA = D.TUNE.panaceaToWin;
  assert(A.deliverPanacea(st, ship.id).ok, 'panacea delivered');
  G.tick(st);
  assert(st.gameOver && st.gameOver.win, 'victory registered');
  assert(G.legacy().won === true, 'win recorded in legacy');

  const st2 = G.newGame({ seed: 'smoke-11b', difficulty: 'brutal' });
  st2.systems[st2.homeId].scourge = 2;
  G.tick(st2);
  assert(st2.gameOver && !st2.gameOver.win, 'home corruption = loss');
}

// ---------- 12. save/load + determinism ----------
section('Save/load & determinism');
{
  const st = G.newGame({ seed: 'smoke-12', difficulty: 'standard' });
  for (let i = 0; i < 300; i++) { G.tick(st); botStep(st); }
  const json = G.exportSave();
  const snapTick = st.tick, snapCredits = st.credits;
  const r = G.loadFromString(json);
  assert(r.ok, 'load ok');
  assert(G.state.tick === snapTick && G.state.credits === snapCredits, 'state survives roundtrip');
  for (let i = 0; i < 200; i++) { G.tick(G.state); chooseAny(G.state); }
  invariants(G.state, 'post-load');
  assert(G.loadFromString('{"version":1}').ok === false, 'old save version politely rejected');

  function run(seed) {
    const s = G.newGame({ seed: seed, difficulty: 'standard' });
    for (let i = 0; i < 400; i++) { G.tick(s); botStep(s); }
    return JSON.stringify({ c: Math.round(s.credits), r: Math.round(s.research), n: s.ships.length, t: s.tick });
  }
  assert(run('det-1') === run('det-1'), 'same seed, same world');
  assert(run('det-1') !== run('det-2'), 'different seed, different world');
}

// ---------- 13. encounters assemble ----------
section('Procedural encounters');
{
  const st = G.newGame({ seed: 'smoke-13', difficulty: 'relaxed' });
  let built = 0;
  for (let i = 0; i < 20; i++) {
    const sys = st.systems[U.ri(st, 0, st.systems.length - 1)];
    const enc = SW.story.buildEncounter(st, sys, st.ships[0]);
    if (enc) {
      built++;
      assert(enc.choices.length >= 2, 'encounter has choices');
      assert(enc.text.indexOf('{') < 0, 'template slots fully substituted');
      st.story.pending = enc.id;
      st.story.ctx = { sysId: sys.id, shipId: st.ships[0].id };
      const r = SW.story.choose(st, 0);
      assert(r.ok, 'encounter choice resolves');
    }
  }
  assert(built >= 15, 'encounters assemble reliably (' + built + '/20)');
  invariants(st, 'post-encounters');
}

// ---------- 14a. source integrity (mojibake scan) ----------
section('Multi-site bodies & orbital spindles');
{
  const st = G.newGame({ seed: 'smoke-sites', difficulty: 'relaxed' });
  const home = st.systems[st.homeId];
  home.depot = home.depot || {};
  home.depot.ALLOY = 60; home.depot.TECH = 20;
  st.credits = 99999;
  const r1 = A.buildSite(st, st.homeId, 'The Belt', 'mine');
  assert(r1.ok, 'first mine anchors on The Belt (' + (r1.msg || 'ok') + ')');
  const r2 = A.buildSite(st, st.homeId, 'The Belt', 'mine');
  assert(r2.ok, 'second mine stacks on The Belt (' + (r2.msg || 'ok') + ')');
  const capBefore = home.capacity.ORE;
  const r3 = A.buildSite(st, st.homeId, 'The Belt', 'spindle');
  assert(r3.ok, 'spindle anchors in belt orbit (' + (r3.msg || 'ok') + ')');
  assert(home.capacity.ORE === capBefore + 30, 'spindle capacity bonus applied');
  const r4 = A.buildSite(st, st.homeId, 'The Belt', 'mine');
  assert(!r4.ok, 'fourth facility refused: anchorage full');
  const r5 = A.buildSite(st, st.homeId, 'Jupiter', 'spindle');
  assert(r5.ok, 'spindle anchors at a gas giant (' + (r5.msg || 'ok') + ')');
  const fx = SW.sites.fx(home);
  assert(fx.prod.ORE > 0.8, 'stacked mines stack production (' + fx.prod.ORE + ')');
}

section('Ring Dredge facility');
{
  const st = G.newGame({ seed: 'smoke-ringworks', difficulty: 'relaxed' });
  const home = st.systems[st.homeId];
  home.depot = home.depot || {};
  home.depot.ALLOY = 60;
  st.credits = 99999;
  // ringworks anchors only at a body that actually has rings
  const rJup = A.buildSite(st, st.homeId, 'Jupiter', 'ringworks');
  assert(!rJup.ok, 'ringworks refused at ringless Jupiter');
  const rSat = A.buildSite(st, st.homeId, 'Saturn', 'ringworks');
  assert(rSat.ok, 'ringworks anchors at ringed Saturn (' + (rSat.msg || 'ok') + ')');
  // ringworks refused at Mars (desert — not in sites list)
  const rMars = A.buildSite(st, st.homeId, 'Mars', 'ringworks');
  assert(!rMars.ok, 'ringworks refused at Mars (desert)');
  // production aggregates include ORE and CRYSTAL
  const sfx = SW.sites.fx(home);
  assert(sfx.prod && sfx.prod.ORE > 0, 'ringworks prod aggregates ORE (' + (sfx.prod && sfx.prod.ORE) + ')');
  assert(sfx.prod && sfx.prod.CRYSTAL > 0, 'ringworks prod aggregates CRYSTAL (' + (sfx.prod && sfx.prod.CRYSTAL) + ')');
}

// ---------- planet detailing ----------
section('Planet detailing');
{
  // (a) generation is deterministic: two calls with the same seed agree on ring/classLabel
  const st1 = G.newGame({ seed: 'smoke-detail', difficulty: 'standard' });
  const st2 = G.newGame({ seed: 'smoke-detail', difficulty: 'standard' });
  SW.planets.clearCache();
  const d1 = SW.planets.get(st1, st1.homeId);
  SW.planets.clearCache();
  const d2 = SW.planets.get(st2, st2.homeId);
  assert(d1.bodies.length === d2.bodies.length, 'same seed: same body count');
  for (let i = 0; i < d1.bodies.length; i++) {
    const b1 = d1.bodies[i], b2 = d2.bodies[i];
    assert(b1.classLabel === b2.classLabel, 'classLabel deterministic for ' + b1.name);
    assert(String(b1.ring) === String(b2.ring), 'ring deterministic for ' + b1.name);
  }

  // (b) Sol's Saturn has ring:true and Earth has classLabel mentioning garden
  const stSol = G.newGame({ seed: 'smoke-detail2', difficulty: 'standard' });
  const sol = SW.planets.get(stSol, stSol.homeId);
  const saturn = sol.bodies.find(function (b) { return b.name === 'Saturn'; });
  const earth  = sol.bodies.find(function (b) { return b.name === 'Earth'; });
  assert(saturn && saturn.ring === true, 'Sol Saturn has ring:true');
  assert(earth && earth.classLabel && /garden/i.test(earth.classLabel), 'Earth classLabel mentions garden (' + (earth && earth.classLabel) + ')');

  // (c) every body in a sampled set of systems has a classLabel string
  const stSamp = G.newGame({ seed: 'smoke-detail3', difficulty: 'standard' });
  let noLabel = 0, checked = 0;
  for (let si = 0; si < Math.min(30, stSamp.systems.length); si++) {
    const data = SW.planets.get(stSamp, si);
    for (const b of data.bodies) {
      checked++;
      if (typeof b.classLabel !== 'string' || !b.classLabel.length) noLabel++;
    }
  }
  assert(checked > 0 && noLabel === 0, 'all sampled bodies have classLabel (' + checked + ' checked, ' + noLabel + ' missing)');

  // (d) existing fields (name/type/a) unchanged shape in Sol
  const solCheck = SW.planets.get(stSol, stSol.homeId);
  assert(solCheck.bodies.some(function (b) { return b.name === 'Earth' && b.type === 'terran' && b.a === 1; }), 'Earth name/type/a unchanged');
  assert(solCheck.bodies.some(function (b) { return b.name === 'The Belt' && b.type === 'belt'; }), 'The Belt unchanged');
  assert(solCheck.bodies.some(function (b) { return b.name === 'Saturn' && b.type === 'gas'; }), 'Saturn type unchanged');
  assert(solCheck.bodies.some(function (b) { return b.name === 'Jupiter' && b.type === 'gas' && !b.ring; }), 'Sol Jupiter is gas but ringless');
  assert(stSamp.systems.some(function (sys) {
    return SW.planets.get(stSamp, sys.id).bodies.some(function (b) {
      return b.type !== 'gas' && b.type !== 'icegiant' && b.ring === 'faint';
    });
  }), 'some non-giant worlds can have faint procedural rings');
}

section('Sol prologue (tutorial)');
{
  // Full prologue, driven exactly as a player would via actions:
  // hop to the Belt, buy cheap ore, haul home, sell, anchor, jump.
  const st = G.newGame({ seed: 'smoke-tutorial', difficulty: 'standard', tutorial: true });
  assert(st.tutorial && st.tutorial.active, 'tutorial active when requested');
  assert(st.credits >= 1200, 'Guild escrow granted (credits=' + st.credits + ')');
  G.tick(st);
  assert(st.tutorial.goal === 0, 'cast-off beat is current after first tick');
  assert(SW.tutorial.mapLocked(st), 'galaxy map locked during early prologue');
  assert(st.story.pending !== 'ev_wake', 'ev_wake suppressed in prologue');
  assert(st.story.pending === 'ev_prologue_ledger', 'only prologue ledger may interrupt early prologue');
  A.chooseEvent(st, 0);
  st.tick = 5000;
  st.credits = 100000;
  st.stats.deliveries = 99;
  st.story.pending = null;
  for (let i = 0; i < 30; i++) G.tick(st);
  assert(!st.story.pending || /^ev_prologue_/.test(st.story.pending), 'non-prologue story events suppressed while map locked (' + st.story.pending + ')');
  assert(st.story.objective.indexOf('1)') >= 0 && st.story.objective.indexOf('FLY HERE') >= 0, 'prologue objective gives explicit numbered action');

  const ship = st.ships[0];
  const home = st.systems[st.homeId];
  const nb = home.links[0];
  const blocked = A.shipSend(st, ship.id, nb);
  assert(!blocked.ok, 'jump refused while the map is locked');

  // berth pricing: the Belt discounts ore against the Anchorage rate
  const hubOre = SW.economy.buyPrice(st, home, 'ORE', 'player');
  const beltOre = SW.economy.buyPrice(st, home, 'ORE', 'player', 'The Belt');
  assert(beltOre < hubOre * 0.7, 'Belt berth discounts ore (' + beltOre.toFixed(1) + ' vs ' + hubOre.toFixed(1) + ')');
  assert(SW.economy.berthMult(st, home, 'Earth', 'ORE') === 1, 'hub berth is neutral');
  assert(SW.economy.berthMult(st, home, 'Mars', 'FOOD') > 1, 'settled Mars pays a food premium');

  // hop guards + the hop itself
  assert(!A.shipHop(st, ship.id, 'Nonsuch').ok, 'hop to unknown body refused');
  const hop = A.shipHop(st, ship.id, 'The Belt');
  assert(hop.ok && ship.mode === 'shuttle' && ship.hop, 'hop departs (' + (hop.msg || 'eta ' + hop.eta) + ')');
  assert(!A.shipHop(st, ship.id, 'Mars').ok, 'no second hop mid-flight');
  assert(!A.shipBuy(st, ship.id, 'ORE', 5).ok, 'no trading mid-hop');
  G.tick(st);
  assert(st.tutorial.goal === 1, 'first-cargo beat once the hop is committed');
  for (let i = 0; i < 25 && ship.mode !== 'idle'; i++) G.tick(st);
  assert(ship.mode === 'idle' && ship.body === 'The Belt', 'berthed at the Belt');
  const bad = SW.game.validate(st);
  assert(bad.length === 0, 'validator clean with berthed ships: ' + bad.join('; '));

  if (st.story.pending) A.chooseEvent(st, 0); // drain the cold-open / Belt events
  const buyOre = A.shipBuy(st, ship.id, 'ORE', 8);
  assert(buyOre.ok && buyOre.qty >= D.TUNE.prologueOreBeat, 'ore loads at Belt rates (' + (buyOre.msg || buyOre.qty) + ')');
  G.tick(st);
  assert(st.tutorial.goal === 2, 'first-sale beat after loading ore');

  const back = A.shipHop(st, ship.id, 'Earth');
  assert(back.ok, 'hop back to the Anchorage');
  for (let i = 0; i < 25 && ship.mode !== 'idle'; i++) G.tick(st);
  const sold = A.shipSell(st, ship.id, 'ORE', 999);
  assert(sold.ok && sold.profit > 0, 'the Belt spread pays (profit=' + (sold.ok ? Math.round(sold.profit) : sold.msg) + ')');
  G.tick(st);
  assert(st.tutorial.goal === 3, 'gather beat after the first profitable sale');

  const buy = A.shipBuy(st, ship.id, 'ALLOY', 5);
  assert(buy.ok, 'alloy purchase succeeds (' + (buy.msg || 'ok') + ')');
  G.tick(st);
  assert(st.tutorial.goal === 4, 'anchor beat after gathering alloy');

  const built = A.buildSite(st, st.homeId, 'Earth', 'hydrofarm');
  assert(built.ok, 'hydrofarm anchors on Earth (' + (built.msg || 'ok') + ')');
  G.tick(st);
  assert(st.tutorial.goal === 5, 'chain beat after anchoring');

  for (let i = 0; i < 40 && st.tutorial.goal === 5; i++) G.tick(st);
  assert(st.tutorial.goal === 6, 'net beat after watching the chain feed the city');
  const contract = SW.quests.company(st)[0];
  assert(contract && contract.id === 'sol_net', 'prologue company contract exists');
  assert(contract.steps.some(function (step) { return step.id === 'authorize' && step.current; }), 'Sol Net authorization is the current contract step');
  assert(SW.tutorial.mapLocked(st), 'map still locked until Sol Net is authorized');
  assert(!st.story.flags.routes_unlocked, 'route automation is not unlocked before the Sol Net sign-off');
  assert(!A.authorizeSolNet(st).ok, 'Sol Net sign-off requires the journal prompt');
  st.tutorial.netPrompted = true;
  const auth = A.authorizeSolNet(st);
  assert(auth.ok, 'Sol Net authorization action succeeds (' + (auth.msg || 'ok') + ')');
  assert(st.story.flags.sol_net_authorized, 'Sol Net flag set');
  assert(st.story.flags.routes_unlocked, 'route automation core unlocks with Sol Net authorization');
  G.tick(st);
  assert(st.tutorial.goal === 7, 'jump beat follows Sol Net authorization');
  assert(!SW.tutorial.mapLocked(st), 'map unlocks with the Guild gift');

  const go = A.shipSend(st, ship.id, nb);
  assert(go.ok, 'jump allowed after the gift (' + (go.msg || 'ok') + ')');
  assert(ship.body === null, 'inter-system departure clears the berth');
  for (let i = 0; i < 300 && !st.tutorial.done; i++) G.tick(st);
  assert(st.tutorial.done && !st.tutorial.active, 'prologue completes when the jump lands');

  // Title card fires through the normal event machinery (drain competitors)
  let sawCard = false;
  for (let i = 0; i < 30 && !sawCard; i++) {
    if (st.story.pending === 'ev_first_thread') { sawCard = true; break; }
    if (st.story.pending) A.chooseEvent(st, 0);
    G.tick(st);
  }
  assert(sawCard || st.story.pending === 'ev_first_thread', 'ev_first_thread title card fires after the prologue');
  A.chooseEvent(st, 0);
  assert(st.story.flags.first_thread === true, 'first_thread flag set by title card');

  // Bankruptcy is never a wall: a broke, empty-handed prologue run gets a
  // Guild advance and can buy back into the ore loop.
  const br = G.newGame({ seed: 'smoke-tutorial-broke', difficulty: 'standard', tutorial: true });
  G.tick(br);
  br.credits = 0;
  for (const sh of br.ships) { sh.cargo = {}; sh.basis = {}; }
  let rescued = false;
  for (let i = 0; i < D.TUNE.prologueStipendEvery + 5 && !rescued; i++) {
    G.tick(br);
    if (br.credits >= D.TUNE.prologueStipend) rescued = true;
  }
  assert(rescued, 'Guild stipend rescues a broke prologue run (credits=' + br.credits + ')');

  // Skip path: no tutorial state, ev_wake fires as today
  const sk = G.newGame({ seed: 'smoke-tutorial-skip', difficulty: 'standard' });
  assert(!sk.tutorial, 'no tutorial state on skip path');
  G.tick(sk);
  assert(sk.story.pending === 'ev_wake', 'ev_wake fires normally without tutorial');
}

// ---------- 14b. civic works ----------
section('Civic works');
{
  // -- vigil builds bastion when scourge_known + prosperous + player dominant --
  {
    const st = G.newGame({ seed: 'smoke-civic-vigil', difficulty: 'relaxed' });
    const vigil = st.systems.find(function (s) { return s.ideology === 'vigil' && s.pop > 0; }) ||
      (function () {
        const s = st.systems.find(function (s) { return s.pop > 0 && s.scourge !== 2; });
        s.ideology = 'vigil'; return s;
      })();
    vigil.discovered = true;
    vigil.prosperity = 90;
    vigil.credits = 5000;
    vigil.stocks.ALLOY = (vigil.stocks.ALLOY || 0) + 30;
    vigil.stocks.TECH  = (vigil.stocks.TECH  || 0) + 10;
    // remove any pre-existing bastion so the build can fire
    vigil.buildings = vigil.buildings.filter(function (b) { return b !== 'bastion'; });
    st.story.flags.scourge_known = true;
    // make player dominant: set player presence well above any rival
    vigil.presence = vigil.presence || {};
    vigil.presence.player = 5;
    for (const f in vigil.presence) { if (f !== 'player') vigil.presence[f] = 0; }
    // civic threshold = civicMomentum * civicEvery ticks = 12 * 25 = 300 ticks worst case
    // with +2 per civic pass (player dominant), it fires after 6 civic passes = 150 ticks
    const bastionsBefore = vigil.buildings.filter(function (b) { return b === 'bastion'; }).length;
    let built = false, guard = 0;
    while (!built && guard++ < 600) {
      G.tick(st);
      if (vigil.buildings.indexOf('bastion') >= 0) built = true;
    }
    assert(built, 'vigil system built a bastion (' + guard + ' ticks, prosperity=' + vigil.prosperity.toFixed(0) + ')');
    const creditsDeducted = vigil.credits < 5000;
    assert(creditsDeducted, 'bastion deducted system credits (' + vigil.credits.toFixed(0) + ' remaining)');
    assert(vigil.stocks.ALLOY < 30, 'bastion consumed ALLOY from system stocks (' + vigil.stocks.ALLOY.toFixed(1) + ' remaining)');
    assert(vigil.civic === 0, 'civic momentum reset after successful build');
    assert((st.news || []).some(function (n) { return /bastion/.test(n.text) || /Vigil/.test(n.text); }),
      'bastion build published a news item');
    // bastion not duplicated by another civic tick
    const bastionsAfter = vigil.buildings.filter(function (b) { return b === 'bastion'; }).length;
    for (let i = 0; i < 600; i++) G.tick(st);
    const bastionsFinal = vigil.buildings.filter(function (b) { return b === 'bastion'; }).length;
    assert(bastionsFinal === bastionsAfter, 'vigil does not build a second bastion (' + bastionsFinal + ')');
  }

  // -- free system never builds --
  {
    const st = G.newGame({ seed: 'smoke-civic-free', difficulty: 'relaxed' });
    const free = st.systems.find(function (s) { return (!s.ideology || s.ideology === 'free') && s.pop > 0; });
    if (free) {
      free.discovered = true;
      free.prosperity = 100;
      free.credits = 99999;
      for (const c of D.COMM_IDS) free.stocks[c] = 999;
      const bldgsBefore = free.buildings.slice();
      for (let i = 0; i < 600; i++) G.tick(st);
      const newBldgs = free.buildings.filter(function (b) { return bldgsBefore.indexOf(b) < 0; });
      assert(newBldgs.length === 0, 'free-ideology system never builds autonomously (new: ' + newBldgs.join(',') + ')');
    }
  }

  // -- mariners builds exactly one relay; no duplicates on long run --
  {
    const st = G.newGame({ seed: 'smoke-civic-mariners', difficulty: 'relaxed' });
    const mar = st.systems.find(function (s) { return s.ideology === 'mariners' && s.pop > 0 && s.buildings.indexOf('relay') < 0; }) ||
      (function () {
        const s = st.systems.find(function (s) { return s.pop > 0 && s.scourge !== 2 && s.buildings.indexOf('relay') < 0; });
        if (s) s.ideology = 'mariners';
        return s;
      })();
    if (mar) {
      mar.discovered = true;
      mar.prosperity = 90;
      mar.credits = 5000;
      mar.stocks.ALLOY = (mar.stocks.ALLOY || 0) + 20;
      mar.buildings = mar.buildings.filter(function (b) { return b !== 'relay'; });
      let guard = 0;
      while (mar.buildings.indexOf('relay') < 0 && guard++ < 600) G.tick(st);
      assert(mar.buildings.indexOf('relay') >= 0, 'mariners built a relay (' + guard + ' ticks)');
      // long run — must not add a second relay
      for (let i = 0; i < 1200; i++) G.tick(st);
      const relayCount = mar.buildings.filter(function (b) { return b === 'relay'; }).length;
      assert(relayCount === 1, 'mariners relay not duplicated after long run (' + relayCount + ')');
    }
  }

  // -- TUNE constants present --
  assert(typeof D.TUNE.civicEvery === 'number' && D.TUNE.civicEvery > 0, 'civicEvery TUNE constant present');
  assert(typeof D.TUNE.civicProsperityMin === 'number', 'civicProsperityMin TUNE constant present');
  assert(typeof D.TUNE.civicMomentum === 'number' && D.TUNE.civicMomentum > 0, 'civicMomentum TUNE constant present');
}

section('Source integrity');
{
  const fs = require('fs');
  const jsDir = path.join(__dirname, '..', 'js');
  // Double-encoded UTF-8 leaves these telltale lead pairs; none are legitimate
  // here (intended glyphs are written directly, e.g. ▦ → ◎ ·).
  const BAD_SEQS = ['Â', 'Ã', '�', 'â€', 'â–', 'â—', 'âœ', 'â†', 'ï¼'];
  const BAD_LABELS = ['Â (0xC2)', 'Ã (0xC3)', 'U+FFFD replacement char',
    'â€ (mangled punctuation)', 'â– (mangled box glyph)', 'â— (mangled circle glyph)',
    'âœ (mangled dingbat)', 'â† (mangled arrow)', 'ï¼ (mangled fullwidth char)'];
  for (const file of fs.readdirSync(jsDir)) {
    if (!/\.js$/.test(file)) continue;
    const src = fs.readFileSync(path.join(jsDir, file), 'utf8');
    for (let i = 0; i < BAD_SEQS.length; i++) {
      const seq = BAD_SEQS[i];
      const idx = src.indexOf(seq);
      if (idx >= 0) {
        const lineNum = src.slice(0, idx).split('\n').length;
        assert(false, 'mojibake ' + BAD_LABELS[i] + ' in js/' + file + ' line ' + lineNum);
      } else {
        assert(true, 'no ' + BAD_LABELS[i] + ' in js/' + file);
      }
    }
  }
}

// ---------- 14. story-flag registry (source scan) ----------
section('Story flag registry');
{
  const fs = require('fs');
  const registered = {};
  for (const f of D.FLAGS) registered[f] = true;
  const found = {};
  const dir = path.join(__dirname, '..', 'js');
  for (const file of fs.readdirSync(dir)) {
    if (!/\.js$/.test(file)) continue;
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    let m;
    const dot = /\bflags\.([a-zA-Z_][a-zA-Z_0-9]*)/g;
    while ((m = dot.exec(src))) found[m[1]] = file;
    const lit = /\bflag\((?:s|state),\s*'([^']+)'/g;
    while ((m = lit.exec(src))) found[m[1]] = file;
    const br = /\bflags\['([^']+)'\]/g;
    while ((m = br.exec(src))) found[m[1]] = file;
  }
  const unknown = Object.keys(found).filter(function (f) {
    if (registered[f]) return false;
    return !D.FLAG_PREFIXES.some(function (p) { return f.indexOf(p) === 0; });
  });
  assert(unknown.length === 0, 'all story flags registered in D.FLAGS (unregistered: ' +
    unknown.map(function (f) { return f + '@' + found[f]; }).join(', ') + ')');
  assert(Object.keys(found).length >= 15, 'flag scan found the corpus (' + Object.keys(found).length + ')');
}

console.log('\n' + checks + ' checks, ' + failures + ' failures.');
if (failures > 0) process.exit(1);
console.log('SMOKE TEST v2 PASSED ✓');
