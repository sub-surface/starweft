/* STARWEFT market_analytics.js — DOM-free market helpers under SW.market.
   Runs headless under Node. No document/window references. */
var SW = globalThis.SW = globalThis.SW || {};

SW.market = (function () {
  const M = {};

  function D() { return SW.data; }

  // ---- scope helpers ----

  // All discovered systems (including corrupted, for counts/history)
  M.knownSystems = function (state) {
    return state.systems.filter(function (s) { return s.discovered; });
  };

  // Discovered systems with scourge !== 2 — used for active market calcs
  M.liveKnownSystems = function (state) {
    return state.systems.filter(function (s) { return s.discovered && s.scourge !== 2; });
  };

  // ---- market policy helpers (moved from ui.js) ----

  // How many units of commodity c should system sys ideally hold in reserve?
  M.marketTarget = function (sys, c) {
    const T = D().TUNE;
    const cap = sys.capacity[c] || T.capDefault;
    let target = 0;
    if ((sys.cons[c] || 0) > 0) {
      target = Math.max(
        target,
        Math.min(
          cap,
          Math.max(T.marketReserveMin, Math.ceil(cap * T.marketReserveCapFraction), Math.ceil(sys.cons[c] * T.marketConsumerReserveTicks))
        )
      );
    }
    for (const out of sys.slots || []) {
      const rec = D().RECIPES.find(function (r) { return r.out === out; });
      if (rec && rec.inputs[c]) target = Math.max(target, Math.min(cap, rec.inputs[c] * T.marketFactoryReserveTicks));
    }
    return Math.ceil(target);
  };

  // Count cargo committed inbound to sysId for commodity c
  M.inboundCargo = function (state, sysId, c) {
    let n = 0;
    for (const sh of state.ships) {
      const cargo = sh.cargo[c] || 0;
      if (sh.mission && sh.mission.kind === 'supply' && sh.mission.target === sysId && sh.mission.c === c) {
        n += Math.max(cargo, sh.mission.stage === 'deliver' ? (sh.mission.qty || 0) : 0);
        continue;
      }
      if (sh.directiveId && cargo > 0) {
        const d = state.directives.find(function (x) { return x.id === sh.directiveId; });
        if (d && d.sys === sysId && d.c === c) n += cargo;
      }
    }
    return Math.floor(n);
  };

  // One legible plan for a multi-resource requirement at a system: what is
  // already on-site (depot + idle holds), what is committed inbound, and what
  // still needs dispatching (with the cheapest charted source for each gap).
  M.supplyPlan = function (state, sysId, needs) {
    const sys = state.systems[sysId];
    const localShips = state.ships.filter(function (sh) { return sh.at === sysId && sh.mode === 'idle'; });
    const rows = [];
    for (const c in needs) {
      let local = (sys && sys.depot ? (sys.depot[c] || 0) : 0);
      for (const sh of localShips) local += sh.cargo[c] || 0;
      const inbound = M.inboundCargo(state, sysId, c);
      const uncovered = Math.max(0, Math.ceil(needs[c] - local - inbound));
      const source = uncovered > 0 ? SW.economy.cheapestSource(state, c, Math.min(uncovered, 5)) : null;
      rows.push({ c: c, need: needs[c], local: Math.floor(local), inbound: inbound, uncovered: uncovered, source: source });
    }
    return rows;
  };

  // Build a full inbound commitment map in one pass: { sysId: { c: n } }
  M.buildInboundMap = function (state) {
    const map = {};
    for (const sh of state.ships) {
      for (const c of Object.keys(sh.cargo || {})) {
        const cargo = sh.cargo[c] || 0;
        if (!cargo) continue;
        let target = null;
        if (sh.mission && sh.mission.kind === 'supply' && sh.mission.c === c) {
          const qty = Math.max(cargo, sh.mission.stage === 'deliver' ? (sh.mission.qty || 0) : 0);
          target = { sysId: sh.mission.target, qty: qty };
        } else if (sh.directiveId) {
          const d = state.directives.find(function (x) { return x.id === sh.directiveId; });
          if (d && d.c === c) target = { sysId: d.sys, qty: cargo };
        }
        if (target && target.qty > 0) {
          if (!map[target.sysId]) map[target.sysId] = {};
          map[target.sysId][c] = (map[target.sysId][c] || 0) + Math.floor(target.qty);
        }
      }
    }
    return map;
  };

  // Classify a system's market role for a commodity
  M.marketRole = function (sys, c, target, gap) {
    if (gap > 0) return 'needs';
    if (target > 0) return 'covered';
    if ((sys.prod[c] || 0) > 0) return 'producer';
    if ((sys.stocks[c] || 0) >= 5) return 'stock';
    return 'watch';
  };

  // ---- Known Economy metrics (discovered-only, no hidden leakage) ----

  // Total wealth: system credits + stock valued at current local prices,
  // across discovered non-corrupted systems only.
  M.knownWealth = function (state) {
    const live = M.liveKnownSystems(state);
    return live.reduce(function (sum, sys) {
      const stockVal = Object.keys(sys.stocks || {}).reduce(function (s2, c) {
        return s2 + (sys.stocks[c] || 0) * SW.economy.price(state, sys, c);
      }, 0);
      return sum + (sys.credits || 0) + stockVal;
    }, 0);
  };

  M.trend = function (sys, c) {
    const h = sys.hist && sys.hist[c];
    if (!h || h.length < 2) return { delta: 0, deltaPct: 0, hist: h || [] };
    const first = h[Math.max(0, h.length - 5)];
    const last = h[h.length - 1];
    const delta = last - first;
    return { delta: delta, deltaPct: first > 0 ? delta / first * 100 : 0, hist: h };
  };

  // ---- WEAVE HEALTH: one number for the state of the weave ----
  // Four components, each 0-100: how well the known worlds live, whether
  // essentials reach them, whether known factories can run, and how much of
  // the known map a working thread actually touches.
  M.weaveHealth = function (state) {
    const T = D().TUNE;
    const clamp = function (v) { return Math.max(0, Math.min(100, v)); };
    const live = M.liveKnownSystems(state);
    const pops = live.filter(function (s) { return s.pop > 0; });

    let prosperity = 0, supply = 0;
    if (pops.length) {
      prosperity = pops.reduce(function (a, s) { return a + (s.prosperity || 0); }, 0) / pops.length;
      supply = 100 * pops.reduce(function (a, s) { return a + (s.satNeed != null ? s.satNeed : 1); }, 0) / pops.length;
    }

    let slots = 0, running = 0;
    for (const sys of live) {
      for (const slot of sys.slots || []) {
        slots++;
        if (SW.economy.slotRunnable(state, sys, slot)) running++;
      }
    }
    const industry = slots ? 100 * running / slots : 100;

    const lf = state.laneFlow || {};
    let covered = 0;
    for (const sys of live) {
      for (const nb of sys.links) {
        const k = Math.min(sys.id, nb) + '-' + Math.max(sys.id, nb);
        if ((lf[k] || 0) >= T.weaveCoverageFlow) { covered++; break; }
      }
    }
    const coverage = live.length ? 100 * covered / live.length : 0;

    const components = {
      prosperity: clamp(prosperity),
      supply: clamp(supply),
      industry: clamp(industry),
      coverage: clamp(coverage),
    };
    const score = clamp(Math.round(
      components.prosperity * T.weaveWeightProsperity +
      components.supply * T.weaveWeightSupply +
      components.industry * T.weaveWeightIndustry +
      components.coverage * T.weaveWeightCoverage
    ));
    return { score: score, components: components };
  };

  M.buildCommodityReport = function (state, c) {
    const live = M.liveKnownSystems(state);
    const inboundMap = M.buildInboundMap(state);
    const rows = live.map(function (sys) {
      const price = SW.economy.price(state, sys, c);
      const stock = Math.floor(sys.stocks[c] || 0);
      const target = M.marketTarget(sys, c);
      const inbound = Math.floor((inboundMap[sys.id] && inboundMap[sys.id][c]) || 0);
      const gap = Math.max(0, target - stock - inbound);
      const tr = M.trend(sys, c);
      const role = M.marketRole(sys, c, target, gap);
      return {
        sys: sys, price: price, stock: stock, target: target, inbound: inbound, gap: gap,
        role: role, hist: tr.hist, delta: tr.delta, deltaPct: tr.deltaPct,
        useful: gap * 1000 + Math.max(0, price - D().COMMODITIES[c].base),
      };
    });
    const sources = rows.filter(function (r) { return r.stock > 0 || (r.sys.prod[c] || 0) > 0; })
      .slice().sort(function (a, b) {
        if (a.price !== b.price) return a.price - b.price;
        return b.stock - a.stock;
      });
    const sinks = rows.filter(function (r) { return r.gap > 0 || r.target > 0; })
      .slice().sort(function (a, b) {
        if (b.gap !== a.gap) return b.gap - a.gap;
        return b.price - a.price;
      });
    const sorted = rows.slice().sort(function (a, b) {
      if (b.gap !== a.gap) return b.gap - a.gap;
      if (b.useful !== a.useful) return b.useful - a.useful;
      return b.price - a.price;
    });
    const movers = rows.filter(function (r) { return Math.abs(r.deltaPct) >= 3; })
      .sort(function (a, b) { return Math.abs(b.deltaPct) - Math.abs(a.deltaPct); });
    return { c: c, rows: sorted, sources: sources, sinks: sinks, movers: movers, inboundMap: inboundMap };
  };

  // ---- The Wire: deterministic classifieds generated from real state ----
  // Shortages become WANTED ads, gluts become SURPLUS, the best route is a
  // CHARTER; flavor, the bar, and stranger things fill the column inches.
  const WIRE_FLAVOR = [
    'LOST: one cat, gray, answers to Bilge. Last seen boarding a freighter. Reward: gratitude.',
    'The Anchorage Provisioners’ Co-op thanks its haulers. The soup is for you.',
    'NOTICE: lane tolls are NOT collected by the Vigil. If someone charged you, write us.',
    'Apprentice wanted, dockside ropework. Must not fear vacuum. Or knots.',
    'In memoriam: the crew of the Long Patience. The weave remembers.',
    'SWAP: half a hold of regret for literally anything else. Slip 9.',
    'Found: prayer beads, crystal, humming faintly. Claim at any Loom shrine.',
    'The customs desk apologizes for Tuesday. The customs desk does not elaborate.',
  ];
  const WIRE_BAR = [
    'The bar with no name has a new stool. It remembers the old one.',
    'Tonight at the bar with no name: nothing, gloriously, as usual.',
    'The bartender pours one out for every lane that went quiet this week.',
    'A spindle without a bar is just scaffolding, says everyone here.',
  ];

  M.classifieds = function (state, limit) {
    limit = limit || 9;
    const D0 = D();
    const out = [];
    const live = M.liveKnownSystems(state);
    const bucket = Math.floor(state.tick / 60); // the page turns every ~30s at 1x

    const wants = [];
    const gluts = [];
    for (const c of D0.COMM_IDS) {
      if (D0.COMMODITIES[c].locked) continue;
      for (const sys of live) {
        const stock = Math.floor(sys.stocks[c] || 0);
        const target = M.marketTarget(sys, c);
        const price = SW.economy.price(state, sys, c);
        const gap = Math.max(0, target - stock);
        if (gap >= 5) wants.push({ sys: sys, c: c, gap: gap, price: price });
        if (stock >= 25 && price <= D0.COMMODITIES[c].base * 0.75) gluts.push({ sys: sys, c: c, stock: stock, price: price });
      }
    }
    wants.sort(function (a, b) { return b.gap * b.price - a.gap * a.price; });
    for (const w of wants.slice(0, 3)) {
      const src = SW.economy.cheapestSource(state, w.c, Math.min(5, w.gap), w.sys.id);
      out.push({
        kind: 'wanted', c: w.c, from: src ? src.id : null, to: w.sys.id,
        text: 'WANTED: ' + w.gap + ' ' + D0.COMMODITIES[w.c].name.toUpperCase() + ', ' + w.sys.name + '. Pays ~' + Math.round(w.price) + '¤. Ask for the quartermaster.',
      });
    }
    gluts.sort(function (a, b) { return a.price / D0.COMMODITIES[a.c].base - b.price / D0.COMMODITIES[b.c].base; });
    for (const g of gluts.slice(0, 2)) {
      out.push({
        kind: 'surplus', c: g.c, from: g.sys.id, to: null,
        text: 'SURPLUS: ' + g.sys.name + ' is drowning in ' + D0.COMMODITIES[g.c].name + '. ' + Math.round(g.price) + '¤ and falling. No questions.',
      });
    }
    const ops = SW.economy.opportunities ? SW.economy.opportunities(state, 1) : [];
    if (ops.length) {
      const op = ops[0];
      out.push({
        kind: 'charter', c: op.c, from: op.from, to: op.to, route: true,
        text: 'CHARTER: ' + D0.COMMODITIES[op.c].name + ' run, ' + state.systems[op.from].name.split(' ')[0] + ' to ' + state.systems[op.to].name.split(' ')[0] + '. Margin +' + Math.round(op.margin) + '¤. Apply within.',
      });
    }
    const barOpen = live.some(function (sys) { return (sys.sites || []).some(function (x) { return x.fac === 'spindle'; }); });
    if (barOpen) out.push({ kind: 'bar', text: WIRE_BAR[bucket % WIRE_BAR.length] });
    if (live.some(function (sys) { return sys.ideology === 'loom'; })) {
      const a = (bucket * 7919) % 89, b = (bucket * 104729) % 97, c = (bucket * 1299709) % 83;
      out.push({ kind: 'numbers', text: '∴ ' + a + ' ' + b + ' ' + c + ' ' + ((a + b + c) % 100) + ' — the Loom counts. Signal origin unknown.' });
    }
    let i = 0;
    while (out.length < limit && i < WIRE_FLAVOR.length) {
      out.push({ kind: 'notice', text: WIRE_FLAVOR[(bucket + i) % WIRE_FLAVOR.length] });
      i++;
    }
    return out.slice(0, limit);
  };

  return M;
}());
