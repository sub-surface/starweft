/* STARWEFT portraits.js — procedural 2D characters. Browser only.
   Every face is parametric line-art drawn live: seeded geometry, animated
   blinks and breath. WEFT-7 and player sigils are lissajous knots — characters
   made of equations, as is right and proper for this galaxy. */
var SW = globalThis.SW = globalThis.SW || {};

SW.portraits = (function () {
  const P = {};

  function srng(seedStr) {
    let s = SW.util.seedFrom(String(seedStr));
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- cast presets (param overrides on the generic face) ----
  const CAST = {
    guildmaster: { age: 1, beard: 0.9, hairN: 3, hairLen: 0.3, eyesClosed: true, brow: -0.2, mouth: -0.1, recording: true, label: 'Guildmaster Ode (recording)' },
    archivist:   { mask: 'owl', label: 'The Archivist' },
    helix:       { hairN: 6, hairLen: 0.5, hairSlick: true, brow: 0.35, mouth: -0.15, collar: 'sharp', jaw: 0.85, label: 'Helix Combine envoy' },
    mariner:     { cap: true, beard: 0.4, brow: 0.05, mouth: 0.1, jaw: 1.1, label: 'Mariner Syndicate captain' },
    hermit:      { hairN: 9, hairLen: 0.9, beard: 1.0, brow: -0.1, mouth: 0.15, label: 'The Cartographer' },
    pirate:      { eyepatch: true, hairN: 5, hairLen: 0.7, brow: 0.4, mouth: -0.2, scar: true, label: 'Severed corsair' },
    engineer:    { goggles: true, hairN: 4, hairLen: 0.35, mouth: 0.2, label: 'Dock engineer' },
    scientist:   { glasses: true, hairN: 5, hairLen: 0.4, brow: -0.15, mouth: 0.05, label: 'Enclave researcher' },
    vigil:       { visor: true, collar: 'armor', mouth: -0.05, jaw: 1.05, label: 'Vigil officer' },
    loomkeeper:  { hood: true, thirdEye: true, eyesClosed: false, mouth: 0, label: 'Loomkeeper cultist' },
    dockworker:  { bandana: true, mouth: 0.25, jaw: 1.1, label: 'Dockworker' },
    banker:      { hairN: 6, hairLen: 0.25, hairSlick: true, collar: 'sharp', brow: 0.2, mouth: -0.1, label: 'Combine banker' },
    mayor:       { chain: true, hairN: 4, hairLen: 0.3, mouth: 0.3, age: 0.5, label: 'System governor' },
    refugee:     { shawl: true, brow: -0.25, mouth: -0.1, label: 'Refugee' },
    drifter:     { hood: true, beard: 0.3, brow: -0.15, mouth: 0, label: 'Stateless drifter' },
    cat:         { cat: true, label: 'Stowaway' },
    weft7:       { sigil: true, label: 'WEFT-7 (you)' },
  };
  P.CAST = CAST;

  const FACTION_STYLE = {
    severed:  { eyepatch: 0.4, scar: 0.6, bandana: 0.4, brow: 0.35, mouth: -0.15 },
    vigil:    { visor: 0.7, collar: 'armor', brow: 0.2, mouth: -0.05 },
    synod:    { hood: 0.6, chain: 0.3, brow: -0.2, mouth: 0.05 },
    mariners: { cap: 0.7, beard: 0.5, mouth: 0.15 },
    loom:     { hood: 0.8, thirdEye: 0.7, mouth: 0 },
    drifter:  { hood: 0.5, beard: 0.4, brow: -0.2, mouth: -0.05 },
  };

  // ---- public draw ----
  // spec: {kind:'cast', id} | {kind:'proc', faction, seed} | {kind:'sigil', seed}
  P.draw = function (canvas, spec, now) {
    const ctx = canvas.getContext('2d');
    const S = canvas.width;
    ctx.clearRect(0, 0, S, S);
    if (!spec) return;
    now = now || 0;
    if (spec.kind === 'sigil' || (spec.kind === 'cast' && spec.id === 'weft7')) {
      drawSigil(ctx, S, spec.seed !== undefined ? spec.seed : 7, now, spec.hue);
      return;
    }
    let params;
    if (spec.kind === 'cast') {
      params = Object.assign({}, CAST[spec.id] || {});
      params._seed = 'cast:' + spec.id;
    } else {
      params = procParams(spec.faction, spec.seed);
    }
    if (params.cat) { drawCat(ctx, S, now, params._seed); return; }
    if (params.mask === 'owl') { drawOwl(ctx, S, now); return; }
    drawFace(ctx, S, params, now);
  };

  P.labelFor = function (spec) {
    if (!spec) return '';
    if (spec.kind === 'cast') return (CAST[spec.id] || {}).label || spec.id;
    if (spec.kind === 'proc') return (SW.lore.ENC_FACTIONS[spec.faction] || { name: 'Stranger' }).name;
    return '';
  };

  function procParams(faction, seed) {
    const r = srng('proc:' + faction + ':' + seed);
    const style = FACTION_STYLE[faction] || {};
    const p = {
      _seed: 'proc:' + faction + ':' + seed,
      jaw: 0.85 + r() * 0.35,
      eyeY: 0.40 + r() * 0.06,
      eyeGap: 0.16 + r() * 0.06,
      eyeSize: 0.7 + r() * 0.6,
      brow: (style.brow !== undefined ? style.brow : 0) + (r() - 0.5) * 0.3,
      mouth: (style.mouth !== undefined ? style.mouth : 0) + (r() - 0.5) * 0.3,
      hairN: 3 + Math.floor(r() * 6),
      hairLen: 0.2 + r() * 0.6,
      beard: r() < 0.4 ? r() : 0,
      age: r() < 0.3 ? r() : 0,
    };
    for (const k of ['eyepatch', 'scar', 'bandana', 'visor', 'hood', 'thirdEye', 'cap', 'chain']) {
      if (typeof style[k] === 'number' && r() < style[k]) p[k] = true;
    }
    if (style.collar) p.collar = style.collar;
    if (p.visor || p.hood) { p.hairN = 0; }
    return p;
  }

  // ---- the face machine ----
  function ink(ctx, a) { ctx.strokeStyle = 'rgba(226,232,240,' + (a === undefined ? 0.92 : a) + ')'; }

  function drawFace(ctx, S, p, now) {
    const r = srng(p._seed || 'x');
    const cx = S / 2, breathe = Math.sin(now / 1700 + (r() * 10)) * S * 0.006;
    const cy = S * 0.46 + breathe;
    const w = S * 0.30, h = S * 0.36;
    const jaw = p.jaw !== undefined ? p.jaw : 1;
    ctx.lineWidth = Math.max(1.2, S / 64);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ink(ctx);

    // head outline: two bezier halves with jaw taper
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.bezierCurveTo(cx + w, cy - h, cx + w, cy - h * 0.1, cx + w * 0.82 * jaw, cy + h * 0.55);
    ctx.bezierCurveTo(cx + w * 0.5 * jaw, cy + h, cx - w * 0.5 * jaw, cy + h, cx - w * 0.82 * jaw, cy + h * 0.55);
    ctx.bezierCurveTo(cx - w, cy - h * 0.1, cx - w, cy - h, cx, cy - h);
    ctx.stroke();

    // shoulders / collar
    ctx.beginPath();
    if (p.collar === 'sharp') {
      ctx.moveTo(cx - S * 0.34, S * 0.98); ctx.lineTo(cx - S * 0.12, S * 0.80); ctx.lineTo(cx, S * 0.88); ctx.lineTo(cx + S * 0.12, S * 0.80); ctx.lineTo(cx + S * 0.34, S * 0.98);
    } else if (p.collar === 'armor') {
      ctx.moveTo(cx - S * 0.36, S * 0.99); ctx.lineTo(cx - S * 0.30, S * 0.78); ctx.lineTo(cx + S * 0.30, S * 0.78); ctx.lineTo(cx + S * 0.36, S * 0.99);
    } else {
      ctx.moveTo(cx - S * 0.30, S * 0.99); ctx.quadraticCurveTo(cx, S * 0.78, cx + S * 0.30, S * 0.99);
    }
    ctx.stroke();

    const eyeY = cy - h * (0.5 - (p.eyeY !== undefined ? p.eyeY : 0.42));
    const gap = w * (p.eyeGap !== undefined ? p.eyeGap / 0.2 : 1) * 0.55;
    const esz = w * 0.13 * (p.eyeSize || 1);
    const blinkPhase = ((now / 1000 + r() * 7) % 4.2);
    const blink = p.eyesClosed ? 0.08 : (blinkPhase > 4.0 ? 0.1 : 1);

    if (p.visor) {
      ctx.beginPath();
      ctx.rect(cx - w * 0.75, eyeY - esz * 1.4, w * 1.5, esz * 2.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.45, eyeY); ctx.lineTo(cx + w * 0.45, eyeY);
      ink(ctx, 0.5); ctx.stroke(); ink(ctx);
    } else {
      // eyes (blinking)
      [-1, 1].forEach(function (side) {
        if (p.eyepatch && side === -1) {
          ctx.beginPath();
          ctx.moveTo(cx - w, eyeY - esz * 1.8); ctx.lineTo(cx + w * 0.9, eyeY - esz * 3.2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(226,232,240,0.9)';
          ctx.fillRect(cx + side * gap - esz * 1.1, eyeY - esz, esz * 2.2, esz * 1.8);
          return;
        }
        ctx.beginPath();
        ctx.ellipse(cx + side * gap, eyeY, esz, Math.max(0.4, esz * blink), 0, 0, Math.PI * 2);
        ctx.stroke();
        if (blink > 0.5) {
          ctx.fillStyle = 'rgba(226,232,240,0.9)';
          ctx.beginPath(); ctx.arc(cx + side * gap, eyeY, esz * 0.32, 0, Math.PI * 2); ctx.fill();
        }
      });
      if (p.glasses) {
        ctx.beginPath();
        ctx.arc(cx - gap, eyeY, esz * 1.9, 0, Math.PI * 2);
        ctx.arc(cx + gap, eyeY, esz * 1.9, 0, Math.PI * 2);
        ctx.moveTo(cx - gap + esz * 1.9, eyeY); ctx.lineTo(cx + gap - esz * 1.9, eyeY);
        ink(ctx, 0.6); ctx.stroke(); ink(ctx);
      }
      if (p.goggles) {
        ctx.beginPath();
        ctx.rect(cx - w * 0.7, cy - h * 0.82, w * 1.4, esz * 2);
        ink(ctx, 0.6); ctx.stroke(); ink(ctx);
      }
    }
    if (p.thirdEye) {
      ctx.beginPath(); ctx.arc(cx, eyeY - h * 0.42, esz * 0.5, 0, Math.PI * 2); ctx.stroke();
    }

    // brows
    const browTilt = (p.brow || 0) * 0.5;
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.moveTo(cx + side * (gap - esz * 1.2), eyeY - esz * 2.2 + side * 0 + browTilt * esz * 2 * side);
      ctx.lineTo(cx + side * (gap + esz * 1.2), eyeY - esz * 2.2 - browTilt * esz * 2 * side);
      ctx.stroke();
    });

    // nose + mouth
    ctx.beginPath();
    ctx.moveTo(cx, eyeY + esz);
    ctx.lineTo(cx - w * 0.07, eyeY + h * 0.32);
    ctx.lineTo(cx + w * 0.05, eyeY + h * 0.34);
    ctx.stroke();
    const mY = cy + h * 0.55, mCurve = (p.mouth || 0) * h * 0.22;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.26, mY);
    ctx.quadraticCurveTo(cx, mY + mCurve, cx + w * 0.26, mY);
    ctx.stroke();

    // hair / headgear
    if (p.hood) {
      ctx.beginPath();
      ctx.moveTo(cx - w * 1.15, S * 0.9);
      ctx.quadraticCurveTo(cx - w * 1.3, cy - h * 1.15, cx, cy - h * 1.3);
      ctx.quadraticCurveTo(cx + w * 1.3, cy - h * 1.15, cx + w * 1.15, S * 0.9);
      ctx.stroke();
    } else if (p.cap) {
      ctx.beginPath();
      ctx.moveTo(cx - w * 1.02, cy - h * 0.55);
      ctx.quadraticCurveTo(cx, cy - h * 1.5, cx + w * 1.02, cy - h * 0.55);
      ctx.lineTo(cx + w * 1.25, cy - h * 0.45);
      ctx.stroke();
    } else if (p.bandana) {
      ctx.beginPath();
      ctx.moveTo(cx - w, cy - h * 0.62); ctx.lineTo(cx + w, cy - h * 0.62);
      ctx.lineTo(cx + w * 1.3, cy - h * 0.85);
      ctx.stroke();
    } else if (p.hairN) {
      const n = p.hairN, len = (p.hairLen || 0.4) * h;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (1.12 + 0.76 * i / Math.max(1, n - 1));
        const x0 = cx + Math.cos(a) * w * 0.95, y0 = cy - h * 0.35 + Math.sin(a) * h * 0.62;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        if (p.hairSlick) ctx.quadraticCurveTo(x0 + w * 0.3, y0 - len * 0.6, x0 + w * 0.42, y0 - len * 0.2);
        else ctx.quadraticCurveTo(x0 + (r() - 0.5) * w * 0.6, y0 - len, x0 + (r() - 0.5) * w, y0 - len * (0.7 + r() * 0.6));
        ctx.stroke();
      }
    }
    if (p.beard) {
      const n = 4 + Math.floor(p.beard * 4);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x0 = cx - w * 0.5 * jaw + t * w * jaw;
        ctx.beginPath();
        ctx.moveTo(x0, cy + h * (0.62 + 0.25 * Math.sin(t * Math.PI)));
        ctx.lineTo(x0 + (r() - 0.5) * w * 0.2, cy + h * (0.95 + p.beard * 0.35 * Math.sin(t * Math.PI)));
        ctx.stroke();
      }
    }
    if (p.scar) {
      ctx.beginPath();
      ctx.moveTo(cx + w * 0.45, cy - h * 0.1);
      ctx.lineTo(cx + w * 0.6, cy + h * 0.35);
      ink(ctx, 0.5); ctx.stroke(); ink(ctx);
    }
    if (p.chain) {
      ctx.beginPath();
      ctx.arc(cx, S * 0.92, w * 0.7, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    if (p.shawl) {
      ctx.beginPath();
      ctx.moveTo(cx - w * 1.1, S * 0.95);
      ctx.quadraticCurveTo(cx - w * 1.2, cy - h * 0.8, cx, cy - h * 1.12);
      ctx.quadraticCurveTo(cx + w * 1.2, cy - h * 0.8, cx + w * 1.1, S * 0.95);
      ink(ctx, 0.6); ctx.stroke(); ink(ctx);
    }
    // recording scanline
    if (p.recording) {
      const ly = (now / 18) % S;
      ctx.fillStyle = 'rgba(226,232,240,0.13)';
      ctx.fillRect(0, ly, S, 2);
      ctx.fillStyle = 'rgba(226,232,240,0.05)';
      for (let y = 0; y < S; y += 4) ctx.fillRect(0, y, S, 1);
    }
  }

  function drawOwl(ctx, S, now) {
    const cx = S / 2, cy = S * 0.48;
    ctx.lineWidth = Math.max(1.2, S / 64);
    ink(ctx);
    // a paper-dry library mask: two huge ring eyes, radial feathers
    ctx.beginPath(); ctx.arc(cx, cy, S * 0.34, 0, Math.PI * 2); ctx.stroke();
    [-1, 1].forEach(function (side) {
      const ex = cx + side * S * 0.13;
      for (let i = 3; i >= 1; i--) {
        ctx.beginPath();
        ctx.arc(ex, cy - S * 0.05, S * 0.04 * i, 0, Math.PI * 2);
        ink(ctx, 0.3 + 0.2 * (4 - i)); ctx.stroke();
      }
      ink(ctx);
      const pulse = 0.5 + 0.5 * Math.sin(now / 900 + side);
      ctx.fillStyle = 'rgba(226,232,240,' + (0.4 + pulse * 0.5) + ')';
      ctx.beginPath(); ctx.arc(ex, cy - S * 0.05, S * 0.018, 0, Math.PI * 2); ctx.fill();
    });
    // beak: a bookmark
    ctx.beginPath();
    ctx.moveTo(cx - S * 0.03, cy + S * 0.06);
    ctx.lineTo(cx, cy + S * 0.16);
    ctx.lineTo(cx + S * 0.03, cy + S * 0.06);
    ctx.stroke();
    // radial filing marks
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * S * 0.36, cy + Math.sin(a) * S * 0.36);
      ctx.lineTo(cx + Math.cos(a) * S * 0.42, cy + Math.sin(a) * S * 0.42);
      ink(ctx, 0.45); ctx.stroke();
    }
    ink(ctx);
  }

  function drawCat(ctx, S, now, seed) {
    const r = srng(seed || 'cat');
    const cx = S / 2, cy = S * 0.55 + Math.sin(now / 1400) * S * 0.008;
    const w = S * 0.27;
    ctx.lineWidth = Math.max(1.2, S / 64);
    ctx.lineCap = 'round';
    ink(ctx);
    ctx.beginPath(); ctx.arc(cx, cy, w, 0, Math.PI * 2); ctx.stroke();
    // ears
    [-1, 1].forEach(function (s2) {
      ctx.beginPath();
      ctx.moveTo(cx + s2 * w * 0.85, cy - w * 0.5);
      ctx.lineTo(cx + s2 * w * 1.05, cy - w * 1.45);
      ctx.lineTo(cx + s2 * w * 0.25, cy - w * 0.95);
      ctx.stroke();
    });
    // eyes: slow blink
    const blink = ((now / 1000 + r() * 5) % 6) > 5.7 ? 0.12 : 1;
    [-1, 1].forEach(function (s2) {
      ctx.beginPath();
      ctx.ellipse(cx + s2 * w * 0.42, cy - w * 0.12, w * 0.13, w * 0.2 * blink, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (blink > 0.5) {
        ctx.fillStyle = 'rgba(226,232,240,0.9)';
        ctx.beginPath();
        ctx.ellipse(cx + s2 * w * 0.42, cy - w * 0.12, w * 0.035, w * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // nose + whiskers
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.07, cy + w * 0.18); ctx.lineTo(cx + w * 0.07, cy + w * 0.18); ctx.lineTo(cx, cy + w * 0.3);
    ctx.closePath(); ctx.stroke();
    [-1, 1].forEach(function (s2) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + s2 * w * 0.2, cy + w * (0.22 + i * 0.07));
        ctx.lineTo(cx + s2 * w * (1.5 + i * 0.1), cy + w * (0.05 + i * 0.16));
        ink(ctx, 0.55); ctx.stroke();
      }
    });
    ink(ctx);
  }

  // Oscilloscope sigils: three curve families — every identity hums differently.
  //   lissajous: two perpendicular tones; rose: petals of r=sin(kθ);
  //   harmonograph: a decaying pendulum tracing its own memory.
  function sigilCurve(seed) {
    const r = srng('sigil:' + seed);
    const fam = ['lissajous', 'rose', 'harmonograph'][Math.floor(r() * 3)];
    if (fam === 'rose') {
      const ks = [[2, 1], [3, 1], [5, 2], [4, 3], [7, 2], [5, 3], [7, 4]];
      const k = ks[Math.floor(r() * ks.length)];
      const ph = r() * Math.PI * 2;
      return { span: Math.PI * 2 * k[1], fn: function (t, R0) {
        const rad = Math.sin((k[0] / k[1]) * t) * R0;
        return { x: Math.cos(t + ph) * rad, y: Math.sin(t + ph) * rad };
      } };
    }
    if (fam === 'harmonograph') {
      const f1 = 2 + Math.floor(r() * 4), f2 = 3 + Math.floor(r() * 4);
      const p1 = r() * Math.PI * 2, p2 = r() * Math.PI * 2;
      const d = 0.05 + r() * 0.05;
      return { span: Math.PI * 8, fn: function (t, R0) {
        const decay = Math.exp(-d * t);
        return {
          x: Math.sin(f1 * t + p1) * R0 * decay,
          y: Math.sin(f2 * t + p2) * R0 * decay,
        };
      } };
    }
    const pairs = [[3, 2], [5, 4], [7, 5], [4, 3], [5, 2], [7, 3], [8, 5], [9, 4], [6, 5]];
    const pq = pairs[Math.floor(r() * pairs.length)];
    const phase = r() * Math.PI * 2;
    return { span: Math.PI * 2, fn: function (t, R0) {
      return { x: Math.sin(pq[0] * t + phase) * R0, y: Math.sin(pq[1] * t) * R0 };
    } };
  }
  function drawSigil(ctx, S, seed, now, hue) {
    const curve = sigilCurve(seed);
    const rot = now / 9000;
    const cx = S / 2, cy = S / 2, R0 = S * 0.36;
    const col = hue !== undefined ? 'hsla(' + hue + ',55%,75%,' : 'rgba(226,232,240,';
    ctx.lineCap = 'round';
    const N = 280;
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = col + (pass === 0 ? 0.18 : 0.85) + ')';
      ctx.lineWidth = pass === 0 ? S / 26 : Math.max(1.1, S / 80);
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * curve.span;
        const p = curve.fn(t, R0);
        const x2 = p.x * Math.cos(rot) - p.y * Math.sin(rot);
        const y2 = p.x * Math.sin(rot) + p.y * Math.cos(rot);
        if (i === 0) ctx.moveTo(cx + x2, cy + y2); else ctx.lineTo(cx + x2, cy + y2);
      }
      ctx.stroke();
    }
    // the traveling spark: where the network's attention is
    const t0 = ((now / 2600) % 1) * curve.span;
    const sp = curve.fn(t0, R0);
    const sx2 = sp.x * Math.cos(rot) - sp.y * Math.sin(rot), sy2 = sp.x * Math.sin(rot) + sp.y * Math.cos(rot);
    ctx.fillStyle = col + '1)';
    ctx.beginPath(); ctx.arc(cx + sx2, cy + sy2, S / 32, 0, Math.PI * 2); ctx.fill();
  }
  P.drawSigil = drawSigil;

  return P;
})();
