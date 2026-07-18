/* STARWEFT pledges.js — the core verb, scored. DOM-free.

   PLEDGE (SPEC[RUN-PLEDGE]): a delivery is a *commitment*.
   You take a pledge from a Guild board — carry commodity C to system B before a
   deadline — and completing it scores WEAVE = TONNAGE x THREAD:

     TONNAGE (chips)  = quantity x commodity-tier weight x (1 + distance)
     THREAD  (mult)   = 1 + (other pledges held) + (completion streak)

   Holding several pledges at once lifts THREAD on *all* of them — the wager —
   but a missed deadline busts: streak to zero, bond forfeit, Guild trust down.
   Freely trading is still the economy (credits); only *pledged* deliveries
   score WEAVE, which is the act quota (acts land in a later step). This module
   owns the pledge state, the board, the scoring pipeline, and the bust clock;
   fulfilment is detected at the one seam every delivery passes through
   (S.sell -> P.onDeliver). Additive state, defensive init, no SAVE_VERSION bump.

   Determinism: board generation runs on a *dedicated* RNG sub-stream
   (state.pledgeRng), seeded from the run seed, so it is replayable but never
   perturbs the main U.rand stream — old seeded assertions are untouched. */
var SW = globalThis.SW = globalThis.SW || {};

SW.pledges = (function () {
  const P = {};
  const U = SW.util, D = SW.data;

  // ---- defensive init (new games AND old saves loading) ----
  P.ensure = function (state) {
    if (!state.pledges) state.pledges = [];       // active, taken pledges
    if (!state.board) state.board = [];           // open offers, not yet taken
    if (state.weave === undefined) state.weave = 0;       // cumulative score (the act currency)
    if (state.pledgeStreak === undefined) state.pledgeStreak = 0;
    if (state.pledgeRng === undefined) state.pledgeRng = U.seedFrom((state.seed || '0') + ':pledge');
    if (!state.pledgeStats) state.pledgeStats = { completed: 0, busted: 0, abandoned: 0, weaveTotal: 0, bestThread: 0 };
    if (state.nextPledgeId === undefined) state.nextPledgeId = 1;
    return state;
  };
  P.init = function (state) { P.ensure(state); };

  // dedicated deterministic sub-stream: never touches state.rngState.
  function prnd(state) {
    const sub = { rngState: state.pledgeRng };
    const x = U.rnd(sub);
    state.pledgeRng = sub.rngState;
    return x;
  }
  function ppick(state, arr) { return arr[Math.floor(prnd(state) * arr.length)]; }

  // ---- scoring primitives (pure, reused by UI previews) ----
  const TUNE = function () { return D.TUNE; };

  // TONNAGE: the chip base an offer is worth. One number feeds both the credit
  // fare and the WEAVE score, so the two never drift apart.
  P.chips = function (state, c, qty, distHops) {
    let t = D.COMMODITIES[c] ? (D.COMMODITIES[c].tier || 0) : 0;
    if (SW.founders) t = SW.founders.chipTier(state, c, t);
    const per = D.TUNE.pledgeTierChips[t] || D.TUNE.pledgeTierChips[D.TUNE.pledgeTierChips.length - 1];
    return Math.round(qty * per * (1 + D.TUNE.pledgeDistChips * Math.max(0, distHops)));
  };
  // THREAD: the live multiplier the *next* completion would score at, given how
  // many pledges are held and the current streak. `extraHeld` lets the UI preview
  // "if I also take this one".
  P.thread = function (state, extraHeld) {
    P.ensure(state);
    const others = Math.max(0, state.pledges.length - 1 + (extraHeld || 0));
    const cap = D.TUNE.pledgeStreakCap + ((SW.acts && SW.acts.active(state)) ? SW.acts.streakCapBonus(state) : 0);
    const streakBonus = Math.min(cap, state.pledgeStreak * D.TUNE.pledgeStreakThread);
    return 1 + others * D.TUNE.pledgeConcurrentThread + streakBonus;
  };
  P.fareOf = function (chips) { return Math.round(chips * D.TUNE.pledgeFarePerChip); };
  P.bondOf = function (chips) { return Math.round(P.fareOf(chips) * D.TUNE.pledgeBondFrac); };

  // ---- board generation ----
  // A destination is a discovered, uncorrupted, populated system; the pledged
  // good is what it is shortest on (lowest stock/capacity ratio among unlocked
  // commodities). Distance uses the destination's hop-depth from home as a cheap,
  // deterministic difficulty proxy. Far pledges are bigger and get more time.
  function unlockedComms(state) {
    return D.COMM_IDS.filter(function (c) {
      const cm = D.COMMODITIES[c];
      return !cm.locked || state.tech.unlocked.indexOf('panacea') >= 0;
    });
  }
  function neediestComm(state, sys) {
    const comms = unlockedComms(state);
    let best = null, bestRatio = 2;
    for (const c of comms) {
      const cap = (sys.capacity && sys.capacity[c]) || D.TUNE.capDefault;
      const ratio = ((sys.stocks && sys.stocks[c]) || 0) / Math.max(1, cap);
      // a good pledge good is one the destination consumes and lacks; skip goods
      // it produces (it doesn't need them hauled in).
      if (sys.prod && sys.prod[c]) continue;
      if (ratio < bestRatio) { bestRatio = ratio; best = c; }
    }
    return best;
  }
  function eligibleDest(state, sys) {
    return sys && sys.discovered && sys.scourge !== 2 && sys.pop > 0 && sys.id !== state.homeId;
  }
  function makeOffer(state) {
    const dests = state.systems.filter(function (s) { return eligibleDest(state, s); });
    if (!dests.length) return null;
    const sys = ppick(state, dests);
    const c = neediestComm(state, sys);
    if (!c) return null;
    const hops = Math.max(1, sys.hops || 1);
    const qty = Math.round(D.TUNE.pledgeQtyBase + D.TUNE.pledgeQtyPerHop * hops);
    const chips = P.chips(state, c, qty, hops);
    const window = Math.round(D.TUNE.pledgeWindowBase + D.TUNE.pledgeWindowPerHop * hops);
    return {
      id: 'of' + (state.nextPledgeId++),
      c: c, qty: qty, to: sys.id, toName: sys.name,
      hops: hops, chips: chips,
      fare: P.fareOf(chips), bond: P.bondOf(chips),
      window: window,               // ticks granted once taken
      ttl: state.tick + D.TUNE.pledgeOfferTtl, // board expiry if never taken
    };
  }

  P.refreshBoard = function (state) {
    P.ensure(state);
    // drop stale or now-invalid offers
    state.board = state.board.filter(function (o) {
      const sys = state.systems[o.to];
      return state.tick <= o.ttl && sys && sys.scourge !== 2;
    });
    // trust throttles how full the board runs (busting a pledge dims your boards)
    const trust = P.trust(state);
    const slotPenalty = SW.founders ? SW.founders.boardSlotPenalty(state) : 0;
    const target = Math.max(1, Math.round(D.TUNE.pledgeBoardMax * trust) - slotPenalty);
    let guard = 0;
    while (state.board.length < target && guard++ < 12) {
      const o = makeOffer(state);
      if (!o) break;
      // avoid two offers to the same destination on the same board
      if (state.board.some(function (x) { return x.to === o.to && x.c === o.c; })) continue;
      state.board.push(o);
    }
    return state.board;
  };

  // Deterministic Act 0 board: two honest choices, both feasible for every
  // starting craft. The route and physical stock are real; only the authored
  // labels distinguish the safer promise from the tighter one.
  P.seedTutorialBoard = function (state) {
    P.ensure(state);
    if (state.board.some(function (o) { return !!o.actZero; })) return state.board.filter(function (o) { return !!o.actZero; });
    const home = state.systems[state.homeId];
    let settled = state.systems.filter(function (s) { return s.id !== state.homeId && s.pop > 0 && s.scourge !== 2 && !s.badlands && SW.ships.inRange(state, s); })
      .sort(function (a, b) { return (a.hops || 999) - (b.hops || 999) || a.id - b.id; });
    if (!settled.length) {
      settled = state.systems.filter(function (s) { return s.id !== state.homeId && s.pop > 0 && s.scourge !== 2 && !s.badlands; })
        .sort(function (a, b) { return (a.hops || 999) - (b.hops || 999) || a.id - b.id; }).slice(0, 2);
      settled.forEach(function (s) { if (s.buildings.indexOf('relay') < 0) s.buildings.push('relay'); });
    }
    if (!settled.length) return [];
    const dests = [settled[0], settled[1] || settled[0]];
    const maxCap = Math.max(1, state.ships.reduce(function (m, sh) { return Math.max(m, SW.ships.cap(state, sh)); }, 1));
    home.stocks.ORE = Math.max(home.stocks.ORE || 0, 30);
    const kinds = [
      { tier: 'safe', qty: Math.min(2, maxCap), window: 240 },
      { tier: 'ambitious', qty: Math.min(4, maxCap), window: 165 }
    ];
    const made = kinds.map(function (kind, i) {
      const sys = dests[i];
      const path = SW.ships.findPath(state, state.homeId, sys.id) || [state.homeId, sys.id];
      path.forEach(function (id) { if (state.systems[id]) state.systems[id].discovered = true; });
      sys.discovered = true;
      sys.capacity.ORE = Math.max(sys.capacity.ORE || 0, 30);
      sys.stocks.ORE = Math.min(sys.stocks.ORE || 0, sys.capacity.ORE - kind.qty - 4);
      const hops = Math.max(1, path.length - 1);
      const chips = P.chips(state, 'ORE', kind.qty, hops);
      return {
        id: 'of' + (state.nextPledgeId++), c: 'ORE', qty: kind.qty,
        to: sys.id, toName: sys.name, hops: hops, chips: chips,
        fare: P.fareOf(chips), bond: P.bondOf(chips), window: kind.window,
        ttl: state.tick + 9999, actZero: true, tutorialTier: kind.tier, source: state.homeId
      };
    });
    state.board = state.board.filter(function (o) { return !o.actZero; }).concat(made);
    return made;
  };

  P.preflight = function (state, offer) {
    const destination = state.systems[offer.to];
    let source = Number.isInteger(offer.source) ? state.systems[offer.source] : null;
    if (!source) {
      source = state.systems.filter(function (sys) {
        return sys.discovered && sys.scourge !== 2 && ((sys.stocks && sys.stocks[offer.c]) || 0) >= Math.min(offer.qty, 1);
      }).sort(function (a, b) {
        return SW.economy.buyPrice(state, a, offer.c, 'player') - SW.economy.buyPrice(state, b, offer.c, 'player') || a.id - b.id;
      })[0] || state.systems[state.homeId];
    }
    const ship = state.ships.filter(function (sh) { return (D.HULLS[sh.hull].cap || 0) > 0; })
      .sort(function (a, b) { return SW.ships.speed(state, b) - SW.ships.speed(state, a); })[0];
    const path = source && destination ? SW.ships.findPath(state, source.id, destination.id) : null;
    let eta = 0;
    if (ship && path) for (let i = 1; i < path.length; i++) eta += Math.max(2, Math.round(U.dist(state.systems[path[i - 1]], state.systems[path[i]]) / SW.ships.speed(state, ship)));
    const capacity = ship ? SW.ships.cap(state, ship) : 0;
    const exposed = path && path.some(function (id) {
      const sys = state.systems[id]; return sys && (sys.scourge >= 1 || sys.region === 'reach');
    });
    const cap = destination ? ((destination.capacity && destination.capacity[offer.c]) || D.TUNE.capDefault) : 1;
    const before = destination ? ((destination.stocks && destination.stocks[offer.c]) || 0) : 0;
    const effectiveBond = Math.round(offer.bond * ((SW.acts && SW.acts.active(state)) ? SW.acts.bondMult(state) : 1));
    return {
      source: source ? source.name : 'unknown source', capacity: capacity,
      eta: eta, slack: Math.max(0, offer.window - eta), exposure: exposed ? 'exposed' : 'calm',
      stake: effectiveBond, baseStake: offer.bond, fare: offer.fare,
      worldEffect: destination ? (destination.name + ' ' + D.COMMODITIES[offer.c].name + ' stock ' + Math.round(before) + '→' + Math.round(Math.min(cap, before + offer.qty)) + ' / ' + Math.round(cap)) : 'destination unavailable'
    };
  };

  // Guild trust: 1.0 pristine; each recent bust dims it, recovering over time.
  P.trust = function (state) {
    P.ensure(state);
    const busts = state.pledgeStats.busted || 0;
    const done = state.pledgeStats.completed || 0;
    // trust reads recent reliability, floored so the board is never empty.
    const t = 1 - 0.12 * Math.max(0, busts - Math.floor(done / 3));
    return Math.max(0.4, Math.min(1, t));
  };

  // ---- taking / abandoning (called by journaled actions in game.js) ----
  P.take = function (state, offerId) {
    P.ensure(state);
    const i = state.board.findIndex(function (o) { return o.id === offerId; });
    if (i < 0) return { ok: false, msg: 'That pledge is no longer on the board.' };
    const o = state.board[i];
    if (state.pledges.length >= P.maxActive(state)) {
      return { ok: false, msg: 'Your manifest is full (' + P.maxActive(state) + ' pledges). Complete or abandon one first.' };
    }
    const sys = state.systems[o.to];
    if (!sys || sys.scourge === 2) return { ok: false, msg: 'The destination is lost.' };
    // acts bend the terms: boons can stretch the clock or halve the bond
    const windowMult = (SW.acts && SW.acts.active(state)) ? SW.acts.windowMult(state) : 1;
    const bondMult = (SW.acts && SW.acts.active(state)) ? SW.acts.bondMult(state) : 1;
    const charged = Math.round(o.bond * bondMult);
    if (state.credits < charged) return { ok: false, msg: 'The bond is ' + U.fmt(charged) + '¤ — you cannot cover it.' };
    state.credits -= charged;
    state.board.splice(i, 1);
    const pledge = {
      id: 'pl' + (state.nextPledgeId++),
      c: o.c, qty: o.qty, to: o.to, toName: o.toName,
      hops: o.hops, chips: o.chips, fare: o.fare, bond: charged,
      taken: state.tick, deadline: state.tick + Math.round(o.window * windowMult),
      progress: 0,
    };
    state.pledges.push(pledge);
    if (state.tutorial && state.tutorial.active && o.actZero) {
      state.tutorial.pledgeTaken = pledge.id;
      state.tutorial.pledgeTier = o.tutorialTier;
    }
    SW.game.emit('toast', { kind: 'info', text: '◈ Pledge sealed: ' + o.qty + D.COMMODITIES[o.c].icon + ' to ' + o.toName + ' by tick ' + pledge.deadline + '. Bond ' + U.fmt(charged) + '¤.' });
    SW.game.emit('sfx', 'click');
    return { ok: true, pledge: pledge };
  };

  P.abandon = function (state, pledgeId) {
    P.ensure(state);
    const i = state.pledges.findIndex(function (p) { return p.id === pledgeId; });
    if (i < 0) return { ok: false, msg: 'No such pledge.' };
    const p = state.pledges[i];
    state.pledges.splice(i, 1);
    state.pledgeStreak = 0;                 // abandoning breaks the thread, like a bust
    state.pledgeStats.abandoned = (state.pledgeStats.abandoned || 0) + 1;
    SW.game.emit('toast', { kind: 'bad', text: '✂ Pledge to ' + p.toName + ' abandoned. Bond of ' + U.fmt(p.bond) + '¤ forfeit; the thread breaks.' });
    return { ok: true };
  };

  P.maxActive = function (state) {
    // Founders/Charters bend this later; Commissions and Boons bend it now.
    let bonus = state.pledgeMaxActiveBonus || 0;
    if (SW.acts && SW.acts.active(state)) bonus += SW.acts.maxActiveBonus(state);
    return bonus + D.TUNE.pledgeMaxActive;
  };

  // ---- fulfilment seam (called from S.sell for every delivery) ----
  // A delivery of `qty` of `c` at `sysId` advances any matching pledge; partial
  // deliveries persist and stack until the quota is met.
  P.onDeliver = function (state, sysId, c, qty) {
    if (!state.pledges || !state.pledges.length) return;
    for (let i = state.pledges.length - 1; i >= 0; i--) {
      const p = state.pledges[i];
      if (p.to !== sysId || p.c !== c) continue;
      p.progress += qty;
      if (p.progress + 1e-6 >= p.qty) complete(state, p, i);
    }
  };

  function complete(state, p, idx) {
    let thread = P.thread(state, 0);         // reads current held count + streak
    let chips = p.chips;
    let weave;
    // acts fold Commission × Boons into the score (the synergy surface)
    if (SW.acts && SW.acts.active(state)) {
      const r = SW.acts.scoreCompletion(state, p, thread);
      chips = r.chips; thread = r.thread; weave = r.weave;
    } else {
      weave = Math.round(chips * thread);
    }
    state.pledges.splice(idx, 1);
    state.credits += p.fare + p.bond;        // fare paid, escrow returned
    state.weave += weave;
    state.pledgeStreak += 1;
    const ps = state.pledgeStats;
    ps.completed += 1;
    ps.weaveTotal += weave;
    ps.bestThread = Math.max(ps.bestThread || 0, thread);
    state.stats.pledgesKept = (state.stats.pledgesKept || 0) + 1;
    if (state.tutorial && state.tutorial.active) {
      state.tutorial.pledgeCompleted = true;
      state.tutorial.lastPledgeOutcome = { to: p.to, commodity: p.c, qty: p.qty, weave: weave, fare: p.fare, bond: p.bond };
    }
    SW.game.emit('fx', { kind: 'floater', sysId: p.to, text: '+' + U.fmt(weave) + ' WEAVE', good: true });
    SW.game.emit('toast', {
      kind: 'good',
      text: '◈ Pledge kept: ' + p.toName + ' — +' + U.fmt(weave) + ' WEAVE (' + U.fmt(chips) + ' × ' + thread.toFixed(1) + '×), +' + U.fmt(p.fare + p.bond) + '¤. Streak ' + state.pledgeStreak + '.',
    });
    SW.game.emit('sfx', 'chime');
    SW.game.news(state, 'Pledge kept at ' + p.toName + ': ' + p.qty + ' ' + D.COMMODITIES[p.c].name + ' delivered. +' + U.fmt(weave) + ' WEAVE.', p.to);
  }

  function bust(state, p, idx, reason) {
    // Guild Grace (a boon): the first bust each act is forgiven — bond back, thread intact
    if (SW.acts && SW.acts.active(state) && SW.acts.tryGrace(state)) {
      state.pledges.splice(idx, 1);
      state.credits += p.bond;
      SW.game.emit('toast', { kind: 'info', text: '◈ Guild Grace: the lapse at ' + p.toName + ' is forgiven — bond returned, the thread holds.' });
      SW.game.news(state, 'Guild Grace absorbs a broken pledge at ' + p.toName + '. Once per act, mercy.', p.to);
      return;
    }
    state.pledges.splice(idx, 1);
    state.pledgeStreak = 0;                   // the thread snaps
    state.pledgeStats.busted = (state.pledgeStats.busted || 0) + 1;
    state.stats.pledgesBust = (state.stats.pledgesBust || 0) + 1;
    // Underwriter: a bust forfeits double the bond — the bond itself is
    // already lost (it just isn't returned, unlike complete()); this is the
    // *extra* debit on top of that, clamped so credits never go negative.
    const extra = SW.founders ? SW.founders.bustForfeitExtra(state, p.bond) : 0;
    if (extra > 0) state.credits = Math.max(0, state.credits - extra);
    SW.game.emit('toast', { kind: 'bad', text: '✂ Pledge broken: ' + p.toName + ' — ' + (reason || 'deadline missed') + '. Bond ' + U.fmt(p.bond) + '¤ forfeit' + (extra > 0 ? ' (double, ' + U.fmt(extra) + '¤ more)' : '') + ', thread reset.' });
    SW.game.emit('sfx', 'error');
    SW.game.news(state, 'A pledge to ' + p.toName + ' lapsed. The Guild remembers.', p.to);
  }

  // ---- tick: refresh the board, run the deadline clock, prune the lost ----
  P.tick = function (state) {
    P.ensure(state);
    // deadline + validity clock for held pledges
    for (let i = state.pledges.length - 1; i >= 0; i--) {
      const p = state.pledges[i];
      const sys = state.systems[p.to];
      if (!sys || sys.scourge === 2) { bust(state, p, i, 'the destination fell to the Scourge'); continue; }
      if (state.tick > p.deadline) { bust(state, p, i, 'deadline missed'); continue; }
    }
    // board refresh cadence
    if (state.tick % D.TUNE.pledgeBoardEvery === 0) P.refreshBoard(state);
  };

  // ---- read helpers for UI ----
  P.ticksLeft = function (state, p) { return Math.max(0, p.deadline - state.tick); };
  P.offersAt = function (state, sysId) {
    P.ensure(state);
    return state.board.filter(function (o) { return o.to === sysId; });
  };

  return P;
})();
