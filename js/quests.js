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
    if (tu && tu.active) {
      const g = tu.goal == null ? -1 : tu.goal;
      const labels = [
        'Wake inside the live canonical Thread',
        'Fly to The Belt',
        'Load a feasible first cargo',
        'Deliver unpledged Ore to Earth',
        'Read the exact arrival change',
        'Compare and seal a contextual Pledge',
        'Keep the Pledge before its deadline',
        'Create and staff a circular route',
        'Hold Food in the Sol reserve',
        'Answer a nonlethal lane disruption',
        'Resume or replace the affected route',
        'Draft the first gameplay Charter',
        'Hold a stable knot for 25 pulses'
      ];
      out.push({
        id: 'act_zero_wake',
        title: 'Act 0: The Wake',
        issuer: 'Menders’ Guild',
        summary: 'Prove one physical loop, one promise, one reserve, one response, and one stable knot before Act I begins.',
        action: null,
        actionLabel: null,
        steps: labels.map(function (label, i) { return step('wake_' + i, label, g > i, g === i); })
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
    // Read-only by design. Rendering the Journal must never change replay state.
    return !!state;
  };

  return Q;
})();
