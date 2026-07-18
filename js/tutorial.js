/* STARWEFT tutorial.js — Act 0: The Wake. DOM-free.
   Act 0 runs inside canonical campaign/Thread state. Economy, Pledges, routes,
   reserves, objectives, Charters, failure recovery and seeded physics are live;
   only Act I's quota clock is suspended. Guidance is predicate-based, so the
   player may experiment and every archetype has a deterministic recovery path. */
var SW = globalThis.SW = globalThis.SW || {};

SW.tutorial = (function () {
  const T = {};
  const D = SW.data, U = SW.util;

  function home(state) { return state.systems[state.homeId]; }
  function fleetAtHome(state) { return state.ships.filter(function (sh) { return sh.at === state.homeId; }); }
  function fleetCargo(state) {
    return state.ships.reduce(function (n, sh) { return n + SW.ships.cargoTotal(sh); }, 0);
  }
  function depotTotal(state) {
    const d = home(state).depot || {};
    return Object.keys(d).reduce(function (n, c) { return n + (d[c] || 0); }, 0);
  }
  function routeSignature(state) {
    return state.routes.map(function (r) {
      return r.id + ':' + (r.paused ? 1 : 0) + ':' + (r.ships || []).join(',') + ':' + (r.stops || []).map(function (s) { return s.sys + '/' + s.action + '/' + (s.c || ''); }).join('>');
    }).sort().join('|');
  }
  function setBeat(state, full, brief) {
    const tu = state.tutorial;
    const text = tu.guidance === 'brief' && brief ? brief : full;
    tu.prompt = text;
    SW.story.setObjective(state, text);
  }
  function activePledge(state) { return state.pledges && state.pledges[0]; }
  function staffedRoute(state) {
    return state.routes.some(function (r) { return !r.paused && r.ships && r.ships.length > 0; });
  }

  function resolvePressureObjective(state) {
    const tu = state.tutorial, store = state.thread.objectives;
    const at = store.active.findIndex(function (o) { return o.id === tu.pressureObjectiveId; });
    if (at < 0) return;
    const objective = store.active.splice(at, 1)[0];
    objective.status = 'completed';
    objective.completedAt = state.tick;
    objective.response = tu.pressureResponse;
    store.completed.push(objective);
  }

  function createBubbleNeeds(state) {
    const tu = state.tutorial;
    if (tu.bubbleNeeds && tu.bubbleNeeds.length === 3) return;
    const targets = state.systems.filter(function (s) { return s.id !== state.homeId && !s.badlands && s.scourge !== 2; })
      .sort(function (a, b) { return (a.hops || 999) - (b.hops || 999) || a.id - b.id; }).slice(0, 3);
    const families = ['restore', 'stabilize', 'bridge'];
    tu.bubbleNeeds = [];
    targets.forEach(function (sys, i) {
      sys.discovered = true;
      const made = SW.objectives.create(state, {
        family: families[i], sys: sys.id, source: 'act0-transition',
        deadline: state.tick + 360 + i * 40,
        consequence: { kind: 'local-strain', lethal: false }
      });
      if (made.ok) tu.bubbleNeeds.push(made.objective.id);
    });
  }

  // Thirteen beats mirror the product contract. Selection happened at launch;
  // beat 1 names it, then each later predicate is a real game-state outcome.
  const GOALS = [
    {
      id: 'wake',
      enter: function (s) {
        s.tutorial.wakeAt = s.tick;
        const a = D.ARCHETYPES[s.archetype] || D.ARCHETYPES.courier;
        const p = D.PRESSURE[s.pressure] || D.PRESSURE.standard;
        setBeat(s, 'ACT 0 · THE WAKE — ' + a.name + ', ' + p.name + ' pressure. Sol is alive but disconnected. Your ' + a.craft + ' can make the first useful change. The Act I clock is waiting for an informed promise.',
          'Wake as ' + a.name + '. The Act I clock is paused.');
      },
      complete: function (s) { return s.tick > s.tutorial.wakeAt; }
    },
    {
      id: 'cast_off',
      enter: function (s) { setBeat(s, '1) Select THE BELT in Sol, then FLY HERE. Ore is cheap where it floats free.', 'Fly to THE BELT.'); },
      complete: function (s) { return s.ships.some(function (sh) { return sh.at === s.homeId && (sh.body === 'The Belt' || (sh.hop && sh.hop.to === 'The Belt')); }); }
    },
    {
      id: 'load',
      enter: function (s) { setBeat(s, '2) At The Belt, buy ' + s.tutorial.cargoTarget + ' Ore. The target fits your current hold; green price feedback marks the source advantage.', 'Load ' + s.tutorial.cargoTarget + ' Ore.'); },
      complete: function (s) { return s.ships.some(function (sh) { return (sh.cargo.ORE || 0) >= s.tutorial.cargoTarget; }); }
    },
    {
      id: 'first_delivery',
      enter: function (s) { setBeat(s, '3) Select EARTH, FLY HERE, then sell the Ore. This is an unpledged delivery: it changes a real destination and earns credits, but no WEAVE.', 'Return to EARTH and sell the Ore.'); },
      complete: function (s) { return !!s.tutorial.profitableOreSale; }
    },
    {
      id: 'arrival_feedback',
      enter: function (s) {
        const d = s.tutorial.lastDelivery || { qty: s.tutorial.cargoTarget, stockBefore: 0, stockAfter: 0, revenue: 0, profit: 0 };
        s.tutorial.feedbackAt = s.tick;
        setBeat(s, 'ARRIVAL — Earth received ' + U.fmt1(d.qty) + ' Ore. Stock ' + U.fmt1(d.stockBefore) + ' → ' + U.fmt1(d.stockAfter) + '; revenue +' + U.fmt(d.revenue) + '¤; margin ' + (d.profit >= 0 ? '+' : '') + U.fmt(Math.round(d.profit)) + '¤. Contract and world feedback are separate on pledged work.',
          'Arrival confirmed: stock ' + U.fmt1(d.stockBefore) + '→' + U.fmt1(d.stockAfter) + ', +' + U.fmt(d.revenue) + '¤.');
      },
      complete: function (s) { return s.tick >= s.tutorial.feedbackAt + 5; }
    },
    {
      id: 'pledge_choice',
      enter: function (s) {
        s.tutorial.mapUnlocked = true;
        SW.pledges.seedTutorialBoard(s);
        setBeat(s, '4) Open PLEDGES. Compare SAFE and AMBITIOUS: source, hold capacity, ETA, slack, exposure, bond, fare, and exact stock change are shown before commitment. Take one.',
          'Open PLEDGES and take the safe or ambitious promise.');
      },
      complete: function (s) { return !!s.tutorial.pledgeTaken; }
    },
    {
      id: 'pledge_delivery',
      enter: function (s) {
        const p = activePledge(s);
        setBeat(s, p ? ('5) Keep the Pledge: carry ' + p.qty + ' ' + D.COMMODITIES[p.c].name + ' from Sol to ' + p.toName + ' before tick ' + p.deadline + '. The same market delivery changes the world; the sealed promise scores WEAVE separately.') : '5) Complete the sealed Pledge.',
          p ? ('Deliver ' + p.qty + ' ' + D.COMMODITIES[p.c].name + ' to ' + p.toName + '.') : 'Complete the Pledge.');
      },
      complete: function (s) { return !!s.tutorial.pledgeCompleted; }
    },
    {
      id: 'automation',
      enter: function (s) {
        s.story.flags.routes_unlocked = true;
        if (s.ships.length < 2) {
          const loaner = SW.ships.create(s, 'sparrow', s.homeId, 'Bobbin');
          s.tutorial.loanerId = loaner.id;
          SW.game.news(s, 'The kept Pledge releases a Guild utility shuttle: Bobbin. One craft can work while the other learns the loop.', s.homeId);
        }
        setBeat(s, '6) AUTOMATE — open ROUTES, create a two-stop circular route between Sol and the pledged world, then assign a ship. Automation is a committed loop, not a faster manual order.',
          'Create a two-stop route and assign a ship.');
      },
      complete: function (s) { return s.routes.some(function (r) { return r.ships && r.ships.length > 0; }); }
    },
    {
      id: 'reserve',
      enter: function (s) {
        home(s).stocks.FOOD = Math.max(home(s).stocks.FOOD || 0, 20);
        setBeat(s, '7) RESERVE — at Sol, buy at least 2 Food and DROP it into the Depot. A reserve is capacity held against the next interruption, not idle waste.',
          'Hold 2 Food in Sol’s Depot.');
      },
      complete: function (s) { return ((home(s).depot && home(s).depot.FOOD) || 0) >= 2; }
    },
    {
      id: 'pressure',
      enter: function (s) {
        s.tutorial.pressureDeliveries = s.stats.deliveries || 0;
        s.tutorial.pressureReserve = depotTotal(s);
        const target = s.routes[0] && s.routes[0].stops[1] ? s.routes[0].stops[1].sys : s.homeId;
        const made = SW.objectives.create(s, {
          family: 'stabilize', sys: target, source: 'act0-pressure', need: 'FOOD',
          deadline: s.tick + 220, consequence: { kind: 'lane-flicker', lethal: false }
        });
        if (made.ok) s.tutorial.pressureObjectiveId = made.objective.id;
        SW.game.news(s, 'A lane flickers under load. No hull is at risk yet. Answer with a fresh delivery or deepen the reserve; the Thread records which response you chose.', target);
        setBeat(s, '8) PRESSURE — a lane flicker strains the new loop. Choose a real response: complete any fresh delivery, or add at least 1 more unit to Sol’s Depot reserve. Neither answer is cosmetic.',
          'Lane flicker: make one delivery or deepen the reserve.');
      },
      complete: function (s) {
        if ((s.stats.deliveries || 0) > s.tutorial.pressureDeliveries) { s.tutorial.pressureResponse = 'delivery'; resolvePressureObjective(s); return true; }
        if (depotTotal(s) > s.tutorial.pressureReserve) { s.tutorial.pressureResponse = 'reserve'; resolvePressureObjective(s); return true; }
        return false;
      }
    },
    {
      id: 'reroute',
      enter: function (s) {
        const r = s.routes[0];
        if (r) r.paused = true; // actual, nonlethal disruption on the live route
        s.tutorial.routeBefore = routeSignature(s);
        setBeat(s, '9) REROUTE — the affected loop is paused. Resume it after your reserve response, or replace/edit the route. The route signature must change before the lane can be trusted again.',
          'Resume or replace the paused route.');
      },
      complete: function (s) { return routeSignature(s) !== s.tutorial.routeBefore; }
    },
    {
      id: 'charter',
      enter: function (s) {
        SW.charters.openingDraft(s);
        setBeat(s, '10) DRAFT A CHARTER in PLEDGES. Charters are the four-slot build of a Thread: a few explicit rule changes chosen from a bounded pool, never a second tech tree.',
          'Open PLEDGES and draft one Charter.');
      },
      complete: function (s) { return !!(s.thread.build && s.thread.build.active.length); }
    },
    {
      id: 'stable_knot',
      enter: function (s) {
        s.tutorial.stableAt = s.tick;
        setBeat(s, '11) HOLD THE KNOT — keep one route staffed and running, 2+ reserve units at Sol, and your Charter active for 25 pulses. Stability is sustained state, not a button press.',
          'Keep route + reserve + Charter stable for 25 pulses.');
      },
      complete: function (s) {
        const stable = staffedRoute(s) && depotTotal(s) >= 2 && s.thread.build.active.length > 0;
        if (!stable) { s.tutorial.stableAt = s.tick; return false; }
        return s.tick >= s.tutorial.stableAt + 25;
      }
    }
  ];

  T.init = function (state, opts) {
    opts = opts || {};
    const free = state.ships.reduce(function (m, sh) { return Math.max(m, SW.ships.cap(state, sh) - SW.ships.cargoTotal(sh)); }, 1);
    state.tutorial = {
      active: true, act: 0, guidance: opts.guidance === 'brief' ? 'brief' : 'full',
      goal: -1, startedAt: state.tick, mapUnlocked: false, done: false,
      cargoTarget: Math.max(1, Math.min(D.TUNE.prologueOreBeat, free)), lastStipend: -999
    };
    const h = home(state);
    h.stocks.ALLOY = Math.max(h.stocks.ALLOY || 0, 45);
    h.stocks.ORE = Math.max(h.stocks.ORE || 0, 25);
    h.capacity.ORE = Math.max(h.capacity.ORE || 0, 200);
    state.credits += D.TUNE.prologueEscrow;
  };

  T.isActive = function (state) { return !!(state && state.tutorial && state.tutorial.active); };
  T.mapLocked = function (state) { return !!(T.isActive(state) && !state.tutorial.mapUnlocked); };
  T.goalIds = function () { return GOALS.map(function (g) { return g.id; }); };

  T.tick = function (state) {
    const tu = state.tutorial;
    if (!tu || !tu.active) return;
    if (tu.goal < 0) { tu.goal = 0; GOALS[0].enter(state); return; }

    // Deterministic no-dead-end support remains available throughout the Wake.
    if (state.ships.length === 0) {
      const msg = 'Your craft was lost. The Guild has covered a replacement Sparrow at Sol; build it, then continue the same beat.';
      tu.prompt = msg;
      if (state.story.objective !== msg) SW.story.setObjective(state, msg);
      if (state.tick - (tu.lastShipAid || -999) >= D.TUNE.prologueStipendEvery) {
        tu.lastShipAid = state.tick;
        const cost = SW.ships.hullCost(state, 'sparrow');
        if (state.credits < cost) state.credits = cost + 20;
      }
      tu.wasShipless = true;
      return;
    }
    if (tu.wasShipless) { tu.wasShipless = false; GOALS[tu.goal].enter(state); }
    if (state.credits < 40 && fleetCargo(state) < 1 && state.tick - (tu.lastStipend || -999) >= D.TUNE.prologueStipendEvery) {
      tu.lastStipend = state.tick;
      state.credits += D.TUNE.prologueStipend;
      SW.game.emit('toast', { kind: 'info', text: '◌ Guild recovery line: +' + D.TUNE.prologueStipend + '¤. The Wake cannot bankrupt its Thread.' });
    }

    const goal = GOALS[tu.goal];
    if (!goal) { finish(state, false); return; }
    if (goal.complete(state)) {
      tu.goal++;
      if (tu.goal >= GOALS.length) finish(state, false);
      else GOALS[tu.goal].enter(state);
    } else if (tu.prompt && state.story.objective !== tu.prompt) SW.story.setObjective(state, tu.prompt);
  };

  function capabilityFloor(state) {
    state.tutorial.mapUnlocked = true;
    state.story.flags.routes_unlocked = true;
    if (!state.thread.build.active.length) {
      SW.charters.openingDraft(state);
      SW.charters.draft(state, 'quick_ledger');
    }
    createBubbleNeeds(state);
  }

  function finish(state, skipped) {
    const tu = state.tutorial;
    capabilityFloor(state);
    tu.active = false;
    tu.done = true;
    tu.skipped = !!skipped;
    tu.completedAt = state.tick;
    SW.game.legacySet('prologue');
    if (SW.acts && SW.acts.active(state) && state.acts.suspended === 'act0') SW.acts.beginActOne(state);
    SW.story.setObjective(state, 'Act I · the Bubble opens. Three local needs are now live; choose the first promise your Thread can keep.');
    SW.game.news(state, 'The Wake holds. The camera pulls outward: three needs burn in the local Bubble, and the first Charter clock begins now.', state.homeId);
    SW.game.emit('tutorialComplete', { needs: tu.bubbleNeeds.slice(), skipped: !!skipped });
    SW.game.emit('toast', { kind: 'good', text: '✦ ACT I — THE BUBBLE. Three needs, one live Thread, and the Charter clock starts now.' });
  }

  T.skip = function (state) {
    if (!T.isActive(state)) return { ok: false, msg: 'Act 0 is not active.' };
    if (state.tutorial.goal > 1) return { ok: false, msg: 'Skip is available before the first flight; this Wake already carries your choices.' };
    finish(state, true);
    return { ok: true };
  };

  T.actOneSignature = function (state) {
    return {
      actsOn: !!(state.acts && state.acts.on), phase: state.acts && state.acts.phase,
      clockStarted: !!(state.acts && Number.isInteger(state.acts.clock)),
      routesUnlocked: !!(state.story && state.story.flags.routes_unlocked),
      charterCount: state.thread && state.thread.build ? state.thread.build.active.length : 0,
      bubbleNeeds: state.tutorial && state.tutorial.bubbleNeeds ? state.tutorial.bubbleNeeds.length : 0,
      mapUnlocked: !!(state.tutorial && state.tutorial.mapUnlocked)
    };
  };

  return T;
})();
