/* STARWEFT rivals.js — competing logistics networks. DOM-free. */
var SW = globalThis.SW = globalThis.SW || {};

SW.rivals = (function () {
  const U = SW.util, D = SW.data, E = function () { return SW.economy; };
  const R = {};

  R.init = function (state) {
    state.rivals = [];
    const home = state.systems[state.homeId];
    const candidates = state.systems.filter(function (s) {
      return (s.type === 'pop' || s.type === 'industrial') && s.hops >= 3 && s.hops <= 6;
    });
    const offices = U.shuffle(state, candidates.length ? candidates : state.systems.filter(function (s) { return s.id !== home.id; }));
    for (let i = 0; i < D.RIVAL_DEFS.length && offices.length; i++) {
      const def = D.RIVAL_DEFS[i];
      const office = offices[i % offices.length];
      const rival = {
        id: def.id, name: def.name, color: def.color, blurb: def.blurb, archetype: def.archetype,
        preferred: (def.preferred || []).slice(), expand: def.expand || 'ports',
        lineTarget: def.lineTarget || 3, maxShips: def.maxShips || 6, qtyMult: def.qtyMult || 1,
        office: office.id, credits: 2000, alive: true, met: false,
        pact: false, rep: 0, ships: [], lastExpand: 0,
      };
      office.presence[rival.id] = 2.2;
      for (const nb of office.links) state.systems[nb].presence[rival.id] = 1.0;
      state.rivals.push(rival);
    }
  };

  R.zone = function (state, rival) {
    return state.systems.filter(function (s) { return (s.presence[rival.id] || 0) > 0.3 && s.scourge !== 2; });
  };

  R.tick = function (state) {
    const T = D.TUNE;
    for (const rival of state.rivals) {
      if (!rival.alive) continue;
      // arrivals deliver their cargo: rival shipments are real goods in transit,
      // bought at departure and sold on arrival — lost if the destination falls
      rival.ships = rival.ships.filter(function (sh) {
        if (state.tick < sh.arrive) return true;
        if (sh.qty > 0) {
          const dest = state.systems[sh.to];
          if (dest.scourge !== 2) {
            const sell = E().marketSell(state, dest, sh.c, sh.qty, rival.id);
            rival.credits += sell.revenue;
          }
          // Living Weave: rival shipments build lane flow along their path on arrival
          (function () {
            const lf = state.laneFlow || (state.laneFlow = {});
            const path = U.findPath(state.systems, sh.from, sh.to, function (s) { return s.scourge !== 2; });
            if (path) {
              for (let pi = 1; pi < path.length; pi++) {
                const a = path[pi - 1], b = path[pi];
                const minId = Math.min(a, b), maxId = Math.max(a, b);
                const k = minId + '-' + maxId;
                lf[k] = (lf[k] || 0) + sh.qty;
              }
            }
          })();
        }
        return false;
      });

      const zone = R.zone(state, rival);
      if (zone.length === 0) {
        rival.alive = false;
        state.story.flags['rival_collapsed_' + rival.id] = true;
        SW.game.emit('toast', { kind: 'bad', text: '⚑ ' + rival.name + ' has gone dark. Their routes are yours now.' });
        if (!(state.tutorial && state.tutorial.active)) SW.game.news(state, '⚑ ' + rival.name + ' declares insolvency; lanes revert to open tender');
        continue;
      }

      if (state.tick % T.rivalTradeEvery !== 0) continue;

      // Persistent trade lines: rivals run recurring routes the player can
      // learn, undercut (trade the same pair until the margin dies), or raid.
      rival.lines = rival.lines || [];
      // prune lines whose endpoints fell or whose margin has collapsed
      rival.lines = rival.lines.filter(function (L) {
        const a = state.systems[L.a], b = state.systems[L.b];
        if (a.scourge === 2 || b.scourge === 2) return false;
        const margin = E().sellPrice(state, b, L.c, rival.id) - E().buyPrice(state, a, L.c, rival.id);
        return margin > 1;
      });
      // establish new lines from the best margins in their zone
      if (rival.lines.length < rival.lineTarget && (state.tick - (rival.lastLinePick || 0)) > 40) {
        rival.lastLinePick = state.tick;
        const sample = zone.length > 14 ? U.shuffle(state, zone).slice(0, 14) : zone;
        let best = null;
        for (const a of sample) {
          for (const c of D.COMM_IDS) {
            if (D.COMMODITIES[c].locked) continue;
            if ((a.stocks[c] || 0) < 10) continue;
            const taken = rival.lines.some(function (L) { return L.a === a.id && L.c === c; });
            if (taken) continue;
            for (const b of sample) {
              if (b.id === a.id) continue;
              const margin = E().sellPrice(state, b, c, rival.id) - E().buyPrice(state, a, c, rival.id);
              const score = margin * (rival.preferred.indexOf(c) >= 0 ? 1.35 : 1);
              if (margin > 3 && (!best || score > best.score)) {
                // FIX: only establish a line if a lane path actually exists (no severed routes)
                const lp = U.findPath(state.systems, a.id, b.id, function (s) { return s.scourge !== 2; });
                if (lp) best = { a: a.id, b: b.id, c: c, margin: margin, score: score };
              }
            }
          }
        }
        if (best) rival.lines.push({ a: best.a, b: best.b, c: best.c });
      }
      // dispatch shipments along each line (≤2 in flight per line)
      for (const L of rival.lines) {
        if (rival.ships.length >= rival.maxShips) break;
        const sameLine = rival.ships.filter(function (sh) { return sh.from === L.a && sh.to === L.b && sh.c === L.c; }).length;
        if (sameLine >= 2) continue;
        const a = state.systems[L.a], b = state.systems[L.b];
        const qty = Math.min(Math.round(T.rivalQty * rival.qtyMult), Math.floor(a.stocks[L.c] || 0));
        if (qty < 4) continue;
        const buy = E().marketBuy(state, a, L.c, qty, rival.id);
        // FIX: skip shipment if the rival cannot afford it (prevents negative credits)
        if (buy.cost > rival.credits) continue;
        // FIX: use lane-graph BFS hop count for travel time instead of Euclidean distance.
        // Each hop is scaled by ~12 ticks (tuned so adjacent systems ~12t, 3 hops ~36t —
        // matches the old Euclidean formula's typical range for nearby systems).
        const path = U.findPath(state.systems, L.a, L.b, function (s) { return s.scourge !== 2; });
        // path is null only if severed by corruption; line-prune above already catches
        // corrupted endpoints, but a mid-path corruption can split the graph after a line
        // was established — in that case skip the dispatch rather than send through the void.
        if (!path) continue;
        const hops = path.length - 1;
        const ticks = Math.max(3, hops * 12);
        rival.credits -= buy.cost;
        rival.ships.push({ from: L.a, to: L.b, depart: state.tick, arrive: state.tick + ticks, c: L.c, qty: buy.qty });
      }

      // expansion creep toward population, respecting pacts.
      // The Long Quiet (rivalAggression > 1) makes rivals push harder/faster.
      let aggr = D.condFx ? D.condFx(state, 'rivalAggression', 1) : 1;
      // The Long Memory: a met rival whose turf the player has crowded into
      // holds a grudge and presses back harder, scaled by the encroachment.
      if (D.condHas && D.condHas(state, 'rivalGrudge') && rival.met) {
        let crowd = 0;
        for (const z of zone) crowd += Math.min(1, z.presence.player || 0);
        if (crowd > 0) aggr *= 1 + Math.min(0.6, crowd * 0.15);
      }
      if (state.tick - rival.lastExpand > Math.round(30 / aggr) && U.chance(state, U.clamp(0.5 * aggr, 0, 0.95))) {
        rival.lastExpand = state.tick;
        let bestNb = null, bestScore = 0;
        for (const z of zone) {
          for (const nbId of z.links) {
            const nb = state.systems[nbId];
            if ((nb.presence[rival.id] || 0) > 0.3 || nb.scourge === 2) continue;
            if (rival.pact && E().dominant(nb) === 'player') continue;
            if (state.ops && state.ops.embargo && state.ops.embargo.sys === nb.id) continue;
            const score = expansionScore(rival, nb);
            if (score > bestScore) { bestScore = score; bestNb = nb; }
          }
        }
        if (bestNb) {
          bestNb.presence[rival.id] = (bestNb.presence[rival.id] || 0) + 0.6;
          if (!rival.met && bestNb.discovered && (bestNb.presence.player || 0) > 0.2) {
            rival.met = true;
            state.story.flags['met_' + rival.id] = true;
          }
        }
      }
      // meeting can also happen when the player trades into their zone
      if (!rival.met) {
        for (const z of zone) {
          if ((z.presence.player || 0) > 0.4) { rival.met = true; state.story.flags['met_' + rival.id] = true; break; }
        }
      }
    }
  };

  function expansionScore(rival, sys) {
    let score = 1 + (sys.pop || 0);
    if (rival.expand === 'industrial' && sys.type === 'industrial') score += 18;
    if (rival.expand === 'ports' && (sys.type === 'pop' || sys.type === 'gas')) score += 12;
    if (rival.expand === 'front' && (sys.scourge === 1 || sys.region === 'verge')) score += 20;
    if (rival.expand === 'population' && sys.type === 'pop') score += 18;
    if (rival.expand === 'ruins' && (sys.type === 'derelict' || sys.wonder || sys.region === 'oldstream')) score += 22;
    if (rival.expand === 'reach' && sys.region === 'reach') score += 24;
    return score;
  }

  // Buyout cost scales with their footprint.
  R.buyoutCost = function (state, rival) {
    const zone = R.zone(state, rival);
    let presence = 0;
    for (const z of zone) presence += z.presence[rival.id] || 0;
    return Math.round(20000 + presence * 2200);
  };
  R.buyout = function (state, rival) {
    const cost = R.buyoutCost(state, rival);
    if (state.credits < cost) return { ok: false, msg: 'Need ' + U.fmt(cost) + '¤.' };
    state.credits -= cost;
    for (const sys of state.systems) {
      if (sys.presence[rival.id]) {
        sys.presence.player = (sys.presence.player || 0) + sys.presence[rival.id] * 0.7;
        delete sys.presence[rival.id];
      }
    }
    rival.alive = false;
    rival.absorbed = true;
    state.story.flags['absorbed_' + rival.id] = true;
    SW.game.emit('toast', { kind: 'good', text: '✦ ' + rival.name + ' is now part of the weave.' });
    return { ok: true };
  };

  return R;
})();
