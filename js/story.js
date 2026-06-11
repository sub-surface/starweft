/* STARWEFT story.js — event engine, objectives, fragments, and the
   procedural encounter assembler (faction × situation × place). DOM-free. */
var SW = globalThis.SW = globalThis.SW || {};

SW.story = (function () {
  const U = SW.util, D = SW.data;
  const ST = {};
  const dynamic = {};   // runtime-built encounter events (not saved; rebuilt on demand)

  ST.init = function (state) {
    state.story = {
      seen: {}, encSeen: {}, flags: {}, pending: null, ctx: null,
      queue: [], log: [], objective: 'Wake up.', lastDropIn: -999,
    };
    state.fragments = [];
  };

  function ev(id) { return dynamic[id] || SW.eventsData.byId[id]; }

  ST.tick = function (state) {
    const st = state.story;
    if (st.pending) {
      if (!ev(st.pending)) st.pending = null; // dynamic event lost across a load: let it go
      else return;
    }
    for (let i = 0; i < st.queue.length; i++) {
      if (state.tick >= st.queue[i].at) {
        const item = st.queue.splice(i, 1)[0];
        if (ev(item.id)) { fire(state, item.id, item.ctx); return; }
      }
    }
    const pool = SW.eventsData.EVENTS.filter(function (e) {
      if (e.arrival) return false;
      const last = st.seen[e.id];
      if (last !== undefined && !e.repeat) return false;
      if (last !== undefined && e.repeat && state.tick - last < e.repeat) return false;
      try { return e.when ? e.when(state) : false; } catch (err) { return false; }
    });
    if (pool.length) {
      const choice = U.weightedPick(state, pool, function (e) { return e.weight || 1; });
      if (choice) fire(state, choice.id, null);
    }
  };

  function fire(state, id, ctx) {
    const e = ev(id);
    if (!e) return;
    state.story.pending = id;
    state.story.ctx = ctx || state.story.ctx;
    state.story.seen[id] = state.tick;
    SW.game.emit('event', e);
    SW.game.emit('sfx', e.mood === 'bad' ? 'dread' : 'chime');
  }

  ST.pendingEvent = function (state) {
    return state.story.pending ? ev(state.story.pending) : null;
  };

  ST.choose = function (state, idx) {
    const e = ST.pendingEvent(state);
    if (!e) { state.story.pending = null; return { ok: false }; }
    const choice = e.choices[idx] || e.choices[0];
    if (choice.req && !choice.req(state)) return { ok: false, msg: 'Requirements not met.' };
    let result = null;
    try { result = choice.fx ? choice.fx(state) : null; } catch (err) { result = null; }
    state.story.pending = null;
    state.story.log.push({
      tick: state.tick, title: e.title,
      text: typeof e.text === 'function' ? e.text(state) : e.text,
      choice: choice.label, result: result || null, speaker: e.speaker || null,
    });
    if (state.story.log.length > 80) state.story.log.shift();
    return { ok: true, result: result };
  };

  ST.schedule = function (state, id, inTicks, ctx) {
    state.story.queue.push({ at: state.tick + inTicks, id: id, ctx: ctx || null });
  };
  ST.setObjective = function (state, text) {
    state.story.objective = text;
    SW.game.emit('objective', text);
  };

  // ---- fragments (the Chronicle) ----
  ST.grantFragment = function (state, preferEpoch) {
    const have = new Set(state.fragments);
    let pool = SW.lore.FRAGMENTS.filter(function (f) { return !have.has(f.id); });
    if (!pool.length) { state.research += 40; return null; }
    if (preferEpoch) {
      const pref = pool.filter(function (f) { return f.epoch === preferEpoch; });
      if (pref.length) pool = pref;
    }
    const frag = U.pick(state, pool);
    state.fragments.push(frag.id);
    state.research += 25;
    SW.game.emit('toast', { kind: 'good', text: '◈ Chronicle fragment recovered: "' + frag.title + '" (+25◇) — read it in the Codex.' });
    SW.game.emit('sfx', 'chime');
    return frag;
  };

  // ---- procedural encounters: faction × situation, flavored by region ----
  function factionWeights(state, sys) {
    const w = { severed: 1, vigil: 1, synod: 1, mariners: 1.5, loom: 0.5, drifter: 1 };
    if (sys.region === 'reach') { w.severed += 4; w.vigil *= 0.3; }
    if (sys.region === 'verge') { w.vigil += 3; }
    if (sys.region === 'oldstream') { w.synod += 2; w.drifter += 1.5; }
    if (sys.region === 'quiet') { w.drifter += 2; }
    if (sys.ideology === 'loom') w.loom += 4;
    if (sys.ideology === 'synod') w.synod += 2;
    if (sys.ideology === 'vigil') w.vigil += 2;
    // the bubble is awake: factions seek out (or shun) you for the stance you took
    if (state.scourgeStance === 'hold') { w.vigil += 2.5; w.severed *= 0.5; }
    if (state.scourgeStance === 'cure') { w.synod += 2.5; w.loom += 1.5; }
    if (state.scourgeStance === 'exodus') { w.severed += 2; w.mariners += 1.5; w.vigil *= 0.4; }
    return w;
  }

  // No rerun television: a faction×situation combo rests ~500 ticks before it
  // can recur, so every drop-in feels like its own scene.
  const ENC_COOLDOWN = 500;
  function comboCool(state, key) {
    const seen = state.story.encSeen || {};
    return seen[key] !== undefined && state.tick - seen[key] < ENC_COOLDOWN;
  }

  ST.buildEncounter = function (state, sys, ship) {
    state.story.encSeen = state.story.encSeen || {};
    const fw = factionWeights(state, sys);
    const sit = U.weightedPick(state, SW.lore.ENC_SITUATIONS, function (s) {
      const anyFresh = s.factions.some(function (f) { return !comboCool(state, s.id + ':' + f); });
      return anyFresh ? s.weight : s.weight * 0.05;
    });
    if (!sit) return null;
    const fac = U.weightedPick(state, sit.factions, function (f) {
      return (fw[f] || 0.5) * (comboCool(state, sit.id + ':' + f) ? 0.05 : 1);
    });
    if (!fac) return null;
    state.story.encSeen[sit.id + ':' + fac] = state.tick;
    const fdef = SW.lore.ENC_FACTIONS[fac];
    const text = (sit.text[fac] || Object.values(sit.text)[0])
      .replace(/\{F\}/g, fdef.name).replace(/\{SYS\}/g, sys.name).replace(/\{SHIP\}/g, ship ? ship.name : 'your ship');
    const id = 'enc_' + sit.id + '_' + fac + '_' + state.tick;
    const choices = sit.choices.map(function (ch) {
      return {
        label: ch.label,
        req: ch.needsPower ? function (s) {
          const sh = s.story.ctx ? s.ships.find(function (x) { return x.id === s.story.ctx.shipId; }) : null;
          return sh && SW.combat.power(s, sh) >= ch.needsPower;
        } : null,
        fx: function (s) { return encFx(s, ch.fx, fac); },
      };
    });
    const event = {
      id: id, title: sit.id.toUpperCase() + ' — ' + fdef.name.toUpperCase(),
      text: text, choices: choices, mood: fdef.tone === 'menace' ? 'bad' : null,
      speaker: { kind: 'proc', faction: fac, seed: id },
      dynamic: true,
    };
    dynamic[id] = event;
    return event;
  };

  function ctxShip(state) { return state.story.ctx ? state.ships.find(function (x) { return x.id === state.story.ctx.shipId; }) : null; }
  function rep(state, f, d) { if (f) state.rep[f] = U.clamp((state.rep[f] || 0) + d, -10, 10); }

  function encFx(state, kind, fac) {
    const ship = ctxShip(state);
    const repKey = SW.lore.ENC_FACTIONS[fac].rep;
    switch (kind) {
      case 'payToll': {
        const cut = Math.floor(state.credits * 0.08);
        state.credits -= cut; rep(state, repKey, 0.3);
        return '-' + U.fmt(cut) + '¤. Cheaper than a hull.';
      }
      case 'runToll': {
        if (ship && U.chance(state, 0.25)) {
          for (const c in ship.cargo) ship.cargo[c] = Math.floor(ship.cargo[c] / 2);
          return 'They clipped your hold on the way out. Half the cargo gone.';
        }
        state.research += 15;
        return 'Clean escape. The evasion telemetry is worth +15◇.';
      }
      case 'fightToll': {
        const p = ship ? SW.combat.power(state, ship) : 0;
        if (U.chance(state, p / (p + 5))) {
          state.credits += 250; rep(state, 'vigil', 0.5); rep(state, 'severed', -0.5);
          return 'Their cutter breaks off, venting. +250¤ bounty.';
        }
        if (ship) for (const c in ship.cargo) ship.cargo[c] = Math.floor(ship.cargo[c] / 2);
        return 'You lost the exchange — and half the cargo.';
      }
      case 'renderAid': {
        if (state.credits < 300) return 'You had nothing to give. The silence afterward is its own cargo.';
        state.credits -= 300; rep(state, repKey, 1); state.research += 40;
        return '-300¤ in fuel and parts. +40◇. Word travels between hulls.';
      }
      case 'takeSalvage': {
        if (ship) { ship.cargo.ALLOY = (ship.cargo.ALLOY || 0) + 10; ship.basis.ALLOY = 0; }
        rep(state, repKey, -1.5); state.infamy = (state.infamy || 0) + 0.3;
        return '+10 Alloy. The distress call keeps playing behind you.';
      }
      case 'ignore': return 'Logged. Filed. Forgotten, mostly.';
      case 'comply': rep(state, repKey, 0.5); return 'Clean manifest, clean conscience, twenty minutes lost.';
      case 'bribe': {
        if (state.credits < 200) return 'Your pockets embarrassed you. They waved you through anyway, slowly.';
        state.credits -= 200; return '-200¤. The stamp lands without the lidar.';
      }
      case 'takeRelic': {
        rep(state, 'loom', 0.5);
        const f = ST.grantFragment(state, 'loom');
        return f ? 'The shard hums in your hold. ' : 'It hums. You pretend not to hear it.';
      }
      case 'buyRelic': {
        if (state.credits < 300) return 'Not today. The hum follows you out anyway.';
        state.credits -= 300; rep(state, 'loom', 1);
        ST.grantFragment(state, 'loom');
        return '-300¤, honestly paid. The cultist blesses your manifest.';
      }
      case 'hireCrew': {
        if (state.credits < 400) return 'No budget for crew. They nod like they\'ve heard it before.';
        state.credits -= 400; state.story.flags.crew_hired = true; rep(state, repKey, 1);
        return '-400¤. Fleet-wide +3% speed. Good hands are good hands.';
      }
      case 'recordSignal': {
        state.research += 60;
        if (U.chance(state, 0.5)) ST.grantFragment(state, 'silence');
        return '+60◇ of patient transcription.';
      }
      case 'jamSignal': {
        rep(state, 'loom', -1); state.credits += 200;
        return 'The pulse stops. The transmitter scraps for +200¤. Somewhere, a thread goes slack.';
      }
    }
    return null;
  }

  // ---- arrival hook ----
  ST.onArrival = function (state, sysId, ship) {
    const st = state.story, sys = state.systems[sysId];
    if (st.pending) return;
    const ctx = { sysId: sysId, shipId: ship.id };

    if (sys.type === 'derelict' && !st.seen.ev_derelict) { fire(state, 'ev_derelict', ctx); return; }
    if (state.scourge && state.scourge.phase === 'active' && !st.flags.sample_collected) {
      const nearFront = sys.links.some(function (id) { return state.systems[id].scourge === 2; }) || sys.scourge === 1;
      if (nearFront && !st.seen.ev_sample) { fire(state, 'ev_sample', ctx); return; }
    }
    if (state.tick - st.lastDropIn < 60) return;
    if (!U.chance(state, D.TUNE.arrivalEventChance)) return;
    st.lastDropIn = state.tick;

    // half the drop-ins are assembled encounters, half are authored events
    if (U.chance(state, 0.5)) {
      const enc = ST.buildEncounter(state, sys, ship);
      if (enc) { fire(state, enc.id, ctx); return; }
    }
    const pool = SW.eventsData.EVENTS.filter(function (e) {
      if (!e.arrival) return false;
      const last = st.seen[e.id];
      if (last !== undefined && !e.repeat) return false;
      if (last !== undefined && e.repeat && state.tick - last < e.repeat) return false;
      try { return e.when ? e.when(state, sys, ship) : true; } catch (err) { return false; }
    });
    if (pool.length) {
      const choice = U.weightedPick(state, pool, function (e) { return e.weight || 1; });
      if (choice) fire(state, choice.id, ctx);
    }
  };

  return ST;
})();
