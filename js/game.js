/* STARWEFT game.js — state, actions API, tick pipeline, save/load. DOM-free. */
var SW = globalThis.SW = globalThis.SW || {};

SW.game = (function () {
  const U = SW.util, D = SW.data;
  const G = {};

  G.state = null;
  G.fx = [];            // transient render effects (not saved)
  G.handlers = {};      // UI hooks: toast, fx, event, sfx, objective, gameover

  G.emit = function (type, payload) {
    if (type === 'fx') { G.fx.push(Object.assign({ at: Date.now ? 0 : 0 }, payload)); if (G.fx.length > 60) G.fx.shift(); }
    const h = G.handlers[type];
    if (h) { try { h(payload); } catch (e) { /* UI hiccups must not kill the sim */ } }
  };

  // ---- Legacy (roguelite meta: persists across runs, not in saves) ----
  function legacyStore() {
    try { return (typeof window !== 'undefined' && typeof localStorage !== 'undefined') ? localStorage : null; } catch (e) { return null; }
  }
  G.legacy = function () {
    const s = legacyStore();
    if (!s) return G._memLegacy || {};
    try { return JSON.parse(s.getItem('starweft_legacy') || '{}'); } catch (e) { return {}; }
  };
  G.legacySet = function (flag) {
    const cur = G.legacy();
    if (cur[flag]) return;
    cur[flag] = true;
    G._memLegacy = cur;
    const s = legacyStore();
    if (s) { try { s.setItem('starweft_legacy', JSON.stringify(cur)); } catch (e) {} }
    G.emit('toast', { kind: 'good', text: '★ Legacy unlocked: new origins may be available on your next run.' });
  };
  G.originUnlocked = function (originId) {
    const o = D.ORIGINS[originId];
    if (!o) return false;
    if (!o.locked) return true;
    return !!G.legacy()[o.locked];
  };

  // ---- New game ----
  G.newGame = function (opts) {
    opts = opts || {};
    const seed = opts.seed !== undefined ? String(opts.seed) : String(Math.floor((typeof performance !== 'undefined' ? performance.now() : 1234) * 1000) % 1e9);
    const difficulty = D.DIFFICULTY[opts.difficulty] ? opts.difficulty : 'standard';
    const originId = (D.ORIGINS[opts.origin] && G.originUnlocked(opts.origin)) ? opts.origin : 'courier';
    const origin = D.ORIGINS[originId];
    const state = {
      version: D.SAVE_VERSION,
      seed: seed,
      rngState: U.seedFrom(seed),
      difficulty: difficulty,
      origin: originId,
      identity: Object.assign({ name: 'The Provisional Weft', hue: 195, sigil: U.seedFrom(seed) % 1000, motto: 'Finish the round.' }, opts.identity || {}),
      tick: 0, paused: true, speed: 1,
      credits: Math.max(150, D.DIFFICULTY[difficulty].startCredits + (origin.credits || 0)),
      research: 0,
      nextId: 1,
      systems: [], ships: [], routes: [], directives: [], rivals: [],
      stats: { deliveries: 0, creditsEarned: 0, shipsBuilt: 0, shipsLost: 0, systemsLost: 0, popLost: 0, popSaved: 0, techs: 0, researchEarned: 0 },
      tech: { unlocked: (origin.techs || []).slice() },
      gameOver: null,
      bookmarks: [],
      perks: [], perkPoints: 0, milestones: {}, scourgeStance: null,
      world: D.resolveWorld(opts.world),
      news: [],
      laneFlow: {},
    };
    SW.galaxy.generate(state);
    SW.story.init(state);
    SW.scourge.init(state);
    SW.rivals.init(state);
    SW.combat.init(state);
    SW.worldevents.init(state);

    // origin effects
    for (const f in (origin.rep || {})) state.rep[f] = origin.rep[f];
    if (origin.infamy) state.infamy = origin.infamy;
    if (origin.surveyBonus) state.originBonusSurvey = true;
    // character builder: one free tier-1 aptitude shapes the opening hours
    if (opts.aptitude && D.PERKS[opts.aptitude] && !D.PERKS[opts.aptitude].req) state.perks.push(opts.aptitude);
    if (origin.scourgeEarlier && state.scourge.startAt > 0) state.scourge.startAt = Math.max(120, state.scourge.startAt - origin.scourgeEarlier);
    let startSys = state.homeId;
    if (origin.startReach) {
      const reach = state.systems.filter(function (s) { return s.region === 'reach' && s.type !== 'frontier'; });
      if (reach.length) {
        const s0 = reach[Math.floor(U.rnd(state) * reach.length)];
        startSys = s0.id;
        s0.discovered = true; s0.surveyed = true;
        s0.buildings.push('relay');           // the Reach keeps its own beacons
        for (const nb of s0.links) state.systems[nb].discovered = true;
      }
    }
    (origin.ships || ['sparrow']).forEach(function (h, i) {
      SW.ships.create(state, h, startSys, i === 0 ? 'Stitch' : undefined);
    });
    // The Sol cold open — only when explicitly requested (never for bots/tests)
    if (opts.tutorial && SW.tutorial) SW.tutorial.init(state);
    G.state = state;
    G.fx.length = 0;
    return state;
  };

  // ---- Tick ----
  G.lastTickMs = 0; // perf meter reads this; measurement never touches state
  G.tick = function (state) {
    state = state || G.state;
    if (!state || state.gameOver) return;
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    state.tick++;
    SW.economy.tick(state);
    SW.ships.tick(state);
    SW.combat.tick(state);
    SW.rivals.tick(state);
    SW.civics.tick(state);
    // Living Weave: decay lane flow after ships and rivals have contributed this tick
    (function () {
      const lf = state.laneFlow || (state.laneFlow = {});
      const decay = D.TUNE.laneFlowDecay;
      for (const k in lf) {
        lf[k] *= decay;
        if (lf[k] < 0.5) delete lf[k];
      }
    })();
    SW.scourge.tick(state);
    SW.worldevents.tick(state);
    SW.story.tick(state);
    if (SW.tutorial) SW.tutorial.tick(state);
    SW.perks.tick(state);
    if (state.infamy >= 5) G.legacySet('infamy');
    checkEnd(state);
    if (state.tick % D.TUNE.autosaveEvery === 0) G.save('auto');
    G.lastTickMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  };

  // ---- Invariant validator (tests + dev tooling; never runs in the loop) ----
  G.validate = function (state) {
    const bad = [];
    if (!isFinite(state.credits)) bad.push('credits not finite');
    if (!isFinite(state.research) || state.research < -0.01) bad.push('research invalid: ' + state.research);
    for (const sys of state.systems) {
      for (const c of D.COMM_IDS) {
        const v = sys.stocks[c];
        if (v !== undefined && (!isFinite(v) || v < 0)) bad.push(sys.name + ' stocks.' + c + '=' + v);
      }
      if (!isFinite(sys.pop) || sys.pop < 0) bad.push(sys.name + ' pop=' + sys.pop);
    }
    const routeById = {};
    for (const r of state.routes) {
      routeById[r.id] = r;
      for (const sid of r.ships) {
        if (!state.ships.some(function (s) { return s.id === sid; })) bad.push('route ' + r.id + ' references missing ship ' + sid);
      }
    }
    for (const ship of state.ships) {
      if (ship.mode === 'idle' && (ship.at === null || ship.at === undefined || !state.systems[ship.at])) bad.push(ship.name + ' idle at invalid system ' + ship.at);
      if (ship.mode === 'travel' && (!ship.leg || !state.systems[ship.leg.to])) bad.push(ship.name + ' traveling without a valid leg');
      if (ship.mode === 'shuttle' && (ship.at === null || ship.at === undefined || !state.systems[ship.at])) bad.push(ship.name + ' shuttling outside any system');
      if (ship.mode === 'shuttle' && ship.hop && !SW.planets.body(state, ship.at, ship.hop.to)) bad.push(ship.name + ' hopping to unknown body ' + (ship.hop && ship.hop.to));
      if (ship.routeId && !routeById[ship.routeId]) bad.push(ship.name + ' assigned to missing route ' + ship.routeId);
      for (const c in ship.cargo) {
        if (!isFinite(ship.cargo[c]) || ship.cargo[c] < 0) bad.push(ship.name + ' cargo.' + c + '=' + ship.cargo[c]);
      }
    }
    if (state.journal) {
      for (let i = 1; i < state.journal.length; i++) {
        if (state.journal[i].t < state.journal[i - 1].t) { bad.push('journal ticks not monotonic at ' + i); break; }
      }
    }
    return bad;
  };

  // Browser loop: accumulates fractional ticks so speeds stay smooth.
  let loopHandle = null, acc = 0, lastT = 0;
  G.smoothTick = function () { return G.state ? G.state.tick + Math.min(1, acc) : 0; };
  G.startLoop = function () {
    if (typeof setInterval === 'undefined' || loopHandle) return;
    lastT = Date.now();
    loopHandle = setInterval(function () {
      const now = Date.now();
      const dt = Math.min(1000, now - lastT);
      lastT = now;
      const st = G.state;
      if (!st || st.paused || st.gameOver || (st.story && st.story.pending)) { acc = 0; return; }
      acc += dt * st.speed / D.TICK_MS;
      let guard = 0;
      while (acc >= 1 && guard++ < 40) {
        acc -= 1;
        try { G.tick(st); } catch (err) {
          st.paused = true;
          G.emit('toast', { kind: 'bad', text: '△ Simulation error (paused): ' + (err && err.message ? err.message : err) });
          break;
        }
      }
    }, 50);
  };

  function checkEnd(state) {
    if (state.gameOver) return;
    // Victory
    if (state.story.flags.scourge_cured && !state.story.flags.postgame) {
      state.gameOver = { win: true, reason: 'The Panacea took. The Scourge gardens gently now.', tick: state.tick, score: G.score(state) };
      state.paused = true;
      G.legacySet('won');
      G.emit('gameover', state.gameOver);
      G.emit('sfx', 'victory');
      return;
    }
    // Scourge losses
    const loss = SW.scourge.checkLoss(state);
    if (loss.lost) {
      state.gameOver = { win: false, reason: loss.reason, tick: state.tick, score: G.score(state) };
      state.paused = true;
      G.emit('gameover', state.gameOver);
      G.emit('sfx', 'defeat');
      return;
    }
    // Bankruptcy: no ships, no means
    if (state.ships.length === 0 && state.credits < SW.ships.hullCost(state, 'sparrow')) {
      state.gameOver = { win: false, reason: 'No ships, no credits, no thread left to pull. A rival quietly absorbs what remains of the weave.', tick: state.tick, score: G.score(state) };
      state.paused = true;
      G.emit('gameover', state.gameOver);
      G.emit('sfx', 'defeat');
    }
  }

  G.score = function (state) {
    const s = state.stats;
    let score = Math.floor(
      (s.creditsEarned || 0) / 100 +
      (s.deliveries || 0) * 5 +
      (s.techs || 0) * 200 +
      (s.popSaved || 0) * 400 +
      (s.inoculated || 0) * 300 +
      (s.discovered || 0) * 40 -
      (s.systemsLost || 0) * 150
    );
    if (state.story.flags.scourge_cured) score += 5000;
    return Math.max(0, score);
  };

  // ---- Actions (the only sanctioned way to poke the state) ----
  const A = {};
  G.actions = A;

  function err(msg) { return { ok: false, msg: msg }; }
  function findShip(state, id) { return state.ships.find(function (s) { return s.id === id; }); }

  A.setSpeed = function (state, speed) {
    if (speed === 0) { state.paused = true; return { ok: true }; }
    if (D.SPEEDS.indexOf(speed) < 0) return err('Bad speed.');
    state.speed = speed; state.paused = false;
    return { ok: true };
  };
  A.togglePause = function (state) { state.paused = !state.paused; return { ok: true }; };

  A.buyShip = function (state, hullId, sysId) {
    const hull = D.HULLS[hullId];
    if (!hull) return err('Unknown hull.');
    if (hull.tech && !SW.tech.has(state, hull.tech)) return err('Requires ' + D.TECHS[hull.tech].name + '.');
    const sys = state.systems[sysId];
    if (!sys || sys.scourge === 2) return err('No shipyard there.');
    if (sys.id !== state.homeId && sys.type !== 'industrial') return err('Ships are built at Home or Industrial hubs.');
    if (!sys.discovered) return err('Not yet charted.');
    const cost = SW.ships.hullCost(state, hullId);
    if (state.credits < cost) return err('Needs ' + U.fmt(cost) + '¤.');
    state.credits -= cost;
    const ship = SW.ships.create(state, hullId, sysId);
    G.emit('toast', { kind: 'good', text: '▲ ' + ship.name + ' (' + hull.name + ') launched at ' + sys.name + '.' });
    G.emit('sfx', 'buy');
    return { ok: true, ship: ship };
  };

  A.scrapShip = function (state, shipId) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    if (ship.mode !== 'idle') return err('Recall it first (must be idle).');
    SW.ships.unassign(state, ship);
    const refund = Math.floor(SW.ships.hullCost(state, ship.hull) * 0.5);
    state.credits += refund;
    const i = state.ships.indexOf(ship);
    if (i >= 0) state.ships.splice(i, 1);
    G.emit('toast', { kind: 'info', text: ship.name + ' scrapped for ' + U.fmt(refund) + '¤.' });
    return { ok: true };
  };

  A.shipBuy = function (state, shipId, c, qty) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    if (ship.mode !== 'idle') return err('Ship is in flight.');
    return SW.ships.buy(state, ship, c, qty);
  };
  A.shipSell = function (state, shipId, c, qty) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    if (ship.mode !== 'idle') return err('Ship is in flight.');
    return SW.ships.sell(state, ship, c, qty);
  };
  // In-system hop: shuttle the ship to a named body's berth. The map lock
  // never blocks these — the prologue is MADE of them.
  A.shipHop = function (state, shipId, bodyName) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    if (ship.routeId || ship.directiveId || ship.mission) return err('Release it from its orders first.');
    return SW.ships.hop(state, ship, bodyName);
  };
  A.shipSend = function (state, shipId, destId, sellOnArrive) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    if (SW.tutorial && SW.tutorial.mapLocked(state) && destId !== state.homeId) return err('The weave begins at home.');
    const check = SW.ships.canSend(state, ship, destId);
    if (!check.ok) return check;
    SW.ships.unassign(state, ship);
    return SW.ships.send(state, ship, destId, { kind: 'manual', sellOnArrive: !!sellOnArrive });
  };

  A.authorizeSolNet = function (state) {
    if (!state.tutorial || !state.tutorial.active || state.tutorial.goal !== 6) return err('No Sol Net contract is ready.');
    if (!state.tutorial.netPrompted) return err('Open the Journal and review the company contract first.');
    if (state.story.flags.sol_net_authorized) return { ok: true };
    state.story.flags.sol_net_authorized = true;
    state.story.flags.routes_unlocked = true;
    G.news(state, 'Sol Logistics Net authorized: Earth Anchorage, The Belt, and the first anchor now report as one contract surface.', state.homeId);
    G.emit('toast', { kind: 'good', text: 'Sol Logistics Net authorized. Route automation core installed.' });
    G.emit('sfx', 'chime');
    return { ok: true };
  };

  A.depotDrop = function (state, shipId, c, qty) {
    const ship = findShip(state, shipId);
    if (!ship || ship.mode !== 'idle') return err('Ship unavailable.');
    const sys = state.systems[ship.at];
    if (!sys.depot) return err('No depot here.');
    qty = Math.min(qty, ship.cargo[c] || 0);
    if (qty <= 0) return err('Nothing to drop.');
    ship.cargo[c] -= qty; if (ship.cargo[c] <= 0) { delete ship.cargo[c]; delete ship.basis[c]; }
    sys.depot[c] = (sys.depot[c] || 0) + qty;
    return { ok: true };
  };
  A.depotTake = function (state, shipId, c, qty) {
    const ship = findShip(state, shipId);
    if (!ship || ship.mode !== 'idle') return err('Ship unavailable.');
    const sys = state.systems[ship.at];
    if (!sys.depot || !(sys.depot[c] > 0)) return err('Depot has none.');
    const space = SW.ships.cap(state, ship) - SW.ships.cargoTotal(ship);
    qty = Math.min(qty, Math.floor(sys.depot[c]), space);
    if (qty <= 0) return err('No room aboard.');
    sys.depot[c] -= qty;
    ship.cargo[c] = (ship.cargo[c] || 0) + qty;
    ship.basis[c] = ship.basis[c] || 0;
    return { ok: true };
  };

  function validateRoute(state, stops, opts) {
    opts = opts || {};
    if (!opts.skipUnlock && !state.story.flags.routes_unlocked) return err('Routes are not unlocked yet.');
    if (!stops || stops.length < 2) return err('A route needs at least 2 stops.');
    for (const st of stops) {
      const sys = state.systems[st.sys];
      if (!sys || !sys.discovered) return err('All stops must be charted systems.');
      if (!SW.ships.inRange(state, sys)) return err(sys.name + ' is outside command range. Build a Relay Beacon nearer.');
      if (st.action === 'smart' && !SW.tech.has(state, 'smartroutes')) return err('Smart stops require Smart Routing research.');
      if ((st.action === 'drop' || st.action === 'take') && !sys.depot) return err(sys.name + ' has no Depot.');
    }
    return { ok: true };
  }
  A.createRoute = function (state, stops, name) {
    const valid = validateRoute(state, stops);
    if (!valid.ok) return valid;
    const route = SW.ships.createRoute(state, stops, name);
    G.emit('toast', { kind: 'good', text: '↻ ' + route.name + ' created.' });
    return { ok: true, route: route };
  };
  A.deleteRoute = function (state, routeId) {
    const i = state.routes.findIndex(function (r) { return r.id === routeId; });
    if (i < 0) return err('No such route.');
    for (const shipId of state.routes[i].ships.slice()) {
      const ship = findShip(state, shipId);
      if (ship) { ship.routeId = null; ship.mission = null; }
    }
    state.routes.splice(i, 1);
    return { ok: true };
  };
  A.assignShip = function (state, shipId, routeId) {
    const ship = findShip(state, shipId);
    const route = state.routes.find(function (r) { return r.id === routeId; });
    if (!ship || !route) return err('Ship or route missing.');
    SW.ships.assignToRoute(state, ship, route);
    return { ok: true };
  };
  A.unassignShip = function (state, shipId) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    SW.ships.unassign(state, ship);
    return { ok: true };
  };
  A.toggleAutoExplore = function (state, shipId) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    if (!(D.HULLS[ship.hull].survey > 0)) return err('Only scout hulls can auto-explore.');
    if (ship.routeId || ship.directiveId) SW.ships.unassign(state, ship);
    ship.autoExplore = !ship.autoExplore;
    if (ship.autoExplore) {
      ship.mission = null;
      ship.retryAt = state.tick;
      ship.stranded = false;
    } else {
      ship.retryAt = 0;
    }
    return { ok: true, enabled: !!ship.autoExplore };
  };
  A.toggleRoute = function (state, routeId) {
    const route = state.routes.find(function (r) { return r.id === routeId; });
    if (!route) return err('No such route.');
    route.paused = !route.paused;
    return { ok: true };
  };

  A.createChainRoute = function (state, c) {
    if (!SW.tech.has(state, 'metaroutes')) return err('Requires Weftworks research.');
    const plan = SW.ships.planChainRoute(state, c);
    if (!plan.ok) return plan;
    const valid = validateRoute(state, plan.stops, { skipUnlock: true });
    if (!valid.ok) return valid;
    const route = SW.ships.createRoute(state, plan.stops, plan.name);
    G.emit('toast', { kind: 'good', text: '⧉ ' + route.name + ' woven: ' + plan.producer.name + ' → ' + plan.market.name + '.' });
    G.emit('sfx', 'buy');
    return { ok: true, route: route };
  };
  A.toggleAutoYards = function (state) {
    if (!SW.tech.has(state, 'autoyards')) return err('Requires Tessellation Yards research.');
    state.autoYardsOff = !state.autoYardsOff;
    return { ok: true, enabled: !state.autoYardsOff };
  };
  A.relocateHome = function (state, sysId) {
    if (!SW.tech.has(state, 'driftholds')) return err('Requires Drifthold Anchorage research.');
    const sys = state.systems[sysId];
    if (!sys) return err('No such system.');
    if (sysId === state.homeId) return err('Home is already anchored here.');
    if (!sys.discovered || !sys.surveyed) return err('Home can only anchor at a fully surveyed system.');
    if (sys.scourge === 2) return err('Nothing anchors in corrupted space.');
    if (sys.badlands && !SW.tech.has(state, 'deepdrives')) return err('Home cannot anchor beyond the web without Deep Drives.');
    const cost = Math.round(D.TUNE.relocateCost * (state.scourgeStance === 'exodus' ? 0.5 : 1));
    if (state.credits < cost) return err('Relocation costs ' + cost + '¤.');
    state.credits -= cost;
    state.homeId = sysId;
    sys.presence.player = Math.min(10, (sys.presence.player || 0) + 2);
    state.stats.relocations = (state.stats.relocations || 0) + 1;
    G.emit('toast', { kind: 'good', text: '⌂ Home anchorage re-laid at ' + sys.name + '.' });
    G.emit('sfx', 'build');
    // deep exodus: those who run far enough coreward hear the Loom answer
    if (!state.story.flags.deep_exodus && (sys.x >= D.TUNE.exodusX || sys.region === 'verge')) {
      state.story.flags.deep_exodus = true;
      SW.story.grantFragment(state);
      G.emit('toast', { kind: 'good', text: '✶ This deep, the lanes hum. Your relays resonate: command range +15%, permanently.' });
      G.emit('sfx', 'discover');
    }
    return { ok: true };
  };

  A.createDirective = function (state, sysId, c, target) {
    if (!SW.tech.has(state, 'directives')) return err('Requires Logistics Directives research.');
    const sys = state.systems[sysId];
    if (!sys || !sys.discovered) return err('Uncharted system.');
    const d = SW.ships.createDirective(state, sysId, c, target);
    return { ok: true, directive: d };
  };
  A.deleteDirective = function (state, dirId) {
    const i = state.directives.findIndex(function (d) { return d.id === dirId; });
    if (i < 0) return err('No such directive.');
    for (const ship of state.ships) if (ship.directiveId === dirId) ship.directiveId = null;
    state.directives.splice(i, 1);
    return { ok: true };
  };
  A.assignShipDirective = function (state, shipId, dirId) {
    const ship = findShip(state, shipId);
    const d = state.directives.find(function (x) { return x.id === dirId; });
    if (!ship || !d) return err('Ship or directive missing.');
    SW.ships.assignToDirective(state, ship, d);
    return { ok: true };
  };

  // Building cost with stance modifiers (HOLD fortifies cheap).
  G.buildingCost = function (state, buildingId) {
    const b = D.BUILDINGS[buildingId];
    if (!b) return 0;
    let cost = b.cost;
    if (buildingId === 'bastion' && state.scourgeStance === 'hold') cost = Math.round(cost * 0.7);
    return cost;
  };

  // Build: consumes credits + materials from (depot + idle ships' holds) at the site.
  A.build = function (state, sysId, buildingId) {
    const sys = state.systems[sysId];
    const b = D.BUILDINGS[buildingId];
    if (!sys || !b) return err('Unknown.');
    if (sys.scourge === 2) return err('The Scourge holds that system.');
    if (!sys.discovered) return err('Not yet charted.');
    if (b.tech && !SW.tech.has(state, b.tech)) return err('Requires ' + D.TECHS[b.tech].name + ' research.');
    if (sys.buildings.indexOf(buildingId) >= 0) return err('Already built here.');
    if (b.onlyType === 'producer' && Object.keys(sys.prod).length === 0) return err('Only useful at producing systems.');
    if (b.onlyType === 'pop' && !(sys.pop > 0 && sys.type === 'pop')) return err('Only useful at population centers.');
    if (buildingId !== 'relay' && !SW.ships.inRange(state, sys)) return err('Outside command range — relays first.');
    const bCost = G.buildingCost(state, buildingId);
    if (state.credits < bCost) return err('Needs ' + U.fmt(bCost) + '¤.');

    // material check: depot + idle player ships here
    const localShips = state.ships.filter(function (sh) { return sh.at === sysId && sh.mode === 'idle'; });
    const have = {};
    for (const c in b.mats) {
      have[c] = (sys.depot ? (sys.depot[c] || 0) : 0);
      for (const sh of localShips) have[c] += sh.cargo[c] || 0;
      if (have[c] < b.mats[c]) {
        return err('Needs ' + b.mats[c] + ' ' + D.COMMODITIES[c].name + ' on-site (' + Math.floor(have[c]) + ' present). Deliver it here.');
      }
    }
    // consume: depot first, then ship holds
    for (const c in b.mats) {
      let need = b.mats[c];
      if (sys.depot && sys.depot[c]) {
        const take = Math.min(need, sys.depot[c]);
        sys.depot[c] -= take; need -= take;
      }
      for (const sh of localShips) {
        if (need <= 0) break;
        const take = Math.min(need, sh.cargo[c] || 0);
        if (take > 0) {
          sh.cargo[c] -= take; need -= take;
          if (sh.cargo[c] <= 0) { delete sh.cargo[c]; delete sh.basis[c]; }
        }
      }
    }
    state.credits -= bCost;
    sys.buildings.push(buildingId);
    if (buildingId === 'depot') sys.depot = sys.depot || {};
    if (buildingId === 'fabricator') sys.slots.push('ANY');
    if (buildingId === 'relay') state.story.flags.built_relay = true;
    state.stats.built = (state.stats.built || 0) + 1;
    G.emit('toast', { kind: 'good', text: b.icon + ' ' + b.name + ' built at ' + sys.name + '.' });
    G.emit('sfx', 'build');
    return { ok: true };
  };

  A.buildSite = function (state, sysId, bodyName, facId) {
    return SW.sites.build(state, sysId, bodyName, facId);
  };
  A.buyPerk = function (state, perkId) {
    return SW.perks.buy(state, perkId);
  };
  A.sellData = function (state, shipId) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    return SW.ships.sellData(state, ship);
  };
  A.openHail = function (state) { return SW.story.openHail(state); };
  A.dismissHail = function (state) { return SW.story.dismissHail(state); };
  // Command grammar: issue an intent; it compiles to a visible queue of atoms.
  A.order = function (state, shipId, intent) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    if (SW.tutorial && SW.tutorial.mapLocked(state)) return err('The weave begins at home.');
    const r = SW.ships.intent(state, ship, intent);
    if (r.ok) G.emit('toast', { kind: 'info', text: '▸ ' + ship.name + ': ' + r.note });
    return r;
  };
  A.clearQueue = function (state, shipId) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    ship.queue = []; ship.queueNote = null;
    return { ok: true };
  };

  A.supplyMission = function (state, shipId, targetSysId, c, qty) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    return SW.ships.supplyMission(state, ship, targetSysId, c, qty);
  };

  A.research = function (state, techId) { return SW.tech.research(state, techId); };
  A.chooseEvent = function (state, idx) { return SW.story.choose(state, idx); };

  // ---- v2: privateering, mercenaries, ops, blockades, bookmarks ----
  A.raid = function (state, shipId, sysId, edge) {
    const ship = findShip(state, shipId);
    if (!ship || ship.mode !== 'idle') return err('Ship unavailable.');
    return SW.combat.raid(state, ship, sysId, edge);
  };
  A.hireRetainer = function (state, regionType) { return SW.combat.hireRetainer(state, regionType); };
  A.blitz = function (state, sysId) { return SW.combat.blitz(state, sysId); };
  A.embargo = function (state, sysId) { return SW.combat.embargo(state, sysId); };
  A.payToll = function (state, blockadeIdx) {
    const bl = state.blockades[blockadeIdx];
    if (!bl) return err('That blockade is gone.');
    return SW.worldevents.payToll(state, bl);
  };
  A.breakBlockade = function (state, blockadeIdx, shipId) {
    const bl = state.blockades[blockadeIdx];
    const ship = findShip(state, shipId);
    if (!bl) return err('That blockade is gone.');
    if (!ship || ship.mode !== 'idle') return err('Ship unavailable.');
    return SW.worldevents.breakBlockade(state, bl, ship);
  };
  A.toggleBookmark = function (state, sysId) {
    const i = state.bookmarks.indexOf(sysId);
    if (i >= 0) state.bookmarks.splice(i, 1); else state.bookmarks.push(sysId);
    return { ok: true, bookmarked: i < 0 };
  };
  A.deliverPanacea = function (state, shipId) {
    const ship = findShip(state, shipId);
    if (!ship || ship.mode !== 'idle') return err('Ship unavailable.');
    return SW.scourge.deliverPanacea(state, ship);
  };
  A.inoculate = function (state, shipId) {
    const ship = findShip(state, shipId);
    if (!ship || ship.mode !== 'idle') return err('Ship unavailable.');
    return SW.scourge.inoculate(state, ship);
  };
  A.buyoutRival = function (state, rivalId) {
    if (!SW.tech.has(state, 'diplomacy')) return err('Requires Corporate Diplomacy research.');
    const rival = state.rivals.find(function (r) { return r.id === rivalId && r.alive; });
    if (!rival) return err('No such rival.');
    return SW.rivals.buyout(state, rival);
  };
  A.continuePostgame = function (state) {
    if (!state.gameOver || !state.gameOver.win) return err('Nothing to continue.');
    state.story.flags.postgame = true;
    state.gameOver = null;
    state.paused = false;
    if (!state.speed || state.speed === 0) state.speed = 1;
    return { ok: true };
  };
  A.cheat = function (state, kind, arg) {
    if (!state || !state.systems) return err('No active run.');
    if (kind === 'resources') {
      state.credits += 50000;
      state.research += 5000;
      return { ok: true, msg: '+50,000¤, +5,000◇' };
    }
    if (kind === 'unlock') {
      for (const id in D.TECHS) {
        if (D.TECHS[id].group === 'doctrine') continue;
        if (state.tech.unlocked.indexOf(id) < 0) state.tech.unlocked.push(id);
      }
      state.story.flags.routes_unlocked = true;
      state.story.flags.built_relay = true;
      state.story.flags.sample_collected = true;
      state.story.flags.hole_surveyed = true;
      state.story.flags.husk_surveyed = true;
      return { ok: true, msg: 'Feature gates unlocked.' };
    }
    if (kind === 'reveal') {
      let n = 0;
      for (const sys of state.systems) {
        if (!sys.discovered) n++;
        sys.discovered = true;
        sys.surveyed = true;
        sys.charted = true;
      }
      return { ok: true, msg: n + ' systems revealed.' };
    }
    if (kind === 'fleet') {
      const sysId = state.systems[arg] ? arg : state.homeId;
      const hulls = ['sparrow', 'courier', 'freighter', 'superhauler', 'pathfinder', 'surveyor', 'corvette', 'lancer'];
      for (const h of hulls) if (D.HULLS[h]) SW.ships.create(state, h, sysId);
      return { ok: true, msg: 'Test fleet launched.' };
    }
    if (kind === 'stock') {
      const sys = state.systems[arg] || state.systems[state.homeId];
      for (const c of D.COMM_IDS) {
        if (D.COMMODITIES[c].locked && state.tech.unlocked.indexOf('panacea') < 0) continue;
        sys.stocks[c] = Math.max(sys.stocks[c] || 0, Math.floor((sys.capacity[c] || D.TUNE.capDefault) * 0.85));
        if (sys.depot) sys.depot[c] = Math.max(sys.depot[c] || 0, 50);
      }
      return { ok: true, msg: sys.name + ' stocked.' };
    }
    return err('Unknown cheat.');
  };

  // ---- News (the ticker's memory; serialized, capped) ----
  G.news = function (state, text, sysId) {
    state.news = state.news || [];
    state.news.push({ t: state.tick, text: text, sys: sysId === undefined ? null : sysId });
    if (state.news.length > 30) state.news.shift();
  };

  // ---- Action journal ----
  // Every action call is recorded into the save: {t: tick, a: name, args, ok}.
  // Seed + journal = a replayable run; a bug report is a save file.
  const JOURNAL_CAP = 2000;
  for (const name of Object.keys(A)) {
    (function (name, fn) {
      A[name] = function (state) {
        const r = fn.apply(null, arguments);
        try {
          if (state && typeof state === 'object' && state.systems) {
            const j = state.journal = state.journal || [];
            j.push({ t: state.tick, a: name, args: Array.prototype.slice.call(arguments, 1), ok: !(r && r.ok === false) });
            if (j.length > JOURNAL_CAP) j.splice(0, j.length - JOURNAL_CAP);
          }
        } catch (e) { /* journaling must never break play */ }
        return r;
      };
    })(name, A[name]);
  }

  // ---- Save / load ----
  function storage() {
    // browser only — Node 25 exposes a localStorage stub that warns without a backing file
    try { return (typeof window !== 'undefined' && typeof localStorage !== 'undefined') ? localStorage : null; } catch (e) { return null; }
  }
  G.save = function (slot) {
    const s = storage();
    if (!s || !G.state) return { ok: false };
    try {
      s.setItem('starweft_' + (slot || 'manual'), JSON.stringify(G.state));
      return { ok: true };
    } catch (e) { return { ok: false, msg: 'Save failed: ' + e.message }; }
  };
  G.load = function (slot) {
    const s = storage();
    if (!s) return { ok: false, msg: 'No storage available.' };
    const raw = s.getItem('starweft_' + (slot || 'manual'));
    if (!raw) return { ok: false, msg: 'No save found.' };
    return G.loadFromString(raw);
  };
  G.loadFromString = function (raw) {
    let st;
    try { st = JSON.parse(raw); } catch (e) { return { ok: false, msg: 'Save data is not valid JSON.' }; }
    const v = validateSave(st);
    if (!v.ok) return v;
    G.state = st;
    G.fx.length = 0;
    SW.planets.clearCache(); // bodies are derived from seed; never trust a stale cache
    st.paused = true;
    return { ok: true };
  };
  G.exportSave = function () { return G.state ? JSON.stringify(G.state) : null; };
  G.hasSave = function (slot) {
    const s = storage();
    return !!(s && s.getItem('starweft_' + (slot || 'auto')));
  };

  function validateSave(st) {
    if (!st || typeof st !== 'object') return { ok: false, msg: 'Not a save file.' };
    if (st.version !== D.SAVE_VERSION) return { ok: false, msg: 'Save is from version ' + st.version + '; this build expects ' + D.SAVE_VERSION + '.' };
    if (!Array.isArray(st.systems) || !st.systems.length) return { ok: false, msg: 'Save has no galaxy.' };
    if (!st.stats || !st.tech || !st.story || !st.scourge) return { ok: false, msg: 'Save is missing core sections.' };
    st.credits = U.num(st.credits); st.research = U.num(st.research); st.tick = U.num(st.tick);
    return { ok: true };
  }

  return G;
})();
