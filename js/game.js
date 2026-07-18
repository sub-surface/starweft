/* STARWEFT game.js — state, actions API, tick pipeline, save/load. DOM-free. */
var SW = globalThis.SW = globalThis.SW || {};

SW.game = (function () {
  const U = SW.util, D = SW.data;
  const G = {};

  G.state = null;
  G.fx = [];            // transient render effects (not saved)
  G.handlers = {};      // UI hooks: toast, fx, event, sfx, objective, gameover
  const ACCOUNT_KEY = 'starweft_v3_account';
  const CAMPAIGN_INDEX_KEY = 'starweft_v3_campaign_index';
  const SAVE_TXN_KEY = 'starweft_v3_save_transaction';

  G.emit = function (type, payload) {
    if (G._replaying) return;
    if (type === 'fx') { G.fx.push(Object.assign({ at: Date.now ? 0 : 0 }, payload)); if (G.fx.length > 60) G.fx.shift(); }
    const h = G.handlers[type];
    if (h) { try { h(payload); } catch (e) { /* UI hiccups must not kill the sim */ } }
  };

  // ---- Account / Chronicle (stored independently from campaign saves) ----
  G._account = null;
  G.accountState = function () {
    if (G._account) return G._account;
    const s = storage();
    let saved = null, legacy = {};
    if (s) {
      const recovery = recoverSaveTransaction(s);
      G._saveRecovery = recovery;
      try { saved = JSON.parse(s.getItem(ACCOUNT_KEY) || 'null'); } catch (e) { saved = null; }
      if (!saved || SW.campaign.validateAccount(saved).length) {
        try { saved = JSON.parse(s.getItem(ACCOUNT_KEY + ':previous') || 'null'); } catch (e) { saved = null; }
      }
      if (!saved || SW.campaign.validateAccount(saved).length) saved = null;
      try { legacy = JSON.parse(s.getItem('starweft_legacy') || '{}'); } catch (e) { legacy = {}; }
    }
    G._account = SW.campaign.account(saved, legacy);
    return G._account;
  };
  G.saveAccount = function () {
    const s = storage();
    const account = G.accountState();
    const errors = SW.campaign.validateAccount(account);
    if (errors.length) return { ok: false, msg: errors.join('; ') };
    if (!s) return { ok: true, memory: true };
    try {
      const raw = JSON.stringify(account);
      s.setItem(ACCOUNT_KEY + ':tmp', raw);
      JSON.parse(s.getItem(ACCOUNT_KEY + ':tmp'));
      const prior = s.getItem(ACCOUNT_KEY);
      if (prior) {
        try {
          const parsedPrior = JSON.parse(prior);
          if (SW.campaign.validateAccount(parsedPrior).length === 0) s.setItem(ACCOUNT_KEY + ':previous', prior);
        } catch (e) { /* retain the existing known-good previous account */ }
      }
      s.setItem(ACCOUNT_KEY, raw);
      JSON.parse(s.getItem(ACCOUNT_KEY));
      s.removeItem(ACCOUNT_KEY + ':tmp');
      return { ok: true };
    } catch (e) { return { ok: false, msg: 'Account save failed: ' + e.message }; }
  };
  G.legacy = function () {
    return G.accountState().chronicle.flags;
  };
  G.legacySet = function (flag) {
    if (G._replaying) return;
    const cur = G.legacy();
    if (cur[flag]) return;
    cur[flag] = true;
    G.saveAccount();
    G.emit('toast', { kind: 'good', text: '★ Legacy unlocked: new origins may be available on your next run.' });
  };
  G.originUnlocked = function (originId) {
    const o = D.ORIGINS[originId];
    if (!o) return false;
    if (!o.locked) return true;
    return !!G.legacy()[o.locked];
  };

  // ---- Canonical launch contract ----
  // The primary front door speaks only in archetype + pressure. This adapter is
  // deliberately pure: Custom/Sandbox and old replays can still pass the wider
  // option shape directly to newGame, while canonical callers get one stable
  // recipe that can be serialized and replayed exactly.
  G.canonicalLaunch = function (opts) {
    opts = opts || {};
    const archetype = D.ARCHETYPES[opts.archetype] ? opts.archetype : 'courier';
    const pressure = D.PRESSURE[opts.pressure] ? opts.pressure : 'standard';
    const def = D.ARCHETYPES[archetype];
    return {
      seed: opts.seed,
      archetype: archetype,
      pressure: pressure,
      difficulty: D.PRESSURE[pressure].difficulty,
      origin: def.origin,
      founder: def.founder,
      acts: true,
      tutorial: true,
      guidance: opts.guidance === 'brief' ? 'brief' : 'full',
      identity: opts.identity || undefined
    };
  };

  const THREAD_NAME_A = ['Patient', 'Lantern', 'Far', 'Quiet', 'Bright', 'Tidal', 'Unbroken', 'Errant'];
  const THREAD_NAME_B = ['Thread', 'Ferry', 'Skein', 'Passage', 'Knot', 'Relay', 'Weft', 'Span'];
  G.threadName = function (seed, archetype) {
    const h = U.seedFrom(String(seed) + ':thread-name:' + String(archetype || 'courier')) >>> 0;
    return 'The ' + THREAD_NAME_A[h % THREAD_NAME_A.length] + ' ' + THREAD_NAME_B[(h >>> 5) % THREAD_NAME_B.length];
  };

  // ---- New game ----
  G.newGame = function (opts) {
    opts = opts || {};
    const seed = opts.seed !== undefined ? String(opts.seed) : String(Math.floor((typeof performance !== 'undefined' ? performance.now() : 1234) * 1000) % 1e9);
    const archetypeId = D.ARCHETYPES[opts.archetype] ? opts.archetype : null;
    const archetype = archetypeId ? D.ARCHETYPES[archetypeId] : null;
    const pressure = D.PRESSURE[opts.pressure] ? opts.pressure : null;
    const difficulty = D.DIFFICULTY[opts.difficulty] ? opts.difficulty : 'standard';
    const requestedOrigin = (archetype && archetype.origin) || opts.origin;
    const originId = (D.ORIGINS[requestedOrigin] && (archetype || G._replaying || G.originUnlocked(requestedOrigin))) ? requestedOrigin : 'courier';
    const origin = D.ORIGINS[originId];
    // Founder (SPEC[RUN-FOUNDERS]): orthogonal to Origin, chosen only for a Focused
    // (Act Ladder) run — the Long Weave sandbox has no use for a rule-bend
    // with no acts to bend. All three ● founders are unlocked at zero (the
    // other five are Chronicle-gated, R8).
    const requestedFounder = (archetype && archetype.founder) || opts.founder;
    const founderId = (opts.acts && D.FOUNDERS[requestedFounder]) ? requestedFounder : null;
    const founder = founderId ? D.FOUNDERS[founderId] : null;
    // Threat (scourge clock, decoupled from difficulty) and weave conditions
    // (stackable modifiers). Both default to harmless/empty for old callers.
    const threat = D.THREAT[opts.threat] ? opts.threat : 'inherit';
    const conditions = Array.isArray(opts.conditions)
      ? opts.conditions.filter(function (c) { return !!D.CONDITIONS[c]; })
      : [];
    const doctrineLean = (D.DOCTRINE_DISCOUNT && D.DOCTRINE_DISCOUNT[opts.doctrineLean]) ? opts.doctrineLean : null;
    const startCreditsBonus = conditions.reduce(function (sum, c) {
      const fx = D.CONDITIONS[c] && D.CONDITIONS[c].fx; return sum + ((fx && fx.startCreditsBonus) || 0);
    }, 0);
    const account = G.accountState();
    const campaignId = opts.campaignId || ('weave-' + (U.seedFrom(seed) >>> 0).toString(16).padStart(8, '0') + '-' + (account.nextCampaign || 1));
    const state = SW.campaign.create({
      version: D.SAVE_VERSION,
      seed: seed,
      rngState: U.seedFrom(seed),
      difficulty: difficulty,
      pressure: pressure,
      archetype: archetypeId,
      threat: threat,
      conditions: conditions,
      doctrineLean: doctrineLean,
      daily: (typeof opts.daily === 'string') ? opts.daily : null,
      origin: originId,
      founder: founderId,
      identity: Object.assign({ name: G.threadName(seed, archetypeId), hue: 195, sigil: U.seedFrom(seed) % 1000, motto: 'Finish the round.', myth: 'none' }, opts.identity || {}),
      tick: 0, paused: true, speed: 1,
      credits: Math.max(150, D.DIFFICULTY[difficulty].startCredits + (origin.credits || 0) + (founder ? (founder.credits || 0) : 0) + (archetype ? (archetype.credits || 0) : 0) + startCreditsBonus),
      research: 0,
      nextId: 1,
      systems: [], ships: [], routes: [], directives: [], rivals: [],
      stats: { deliveries: 0, creditsEarned: 0, shipsBuilt: 0, shipsLost: 0, systemsLost: 0, popLost: 0, popSaved: 0, techs: 0, researchEarned: 0 },
      tech: { unlocked: Array.from(new Set((origin.techs || []).concat((archetype && archetype.techs) || []))) },
      gameOver: null,
      bookmarks: [],
      perks: [], perkPoints: 0, milestones: {}, scourgeStance: null,
      world: D.resolveWorld(opts.world),
      news: [],
      journal: [],
      laneFlow: {},
      // The Act Ladder (SPEC[RUN-ACTS]): a focused run threads acts with quotas and
      // clocks. Absent/off => a classic Long-Weave sandbox run (unchanged).
      acts: opts.acts ? { on: true } : null,
    }, { campaignId: campaignId, accountId: account.id });
    SW.galaxy.generate(state);
    // Generation streams never leak their draw counts into play. Runtime starts
    // from its own named layer after the physical galaxy has committed.
    state.rngState = state.campaign.seeds.runtime;
    SW.story.init(state);
    SW.scourge.init(state);
    SW.rivals.init(state);
    SW.combat.init(state);
    SW.worldevents.init(state);
    if (SW.pledges) SW.pledges.init(state);

    // origin effects
    for (const f in (origin.rep || {})) state.rep[f] = origin.rep[f];
    if (origin.infamy) state.infamy = origin.infamy;
    if (origin.surveyBonus) state.originBonusSurvey = true;

    // weave conditions — one-time setup effects (recurring effects read fx live)
    if (D.condHas(state, 'scarcityStart')) {
      // Pick one widely-consumed commodity (seeded) and drain it galaxy-wide.
      const consumed = D.COMM_IDS.filter(function (c) { return !D.COMMODITIES[c].locked; });
      if (consumed.length) {
        state.scarceCommodity = consumed[Math.floor(U.rnd(state) * consumed.length)];
        for (const sys of state.systems) {
          if (sys.stocks && sys.stocks[state.scarceCommodity] !== undefined) {
            sys.stocks[state.scarceCommodity] = Math.round(sys.stocks[state.scarceCommodity] * 0.2);
          }
        }
      }
    }
    // character builder: one free tier-1 aptitude shapes the opening hours
    if (opts.aptitude && D.PERKS[opts.aptitude] && !D.PERKS[opts.aptitude].req) state.perks.push(opts.aptitude);
    if (origin.scourgeEarlier && state.scourge.startAt > 0) state.scourge.startAt = Math.max(120, state.scourge.startAt - origin.scourgeEarlier);
    let startSys = state.homeId;
    // The Heart — where you wake, and where HOME actually is. 'home' keeps Sol
    // (the prologue's stage and the narrative anchor). 'rim' and 'drift'
    // *relocate state.homeId itself* to the chosen system, so it becomes your
    // true home: the range anchor, the guaranteed shipyard (A.buyShip allows
    // building at homeId), and where the camera centres. Sol stops being the
    // universal centre. The start neighbourhood is seeded, so it isn't always
    // the same place. origin.startReach composes on top below.
    // Canonical Act 0 is the wake-at-home beat, so it pins the Heart to Sol
    // regardless of the dial (rim/drift are for the open-galaxy start).
    const heart = opts.tutorial ? 'home' : ((state.world && state.world.heart) || 'home');
    // helper: adopt `sysId` as the new home — reveal its neighbourhood, ensure
    // it can anchor range + build ships (a relay grants range from anywhere).
    function relocateHome(sysId, claimable) {
      const s0 = state.systems[sysId];
      state.homeId = sysId;
      s0.discovered = true; s0.surveyed = true;
      for (const nb of s0.links) { state.systems[nb].discovered = true; state.systems[nb].surveyed = true; }
      // a beacon so command range reaches out from the new home like Sol's does
      if (s0.buildings.indexOf('relay') < 0) s0.buildings.push('relay');
      if (claimable) {
        // a drift home is an unsettled star you claim: seed it the toehold an
        // inhabited world would already have, so the run is playable from tick 0
        s0.pop = Math.max(s0.pop || 0, 0.4);
        s0.prosperity = Math.max(s0.prosperity || 0, 45);
      }
    }
    if (heart === 'rim') {
      // a far, settled world — picked from the farthest handful (seeded), so the
      // rim start varies between galaxies rather than always the single farthest.
      const settled = state.systems.filter(function (s) {
        return s.id !== state.homeId && !s.wonder && s.type !== 'frontier' && s.scourge === 0 && s.pop > 0;
      }).sort(function (a, b) { return b.hops - a.hops; });
      const pool = settled.slice(0, Math.max(1, Math.min(6, settled.length)));
      if (pool.length) { startSys = pool[Math.floor(U.rnd(state) * pool.length)].id; relocateHome(startSys, false); }
    } else if (heart === 'drift') {
      // an unsettled star, far enough out to feel like the dark — claim it.
      const cands = state.systems.filter(function (s) {
        return s.id !== state.homeId && !s.wonder && !s.badlands && s.type === 'frontier' && s.hops >= 3;
      });
      if (cands.length) { startSys = cands[Math.floor(U.rnd(state) * cands.length)].id; relocateHome(startSys, true); state.story.flags.heart_drift = true; }
    }
    // The Heart may grant a small starting purse (drift wakes you with nothing
    // but credits to claim a home with).
    const heartDef = D.HEART[heart];
    if (heartDef && heartDef.credits) state.credits += heartDef.credits;
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
    if (founder && founder.startBelt) {
      // "starts in the belt": a nearby ore-producing world, not a new map
      // feature — the belt is wherever the seed already put the ore.
      const belt = state.systems.filter(function (s) {
        return s.id !== state.homeId && s.prod && s.prod.ORE > 0 && (s.hops || 0) <= 6;
      }).sort(function (a, b) { return (a.hops || 0) - (b.hops || 0); });
      if (belt.length) {
        const s0 = belt[Math.floor(U.rnd(state) * Math.min(4, belt.length))];
        startSys = s0.id;
        s0.discovered = true; s0.surveyed = true;
        for (const nb of s0.links) state.systems[nb].discovered = true;
      }
    }
    ((archetype && archetype.ships) || (founder && founder.ships) || origin.ships || ['sparrow']).forEach(function (h, i) {
      SW.ships.create(state, h, startSys, i === 0 ? 'Stitch' : undefined);
    });
    if (archetype && archetype.cargo && state.ships[0]) {
      Object.keys(archetype.cargo).forEach(function (c) { state.ships[0].cargo[c] = archetype.cargo[c]; });
    }
    // Founding Myth — a single line of lore on the run's opening ticker. Pure
    // flavor; events may read state.identity.myth for tinted text later.
    const myth = D.MYTHS && D.MYTHS[state.identity.myth];
    if (myth && myth.line) G.news(state, myth.line, startSys);
    // The Sol cold open — only when explicitly requested (never for bots/tests)
    if (opts.tutorial && SW.tutorial) SW.tutorial.init(state, { guidance: opts.guidance || 'full' });
    // The Act Ladder seals its first Charter once ships exist (Loomship = flagship).
    if (state.acts && state.acts.on && SW.acts) SW.acts.init(state);
    SW.charters.ensure(state);
    SW.objectives.initializeGeneration(state);
    SW.aperture.init(state, startSys);
    state.thread.launch = {
      version: 1,
      campaignId: state.campaign.id,
      seed: seed,
      difficulty: difficulty,
      pressure: pressure,
      archetype: archetypeId,
      origin: originId,
      founder: founderId,
      threat: threat,
      conditions: conditions.slice(),
      doctrineLean: doctrineLean,
      daily: state.daily,
      identity: JSON.parse(JSON.stringify(state.identity)),
      world: JSON.parse(JSON.stringify(state.world)),
      aptitude: opts.aptitude || null,
      tutorial: !!opts.tutorial,
      guidance: opts.guidance || null,
      acts: !!opts.acts,
      runtimeSeed: state.campaign.seeds.runtime
    };
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
    state.thread.elapsedTicks = state.tick;
    SW.aperture.beforeTick(state);
    SW.economy.tick(state);
    SW.ships.tick(state);
    tickProjects(state);
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
    // The Fray is still part of every canonical pressure, including Guided,
    // but cannot silently consume the Heart while Act 0 is teaching. The first
    // real Fray pulse happens under Act I's visible clock.
    if (!(SW.tutorial && SW.tutorial.isActive(state))) SW.scourge.tick(state);
    SW.worldevents.tick(state);
    if (SW.pledges) SW.pledges.tick(state);
    if (SW.acts && SW.acts.active(state)) SW.acts.tick(state);
    SW.story.tick(state);
    if (SW.tutorial) SW.tutorial.tick(state);
    tickStrandedGuard(state);
    SW.perks.tick(state);
    SW.aperture.afterTick(state);
    if (state.infamy >= 5) G.legacySet('infamy');
    checkEnd(state);
    if (!G._replaying && state.tick % D.TUNE.autosaveEvery === 0) G.save('auto');
    G.lastTickMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  };

  // ---- Invariant validator (tests + dev tooling; never runs in the loop) ----
  G.validate = function (state) {
    const bad = [];
    bad.push.apply(bad, SW.campaign.validate(state));
    bad.push.apply(bad, validateJournal(state));
    bad.push.apply(bad, SW.charters.validate(state));
    bad.push.apply(bad, SW.aperture.validate(state));
    const objectiveStore = state && state.thread && state.thread.objectives;
    if (!objectiveStore) bad.push('objective store missing');
    else for (const objective of objectiveStore.active) bad.push.apply(bad, SW.objectives.validate(objective, state));
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
    // Focused runs end on the Act Ladder's terms (Cut / Burned / Eaten / bank /
    // summit). The classic victory/loss paths below are the Long-Weave sandbox.
    if (SW.acts && SW.acts.active(state)) { SW.acts.checkEnd(state); return; }
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
    if (SW.acts && SW.acts.active(state) && shipId === state.loomshipId) return err('The Loomship carries the WEFT core — it cannot be scrapped.');
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

  // Eligibility shared by the direct build action and supply projects.
  function buildEligible(state, sys, buildingId) {
    const b = D.BUILDINGS[buildingId];
    if (!sys || !b) return err('Unknown.');
    if (sys.scourge === 2) return err('The Scourge holds that system.');
    if (!sys.discovered) return err('Not yet charted.');
    if (b.tech && !SW.tech.has(state, b.tech)) return err('Requires ' + D.TECHS[b.tech].name + ' research.');
    if (sys.buildings.indexOf(buildingId) >= 0) return err('Already built here.');
    if (b.onlyType === 'producer' && Object.keys(sys.prod).length === 0) return err('Only useful at producing systems.');
    if (b.onlyType === 'pop' && !(sys.pop > 0 && sys.type === 'pop')) return err('Only useful at population centers.');
    if (buildingId !== 'relay' && !SW.ships.inRange(state, sys)) return err('Outside command range — relays first.');
    return { ok: true };
  }

  // Build: consumes credits + materials from (depot + idle ships' holds) at the site.
  // Internal (unjournaled) so the project tick can raise buildings deterministically.
  function doBuild(state, sysId, buildingId) {
    const sys = state.systems[sysId];
    const b = D.BUILDINGS[buildingId];
    const el = buildEligible(state, sys, buildingId);
    if (!el.ok) return el;
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
  }
  A.build = function (state, sysId, buildingId) { return doBuild(state, sysId, buildingId); };

  // ---- supply projects: one order gathers the requirement, then builds ----
  // Replaces per-commodity supply bookkeeping: the plan subtracts what is
  // on-site and inbound, drafts idle haulers for the gaps, and the tick
  // raises the building the moment credits and materials are all present.
  A.projectBuild = function (state, sysId, buildingId) {
    const sys = state.systems[sysId];
    const b = D.BUILDINGS[buildingId];
    const el = buildEligible(state, sys, buildingId);
    if (!el.ok) return el;
    state.projects = state.projects || [];
    if (state.projects.find(function (p) { return p.sys === sysId && p.b === buildingId; })) {
      return err('Already planned — supplies are moving.');
    }
    if (state.projects.length >= D.TUNE.projectMax) return err('Too many projects in motion.');
    const plan = SW.market.supplyPlan(state, sysId, b.mats);
    const gaps = plan.filter(function (row) { return row.uncovered > 0; });
    const pool = SW.ships.idleLogistics(state);
    for (const row of gaps) {
      if (!row.source) return err('No charted market stocks ' + D.COMMODITIES[row.c].name + '.');
    }
    if (gaps.length > pool.length) return err('Needs ' + gaps.length + ' idle hauler' + (gaps.length === 1 ? '' : 's') + ' (' + pool.length + ' free).');
    const dispatched = [];
    for (const row of gaps) {
      const ship = SW.ships.idleLogistics(state)[0]; // re-pick: each mission consumes one
      const r = SW.ships.supplyMission(state, ship, sysId, row.c, row.uncovered);
      if (!r.ok) return r;
      dispatched.push({ c: row.c, qty: row.uncovered, ship: ship.name, from: r.source.name });
    }
    state.projects.push({ id: 'prj' + (state.nextProjectId = (state.nextProjectId || 0) + 1), sys: sysId, b: buildingId, at: state.tick, note: null });
    G.emit('toast', {
      kind: 'good', text: b.icon + ' ' + b.name + ' planned at ' + sys.name +
        (dispatched.length ? ' — ' + dispatched.map(function (d) { return d.qty + ' ' + D.COMMODITIES[d.c].icon + ' (' + d.ship + ')'; }).join(', ') + ' inbound.' : ' — materials on-site, building shortly.'),
    });
    return { ok: true, dispatched: dispatched, plan: plan };
  };
  A.cancelProject = function (state, projectId) {
    const ps = state.projects || [];
    const i = ps.findIndex(function (p) { return p.id === projectId; });
    if (i < 0) return err('No such project.');
    ps.splice(i, 1); // supply ships finish their delivery; the goods stay usable
    return { ok: true };
  };

  // Stranded guard: losing your LAST ship with no means to rebuild is a dead end.
  // Outside the tutorial (which has its own, gentler handling), if the player has
  // zero ships and can't afford the cheapest buildable hull at home, the rim's
  // salvage networks front a minimal advance so a fresh hull is always reachable.
  // Throttled, and only when truly stuck — it can't be farmed for profit.
  function tickStrandedGuard(state) {
    if (state.gameOver) return;
    if (SW.tutorial && SW.tutorial.isActive(state)) return; // tutorial handles its own
    if (state.ships.length > 0) return;
    const aidEvery = D.TUNE.strandedAidEvery || 80;
    if (state.tick - (state.lastStrandedAid || -9999) < aidEvery) return;
    const home = state.systems[state.homeId];
    const buildable = home && home.scourge !== 2; // can a Sparrow be built at home?
    const sparrow = SW.ships.hullCost(state, 'sparrow');
    if (state.credits >= sparrow && buildable) return; // they can already rebuild
    state.lastStrandedAid = state.tick;
    if (state.credits < sparrow) state.credits = sparrow + 20;
    G.emit('toast', { kind: 'good', text: '◌ Salvage networks front a replacement hull. Build a new ship at your home system — you are never truly stranded.' });
    G.news(state, 'A salvage advance clears: with no ships left, the networks front enough to rebuild. Construct a hull at home to recover.', state.homeId);
  }

  // Projects tick: build when ready, re-dispatch when a gap reopens, explain when stuck.
  function tickProjects(state) {
    const ps = state.projects;
    if (!ps || !ps.length || state.tick % 5 !== 0) return;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      const sys = state.systems[p.sys];
      const b = D.BUILDINGS[p.b];
      if (!sys || !b || sys.buildings.indexOf(p.b) >= 0 || sys.scourge === 2) { ps.splice(i, 1); continue; }
      const r = doBuild(state, p.sys, p.b);
      if (r.ok) {
        ps.splice(i, 1);
        G.news(state, b.icon + ' ' + b.name + ' raised at ' + sys.name + ' — project complete.', p.sys);
        continue;
      }
      p.note = r.msg;
      if (state.tick % 25 === 0) { // self-heal: a lost or stalled hauler reopens a gap
        const plan = SW.market.supplyPlan(state, p.sys, b.mats);
        for (const row of plan) {
          if (row.uncovered <= 0 || !row.source) continue;
          const ship = SW.ships.idleLogistics(state)[0];
          if (!ship) break;
          SW.ships.supplyMission(state, ship, p.sys, row.c, row.uncovered);
        }
      }
    }
  }

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
  // ---- passengers: berths carry souls, not crates ----
  A.boardEvac = function (state, shipId) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    if (ship.mode !== 'idle' || ship.at === null) return err(ship.name + ' is in flight.');
    if (ship.pax) return err('Berths already taken — land them first.');
    const berths = SW.ships.berths(ship);
    if (!berths) return err(ship.name + ' has no berths. Couriers, Freighters and Liners do.');
    const co = (state.cohorts || []).find(function (x) { return x.from === ship.at && x.n > 0; });
    if (!co) return err('No one is waiting at this port.');
    const sys = state.systems[ship.at];
    const take = Math.min(Math.round(berths * D.TUNE.berthPop * 100) / 100, co.n);
    co.n = Math.round((co.n - take) * 100) / 100;
    sys.pop = Math.max(0, sys.pop - take);
    ship.pax = { kind: 'evac', n: take, from: sys.id, to: co.haven };
    G.emit('toast', { kind: 'good', text: '⇡ ' + ship.name + ' boards ' + U.fmt1(take) + 'M evacuees. Haven: ' + state.systems[co.haven].name + ' — any safe port pays.' });
    G.emit('sfx', 'click');
    return { ok: true, n: take, haven: co.haven };
  };
  A.boardCharter = function (state, shipId, charterId) {
    const ship = findShip(state, shipId);
    const ch = (state.charters || []).find(function (x) { return x.id === charterId; });
    if (!ship || !ch) return err('Ship or charter missing.');
    if (ship.mode !== 'idle' || ship.at !== ch.from) return err('The ship must be idle at ' + state.systems[ch.from].name + '.');
    if (ship.pax) return err('Berths already taken.');
    const berths = SW.ships.berths(ship);
    if (Math.round(berths * D.TUNE.berthPop * 100) / 100 < ch.n) return err('Needs ' + Math.ceil(ch.n / D.TUNE.berthPop) + ' berths (' + berths + ' aboard).');
    state.charters.splice(state.charters.indexOf(ch), 1);
    ship.pax = { kind: 'charter', n: ch.n, from: ch.from, to: ch.to, fare: ch.fare };
    G.emit('toast', { kind: 'good', text: '⇡ ' + ship.name + ' boards ' + U.fmt1(ch.n) + 'M for ' + state.systems[ch.to].name + ' (' + U.fmt(ch.fare) + '¤ on landing).' });
    return { ok: true };
  };
  A.landPax = function (state, shipId) {
    const ship = findShip(state, shipId);
    if (!ship) return err('No such ship.');
    return SW.ships.landPax(state, ship);
  };

  A.openHail = function (state, key) { return SW.story.openHail(state, key); };
  A.dismissHail = function (state, key) { return SW.story.dismissHail(state, key); };
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

  // ---- PLEDGE foundation (SPEC[RUN-PLEDGE]) ----
  A.takePledge = function (state, offerId) {
    if (!SW.pledges) return err('Pledges unavailable.');
    return SW.pledges.take(state, offerId);
  };
  A.abandonPledge = function (state, pledgeId) {
    if (!SW.pledges) return err('Pledges unavailable.');
    return SW.pledges.abandon(state, pledgeId);
  };
  A.draftCharter = function (state, charterId) {
    if (!SW.charters) return err('Charters unavailable.');
    const r = SW.charters.draft(state, charterId);
    if (r.ok) {
      G.news(state, 'Charter drafted: ' + r.charter.name + '. ' + r.charter.line, state.homeId);
      G.emit('toast', { kind: 'good', text: '◆ Charter drafted: ' + r.charter.name + ' — ' + r.charter.line });
      G.emit('sfx', 'chime');
    }
    return r;
  };
  A.skipActZero = function (state) {
    if (!SW.tutorial) return err('The Wake is unavailable.');
    return SW.tutorial.skip(state);
  };
  A.renameThread = function (state, value) {
    if (!state || !state.identity) return err('No active Thread.');
    const name = String(value === undefined ? '' : value).replace(/\s+/g, ' ').trim();
    if (!name) return err('Give the Thread a name.');
    if (name.length > 40) return err('Thread names are limited to 40 characters.');
    state.identity.name = name;
    G.news(state, 'This Thread is now called ' + name + '.', state.homeId);
    return { ok: true, name: name };
  };

  // ---- The Act Ladder (SPEC[RUN-ACTS]): bank / push / graduate at a boundary ----
  A.bankThread = function (state) {
    if (!SW.acts) return err('Acts unavailable.');
    return SW.acts.bank(state);
  };
  A.pushThread = function (state, boonId) {
    if (!SW.acts) return err('Acts unavailable.');
    return SW.acts.push(state, boonId);
  };
  A.graduateThread = function (state) {
    if (!SW.acts) return err('Acts unavailable.');
    return SW.acts.graduate(state);
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
  A.focusAperture = function (state, sysId) {
    return SW.aperture.focus(state, Number(sysId));
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
  // Every action call is recorded into the save: {seq, t, a, args, ok}.
  // Seed + journal = a replayable run; a bug report is a save file.
  function cloneActionValue(value, stack) {
    if (value === undefined) return { __swv: 'undefined' };
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (Object.is(value, -0)) return { __swv: 'negative-zero' };
      if (Number.isNaN(value)) return { __swv: 'nan' };
      if (value === Infinity) return { __swv: 'infinity' };
      if (value === -Infinity) return { __swv: 'negative-infinity' };
      return value;
    }
    if (typeof value !== 'object') throw new Error('unsupported value type ' + typeof value);
    if (stack.indexOf(value) >= 0) throw new Error('cyclic value');
    const proto = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) throw new Error('non-plain object');
    if (Object.getOwnPropertySymbols(value).length) throw new Error('symbol-keyed properties are unsupported');
    stack.push(value);
    let copy;
    if (Array.isArray(value)) {
      const arrayNames = Object.getOwnPropertyNames(value).filter(function (name) { return name !== 'length'; });
      if (arrayNames.length !== value.length || arrayNames.some(function (name, i) { return name !== String(i); })) {
        throw new Error('array properties must be dense indexes');
      }
      copy = [];
      for (let i = 0; i < value.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(value, i)) throw new Error('sparse arrays are unsupported');
        copy.push(cloneActionValue(value[i], stack));
      }
    } else {
      if (Object.getOwnPropertyNames(value).length !== Object.keys(value).length) throw new Error('non-enumerable properties are unsupported');
      copy = Object.create(null);
      Object.keys(value).forEach(function (key) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || descriptor.get || descriptor.set) throw new Error('accessor properties are unsupported');
        copy[key] = cloneActionValue(value[key], stack);
      });
      // Escape the codec's reserved marker if it belongs to player data.
      if (Object.prototype.hasOwnProperty.call(copy, '__swv')) copy = { __swv: 'object', value: copy };
    }
    stack.pop();
    return copy;
  }

  function restoreActionValue(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(restoreActionValue);
    if (Object.prototype.hasOwnProperty.call(value, '__swv')) {
      if (value.__swv === 'undefined') return undefined;
      if (value.__swv === 'negative-zero') return -0;
      if (value.__swv === 'nan') return NaN;
      if (value.__swv === 'infinity') return Infinity;
      if (value.__swv === 'negative-infinity') return -Infinity;
      if (value.__swv === 'object') {
        if (!value.value || typeof value.value !== 'object' || Array.isArray(value.value)) throw new Error('invalid escaped object');
        const original = {};
        Object.keys(value.value).forEach(function (key) {
          Object.defineProperty(original, key, {
            configurable: true,
            enumerable: true,
            writable: true,
            value: restoreActionValue(value.value[key])
          });
        });
        return original;
      }
      throw new Error('unknown action value encoding');
    }
    const restored = {};
    Object.keys(value).forEach(function (key) {
      Object.defineProperty(restored, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: restoreActionValue(value[key])
      });
    });
    return restored;
  }

  function actionJournal(state) {
    if (!state || typeof state !== 'object' || !state.systems) return null;
    if (state.journal === undefined || state.journal === null) state.journal = [];
    if (!Array.isArray(state.journal) || !Object.isExtensible(state.journal)) throw new Error('Action journal is unavailable.');
    return state.journal;
  }

  function appendJournal(state, entry, journal) {
    if (!journal) return;
    entry.seq = journal.length + 1;
    entry.t = state.tick;
    journal.push(entry);
  }

  function validateJournal(state) {
    const errors = [];
    const journal = state && state.journal;
    if (!Array.isArray(journal)) return ['action journal missing'];
    if (state.thread && state.thread.replay && state.thread.replay.complete === false) return errors;
    for (let i = 0; i < journal.length; i++) {
      const entry = journal[i];
      if (!entry || entry.seq !== i + 1) errors.push('action journal sequence invalid at entry ' + (i + 1));
      if (!entry || !Number.isInteger(entry.t) || entry.t < 0) errors.push('action journal tick invalid at entry ' + (i + 1));
      if (!entry || typeof entry.a !== 'string' || !Array.isArray(entry.args) || typeof entry.ok !== 'boolean') {
        errors.push('action journal entry invalid at entry ' + (i + 1));
      }
    }
    return errors;
  }

  for (const name of Object.keys(A)) {
    (function (name, fn) {
      A[name] = function (state) {
        if (G._replaying) return fn.apply(null, arguments);
        let journal, journalArgs;
        try { journal = actionJournal(state); }
        catch (journalError) { return { ok: false, msg: journalError.message }; }
        try {
          journalArgs = cloneActionValue(Array.prototype.slice.call(arguments, 1), []);
        } catch (serializationError) {
          appendJournal(state, {
            a: name,
            args: [],
            ok: false,
            rejected: 'nonserializable-arguments'
          }, journal);
          return { ok: false, msg: 'Action arguments are not serializable: ' + serializationError.message };
        }
        let result;
        try {
          result = fn.apply(null, arguments);
        } catch (actionError) {
          appendJournal(state, {
            a: name,
            args: journalArgs,
            ok: false,
            threw: true,
            error: {
              name: actionError && actionError.name ? String(actionError.name) : 'Error',
              message: actionError && actionError.message ? String(actionError.message) : String(actionError)
            }
          }, journal);
          throw actionError;
        }
        appendJournal(state, { a: name, args: journalArgs, ok: !(result && result.ok === false) }, journal);
        return result;
      };
    })(name, A[name]);
  }

  function replayProjection(state) {
    const parsed = JSON.parse(JSON.stringify(state));
    const prepared = SW.campaign.migrate(parsed);
    const value = prepared.ok ? prepared.state : parsed;
    if (prepared.ok && SW.aperture && typeof SW.aperture.checkpoint === 'function') {
      const materialized = SW.aperture.checkpoint(value);
      if (!materialized.ok) throw new Error(materialized.msg || 'Replay projection could not materialize Cold state.');
    }
    if (value.thread) {
      delete value.thread.journal;
      delete value.thread.replay;
      delete value.thread.paused;
      delete value.thread.speed;
    }
    return value;
  }

  G.replayDigest = function (state) {
    return JSON.stringify(replayProjection(state));
  };

  G.replay = function (source) {
    let parsed;
    try { parsed = typeof source === 'string' ? JSON.parse(source) : JSON.parse(JSON.stringify(source)); }
    catch (e) { return { ok: false, msg: 'Replay source is not valid JSON.' }; }
    const prepared = SW.campaign.migrate(parsed);
    if (!prepared.ok) return prepared;
    const original = prepared.state;
    const journalErrors = validateJournal(original);
    if (journalErrors.length) return { ok: false, msg: journalErrors.join('; '), errors: journalErrors };
    if (!original.thread.replay || !original.thread.replay.complete || !original.thread.launch) {
      return { ok: false, msg: (original.thread.replay && original.thread.replay.reason) || 'This save has no complete launch recipe.' };
    }
    const log = JSON.parse(JSON.stringify(original.journal || []));
    const launch = JSON.parse(JSON.stringify(original.thread.launch));
    const targetTick = original.tick;
    const previous = G.state;
    const mismatches = [];
    G._replaying = true;
    let replayed;
    try {
      replayed = G.newGame(launch);
      for (let i = 0; i < log.length; i++) {
        const entry = log[i];
        if (!entry || entry.seq !== i + 1) {
          mismatches.push('journal sequence is not contiguous at entry ' + (i + 1));
          break;
        }
        if (!Number.isInteger(entry.t) || entry.t < replayed.tick) {
          mismatches.push('journal tick out of order at sequence ' + (entry.seq || (i + 1)));
          break;
        }
        if (entry.t > targetTick || !Array.isArray(entry.args)) {
          mismatches.push('journal entry invalid at sequence ' + entry.seq);
          break;
        }
        while (replayed.tick < entry.t && !replayed.gameOver) G.tick(replayed);
        const action = A[entry.a];
        if (!action) { mismatches.push('unknown action ' + entry.a); break; }
        if (entry.rejected === 'nonserializable-arguments') {
          if (entry.ok !== false) mismatches.push('rejected action has an invalid outcome at sequence ' + entry.seq);
          continue;
        }
        let result, thrown = null, replayArgs;
        try { replayArgs = restoreActionValue(entry.args); }
        catch (e) { mismatches.push('action arguments cannot be decoded at sequence ' + entry.seq); break; }
        try { result = action.apply(null, [replayed].concat(replayArgs)); }
        catch (e) { thrown = e; }
        if (entry.threw) {
          if (!thrown) mismatches.push('action no longer throws at sequence ' + entry.seq + ': ' + entry.a);
          else if (entry.error && (String(thrown.name || 'Error') !== entry.error.name || String(thrown.message || thrown) !== entry.error.message)) {
            mismatches.push('action error changed at sequence ' + entry.seq + ': ' + entry.a);
          }
        } else if (thrown) {
          mismatches.push('action now throws at sequence ' + entry.seq + ': ' + entry.a);
        } else {
          const ok = !(result && result.ok === false);
          if (ok !== entry.ok) mismatches.push('action outcome changed at sequence ' + entry.seq + ': ' + entry.a);
        }
      }
      while (!mismatches.length && replayed.tick < targetTick && !replayed.gameOver) G.tick(replayed);
      replayed.paused = original.paused;
      replayed.speed = original.speed;
      replayed.journal = log;
      replayed.thread.replay = {
        version: 1,
        complete: true,
        verifiedTick: targetTick,
        matches: !mismatches.length && G.replayDigest(replayed) === G.replayDigest(original)
      };
      if (!replayed.thread.replay.matches && !mismatches.length) mismatches.push('canonical state digest differs after replay');
    } catch (e) {
      mismatches.push(e && e.message ? e.message : String(e));
    } finally {
      G._replaying = false;
    }
    if (mismatches.length) {
      G.state = previous;
      return { ok: false, msg: 'Replay diverged: ' + mismatches.join('; '), errors: mismatches, state: replayed };
    }
    G.state = replayed;
    return { ok: true, state: replayed, tick: targetTick, actions: log.length };
  };

  // ---- Save / load ----
  function storage() {
    // browser only — Node 25 exposes a localStorage stub that warns without a backing file
    try { return (typeof window !== 'undefined' && typeof localStorage !== 'undefined') ? localStorage : null; } catch (e) { return null; }
  }
  function campaignKey(id, slot) {
    return 'starweft_v3_campaign:' + id + ':' + (slot || 'manual');
  }
  function legacyCampaignKey(id, slot) {
    return 'starweft_v3_legacy:' + id + ':' + (slot || 'manual');
  }
  function legacyKey(slot) { return 'starweft_' + (slot || 'manual'); }
  G.campaignSaveKey = campaignKey;

  function validateSaveTransaction(tx) {
    if (!tx || tx.version !== 1 || tx.status !== 'ready') return 'Save transaction schema invalid.';
    if (tx.accountKey !== ACCOUNT_KEY || tx.accountTmp !== ACCOUNT_KEY + ':tmp' ||
        tx.indexKey !== CAMPAIGN_INDEX_KEY || tx.indexTmp !== CAMPAIGN_INDEX_KEY + ':tmp') {
      return 'Save transaction routing invalid.';
    }
    if (typeof tx.campaignId !== 'string' || !/^[A-Za-z0-9._-]+$/.test(tx.campaignId) ||
        typeof tx.slot !== 'string' || !/^[A-Za-z0-9_-]+$/.test(tx.slot) ||
        (tx.kind !== 'campaign-save' && tx.kind !== 'legacy-weave')) return 'Save transaction identity invalid.';
    const expectedKey = tx.kind === 'legacy-weave'
      ? legacyCampaignKey(tx.campaignId, tx.slot)
      : campaignKey(tx.campaignId, tx.slot);
    if (tx.campaignKey !== expectedKey || tx.campaignTmp !== expectedKey + ':tmp') {
      return 'Save transaction campaign target invalid.';
    }
    return null;
  }

  function stagedSave(s, tx) {
    const schemaError = validateSaveTransaction(tx);
    if (schemaError) return { ok: false, pending: true, msg: schemaError, tx: tx };
    try {
      const campaignRaw = s.getItem(tx.campaignTmp);
      const accountRaw = s.getItem(tx.accountTmp);
      const indexRaw = s.getItem(tx.indexTmp);
      if (!campaignRaw || !accountRaw || !indexRaw) throw new Error('staged save data is incomplete');
      const campaign = SW.campaign.migrate(JSON.parse(campaignRaw));
      if (!campaign.ok || campaign.state.campaign.id !== tx.campaignId || campaign.state.kind !== tx.kind) {
        throw new Error('staged campaign failed verification');
      }
      const account = JSON.parse(accountRaw);
      if (SW.campaign.validateAccount(account).length || account.activeCampaignId !== tx.campaignId || account.activeSaveKind !== tx.kind) {
        throw new Error('staged account failed verification');
      }
      const index = JSON.parse(indexRaw);
      if (!Array.isArray(index) || !index.some(function (item) { return item && item.id === tx.campaignId && item.kind === tx.kind; })) {
        throw new Error('staged campaign index failed verification');
      }
      return { ok: true, campaignRaw: campaignRaw, accountRaw: accountRaw, indexRaw: indexRaw, account: account };
    } catch (e) {
      return { ok: false, pending: true, msg: 'Save transaction staging failed: ' + e.message, tx: tx };
    }
  }

  function finishSaveTransaction(s, tx) {
    const staged = stagedSave(s, tx);
    if (!staged.ok) return staged;
    try {
      // Routing metadata is committed last. Until the account write succeeds,
      // an interrupted save still points at the last verified checkpoint.
      s.setItem(tx.campaignKey, staged.campaignRaw);
      if (s.getItem(tx.campaignKey) !== staged.campaignRaw) throw new Error('campaign commit byte verification failed');
      const campaignCheck = SW.campaign.migrate(JSON.parse(staged.campaignRaw));
      if (!campaignCheck.ok) throw new Error('campaign commit schema verification failed');
      s.setItem(tx.indexKey, staged.indexRaw);
      if (s.getItem(tx.indexKey) !== staged.indexRaw) throw new Error('campaign index commit verification failed');
      s.setItem(tx.accountKey, staged.accountRaw);
      if (s.getItem(tx.accountKey) !== staged.accountRaw) throw new Error('account commit byte verification failed');
      const accountCheck = JSON.parse(staged.accountRaw);
      if (SW.campaign.validateAccount(accountCheck).length) throw new Error('account commit verification failed');
      G._account = staged.account;
      try {
        // Clear the routing manifest first. If that removal fails, all staged
        // bytes remain available for an idempotent recovery attempt. Orphaned
        // tmp records after a successful manifest removal are harmless.
        s.removeItem(SAVE_TXN_KEY);
        s.removeItem(tx.campaignTmp);
        s.removeItem(tx.indexTmp);
        s.removeItem(tx.accountTmp);
      } catch (cleanupError) { /* a complete transaction is safe to replay idempotently */ }
      return { ok: true, recovered: true, account: staged.account, tx: tx };
    } catch (e) {
      return { ok: false, pending: true, msg: 'Save transaction commit interrupted: ' + e.message, tx: tx };
    }
  }

  function recoverSaveTransaction(s) {
    if (!s) return { ok: true, pending: false };
    const raw = s.getItem(SAVE_TXN_KEY);
    if (!raw) return { ok: true, pending: false };
    let tx;
    try { tx = JSON.parse(raw); }
    catch (e) { return { ok: false, pending: true, msg: 'Pending save manifest is corrupt.' }; }
    return finishSaveTransaction(s, tx);
  }

  function rotateVerified(s, key, previous, validator) {
    const prior = s.getItem(key);
    if (prior === null) return;
    let valid = false;
    try { valid = validator(prior); }
    catch (e) { return; }
    if (!valid) return;
    s.setItem(previous, prior);
    if (s.getItem(previous) !== prior) throw new Error('previous-generation rotation failed for ' + key);
  }

  G.save = function (slot) {
    const s = storage();
    if (!s || !G.state) return { ok: false };
    const pending = recoverSaveTransaction(s);
    if (!pending.ok) return { ok: false, pending: true, msg: pending.msg };
    const materialized = SW.aperture.checkpoint(G.state);
    if (!materialized.ok) return materialized;
    const stateErrors = G.validate(G.state);
    if (stateErrors.length) return { ok: false, msg: stateErrors.join('; '), errors: stateErrors };
    const packed = SW.campaign.serialize(G.state);
    if (!packed.ok) return packed;
    const state = G.state;
    const key = state.kind === 'legacy-weave'
      ? legacyCampaignKey(state.campaign.id, slot)
      : campaignKey(state.campaign.id, slot);
    const tmp = key + ':tmp';
    const previous = key + ':previous';
    const accountTmp = ACCOUNT_KEY + ':tmp';
    const indexTmp = CAMPAIGN_INDEX_KEY + ':tmp';
    try {
      const account = JSON.parse(JSON.stringify(G.accountState()));
      SW.campaign.register(account, state);
      const accountErrors = SW.campaign.validateAccount(account);
      if (accountErrors.length) throw new Error(accountErrors.join('; '));
      const accountRaw = JSON.stringify(account);
      const indexRaw = JSON.stringify(account.chronicle.campaigns);
      s.setItem(tmp, packed.raw);
      if (s.getItem(tmp) !== packed.raw) throw new Error('campaign staging byte verification failed');
      const staged = SW.campaign.migrate(JSON.parse(s.getItem(tmp)));
      if (!staged.ok) throw new Error(staged.msg);
      s.setItem(indexTmp, indexRaw);
      if (s.getItem(indexTmp) !== indexRaw || !Array.isArray(JSON.parse(s.getItem(indexTmp)))) throw new Error('campaign index staging failed');
      s.setItem(accountTmp, accountRaw);
      const stagedAccount = JSON.parse(s.getItem(accountTmp));
      if (SW.campaign.validateAccount(stagedAccount).length) throw new Error('account staging failed');

      rotateVerified(s, key, previous, function (raw) { return SW.campaign.migrate(JSON.parse(raw)).ok; });
      rotateVerified(s, CAMPAIGN_INDEX_KEY, CAMPAIGN_INDEX_KEY + ':previous', function (raw) { return Array.isArray(JSON.parse(raw)); });
      rotateVerified(s, ACCOUNT_KEY, ACCOUNT_KEY + ':previous', function (raw) { return SW.campaign.validateAccount(JSON.parse(raw)).length === 0; });

      const tx = {
        version: 1,
        status: 'ready',
        campaignId: state.campaign.id,
        kind: state.kind,
        slot: slot || 'manual',
        campaignKey: key,
        campaignTmp: tmp,
        indexKey: CAMPAIGN_INDEX_KEY,
        indexTmp: indexTmp,
        accountKey: ACCOUNT_KEY,
        accountTmp: accountTmp
      };
      const txRaw = JSON.stringify(tx);
      s.setItem(SAVE_TXN_KEY, txRaw);
      if (s.getItem(SAVE_TXN_KEY) !== txRaw) throw new Error('save transaction manifest verification failed');
      const committed = finishSaveTransaction(s, tx);
      if (!committed.ok) return { ok: false, pending: true, msg: committed.msg, key: key };
      return { ok: true, key: key, transaction: true };
    } catch (e) { return { ok: false, msg: 'Save failed: ' + e.message }; }
  };
  G.load = function (slot) {
    const s = storage();
    if (!s) return { ok: false, msg: 'No storage available.' };
    const transactionRecovery = recoverSaveTransaction(s);
    if (transactionRecovery.ok && transactionRecovery.recovered) G._account = transactionRecovery.account;
    const account = G.accountState();
    const id = account.activeCampaignId;
    const key = id ? (account.activeSaveKind === 'legacy-weave' ? legacyCampaignKey(id, slot) : campaignKey(id, slot)) : null;
    let raw = key ? s.getItem(key) : null;
    let source = key;
    if (!transactionRecovery.ok && transactionRecovery.pending) {
      const stable = key ? s.getItem(key + ':previous') : null;
      if (stable) {
        raw = stable;
        source = key + ':previous';
      } else {
        return { ok: false, pending: true, msg: transactionRecovery.msg };
      }
    }
    if (!raw) { source = legacyKey(slot); raw = s.getItem(source); }
    if (!raw) return { ok: false, msg: 'No save found.' };
    let result = G.loadFromString(raw);
    if (!result.ok && key) {
      const fallback = s.getItem(key + ':previous');
      if (fallback) {
        const recovered = G.loadFromString(fallback);
        if (recovered.ok) {
          recovered.recovered = true;
          recovered.corruptKey = key;
          return recovered;
        }
      }
    }
    if (result.ok && source === legacyKey(slot)) result.legacy = true;
    if (result.ok && transactionRecovery.ok && transactionRecovery.recovered) result.recoveredTransaction = true;
    if (result.ok && !transactionRecovery.ok && transactionRecovery.pending) result.pendingTransaction = true;
    return result;
  };
  G.loadFromString = function (raw) {
    if (typeof raw !== 'string' || raw.length > 8 * 1024 * 1024) return { ok: false, msg: 'Save data is missing or too large.' };
    let st;
    try { st = JSON.parse(raw); } catch (e) { return { ok: false, msg: 'Save data is not valid JSON.' }; }
    const prepared = SW.campaign.migrate(st);
    if (!prepared.ok) return prepared;
    st = prepared.state;
    if (st.story) st.story.dynamic = st.story.dynamic || {};
    if (prepared.migrated) {
      SW.objectives.ensure(st);
      SW.charters.ensure(st);
      if (!st.act.aperture) SW.aperture.init(st, st.homeId);
    }
    const errors = validateSave(st);
    if (errors.length) return { ok: false, msg: errors.join('; '), errors: errors };
    G.state = st;
    G.fx.length = 0;
    SW.planets.clearCache(); // bodies are derived from seed; never trust a stale cache
    st.paused = true;
    return { ok: true, migrated: prepared.migrated, fromVersion: prepared.fromVersion, legacy: st.kind === 'legacy-weave' };
  };
  G.exportSave = function () {
    if (!G.state) return null;
    const materialized = SW.aperture.checkpoint(G.state);
    if (!materialized.ok) return null;
    const packed = SW.campaign.serialize(G.state);
    return packed.ok ? packed.raw : null;
  };
  G.exportLegacy = function (slot) {
    const s = storage();
    return s ? s.getItem(legacyKey(slot || 'auto')) : null;
  };
  G.hasLegacy = function (slot) {
    const s = storage();
    return !!(s && s.getItem(legacyKey(slot || 'auto')));
  };
  G.loadLegacy = function (slot) {
    const s = storage();
    if (!s) return { ok: false, msg: 'No storage available.' };
    const source = legacyKey(slot || 'auto');
    const raw = s.getItem(source);
    if (!raw) return { ok: false, msg: 'No legacy save found.' };
    const result = G.loadFromString(raw);
    if (result.ok) {
      result.legacy = true;
      result.legacySource = source;
    }
    return result;
  };
  G.hasSave = function (slot) {
    const s = storage();
    if (!s) return false;
    const account = G.accountState();
    const activeKey = account.activeCampaignId
      ? (account.activeSaveKind === 'legacy-weave'
        ? legacyCampaignKey(account.activeCampaignId, slot || 'auto')
        : campaignKey(account.activeCampaignId, slot || 'auto'))
      : null;
    return !!((activeKey && s.getItem(activeKey)) || s.getItem(legacyKey(slot || 'auto')));
  };

  function validateSave(st) {
    const errors = SW.campaign.validate(st);
    errors.push.apply(errors, validateJournal(st));
    if (!st.stats || !st.tech || !st.story || !st.scourge) errors.push('save is missing core sections');
    errors.push.apply(errors, SW.charters.validate(st));
    errors.push.apply(errors, SW.aperture.validate(st, { canonical: true }));
    const objectives = st && st.thread && st.thread.objectives;
    if (!objectives || objectives.version !== SW.objectives.VERSION || !Array.isArray(objectives.active)) errors.push('objective store invalid');
    else for (const objective of objectives.active) errors.push.apply(errors, SW.objectives.validate(objective, st));
    if (!Number.isFinite(st.credits) || st.credits < 0) errors.push('credits invalid');
    if (!Number.isFinite(st.research) || st.research < 0) errors.push('research invalid');
    if (!Number.isFinite(st.tick) || st.tick < 0) errors.push('tick invalid');
    return errors;
  }

  return G;
})();
