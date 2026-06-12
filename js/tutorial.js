/* STARWEFT tutorial.js — the Sol cold open. DOM-free.
   The game's first minutes happen inside the Sol system view with the galaxy
   locked: buy alloy, anchor a Hydrofarm on Earth, watch the production chain
   feed the Anchorage, then take the Guild's last gift and jump. Beats are
   state predicates — the player can wander; the world decides completion.
   Only active when a new game is begun with { tutorial: true }; headless
   tests and bots are never routed through it. */
var SW = globalThis.SW = globalThis.SW || {};

SW.tutorial = (function () {
  const T = {};

  function home(state) { return state.systems[state.homeId]; }

  // Alloy that would count as materials-on-site for a build at home
  function alloyOnSite(state) {
    const h = home(state);
    let n = (h.depot && h.depot.ALLOY) || 0;
    for (const sh of state.ships) {
      if (sh.at === state.homeId) n += sh.cargo.ALLOY || 0;
    }
    return n;
  }

  // Beats: enter() fires once when the beat becomes current; complete() is a
  // pure predicate checked each tick. Prompts ride the objectives chip.
  const GOALS = [
    {
      id: 'gather',
      enter: function (s) {
        SW.story.setObjective(s, 'Earth Anchorage is hungry. A Hydrofarm on Earth would feed it — buy 5 Alloy at the Anchorage market. The Guild escrow (+600¤) is yours now.');
      },
      complete: function (s) { return alloyOnSite(s) >= 5; },
    },
    {
      id: 'anchor',
      enter: function (s) {
        SW.story.setObjective(s, 'Alloy aboard counts as materials on-site. Open Earth in the system view and anchor the Hydrofarm. Building is delivering.');
      },
      complete: function (s) { return (home(s).sites || []).length > 0; },
    },
    {
      id: 'chain',
      enter: function (s) {
        s.tutorial.anchorAt = s.tick;
        SW.story.setObjective(s, 'Kelp vats under orbital mirrors. Watch the Anchorage market breathe: Biomass rises, the FOOD works turn it, the city eats.');
      },
      complete: function (s) {
        return s.tick >= (s.tutorial.anchorAt || 0) + 20 && home(s).satNeed >= 0.9;
      },
    },
    {
      id: 'jump',
      enter: function (s) {
        s.credits += 400;
        s.tutorial.mapUnlocked = true;
        SW.game.emit('toast', { kind: 'good', text: 'The Guildmaster’s final ledger names you sole heir. +400¤, and a heading.' });
        SW.story.setObjective(s, 'Leave the cradle. Send Stitch to a neighboring star — the galaxy map is yours now.');
      },
      complete: function (s) {
        return s.ships.some(function (sh) { return sh.at !== null && sh.at !== s.homeId; });
      },
    },
  ];

  // Called from G.newGame when opts.tutorial is set
  T.init = function (state) {
    state.tutorial = { active: true, goal: -1, anchorAt: 0, mapUnlocked: false, done: false };
    const h = home(state);
    // The prologue needs buyable alloy at a sane price; everything else is stock Sol.
    h.stocks.ALLOY = Math.max(h.stocks.ALLOY || 0, 45);
    state.credits += 600; // the Guild escrow — the prologue's budget
  };

  T.isActive = function (state) { return !!(state && state.tutorial && state.tutorial.active); };

  // Galaxy view stays shut until the gift beat opens it
  T.mapLocked = function (state) {
    return !!(state && state.tutorial && state.tutorial.active && !state.tutorial.mapUnlocked);
  };

  T.tick = function (state) {
    const tu = state.tutorial;
    if (!tu || !tu.active) return;
    if (tu.goal < 0) { tu.goal = 0; GOALS[0].enter(state); return; }
    const g = GOALS[tu.goal];
    if (!g) { finish(state); return; }
    if (g.complete(state)) {
      tu.goal++;
      if (tu.goal >= GOALS.length) finish(state);
      else GOALS[tu.goal].enter(state);
    }
  };

  function finish(state) {
    const tu = state.tutorial;
    tu.active = false;
    tu.done = true; // ev_first_thread (the title card) triggers on this
    SW.game.legacySet('prologue');
  }

  return T;
})();
