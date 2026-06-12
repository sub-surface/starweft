/* STARWEFT planets.js — deterministic planetary systems. DOM-free.
   Astronomical convention: planets are "<Star> b, c, d…" outward by discovery
   (here: by orbit). Stars in multiples are A/B/C. Sol is the real Solar System.
   Bodies are derived (never saved): same seed -> same worlds, forever. */
var SW = globalThis.SW = globalThis.SW || {};

SW.planets = (function () {
  const U = SW.util, D = SW.data;
  const P = {};
  const cache = {};

  // local deterministic rng (independent of game rng stream)
  function rng(seedStr) {
    let s = U.seedFrom(seedStr);
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  P.TYPES = {
    lava:    { name: 'Lava world',     glyph: '◍', desc: 'Molten silicate skies.' },
    rock:    { name: 'Rocky world',    glyph: '●', desc: 'Airless or thin-aired stone.' },
    desert:  { name: 'Desert world',   glyph: '◐', desc: 'Dry, wind-scoured, mineable.' },
    terran:  { name: 'Garden world',   glyph: '⊕', desc: 'Liquid water, breathable margins. Rare beyond price.' },
    ocean:   { name: 'Ocean world',    glyph: '◯', desc: 'Global sea under haze.' },
    ice:     { name: 'Ice world',      glyph: '◌', desc: 'Frozen volatiles, kilometers deep.' },
    gas:     { name: 'Gas giant',      glyph: '⬤', desc: 'Hydrogen seas without floors.' },
    icegiant:{ name: 'Ice giant',      glyph: '◎', desc: 'Methane-blue and cold.' },
    belt:    { name: 'Asteroid belt',  glyph: '⋯', desc: 'A planet that never got its act together.' },
    carbon:  { name: 'Carbon world',   glyph: '◆', desc: 'Graphite continents, diamond mantle.' },
  };

  // ---- the real Solar System (home) ----
  const SOL_BODIES = [
    { name: 'Mercury', type: 'rock',    a: 0.39, r: 0.38, ring: false },
    { name: 'Venus',   type: 'rock',    a: 0.72, r: 0.95, ring: false },
    { name: 'Earth',   type: 'terran',  a: 1.00, r: 1.00, ring: false, pop: true, station: 'Earth Anchorage' },
    { name: 'Mars',    type: 'desert',  a: 1.52, r: 0.53, ring: false, settled: true },
    { name: 'The Belt',type: 'belt',    a: 2.70, r: 0, ring: false },
    { name: 'Jupiter', type: 'gas',     a: 5.20, r: 11.2, ring: false },
    { name: 'Saturn',  type: 'gas',     a: 9.54, r: 9.4, ring: true },
    { name: 'Uranus',  type: 'icegiant',a: 19.2, r: 4.0, ring: 'faint' },
    { name: 'Neptune', type: 'icegiant',a: 30.1, r: 3.9, ring: false },
  ];

  // ---- detail rng: keyed separately so main body rng stream is unaffected ----
  function detailRng(seedStr, sysId, bodyName) {
    let s = U.seedFrom(seedStr + '|detail|' + sysId + '|' + bodyName);
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Build a short classification label from body fields (under ~45 chars)
  function makeClassLabel(type, teq, radius) {
    var g = radius > 0 ? radius.toFixed(1) + 'g' : null; // rough surface gravity for rocky
    var re = radius > 0 ? radius.toFixed(1) + ' Re' : null;
    var tempStr = Math.round(teq) + 'K';
    switch (type) {
      case 'lava':
        if (teq > 1800) return 'cthonian lava world ' + tempStr;
        return 'lava world ' + tempStr + (g ? ' ' + g : '');
      case 'rock':
        if (radius < 0.5) return 'sub-Earth rocky body ' + (g ? g : '');
        return 'rocky world ' + tempStr + (g ? ' ' + g : '');
      case 'desert':
        return 'arid desert world ' + tempStr + (g ? ' ' + g : '');
      case 'terran':
        if (teq >= 270 && teq <= 310)
          return 'temperate garden world ' + (g ? g + ' ' : '') + 'N2-O2';
        return 'garden world ' + tempStr + (g ? ' ' + g : '');
      case 'ocean':
        return 'global ocean world ' + tempStr + (g ? ' ' + g : '');
      case 'ice':
        return 'frozen volatile world ' + tempStr;
      case 'gas':
        return 'gas giant ' + (re ? re : '');
      case 'icegiant':
        return 'cold Neptunian ' + (re ? re : '');
      case 'carbon':
        return 'carbon world ' + tempStr + (g ? ' ' + g : '');
      case 'belt':
        return 'main-belt rubble field';
      default:
        return type + ' ' + tempStr;
    }
  }

  // Add detail fields to a body using a separate deterministic rng stream
  function addBodyDetail(body, seedStr, sysId) {
    var dr = detailRng(seedStr, sysId, body.name);
    var type = body.type;
    // Rings are a body property, not a type icon. Giants get them often;
    // rocky/icy worlds can rarely keep faint debris rings after impacts.
    if (body.ring !== undefined) {
      dr(); // keep detail streams aligned for canonical bodies
    } else if (type === 'gas') {
      body.ring = dr() < 0.35;
    } else if (type === 'icegiant') {
      var rv = dr();
      body.ring = rv < 0.20 ? 'faint' : false;
    } else if (type === 'belt') {
      dr();
      body.ring = false;
    } else {
      body.ring = dr() < 0.12 ? 'faint' : false;
    }
    // visual character fields
    if (type === 'gas' || type === 'icegiant') {
      body.bands = 2 + Math.floor(dr() * 3);   // 2-4 bands
      body.hueShift = (dr() - 0.5) * 30;        // +/-15 hue offset
    } else if (type === 'rock' || type === 'desert' || type === 'lava') {
      body.craters = dr() < 0.65;
      body.scarred  = dr() < 0.35;
    } else if (type === 'terran' || type === 'ocean' || type === 'ice') {
      body.iceCaps = dr() < 0.70;
      body.cloudy  = dr() < 0.55;
    } else {
      dr(); dr(); // keep stream length consistent
    }
    // classLabel
    body.classLabel = makeClassLabel(type, body.teq, body.radius || 0);
  }

  // ---- public: get bodies for a system (cached, deterministic) ----
  P.get = function (state, sysId) {
    const key = state.seed + ':' + sysId;
    if (cache[key]) return cache[key];
    const sys = state.systems[sysId];
    const out = generate(state, sys);
    cache[key] = out;
    return out;
  };
  P.clearCache = function () { for (const k in cache) delete cache[k]; };

  // Named body lookup (hops, berth pricing). Null when no such body.
  P.body = function (state, sysId, name) {
    if (!name) return null;
    return P.get(state, sysId).bodies.find(function (b) { return b.name === name; }) || null;
  };

  // The system hub: where ships berth by default. Station first, then any
  // peopled world, then nothing (deep-space anchorages have no docks to price).
  P.hub = function (state, sysId) {
    const bodies = P.get(state, sysId).bodies;
    return bodies.find(function (b) { return b.station; }) ||
           bodies.find(function (b) { return b.pop || b.settled; }) || null;
  };

  function generate(state, sys) {
    const r = rng(state.seed + '|bodies|' + sys.id); // name-independent: renames must not reroll worlds
    const cls = D.specClass(sys.spec);
    const sp = D.SPECTRAL[cls] || D.SPECTRAL.M;
    const stars = [{ suffix: sys.companions && sys.companions.length ? 'A' : '', spec: sys.spec, cls: cls }];
    (sys.companions || []).forEach(function (cspec, i) {
      stars.push({ suffix: String.fromCharCode(66 + i), spec: cspec, cls: D.specClass(cspec) });
    });
    const lum = sp.lum, mass = sp.mass;
    const hzIn = Math.sqrt(lum / 1.1), hzOut = Math.sqrt(lum / 0.53); // conservative HZ, AU
    const frost = 4.85 * Math.sqrt(lum);                              // frost line, AU

    // special architectures
    if (sys.wonder === 'blackhole') {
      return {
        stars: [{ suffix: '', spec: 'X (BH)', cls: 'X' }], bodies: [], hz: [0, 0], frost: 0,
        note: 'A stellar-mass black hole, ~9 M☉, silent and unaccreting. A Loomkeeper lane terminates here on purpose.',
      };
    }
    if (sys.wonder === 'husk') {
      const swarm = makeBody('The Heddle Swarm', 'belt', 0.8, mass, lum, { wonder: true });
      swarm.blurb = 'A partial Dyson swarm — millions of panels in a heddle pattern. Unfinished, or finished and incomprehensible.';
      addBodyDetail(swarm, state.seed, sys.id);
      return {
        stars: stars, bodies: [swarm], hz: [hzIn, hzOut], frost: frost,
        note: 'The Loomkeeper Lattice. The only large Precursor structure known to survive.',
      };
    }
    if (sys.id === state.homeId) {
      const bodies = SOL_BODIES.map(function (b, i) {
        var body = makeBody(b.name, b.type, b.a, mass, lum, { real: true, pop: b.pop, settled: b.settled, station: b.station, radius: b.r, ring: b.ring });
        addBodyDetail(body, state.seed, sys.id);
        return body;
      });
      return { stars: [{ suffix: '', spec: 'G2V', cls: 'G' }], bodies: bodies, hz: [hzIn, hzOut], frost: frost, note: 'Home. The original orchard.' };
    }

    // procedural architecture
    let count;
    if (cls === 'D') count = r() < 0.3 ? 1 : 0;            // white dwarfs keep little
    else if (cls === 'III') count = Math.floor(r() * 3);    // giants ate the inner worlds
    else count = 1 + Math.floor(r() * r() * 9);             // 1–9, skewed low
    if (sys.knownPlanets) count = Math.max(count, sys.knownPlanets);
    count = Math.min(count, 9);

    let a = (0.05 + r() * 0.3) * Math.max(0.4, Math.sqrt(mass));
    if (cls === 'III') a = Math.max(a, 1.5);                // survivors orbit wide
    const bodies = [];
    for (let i = 0; i < count; i++) {
      const teq = 278 * Math.pow(lum, 0.25) / Math.sqrt(a); // equilibrium temp, K
      let type;
      const sizeRoll = r();
      if (a > frost && sizeRoll > 0.45) type = (teq < 60 && r() < 0.5) ? 'icegiant' : 'gas';
      else if (a > frost) type = 'ice';
      else if (teq > 800) type = 'lava';
      else if (teq > 380) type = (r() < 0.12) ? 'carbon' : 'rock';
      else if (teq >= 240 && teq <= 330 && sizeRoll < 0.45) type = (r() < 0.30) ? 'terran' : (r() < 0.5 ? 'ocean' : 'desert');
      else if (teq > 150) type = (r() < 0.5) ? 'desert' : 'rock';
      else type = 'ice';
      if (r() < 0.08 && i > 0 && type !== 'gas') type = 'belt';
      // M-dwarf tidal-locking & flares make gardens rarer (hard-spec)
      if (type === 'terran' && cls === 'M' && r() < 0.6) type = 'ocean';

      const letter = String.fromCharCode(98 + i); // b, c, d, ...
      var procBody = makeBody((sys.cat || sys.name) + ' ' + letter, type, a, mass, lum, {});
      addBodyDetail(procBody, state.seed, sys.id);
      bodies.push(procBody);
      a *= 1.4 + r() * 0.7; // Titius–Bode-ish geometric spacing
      if (a > 60) break;
    }
    return { stars: stars, bodies: bodies, hz: [hzIn, hzOut], frost: frost, note: sys.note || '' };
  }

  function kepler(aAU, massSol) { return Math.sqrt(Math.pow(aAU, 3) / Math.max(0.05, massSol)); } // years

  function makeBody(name, type, a, mass, lum, extra) {
    const teq = 278 * Math.pow(Math.max(lum, 0.0005), 0.25) / Math.sqrt(Math.max(a, 0.01));
    return Object.assign({
      name: name, type: type, a: Math.round(a * 100) / 100,
      period: Math.round(kepler(a, mass) * 100) / 100,
      teq: Math.round(teq),
      radius: extra.radius || (type === 'gas' ? 10 : type === 'icegiant' ? 4 : 1),
    }, extra);
  }

  // ---- economy profile: what does this system plausibly produce? ----
  P.profile = function (state, sysId) {
    const sys = state.systems[sysId];
    const data = P.get(state, sysId);
    const cls = D.specClass(sys.spec);
    const pr = { ore: 0, gas: 0, bio: 0, crystal: 0, hab: 0 };
    for (const b of data.bodies) {
      if (b.type === 'belt') pr.ore += 1.2;
      if (b.type === 'rock') pr.ore += 0.4;
      if (b.type === 'desert') pr.ore += 0.5;
      if (b.type === 'lava') { pr.ore += 0.3; pr.crystal += 0.3; }
      if (b.type === 'carbon') pr.crystal += 1.2;
      if (b.type === 'gas') pr.gas += 1.0;
      if (b.type === 'icegiant') pr.gas += 0.6;
      if (b.type === 'ice') pr.gas += 0.2;
      if (b.type === 'terran') { pr.bio += 1.2; pr.hab += 2; }
      if (b.type === 'ocean') { pr.bio += 0.8; pr.hab += 1; }
    }
    if (cls === 'D') pr.crystal += 1.5;       // crystallized remnant cores
    if (cls === 'M' && sys.region === 'flarezone') pr.ore += 0.4; // irradiated regolith
    return pr;
  };

  return P;
})();
