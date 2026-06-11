/* STARWEFT util.js — seeded RNG, names, math, formatting. DOM-free. */
var SW = globalThis.SW = globalThis.SW || {};

SW.util = (function () {
  const U = {};

  // ---- Seeded RNG (mulberry32) operating on state.rngState so it serializes ----
  U.seedFrom = function (str) {
    let h = 1779033703 ^ String(str).length;
    for (let i = 0; i < String(str).length; i++) {
      h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  };
  U.rnd = function (st) { // float [0,1)
    st.rngState = (st.rngState + 0x6D2B79F5) >>> 0;
    let t = st.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  U.ri = function (st, a, b) { return a + Math.floor(U.rnd(st) * (b - a + 1)); }; // int [a,b]
  U.rf = function (st, a, b) { return a + U.rnd(st) * (b - a); };
  U.chance = function (st, p) { return U.rnd(st) < p; };
  U.pick = function (st, arr) { return arr[Math.floor(U.rnd(st) * arr.length)]; };
  U.shuffle = function (st, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(U.rnd(st) * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  U.weightedPick = function (st, items, weightFn) {
    let total = 0;
    for (const it of items) total += weightFn(it);
    if (total <= 0) return null;
    let r = U.rnd(st) * total;
    for (const it of items) { r -= weightFn(it); if (r <= 0) return it; }
    return items[items.length - 1];
  };

  // ---- Math ----
  U.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.dist = function (a, b) { // 3D-aware (z optional)
    const dx = a.x - b.x, dy = a.y - b.y, dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };
  U.num = function (v, fallback) { return (typeof v === 'number' && isFinite(v)) ? v : (fallback || 0); };

  // Equatorial (RA hours, Dec deg, dist ly) -> galactic cartesian ly.
  // +x toward galactic center, +y along rotation, +z galactic north. J2000 matrix.
  U.eqToGal = function (raH, decD, dist) {
    const ra = raH * Math.PI / 12, dec = decD * Math.PI / 180;
    const vx = Math.cos(dec) * Math.cos(ra), vy = Math.cos(dec) * Math.sin(ra), vz = Math.sin(dec);
    return {
      x: dist * (-0.0548755604 * vx - 0.8734370902 * vy - 0.4838350155 * vz),
      y: dist * (0.4941094279 * vx - 0.4448296300 * vy + 0.7469822445 * vz),
      z: dist * (-0.8676661490 * vx - 0.1980763734 * vy + 0.4559837762 * vz),
    };
  };

  // ---- Formatting ----
  U.fmt = function (n) { // credits / big numbers
    n = Math.round(U.num(n));
    const neg = n < 0 ? '-' : ''; n = Math.abs(n);
    if (n >= 1e9) return neg + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return neg + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e4) return neg + (n / 1e3).toFixed(1) + 'k';
    return neg + String(n);
  };
  U.fmt1 = function (n) { n = U.num(n); return (Math.round(n * 10) / 10).toString(); };
  U.cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  // ---- Procedural names ----
  const SYS_A = ['Ka', 'Ve', 'Tau', 'Or', 'Ze', 'Mi', 'Al', 'Sa', 'Ny', 'Cor', 'Hal', 'Ery', 'Lu', 'Pra', 'Tho', 'Vel', 'Qua', 'Ish', 'Bel', 'Dra', 'Fen', 'Gly', 'Hex', 'Ila', 'Jun', 'Kel', 'Lyr', 'Mar', 'Nov', 'Oph', 'Per', 'Rho', 'Sol', 'Ter', 'Umb', 'Wis', 'Xan', 'Yse', 'Zou', 'Ash'];
  const SYS_B = ['ra', 'lin', 'dos', 'me', 'tha', 'ven', 'ki', 'ros', 'na', 'bel', 'dur', 'phi', 'gan', 'het', 'ille', 'mon', 'nex', 'ola', 'pis', 'qar', 'rin', 'sho', 'tis', 'une', 'vox', 'wen', 'xis', 'yll', 'zar', 'eth'];
  const SYS_C = ['', '', '', ' Prime', ' Reach', ' Drift', ' Verge', ' Anchorage', ' Halo', ' Spur', ' Deep', ' Cradle', ' Gate', ' Shoal'];
  U.sysName = function (st, taken) {
    for (let tries = 0; tries < 50; tries++) {
      const n = U.pick(st, SYS_A) + U.pick(st, SYS_B) + (U.chance(st, 0.3) ? U.pick(st, SYS_C) : '');
      if (!taken || !taken.has(n)) { if (taken) taken.add(n); return n; }
    }
    return 'System-' + U.ri(st, 100, 999);
  };

  const SHIP_NAMES = ['Stitch', 'Bobbin', 'Shuttle', 'Spindle', 'Thimble', 'Skein', 'Warp', 'Weft', 'Loom', 'Needle', 'Twine', 'Braid', 'Knot', 'Filament', 'Strand', 'Lace', 'Hem', 'Selvedge', 'Gossamer', 'Tassel', 'Plait', 'Cord', 'Fiber', 'Mote', 'Glimmer', 'Ember', 'Wisp', 'Dart', 'Swift', 'Petrel', 'Tern', 'Wren', 'Finch', 'Starling', 'Kite', 'Comet', 'Pebble', 'Acorn', 'Tucker', 'Parcel', 'Bundle', 'Satchel', 'Caddy', 'Crate', 'Briefcase', 'Lantern', 'Beacon', 'Pilgrim', 'Errand', 'Ferry'];
  U.shipName = function (st, idx) {
    const base = SHIP_NAMES[idx % SHIP_NAMES.length];
    const gen = Math.floor(idx / SHIP_NAMES.length);
    return gen > 0 ? base + ' ' + (gen + 1) : base;
  };

  // ---- Graph helpers ----
  // BFS shortest path over system links. passable(sys) filters nodes (dest/src always allowed).
  U.findPath = function (systems, fromId, toId, passable) {
    if (fromId === toId) return [fromId];
    const prev = {}; prev[fromId] = fromId;
    const q = [fromId];
    while (q.length) {
      const cur = q.shift();
      const sys = systems[cur];
      for (const nb of sys.links) {
        if (prev[nb] !== undefined) continue;
        if (nb !== toId && passable && !passable(systems[nb])) continue;
        prev[nb] = cur;
        if (nb === toId) {
          const path = [toId];
          let p = toId;
          while (p !== fromId) { p = prev[p]; path.push(p); }
          return path.reverse();
        }
        q.push(nb);
      }
    }
    return null;
  };

  U.id = (function () { let n = 0; return function (prefix) { return prefix + (++n); }; })();

  return U;
})();
