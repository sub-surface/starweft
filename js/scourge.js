/* STARWEFT scourge.js — the spreading end of all markets. DOM-free. */
var SW = globalThis.SW = globalThis.SW || {};

SW.scourge = (function () {
  const U = SW.util, D = SW.data;
  const SC = {};

  SC.init = function (state) {
    const diff = D.DIFFICULTY[state.difficulty];
    // The threat preset (if any) overrides the scourge clock while leaving the
    // economic difficulty (credits/research) alone. 'inherit' falls back to the
    // difficulty's own numbers. Conditions may further stretch the start.
    const thr = (D.THREAT && D.THREAT[state.threat]) || {};
    let startAt = thr.scourgeStart !== undefined ? thr.scourgeStart : diff.scourgeStart;
    let interval = thr.spreadEvery !== undefined ? thr.spreadEvery : diff.spreadEvery;
    let accel = thr.spreadAccel !== undefined ? thr.spreadAccel : diff.spreadAccel;
    // The Long Quiet (and friends) push the waking further out.
    if (startAt > 0) startAt = Math.round(startAt * (D.condFx ? D.condFx(state, 'scourgeStartMult', 1) : 1));
    // The Named Adversary: the threat gets a name and a temperament. The
    // temperament lightly bends spread feel; 'neutral' leaves every multiplier
    // at 1, so an un-chosen ('inherit') threat plays exactly as before. Named
    // via the seeded RNG so replays match.
    const temps = Object.keys(D.SCOURGE_TEMPERAMENTS);
    let tempId = 'neutral';
    if (state.threat === 'relentless' || state.threat === 'early') tempId = 'ravenous';
    else if (state.threat === 'slow' || state.threat === 'dormant') tempId = 'patient';
    else if (D.SCOURGE_TEMPERAMENTS[state.threat]) tempId = state.threat;
    else if (startAt >= 0 && U.chance(state, 0.5)) tempId = U.pick(state, temps); // 'inherit'/standard: a coin-flip personality
    const temp = D.SCOURGE_TEMPERAMENTS[tempId] || D.SCOURGE_TEMPERAMENTS.neutral;
    if (startAt > 0) interval = Math.round(interval * (temp.intervalMult || 1));
    state.scourge = {
      phase: startAt < 0 ? 'never' : 'dormant',
      startAt: startAt,
      interval: interval,
      accel: accel,
      nextAt: 0,
      delivered: 0,
      originId: state.scourgeOriginId,
      name: startAt < 0 ? null : U.pick(state, D.SCOURGE_NAMES),
      temperament: tempId,
    };
  };

  SC.corruptedCount = function (state) {
    let n = 0;
    for (const s of state.systems) if (s.scourge === 2) n++;
    return n;
  };

  SC.tick = function (state) {
    const sc = state.scourge, T = D.TUNE;
    tickCohorts(state); // convoys in flight settle even after the cure
    if (sc.phase === 'never' || sc.phase === 'cured') return;

    if (sc.phase === 'dormant') {
      if (state.tick >= sc.startAt) {
        sc.phase = 'active';
        sc.nextAt = state.tick + sc.interval;
        corrupt(state, state.systems[sc.originId], true);
        state.story.flags.scourge_awake = true;
        state.story.flags.scourge_known = true;
        if (sc.name) {
          const t = (D.SCOURGE_TEMPERAMENTS[sc.temperament] || {}).name || '';
          SW.game.news(state, 'They are calling it ' + sc.name + (t ? ' — ' + t + ', and awake' : ', and it is awake') + '.', sc.originId);
        }
      }
      return;
    }

    // threatened -> corrupted
    for (const sys of state.systems) {
      if (sys.scourge === 1 && state.tick >= sys.threatAt) corrupt(state, sys, false);
    }

    // spread attempt
    if (state.tick >= sc.nextAt) {
      const temp = (D.SCOURGE_TEMPERAMENTS && D.SCOURGE_TEMPERAMENTS[sc.temperament]) || {};
      // A capricious adversary jitters its rhythm; others keep a steady beat.
      const jitter = temp.variance ? (1 + (U.rnd(state) * 2 - 1) * temp.variance) : 1;
      sc.nextAt = state.tick + Math.max(T.scourgeMinInterval, Math.round(sc.interval * jitter));
      sc.interval = Math.max(T.scourgeMinInterval, sc.interval - sc.accel);
      const richBias = temp.richBias || 1;

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
          // richBias amplifies the pull toward populous worlds (a ravenous
          // adversary goes for the throat; a patient one is more even-handed).
          const weight = 1 + (tgt.pop > 0 ? 1 * richBias : 0) + (corruptedNeighbors >= 2 ? 1 : 0);
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
            SC.ensureCohort(state, tgt);
            if (tgt.discovered) {
              SW.game.emit('toast', { kind: 'bad', text: '△ The Scourge reaches for ' + tgt.name + '. ' + T.scourgeWarnTicks + ' ticks to act.' });
              SW.game.emit('sfx', 'dread');
            }
          }
        }
      }
    }
  };

  // Nearest haven by BFS lane hops, corrupted systems impassable; Euclidean
  // fallback so refugees flee rather than vanish when the lanes are severed.
  SC.chooseHaven = function (state, sys) {
    let haven = null, bestHops = Infinity;
    for (const s of state.systems) {
      if (s.id === sys.id || s.scourge !== 0 || s.type !== 'pop') continue;
      const lp = U.findPath(state.systems, sys.id, s.id, function (ns) { return ns.scourge !== 2; });
      if (lp && lp.length - 1 < bestHops) { bestHops = lp.length - 1; haven = s; }
    }
    if (!haven) {
      let hd = Infinity;
      for (const s of state.systems) {
        if (s.id === sys.id || s.scourge !== 0 || s.type !== 'pop') continue;
        const d = U.dist(s, sys);
        if (d < hd) { hd = d; haven = s; }
      }
      bestHops = 3; // severed lanes: the long way round, abstracted
    }
    return haven ? { haven: haven, hops: Math.max(1, bestHops) } : null;
  };

  // ---- refugee cohorts: civilians wait, board convoys, and travel ----
  // A quarter of a threatened world queues at the port. NPC convoys drain the
  // queue down real lanes over time; the player can board them onto berths.
  // Whoever is still waiting when the Scourge lands is lost with the system.
  SC.ensureCohort = function (state, sys) {
    if (!(sys.pop > 0)) return null;
    state.cohorts = state.cohorts || [];
    let co = state.cohorts.find(function (x) { return x.from === sys.id; });
    if (co) return co;
    const pick = SC.chooseHaven(state, sys);
    if (!pick) return null;
    co = {
      id: 'co' + (state.nextCohortId = (state.nextCohortId || 0) + 1),
      from: sys.id, haven: pick.haven.id, hops: pick.hops,
      n: Math.round(sys.pop * 0.25 * 100) / 100, // waiting at the port (still counted in sys.pop)
      moving: [], deadline: sys.threatAt,
    };
    state.cohorts.push(co);
    if (sys.discovered) {
      SW.story.pushHail(state, { key: 'evac:' + sys.id, id: 'ev_evac', ctx: { sysId: sys.id }, at: state.tick, title: 'EVACUATION — ' + sys.name.toUpperCase(), mood: 'bad' });
      SW.game.news(state, '⇢ ' + sys.name + ' calls for evacuation — ' + U.fmt1(co.n) + 'M waiting at the port.', sys.id);
    }
    return co;
  };

  function settle(state, sysId, n, fromName) {
    const sys = state.systems[sysId];
    if (!sys || sys.scourge === 2 || !(n > 0)) { // dead haven: the convoy is lost
      state.stats.popLost = Math.round(((state.stats.popLost || 0) + n) * 100) / 100;
      return;
    }
    const ratio = (sys.pop + n) / Math.max(1, sys.pop);
    sys.pop += n;
    for (const c in sys.cons) sys.cons[c] *= ratio;
    if (sys.discovered) SW.game.news(state, '⇢ Refugee convoys from ' + fromName + ' swell the markets at ' + sys.name, sys.id);
  }

  function tickCohorts(state) {
    const cos = state.cohorts;
    if (!cos || !cos.length) return;
    const T = D.TUNE;
    for (let i = cos.length - 1; i >= 0; i--) {
      const co = cos[i];
      const from = state.systems[co.from];
      // arrivals integrate over time
      for (let j = co.moving.length - 1; j >= 0; j--) {
        if (state.tick >= co.moving[j].arriveAt) {
          settle(state, co.haven, co.moving[j].n, from.name);
          co.moving.splice(j, 1);
        }
      }
      // the threat resolved (inoculated or fallen): no one else boards
      if (from.scourge !== 1) {
        co.n = 0; // safe again: they unpack; fallen: already counted with the system
        if (!co.moving.length) cos.splice(i, 1);
        continue;
      }
      // NPC convoys depart on a steady cadence
      if (co.n > 0 && state.tick % T.cohortConvoyEvery === 0) {
        const dep = Math.min(T.cohortConvoyPop, co.n);
        co.n = Math.round((co.n - dep) * 100) / 100;
        from.pop = Math.max(0, from.pop - dep);
        co.moving.push({ n: dep, arriveAt: state.tick + co.hops * T.cohortHopTicks });
      }
    }
  }

  function corrupt(state, sys, isOrigin) {
    if (sys.scourge === 2) return;
    sys.scourge = 2;
    sys.discovered = true; // horror is always news
    // whoever is still queued at the port dies with the world (they are in sys.pop)
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
