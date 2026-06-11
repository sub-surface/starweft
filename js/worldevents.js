/* STARWEFT worldevents.js — the galaxy keeps happening without you. DOM-free.
   Timed contracts, pirate blockades, stellar flares, comet windows. */
var SW = globalThis.SW = globalThis.SW || {};

SW.worldevents = (function () {
  const U = SW.util, D = SW.data;
  const W = {};

  W.init = function (state) {
    state.contracts = [];   // {id, kind, sysId, c, qty, progress, deadline, reward:{credits,research,rep}, label}
    state.blockades = [];   // {a, b, until, toll}
    state.nextWorldAt = 260;
  };

  W.laneBlocked = function (state, a, b) {
    for (const bl of state.blockades) {
      if ((bl.a === a && bl.b === b) || (bl.a === b && bl.b === a)) return bl;
    }
    return null;
  };

  W.tick = function (state) {
    const T = D.TUNE;
    // expire blockades
    state.blockades = state.blockades.filter(function (bl) {
      if (state.tick >= bl.until) {
        SW.game.emit('toast', { kind: 'good', text: '⊘ The blockade near ' + state.systems[bl.a].name + ' has dispersed.' });
        return false;
      }
      return true;
    });
    // contract deadlines + survey-type completion
    for (const ct of state.contracts.slice()) {
      if (ct.kind === 'survey' && state.systems[ct.sysId].surveyed) completeContract(state, ct);
      else if (state.tick >= ct.deadline) failContract(state, ct);
    }
    // spawn new world events
    if (state.tick >= state.nextWorldAt) {
      state.nextWorldAt = state.tick + T.contractEvery + U.ri(state, -60, 80);
      spawnWorldEvent(state);
    }
  };

  // ships.js calls this after every player market sale
  W.onPlayerSell = function (state, sysId, c, qty) {
    for (const ct of state.contracts.slice()) {
      if ((ct.kind === 'famine' || ct.kind === 'medical') && ct.sysId === sysId && ct.c === c) {
        ct.progress += qty;
        if (ct.progress >= ct.qty) completeContract(state, ct);
      }
    }
  };

  function completeContract(state, ct) {
    const i = state.contracts.indexOf(ct);
    if (i >= 0) state.contracts.splice(i, 1);
    state.credits += ct.reward.credits || 0;
    state.research += ct.reward.research || 0;
    if (ct.reward.rep) {
      for (const f in ct.reward.rep) state.rep[f] = U.clamp((state.rep[f] || 0) + ct.reward.rep[f], -10, 10);
    }
    const sys = state.systems[ct.sysId];
    if (ct.kind === 'famine' || ct.kind === 'medical') {
      sys.prosperity = Math.min(100, sys.prosperity + 12);
      sys.presence.player = (sys.presence.player || 0) + 1.5;
    }
    state.stats.contractsDone = (state.stats.contractsDone || 0) + 1;
    SW.game.emit('toast', { kind: 'good', text: '✔ Contract fulfilled: ' + ct.label + ' (+' + U.fmt(ct.reward.credits || 0) + '¤, +' + (ct.reward.research || 0) + '◇)' });
    SW.game.emit('sfx', 'sell');
  }

  function failContract(state, ct) {
    const i = state.contracts.indexOf(ct);
    if (i >= 0) state.contracts.splice(i, 1);
    const sys = state.systems[ct.sysId];
    if (ct.kind === 'famine' || ct.kind === 'medical') {
      sys.prosperity = Math.max(0, sys.prosperity - 18);
      SW.game.emit('toast', { kind: 'bad', text: '✖ ' + ct.label + ' — too late. ' + sys.name + ' will remember.' });
    } else {
      SW.game.emit('toast', { kind: 'bad', text: '✖ Contract lapsed: ' + ct.label });
    }
    state.stats.contractsFailed = (state.stats.contractsFailed || 0) + 1;
  }

  function spawnWorldEvent(state) {
    const roll = U.rnd(state);
    if (roll < 0.28) spawnShortage(state);
    else if (roll < 0.46) spawnBlockade(state);
    else if (roll < 0.62) spawnFlare(state);
    else if (roll < 0.78) spawnComet(state);
    else spawnSurveyContract(state);
  }

  function spawnShortage(state) {
    const pops = state.systems.filter(function (s) { return s.pop > 5 && s.discovered && s.scourge === 0 && s.id !== state.homeId; });
    if (!pops.length) return;
    const sys = U.pick(state, pops);
    const medical = U.chance(state, 0.4);
    const c = medical ? 'MEDS' : 'FOOD';
    sys.stocks[c] = 0;
    const qty = U.ri(state, 25, 50);
    const ct = {
      id: 'ct' + (state.nextId++), kind: medical ? 'medical' : 'famine', sysId: sys.id, c: c,
      qty: qty, progress: 0, deadline: state.tick + 320,
      reward: { credits: qty * 45, research: 60, rep: medical ? { synod: 1 } : {} },
      label: (medical ? 'Outbreak' : 'Famine') + ' at ' + sys.name + ' — deliver ' + qty + ' ' + D.COMMODITIES[c].name,
    };
    state.contracts.push(ct);
    SW.game.emit('toast', { kind: 'bad', text: '⚠ ' + ct.label + ' within ' + (ct.deadline - state.tick) + ' ticks.' });
    SW.game.emit('sfx', 'dread');
  }

  function spawnBlockade(state) {
    // a lane in or near the Reach, never adjacent to home
    const cands = [];
    for (const sys of state.systems) {
      if (sys.id === state.homeId || sys.scourge === 2) continue;
      const risky = sys.region === 'reach' || sys.region === 'quiet' || sys.hops >= 4;
      if (!risky) continue;
      for (const nb of sys.links) {
        if (nb <= sys.id || nb === state.homeId) continue;
        if (!W.laneBlocked(state, sys.id, nb)) cands.push([sys.id, nb]);
      }
    }
    if (!cands.length) return;
    const lane = U.pick(state, cands);
    const bl = { a: lane[0], b: lane[1], until: state.tick + U.ri(state, 220, 380), toll: U.ri(state, 400, 900) };
    state.blockades.push(bl);
    if (state.systems[bl.a].discovered || state.systems[bl.b].discovered) {
      SW.game.emit('toast', { kind: 'bad', text: '⊘ Severed blockade: the ' + state.systems[bl.a].name + ' ↔ ' + state.systems[bl.b].name + ' lane is closed. Pay, fight, or reroute.' });
      SW.game.emit('sfx', 'dread');
    }
  }

  // pay the toll OR break it with an armed ship at either endpoint
  W.payToll = function (state, blockade) {
    if (state.credits < blockade.toll) return { ok: false, msg: 'Needs ' + blockade.toll + '¤.' };
    state.credits -= blockade.toll;
    state.rep.severed = Math.min(10, state.rep.severed + 0.3);
    remove(state, blockade);
    SW.game.emit('toast', { kind: 'info', text: 'Toll paid. The corsairs wave you through with unsettling courtesy.' });
    return { ok: true };
  };
  W.breakBlockade = function (state, blockade, ship) {
    const at = ship.at;
    if (at !== blockade.a && at !== blockade.b) return { ok: false, msg: 'Ship must be at either end of the blockade.' };
    const power = SW.combat.power(state, ship);
    if (power < 4) return { ok: false, msg: 'Needs an armed hull.' };
    const def = 5 + state.tick / 800;
    if (U.chance(state, power / (power + def))) {
      remove(state, blockade);
      state.credits += 350;
      state.rep.vigil = Math.min(10, state.rep.vigil + 0.5);
      state.rep.severed = Math.max(-10, state.rep.severed - 0.5);
      state.stats.blockadesBroken = (state.stats.blockadesBroken || 0) + 1;
      SW.game.emit('toast', { kind: 'good', text: '⚔ Blockade broken by ' + ship.name + '. Bounty +350¤.' });
      SW.game.emit('sfx', 'shield');
      return { ok: true, win: true };
    }
    if (U.chance(state, 0.2)) { SW.ships.destroy(state, ship, 'lost forcing the blockade'); return { ok: true, win: false, lost: true }; }
    SW.game.emit('toast', { kind: 'bad', text: ship.name + ' was driven off the blockade.' });
    return { ok: true, win: false };
  };
  function remove(state, blockade) {
    const i = state.blockades.indexOf(blockade);
    if (i >= 0) state.blockades.splice(i, 1);
  }

  function spawnFlare(state) {
    const cands = state.systems.filter(function (s) {
      return D.specClass(s.spec) === 'M' && (s.region === 'flarezone' || U.rnd(state) < 0.1) && s.scourge !== 2;
    });
    if (!cands.length) return;
    const sys = U.pick(state, cands);
    // markets scorched
    sys.stocks.BIO = Math.floor((sys.stocks.BIO || 0) * 0.4);
    sys.stocks.FOOD = Math.floor((sys.stocks.FOOD || 0) * 0.5);
    let hurt = 0;
    for (const ship of state.ships) {
      if (ship.at === sys.id && U.chance(state, D.TUNE.flareDamageChance)) {
        ship.retryAt = state.tick + 40;
        hurt++;
      }
    }
    if (sys.discovered) {
      SW.game.emit('toast', { kind: 'bad', text: '☀ Superflare at ' + sys.name + (hurt ? ' — ' + hurt + ' of your ships riding it out with fried sensors.' : '. Local biostock scorched.') });
    }
  }

  function spawnComet(state) {
    const cands = state.systems.filter(function (s) { return (s.prod.ORE || s.prod.GAS || s.prod.CRYSTAL) && s.discovered && s.scourge === 0; });
    if (!cands.length) return;
    const sys = U.pick(state, cands);
    sys.prodBoostUntil = state.tick + 240;
    SW.game.emit('toast', { kind: 'good', text: '☄ Comet breakup at ' + sys.name + ' — production ×2.5 for 240 ticks. Harvest window open.' });
  }

  function spawnSurveyContract(state) {
    const cands = state.systems.filter(function (s) { return s.discovered && !s.surveyed && s.scourge === 0; });
    if (!cands.length) return;
    const sys = U.pick(state, cands);
    const ct = {
      id: 'ct' + (state.nextId++), kind: 'survey', sysId: sys.id, c: null, qty: 0, progress: 0,
      deadline: state.tick + 500,
      reward: { credits: 600, research: 120, rep: { loom: 0.5 } },
      label: 'Charter: survey ' + sys.name + (sys.region ? ' (' + D.REGIONS[sys.region].name + ')' : ''),
    };
    state.contracts.push(ct);
    SW.game.emit('toast', { kind: 'info', text: '◈ ' + ct.label + ' — ' + U.fmt(ct.reward.credits) + '¤ + ' + ct.reward.research + '◇ on completion.' });
  }

  return W;
})();
