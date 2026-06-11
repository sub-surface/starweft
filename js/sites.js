/* STARWEFT sites.js — facilities on bodies: the in-system layer. DOM-free.
   A facility attaches to a named body inside a system (the names are stable —
   they derive from the immutable catalog designation). Production and research
   effects flow through the economy tick; capacity and population are applied
   once at construction. Dark sites in corrupted systems simply stop. */
var SW = globalThis.SW = globalThis.SW || {};

SW.sites = (function () {
  const U = SW.util, D = SW.data;
  const S = {};

  S.list = function (sys) { return sys.sites || []; };
  S.at = function (sys, bodyName) {
    return (sys.sites || []).find(function (x) { return x.body === bodyName; }) || null;
  };

  // Facilities this body could host (excluding its current one).
  S.options = function (state, sys, body) {
    if (!body || S.at(sys, body.name)) return [];
    const out = [];
    for (const id in D.FACILITIES) {
      if (D.FACILITIES[id].sites.indexOf(body.type) >= 0) out.push(id);
    }
    return out;
  };

  S.costOf = function (state, facId) {
    const f = D.FACILITIES[facId];
    let cost = f.cost * (SW.tech.has(state, 'orbitalworks') ? 0.75 : 1);
    if (SW.perks && SW.perks.has(state, 'foreman')) cost *= 0.85;
    return Math.round(cost);
  };

  // Per-tick aggregate of a system's living sites (cheap: most systems have none).
  // Optional state arg lets perks scale output; omitted (tests/saves) = base rates.
  S.fx = function (sys, state) {
    const fx = { prod: {}, research: 0 };
    const prodMult = (state && SW.perks && SW.perks.has(state, 'living')) ? 1.2 : 1;
    for (const site of (sys.sites || [])) {
      const f = D.FACILITIES[site.fac];
      if (!f || !f.fx) continue;
      if (f.fx.prod) for (const c in f.fx.prod) fx.prod[c] = (fx.prod[c] || 0) + f.fx.prod[c] * prodMult;
      if (f.fx.research) fx.research += f.fx.research;
    }
    return fx;
  };

  // Build: same site rules as buildings — credits + materials on-site.
  S.build = function (state, sysId, bodyName, facId) {
    const sys = state.systems[sysId];
    const f = D.FACILITIES[facId];
    if (!sys || !f) return { ok: false, msg: 'Unknown.' };
    if (sys.scourge === 2) return { ok: false, msg: 'The Scourge holds that system.' };
    if (!sys.surveyed) return { ok: false, msg: 'Survey the system before developing its worlds.' };
    if (!SW.ships.inRange(state, sys)) return { ok: false, msg: 'Outside command range — relays first.' };
    const body = SW.planets.get(state, sysId).bodies.find(function (b) { return b.name === bodyName; });
    if (!body) return { ok: false, msg: 'No such body.' };
    if (f.sites.indexOf(body.type) < 0) return { ok: false, msg: f.name + ' cannot anchor at a ' + body.type + ' body.' };
    if (S.at(sys, bodyName)) return { ok: false, msg: bodyName + ' already hosts a facility.' };
    const cost = S.costOf(state, facId);
    if (state.credits < cost) return { ok: false, msg: 'Needs ' + U.fmt(cost) + '¤.' };

    // materials: depot + idle player ships here
    const localShips = state.ships.filter(function (sh) { return sh.at === sysId && sh.mode === 'idle'; });
    for (const c in f.mats) {
      let have = (sys.depot ? (sys.depot[c] || 0) : 0);
      for (const sh of localShips) have += sh.cargo[c] || 0;
      if (have < f.mats[c]) {
        return { ok: false, msg: 'Needs ' + f.mats[c] + ' ' + D.COMMODITIES[c].name + ' on-site (' + Math.floor(have) + ' present). Deliver it here.' };
      }
    }
    for (const c in f.mats) {
      let need = f.mats[c];
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
    state.credits -= cost;
    sys.sites = sys.sites || [];
    sys.sites.push({ body: bodyName, fac: facId });
    // one-time effects
    if (f.fx && f.fx.cap) {
      for (const c of D.COMM_IDS) sys.capacity[c] = (sys.capacity[c] || D.TUNE.capDefault) + f.fx.cap;
    }
    if (f.fx && f.fx.pop) {
      const popGain = f.fx.pop + ((SW.perks && SW.perks.has(state, 'planner')) ? 1 : 0);
      const ratio = (sys.pop + popGain) / Math.max(0.5, sys.pop || 0.5);
      sys.pop = (sys.pop || 0) + popGain;
      if (sys.pop > 0 && !sys.cons.FOOD) { sys.cons.FOOD = 0.035 * sys.pop; sys.cons.FUEL = 0.024 * sys.pop; }
      else for (const c in sys.cons) sys.cons[c] *= ratio;
      sys.prosperity = Math.max(sys.prosperity || 0, 35);
    }
    state.stats.sitesBuilt = (state.stats.sitesBuilt || 0) + 1;
    SW.game.emit('toast', { kind: 'good', text: f.icon + ' ' + f.name + ' anchored at ' + bodyName + '.' });
    SW.game.emit('sfx', 'build');
    return { ok: true };
  };

  return S;
})();
