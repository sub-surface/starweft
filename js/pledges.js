/* STARWEFT pledges.js — the core verb, scored. DOM-free.

   PLEDGE (REWEAVE §5, ratified 2026-07-16): a delivery is a *commitment*.
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
    const t = D.COMMODITIES[c] ? (D.COMMODITIES[c].tier || 0) : 0;
    const per = D.TUNE.pledgeTierChips[t] || D.TUNE.pledgeTierChips[0];
    return Math.round(qty * per * (1 + D.TUNE.pledgeDistChips * Math.max(0, distHops)));
  };
  // THREAD: the live multiplier the *next* completion would score at, given how
  // many pledges are held and the current streak. `extraHeld` lets the UI preview
  // "if I also take this one".
  P.thread = function (state, extraHeld) {
    P.ensure(state);
    const others = Math.max(0, state.pledges.length - 1 + (extraHeld || 0));
    const streakBonus = Math.min(D.TUNE.pledgeStreakCap, state.pledgeStreak * D.TUNE.pledgeStreakThread);
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
    const target = Math.max(1, Math.round(D.TUNE.pledgeBoardMax * trust));
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
    if (state.credits < o.bond) return { ok: false, msg: 'The bond is ' + U.fmt(o.bond) + '¤ — you cannot cover it.' };
    state.credits -= o.bond;
    state.board.splice(i, 1);
    const pledge = {
      id: 'pl' + (state.nextPledgeId++),
      c: o.c, qty: o.qty, to: o.to, toName: o.toName,
      hops: o.hops, chips: o.chips, fare: o.fare, bond: o.bond,
      taken: state.tick, deadline: state.tick + o.window,
      progress: 0,
    };
    state.pledges.push(pledge);
    SW.game.emit('toast', { kind: 'info', text: '◈ Pledge sealed: ' + o.qty + D.COMMODITIES[o.c].icon + ' to ' + o.toName + ' by tick ' + pledge.deadline + '. Bond ' + U.fmt(o.bond) + '¤.' });
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
    // Founders/Charters bend this later; a plain cap for now.
    return (state.pledgeMaxActiveBonus || 0) + D.TUNE.pledgeMaxActive;
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
    const thread = P.thread(state, 0);       // reads current held count + streak
    const weave = Math.round(p.chips * thread);
    state.pledges.splice(idx, 1);
    state.credits += p.fare + p.bond;        // fare paid, escrow returned
    state.weave += weave;
    state.pledgeStreak += 1;
    const ps = state.pledgeStats;
    ps.completed += 1;
    ps.weaveTotal += weave;
    ps.bestThread = Math.max(ps.bestThread || 0, thread);
    state.stats.pledgesKept = (state.stats.pledgesKept || 0) + 1;
    SW.game.emit('fx', { kind: 'floater', sysId: p.to, text: '+' + U.fmt(weave) + ' WEAVE', good: true });
    SW.game.emit('toast', {
      kind: 'good',
      text: '◈ Pledge kept: ' + p.toName + ' — +' + U.fmt(weave) + ' WEAVE (' + U.fmt(p.chips) + ' × ' + thread.toFixed(1) + '×), +' + U.fmt(p.fare + p.bond) + '¤. Streak ' + state.pledgeStreak + '.',
    });
    SW.game.emit('sfx', 'chime');
    SW.game.news(state, 'Pledge kept at ' + p.toName + ': ' + p.qty + ' ' + D.COMMODITIES[p.c].name + ' delivered. +' + U.fmt(weave) + ' WEAVE.', p.to);
  }

  function bust(state, p, idx, reason) {
    state.pledges.splice(idx, 1);
    state.pledgeStreak = 0;                   // the thread snaps
    state.pledgeStats.busted = (state.pledgeStats.busted || 0) + 1;
    state.stats.pledgesBust = (state.stats.pledgesBust || 0) + 1;
    SW.game.emit('toast', { kind: 'bad', text: '✂ Pledge broken: ' + p.toName + ' — ' + (reason || 'deadline missed') + '. Bond ' + U.fmt(p.bond) + '¤ forfeit, thread reset.' });
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
