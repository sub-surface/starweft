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

  return M;
}());
