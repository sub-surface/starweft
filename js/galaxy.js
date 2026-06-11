/* STARWEFT galaxy.js — the local bubble, in three dimensions. DOM-free.
   Real catalog stars + procedural fill (denser coreward), biome regions,
   wonders, ideologies. Economies are derived from each system's actual
   planets — geography is destiny. */
var SW = globalThis.SW = globalThis.SW || {};

SW.galaxy = (function () {
  const U = SW.util, D = SW.data;
  const G = {};

  G.generate = function (state) {
    const T = D.TUNE;
    const W = state.world || D.resolveWorld(); // run parameters: density/wealth/badlands
    SW.planets.clearCache();

    // ---- 1. stars: real catalog, then procedural fill ----
    const stars = [{ name: 'Sol', x: 0, y: 0, z: 0, spec: 'G2V', companions: [], knownPlanets: 8, note: 'Home. The original orchard.', real: true }];
    for (const s of SW.starcat.build()) {
      if (s.dist <= W.bubbleR) stars.push(s);
    }
    fillProcedural(state, stars, W);

    state.systems = stars.map(function (s, i) {
      return {
        id: i, name: s.name, cat: s.name, catalog: !!s.catalog,
        x: Math.round(s.x * 100) / 100, y: Math.round(s.y * 100) / 100, z: Math.round(s.z * 100) / 100,
        spec: s.spec, companions: s.companions || [], knownPlanets: s.knownPlanets || 0,
        note: s.note || '', real: !!s.real,
        type: 'frontier', links: [], pop: 0, prosperity: 55,
        stocks: {}, capacity: {}, prod: {}, cons: {}, slots: [],
        buildings: [], depot: null, presence: {},
        discovered: false, surveyed: false, scourge: 0, threatAt: 0, immuneUntil: 0,
        satNeed: 0.5, satWant: 0, hops: 0,
        region: null, ideology: 'free', wonder: null,
      };
    });
    state.homeId = 0;

    // ---- 2. regions (biomes) ----
    makeRegions(state, W);

    // ---- 3. wonders: one quiet black hole, one Dyson husk ----
    placeWonders(state, W);

    // ---- 4. lanes: 3D Gabriel graph, patched connected ----
    const edges = gabriel3D(state.systems);
    connect(state.systems, edges);
    for (const e of edges) {
      state.systems[e[0]].links.push(e[1]);
      state.systems[e[1]].links.push(e[0]);
    }

    // ---- 5. hops + scourge origin (coreward verge, far from Sol) ----
    const hops = bfsHops(state.systems, 0);
    let maxHops = 1;
    for (const s of state.systems) { s.hops = hops[s.id] !== undefined ? hops[s.id] : 99; maxHops = Math.max(maxHops, s.hops); }
    let origin = null, bestScore = -1e9;
    for (const s of state.systems) {
      if (s.id === 0 || s.wonder) continue;
      const score = s.x * 2 + s.hops * 3 + U.dist(s, state.systems[0]) * 0.5; // coreward + far
      if (score > bestScore) { bestScore = score; origin = s; }
    }
    state.scourgeOriginId = origin.id;
    if (!origin.region) origin.region = 'verge';

    // ---- 6. types from planets, ideologies, economies ----
    assignTypes(state);
    assignIdeologies(state);
    initEconomies(state, W);

    // ---- 7. the badlands: a dark shell beyond the bubble (Deep Drives) ----
    makeBadlands(state, W);

    // ---- 8. reveal & survey home neighborhood ----
    const home = state.systems[0];
    home.discovered = true; home.surveyed = true;
    for (const nb of home.links) { state.systems[nb].discovered = true; state.systems[nb].surveyed = true; }
    return state;
  };

  // ---------- badlands ----------
  // Sparse, coreward-heavy, no settled worlds: untouched veins, dead stations,
  // and the long dark. Lanes exist (the Loom wove far) but only Deep Drives
  // can hold a ship together on them — gating lives in ships.findPath.
  function makeBadlands(state, W) {
    const T = D.TUNE;
    const innerR = W.bubbleR * 1.12;
    const pts = [];
    let tries = 0, id = 9000;
    while (pts.length < W.badlandsCount && tries++ < 200000) {
      const u = U.rnd(state), v = U.rnd(state), w = U.rnd(state);
      const r = innerR + (W.badlandsR - innerR) * Math.cbrt(u);
      const th = Math.acos(2 * v - 1), ph = 2 * Math.PI * w;
      const x = r * Math.sin(th) * Math.cos(ph);
      const y = r * Math.sin(th) * Math.sin(ph);
      const z = r * Math.cos(th) * 0.5;
      if (Math.sqrt(x * x + y * y + z * z) < innerR) continue; // disk squash must not tuck points back inside
      const coreBias = 0.15 + 0.85 * (x / W.badlandsR + 1) / 2;
      if (U.rnd(state) > coreBias) continue;
      const p = { x: x, y: y, z: z };
      let ok = true;
      for (const q of pts) { if (U.dist(q, p) < W.minSysDist * 1.6) { ok = false; break; } }
      if (!ok) continue;
      p.spec = rollSpectral(state);
      p.name = 'DWS ' + (id += U.ri(state, 3, 17));
      pts.push(p);
    }
    const base = state.systems.length;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const sys = {
        id: base + i, name: p.name, cat: p.name, catalog: true, badlands: true,
        x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, z: Math.round(p.z * 100) / 100,
        spec: p.spec, companions: [], knownPlanets: 0, note: '', real: false,
        type: 'frontier', links: [], pop: 0, prosperity: 30,
        stocks: {}, capacity: {}, prod: {}, cons: {}, slots: [],
        buildings: [], depot: null, presence: {},
        discovered: false, surveyed: false, scourge: 0, threatAt: 0, immuneUntil: 0,
        satNeed: 0.5, satWant: 0, hops: 99,
        region: null, ideology: 'free', wonder: null,
      };
      state.systems.push(sys);
      // lean economies: untouched veins run rich; dead stations hoard salvage
      for (const c of D.COMM_IDS) { sys.stocks[c] = 0; sys.capacity[c] = T.capDefault; }
      const pr = SW.planets.profile(state, sys.id);
      if (U.chance(state, 0.12)) {
        sys.type = 'derelict';
        sys.stocks.TECH = U.ri(state, 20, 50);
        sys.stocks.CRYSTAL = U.ri(state, 15, 40);
      } else if (pr.ore > 0.5) {
        sys.type = 'mining';
        sys.prod.ORE = Math.max(0.6, pr.ore * 0.7) * U.rf(state, 1.1, 1.7);
        if (pr.crystal > 0.3) sys.prod.CRYSTAL = U.rf(state, 0.25, 0.55);
      } else if (pr.gas > 0.5) {
        sys.type = 'gas';
        sys.prod.GAS = Math.max(0.7, pr.gas * 0.8) * U.rf(state, 1.1, 1.7);
      }
      for (const c in sys.prod) { sys.capacity[c] = T.capProducer; sys.stocks[c] = Math.round(sys.capacity[c] * U.rf(state, 0.5, 0.8)); }
    }
    // lanes: their own web (longer reach — sparser stars), kept internally connected
    const edges = gabriel3D(pts, (T.badlandsLaneMax * T.badlandsLaneMax) / 4);
    connect(pts, edges);
    for (const e of edges) {
      state.systems[base + e[0]].links.push(base + e[1]);
      state.systems[base + e[1]].links.push(base + e[0]);
    }
    // bridges: the few old weftlines that leave the bubble
    const fringe = pts.map(function (p, i) { return i; }).sort(function (a, b) {
      return U.dist(pts[a], state.systems[0]) - U.dist(pts[b], state.systems[0]);
    }).slice(0, 3);
    for (const bi of fringe) {
      const bSys = state.systems[base + bi];
      let near = null, nd = Infinity;
      for (let i = 0; i < base; i++) {
        const d = U.dist(state.systems[i], bSys);
        if (d < nd) { nd = d; near = state.systems[i]; }
      }
      if (near && bSys.links.indexOf(near.id) < 0) {
        bSys.links.push(near.id);
        near.links.push(bSys.id);
      }
    }
  }

  // ---------- placement ----------
  function fillProcedural(state, stars, W) {
    let tries = 0, id = 1000;
    while (stars.length < W.sysCount && tries < 120000) {
      tries++;
      // uniform in sphere, then coreward (+x) acceptance bias
      const u = U.rnd(state), v = U.rnd(state), w = U.rnd(state);
      const r = W.bubbleR * Math.cbrt(u);
      const th = Math.acos(2 * v - 1), ph = 2 * Math.PI * w;
      const x = r * Math.sin(th) * Math.cos(ph);
      const y = r * Math.sin(th) * Math.sin(ph);
      const z = r * Math.cos(th) * 0.62;      // thin-disk squash
      const coreBias = 0.25 + 0.75 * (x / W.bubbleR + 1) / 2; // metallicity gradient: coreward is richer
      if (U.rnd(state) > coreBias) continue;
      let ok = true;
      const p = { x: x, y: y, z: z };
      for (const s of stars) { if (U.dist(s, p) < W.minSysDist) { ok = false; break; } }
      if (!ok) continue;
      const spec = rollSpectral(state);
      const companions = [];
      if (U.chance(state, 0.28)) companions.push(rollSpectral(state)); // binaries are common
      if (U.chance(state, 0.05)) companions.push(rollSpectral(state));
      stars.push({
        name: 'UWS ' + (id += U.ri(state, 3, 17)),
        catalog: true,
        x: x, y: y, z: z, spec: spec, companions: companions,
      });
    }
  }

  function rollSpectral(state) {
    const cls = U.weightedPick(state, Object.keys(D.SPECTRAL), function (k) { return D.SPECTRAL[k].freq; }) || 'M';
    const sub = U.ri(state, 0, 9);
    if (cls === 'D') return 'DA' + U.ri(state, 2, 8);
    if (cls === 'III') return 'K' + sub + 'III';
    return cls + sub + 'V';
  }

  function makeRegions(state, T) {
    state.regions = [];
    const defs = [
      { type: 'verge', x: T.bubbleR * 0.8, y: 0, z: 0, r: T.bubbleR * 0.45 },                       // coreward
      { type: 'reach', x: -T.bubbleR * 0.35, y: T.bubbleR * 0.55, z: 0, r: T.bubbleR * 0.34 },
      { type: 'nebula', x: U.rf(state, -0.3, 0.3) * T.bubbleR, y: -T.bubbleR * 0.55, z: U.rf(state, -0.2, 0.2) * T.bubbleR, r: T.bubbleR * 0.30 },
      { type: 'flarezone', x: -T.bubbleR * 0.55, y: -T.bubbleR * 0.15, z: U.rf(state, -0.25, 0.25) * T.bubbleR, r: T.bubbleR * 0.26 },
      { type: 'oldstream', x: U.rf(state, -0.2, 0.4) * T.bubbleR, y: U.rf(state, 0.2, 0.5) * T.bubbleR, z: T.bubbleR * 0.30, r: T.bubbleR * 0.28 },
      { type: 'quiet', x: U.rf(state, -0.5, 0.0) * T.bubbleR, y: U.rf(state, -0.2, 0.2) * T.bubbleR, z: -T.bubbleR * 0.30, r: T.bubbleR * 0.22 },
    ];
    defs.forEach(function (d, i) {
      const names = SW.lore.REGION_NAMES[d.type];
      state.regions.push({ id: i, type: d.type, name: U.pick(state, names), x: d.x, y: d.y, z: d.z, r: d.r });
    });
    for (const sys of state.systems) {
      let best = null, bestD = 1e9;
      for (const reg of state.regions) {
        const d = U.dist(sys, reg);
        if (d < reg.r && d < bestD) { bestD = d; best = reg; }
      }
      if (best && sys.id !== 0) sys.region = best.type;
    }
  }

  function placeWonders(state, T) {
    // The Drifter: a quiet stellar-mass black hole, mid-bubble, off the busy lanes.
    const bhCands = state.systems.filter(function (s) {
      return s.catalog && U.dist(s, state.systems[0]) > T.bubbleR * 0.45 && U.dist(s, state.systems[0]) < T.bubbleR * 0.85;
    });
    if (bhCands.length) {
      const bh = U.pick(state, bhCands);
      bh.wonder = 'blackhole'; bh.type = 'wonder';
      bh.name = 'The Drifter'; bh.spec = 'X'; bh.companions = [];
      bh.note = 'A ~9 M☉ black hole crossing the bubble. The Loomkeepers threaded a lane to it. Why?';
    }
    // The Loomkeeper Lattice: a partial Dyson swarm around a quiet K dwarf.
    const huskCands = state.systems.filter(function (s) {
      return s.catalog && !s.wonder && /^K/.test(s.spec) && U.dist(s, state.systems[0]) > T.bubbleR * 0.5;
    });
    const husk = huskCands.length ? U.pick(state, huskCands) : null;
    if (husk) {
      husk.wonder = 'husk'; husk.type = 'wonder';
      husk.name = 'The Lattice';
      husk.note = 'A partial Dyson swarm in a heddle pattern. The Loomkeepers\' only surviving great work.';
    }
  }

  // ---------- lanes ----------
  function gabriel3D(pts, limR2) {
    const lim = limR2 || 144; // default: no lanes beyond 24 ly — weftlines are local promises
    const edges = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const mx = (pts[i].x + pts[j].x) / 2, my = (pts[i].y + pts[j].y) / 2, mz = (pts[i].z + pts[j].z) / 2;
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
        const r2 = (dx * dx + dy * dy + dz * dz) / 4;
        if (r2 > lim) continue;
        let ok = true;
        for (let k = 0; k < n; k++) {
          if (k === i || k === j) continue;
          const ex = pts[k].x - mx, ey = pts[k].y - my, ez = pts[k].z - mz;
          if (ex * ex + ey * ey + ez * ez < r2 - 1e-9) { ok = false; break; }
        }
        if (ok) edges.push([i, j]);
      }
    }
    return edges;
  }

  function connect(pts, edges) {
    const parent = pts.map(function (_, i) { return i; });
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    for (const e of edges) parent[find(e[0])] = find(e[1]);
    for (;;) {
      const comps = {};
      for (let i = 0; i < pts.length; i++) { const r = find(i); (comps[r] = comps[r] || []).push(i); }
      const roots = Object.keys(comps);
      if (roots.length <= 1) break;
      let bi = -1, bj = -1, bd = Infinity;
      for (const i of comps[roots[0]]) {
        for (let j = 0; j < pts.length; j++) {
          if (find(j) === find(i)) continue;
          const d = U.dist(pts[i], pts[j]);
          if (d < bd) { bd = d; bi = i; bj = j; }
        }
      }
      edges.push([bi, bj]);
      parent[find(bi)] = find(bj);
    }
  }

  function bfsHops(systems, fromId) {
    const hops = {}; hops[fromId] = 0;
    const q = [fromId];
    while (q.length) {
      const cur = q.shift();
      for (const nb of systems[cur].links) {
        if (hops[nb] === undefined) { hops[nb] = hops[cur] + 1; q.push(nb); }
      }
    }
    return hops;
  }

  // ---------- typing from planets ----------
  function assignTypes(state) {
    const profiles = {};
    for (const sys of state.systems) profiles[sys.id] = SW.planets.profile(state, sys.id);

    const pool = state.systems.filter(function (s) { return s.id !== 0 && !s.wonder && s.id !== state.scourgeOriginId; });

    // population: best habitability, biased away from the Verge/Reach
    const habRank = pool.slice().sort(function (a, b) {
      function score(s) {
        let v = profiles[s.id].hab * 10 - s.hops * 0.3;
        if (s.region === 'verge' || s.region === 'reach') v -= 8;
        if (/^[GK]/.test(s.spec)) v += 2;
        return v;
      }
      return score(b) - score(a);
    });
    const popSystems = habRank.slice(0, 22);
    for (const s of popSystems) s.type = 'pop';

    const used = new Set(popSystems.map(function (s) { return s.id; }));
    function take(filter, scoreFn, n, type) {
      const cands = pool.filter(function (s) { return !used.has(s.id) && (!filter || filter(s)); })
        .sort(function (a, b) { return scoreFn(b) - scoreFn(a); });
      for (const s of cands.slice(0, n)) { s.type = type; used.add(s.id); }
    }
    // industry clusters near population
    take(null, function (s) {
      let near = 0;
      for (const p of popSystems) if (U.dist(s, p) < 12) near++;
      return near * 3 + profiles[s.id].ore + profiles[s.id].gas;
    }, 20, 'industrial');
    take(function (s) { return profiles[s.id].ore > 0.5; }, function (s) { return profiles[s.id].ore; }, 30, 'mining');
    take(function (s) { return profiles[s.id].gas > 0.5; }, function (s) { return profiles[s.id].gas; }, 18, 'gas');
    take(function (s) { return profiles[s.id].bio > 0.4; }, function (s) { return profiles[s.id].bio; }, 20, 'agri');
    take(function (s) { return s.region === 'oldstream' || s.hops > 5; }, function (s) { return s.hops; }, 6, 'derelict');

    // settlers rename inhabited catalog systems
    const taken = new Set(state.systems.map(function (s) { return s.name; }));
    for (const s of state.systems) {
      if (s.catalog && (s.type === 'pop' || s.type === 'industrial' || s.type === 'agri')) {
        s.colloquial = U.sysName(state, taken);
        s.name = s.colloquial + ' (' + s.name + ')';
      }
    }

    // tutorial guarantees within 2 hops of Sol
    const near = state.systems.filter(function (s) { return s.hops > 0 && s.hops <= 2; });
    if (!near.some(function (s) { return s.type === 'mining' || s.type === 'agri' || s.type === 'gas'; })) {
      const c = near.find(function (s) { return s.type === 'frontier'; }) || near[0];
      if (c) c.type = 'agri';
    }
    if (!state.systems.some(function (s) { return s.hops <= 3 && s.type === 'industrial'; })) {
      const c = near.find(function (s) { return s.type === 'frontier'; });
      if (c) c.type = 'industrial';
    }
  }

  function assignIdeologies(state) {
    const husk = state.systems.find(function (s) { return s.wonder === 'husk'; });
    for (const sys of state.systems) {
      if (sys.type !== 'pop' && sys.type !== 'industrial' && sys.type !== 'agri') continue;
      if (sys.id === 0) { sys.ideology = 'free'; continue; }
      let weights = { free: 2, synod: 2, combine: 2, mariners: 2, vigil: 1, loom: 0.5 };
      if (sys.region === 'verge') weights.vigil += 5;
      if (sys.region === 'reach') { weights.free += 3; weights.vigil = 0.2; }
      if (sys.region === 'oldstream') weights.synod += 2;
      if (husk && U.dist(sys, husk) < 18) weights.loom += 5;
      if (sys.type === 'industrial') weights.combine += 2;
      if (sys.type === 'agri') weights.synod += 1;
      const keys = Object.keys(weights);
      sys.ideology = U.weightedPick(state, keys, function (k) { return weights[k]; }) || 'free';
    }
  }

  // ---------- economies ----------
  function initEconomies(state, W) {
    const T = D.TUNE;
    const wealth = (W && W.wealthMult) || 1; // run parameter: starting stocks, not capacity
    for (const sys of state.systems) {
      for (const c of D.COMM_IDS) { sys.stocks[c] = 0; sys.capacity[c] = T.capDefault; }
      const pr = SW.planets.profile(state, sys.id);
      const rich = U.rf(state, 0.85, 1.4);

      if (sys.type === 'mining') {
        sys.prod.ORE = Math.max(0.6, pr.ore * 0.7) * rich;
        if (pr.crystal > 0.4 || U.chance(state, 0.3)) sys.prod.CRYSTAL = U.rf(state, 0.18, 0.45);
      } else if (sys.type === 'gas') {
        sys.prod.GAS = Math.max(0.7, pr.gas * 0.8) * rich;
      } else if (sys.type === 'agri') {
        sys.prod.BIO = Math.max(0.8, pr.bio * 0.9) * rich * 1.1;
      } else if (sys.type === 'industrial') {
        const basics = U.shuffle(state, ['ALLOY', 'FUEL', 'FOOD']);
        sys.slots.push(basics[0]);
        if (U.chance(state, 0.6)) sys.slots.push(basics[1]);
        if (U.chance(state, 0.35)) sys.slots.push(U.pick(state, ['TECH', 'MEDS']));
        sys.pop = U.ri(state, 2, 6);
      } else if (sys.type === 'pop') {
        sys.pop = pr.hab >= 2 ? U.ri(state, 10, 26) : U.ri(state, 6, 14); // garden worlds breed cities
      } else if (sys.type === 'derelict') {
        sys.stocks.TECH = Math.round(U.ri(state, 10, 30) * wealth);
        sys.stocks.CRYSTAL = Math.round(U.ri(state, 10, 25) * wealth);
      }
      // white dwarfs leak crystallized carbon regardless of type
      if (D.specClass(sys.spec) === 'D' && !sys.prod.CRYSTAL && sys.type !== 'frontier') sys.prod.CRYSTAL = 0.25;
      // region flavor
      if (sys.region === 'nebula') { if (sys.prod.GAS) sys.prod.GAS *= 1.3; if (sys.prod.CRYSTAL) sys.prod.CRYSTAL *= 1.3; }
      if (sys.region === 'flarezone' && sys.prod.ORE) sys.prod.ORE *= 1.25;

      if (sys.pop > 0) {
        sys.cons.FOOD = 0.035 * sys.pop;
        sys.cons.FUEL = 0.024 * sys.pop;
        sys.cons.MEDS = 0.011 * sys.pop;
        sys.cons.TECH = 0.009 * sys.pop;
      }
      for (const c in sys.prod) sys.capacity[c] = T.capProducer;
      for (const c in sys.prod) sys.stocks[c] = Math.min(sys.capacity[c], Math.round(sys.capacity[c] * U.rf(state, 0.5, 0.7) * wealth));
      for (const c in sys.cons) sys.stocks[c] = Math.min(sys.capacity[c], Math.round(sys.capacity[c] * U.rf(state, 0.15, 0.35) * wealth));
      for (const out of sys.slots) {
        const rec = D.RECIPES.find(function (r) { return r.out === out; });
        if (rec) for (const inp in rec.inputs) sys.stocks[inp] = Math.max(sys.stocks[inp], Math.round(sys.capacity[inp] * 0.3));
        sys.stocks[out] = Math.max(sys.stocks[out], Math.round(sys.capacity[out] * 0.2));
      }
    }

    // Sol: Earth Anchorage
    const home = state.systems[0];
    home.type = 'pop';
    home.pop = 12;
    home.slots = ['FOOD'];
    home.depot = {};
    home.buildings.push('depot');
    home.cons.FOOD = 0.035 * home.pop;
    home.cons.FUEL = 0.024 * home.pop;
    home.cons.MEDS = 0.011 * home.pop;
    home.cons.TECH = 0.009 * home.pop;
    home.stocks.FOOD = Math.round(40 * wealth); home.stocks.FUEL = Math.round(30 * wealth);
  }

  return G;
})();
