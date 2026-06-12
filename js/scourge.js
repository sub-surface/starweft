/* STARWEFT scourge.js — the spreading end of all markets. DOM-free. */
var SW = globalThis.SW = globalThis.SW || {};

SW.scourge = (function () {
  const U = SW.util, D = SW.data;
  const SC = {};

  SC.init = function (state) {
    const diff = D.DIFFICULTY[state.difficulty];
    state.scourge = {
      phase: diff.scourgeStart < 0 ? 'never' : 'dormant',
      startAt: diff.scourgeStart,
      interval: diff.spreadEvery,
      accel: diff.spreadAccel,
      nextAt: 0,
      delivered: 0,
      originId: state.scourgeOriginId,
    };
  };

  SC.corruptedCount = function (state) {
    let n = 0;
    for (const s of state.systems) if (s.scourge === 2) n++;
    return n;
  };

  SC.tick = function (state) {
    const sc = state.scourge, T = D.TUNE;
    if (sc.phase === 'never' || sc.phase === 'cured') return;

    if (sc.phase === 'dormant') {
      if (state.tick >= sc.startAt) {
        sc.phase = 'active';
        sc.nextAt = state.tick + sc.interval;
        corrupt(state, state.systems[sc.originId], true);
        state.story.flags.scourge_awake = true;
        state.story.flags.scourge_known = true;
      }
      return;
    }

    // threatened -> corrupted
    for (const sys of state.systems) {
      if (sys.scourge === 1 && state.tick >= sys.threatAt) corrupt(state, sys, false);
    }

    // spread attempt
    if (state.tick >= sc.nextAt) {
      sc.nextAt = state.tick + Math.max(T.scourgeMinInterval, sc.interval);
      sc.interval = Math.max(T.scourgeMinInterval, sc.interval - sc.accel);

      // FIX: frontier-weighted spread. Accumulate all (corrupted -> eligible-neighbor) edges,
      // then pick one weighted by target attractiveness rather than random source + random target.
      // Weight = 1 + pop_bonus + pincer_bonus. Overall spread rate is unchanged (one attempt per interval).
      const frontier = [];
      for (const src of state.systems) {
        if (src.scourge !== 2) continue;
        for (const nid of src.links) {
          const tgt = state.systems[nid];
          if (tgt.scourge !== 0 || state.tick < (tgt.immuneUntil || 0)) continue;
          // count how many of tgt's neighbors are already corrupted (pincer pressure)
          let corruptedNeighbors = 0;
          for (const nid2 of tgt.links) { if (state.systems[nid2].scourge === 2) corruptedNeighbors++; }
          const weight = 1 + (tgt.pop > 0 ? 1 : 0) + (corruptedNeighbors >= 2 ? 1 : 0);
          frontier.push({ tgt: tgt, weight: weight });
        }
      }
      if (frontier.length) {
        const chosen = U.weightedPick(state, frontier, function (e) { return e.weight; });
        if (chosen) {
          const tgt = chosen.tgt;
          if (tgt.buildings.indexOf('bastion') >= 0 && U.chance(state, T.bastionBlock)) {
            SW.game.emit('toast', { kind: 'good', text: '⛨ The bastion at ' + tgt.name + ' held the line.' });
            SW.game.emit('sfx', 'shield');
          } else {
            tgt.scourge = 1;
            tgt.threatAt = state.tick + T.scourgeWarnTicks;
            if (tgt.discovered) {
              SW.game.emit('toast', { kind: 'bad', text: '△ The Scourge reaches for ' + tgt.name + '. ' + T.scourgeWarnTicks + ' ticks to act.' });
              SW.game.emit('sfx', 'dread');
            }
          }
        }
      }
    }
  };

  function corrupt(state, sys, isOrigin) {
    if (sys.scourge === 2) return;
    sys.scourge = 2;
    sys.discovered = true; // horror is always news

    // exodus: a quarter of the population flees down the lanes ahead of the end
    const refugees = Math.round(sys.pop * 0.25);
    if (refugees > 0) {
      // FIX: choose nearest haven by BFS lane hops, treating corrupted systems as impassable,
      // so refugees cannot teleport across a corrupted gap. Fall back to Euclidean if no
      // lane-reachable safe population center exists (refugees flee rather than vanish).
      let haven = null;
      let bestHops = Infinity;
      for (const s of state.systems) {
        if (s.id === sys.id || s.scourge !== 0 || s.type !== 'pop') continue;
        const lp = U.findPath(state.systems, sys.id, s.id, function (ns) { return ns.scourge !== 2; });
        if (lp) {
          const hops = lp.length - 1;
          if (hops < bestHops) { bestHops = hops; haven = s; }
        }
      }
      if (!haven) {
        // fallback: Euclidean nearest (lane severed by total corruption)
        let hd = Infinity;
        for (const s of state.systems) {
          if (s.id === sys.id || s.scourge !== 0 || s.type !== 'pop') continue;
          const d = U.dist(s, sys);
          if (d < hd) { hd = d; haven = s; }
        }
      }
      if (haven) {
        const ratio = (haven.pop + refugees) / Math.max(1, haven.pop);
        haven.pop += refugees;
        for (const c in haven.cons) haven.cons[c] *= ratio;
        sys.pop -= refugees;
        if (haven.discovered) {
          SW.game.emit('toast', { kind: 'info', text: '⇢ Refugees from ' + sys.name + ' reach ' + haven.name + '. Its markets swell.' });
          SW.game.news(state, '⇢ Refugee convoys from ' + sys.name + ' swell the markets at ' + haven.name, haven.id);
        }
      }
    }
    // rival networks pull half their standing out to safer holdings
    for (const f in sys.presence) {
      if (f === 'player' || sys.presence[f] <= 0.5) continue;
      const safe = state.systems.filter(function (s) { return s.scourge === 0 && (s.presence[f] || 0) > 0; });
      if (safe.length) {
        const t = U.pick(state, safe);
        t.presence[f] = Math.min(10, (t.presence[f] || 0) + sys.presence[f] * 0.5);
      }
    }

    state.stats.systemsLost = (state.stats.systemsLost || 0) + 1;
    state.stats.popLost = (state.stats.popLost || 0) + sys.pop;
    sys.popBefore = sys.pop;
    sys.pop = 0;
    sys.prosperity = 0;
    sys.buildings = [];
    sys.depot = null;
    sys.slots = [];
    for (const f in sys.presence) delete sys.presence[f];

    // ships caught at the system
    for (const ship of state.ships.slice()) {
      if (ship.at === sys.id && state.tech.unlocked.indexOf('scourge2') < 0) {
        SW.ships.destroy(state, ship, 'consumed at ' + sys.name);
      }
    }
    if (!isOrigin) {
      SW.game.emit('toast', { kind: 'bad', text: '✕ ' + sys.name + ' has fallen to the Scourge.' });
      SW.game.emit('sfx', 'fall');
    }
  }

  // Deliver PANACEA from a ship at the origin. Win at TUNE.panaceaToWin.
  SC.deliverPanacea = function (state, ship) {
    const sc = state.scourge;
    if (ship.at !== sc.originId) return { ok: false, msg: 'The Panacea must reach the origin itself.' };
    const qty = Math.floor(ship.cargo.PANACEA || 0);
    if (qty <= 0) return { ok: false, msg: 'No Panacea aboard.' };
    delete ship.cargo.PANACEA; delete ship.basis.PANACEA;
    sc.delivered += qty;
    state.stats.panaceaDelivered = sc.delivered;
    SW.game.emit('toast', { kind: 'good', text: '✺ ' + qty + ' Panacea delivered to the origin (' + sc.delivered + '/' + D.TUNE.panaceaToWin + ').' });
    SW.game.emit('sfx', 'panacea');
    if (sc.delivered >= D.TUNE.panaceaToWin) cureAll(state);
    return { ok: true, qty: qty };
  };

  // Spend PANACEA at a threatened system to clear the threat and grant immunity.
  SC.inoculate = function (state, ship) {
    const sys = state.systems[ship.at];
    if (!sys || sys.scourge !== 1) return { ok: false, msg: 'This system is not under imminent threat.' };
    const need = D.TUNE.panaceaToInoculate;
    if ((ship.cargo.PANACEA || 0) < need) return { ok: false, msg: 'Needs ' + need + ' Panacea aboard.' };
    ship.cargo.PANACEA -= need;
    if (ship.cargo.PANACEA <= 0) { delete ship.cargo.PANACEA; delete ship.basis.PANACEA; }
    sys.scourge = 0;
    sys.immuneUntil = state.tick + D.TUNE.inoculateImmunity;
    state.stats.inoculated = (state.stats.inoculated || 0) + 1;
    SW.game.emit('toast', { kind: 'good', text: '✚ ' + sys.name + ' inoculated. The reaching hand recoils.' });
    SW.game.emit('sfx', 'panacea');
    return { ok: true };
  };

  function cureAll(state) {
    state.scourge.phase = 'cured';
    for (const sys of state.systems) {
      if (sys.scourge === 2) {
        sys.scourge = 0;
        sys.scarred = true;
        sys.immuneUntil = 1e15; // forever (JSON-safe)
        sys.pop = Math.max(1, Math.round((sys.popBefore || 4) * 0.3)); // survivors emerge
        sys.prosperity = 30;
        if (sys.pop > 0) {
          sys.cons.FOOD = 0.035 * sys.pop;
          sys.cons.FUEL = 0.024 * sys.pop;
        }
      }
    }
    state.story.flags.scourge_cured = true;
  };

  // Lose checks (game.js consults this each tick).
  SC.checkLoss = function (state) {
    const home = state.systems[state.homeId];
    if (home.scourge === 2) return { lost: true, reason: 'Home is gone. The weave unravels from its first knot.' };
    if (state.scourge.phase === 'active') {
      const popsLeft = state.systems.some(function (s) { return s.type === 'pop' && s.scourge !== 2; });
      if (!popsLeft) return { lost: true, reason: 'No population center remains. There is no one left to deliver to.' };
    }
    return { lost: false };
  };

  return SC;
})();
