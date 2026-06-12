/* STARWEFT quests.js - company objectives and journal-facing contracts.
   DOM-free. Ambient story stays in story.js; this module names the work the
   company is actually trying to complete. */
var SW = globalThis.SW = globalThis.SW || {};

SW.quests = (function () {
  const Q = {};

  function home(state) { return state.systems[state.homeId]; }
  function shipNamed(state, name) {
    return state.ships.find(function (sh) { return sh.name === name; }) || state.ships[0];
  }
  function atOrGoingToBelt(ship) {
    return !!(ship && (ship.body === 'The Belt' || (ship.hop && ship.hop.to === 'The Belt')));
  }
  function hasOre(state) {
    return state.ships.some(function (sh) { return (sh.cargo.ORE || 0) >= SW.data.TUNE.prologueOreBeat; });
  }
  function hasAlloyOnSite(state) {
    let n = 0;
    const h = home(state);
    if (h.depot) n += h.depot.ALLOY || 0;
    for (const sh of state.ships) if (sh.at === state.homeId) n += sh.cargo.ALLOY || 0;
    return n >= 5;
  }
  function step(id, label, done, current) {
    return { id: id, label: label, done: !!done, current: !!current };
  }

  Q.company = function (state) {
    if (!state || !state.story) return [];
    const out = [];
    const tu = state.tutorial;
    const ship = shipNamed(state, 'Stitch');
    if (tu && (tu.active || tu.done)) {
      const g = tu.goal == null ? -1 : tu.goal;
      out.push({
        id: 'sol_net',
        title: 'First Contract: Sol Logistics Net',
        issuer: 'Courier Guild escrow',
        summary: 'Stand up a local supply chain before WEFT-7 takes contracts beyond Sol.',
        action: tu.active && g === 6 && !state.story.flags.sol_net_authorized ? 'authorizeSolNet' : null,
        actionLabel: 'Authorize Sol Net',
        steps: [
          step('belt', 'Berth Stitch at The Belt', g > 0 || atOrGoingToBelt(ship), g === 0),
          step('ore', 'Load Belt ore at rockhopper rates', g > 1 || hasOre(state), g === 1),
          step('sale', 'Sell ore at Earth Anchorage', g > 2, g === 2),
          step('alloy', 'Buy alloy for the first anchor', g > 3 || hasAlloyOnSite(state), g === 3),
          step('hydrofarm', 'Anchor the Earth Hydrofarm', g > 4 || ((home(state).sites || []).length > 0), g === 4),
          step('chain', 'Let Biomass, Food, and city demand connect', g > 5, g === 5),
          step('authorize', 'Authorize the Sol logistics net', !!state.story.flags.sol_net_authorized, g === 6),
          step('jump', 'Take the Guild jump contract beyond Sol', tu.done || g > 7, g === 7),
        ],
      });
      return out;
    }

    if (!state.story.flags.first_route) {
      out.push({
        id: 'first_loop',
        title: 'Expansion Contract: First Interstellar Loop',
        issuer: 'The Provisional Weft',
        summary: 'Turn manual hauling into a repeatable route between two systems.',
        action: null,
        actionLabel: null,
        steps: [
          step('routes', 'Unlock route automation', !!state.story.flags.routes_unlocked, !state.story.flags.routes_unlocked),
          step('create', 'Create a two-stop route', state.routes.length >= 1, state.story.flags.routes_unlocked && state.routes.length < 1),
          step('assign', 'Assign a ship to the loop', state.routes.some(function (r) { return r.ships && r.ships.length > 0; }), state.routes.length >= 1),
        ],
      });
    }
    return out;
  };

  Q.markJournalViewed = function (state) {
    if (state && state.tutorial && state.tutorial.active && state.tutorial.goal === 6) {
      state.tutorial.netPrompted = true;
    }
  };

  return Q;
})();
