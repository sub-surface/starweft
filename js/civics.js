/* STARWEFT civics.js — NPC civic works: prosperous systems build their own infrastructure.
   DOM-free. Attaches SW.civics. Model: js/tutorial.js */
var SW = globalThis.SW = globalThis.SW || {};

SW.civics = (function () {
  const C = {};
  // D and E resolved lazily (loaded after data.js, economy.js)

  // Flavor news lines (monochrome diegetic tone, <= 12 words each)
  const NEWS = {
    bastion: 'The Vigil raises a bastion of its own — old oaths, new stone.',
    relay:   'Mariners plant a relay — the lanes are sacred, the signal carries.',
    loom:    'Loomkeepers raise a relay — the lanes are prayers, the signal carries.',
    fabricator: 'Combine Charter opens a fabricator — contracts before conscience.',
    enclave: 'Synod dedicates an enclave — knowledge sheltered, the archive grows.',
  };

  C.tick = function (state) {
    const D = SW.data;
    const E = SW.economy;
    const T = D.TUNE;

    if (state.tick % T.civicEvery !== 0) return;

    for (let i = 0; i < state.systems.length; i++) {
      const sys = state.systems[i];
      // Only discovered, non-corrupted, populated, non-free systems participate
      if (!sys.discovered) continue;
      if (sys.scourge === 2) continue;
      if (sys.pop <= 0) continue;
      if (sys.prosperity < T.civicProsperityMin) continue;
      if (!sys.ideology || sys.ideology === 'free') continue;

      // Accumulate civic momentum (init defensively)
      sys.civic = sys.civic || 0;
      sys.civic += 1;

      // +1 extra if player is dominant trade presence — civic energizes them
      const dom = E.dominant(sys);
      if (dom === 'player') sys.civic += 1;

      // Cap at 2x threshold to signal intent without infinite accumulation
      const cap = T.civicMomentum * 2;
      if (sys.civic > cap) sys.civic = cap;

      // Attempt civic work when momentum threshold is reached
      if (sys.civic >= T.civicMomentum) {
        _attemptWork(state, sys, D, T);
      }
    }
  };

  // Cities don't starve themselves to build monuments: civic works only draw
  // credits above a living floor, and only stock above the system's own
  // reserve target. The unmet remainder reads as demand the player can serve.
  function _spareStock(sys, c) {
    const reserve = SW.market ? SW.market.marketTarget(sys, c) : 0;
    return Math.max(0, (sys.stocks[c] || 0) - reserve);
  }

  function _canAfford(sys, cost, mats) {
    const T = SW.data.TUNE;
    if (sys.credits - cost < T.civicCreditFloor) return false;
    for (const c in mats) {
      if (_spareStock(sys, c) < mats[c]) return false;
    }
    return true;
  }

  function _deduct(sys, cost, mats) {
    sys.credits -= cost;
    for (const c in mats) {
      sys.stocks[c] = Math.max(0, (sys.stocks[c] || 0) - mats[c]);
    }
  }

  function _attemptWork(state, sys, D, T) {
    const ideo = sys.ideology;
    const flags = state.story.flags;
    const bldgs = D.BUILDINGS;

    // Resolve candidate: ideology priority order
    let target = null;
    let newsLine = null;

    if (ideo === 'vigil') {
      // bastion: only if scourge known and no bastion present
      if (flags.scourge_known && sys.buildings.indexOf('bastion') < 0) {
        target = 'bastion';
        newsLine = NEWS.bastion;
      }
    } else if (ideo === 'mariners') {
      // relay: if no relay present
      if (sys.buildings.indexOf('relay') < 0) {
        target = 'relay';
        newsLine = NEWS.relay;
      }
    } else if (ideo === 'loom') {
      // relay ("the lanes are prayers")
      if (sys.buildings.indexOf('relay') < 0) {
        target = 'relay';
        newsLine = NEWS.loom;
      }
    } else if (ideo === 'combine') {
      // fabricator: only if fewer than 3 factory slots
      if ((sys.slots || []).length < 3 && sys.buildings.indexOf('fabricator') < 0) {
        target = 'fabricator';
        newsLine = NEWS.fabricator;
      }
    } else if (ideo === 'synod') {
      // enclave: if none present
      if (sys.buildings.indexOf('enclave') < 0) {
        target = 'enclave';
        newsLine = NEWS.enclave;
      }
    }

    if (!target) return; // no eligible work (already built, or conditions not met)

    const b = bldgs[target];
    if (!_canAfford(sys, b.cost, b.mats)) {
      // Unaffordable: momentum holds (already capped above), system wants it
      return;
    }

    // Affordable — build it
    _deduct(sys, b.cost, b.mats);
    sys.buildings.push(target);

    // Mirror fabricator slot effect from A.build in game.js
    if (target === 'fabricator') {
      sys.slots = sys.slots || [];
      sys.slots.push('ANY');
    }

    // Reset civic momentum
    sys.civic = 0;

    // Ticker news
    SW.game.news(state, newsLine, sys.id);
  }

  return C;
})();
