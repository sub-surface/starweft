/* STARWEFT economy.js — prices, markets, production, prosperity. DOM-free. */
var SW = globalThis.SW = globalThis.SW || {};

SW.economy = (function () {
  const U = SW.util, D = SW.data;
  const E = {};

  // ---- Prices ----
  // Smooth supply/demand curve on fill ratio, biased by local ideology.
  E.price = function (state, sys, c) {
    const T = D.TUNE;
    const cap = sys.capacity[c] || T.capDefault;
    const fill = U.clamp((sys.stocks[c] || 0) / cap, 0, 1);
    const mult = U.clamp(T.priceMid - T.priceK * fill, T.priceLo, T.priceHi);
    const ideo = D.IDEOLOGIES[sys.ideology || 'free'];
    const bias = (ideo && ideo.bias[c]) || 1;
    return D.COMMODITIES[c].base * mult * bias;
  };

  // Faction with dominant trade presence here (gets a price edge).
  E.dominant = function (sys) {
    let best = null, bestV = 0.5, second = 0;
    for (const f in sys.presence) {
      const v = sys.presence[f];
      if (v > bestV) { second = bestV; bestV = v; best = f; }
      else if (v > second) second = v;
    }
    return (best && bestV > second + 0.4) ? best : null;
  };

  function edgeFor(state, faction) {
    let e = D.TUNE.presenceEdge;
    if (faction === 'player' && SW.tech.has(state, 'doc_mercantile')) e *= 2;
    if (faction === 'player' && SW.perks && SW.perks.has(state, 'maker')) e *= 1.5;
    return e;
  }
  E.buyPrice = function (state, sys, c, faction) {
    const dom = E.dominant(sys);
    let p = E.price(state, sys, c);
    const edge = edgeFor(state, faction);
    if (dom === faction) p *= (1 - edge);
    else if (dom && faction) p *= (1 + D.TUNE.presenceEdge * 0.5);
    if (faction === 'player' && SW.perks && SW.perks.has(state, 'baron')) p *= 0.96;
    return p;
  };
  E.sellPrice = function (state, sys, c, faction) {
    const dom = E.dominant(sys);
    let p = E.price(state, sys, c);
    const edge = edgeFor(state, faction);
    if (dom === faction) p *= (1 + edge);
    else if (dom && faction) p *= (1 - D.TUNE.presenceEdge * 0.5);
    if (faction === 'player' && SW.perks && SW.perks.has(state, 'silver')) p *= 1.04;
    // black market: the Reach pays over the odds, if the Reach knows you
    if (faction === 'player' && sys.region === 'reach' && (state.infamy || 0) >= D.TUNE.infamyBlackMarket) {
      // synergy: a Severed origin running Mercantile doctrine fences at premium
      const fence = (state.origin === 'severed' && SW.tech.has(state, 'doc_mercantile')) ? 1.25 : D.TUNE.blackMarketBonus;
      p *= fence;
    }
    return p;
  };

  // Mutating trades. Caller handles credits. Returns actual qty + money moved.
  E.marketBuy = function (state, sys, c, qty, faction) {
    qty = Math.max(0, Math.min(Math.floor(qty), Math.floor(sys.stocks[c] || 0)));
    if (qty <= 0) return { qty: 0, cost: 0 };
    const cost = Math.ceil(E.buyPrice(state, sys, c, faction) * qty);
    sys.stocks[c] -= qty;
    bumpPresence(state, sys, faction, qty);
    return { qty: qty, cost: cost };
  };
  E.marketSell = function (state, sys, c, qty, faction) {
    const cap = sys.capacity[c] || D.TUNE.capDefault;
    qty = Math.max(0, Math.min(Math.floor(qty), Math.floor(cap - (sys.stocks[c] || 0))));
    if (qty <= 0) return { qty: 0, revenue: 0 };
    const revenue = Math.floor(E.sellPrice(state, sys, c, faction) * qty);
    sys.stocks[c] += qty;
    bumpPresence(state, sys, faction, qty);
    return { qty: qty, revenue: revenue };
  };

  function bumpPresence(state, sys, faction, qty) {
    if (!faction) return;
    let gain = qty * 0.03;
    if (faction === 'player' && state.ops && state.ops.blitz && state.ops.blitz.sys === sys.id) gain *= 3;
    sys.presence[faction] = U.clamp((sys.presence[faction] || 0) + gain, 0, 10);
  }

  // ---- Tick ----
  E.tick = function (state) {
    const T = D.TUNE;
    const diff = D.DIFFICULTY[state.difficulty] || D.DIFFICULTY.standard;
    let research = 0;

    const sampleHistory = state.tick % T.priceHistoryEvery === 0;
    for (const sys of state.systems) {
      if (sys.scourge === 2) continue; // corrupted: the market is ash

      // Production (extractor + comet windows + Penrose taps)
      let prodMult = sys.buildings.indexOf('extractor') >= 0 ? 1.6 : 1.0;
      if (sys.prodBoostUntil && state.tick < sys.prodBoostUntil) prodMult *= 2.5;
      for (const c in sys.prod) {
        sys.stocks[c] = Math.min(sys.capacity[c], (sys.stocks[c] || 0) + sys.prod[c] * prodMult);
      }
      if (sys.buildings.indexOf('penrosetap') >= 0) {
        sys.stocks.FUEL = Math.min(sys.capacity.FUEL || T.capDefault, (sys.stocks.FUEL || 0) + 1.6);
      }
      // body facilities feed the system's market (in-system layer)
      if (sys.sites && sys.sites.length) {
        const sfx = SW.sites.fx(sys, state);
        for (const c in sfx.prod) {
          sys.stocks[c] = Math.min(sys.capacity[c] || T.capDefault, (sys.stocks[c] || 0) + sfx.prod[c] * prodMult);
        }
        research += sfx.research;
      }

      // price history (sparklines for the Exchange)
      if (sampleHistory && sys.discovered) {
        sys.hist = sys.hist || {};
        for (const c of D.COMM_IDS) {
          if (D.COMMODITIES[c].locked) continue;
          const arr = sys.hist[c] = sys.hist[c] || [];
          arr.push(Math.round(E.price(state, sys, c)));
          if (arr.length > T.priceHistoryLen) arr.shift();
        }
      }

      // Factories
      for (const slot of sys.slots) runSlot(state, sys, slot);

      // Consumption + satisfaction
      let needSat = 1, needN = 0, wantSat = 0, wantN = 0;
      for (const c in sys.cons) {
        const want = sys.cons[c];
        const got = Math.min(sys.stocks[c] || 0, want);
        sys.stocks[c] = (sys.stocks[c] || 0) - got;
        const sat = want > 0 ? got / want : 1;
        if (c === 'FOOD' || c === 'FUEL') { needSat = needN === 0 ? sat : (needSat * needN + sat) / (needN + 1); needN++; }
        else { wantSat = (wantSat * wantN + sat) / (wantN + 1); wantN++; }
      }
      sys.satNeed = needN ? needSat : 1;
      sys.satWant = wantN ? wantSat : 0;

      // Prosperity drifts toward supply quality
      if (sys.pop > 0) {
        const target = 25 + 50 * sys.satNeed + 25 * sys.satWant;
        sys.prosperity = U.clamp(sys.prosperity + (target - sys.prosperity) * T.prosperityDrift, 0, 100);
        sys.pop = Math.max(1, sys.pop + sys.pop * T.popGrow * (sys.prosperity - 50) / 50);
        // research from thriving worlds
        let r = T.researchPerPop * sys.pop * Math.pow(sys.prosperity / 100, 1.5);
        if (sys.buildings.indexOf('enclave') >= 0) r *= 2;
        research += r;
      }

      // presence decay + sanitize
      for (const f in sys.presence) {
        sys.presence[f] *= T.presenceDecay;
        if (sys.presence[f] < 0.01) delete sys.presence[f];
      }
      for (const c of D.COMM_IDS) {
        sys.stocks[c] = U.clamp(U.num(sys.stocks[c]), 0, sys.capacity[c] || T.capDefault);
      }
    }

    const stanceMult = state.scourgeStance === 'cure' ? 1.1 : 1; // every loom turned to the question
    state.research = U.num(state.research) + research * diff.research * stanceMult;
    state.stats.researchEarned = U.num(state.stats.researchEarned) + research * diff.research * stanceMult;
  };

  function runSlot(state, sys, slot) {
    let rec = null;
    if (slot === 'ANY') {
      // player fabricator: run the most valuable recipe with inputs on hand
      let bestVal = 0;
      for (const r of D.RECIPES) {
        if (r.tech && state.tech.unlocked.indexOf(r.tech) < 0) continue;
        if (r.playerFabOnly && slot !== 'ANY') continue;
        if (!canRun(sys, r)) continue;
        const val = D.COMMODITIES[r.out].base;
        if (val > bestVal) { bestVal = val; rec = r; }
      }
    } else {
      rec = D.RECIPES.find(function (r) { return r.out === slot; });
      if (rec && rec.playerFabOnly) rec = null;
    }
    if (!rec || !canRun(sys, rec)) return;
    if ((sys.stocks[rec.out] || 0) >= sys.capacity[rec.out]) return;
    // fractional runs accumulate via stochastic rounding on stock floats
    const rate = rec.rate * (rec.out === 'PANACEA' && state.scourgeStance === 'cure' ? 1.25 : 1);
    const runs = Math.min(rate,
      (sys.capacity[rec.out] - sys.stocks[rec.out]) / rec.qty,
      minInputRuns(sys, rec));
    if (runs <= 0) return;
    for (const inp in rec.inputs) sys.stocks[inp] -= rec.inputs[inp] * runs;
    sys.stocks[rec.out] += rec.qty * runs;
  }
  function canRun(sys, rec) {
    for (const inp in rec.inputs) if ((sys.stocks[inp] || 0) < rec.inputs[inp] * 0.05) return false;
    return true;
  }
  function minInputRuns(sys, rec) {
    let m = Infinity;
    for (const inp in rec.inputs) m = Math.min(m, (sys.stocks[inp] || 0) / rec.inputs[inp]);
    return m;
  }

  // Public: would this factory slot produce right now? Mirrors runSlot's gates
  // (inputs on hand, output not at capacity) without mutating anything.
  E.slotRunnable = function (state, sys, slot) {
    if (slot === 'ANY') {
      for (const r of D.RECIPES) {
        if (r.tech && state.tech.unlocked.indexOf(r.tech) < 0) continue;
        if (canRun(sys, r) && (sys.stocks[r.out] || 0) < sys.capacity[r.out]) return true;
      }
      return false;
    }
    const rec = D.RECIPES.find(function (r) { return r.out === slot; });
    if (!rec || rec.playerFabOnly) return false;
    if (!canRun(sys, rec)) return false;
    return (sys.stocks[rec.out] || 0) < sys.capacity[rec.out];
  };

  // ---- Analytics ----
  // Market index: per commodity, discovered live systems ranked cheap-first
  // (sources, stock ≥5) and dear-first (sinks, space ≥5) by base price.
  // O(systems × commodities) per build instead of systems² per consumer;
  // consumers re-rank only the top few candidates with exact faction prices.
  E.marketIndex = function (state) {
    const ix = { sources: {}, sinks: {} };
    for (const c of D.COMM_IDS) { ix.sources[c] = []; ix.sinks[c] = []; }
    for (const sys of state.systems) {
      if (!sys.discovered || sys.scourge === 2) continue;
      for (const c of D.COMM_IDS) {
        const p = E.price(state, sys, c);
        if ((sys.stocks[c] || 0) >= 5) ix.sources[c].push({ id: sys.id, p: p });
        if ((sys.capacity[c] || D.TUNE.capDefault) - (sys.stocks[c] || 0) >= 5) ix.sinks[c].push({ id: sys.id, p: p });
      }
    }
    for (const c of D.COMM_IDS) {
      ix.sources[c].sort(function (a, b) { return a.p - b.p; });
      ix.sinks[c].sort(function (a, b) { return b.p - a.p; });
    }
    return ix;
  };

  // Cheapest place to buy c with at least minQty on hand (exact player price).
  // Falls back to a full scan so tiny-stock edge cases keep working.
  E.cheapestSource = function (state, c, minQty, excludeId) {
    const ix = E.marketIndex(state);
    let best = null, bestP = Infinity;
    for (const s of (ix.sources[c] || []).slice(0, 8)) {
      if (s.id === excludeId) continue;
      const sys = state.systems[s.id];
      if ((sys.stocks[c] || 0) < minQty) continue;
      const p = E.buyPrice(state, sys, c, 'player');
      if (p < bestP) { bestP = p; best = sys; }
    }
    if (!best && minQty < 5) {
      for (const sys of state.systems) {
        if (!sys.discovered || sys.scourge === 2 || sys.id === excludeId) continue;
        if ((sys.stocks[c] || 0) < minQty) continue;
        const p = E.buyPrice(state, sys, c, 'player');
        if (p < bestP) { bestP = p; best = sys; }
      }
    }
    return best;
  };

  // Best single-hop-ish trade opportunities among discovered, reachable systems.
  E.opportunities = function (state, limit, opts) {
    opts = opts || {};
    const out = [];
    const ix = E.marketIndex(state), K = 6;
    for (const c of D.COMM_IDS) {
      if (D.COMMODITIES[c].locked && state.tech.unlocked.indexOf('panacea') < 0) continue;
      const srcs = ix.sources[c].slice(0, K), snks = ix.sinks[c].slice(0, K);
      for (const s of srcs) {
        const a = state.systems[s.id];
        const pb = E.buyPrice(state, a, c, 'player');
        for (const k of snks) {
          if (k.id === s.id) continue;
          const b = state.systems[k.id];
          const ps = E.sellPrice(state, b, c, 'player');
          const margin = ps * D.TUNE.sellFriction - pb;
          if (margin > D.TUNE.smartMinProfit) {
            out.push({ from: a.id, to: b.id, c: c, margin: margin, dist: U.dist(a, b) });
          }
        }
      }
    }
    out.sort(function (x, y) { return (y.margin / (y.dist + 80)) - (x.margin / (x.dist + 80)); });
    if (opts.onePerCommodity) {
      const seen = {};
      const diverse = [];
      for (const op of out) {
        if (seen[op.c]) continue;
        seen[op.c] = true;
        diverse.push(op);
        if (diverse.length >= (limit || 8)) break;
      }
      return diverse;
    }
    return out.slice(0, limit || 8);
  };

  return E;
})();
