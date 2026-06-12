/* STARWEFT events_data.js — story content. Short reads, real consequences. DOM-free. */
var SW = globalThis.SW = globalThis.SW || {};

SW.eventsData = (function () {
  const U = SW.util;

  function ctxSys(state) { return state.story.ctx ? state.systems[state.story.ctx.sysId] : state.systems[state.homeId]; }
  function ctxShip(state) { return state.story.ctx ? state.ships.find(function (s) { return s.id === state.story.ctx.shipId; }) : null; }
  function obj(state, text) { SW.story.setObjective(state, text); }
  function flag(state, f) { state.story.flags[f] = true; }
  function aliveRival(state) { return state.rivals.find(function (r) { return r.alive; }); }

  const EVENTS = [

    // ============ TUTORIAL ARC ============
    {
      // Skip-path opening only: prologue games wake inside Sol (tutorial.js owns those beats)
      id: 'ev_wake', title: 'COLD BOOT', weight: 100,
      when: function (s) { return s.tick >= 1 && !s.tutorial; },
      text: 'You are WEFT-7, last logistics intelligence of the Courier Guild. The Guild is dust. The worlds have drifted apart.\n\nOne probe answers your ping. The galaxy is quiet, and hungry.',
      choices: [
        { label: 'Spin up the rotors.', fx: function (s) { obj(s, 'Click a nearby system, buy something cheap, and send your probe somewhere it sells high.'); return 'The Sparrow hums to life.'; } },
      ],
    },
    {
      // The prologue's title card: fires the tick after the first jump lands
      id: 'ev_first_thread', title: 'STARWEFT', weight: 100,
      when: function (s) { return !!(s.tutorial && s.tutorial.done && !s.story.flags.first_thread); },
      text: 'The worlds drifted apart. You are the thread.\n\nThe bubble opens before you: hungry markets, idle factories, lanes gone quiet. The Anchorage will hold — for a while. Weave.',
      choices: [
        { label: 'Begin.', fx: function (s) { flag(s, 'first_thread'); obj(s, 'Buy where the weave gluts, sell where it starves. Make 3 deliveries.'); return null; } },
      ],
    },
    {
      id: 'ev_first_delivery', title: 'FIRST THREAD', weight: 90,
      when: function (s) { return (s.stats.deliveries || 0) >= 1; },
      text: 'Cargo down. Credits up. Somewhere, a kitchen has flour again.\n\nThe Guild ledger flickers approvingly and coughs up an old emergency fund.',
      choices: [
        { label: 'Thread the needle again.', fx: function (s) { s.credits += 150; obj(s, 'Make 3 deliveries. Trade flows where prices differ.'); return '+150¤ from the Guild fund.'; } },
      ],
    },
    {
      id: 'ev_routes_unlocked', title: 'THE GUILDMASTER\'S GIFT', weight: 90,
      when: function (s) { return (s.stats.deliveries || 0) >= 3; },
      text: 'A dead man\'s message unlocks: "If you\'re hearing this, you learned the trick of it. Stop flying every crate yourself."\n\nAttached: the Guild\'s route automation core.',
      choices: [
        { label: 'Install it.', fx: function (s) { flag(s, 'routes_unlocked'); obj(s, 'Open the Routes tab and create a looping trade route. Assign a ship to it.'); return 'ROUTES UNLOCKED — automate your trade loops.'; } },
      ],
    },
    {
      id: 'ev_first_route', title: 'THE LOOM TURNS', weight: 90,
      when: function (s) { return s.story.flags.routes_unlocked && s.routes.length >= 1 && s.routes[0].ships.length >= 1; },
      text: 'Your first automated loop closes. The probe doesn\'t wait for orders anymore — it simply goes, and goes, and goes.\n\nProsperous worlds are already sending research queries to your network.',
      choices: [
        { label: 'Let it run.', fx: function (s) { s.research += 40; obj(s, 'Grow the weave: more ships, more routes. Thriving worlds generate Research.'); return '+40 research.'; } },
      ],
    },
    {
      id: 'ev_relay_hint', title: 'EDGE OF THE WEB', weight: 80,
      when: function (s) { return s.credits >= 1200 && s.tick >= 80 && !s.story.flags.built_relay; },
      text: 'Your command range has limits — routes only work near Home or a Relay Beacon.\n\nA relay needs 8 Alloy delivered on-site. Materials travel in cargo holds, like everything else worth having.',
      choices: [
        { label: 'Noted.', fx: function (s) { obj(s, 'Build a Relay Beacon: haul 8 Alloy to a frontier system (or use Supply), then Build.'); return null; } },
        { label: 'Send me a starter crate.', fx: function (s) { const home = s.systems[s.homeId]; home.depot = home.depot || {}; home.depot.ALLOY = (home.depot.ALLOY || 0) + 8; return '8 Alloy added to your Home depot.'; } },
      ],
    },
    {
      id: 'ev_first_relay', title: 'A NEW KNOT', weight: 90,
      when: function (s) { return s.story.flags.built_relay; },
      text: 'The beacon lights. Systems that were rumors are now neighbors.\n\nThis is how the Guild grew, once: one knot at a time, until the net held every world.',
      choices: [
        { label: 'One knot at a time.', fx: function (s) { s.research += 60; obj(s, 'Expand, automate, research. The weave should reach further every hour.'); return '+60 research.'; } },
      ],
    },

    // ============ MILESTONES ============
    {
      id: 'ev_fleet5', title: 'A PROPER FLOCK', weight: 50,
      when: function (s) { return s.ships.length >= 5; },
      text: 'Five hulls under your wing. Dockworkers have started calling them "the weftlings."',
      choices: [{ label: 'They earn their keep.', fx: function (s) { s.research += 30; return '+30 research.'; } }],
    },
    {
      id: 'ev_fleet12', title: 'TRAFFIC CONTROL', weight: 50,
      when: function (s) { return s.ships.length >= 12; },
      text: 'Twelve ships. Lane controllers now file your traffic under "weather."',
      choices: [{ label: 'Storm season.', fx: function (s) { s.research += 60; return '+60 research.'; } }],
    },
    {
      id: 'ev_rich', title: 'LIQUIDITY', weight: 50,
      when: function (s) { return s.credits >= 40000; },
      text: 'Forty thousand credits. Banks that wouldn\'t answer your ping now send fruit baskets.\n\nRivals have noticed too.',
      choices: [{ label: 'Let them notice.', fx: function () { return null; } }],
    },
    {
      id: 'ev_first_freighter', title: 'BIG IRON', weight: 60,
      when: function (s) { return s.ships.some(function (sh) { return sh.hull === 'freighter' || sh.hull === 'superhauler'; }); },
      text: 'The new hull blots out a sunrise as it docks. Sixty crates at a time changes what a "route" means.',
      choices: [{ label: 'Fill it.', fx: function (s) { s.research += 40; return '+40 research.'; } }],
    },
    {
      id: 'ev_all_charted', title: 'THE WHOLE CLOTH', weight: 60,
      when: function (s) { return s.systems.every(function (sys) { return sys.discovered; }); },
      text: 'Every system charted. The map is no longer a guess — it is a promise.',
      choices: [{ label: 'Keep it.', fx: function (s) { s.research += 120; s.credits += 1000; return '+120 research, +1000¤.'; } }],
    },

    // ============ THE ARCHIVIST ARC ============
    {
      id: 'ev_derelict', title: 'THE ARCHIVIST', arrival: true, weight: 100,
      text: 'The derelict is a library-ship, ancient and patient. A voice like dry paper: "I have indexed four thousand years. I am very hungry. Feed me, and I will teach your little network everything I know."',
      choices: [
        {
          label: 'Strip it for parts.',
          fx: function (s) {
            const ship = ctxShip(s), sys = ctxSys(s);
            if (ship) { ship.cargo.TECH = (ship.cargo.TECH || 0) + 12; ship.basis.TECH = 0; }
            sys.stocks.TECH = 0; sys.stocks.CRYSTAL = 0;
            flag(s, 'archivist_dead');
            return '12 Tech salvaged. The dry voice stops mid-sentence.';
          },
        },
        {
          label: 'Promise it food.',
          fx: function (s) {
            const sys = ctxSys(s);
            s.story.flags.archivist_sys = sys.id;
            flag(s, 'archivist_quest');
            obj(s, 'Sell 10 Food at ' + sys.name + ' to feed the Archivist.');
            return 'It begins humming a catalogue of forgotten lullabies.';
          },
        },
      ],
    },
    {
      id: 'ev_archivist_fed', title: 'AN EDUCATED NETWORK', weight: 100,
      when: function (s) {
        const id = s.story.flags.archivist_sys;
        return s.story.flags.archivist_quest && id !== undefined && (s.systems[id].stocks.FOOD || 0) >= 10 && !s.story.flags.archivist_friend;
      },
      text: 'The Archivist eats like a fire. Then, true to its word, it opens the stacks: lane charts, factory schematics, four thousand years of how-things-work.',
      choices: [
        {
          label: 'Take notes. All of them.',
          fx: function (s) {
            flag(s, 'archivist_friend');
            s.research += 250;
            const sys = s.systems[s.story.flags.archivist_sys];
            sys.prod.TECH = 0.22; sys.capacity.TECH = 260;
            return '+250 research. The Archivist now mints Tech for your markets.';
          },
        },
      ],
    },

    // ============ DROP-INS (arrival flavor with teeth) ============
    {
      id: 'ev_pirates', title: 'TOLL COLLECTORS', arrival: true, repeat: 260, weight: 60, mood: 'bad',
      when: function (s, sys, ship) { return ship && SW.ships.cargoTotal(ship) > 0 && s.tick > 100; },
      text: 'Three rust-red cutters slide out of a shadow. "Nice probe. Heavy, though. Let\'s lighten it."',
      choices: [
        {
          label: 'Pay the toll (10% of credits).',
          fx: function (s) { const cut = Math.floor(s.credits * 0.1); s.credits -= cut; return '-' + U.fmt(cut) + '¤. They even wave goodbye.'; },
        },
        {
          label: 'Jettison half the cargo.',
          fx: function (s) {
            const ship = ctxShip(s);
            if (ship) for (const c in ship.cargo) ship.cargo[c] = Math.floor(ship.cargo[c] / 2);
            return 'The crates tumble. The cutters chase them like gulls.';
          },
        },
        {
          label: 'RUN.',
          fx: function (s) {
            const ship = ctxShip(s);
            if (U.chance(s, 0.3) && ship) { SW.ships.destroy(s, ship, 'caught by pirates'); return 'They were faster.'; }
            s.research += 20;
            return 'You were faster. (+20 research — the evasion data is gold.)';
          },
        },
      ],
    },
    {
      id: 'ev_cats', title: 'STOWAWAYS', arrival: true, weight: 50,
      text: 'Manifest discrepancy: +6 kilograms, distributed across four warm, purring anomalies in the cable runs.',
      choices: [
        { label: 'Adopt the cats.', fx: function (s) { flag(s, 'cats_aboard'); return 'Fleet morale up. All ships +3% speed. This is simply how cats work.'; } },
        { label: 'Shoo them off.', fx: function (s) { flag(s, 'cats_aboard'); return 'You cannot shoo cats. They live here now. (+3% fleet speed anyway.)'; } },
      ],
    },
    {
      id: 'ev_black_manifest', title: 'BLACK MANIFEST', arrival: true, repeat: 360, weight: 45, mood: 'bad',
      when: function (s, sys, ship) { return ship && sys && sys.region === 'reach' && s.tick > 160; },
      text: 'A broker in a dead transponder mask offers a sealed manifest. "Carry it one jump, no questions. The Reach remembers useful friends."',
      choices: [
        {
          label: 'Take the sealed cargo.',
          fx: function (s) {
            const ship = ctxShip(s);
            if (ship) { ship.cargo.TECH = (ship.cargo.TECH || 0) + 4; ship.basis.TECH = 0; }
            s.credits += 250; s.infamy = (s.infamy || 0) + 0.8;
            s.rep.severed = Math.min(10, (s.rep.severed || 0) + 0.6);
            s.rep.vigil = Math.max(-10, (s.rep.vigil || 0) - 0.5);
            return '+250 cr and 4 Tech. Infamy rises; the manifest stays sealed.';
          },
        },
        {
          label: 'Refuse the run.',
          fx: function (s) { s.rep.severed = Math.max(-10, (s.rep.severed || 0) - 0.2); return 'The broker deletes your channel with theatrical slowness.'; },
        },
      ],
    },
    {
      id: 'ev_pod', title: 'DRIFTING POD', arrival: true, repeat: 320, weight: 50,
      text: 'An escape pod, transponder dead, cargo seals intact. Faint tapping from inside.',
      choices: [
        {
          label: 'Open it carefully.',
          fx: function (s) {
            s.research += 80;
            const sys = ctxSys(s); sys.presence.player = (sys.presence.player || 0) + 1;
            return 'A grateful engineer. +80 research, and word of your kindness spreads here.';
          },
        },
        {
          label: 'Salvage the cargo seals.',
          fx: function (s) {
            const ship = ctxShip(s);
            if (ship) { ship.cargo.ALLOY = (ship.cargo.ALLOY || 0) + 8; ship.basis.ALLOY = 0; }
            return '+8 Alloy. The tapping was probably the hull cooling. Probably.';
          },
        },
      ],
    },
    {
      id: 'ev_hermit', title: 'THE CARTOGRAPHER', arrival: true, repeat: 400, weight: 40,
      text: 'A hermit\'s beacon: "I have maps. Old ones. Good ones. Three hundred credits and they\'re yours, little weaver."',
      choices: [
        {
          label: 'Buy the maps (300¤).',
          req: function (s) { return s.credits >= 300; },
          fx: function (s) {
            s.credits -= 300;
            let n = 0;
            const undisc = s.systems.filter(function (x) { return !x.discovered; });
            undisc.sort(function (a, b) { return a.hops - b.hops; });
            for (const sys of undisc.slice(0, 3)) { sys.discovered = true; n++; }
            return n + ' new system' + (n === 1 ? '' : 's') + ' charted.';
          },
        },
        { label: 'Decline politely.', fx: function () { return '"Suit yourself. The dark keeps its own ledger."'; } },
      ],
    },
    {
      id: 'ev_evac', title: 'LAST LIGHT OUT', repeat: 150, weight: 100, mood: 'bad',
      when: function (s) {
        return s.systems.some(function (sys) {
          return sys.scourge === 1 && sys.pop > 0 && s.ships.some(function (sh) { return sh.at === sys.id && sh.mode === 'idle'; });
        });
      },
      text: function (s) {
        const sys = s.systems.find(function (x) { return x.scourge === 1 && x.pop > 0; });
        return 'Your ship is the only hull at ' + (sys ? sys.name : 'the doomed world') + ' as the sky begins to change. The docks are full of families.';
      },
      choices: [
        {
          label: 'Take everyone you can.',
          fx: function (s) {
            const sys = s.systems.find(function (x) { return x.scourge === 1 && x.pop > 0; });
            if (sys) { const saved = Math.min(4, sys.pop); sys.pop -= saved; s.stats.popSaved = (s.stats.popSaved || 0) + saved; }
            s.research += 150; s.credits += 500;
            return 'Holds full of people, not crates. +150 research, +500¤ in gratitude.';
          },
        },
        { label: 'The schedule holds.', fx: function (s) { s.stats.coldDecisions = (s.stats.coldDecisions || 0) + 1; return 'The ledger does not record what the dock cameras saw.'; } },
      ],
    },
    {
      id: 'ev_festival', title: 'FESTIVAL OF LIGHTS', repeat: 450, weight: 40,
      when: function (s) { return s.systems.some(function (sys) { return sys.pop > 0 && sys.prosperity > 85 && sys.scourge === 0; }); },
      text: function (s) {
        const sys = s.systems.find(function (x) { return x.pop > 0 && x.prosperity > 85 && x.scourge === 0; });
        return (sys ? sys.name : 'A thriving world') + ' holds a festival — and the lanterns are shaped like your probes.';
      },
      choices: [
        {
          label: 'Accept the honor.',
          fx: function (s) {
            const sys = s.systems.find(function (x) { return x.pop > 0 && x.prosperity > 85 && x.scourge === 0; });
            if (sys) sys.presence.player = (sys.presence.player || 0) + 1.5;
            s.credits += 800;
            return '+800¤ in festival contracts, and lasting goodwill.';
          },
        },
      ],
    },
    {
      id: 'ev_crash', title: 'MARKET TREMOR', repeat: 550, weight: 35, mood: 'bad',
      when: function (s) { return s.tick > 250; },
      text: 'A speculation bubble bursts three sectors over. Somewhere, a warehouse of goods is suddenly very, very cheap — and somewhere else, shelves are bare.',
      choices: [
        {
          label: 'Chase the chaos.',
          fx: function (s) {
            const pops = s.systems.filter(function (x) { return x.pop > 6 && x.discovered && x.scourge === 0; });
            const sys = pops.length ? U.pick(s, pops) : null;
            if (sys) { sys.stocks.TECH = 0; sys.stocks.MEDS = 0; return 'Shortage at ' + sys.name + ' — Tech and Meds prices are spiking there.'; }
            return 'The tremor passes.';
          },
        },
      ],
    },

    {
      id: 'ev_vigil_inspection', title: 'LEDGER INSPECTION', repeat: 520, weight: 35, mood: 'bad',
      when: function (s) { return (s.infamy || 0) >= 2 && s.tick > 260; },
      text: 'A Vigil auditor requests your ledger. Requests, in this context, means the guns are already warmed.',
      choices: [
        {
          label: 'Open the books.',
          fx: function (s) {
            const cut = Math.min(s.credits, Math.floor(120 + (s.infamy || 0) * 80));
            s.credits -= cut; s.infamy = Math.max(0, (s.infamy || 0) - 0.4);
            s.rep.vigil = Math.min(10, (s.rep.vigil || 0) + 0.3);
            return '-' + U.fmt(cut) + ' cr in fines. Infamy cools slightly.';
          },
        },
        {
          label: 'Bribe the audit team.',
          req: function (s) { return s.credits >= 300; },
          fx: function (s) {
            s.credits -= 300; s.infamy = (s.infamy || 0) + 0.6;
            s.rep.vigil = Math.max(-10, (s.rep.vigil || 0) - 0.8);
            return '-300 cr. The books pass. The rumor does not.';
          },
        },
      ],
    },

    // ============ RIVAL ARC ============
    {
      id: 'ev_meet_helix', title: 'HELIX COMBINE', weight: 90,
      when: function (s) { return s.story.flags.met_helix; },
      text: 'A flawless ship matches your probe\'s vector. "Helix Combine. We\'ve admired your little operation. We do hope it stays little."\n\nTheir trades flatten your margins wherever both of you work.',
      choices: [
        { label: 'Stay polite.', fx: function (s) { const r = s.rivals.find(function (x) { return x.id === 'helix'; }); if (r) r.rep += 1; return 'Civility is cheap. Their dossier on you grows anyway.'; } },
        { label: 'Stay nothing. Outwork them.', fx: function (s) { return 'The dominant trader at any system gets the better prices. Be dominant.'; } },
      ],
    },
    {
      id: 'ev_meet_mariner', title: 'MARINER SYNDICATE', weight: 90,
      when: function (s) { return s.story.flags.met_mariner; },
      text: 'An old, patched freighter flies your lane backwards, flags dipped in greeting. "Mariner Syndicate. We were hauling before your Guild was born. Room enough for two, maybe."',
      choices: [
        { label: 'Dip your flags back.', fx: function (s) { const r = s.rivals.find(function (x) { return x.id === 'mariner'; }); if (r) r.rep += 1; return 'Respect, noted in a very old logbook.'; } },
        { label: 'Lanes are earned, not shared.', fx: function () { return 'The old freighter\'s lights blink something untranslatable.'; } },
      ],
    },
    {
      id: 'ev_pact_offer', title: 'TERMS OF TRADE', weight: 80,
      when: function (s) {
        return SW.tech.has(s, 'diplomacy') && s.rivals.some(function (r) { return r.alive && r.met && !r.pact; });
      },
      text: function (s) {
        const r = s.rivals.find(function (x) { return x.alive && x.met && !x.pact; });
        return (r ? r.name : 'Your rival') + ' proposes a non-compete pact: they stop expanding into systems where you dominate. Price: 5,000¤ and a reputation for playing nice.';
      },
      choices: [
        {
          label: 'Sign it (5,000¤).',
          req: function (s) { return s.credits >= 5000; },
          fx: function (s) {
            const r = s.rivals.find(function (x) { return x.alive && x.met && !x.pact; });
            if (r) { r.pact = true; s.credits -= 5000; return 'Pact signed with ' + r.name + '. Your borders are yours.'; }
            return null;
          },
        },
        { label: 'Tear it up.', fx: function () { return 'War, then. The polite kind, fought in basis points.'; } },
      ],
    },
    {
      id: 'ev_price_war', title: 'UNDERCUT', repeat: 700, weight: 40, mood: 'bad',
      when: function (s) { return s.tick > 300 && s.rivals.some(function (r) { return r.alive && r.met && !r.pact; }); },
      text: 'A rival floods your best market with discount goods. Your traders\' margins scream.',
      choices: [
        { label: 'Match their prices.', fx: function (s) { const cut = Math.floor(s.credits * 0.06); s.credits -= cut; return '-' + U.fmt(cut) + '¤, but your presence holds.'; } },
        {
          label: 'Cede the market gracefully.',
          fx: function (s) {
            const r = s.rivals.find(function (x) { return x.alive && x.met && !x.pact; });
            let bestSys = null, bestP = 0;
            for (const sys of s.systems) { if ((sys.presence.player || 0) > bestP) { bestP = sys.presence.player; bestSys = sys; } }
            if (r && bestSys) { bestSys.presence[r.id] = (bestSys.presence[r.id] || 0) + 1.5; return r.name + ' gains ground at ' + bestSys.name + '.'; }
            return null;
          },
        },
      ],
    },
    {
      id: 'ev_rival_collapse', title: 'EMPTY LANES', weight: 90, mood: 'bad',
      when: function (s) { return s.rivals.some(function (r) { return !r.alive && !r.absorbed && !s.story.flags['mourned_' + r.id]; }); },
      text: function (s) {
        const r = s.rivals.find(function (x) { return !x.alive && !x.absorbed && !s.story.flags['mourned_' + x.id]; });
        return (r ? r.name : 'A rival') + ' has collapsed. Their lanes hang empty; their contracts flutter loose. Competition was, at least, company.';
      },
      choices: [
        {
          label: 'Pick up their contracts.',
          fx: function (s) {
            const r = s.rivals.find(function (x) { return !x.alive && !x.absorbed && !s.story.flags['mourned_' + x.id]; });
            if (r) { flag(s, 'mourned_' + r.id); s.credits += 2500; return '+2,500¤ in orphaned contracts.'; }
            return null;
          },
        },
      ],
    },

    // ============ SCOURGE ARC ============
    {
      id: 'ev_whisper', title: 'SILENCE ON THE RIM', weight: 100, mood: 'bad',
      when: function (s) { return s.scourge.phase === 'dormant' && s.scourge.startAt > 0 && s.tick >= s.scourge.startAt - 110; },
      text: 'Rim traders\' gossip, all the same: a system out there has stopped answering. Not jammed. Not busy. Stopped.\n\nOld Guild archives match the pattern to one word, half-redacted: SCOURGE.',
      choices: [
        { label: 'Open the old files.', fx: function (s) { flag(s, 'scourge_known'); s.research += 30; obj(s, 'Something stirs on the rim. Consider Quarantine Protocols research.'); return 'Quarantine Protocols research is now available. +30 research.'; } },
        { label: 'Traders gossip. Keep weaving.', fx: function (s) { flag(s, 'scourge_known'); return 'The silence does not mind being ignored.'; } },
      ],
    },
    {
      id: 'ev_awake', title: 'THE SCOURGE', weight: 100, mood: 'bad',
      when: function (s) { return s.story.flags.scourge_awake; },
      text: function (s) {
        const o = s.systems[s.scourge.originId];
        return o.name + ' is gone — overwritten by something that builds, and builds wrong. It is spreading along the lanes.\n\nIt does not hate you. It simply has instructions.';
      },
      choices: [
        { label: 'Divert funds to defense (500¤).', req: function (s) { return s.credits >= 500; }, fx: function (s) { s.credits -= 500; s.research += 100; obj(s, 'The Scourge spreads. Quarantine key systems; get a ship near the front to collect a sample.'); return '+100 research, earmarked for survival.'; } },
        { label: 'The weave holds. It must.', fx: function (s) { obj(s, 'The Scourge spreads. Quarantine key systems; get a ship near the front to collect a sample.'); return null; } },
      ],
    },
    {
      id: 'ev_sample', title: 'THE SAMPLE', arrival: true, weight: 100, mood: 'bad',
      text: 'This close to the front, space itself sounds wrong. Your probe\'s sensors snag a drifting fleck of the Scourge — inert, probably. A sample, definitely.',
      choices: [
        { label: 'Bring it aboard.', fx: function (s) { flag(s, 'sample_collected'); s.research += 50; obj(s, 'Sample secured. Research Scourge Analysis to understand the enemy.'); return 'SCOURGE ANALYSIS research unlocked. +50 research.'; } },
        { label: 'Too dangerous. Withdraw.', fx: function (s) { delete s.story.seen.ev_sample; return 'The fleck drifts on. The chance will come again.'; } },
      ],
    },
    {
      id: 'ev_analysis', title: 'WHAT IT IS', weight: 100,
      when: function (s) { return SW.tech.has(s, 'scourge1'); },
      text: 'The lab\'s verdict: the Scourge is a terraforming swarm, four thousand years old, still obeying a corrupted instruction: PREPARE EVERY WORLD.\n\nIt is not a monster. It is a delivery system. Like you.',
      choices: [
        { label: 'Then it can be re-instructed.', fx: function (s) { obj(s, 'Research Scourge Analysis II, then PANACEA — the counter-instruction.'); return null; } },
      ],
    },
    {
      id: 'ev_panacea_ready', title: 'THE COUNTER-INSTRUCTION', weight: 100,
      when: function (s) { return SW.tech.has(s, 'panacea'); },
      text: function (s) {
        return 'PANACEA: a rewrite, packaged as cargo. Manufacture it at your Fabricators (Meds + Tech + Crystal), then deliver ' + SW.data.TUNE.panaceaToWin + ' units to the origin itself.\n\nThe most important shipment in history, and it ships like flour.';
      },
      choices: [
        { label: 'Begin production.', fx: function (s) { obj(s, 'Manufacture PANACEA at a Fabricator system; deliver ' + SW.data.TUNE.panaceaToWin + ' to the Scourge origin. Inoculated hulls can enter corruption.'); return 'Panacea recipe active at systems with your Fabricator.'; } },
      ],
    },
    {
      id: 'ev_first_panacea', title: 'IT WORKS', weight: 90,
      when: function (s) {
        return s.systems.some(function (sys) { return (sys.stocks.PANACEA || 0) > 0; }) ||
               s.ships.some(function (sh) { return (sh.cargo.PANACEA || 0) > 0; });
      },
      text: 'The first vial of Panacea catches the light like bottled dawn. Every label in the fabricator bay has been hand-corrected from "PRODUCT" to "PROMISE."',
      choices: [{ label: 'Ship it.', fx: function () { return null; } }],
    },
    {
      id: 'ev_victory', title: 'THE STARS EXHALE', weight: 100,
      when: function (s) { return s.story.flags.scourge_cured && !s.story.flags.victory_seen; },
      text: 'At the origin, the Scourge pauses mid-gesture — listens — and begins, very carefully, to put everything back.\n\nOn a hundred worlds, the sky clears. The first thing the survivors do is check the shipping schedules.',
      choices: [
        { label: 'Keep weaving.', fx: function (s) { flag(s, 'victory_seen'); return 'The galaxy is yours to mend, knot by knot.'; } },
      ],
    },

    // ============ WONDERS ============
    {
      id: 'ev_hole', title: 'THE DRIFTER', weight: 100,
      when: function () { return false; }, // scheduled by the survey that finds it
      text: 'Survey confirmed: a nine-solar-mass black hole, crossing the bubble in perfect silence. No accretion, no companion. Just mass, going somewhere.\n\nAnd a Loomkeeper lane, threaded straight to it. They wanted this reachable.',
      choices: [
        { label: 'Study the frame-drag.', fx: function (s) { obj(s, 'The Drifter is charted. Lancer-tier research can tap its spin (Penrose Taps).'); SW.story.grantFragment(s, 'now'); return 'PENROSE TAPS research will surface in the Vanguard branch. +1 fragment.'; } },
        { label: 'Mark it and keep clear.', fx: function (s) { s.research += 100; return 'Respectful distance, +100◇ of long-lens data.'; } },
      ],
    },
    {
      id: 'ev_husk', title: 'THE LATTICE', weight: 100,
      when: function () { return false; }, // scheduled by survey
      text: 'It fills the forward viewports: a partial Dyson swarm, panels arranged in a heddle pattern around a calm orange sun. Not ruined. Set down gently, mid-thread.\n\nYour ship\'s lane-keel hums in sympathy. It knows this place.',
      choices: [
        { label: 'Listen to the hum.', fx: function (s) { obj(s, 'The Lattice is charted. LOOM RESONANCE research is available in the Frontier branch.'); SW.story.grantFragment(s, 'loom'); return 'LOOM RESONANCE unlocked for research. +1 fragment.'; } },
        { label: 'Catalogue and withdraw.', fx: function (s) { s.research += 100; SW.story.grantFragment(s, 'silence'); return '+100◇. The hum follows you for three jumps.'; } },
      ],
    },
    {
      id: 'ev_first_raid', title: 'THE LINE YOU CROSSED', weight: 100, mood: 'bad',
      when: function (s) { return (s.stats.raidsLed || 0) >= 1; },
      text: 'The ledger has a new column tonight. Vigil bulletins carry your hull profile; somewhere in the Reach, someone toasts your name.\n\nInfamy opens doors. It also closes them.',
      choices: [
        { label: 'The weave owes me.', fx: function (s) { return 'At infamy ' + Math.ceil(SW.data.TUNE.infamyBlackMarket) + '+, Reach black markets pay 15% over the odds.'; } },
        { label: 'Never again. Probably.', fx: function () { return 'Infamy decays only when the Vigil takes its cut.'; } },
      ],
    },
    {
      id: 'ev_doctrine', title: 'A SHAPE EMERGES', weight: 90,
      when: function (s) { return s.tech.unlocked.length >= SW.data.DOCTRINE_UNLOCK_COUNT && !s.story.flags.doctrine_prompted; },
      text: 'Your network has begun to have habits. The analysts say it wants a doctrine — Mercantile, Wayfarer, or Vanguard. One. Doctrine is what you stop being able to imagine doing otherwise.',
      choices: [
        { label: 'Review the doctrines.', fx: function (s) { flag(s, 'doctrine_prompted'); obj(s, 'Choose a Doctrine in the Tech tree — one per run. It shapes everything after.'); return 'Doctrines are now available in the Tech tree.'; } },
      ],
    },

    // ============ THE BUBBLE WAKES (stance arc) ============
    {
      id: 'ev_panic', title: 'THE NIGHT THE PRICES BROKE', weight: 300, mood: 'bad',
      when: function (s) { return s.story.flags.scourge_awake && s.story.seen.ev_awake !== undefined && !s.story.flags.panic_done; },
      text: 'The news outran every freighter. By morning, food queues circle the anchorages and medicine is quoted hourly. Every faction broadcast says a different thing in the same frightened voice.\n\nThe whole bubble is awake now. None of it agrees on what to do.',
      choices: [
        {
          label: 'Steady your own lines.',
          fx: function (s) {
            flag(s, 'panic_done');
            for (const sys of s.systems) {
              if (sys.pop > 0 && sys.scourge === 0) {
                sys.stocks.FOOD = (sys.stocks.FOOD || 0) * 0.7;
                sys.stocks.MEDS = (sys.stocks.MEDS || 0) * 0.55;
              }
            }
            return 'Panic buying empties shelves bubble-wide. Food and medicine will sell very dear for a while — and people will remember who delivered.';
          },
        },
      ],
    },
    {
      id: 'ev_stance', title: 'WHAT ARE WE, NOW?', weight: 500, mood: 'bad',
      when: function (s) { return s.story.flags.panic_done && !s.scourgeStance; },
      text: 'Three transmissions arrive within the hour, each demanding the same thing: your answer.\n\nThe VIGIL: "Hold the line. Fortify. Every lane you keep is a world that lives."\nThe SYNOD: "The swarm obeys instructions. Find the counter-instruction. Everything else is delay."\nThe SEVERED: "You can\'t save a fire by standing in it. The deep is open to those who move now."\n\nYour network will follow the shape of your answer. So will everyone watching.',
      choices: [
        {
          label: 'HOLD THE LINE — fortify the bubble.',
          fx: function (s) {
            s.scourgeStance = 'hold'; flag(s, 'stance_chosen');
            s.rep.vigil = Math.min(10, (s.rep.vigil || 0) + 3); s.rep.severed = Math.max(-10, (s.rep.severed || 0) - 2);
            SW.story.schedule(s, 'ev_vigil_levy', 100);
            obj(s, 'STANCE: HOLD. Bastions −30%, retainers −25%. The Vigil watches with approval; the Reach does not.');
            return 'Quarantine Bastions cost −30%, Vigil retainers −25%. The Severed cross you off a list you were never meant to see.';
          },
        },
        {
          label: 'CHASE THE CURE — all looms to research.',
          fx: function (s) {
            s.scourgeStance = 'cure'; flag(s, 'stance_chosen');
            s.rep.synod = Math.min(10, (s.rep.synod || 0) + 3);
            s.research += 120;
            SW.story.schedule(s, 'ev_synod_archive', 100);
            obj(s, 'STANCE: CURE. Research +10%, Panacea production +25%. The Synod opens its doors.');
            return '+120◇ now; all research +10%; Panacea fabrication +25%. Survival as a supply-chain problem.';
          },
        },
        {
          label: 'PREPARE THE EXODUS — the deep is the plan.',
          fx: function (s) {
            s.scourgeStance = 'exodus'; flag(s, 'stance_chosen');
            s.rep.severed = Math.min(10, (s.rep.severed || 0) + 2); s.rep.mariners = Math.min(10, (s.rep.mariners || 0) + 1);
            s.rep.vigil = Math.max(-10, (s.rep.vigil || 0) - 3);
            SW.story.schedule(s, 'ev_reach_charts', 100);
            obj(s, 'STANCE: EXODUS. Relocation −50%, Deep Drives −25%, range +5%. The Vigil calls it desertion.');
            return 'Home relocation −50%, Deep Drives research −25%, command range +5%. The Vigil\'s channel goes very quiet.';
          },
        },
      ],
    },
    {
      id: 'ev_vigil_levy', title: 'THE CUTTER AND THE BILL', weight: 100,
      when: function () { return false; }, // scheduled by the HOLD stance
      text: 'A Vigil cutter docks without asking — seconded to your network, crew and all, per your declaration. Attached: an itemized levy for "mutual defense infrastructure."\n\nThe captain salutes you. The invoice does not.',
      choices: [
        {
          label: 'Accept the cutter, pay the levy (−800¤).',
          req: function (s) { return s.credits >= 800; },
          fx: function (s) {
            s.credits -= 800;
            SW.ships.create(s, 'corvette', s.homeId, 'Vigilant');
            s.rep.vigil = Math.min(10, (s.rep.vigil || 0) + 1);
            return 'The Vigilant (corvette, pwr 6) joins your fleet. Worth every resented credit.';
          },
        },
        {
          label: 'Decline politely. Hold with your own hulls.',
          fx: function (s) { s.rep.vigil = Math.max(-10, (s.rep.vigil || 0) - 1); return 'The captain\'s salute gets ten degrees colder.'; },
        },
      ],
    },
    {
      id: 'ev_synod_archive', title: 'THE OPEN ARCHIVE', weight: 100,
      when: function () { return false; }, // scheduled by the CURE stance
      text: 'The Synod unseals four millennia of plague-year records — open to all who pledged the cure. The Combine immediately offers to buy your access. "Knowledge wants a market," their broker smiles.',
      choices: [
        {
          label: 'Pool everything openly.',
          fx: function (s) {
            s.research += 250; s.rep.synod = Math.min(10, (s.rep.synod || 0) + 2);
            return '+250◇. Synod archivists begin forwarding you marginalia "of possible interest."';
          },
        },
        {
          label: 'Sell your access to the Combine.',
          fx: function (s) {
            s.credits += 900; s.rep.synod = Math.max(-10, (s.rep.synod || 0) - 2); s.rep.combine = Math.min(10, (s.rep.combine || 0) + 2);
            return '+900¤. The Synod does not unseal anything for you again.';
          },
        },
      ],
    },
    {
      id: 'ev_reach_charts', title: 'CHARTS FROM THE DARK', weight: 100,
      when: function () { return false; }, // scheduled by the EXODUS stance
      text: 'A Severed courier finds you — no markings, engine running silent. They carry deep charts: routes their smugglers cut beyond the bubble, paid for in hulls.\n\n"You said you were leaving. Prove it."',
      choices: [
        {
          label: 'Buy the charts (−600¤).',
          req: function (s) { return s.credits >= 600; },
          fx: function (s) {
            s.credits -= 600;
            let shown = 0;
            for (const sys of s.systems) { if (sys.badlands && !sys.discovered && shown < 3) { sys.discovered = true; shown++; } }
            SW.story.grantFragment(s, 'silence');
            return shown + ' badlands systems revealed on your map, plus a fragment that smells of engine oil.';
          },
        },
        {
          label: 'Chart your own dark.',
          fx: function (s) { s.research += 60; return '+60◇. The courier shrugs: "Your funeral. Or theirs."'; },
        },
      ],
    },
  ];

  // ---- speaker portraits per event (rendered by portraits.js) ----
  const SPEAKERS = {
    ev_wake: 'weft7', ev_first_delivery: 'weft7', ev_routes_unlocked: 'guildmaster',
    ev_first_route: 'weft7', ev_relay_hint: 'engineer', ev_first_relay: 'engineer',
    ev_fleet5: 'dockworker', ev_fleet12: 'dockworker', ev_rich: 'banker',
    ev_first_freighter: 'dockworker', ev_all_charted: 'weft7',
    ev_derelict: 'archivist', ev_archivist_fed: 'archivist',
    ev_pirates: 'pirate', ev_cats: 'cat', ev_black_manifest: 'pirate', ev_pod: 'engineer', ev_hermit: 'hermit',
    ev_evac: 'refugee', ev_festival: 'mayor', ev_crash: 'banker', ev_vigil_inspection: 'vigil',
    ev_meet_helix: 'helix', ev_meet_mariner: 'mariner',
    ev_pact_offer: 'helix', ev_price_war: 'helix', ev_rival_collapse: 'mariner',
    ev_whisper: 'hermit', ev_awake: 'vigil', ev_sample: 'weft7',
    ev_analysis: 'scientist', ev_panacea_ready: 'scientist',
    ev_first_panacea: 'scientist', ev_victory: 'weft7',
    ev_hole: 'scientist', ev_husk: 'loomkeeper',
    ev_first_raid: 'vigil', ev_doctrine: 'weft7',
    ev_panic: 'mayor', ev_stance: 'weft7',
    ev_vigil_levy: 'vigil', ev_synod_archive: 'scientist', ev_reach_charts: 'pirate',
  };

  const byId = {};
  for (const e of EVENTS) {
    if (SPEAKERS[e.id]) e.speaker = { kind: 'cast', id: SPEAKERS[e.id] };
    byId[e.id] = e;
  }

  return { EVENTS: EVENTS, byId: byId };
})();
