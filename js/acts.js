/* STARWEFT acts.js — the Act Ladder (REWEAVE §4). DOM-free.

   A *focused run* is 1..maxActs Guild Charter periods. Each act has a WEAVE
   quota and a tick clock, and a seeded Commission (its character). Meet the
   quota before the clock and the boundary opens: BANK the thread in good
   standing (a clean win), or PUSH — draft one of three Boons, take a harder
   quota, and widen your reach. Miss the clock and you are Cut. Lose the
   Loomship and you are Burned; lose the Heart and you are Eaten. Every ending
   gets an epitaph (LOOM §7).

   This whole subsystem is gated behind state.acts.on, so a classic / Long-Weave
   sandbox run (acts off) is completely untouched — the same code, two shapes.
   Commissions and Boons are drawn on the main seeded RNG at init and at each
   push (rare, journaled), so replay is exact. All additive state. */
var SW = globalThis.SW = globalThis.SW || {};

SW.acts = (function () {
  const A2 = {};
  const U = SW.util, D = SW.data;

  A2.active = function (state) { return !!(state && state.acts && state.acts.on); };

  A2.quotaOf = function (n) { return Math.round(D.ACTS.quotaBase * Math.pow(D.ACTS.quotaGrowth, n - 1)); };
  A2.clockLen = function (n) { return Math.round(D.ACTS.clockBase * Math.pow(D.ACTS.clockGrowth, n - 1)); };
  A2.progress = function (state) { return Math.max(0, (state.weave || 0) - (state.acts.startWeave || 0)); };
  A2.ticksLeft = function (state) { return Math.max(0, state.acts.clock - state.tick); };

  function drawCommission(state) {
    const used = state.acts.commissionsUsed || (state.acts.commissionsUsed = []);
    // act I is always the gentle 'open' loom so the game teaches before it tests
    if (state.acts.n === 1 && !used.length) { used.push('open'); return 'open'; }
    const pool = D.COMMISSION_IDS.filter(function (id) { return used.indexOf(id) < 0; });
    const pick = pool.length ? U.pick(state, pool) : U.pick(state, D.COMMISSION_IDS);
    used.push(pick);
    return pick;
  }

  A2.init = function (state) {
    if (!A2.active(state)) return;
    const a = state.acts;
    a.n = 1;
    a.startWeave = state.weave || 0;
    a.startTick = state.tick;
    a.quota = A2.quotaOf(1);
    a.clock = state.tick + A2.clockLen(1);
    a.aperture = 1;
    a.boons = a.boons || [];
    a.commission = drawCommission(state);
    a.boundary = false; a.summit = false; a.draft = [];
    a.lanesUsed = {}; a.completionsThisAct = 0; a.firstKeptDone = false;
    a.graceLeft = 0;
    a.history = a.history || [];
    // the WEFT core rides one hull — the Loomship. Losing it is death.
    if (state.ships && state.ships[0]) { state.loomshipId = state.ships[0].id; state.ships[0].loomship = true; }
    refreshGrace(state);
    setObjective(state);
    SW.game.news(state, 'The Menders’ Guild seals your first Charter: ' + D.COMMISSIONS[a.commission].name + '. ' + D.COMMISSIONS[a.commission].line, state.homeId);
  };

  // grace (a forgiven bust) resets to available at each act if the boon is held
  function refreshGrace(state) {
    state.acts.graceLeft = ownsBoon(state, 'grace') ? 1 : 0;
  }
  function ownsBoon(state, id) { return (state.acts.boons || []).indexOf(id) >= 0; }

  // ---- the modifier bag: commission fx folded with owned boon fx ----
  const IDENTITY = { chipMult: 1, threadBonus: 0, maxActiveBonus: 0, windowMult: 1, bondMult: 1,
    shortageChipMult: 1, frontChipMult: 1, tierChipMult: [1, 1, 1, 1],
    farThreadBonus: 0, tautThreadBonus: 0, firstlightX2: false, fifthSeal: false, streakCapBonus: 0 };
  A2.mods = function (state) {
    if (!A2.active(state)) return IDENTITY;
    const m = { chipMult: 1, threadBonus: 0, maxActiveBonus: 0, windowMult: 1, bondMult: 1,
      shortageChipMult: 1, frontChipMult: 1, tierChipMult: [1, 1, 1, 1],
      farThreadBonus: 0, tautThreadBonus: 0, firstlightX2: false, fifthSeal: false, streakCapBonus: 0 };
    const sources = [D.COMMISSIONS[state.acts.commission] && D.COMMISSIONS[state.acts.commission].fx];
    for (const id of (state.acts.boons || [])) sources.push(D.BOONS[id] && D.BOONS[id].fx);
    if (SW.founders) { const fo = SW.founders.current(state); if (fo) sources.push(fo.fx); }
    for (const fx of sources) {
      if (!fx) continue;
      if (fx.chipMult) m.chipMult *= fx.chipMult;
      if (fx.threadBonus) m.threadBonus += fx.threadBonus;
      if (fx.maxActiveBonus) m.maxActiveBonus += fx.maxActiveBonus;
      if (fx.windowMult) m.windowMult *= fx.windowMult;
      if (fx.bondMult) m.bondMult *= fx.bondMult;
      if (fx.shortageChipMult) m.shortageChipMult *= fx.shortageChipMult;
      if (fx.frontChipMult) m.frontChipMult *= fx.frontChipMult;
      if (fx.tierChipMult) for (let i = 0; i < 4; i++) m.tierChipMult[i] *= (fx.tierChipMult[i] || 1);
      if (fx.farThreadBonus) m.farThreadBonus += fx.farThreadBonus;
      if (fx.tautThreadBonus) m.tautThreadBonus += fx.tautThreadBonus;
      if (fx.firstlightX2) m.firstlightX2 = true;
      if (fx.fifthSeal) m.fifthSeal = true;
      if (fx.streakCapBonus) m.streakCapBonus += fx.streakCapBonus;
    }
    return m;
  };

  // read helpers used by pledges.js at take-time
  A2.maxActiveBonus = function (state) { return A2.mods(state).maxActiveBonus; };
  A2.windowMult = function (state) { return A2.mods(state).windowMult; };
  A2.bondMult = function (state) { return A2.mods(state).bondMult; };
  A2.streakCapBonus = function (state) { return A2.mods(state).streakCapBonus; };

  function isShortage(state, p) {
    const sys = state.systems[p.to]; if (!sys) return false;
    const cap = (sys.capacity && sys.capacity[p.c]) || D.TUNE.capDefault;
    return ((sys.stocks && sys.stocks[p.c]) || 0) / Math.max(1, cap) < 0.25;
  }
  function isFront(state, p) {
    const sys = state.systems[p.to]; if (!sys) return false;
    if (sys.scourge >= 1) return true;
    for (const nb of sys.links) if (state.systems[nb] && state.systems[nb].scourge >= 1) return true;
    return false;
  }

  // ---- the completion scorer (called by pledges.complete when acts are on) ----
  // Returns {chips, thread, weave} and mutates per-act counters. This is where
  // Commission × Boons × the haul cross-multiply — the synergy surface.
  A2.scoreCompletion = function (state, p, baseThread) {
    const m = A2.mods(state);
    let chips = p.chips * m.chipMult * (m.tierChipMult[(D.COMMODITIES[p.c].tier || 0)] || 1);
    if (m.shortageChipMult !== 1 && isShortage(state, p)) chips *= m.shortageChipMult;
    if (m.frontChipMult !== 1 && isFront(state, p)) chips *= m.frontChipMult;
    chips = Math.round(chips);

    let thread = baseThread + m.threadBonus;
    if (m.farThreadBonus && (p.hops || 0) >= 5) thread += m.farThreadBonus;
    if (m.tautThreadBonus && state.acts.lanesUsed[p.to]) thread += m.tautThreadBonus;
    if (m.firstlightX2 && !state.acts.firstKeptDone) thread *= 2;

    let weave = Math.round(chips * thread);
    const nextCount = (state.pledgeStats.completed || 0) + 1; // this completion's index
    if (m.fifthSeal && nextCount % 5 === 0) weave *= 2;

    // record per-act state
    state.acts.lanesUsed[p.to] = true;
    state.acts.completionsThisAct = (state.acts.completionsThisAct || 0) + 1;
    state.acts.firstKeptDone = true;
    return { chips: chips, thread: thread, weave: weave };
  };

  // a forgiven bust (Guild Grace boon). Returns true if the lapse was absorbed.
  A2.tryGrace = function (state) {
    if (!A2.active(state)) return false;
    if ((state.acts.graceLeft || 0) <= 0) return false;
    state.acts.graceLeft -= 1;
    return true;
  };

  function setObjective(state) {
    const a = state.acts;
    if (a.boundary) return; // boundary sets its own prompt
    const com = D.COMMISSIONS[a.commission];
    SW.story.setObjective(state, 'Act ' + roman(a.n) + ' · ' + com.name + ' — weave ' + U.fmt(a.quota) +
      ' (' + U.fmt(Math.round(A2.progress(state))) + ' so far) · ' + A2.ticksLeft(state) + ' ticks left');
  }
  function roman(n) { return ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'][n] || ('' + n); }
  A2.roman = roman;

  // ---- tick: watch for the quota (open the boundary) and keep the chip fresh ----
  A2.tick = function (state) {
    if (!A2.active(state) || state.gameOver) return;
    const a = state.acts;
    if (a.boundary) return; // waiting on the player's bank/push
    if (A2.progress(state) >= a.quota) { enterBoundary(state); return; }
    if (state.tick % 10 === 0) setObjective(state);
  };

  function enterBoundary(state) {
    const a = state.acts;
    a.boundary = true;
    state.paused = true;
    if (a.n >= D.ACTS.maxActs) {
      a.summit = true;
      a.draft = [];
      SW.game.news(state, 'The summit Charter is met. The Guild offers the choice: retire in glory, or pass into the Long Weave.', state.homeId);
      SW.story.setObjective(state, '◈ SUMMIT met — retire the thread, or graduate into the Long Weave.');
      SW.game.emit('toast', { kind: 'good', text: '◈ Act ' + roman(a.n) + ' summit met! Retire in good standing, or GRADUATE into the open Long Weave.' });
    } else {
      a.draft = draftBoons(state);
      SW.game.news(state, 'Act ' + roman(a.n) + ' Charter fulfilled. Bank the thread, or push on for a harder, richer Charter.', state.homeId);
      SW.story.setObjective(state, '◈ Act ' + roman(a.n) + ' met — BANK the thread, or PUSH into Act ' + roman(a.n + 1) + '.');
      SW.game.emit('toast', { kind: 'good', text: '◈ Act ' + roman(a.n) + ' quota met (' + U.fmt(a.quota) + ' WEAVE)! Bank the thread, or push on — draft a Boon in the Pledges tab.' });
    }
    SW.game.emit('sfx', 'victory');
  }

  function draftBoons(state) {
    const owned = state.acts.boons || [];
    const pool = D.BOON_IDS.filter(function (id) { return owned.indexOf(id) < 0; });
    // seeded shuffle, take draftSize
    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(U.rnd(state) * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr.slice(0, Math.min(D.ACTS.draftSize, arr.length));
  }

  // ---- push: draft a boon, advance to the next, harder Charter ----
  A2.push = function (state, boonId) {
    if (!A2.active(state)) return { ok: false, msg: 'Not a focused run.' };
    const a = state.acts;
    if (!a.boundary || a.summit) return { ok: false, msg: 'No Charter boundary is open.' };
    if (!boonId || a.draft.indexOf(boonId) < 0) return { ok: false, msg: 'Choose a boon from the draft.' };
    a.boons.push(boonId);
    // record the act just cleared
    a.history.push({ n: a.n, commission: a.commission, weave: Math.round(A2.progress(state)), ticks: state.tick - a.startTick, outcome: 'pushed' });
    a.n += 1;
    a.startWeave = state.weave;
    a.startTick = state.tick;
    a.quota = A2.quotaOf(a.n);
    a.clock = state.tick + A2.clockLen(a.n);
    a.aperture *= D.ACTS.apertureGrowth;
    a.commission = drawCommission(state);
    a.boundary = false; a.draft = [];
    a.lanesUsed = {}; a.completionsThisAct = 0; a.firstKeptDone = false;
    refreshGrace(state);
    state.perkPoints = (state.perkPoints || 0) + D.ACTS.boundaryPerk;
    widenReach(state);
    state.paused = false;
    const com = D.COMMISSIONS[a.commission], bn = D.BOONS[boonId];
    SW.game.news(state, 'Charter ' + roman(a.n) + ' sealed: ' + com.name + '. Boon drafted: ' + bn.name + '. The reach widens.', state.homeId);
    SW.game.emit('toast', { kind: 'good', text: '◈ Boon drafted: ' + bn.name + '. Act ' + roman(a.n) + ' — ' + com.name + ': quota ' + U.fmt(a.quota) + '. +1 aptitude point, reach widened.' });
    SW.game.emit('sfx', 'chime');
    setObjective(state);
    return { ok: true };
  };

  // reveal the nearest handful of unknown systems so the reach genuinely opens
  function widenReach(state) {
    const home = state.systems[state.homeId];
    const unknown = state.systems.filter(function (s) { return !s.discovered && !s.badlands; })
      .sort(function (x, y) { return U.dist(home, x) - U.dist(home, y); });
    for (const s of unknown.slice(0, 4)) { s.discovered = true; }
  }

  // ---- bank / retire: end the run in good standing (a clean win) ----
  A2.bank = function (state) {
    if (!A2.active(state)) return { ok: false, msg: 'Not a focused run.' };
    const a = state.acts;
    if (!a.boundary) return { ok: false, msg: 'You can only bank at a Charter boundary.' };
    a.history.push({ n: a.n, commission: a.commission, weave: Math.round(A2.progress(state)), ticks: state.tick - a.startTick, outcome: a.summit ? 'retired' : 'banked' });
    const retired = a.summit;
    end(state, {
      win: true, cut: retired ? 'retired' : 'banked',
      reason: (retired
        ? 'The summit holds. The Guild banks ' + tn(state) + ' in glory — ' + a.n + ' acts, ' + U.fmt(state.weave) + ' WEAVE. Rest the shuttle.'
        : 'Good weave. The Guild banks ' + tn(state) + ' in good standing — ' + a.n + ' act' + (a.n === 1 ? '' : 's') + ' kept, ' + U.fmt(state.weave) + ' WEAVE. Rest the shuttle.'),
    });
    return { ok: true };
  };

  // ---- graduate: leave the ladder, keep everything, continue in the Long Weave ----
  A2.graduate = function (state) {
    if (!A2.active(state)) return { ok: false, msg: 'Not a focused run.' };
    const a = state.acts;
    if (!a.boundary || !a.summit) return { ok: false, msg: 'Graduation opens only at the summit.' };
    a.history.push({ n: a.n, commission: a.commission, weave: Math.round(A2.progress(state)), ticks: state.tick - a.startTick, outcome: 'graduated' });
    a.on = false; a.boundary = false; a.summit = false; a.draft = [];
    state.paused = false;
    state.story.flags.graduated = true;
    SW.story.setObjective(state, 'The Long Weave: the network is yours. Weave without a clock.');
    SW.game.news(state, tn(state) + ' passes into the Long Weave, its network intact. The clock is gone; the work remains.', state.homeId);
    SW.game.emit('toast', { kind: 'good', text: '✦ Graduated into the Long Weave. Everything you built is yours — no quota, no clock. Keep weaving.' });
    SW.game.emit('sfx', 'victory');
    return { ok: true };
  };

  function tn(state) { return '“' + ((state.identity && state.identity.name) || 'the thread') + '”'; }

  // ---- deaths: the three cuts (+ bankruptcy). Called from game.checkEnd. ----
  A2.checkEnd = function (state) {
    if (!A2.active(state) || state.gameOver) return;
    const a = state.acts, home = state.systems[state.homeId];
    // Eaten — the Heart falls
    if (home && home.scourge === 2) {
      return end(state, { win: false, cut: 'eaten', reason: 'The Fray takes the Heart. ' + tn(state) + ' unravels from its first knot.' });
    }
    // Burned — the Loomship is destroyed (never merely scrapped; scrap is blocked)
    if (state.loomshipId != null && !state.ships.some(function (s) { return s.id === state.loomshipId; })) {
      return end(state, { win: false, cut: 'burned', reason: 'The Loomship is gone, and the WEFT core with it. ' + tn(state) + ' dies in the black.' });
    }
    // Cut — the Charter clock runs out with the quota unmet
    if (!a.boundary && state.tick > a.clock && A2.progress(state) < a.quota) {
      return end(state, { win: false, cut: 'cut', reason: 'The clock runs out. The Guild revokes the Charter and pulls ' + tn(state) + ' from the board — Act ' + roman(a.n) + ', quota unmet.' });
    }
    // Bankrupt — no ships and no means to build one (a soft, quiet end)
    if (state.ships.length === 0 && state.credits < SW.ships.hullCost(state, 'sparrow')) {
      return end(state, { win: false, cut: 'bankrupt', reason: 'No ships, no bond, no thread left to pull. ' + tn(state) + ' is quietly wound up.' });
    }
  };

  // epitaph one-liners (LOOM §7), keyed to the cut
  const EPITAPH = {
    cut: 'A thread cut is a thread remembered.',
    burned: 'It burned bright, and briefly, and far from home.',
    eaten: 'The Fray forgets what it unmakes. The Guild does not.',
    bankrupt: 'Even a short thread leaves a mark in the cloth.',
    banked: 'Warp holds. Weft moves. Rest now.',
    retired: 'The worlds it wove will keep its name.',
  };

  function end(state, go) {
    const a = state.acts;
    state.gameOver = {
      win: !!go.win, reason: go.reason, tick: state.tick,
      score: state.weave || 0,
      epitaph: {
        cut: go.cut, line: EPITAPH[go.cut] || 'The thread is remembered.',
        threadName: (state.identity && state.identity.name) || 'the thread',
        act: a.n, weave: state.weave || 0,
        commission: D.COMMISSIONS[a.commission] ? D.COMMISSIONS[a.commission].name : '',
        boons: (a.boons || []).map(function (id) { return D.BOONS[id] ? D.BOONS[id].name : id; }),
        actsCleared: (a.history || []).filter(function (h) { return h.outcome === 'pushed' || h.outcome === 'banked' || h.outcome === 'retired'; }).length,
      },
    };
    state.paused = true;
    SW.game.legacySet(go.win ? 'won' : 'thread_cut');
    SW.game.emit('gameover', state.gameOver);
    SW.game.emit('sfx', go.win ? 'victory' : 'defeat');
    return state.gameOver;
  }

  return A2;
})();
