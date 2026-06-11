/* STARWEFT codex.js — ships as equations, knowledge as an infobox. Browser only.
   Every hull is a lathe: a seeded harmonic profile r(z) revolved into a
   wireframe and turned slowly under the reader's eye. The describe() table
   feeds the persistent infobox (hover anything, learn everything). */
var SW = globalThis.SW = globalThis.SW || {};

SW.codex = (function () {
  const U = SW.util, D = SW.data;
  const C = {};

  // ---------- hull lathe profiles ----------
  // r(z): radius along the hull (z 0=bow, 1=stern), xs(θ): cross-section modifier.
  const HULL_FORMS = {
    sparrow:    { len: 0.62, rmax: 0.16, prof: function (z) { return Math.sin(Math.PI * Math.pow(z, 0.7)) * (1 - 0.2 * z); }, rings: 9,  xs: function (th) { return 1; } },
    courier:    { len: 0.82, rmax: 0.13, prof: function (z) { return Math.sin(Math.PI * Math.pow(z, 0.55)) * (1 - 0.15 * z) + 0.12 * Math.sin(3 * Math.PI * z); }, rings: 12, xs: function (th) { return 1; } },
    freighter:  { len: 0.78, rmax: 0.22, prof: function (z) { return z < 0.12 ? z / 0.12 * 0.7 : (z > 0.9 ? (1 - z) / 0.1 * 0.8 : 0.95 + 0.08 * Math.sin(6 * Math.PI * z)); }, rings: 14, xs: function (th) { return 1 + 0.18 * Math.cos(4 * th); } },
    superhauler:{ len: 0.95, rmax: 0.26, prof: function (z) { return z < 0.08 ? z / 0.08 * 0.6 : (z > 0.92 ? (1 - z) / 0.08 * 0.85 : 0.9 + 0.12 * Math.sin(10 * Math.PI * z)); }, rings: 20, xs: function (th) { return 1 + 0.22 * Math.cos(6 * th); } },
    pathfinder: { len: 0.66, rmax: 0.10, prof: function (z) { return Math.sin(Math.PI * Math.pow(z, 0.8)) * 0.8; }, rings: 8, dish: 0.30, xs: function (th) { return 1; } },
    surveyor:   { len: 0.80, rmax: 0.13, prof: function (z) { return Math.sin(Math.PI * Math.pow(z, 0.75)) * (0.9 + 0.15 * Math.sin(4 * Math.PI * z)); }, rings: 12, dish: 0.36, booms: true, xs: function (th) { return 1; } },
    corvette:   { len: 0.78, rmax: 0.14, prof: function (z) { return Math.sin(Math.PI * Math.pow(z, 0.5)) * (1 - 0.3 * z); }, rings: 11, fins: true, xs: function (th) { return 1 + 0.25 * Math.abs(Math.cos(2 * th)); } },
    lancer:     { len: 0.92, rmax: 0.17, prof: function (z) { return z < 0.1 ? z / 0.1 * 0.55 : 0.55 + 0.4 * Math.sin(Math.PI * z); }, rings: 14, fins: true, fighters: 3, xs: function (th) { return 1 + 0.45 * Math.abs(Math.cos(th)); } },
  };

  C.drawShip = function (canvas, hullId, now) {
    const ctx = canvas.getContext('2d');
    const Wc = canvas.width, Hc = canvas.height;
    ctx.clearRect(0, 0, Wc, Hc);
    const form = HULL_FORMS[hullId] || HULL_FORMS.sparrow;
    const cx = Wc / 2, cy = Hc / 2;
    const L = Wc * form.len, R0 = Hc * form.rmax * 2.2;
    const rot = now / 4200;
    const wobble = Math.sin(now / 5200) * 0.18;
    const cosW = Math.cos(wobble), sinW = Math.sin(wobble);
    const K = 14; // points per ring

    function pt(z, th) { // hull point -> screen
      const r = Math.max(0, form.prof(z)) * R0 * form.xs(th + rot);
      const x3 = (z - 0.5) * L;
      const y3 = Math.cos(th + rot) * r;
      const z3 = Math.sin(th + rot) * r;
      // slight pitch wobble around x-axis, then orthographic-ish with mild depth
      const y4 = y3 * cosW - z3 * sinW;
      const z4 = y3 * sinW + z3 * cosW;
      const persp = 1 + z4 / (Hc * 2.4);
      return { x: cx + x3 * persp, y: cy + y4 * persp, depth: z4 };
    }

    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    // rings
    for (let i = 0; i <= form.rings; i++) {
      const z = i / form.rings;
      ctx.beginPath();
      for (let k = 0; k <= K; k++) {
        const p = pt(z, (k / K) * Math.PI * 2);
        if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(226,232,240,' + (0.18 + 0.25 * Math.abs(Math.sin(Math.PI * z))) + ')';
      ctx.stroke();
    }
    // longerons
    for (let k = 0; k < K; k += 2) {
      const th = (k / K) * Math.PI * 2;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= form.rings * 2; i++) {
        const p = pt(i / (form.rings * 2), th);
        if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(226,232,240,0.30)';
      ctx.stroke();
    }
    // survey dish
    if (form.dish) {
      const bow = pt(0, 0);
      ctx.strokeStyle = 'rgba(226,232,240,0.6)';
      ctx.beginPath();
      ctx.ellipse(bow.x - Wc * 0.04, cy, Hc * form.dish * 0.5, Hc * form.dish * (0.5 + 0.3 * Math.sin(rot * 2)), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // fins
    if (form.fins) {
      const tail = pt(0.85, 0);
      [-1, 1].forEach(function (s) {
        ctx.beginPath();
        ctx.moveTo(tail.x, cy);
        ctx.lineTo(tail.x + Wc * 0.10, cy + s * Hc * 0.27 * cosW);
        ctx.lineTo(tail.x + Wc * 0.16, cy + s * Hc * 0.08);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(226,232,240,0.5)';
        ctx.stroke();
      });
    }
    // fighter escorts orbiting the carrier
    if (form.fighters) {
      for (let i = 0; i < form.fighters; i++) {
        const a = now / 1400 + (i / form.fighters) * Math.PI * 2;
        const fx = cx + Math.cos(a) * Wc * 0.36;
        const fy = cy + Math.sin(a * 1.4) * Hc * 0.3;
        ctx.fillStyle = 'rgba(226,232,240,0.85)';
        ctx.beginPath();
        ctx.moveTo(fx + 5, fy); ctx.lineTo(fx - 3, fy + 2.6); ctx.lineTo(fx - 3, fy - 2.6);
        ctx.closePath(); ctx.fill();
      }
    }
    // engine pulse
    const stern = pt(1, 0);
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(now / 600));
    const g = ctx.createRadialGradient(stern.x, cy, 0, stern.x, cy, Hc * 0.12 * pulse + 2);
    g.addColorStop(0, 'rgba(226,232,240,' + 0.5 * pulse + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(stern.x, cy, Hc * 0.12 * pulse + 2, 0, Math.PI * 2); ctx.fill();
  };

  // ---------- infobox knowledge ----------
  // topic: {kind:'system'|'body'|'hull'|'ship'|'commodity'|'tech'|'building'|'region'|'fragment'|'blockade'|'contract'|'rival', ...}
  C.describe = function (state, topic) {
    if (!state || !topic) return null;
    const lines = [];
    switch (topic.kind) {
      case 'system': {
        const sys = state.systems[topic.id];
        if (!sys) return null;
        if (!sys.discovered) return { title: 'UNCHARTED', sub: 'A silhouette on old light.', lines: ['Send a probe to chart it. Scouts can survey it after.'] };
        const cls = D.specClass(sys.spec);
        const sp = D.SPECTRAL[cls] || D.SPECTRAL.M;
        const data = SW.planets.get(state, sys.id);
        const sub = sys.spec + ' · ' + sp.label + (sys.cat !== sys.name ? ' · cat. ' + sys.cat : '');
        lines.push(D.SYS_TYPES[sys.type].icon + ' ' + D.SYS_TYPES[sys.type].name + (sys.ideology && sys.ideology !== 'free' ? ' · ' + D.IDEOLOGIES[sys.ideology].name : ''));
        lines.push(U.fmt1(U.dist(sys, state.systems[state.homeId])) + ' ly from Sol · ' + sys.links.length + ' weftlines' + (sys.region ? ' · ' + D.REGIONS[sys.region].name : ''));
        if (sys.pop > 0) lines.push('Pop ' + U.fmt1(sys.pop) + 'M · prosperity ' + Math.round(sys.prosperity) + '%');
        const prods = Object.keys(sys.prod).filter(function (c) { return sys.prod[c] > 0.01; })
          .map(function (c) { return D.COMMODITIES[c].icon + ' ' + D.COMMODITIES[c].name + ' ' + sys.prod[c].toFixed(1) + '/t'; });
        if (prods.length) lines.push('Produces ' + prods.join(' · '));
        const consL = Object.keys(sys.cons).filter(function (c) { return sys.cons[c] > 0.001; })
          .map(function (c) { return D.COMMODITIES[c].icon + ' ' + D.COMMODITIES[c].name; });
        if (consL.length) lines.push('Consumes ' + consL.join(' · '));
        if (sys.slots.length) lines.push('Factories: ' + sys.slots.map(function (o) { return o === 'ANY' ? 'Fabricator' : D.COMMODITIES[o].name; }).join(', '));
        lines.push(sys.surveyed ? (data.bodies.length + ' bodies · HZ ' + data.hz[0].toFixed(2) + '–' + data.hz[1].toFixed(2) + ' AU') : 'Unsurveyed — a scout idling here will chart its worlds.');
        if (sys.surveyed) lines.push(sys.charted ? '◈ Officially charted — your data is on the maps.' : '◌ Charts unsold — survey data has not reached a cartographer.');
        if (sys.scourge === 1) lines.push('⚠ SCOURGE INCOMING — ' + Math.max(0, sys.threatAt - state.tick) + ' ticks.');
        if (sys.scourge === 2) lines.push('† Corrupted. The market is ash.');
        if (sys.note) lines.push('"' + sys.note + '"');
        return { title: sys.name, sub: sub, lines: lines };
      }
      case 'body': {
        const b = topic.body;
        const t = SW.planets.TYPES[b.type] || {};
        lines.push(t.name + (b.pop ? ' · POPULATED' : b.settled ? ' · settled' : ''));
        lines.push('a = ' + b.a + ' AU · P = ' + (b.period < 1 ? Math.round(b.period * 365) + ' days' : b.period + ' yr') + ' · T_eq ≈ ' + b.teq + ' K');
        lines.push(t.desc || '');
        if (b.blurb) lines.push('"' + b.blurb + '"');
        return { title: b.name, sub: 'Astronomical record', lines: lines };
      }
      case 'hull': {
        const h = D.HULLS[topic.id];
        if (!h) return null;
        lines.push('Capacity ' + h.cap + ' · speed ' + h.speed + ' ly/tick · upkeep ' + h.upkeep + '¤/jump');
        if (h.power) lines.push('Combat power ' + h.power + (topic.id === 'corvette' ? ' — assign to a route to escort it.' : ''));
        if (h.survey) lines.push('Survey rate ' + h.survey + ' — charts systems while idle.');
        lines.push(h.desc);
        lines.push('Hull lathed from a seeded harmonic profile r(z) — view it in the Codex.');
        return { title: h.name.toUpperCase(), sub: h.line + ' line', lines: lines };
      }
      case 'ship': {
        const sh = state.ships.find(function (x) { return x.id === topic.id; });
        if (!sh) return null;
        const h = D.HULLS[sh.hull];
        lines.push(h.name + ' · hold ' + SW.ships.cargoTotal(sh) + '/' + SW.ships.cap(state, sh) + (h.power ? ' · power ' + SW.combat.power(state, sh) : ''));
        if (sh.mode === 'travel') lines.push('In transit → ' + state.systems[sh.leg.to].name + ' · ETA ' + Math.max(0, sh.leg.arrive - state.tick) + ' ticks');
        else lines.push('Docked: ' + state.systems[sh.at].name);
        return { title: sh.name, sub: 'Fleet registry', lines: lines };
      }
      case 'commodity': {
        const c = D.COMMODITIES[topic.id];
        if (!c) return null;
        lines.push('Base value ' + c.base + '¤ · tier ' + c.tier);
        const rec = D.RECIPES.find(function (r) { return r.out === topic.id; });
        if (rec) lines.push('Refined from: ' + Object.keys(rec.inputs).map(function (k) { return rec.inputs[k] + ' ' + D.COMMODITIES[k].name; }).join(' + '));
        lines.push('Prices float on local scarcity — buy gluts, feed shortages.');
        return { title: c.icon + ' ' + c.name.toUpperCase(), sub: 'Commodity', lines: lines };
      }
      case 'tech': {
        const t = D.TECHS[topic.id];
        if (!t) return null;
        lines.push(t.desc);
        lines.push('Branch: ' + t.branch + ' · cost ' + SW.tech.costOf(state, topic.id) + '◇');
        if (t.req.length) lines.push('Requires: ' + t.req.map(function (r) { return D.TECHS[r].name; }).join(', '));
        if (t.group === 'doctrine') lines.push('DOCTRINE — exclusive. One per run. Choose what you stop imagining otherwise.');
        return { title: t.name.toUpperCase(), sub: 'Research', lines: lines };
      }
      case 'building': {
        const b = D.BUILDINGS[topic.id];
        if (!b) return null;
        lines.push(b.desc);
        lines.push('Cost ' + U.fmt(b.cost) + '¤ + ' + Object.keys(b.mats).map(function (k) { return b.mats[k] + ' ' + D.COMMODITIES[k].name; }).join(' + ') + ' delivered on-site.');
        return { title: b.icon + ' ' + b.name.toUpperCase(), sub: 'Construction', lines: lines };
      }
      case 'region': {
        const r = D.REGIONS[topic.id];
        if (!r) return null;
        return { title: r.name.toUpperCase(), sub: 'Region', lines: [r.fx] };
      }
      case 'rival': {
        const rv = state.rivals.find(function (x) { return x.id === topic.id; });
        if (!rv) return null;
        lines.push(rv.blurb);
        lines.push(rv.alive ? ('Active in ' + SW.rivals.zone(state, rv).length + ' systems.') : 'Gone.');
        lines.push('Dominant traders (★) get ' + Math.round(D.TUNE.presenceEdge * 100) + '% better prices. Out-trade them.');
        return { title: rv.name.toUpperCase(), sub: 'Rival network', lines: lines };
      }
      case 'fragment': {
        const f = SW.lore.fragById[topic.id];
        if (!f) return null;
        const ep = SW.lore.EPOCHS.find(function (e) { return e.id === f.epoch; });
        return { title: '◈ ' + f.title, sub: ep ? ep.name + ' · ' + ep.when : 'Chronicle', lines: [f.text] };
      }
      case 'faction': {
        const i = D.IDEOLOGIES[topic.id];
        if (!i) return null;
        const rep = state.rep && state.rep[topic.id] !== undefined ? state.rep[topic.id] : null;
        lines.push(i.desc);
        if (rep !== null) lines.push('Your standing: ' + (rep > 2 ? 'trusted' : rep < -2 ? 'distrusted' : 'neutral') + ' (' + rep.toFixed(1) + ')');
        return { title: i.name.toUpperCase(), sub: 'Faction', lines: lines };
      }
    }
    return null;
  };

  return C;
})();
