/* STARWEFT tutorial.js — the Sol cold open. DOM-free.
   The game's first minutes happen inside the Sol system view with the galaxy
   locked, and they teach the game's only real verb at system scale:
   fly to where it's cheap, fill the hold, sell where it's dear. Belt ore is
   the first spread; the Hydrofarm is the first anchor; the Guild's last gift
   opens the map. Beats are state predicates — the player can wander; the
   world decides completion. There is no dead end: a broke prologue run gets
   a Guild advance, never a wall.
   Only active when a new game is begun with { tutorial: true }; headless
   tests and bots are never routed through it. */
var SW = globalThis.SW = globalThis.SW || {};

SW.tutorial = (function () {
  const T = {};

  function home(state) { return state.systems[state.homeId]; }
  function fleetAtHome(state) {
    return state.ships.filter(function (sh) { return sh.at === state.homeId; });
  }

  // Alloy that would count as materials-on-site for a build at home
  function alloyOnSite(state) {
    const h = home(state);
    let n = (h.depot && h.depot.ALLOY) || 0;
    for (const sh of fleetAtHome(state)) n += sh.cargo.ALLOY || 0;
    return n;
  }
  function fleetCargo(state) {
    let n = 0;
    for (const sh of state.ships) n += SW.ships.cargoTotal(sh);
    return n;
  }

  // Set the active beat's objective AND remember it on tu.prompt, so T.tick can
  // restore it after a world event overwrites the objective chip (events call
  // story.setObjective too). The prompt returns whenever the beat is unfulfilled.
  function setBeat(s, text) {
    if (s.tutorial) s.tutorial.prompt = text;
    SW.story.setObjective(s, text);
  }

  // Beats: enter() fires once when the beat becomes current; complete() is a
  // pure predicate checked each tick. Prompts ride the objectives chip.
  const GOALS = [
    {
      id: 'cast_off',
      enter: function (s) {
        setBeat(s, '1) Click THE BELT or any part of its ring. 2) Click FLY HERE. Ore is cheap where it floats free.');
      },
      complete: function (s) {
        return s.ships.some(function (sh) {
          return sh.at === s.homeId && (sh.body === 'The Belt' || (sh.hop && sh.hop.to === 'The Belt'));
        });
      },
    },
    {
      id: 'first_cargo',
      enter: function (s) {
        setBeat(s, '3) At the Belt, buy ' + SW.data.TUNE.prologueOreBeat + '+ Ore. The Belt price is ' + Math.round(100 - 100 * ((SW.data.BERTH.belt && SW.data.BERTH.belt.ORE) || 0.6)) + '% lower than Earth Anchorage.');
      },
      complete: function (s) {
        return s.ships.some(function (sh) { return (sh.cargo.ORE || 0) >= SW.data.TUNE.prologueOreBeat; });
      },
    },
    {
      id: 'first_sale',
      enter: function (s) {
        setBeat(s, '4) Click EARTH, FLY HERE, then sell the Ore. The spread between berths is the wage.');
      },
      complete: function (s) {
        return !!s.tutorial.profitableOreSale;
      },
    },
    {
      id: 'gather',
      enter: function (s) {
        setBeat(s, '5) At Earth Anchorage, buy 5 Alloy. The Guild escrow covers the first anchor.');
      },
      complete: function (s) { return alloyOnSite(s) >= 5; },
    },
    {
      id: 'anchor',
      enter: function (s) {
        setBeat(s, '6) Select EARTH and anchor the Hydrofarm. Cargo aboard Stitch counts as material on-site.');
      },
      complete: function (s) { return (home(s).sites || []).length > 0; },
    },
    {
      id: 'chain',
      enter: function (s) {
        s.tutorial.anchorAt = s.tick;
        setBeat(s, '7) Let the chain breathe for a few ticks: Biomass flows in, the FOOD works turn it, the city eats.');
      },
      complete: function (s) { return s.tick >= (s.tutorial.anchorAt || 0) + 25; },
    },
    {
      id: 'net',
      enter: function (s) {
        s.tutorial.netPrompted = false;
        setBeat(s, '8) Open JOURNAL and authorize the Sol Logistics Net. The company works by contracts; this one connects the cradle.');
      },
      complete: function (s) { return !!(s.story.flags && s.story.flags.sol_net_authorized); },
    },
    {
      id: 'jump',
      enter: function (s) {
        // Idempotent: the gift + heading fire once, even if enter() is re-called
        // (e.g. restoring the prompt after a shipless bailout on this beat).
        if (!s.tutorial.jumpGranted) {
          s.tutorial.jumpGranted = true;
          s.credits += SW.data.TUNE.prologueGift;
          s.tutorial.mapUnlocked = true;
          SW.game.emit('toast', { kind: 'good', text: 'The Guildmaster’s final ledger names you sole heir. +' + SW.data.TUNE.prologueGift + '¤, and a heading.' });
        }
        setBeat(s, '9) Leave the cradle. SEND Stitch to a neighboring star. The galaxy map is yours now.');
      },
      complete: function (s) {
        return s.ships.some(function (sh) { return sh.at !== null && sh.at !== s.homeId; });
      },
    },
  ];

  // Called from G.newGame when opts.tutorial is set
  T.init = function (state) {
    state.tutorial = { active: true, goal: -1, anchorAt: 0, mapUnlocked: false, done: false, lastStipend: -999 };
    const h = home(state);
    // The prologue needs buyable alloy and ore at sane prices; everything else is stock Sol.
    h.stocks.ALLOY = Math.max(h.stocks.ALLOY || 0, 45);
    h.stocks.ORE = Math.max(h.stocks.ORE || 0, 25);
    // The Belt lesson must remain completable even after a player waits while
    // Sol's ore trickle fills the ordinary market buffer.
    h.capacity.ORE = Math.max(h.capacity.ORE || 0, 200);
    state.credits += SW.data.TUNE.prologueEscrow; // the Guild escrow — the prologue's budget
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

    // ---- No dead ends. Two safety nets, both deterministic and journal-free. ----
    // (a) Lost your only ship: the Guild won't let its heir strand. Top up to a
    //     Sparrow's cost and point you back to the home shipyard. This is the
    //     soft-lock that bit hardest — losing Stitch in the cradle with no rebuy.
    if (state.ships.length === 0) {
      // While shipless, the only objective that matters is rebuilding — pin it as
      // the beat prompt so the re-assert logic keeps it visible, not the old beat.
      const buildMsg = 'Your ship was lost. Select your home system and BUILD a new Sparrow (the Guild has covered the cost), then carry on.';
      tu.prompt = buildMsg;
      if (state.story.objective !== buildMsg) SW.story.setObjective(state, buildMsg);
      if (state.tick - (tu.lastShipAid || -999) >= SW.data.TUNE.prologueStipendEvery) {
        tu.lastShipAid = state.tick;
        const sparrow = SW.ships.hullCost(state, 'sparrow');
        if (state.credits < sparrow) state.credits = sparrow + 20;
        SW.game.emit('toast', { kind: 'good', text: '◌ The Guild fronts a replacement hull. Select EARTH (home) and build a new Sparrow — the ledger keeps its heir afloat.' });
      }
      tu.wasShipless = true;
      return; // nothing else to advance while shipless
    }
    // Just rebuilt after being shipless: restore the current beat's real prompt.
    if (tu.wasShipless) {
      tu.wasShipless = false;
      const cur = GOALS[tu.goal];
      if (cur && cur.enter) cur.enter(state);
    }
    // (b) Broke, holds empty, still have a ship — the Guild fronts a stake to buy
    //     back into the ore loop.
    else if (!tu.mapUnlocked && state.ships.length > 0 && state.credits < 40 && fleetCargo(state) < 1 &&
        state.tick - (tu.lastStipend || -999) >= SW.data.TUNE.prologueStipendEvery) {
      tu.lastStipend = state.tick;
      state.credits += SW.data.TUNE.prologueStipend;
      SW.game.emit('toast', { kind: 'info', text: '◌ A Guild contingency line clears: +' + SW.data.TUNE.prologueStipend + '¤. The ledger forgives. Once more.' });
    }
    const g = GOALS[tu.goal];
    if (!g) { finish(state); return; }
    if (g.complete(state)) {
      tu.goal++;
      if (tu.goal >= GOALS.length) finish(state);
      else GOALS[tu.goal].enter(state);
    } else if (tu.prompt && state.story.objective !== tu.prompt) {
      // A world event overwrote the objective chip; the current beat is still
      // unfulfilled, so restore its prompt. The player always sees their next step.
      SW.story.setObjective(state, tu.prompt);
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
