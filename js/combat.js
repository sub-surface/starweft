/* STARWEFT combat.js — raids, escorts, privateering, infamy. DOM-free.
   Combat is resolved as power contests, not twitch: this is a logistics game
   where violence is one more line item. */
var SW = globalThis.SW = globalThis.SW || {};

SW.combat = (function () {
  const U = SW.util, D = SW.data;
  const C = {};

  C.init = function (state) {
    state.infamy = state.infamy || 0;
    state.rep = state.rep || { vigil: 0, synod: 0, combine: 0, mariners: 0, loom: 0, severed: 0 };
    state.retainers = [];                 // [{region, until}]
    state.ops = { blitz: null, embargo: null }; // {sys, until(, rival)}
    state.combat = { nextRaidAt: 150 + D.TUNE.raidBaseEvery, nextHunterAt: 0 };
  };

  C.infamyStatus = function (value) {
    const n = Math.max(0, U.num(value));
    let label = 'Clean';
    if (n >= 5) label = 'Most Wanted';
    else if (n >= D.TUNE.infamyBlackMarket) label = 'Known Pirate';
    else if (n >= 1) label = 'Smuggler';
    return {
      value: n,
      label: label,
      tier: n >= 5 ? 3 : n >= D.TUNE.infamyBlackMarket ? 2 : n >= 1 ? 1 : 0,
      blackMarket: n >= D.TUNE.infamyBlackMarket,
      hunters: n >= 5,
      finePct: n >= 5 ? 10 : 0,
    };
  };

  C.infamyLines = function (state) {
    const st = C.infamyStatus(state && state.infamy);
    const lines = ['Current tier: ' + st.label + ' (' + U.fmt1(st.value) + '). Raids, theft, bribes, and black manifests raise it.'];
    lines.push(st.blackMarket ? 'Reach black markets are open: sell prices get the pirate premium.' : 'Reach black markets open at infamy ' + D.TUNE.infamyBlackMarket + '.');
    lines.push(st.hunters ? 'Vigil hunters are active: periodic fines cut credits and lower infamy.' : 'At infamy 5+, Vigil hunters start collecting.');
    return lines;
  };

  C.power = function (state, ship) {
    let p = D.HULLS[ship.hull].power || 0;
    if (SW.tech.has(state, 'doc_vanguard')) p *= 1.4;
    if (SW.perks && SW.perks.has(state, 'gunner')) p *= 1.15;
    return p;
  };

  C.routeDefense = function (state, routeId) {
    if (!routeId) return 0;
    const route = state.routes.find(function (r) { return r.id === routeId; });
    if (!route) return 0;
    let p = 0, hasEscort = false;
    for (const shipId of route.ships) {
      const sh = state.ships.find(function (x) { return x.id === shipId; });
      if (sh && (D.HULLS[sh.hull].power || 0) >= 4) { p += C.power(state, sh); hasEscort = true; }
    }
    if (hasEscort && SW.tech.has(state, 'convoys')) p += 4;
    return p;
  };

  C.patrolPower = function (state, regionType) {
    let p = 0;
    for (const ret of state.retainers) {
      if (ret.region === regionType && state.tick < ret.until) p += D.TUNE.retainerPower;
    }
    return p;
  };

  function shipRegion(state, ship) {
    const sysId = ship.at !== null ? ship.at : (ship.leg ? ship.leg.to : null);
    return sysId !== null ? state.systems[sysId].region : null;
  }

  // ---------- tick: pirate raids + bounty hunters ----------
  C.tick = function (state) {
    const T = D.TUNE;
    if (state.tick >= state.combat.nextRaidAt) {
      state.combat.nextRaidAt = state.tick + Math.max(40, T.raidBaseEvery - Math.floor(state.tick / 400) * 6) + U.ri(state, -15, 25);
      attemptPirateRaid(state);
    }
    if (state.infamy >= 5 && state.tick >= state.combat.nextHunterAt) {
      state.combat.nextHunterAt = state.tick + 260 + U.ri(state, 0, 120);
      vigilHunters(state);
    }
    // expire ops & retainers
    state.retainers = state.retainers.filter(function (r) { return state.tick < r.until; });
    if (state.ops.blitz && state.tick >= state.ops.blitz.until) state.ops.blitz = null;
    if (state.ops.embargo && state.tick >= state.ops.embargo.until) state.ops.embargo = null;
  };

  function attemptPirateRaid(state) {
    const T = D.TUNE;
    // candidates: player ships in risky space with something to take
    const cands = state.ships.filter(function (sh) {
      const reg = shipRegion(state, sh);
      if (state.rep.severed >= 3 && reg === 'reach') return false;  // the Reach protects its own
      const risky = reg === 'reach' ? 3 : reg === 'verge' ? 2 : reg === 'quiet' ? 0.4 : 1;
      sh._risk = risky * (SW.ships.cargoTotal(sh) > 0 ? 2 : 0.5);
      return sh._risk > 0.8;
    });
    if (!cands.length) return;
    const victim = U.weightedPick(state, cands, function (sh) { return sh._risk; });
    if (!victim) return;
    const raidPower = T.raidBasePower + (state.tick / 1000) * T.raidPowerPer1k + U.rf(state, 0, 4);
    const reg = shipRegion(state, victim);
    let defense = C.power(state, victim) + C.routeDefense(state, victim.routeId) + C.patrolPower(state, reg);
    defense += Math.max(0, state.rep.vigil) * 0.5;
    const sysName = victim.at !== null ? state.systems[victim.at].name : state.systems[victim.leg.to].name;

    if (defense >= raidPower) {
      const bounty = Math.round(raidPower * 15);
      state.credits += bounty;
      state.rep.vigil = Math.min(10, state.rep.vigil + 0.3);
      state.stats.raidsRepelled = (state.stats.raidsRepelled || 0) + 1;
      SW.game.emit('toast', { kind: 'good', text: '⚔ Severed raid repelled near ' + sysName + '. Bounty +' + bounty + '¤.' });
      SW.game.emit('sfx', 'shield');
    } else {
      state.stats.raidsSuffered = (state.stats.raidsSuffered || 0) + 1;
      if (defense < raidPower / 2 && U.chance(state, 0.2)) {
        SW.ships.destroy(state, victim, 'taken by Severed corsairs near ' + sysName);
      } else {
        let lost = 0;
        for (const c in victim.cargo) {
          const take = Math.ceil(victim.cargo[c] / 2);
          victim.cargo[c] -= take; lost += take;
          if (victim.cargo[c] <= 0) { delete victim.cargo[c]; delete victim.basis[c]; }
        }
        SW.game.emit('toast', { kind: 'bad', text: '⚔ ' + victim.name + ' raided near ' + sysName + ' — ' + lost + ' cargo seized. Escorts exist for a reason.' });
        SW.game.emit('sfx', 'loss');
      }
    }
  }

  function vigilHunters(state) {
    const cut = Math.floor(state.credits * 0.1);
    state.credits -= cut;
    state.infamy = Math.max(0, state.infamy - 1);
    SW.game.emit('toast', { kind: 'bad', text: '⛨ Vigil enforcement seized ' + U.fmt(cut) + '¤ in "irregular freight" fines. Infamy falls.' });
  }

  // ---------- player privateering ----------
  C.raid = function (state, ship, sysId, edge) {
    const T = D.TUNE;
    const sys = state.systems[sysId];
    if (!sys || ship.at !== sysId) return { ok: false, msg: 'Ship must be at the target system.' };
    if (sys.scourge === 2) return { ok: false, msg: 'There is nothing left to steal there.' };
    if (sysId === state.homeId) return { ok: false, msg: 'You will not raid Home.' };
    const power = C.power(state, ship);
    if (power < 3) return { ok: false, msg: 'Needs an armed hull (Corvette or better).' };
    if (state.tick < (ship.raidCooldownUntil || 0)) return { ok: false, msg: 'Crew still patching the last excitement (' + (ship.raidCooldownUntil - state.tick) + ' ticks).' };

    let defense = 3 + (sys.pop || 0) * 0.15 + C.patrolPower(state, sys.region);
    if (sys.ideology === 'vigil') defense += 6;
    const dom = SW.economy.dominant(sys);
    let rival = null;
    if (dom && dom !== 'player') { rival = state.rivals.find(function (r) { return r.id === dom; }); defense += 3; }

    const cdMult = (SW.perks && SW.perks.has(state, 'dread')) ? 0.67 : 1;
    ship.raidCooldownUntil = state.tick + Math.round(T.raidCooldown * cdMult);
    // edge: tactical-simulacrum performance, clamped — skill bends odds, never breaks them
    const pWin = U.clamp(power / (power + defense) + U.clamp(U.num(edge), -0.25, 0.25), 0.05, 0.95);
    const marque = SW.tech.has(state, 'marque');

    if (U.chance(state, pWin)) {
      // loot: credits + the richest local stock
      let bestC = null, bestV = 0;
      for (const c of D.COMM_IDS) {
        const v = (sys.stocks[c] || 0) * D.COMMODITIES[c].base;
        if (v > bestV) { bestV = v; bestC = c; }
      }
      let lootCr = Math.round(150 + defense * 40) * (marque ? 1.5 : 1) * ((SW.perks && SW.perks.has(state, 'boarder')) ? 1.25 : 1);
      state.credits += Math.round(lootCr);
      let tookGoods = 0;
      if (bestC) {
        const space = SW.ships.cap(state, ship) - SW.ships.cargoTotal(ship);
        tookGoods = Math.min(space, Math.floor((sys.stocks[bestC] || 0) * 0.25));
        sys.stocks[bestC] -= tookGoods;
        if (tookGoods > 0) { ship.cargo[bestC] = (ship.cargo[bestC] || 0) + tookGoods; ship.basis[bestC] = 0; }
      }
      if (rival) sys.presence[rival.id] = Math.max(0, (sys.presence[rival.id] || 0) - 1.5);
      sys.presence.player = Math.max(0, (sys.presence.player || 0) - 0.5);
      state.infamy += marque ? 0.5 : 1;
      state.rep.vigil -= 1; state.rep.severed = Math.min(10, state.rep.severed + 0.7);
      if (sys.ideology !== 'free') state.rep[sys.ideology] = Math.max(-10, (state.rep[sys.ideology] || 0) - 1);
      state.stats.raidsLed = (state.stats.raidsLed || 0) + 1;
      SW.ships.rec(ship, 'raids');
      SW.game.emit('toast', { kind: 'good', text: '☠ Raid on ' + sys.name + ': +' + Math.round(lootCr) + '¤' + (tookGoods ? ', ' + tookGoods + ' ' + D.COMMODITIES[bestC].name + ' seized' : '') + '. Infamy rises.' });
      SW.game.emit('sfx', 'sell');
      return { ok: true, win: true };
    }
    state.infamy += 0.5;
    if (U.chance(state, 0.25)) {
      SW.ships.destroy(state, ship, 'shot down raiding ' + sys.name);
      return { ok: true, win: false, lost: true };
    }
    ship.raidCooldownUntil = state.tick + Math.round(T.raidCooldown * 2 * cdMult);
    SW.game.emit('toast', { kind: 'bad', text: '☠ Raid on ' + sys.name + ' repelled. ' + ship.name + ' limps clear.' });
    return { ok: true, win: false };
  };

  // ---------- contracts & ops ----------
  C.hireRetainer = function (state, regionType) {
    const T = D.TUNE;
    if (!SW.tech.has(state, 'retainers')) return { ok: false, msg: 'Requires Vigil Retainers research.' };
    if (!D.REGIONS[regionType]) return { ok: false, msg: 'Unknown region.' };
    if (state.rep.vigil < -2) return { ok: false, msg: 'The Vigil does not take your calls anymore.' };
    // synergy: a Vigil origin flying Vanguard doctrine gets comrade rates
    let cost = (state.origin === 'vigil' && SW.tech.has(state, 'doc_vanguard')) ? Math.round(T.retainerCost * 0.6) : T.retainerCost;
    if (state.scourgeStance === 'hold') cost = Math.round(cost * 0.75); // you declared for the line
    if (state.credits < cost) return { ok: false, msg: 'Needs ' + cost + '¤.' };
    state.credits -= cost;
    state.retainers.push({ region: regionType, until: state.tick + T.retainerTicks });
    SW.game.emit('toast', { kind: 'good', text: '⛨ Vigil patrol on retainer in the ' + D.REGIONS[regionType].name + ' for ' + T.retainerTicks + ' ticks.' });
    return { ok: true };
  };

  C.blitz = function (state, sysId) {
    const T = D.TUNE;
    const sys = state.systems[sysId];
    if (!sys || !sys.discovered) return { ok: false, msg: 'Uncharted.' };
    if (state.credits < T.blitzCost) return { ok: false, msg: 'Needs ' + T.blitzCost + '¤.' };
    if (state.ops.blitz) return { ok: false, msg: 'A trade blitz is already running.' };
    state.credits -= T.blitzCost;
    state.ops.blitz = { sys: sysId, until: state.tick + T.blitzTicks };
    SW.game.emit('toast', { kind: 'good', text: '◎ Trade blitz at ' + sys.name + ': presence gains ×3 for ' + T.blitzTicks + ' ticks.' });
    return { ok: true };
  };

  C.embargo = function (state, sysId) {
    const T = D.TUNE;
    if (!SW.tech.has(state, 'diplomacy')) return { ok: false, msg: 'Requires Corporate Diplomacy.' };
    const sys = state.systems[sysId];
    if (!sys || !sys.discovered) return { ok: false, msg: 'Uncharted.' };
    if (state.credits < T.embargoCost) return { ok: false, msg: 'Needs ' + T.embargoCost + '¤.' };
    if (state.ops.embargo) return { ok: false, msg: 'An embargo is already in force.' };
    state.credits -= T.embargoCost;
    state.ops.embargo = { sys: sysId, until: state.tick + T.embargoTicks };
    SW.game.emit('toast', { kind: 'good', text: '⊘ Embargo at ' + sys.name + ': rival expansion frozen there for ' + T.embargoTicks + ' ticks.' });
    return { ok: true };
  };

  return C;
})();
