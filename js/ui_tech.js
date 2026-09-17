/* STARWEFT ui_tech.js -- Tech tree canvas overlay. Browser only.
   Public API: SW.uiTech.open(), .close(), .isOpen(), .renderTech(body,force),
               .showTechTreeRich(), .showTechTree(), .techDetailHtml(s,id), .zoomTechView(f)
   The overlay is a fixed full-viewport panel (below topbar) with a single
   <canvas> for the tree and a DOM detail pane docked to the right. */
var SW = globalThis.SW = globalThis.SW || {};

SW.uiTech = (function () {
  const U = SW.util, D = SW.data;
  const m = {};

  function $(sel) { return SW.ui.$(sel); }
  function st() { return SW.ui.st(); }
  function A() { return SW.ui.A(); }
  function esc(s) { return SW.ui.esc(s); }

  // ---- radial celestial astrolabe constants (SPEC[UI-TECH-ASTROLABE]) ----
  const CENTER_R    = 64;    // central Weave Core radius (canvas units)
  const DOC_R       = 108;   // doctrine orbit ring radius
  const TIER_R      = [0, 180, 305, 430, 555]; // radial orbits for tiers 1..4 (spacious 125px tier delta)
  const MAX_TIER    = 4;
  const OUTER_R     = 760;   // outer bounding orbit for branch titles and sector banners
  const BOUND_PAD   = 90;    // padding outside outer orbit
  const TOTAL_SIZE  = (OUTER_R + BOUND_PAD) * 2; // total virtual square: 1700x1700
  const CX          = TOTAL_SIZE / 2;
  const CY          = TOTAL_SIZE / 2;
  const ZOOM_MIN    = 0.16;
  const ZOOM_MAX    = 3.5;
  const ZOOM_STEP   = 1.15;  // per wheel tick or button press

  // Dedicated Domain sectors, styling, and semantic celestial color palette
  const DOMAINS = {
    core: {
      name: 'CORE PROTOCOLS',
      sub: 'PROPULSION & BULK SYSTEMS',
      icon: '◈',
      color: '#9bd6ea',         // Electric Cyan / Starlight
      dim: 'rgba(155, 214, 234, 0.16)',
      glow: 'rgba(155, 214, 234, 0.45)',
      bgWash: 'rgba(155, 214, 234, 0.022)',
      centerAngle: -90 * Math.PI / 180,
      startAngle: -112 * Math.PI / 180,
      endAngle: -68 * Math.PI / 180
    },
    logistics: {
      name: 'LOGISTICS MATRIX',
      sub: 'COMMERCE, FREIGHT & AUTOMATION',
      icon: '◇',
      color: '#eac36e',         // Solar Amber / Warm Gold
      dim: 'rgba(234, 195, 110, 0.16)',
      glow: 'rgba(234, 195, 110, 0.45)',
      bgWash: 'rgba(234, 195, 110, 0.022)',
      centerAngle: -10 * Math.PI / 180,
      startAngle: -68 * Math.PI / 180,
      endAngle: 48 * Math.PI / 180
    },
    frontier: {
      name: 'DEEP FRONTIER',
      sub: 'SURVEY, CARTOGRAPHY & GATES',
      icon: '✦',
      color: '#6fe0b6',         // Starlight Mint / Emerald
      dim: 'rgba(111, 224, 182, 0.16)',
      glow: 'rgba(111, 224, 182, 0.45)',
      bgWash: 'rgba(111, 224, 182, 0.022)',
      centerAngle: 90 * Math.PI / 180,
      startAngle: 48 * Math.PI / 180,
      endAngle: 132 * Math.PI / 180
    },
    vanguard: {
      name: 'VANGUARD FORCES',
      sub: 'DEFENSE, STRIKE & NAVAL ARMS',
      icon: '▲',
      color: '#8ca8f5',         // Cerulean Steel / Cobalt
      dim: 'rgba(140, 168, 245, 0.16)',
      glow: 'rgba(140, 168, 245, 0.45)',
      bgWash: 'rgba(140, 168, 245, 0.022)',
      centerAngle: 172 * Math.PI / 180,
      startAngle: 132 * Math.PI / 180,
      endAngle: 212 * Math.PI / 180
    },
    scourge: {
      name: 'SCOURGE ANALYSIS',
      sub: 'BIO-ANOMALY & INOCULATION',
      icon: '✠',
      color: '#f76a76',         // Abyssal Rose / Crimson
      dim: 'rgba(247, 106, 118, 0.16)',
      glow: 'rgba(247, 106, 118, 0.45)',
      bgWash: 'rgba(247, 106, 118, 0.022)',
      centerAngle: 230 * Math.PI / 180,
      startAngle: 212 * Math.PI / 180,
      endAngle: 248 * Math.PI / 180
    }
  };

  const SECTOR_BOUNDARIES = [
    -112 * Math.PI / 180,
    -68  * Math.PI / 180,
     48  * Math.PI / 180,
    132  * Math.PI / 180,
    212  * Math.PI / 180
  ];

  let techHits = [];   // [{x,y,rw,rh,id}] in canvas-client coords for hit-testing

  // ---- radial constellation layout ----
  function computeLayout(tree) {
    const branches = tree.branches;
    const pos = {};

    // Group nodes by branch and tier
    const byBranchTier = {};
    for (const n of tree.nodes) {
      const k = n.branch + ':' + n.tier;
      byBranchTier[k] = byBranchTier[k] || [];
      byBranchTier[k].push(n);
    }

    // Process branch by branch, tier by tier from 1 to MAX_TIER
    for (const b of branches) {
      const dInfo = DOMAINS[b] || DOMAINS.core;
      const bAngle = dInfo.centerAngle;
      const arcWidth = dInfo.endAngle - dInfo.startAngle;

      for (let t = 1; t <= MAX_TIER; t++) {
        const list = byBranchTier[b + ':' + t] || [];
        if (!list.length) continue;

        // Sort nodes by the average angle of their prerequisites in preceding tiers
        if (t > 1 && list.length > 1) {
          list.sort(function (nA, nB) {
            function getTargetAngle(n) {
              const reqs = (D.TECHS[n.id] && D.TECHS[n.id].req) || [];
              let sum = 0, count = 0;
              for (const r of reqs) {
                if (pos[r] && pos[r].angle !== undefined) {
                  sum += pos[r].angle;
                  count++;
                }
              }
              return count ? sum / count : bAngle;
            }
            return getTargetAngle(nA) - getTargetAngle(nB);
          });
        }

        const mCount = list.length;
        for (let idx = 0; idx < mCount; idx++) {
          const n = list[idx];
          let angle = bAngle;
          if (mCount > 1) {
            const maxSpan = arcWidth * 0.74;
            const step = Math.min(maxSpan / (mCount - 1), 0.28);
            angle = bAngle + (idx - (mCount - 1) / 2) * step;
          }

          // Alternating radial offsets to prevent adjacent label collisions
          const baseR = TIER_R[n.tier] || (n.tier * 125);
          const r = (mCount >= 3) ? (baseR + (idx % 2 === 1 ? 32 : -24)) :
                    (mCount === 2 && n.branch !== 'core') ? (baseR + (idx % 2 === 1 ? 18 : -14)) : baseR;

          const x = CX + r * Math.cos(angle);
          const y = CY + r * Math.sin(angle);
          pos[n.id] = { x: x, y: y, r: r, angle: angle, n: n, branch: n.branch, tier: n.tier, domain: dInfo };
        }
      }
    }

    // Position doctrines orbiting the central core ring
    const docPos = {};
    const docAngles = {
      doc_mercantile: DOMAINS.logistics.centerAngle - 0.18,
      doc_wayfarer:   DOMAINS.frontier.centerAngle,
      doc_vanguard:   DOMAINS.vanguard.centerAngle
    };
    for (const d of (tree.doctrines || [])) {
      const a = docAngles[d.id] !== undefined ? docAngles[d.id] : 0;
      const dx = CX + DOC_R * Math.cos(a);
      const dy = CY + DOC_R * Math.sin(a);
      const dom = d.id === 'doc_mercantile' ? DOMAINS.logistics :
                  d.id === 'doc_wayfarer' ? DOMAINS.frontier : DOMAINS.vanguard;
      docPos[d.id] = { x: dx, y: dy, r: DOC_R, angle: a, d: d, domain: dom };
    }

    return {
      pos: pos,
      docPos: docPos,
      totalW: TOTAL_SIZE,
      totalH: TOTAL_SIZE,
      CX: CX,
      CY: CY,
      branches: branches
    };
  }

  // auto-fit the whole tree into the canvas client rect, centering it
  function autoFit(canvas, layout) {
    const cw = canvas.clientWidth  || 800;
    const ch = canvas.clientHeight || 500;
    const scaleX = cw / (layout.totalW + 32);
    const scaleY = ch / (layout.totalH + 32);
    const zoom = Math.min(scaleX, scaleY, 1.0);
    const scaledW = layout.totalW * zoom;
    const scaledH = layout.totalH * zoom;
    SW.ui.techView.zoom = zoom;
    SW.ui.techView.x = (cw - scaledW) / 2;
    SW.ui.techView.y = (ch - scaledH) / 2;
  }

  // ---- canvas drawing helpers ----
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ---- main canvas draw pass ----
  // Read the live palette once per draw so the tree matches the menus exactly.
  function palette() {
    const cs = getComputedStyle(document.documentElement);
    function v(name, fb) { const x = cs.getPropertyValue(name).trim(); return x || fb; }
    return {
      accent: v('--accent', '#9bd6ea'),
      accentDim: v('--accent-dim', 'rgba(155,214,234,0.16)'),
      ink: v('--ink', '#c9d1d9'),
      inkDim: v('--ink-dim', '#6e7681'),
      inkFaint: v('--ink-faint', '#3d434b'),
      line: v('--line', '#23272e'),
      lineBright: v('--line-bright', '#3a4048'),
    };
  }

  let _hoverId = null;   // node currently under the cursor (for tooltip + edge lift)

  // Apply alpha to a CSS color string (handles hsl(...) and #hex). Used to tint
  // the one accent at varying strengths while keeping a single source of truth.
  function hexA(col, a) {
    col = (col || '').trim();
    let m = col.match(/^hsl\(\s*([\d.]+)[, ]+([\d.]+)%[, ]+([\d.]+)%\s*\)$/i);
    if (m) return 'hsla(' + m[1] + ',' + m[2] + '%,' + m[3] + '%,' + a + ')';
    m = col.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      const n = parseInt(m[1], 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    m = col.match(/^#([0-9a-f]{3})$/i);
    if (m) {
      const r = parseInt(m[1][0] + m[1][0], 16), g = parseInt(m[1][1] + m[1][1], 16), b = parseInt(m[1][2] + m[1][2], 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }
    return col;
  }

  function drawTechTree(canvas, s, tree) {
    if (!canvas) return;
    const P = palette();
    const accent = P.accent;
    const layout = computeLayout(tree);
    const { pos, docPos, totalW, totalH, CX, CY, branches } = layout;
    const viewW = canvas.clientWidth  || 800;
    const viewH = canvas.clientHeight || 500;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = viewW * dpr;
    canvas.height = viewH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const view = SW.ui.techView;
    const z = view.zoom;
    function tx(x) { return x * z + view.x; }
    function ty(y) { return y * z + view.y; }

    ctx.clearRect(0, 0, viewW, viewH);

    // Which edges/nodes connect to the hovered or selected node — lift those
    const focusId = _hoverId || SW.ui.techView.selected;
    const connected = {};
    if (focusId) {
      connected[focusId] = true;
      for (const e of tree.edges) {
        if (e[0] === focusId || e[1] === focusId) { connected[e[0]] = true; connected[e[1]] = true; }
      }
    }

    const scx = tx(CX), scy = ty(CY);

    // 1. Sector background washes (very faint pie wedges tinting each domain)
    for (const domKey in DOMAINS) {
      const dom = DOMAINS[domKey];
      try {
        ctx.beginPath();
        ctx.arc(scx, scy, (OUTER_R + 8) * z, dom.startAngle, dom.endAngle, false);
        ctx.arc(scx, scy, (CENTER_R + 8) * z, dom.endAngle, dom.startAngle, true);
        ctx.closePath();
        ctx.fillStyle = dom.bgWash;
        ctx.fill();
      } catch (e) {}
    }

    // 2. Sector boundary dividing hairlines
    for (const bAngle of SECTOR_BOUNDARIES) {
      const cosB = Math.cos(bAngle), sinB = Math.sin(bAngle);
      const rInner = (CENTER_R + 8) * z;
      const rOuter = (OUTER_R + 18) * z;

      ctx.beginPath();
      ctx.moveTo(scx + rInner * cosB, scy + rInner * sinB);
      ctx.lineTo(scx + rOuter * cosB, scy + rOuter * sinB);
      ctx.strokeStyle = hexA(P.lineBright, 0.45);
      ctx.lineWidth = 1;
      ctx.setLineDash([4 * z, 6 * z]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Outer boundary tick cross
      ctx.beginPath();
      const tr1 = (OUTER_R + 14) * z, tr2 = (OUTER_R + 22) * z;
      ctx.moveTo(scx + tr1 * cosB, scy + tr1 * sinB);
      ctx.lineTo(scx + tr2 * cosB, scy + tr2 * sinB);
      ctx.strokeStyle = hexA(P.accent, 0.45);
      ctx.lineWidth = 1.2 * z;
      ctx.stroke();
    }

    // 3. Concentric orbital tier guide rings (astrolabe coordinate circles)
    const tierLabels = ['TIER I · FOUNDATION', 'TIER II · EXPANSION', 'TIER III · ASCENDANCE', 'TIER IV · MASTERY'];
    for (let t = 1; t <= MAX_TIER; t++) {
      const tr = TIER_R[t] * z;
      ctx.beginPath();
      ctx.arc(scx, scy, tr, 0, Math.PI * 2);
      ctx.strokeStyle = hexA(P.accent, 0.08);
      ctx.lineWidth = 1;
      ctx.setLineDash([3 * z, 6 * z]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Subtle tier notation along ring with a small dark pill cutout
      const tAngle = -105 * Math.PI / 180;
      const lx = scx + tr * Math.cos(tAngle);
      const ly = scy + tr * Math.sin(tAngle);
      const labelText = tierLabels[t - 1];
      ctx.font = '600 ' + Math.max(7.5, 8.5 * z) + 'px Consolas, monospace';
      const tw = ctx.measureText(labelText).width;
      ctx.fillStyle = '#000000';
      ctx.fillRect(lx - 2 * z, ly - 7 * z, tw + 6 * z, 14 * z);
      ctx.fillStyle = hexA(P.inkFaint, 0.85);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, lx + z, ly);
    }

    // 4. Domain Outer Banners (Labels outside outer orbit)
    for (const domKey in DOMAINS) {
      const dom = DOMAINS[domKey];
      const ca = dom.centerAngle;
      const cosA = Math.cos(ca), sinA = Math.sin(ca);
      const bannerR = (OUTER_R + 32) * z;
      const bx = scx + bannerR * cosA;
      const by = scy + bannerR * sinA;

      const align = cosA > 0.25 ? 'left' : cosA < -0.25 ? 'right' : 'center';
      const baseline = sinA > 0.4 ? 'top' : sinA < -0.4 ? 'bottom' : 'middle';
      ctx.textAlign = align;
      ctx.textBaseline = baseline;

      // Title line: Domain Icon + Name
      const titleY = (sinA > 0.4) ? by : (sinA < -0.4) ? by - 14 * z : by - 7 * z;
      ctx.font = '700 ' + Math.max(9.5, 11.5 * z) + 'px "Segoe UI", sans-serif';
      ctx.fillStyle = dom.color;
      ctx.fillText(dom.icon + '  ' + dom.name, bx, titleY);

      // Subtitle line: Specialty / Discipline
      ctx.font = '600 ' + Math.max(7.5, 8.5 * z) + 'px Consolas, monospace';
      ctx.fillStyle = hexA(dom.color, 0.65);
      ctx.fillText(dom.sub, bx, titleY + 14 * z);
    }

    // 5. Central WEAVE ARCHIVE Core
    const coreR = CENTER_R * z;
    try {
      const g = ctx.createRadialGradient(scx, scy, 0, scx, scy, coreR);
      g.addColorStop(0, hexA(P.accent, 0.18));
      g.addColorStop(0.7, hexA(P.accent, 0.05));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(scx, scy, coreR, 0, Math.PI * 2);
      ctx.fill();
    } catch (e) {}

    // Outer bold core ring
    ctx.beginPath();
    ctx.arc(scx, scy, coreR, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(P.accent, 0.65);
    ctx.lineWidth = 2 * z;
    ctx.stroke();

    // Inner concentric ring
    ctx.beginPath();
    ctx.arc(scx, scy, (CENTER_R - 12) * z, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(P.accent, 0.25);
    ctx.lineWidth = 1 * z;
    ctx.stroke();

    // Core tick marks
    for (let k = 0; k < 12; k++) {
      const ka = (k * Math.PI) / 6;
      const t1 = (CENTER_R - 6) * z, t2 = (CENTER_R + 3) * z;
      ctx.beginPath();
      ctx.moveTo(scx + t1 * Math.cos(ka), scy + t1 * Math.sin(ka));
      ctx.lineTo(scx + t2 * Math.cos(ka), scy + t2 * Math.sin(ka));
      ctx.strokeStyle = hexA(P.accent, 0.4);
      ctx.lineWidth = 1.2 * z;
      ctx.stroke();
    }

    // Core typography
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 ' + Math.max(8, 9.5 * z) + 'px "Segoe UI", sans-serif';
    ctx.fillStyle = P.accent;
    ctx.fillText('WEAVE ARCHIVE', scx, scy - 7 * z);

    ctx.font = Math.max(7.5, 8.5 * z) + 'px Consolas, monospace';
    ctx.fillStyle = P.ink;
    ctx.fillText('◇ ' + Math.floor(s.research) + ' RES', scx, scy + 8 * z);

    // 6. Filaments from Core to Tier 1 root nodes
    for (const id in pos) {
      const p = pos[id], n = p.n;
      if (n.tier === 1 && (!n.req || n.req.length === 0)) {
        const dom = p.domain || DOMAINS[n.branch] || DOMAINS.core;
        const nx = tx(p.x), ny = ty(p.y);
        const dx = nx - scx, dy = ny - scy;
        const len = Math.hypot(dx, dy) || 1;
        const startX = scx + coreR * (dx / len);
        const startY = scy + coreR * (dy / len);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(nx, ny);
        if (n.owned) {
          ctx.strokeStyle = hexA(dom.color, 0.6);
          ctx.lineWidth = 1.6 * z;
        } else if (n.available) {
          ctx.strokeStyle = hexA(dom.color, 0.35);
          ctx.lineWidth = 1.2 * z;
          ctx.setLineDash([3 * z, 4 * z]);
        } else {
          ctx.strokeStyle = hexA(P.lineBright, 0.35);
          ctx.lineWidth = 0.9 * z;
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 7. Constellation edges between prerequisite nodes
    for (const e of tree.edges) {
      const a = pos[e[0]], b = pos[e[1]];
      if (!a || !b) continue;
      const dom = b.domain || DOMAINS[b.branch] || DOMAINS.core;
      const isLit   = a.n.owned && b.n.owned;
      const isNext  = a.n.owned && !b.n.owned && b.n.available;
      const focused = focusId && (e[0] === focusId || e[1] === focusId);

      const ax = tx(a.x), ay = ty(a.y);
      const bx = tx(b.x), by = ty(b.y);

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);

      if (focused) {
        ctx.strokeStyle = dom.color;
        ctx.lineWidth = 2.4 * z;
        ctx.setLineDash([]);
      } else if (isLit) {
        ctx.strokeStyle = hexA(dom.color, 0.65);
        ctx.lineWidth = 1.6 * z;
        ctx.setLineDash([]);
      } else if (isNext) {
        ctx.strokeStyle = hexA(dom.color, 0.4);
        ctx.lineWidth = 1.3 * z;
        ctx.setLineDash([4 * z, 4 * z]);
      } else {
        ctx.strokeStyle = hexA(P.lineBright, 0.35);
        ctx.lineWidth = 0.9 * z;
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const hits = [];
    const selId = SW.ui.techView.selected;

    // 8. Doctrines (Inner orbit around the Core)
    for (const dId in docPos) {
      const dp = docPos[dId], d = dp.d;
      if (!d.visible) continue;
      const dom = dp.domain || DOMAINS.logistics;
      const dsx = tx(dp.x), dsy = ty(dp.y);
      const isSel = selId === dId;
      const isHov = _hoverId === dId;
      const dRad = 8 * z;

      ctx.beginPath();
      ctx.moveTo(dsx, dsy - dRad);
      ctx.lineTo(dsx + dRad, dsy);
      ctx.lineTo(dsx, dsy + dRad);
      ctx.lineTo(dsx - dRad, dsy);
      ctx.closePath();

      if (d.owned) {
        ctx.fillStyle = dom.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 * z;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(10,12,15,0.88)';
        ctx.fill();
        ctx.strokeStyle = (isSel || isHov) ? dom.color : d.available ? hexA(dom.color, 0.5) : P.lineBright;
        ctx.lineWidth = (isSel || isHov) ? 2 * z : 1.2 * z;
        ctx.stroke();
      }

      ctx.font = '600 ' + Math.max(7.5, 8.5 * z) + 'px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = d.owned ? dom.color : P.inkDim;
      ctx.fillText(d.name.replace('Doctrine: ', ''), dsx, dsy + 14 * z);

      hits.push({ x: dsx, y: dsy, rw: Math.max(30 * z, 36), rh: Math.max(16 * z, 18), id: dId });
    }

    // 9. Research Nodes — Tier Visual Hierarchy & Semantic Celestial Colors
    for (const id in pos) {
      const p = pos[id], n = p.n;
      if (!n.visible) continue;
      const dom = p.domain || DOMAINS[n.branch] || DOMAINS.core;
      const sel = id === selId;
      const hov = id === _hoverId;
      const dim = focusId && !connected[id];
      const sx = tx(p.x), sy = ty(p.y);
      const tier = n.tier || 1;

      ctx.globalAlpha = dim ? 0.58 : 1.0;

      // Tier-scaled geometry
      // Tier 1: Foundation (4-point diamond star)
      // Tier 2: Expansion (6-point astrolabe star with satellite ring)
      // Tier 3: Ascendance (8-point radiant astrolabe star with corner reticle)
      // Tier 4: Mastery (12-point radiant nova capstone with framing reticle)
      const baseR = tier === 4 ? (n.owned ? 16 : n.available ? 13 : 10) :
                    tier === 3 ? (n.owned ? 14 : n.available ? 11.5 : 9) :
                    tier === 2 ? (n.owned ? 12 : n.available ? 10 : 8) :
                                 (n.owned ? 10.5 : n.available ? 8.5 : 7);
      const starR = baseR * z;
      const innerR = (n.owned ? 3.8 : n.available ? 2.8 : 2.0) * z;

      // Selection / Hover Reticle & Ambient Glow
      if (sel || hov) {
        try {
          const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, (starR + 15) * z);
          halo.addColorStop(0, hexA(dom.color, 0.3));
          halo.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(sx, sy, (starR + 15) * z, 0, Math.PI * 2);
          ctx.fill();
        } catch (e) {}

        const bRad = (starR + 8) * z;
        ctx.beginPath();
        ctx.arc(sx, sy, bRad, 0, Math.PI * 2);
        ctx.strokeStyle = dom.color;
        ctx.lineWidth = 1.4 * z;
        ctx.stroke();

        const tLen = 4 * z;
        ctx.beginPath();
        ctx.moveTo(sx - bRad - tLen, sy); ctx.lineTo(sx - bRad + 2 * z, sy);
        ctx.moveTo(sx + bRad - 2 * z, sy); ctx.lineTo(sx + bRad + tLen, sy);
        ctx.moveTo(sx, sy - bRad - tLen); ctx.lineTo(sx, sy - bRad + 2 * z);
        ctx.moveTo(sx, sy + bRad - 2 * z); ctx.lineTo(sx, sy + bRad + tLen);
        ctx.strokeStyle = dom.color;
        ctx.lineWidth = 1.6 * z;
        ctx.stroke();
      }

      // Color scheme for spikes and core
      const spikeColor = n.owned ? dom.color :
                         (n.available && n.affordable) ? dom.color :
                         n.available ? hexA(dom.color, 0.55) :
                         hexA(P.inkFaint, 0.85);

      ctx.strokeStyle = spikeColor;
      ctx.lineWidth = (n.owned ? 2.2 : n.available ? 1.6 : 1.0) * z;

      // Draw starburst spikes according to Tier:
      if (tier === 1) {
        // Tier 1: 4 cardinal spikes
        ctx.beginPath();
        ctx.moveTo(sx - starR, sy); ctx.lineTo(sx + starR, sy);
        ctx.moveTo(sx, sy - starR); ctx.lineTo(sx, sy + starR);
        ctx.stroke();
      } else if (tier === 2) {
        // Tier 2: 4 cardinal spikes + 4 diagonal rays + satellite orbit ring
        ctx.beginPath();
        ctx.moveTo(sx - starR, sy); ctx.lineTo(sx + starR, sy);
        ctx.moveTo(sx, sy - starR); ctx.lineTo(sx, sy + starR);
        ctx.stroke();

        const diagR = starR * 0.55;
        ctx.lineWidth = (n.owned ? 1.4 : 1.0) * z;
        ctx.beginPath();
        ctx.moveTo(sx - diagR, sy - diagR); ctx.lineTo(sx + diagR, sy + diagR);
        ctx.moveTo(sx - diagR, sy + diagR); ctx.lineTo(sx + diagR, sy - diagR);
        ctx.stroke();

        // Inner orbit ring
        ctx.beginPath();
        ctx.arc(sx, sy, innerR + 3.2 * z, 0, Math.PI * 2);
        ctx.strokeStyle = hexA(spikeColor, 0.45);
        ctx.lineWidth = 0.9 * z;
        ctx.stroke();
      } else if (tier === 3) {
        // Tier 3: 8-pointed radiant astrolabe star + corner reticle brackets
        ctx.beginPath();
        ctx.moveTo(sx - starR, sy); ctx.lineTo(sx + starR, sy);
        ctx.moveTo(sx, sy - starR); ctx.lineTo(sx, sy + starR);
        ctx.stroke();

        const diagR = starR * 0.68;
        ctx.lineWidth = (n.owned ? 1.6 : 1.1) * z;
        ctx.beginPath();
        ctx.moveTo(sx - diagR, sy - diagR); ctx.lineTo(sx + diagR, sy + diagR);
        ctx.moveTo(sx - diagR, sy + diagR); ctx.lineTo(sx + diagR, sy - diagR);
        ctx.stroke();

        // Corner bracket ticks
        const br = starR * 0.72, bLen = 2.5 * z;
        ctx.strokeStyle = hexA(spikeColor, 0.5);
        ctx.lineWidth = 1 * z;
        ctx.beginPath();
        ctx.moveTo(sx - br, sy - br + bLen); ctx.lineTo(sx - br, sy - br); ctx.lineTo(sx - br + bLen, sy - br);
        ctx.moveTo(sx + br, sy - br + bLen); ctx.lineTo(sx + br, sy - br); ctx.lineTo(sx + br - bLen, sy - br);
        ctx.moveTo(sx - br, sy + br - bLen); ctx.lineTo(sx - br, sy + br); ctx.lineTo(sx - br + bLen, sy + br);
        ctx.moveTo(sx + br, sy + br - bLen); ctx.lineTo(sx + br, sy + br); ctx.lineTo(sx + br - bLen, sy + br);
        ctx.stroke();
      } else {
        // Tier 4: Pinnacle 12-pointed radiant nova capstone
        ctx.beginPath();
        ctx.moveTo(sx - starR, sy); ctx.lineTo(sx + starR, sy);
        ctx.moveTo(sx, sy - starR); ctx.lineTo(sx, sy + starR);
        ctx.stroke();

        const diagR = starR * 0.75;
        ctx.lineWidth = (n.owned ? 1.8 : 1.2) * z;
        ctx.beginPath();
        ctx.moveTo(sx - diagR, sy - diagR); ctx.lineTo(sx + diagR, sy + diagR);
        ctx.moveTo(sx - diagR, sy + diagR); ctx.lineTo(sx + diagR, sy - diagR);
        ctx.stroke();

        // Intermediate minor rays (12 rays total)
        const minR = starR * 0.45;
        const cos30 = Math.cos(Math.PI / 6) * minR, sin30 = Math.sin(Math.PI / 6) * minR;
        ctx.lineWidth = 0.9 * z;
        ctx.beginPath();
        ctx.moveTo(sx - cos30, sy - sin30); ctx.lineTo(sx + cos30, sy + sin30);
        ctx.moveTo(sx + cos30, sy - sin30); ctx.lineTo(sx - cos30, sy + sin30);
        ctx.moveTo(sx - sin30, sy - cos30); ctx.lineTo(sx + sin30, sy + sin30);
        ctx.moveTo(sx + sin30, sy - cos30); ctx.lineTo(sx - sin30, sy + sin30);
        ctx.stroke();

        // Outer halo ring
        ctx.beginPath();
        ctx.arc(sx, sy, starR * 0.88, 0, Math.PI * 2);
        ctx.strokeStyle = hexA(dom.color, n.owned ? 0.6 : 0.3);
        ctx.lineWidth = 1 * z;
        ctx.setLineDash([2 * z, 3 * z]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Center Core Diamond
      ctx.beginPath();
      ctx.moveTo(sx, sy - innerR);
      ctx.lineTo(sx + innerR, sy);
      ctx.lineTo(sx, sy + innerR);
      ctx.lineTo(sx - innerR, sy);
      ctx.closePath();

      if (n.owned) {
        ctx.fillStyle = dom.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2 * z;
        ctx.stroke();
      } else if (n.available) {
        ctx.fillStyle = n.affordable ? dom.color : 'rgba(10,12,15,0.95)';
        ctx.fill();
        ctx.strokeStyle = n.affordable ? '#ffffff' : dom.color;
        ctx.lineWidth = 1 * z;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(10,12,15,0.95)';
        ctx.fill();
        ctx.strokeStyle = P.inkFaint;
        ctx.lineWidth = 0.9 * z;
        ctx.stroke();
      }

      // Celestial Typography: Node Name and Status / Cost
      const cosA = Math.cos(p.angle);
      const sinA = Math.sin(p.angle);
      let lx = sx, ly = sy;
      let align = 'center';
      let baseline = 'middle';

      // Single nodes right at the top/bottom vertical meridian float above/below
      if (Math.abs(cosA) < 0.08) {
        align = 'center';
        lx = sx;
        ly = sy + (sinA < 0 ? -(starR + 14 * z) : (starR + 14 * z));
      } else if (cosA >= 0.08) {
        // East hemisphere -> text extends to the right
        align = 'left';
        lx = sx + starR + 8 * z;
        ly = sy;
      } else {
        // West hemisphere -> text extends to the left
        align = 'right';
        lx = sx - starR - 8 * z;
        ly = sy;
      }

      ctx.textAlign = align;
      ctx.textBaseline = baseline;

      // Tech Name
      const fsName = Math.max(9.5, 11.5 * z);
      ctx.font = (n.owned ? '700 ' : '600 ') + fsName + 'px "Segoe UI", sans-serif';
      ctx.fillStyle = n.owned ? dom.color :
                      (n.available && n.affordable) ? '#f0f6fc' :
                      n.available ? P.ink :
                      P.inkDim;
      ctx.fillText(n.name, lx, ly - 5 * z);

      // Status / Cost
      const fsSub = Math.max(8.0, 9.0 * z);
      ctx.font = fsSub + 'px Consolas, monospace';
      if (n.owned) {
        ctx.fillStyle = hexA(dom.color, 0.85);
        ctx.fillText('✓ OWNED', lx, ly + 6 * z);
      } else if (n.available) {
        ctx.fillStyle = n.affordable ? dom.color : P.inkDim;
        ctx.fillText(n.cost + ' ◇', lx, ly + 6 * z);
      } else {
        ctx.fillStyle = P.inkFaint;
        ctx.fillText('LOCKED', lx, ly + 6 * z);
      }

      ctx.globalAlpha = 1.0;

      // Hit area: responsive hit coverage for both star and label
      let hitCx = sx;
      let hitRw = Math.max(38 * z, 48);
      if (cosA >= 0.08) {
        hitCx = sx + 18 * z;
        hitRw = Math.max(44 * z, 56);
      } else if (cosA < -0.08) {
        hitCx = sx - 18 * z;
        hitRw = Math.max(44 * z, 56);
      }
      const hitRh = Math.max(20 * z, 24);
      hits.push({ x: hitCx, y: sy, rw: hitRw, rh: hitRh, id: id });
    }

    techHits = hits;
    return layout;
  }

  // ---- overlay open / close ----
  // The overlay is the Development surface: Research (canvas tree), Aptitudes
  // and Milestones share one responsive home instead of three scattered corners.
  let _overlayOpen = false;
  let _overlayLayout = null;  // last computed layout for resize re-fit
  let _devTab = 'research';   // research | aptitudes | milestones

  m.isOpen = function () { return _overlayOpen; };

  function devHeadHtml(s) {
    function tab(id, label) {
      return '<button class="devTab' + (_devTab === id ? ' active' : '') + '" data-act="devTab" data-tab="' + id + '">' + label + '</button>';
    }
    return '<div class="techOvHead">' +
      '<span class="techOvTitle">◈ DEVELOPMENT</span>' +
      tab('research', '◇ RESEARCH') + tab('aptitudes', '✦ APTITUDES') + tab('milestones', '◆ MILESTONES') +
      '<span class="techOvPts num" title="Research points · aptitude points">◇ <span id="techPtsBadge">' + Math.floor(s.research) + '</span> · ✦ ' + (s.perkPoints || 0) + '</span>' +
      (_devTab === 'research' ? '<button data-act="techResetView" title="Fit tree to window" data-info="ui:research">reset view</button>' : '') +
      '<button data-act="closeTechOverlay" title="Close (ESC)" aria-label="Close">✕</button>' +
      '</div>';
  }

  m.open = function (tab) {
    if (tab) _devTab = tab;
    _overlayOpen = true;
    const ovl = $('#techOverlay');
    if (!ovl) return;
    const s = st();
    if (_devTab === 'aptitudes') { ovl.innerHTML = devHeadHtml(s) + aptitudesHtml(s); ovl.classList.remove('hidden'); return; }
    if (_devTab === 'milestones') { ovl.innerHTML = devHeadHtml(s) + milestonesHtml(s); ovl.classList.remove('hidden'); return; }
    const tree = SW.tech.tree(s);
    _overlayLayout = computeLayout(tree);

    // pick default selection
    if (!SW.ui.techView.selected || !D.TECHS[SW.ui.techView.selected] || !SW.tech.visible(s, SW.ui.techView.selected)) {
      const visible = SW.tech.list(s).filter(function (t) { return t.visible; });
      const first = visible.find(function (t) { return t.available && !t.owned; }) || visible[0];
      SW.ui.techView.selected = first ? first.id : null;
    }

    _buildOverlayHtml(ovl, s, tree);
    ovl.classList.remove('hidden');

    // auto-fit after DOM renders (need clientWidth)
    requestAnimationFrame(function () {
      const cv = $('#techCanvasFull');
      if (cv && _overlayLayout) { autoFit(cv, _overlayLayout); }
      drawTechTree($('#techCanvasFull'), s, tree);
      _refreshDetail();
      bindTechViewport($('#techCanvasFull'), s, tree);
    });
  };

  // ---- Aptitudes pane: a character sheet on a grid, not wrapped rows ----
  function aptitudesHtml(s) {
    const pts = s.perkPoints || 0;
    const list = SW.perks.list(s);
    const cats = [];
    for (const p of list) if (cats.indexOf(p.cat) < 0) cats.push(p.cat);
    let html = '<div class="devBody"><div class="sub">Research grows the network; aptitudes grow you. Points come from milestones — ' +
      '<span class="num">' + pts + '</span> unspent.</div>';
    for (const cat of cats) {
      html += '<h4>' + esc(cat.toUpperCase()) + '</h4><div class="perkGrid">';
      for (const p of list.filter(function (x) { return x.cat === cat; })) {
        const cls = p.owned ? ' owned' : p.available ? '' : ' locked';
        html += '<div class="perkCard' + cls + '">' +
          '<div class="row"><span class="title grow">' + p.icon + ' ' + esc(p.name) + '</span>' +
          (p.owned ? '<span class="tag acc">mastered</span>' :
            p.available ? '<button class="primary" data-act="buyPerk" data-id="' + p.id + '" ' + (pts ? '' : 'disabled') + '>✦ 1</button>' :
              '<span class="tag" title="Requires ' + esc((D.PERKS[p.req] || {}).name || '') + '">locked</span>') + '</div>' +
          '<div class="sub">' + esc(p.desc) + (!p.owned && !p.available && p.req ? ' Requires ' + esc((D.PERKS[p.req] || {}).name || '') + '.' : '') + '</div>' +
          '</div>';
      }
      html += '</div>';
    }
    return html + '</div>';
  }

  // ---- Milestones pane: where the points come from ----
  function milestonesHtml(s) {
    const done = D.PERK_MILESTONES.filter(function (mi) { return !!(s.milestones && s.milestones[mi.id]); });
    const groups = D.MILESTONE_GROUPS || { other: 'Milestones' };
    let html = '<div class="devBody msBody">';
    html += '<div class="msIntro"><div class="sub">Milestones are the spine of your aptitudes — each grants <b>one ✦ point</b>, once, the moment you reach it. They double as a checklist of the whole game.</div>' +
      '<div class="msTally"><span class="num">' + done.length + '</span> / ' + D.PERK_MILESTONES.length + ' reached · <span class="num">' + (s.perkPoints || 0) + '</span> ✦ unspent</div></div>';
    html += '<div class="msGroups">';
    for (const g in groups) {
      const items = D.PERK_MILESTONES.filter(function (mi) { return (mi.group || 'other') === g; });
      if (!items.length) continue;
      html += '<div class="msGroup"><h4 class="msGroupHead">' + esc(groups[g]) + '</h4>';
      for (const mi of items) {
        const at = s.milestones && s.milestones[mi.id];
        const hit = !!at;
        const pr = !hit && mi.prog ? mi.prog(s) : null;
        const pct = pr ? Math.max(0, Math.min(100, Math.round(100 * pr.cur / pr.goal))) : 0;
        html += '<div class="msCard' + (hit ? ' done' : '') + '">' +
          '<div class="msTop"><span class="msMark">' + (hit ? '◆' : '◇') + '</span>' +
          '<span class="msLabel grow">' + esc(mi.label) + '</span>' +
          (hit ? '<span class="msAt">+1 ✦ · ⧗' + at + '</span>'
               : pr ? '<span class="msCount num">' + Math.min(pr.cur, pr.goal) + '/' + pr.goal + '</span>'
               : '<span class="msCount sub">—</span>') +
          '</div>' +
          (hit ? '' : '<div class="msBar"><div class="msBarFill" style="width:' + pct + '%"></div></div>') +
          (hit ? '' : '<div class="msHint">' + esc(mi.hint || '') + '</div>') +
          '</div>';
      }
      html += '</div>';
    }
    html += '</div></div>';
    return html;
  }

  m.close = function () {
    _overlayOpen = false;
    const ovl = $('#techOverlay');
    if (ovl) ovl.classList.add('hidden');
  };

  function _buildOverlayHtml(ovl, s, tree) {
    let html = devHeadHtml(s);
    html += '<div class="techOvBody">';
    html += '<div class="techOvMap"><canvas id="techCanvasFull" title="Drag to pan · Wheel to zoom · Click node for details"></canvas></div>';
    html += '<div class="techOvSide" id="techOvSide">';
    html += techDetailHtml(s, SW.ui.techView.selected);
    // doctrines section
    if (tree.doctrines.some(function (d) { return d.visible; })) {
      html += '<h4 class="techDocHead">Doctrine — one per run</h4>';
      for (const doc of tree.doctrines) {
        if (!doc.visible) continue;
        const sel = SW.ui.techView.selected === doc.id;
        html += '<div class="listItem techPick' + (sel ? ' sel' : '') + '" data-act="techSelect" data-id="' + doc.id + '" data-info="tech:' + doc.id + '">' +
          '<div class="row"><span class="title grow">' + esc(doc.name) + '</span>' +
          (doc.owned ? '<span class="tag acc">chosen</span>' :
            '<button class="primary" data-act="research" data-id="' + doc.id + '" ' + (doc.affordable && doc.available ? '' : 'disabled') + '>' + doc.cost + ' ◇</button>') + '</div>' +
          '<div class="sub">' + esc(doc.desc) + '</div></div>';
      }
    }
    html += '</div></div>';
    ovl.innerHTML = html;
  }

  // refresh just the detail pane and research-point badge without redrawing canvas
  function _refreshDetail() {
    const s = st();
    const side = $('#techOvSide');
    if (!side) return;
    // update points badge
    const badge = $('#techPtsBadge');
    if (badge) badge.textContent = Math.floor(s.research);
    // replace detail pane (first child) only
    const oldDetail = side.querySelector && side.querySelector('#techDetail');
    if (oldDetail) {
      const tmp = document.createElement('div');
      tmp.innerHTML = techDetailHtml(s, SW.ui.techView.selected);
      const newDetail = tmp.firstChild;
      if (newDetail) side.replaceChild(newDetail, oldDetail);
    }
    // redraw canvas to reflect updated state and selection
    const cv = $('#techCanvasFull');
    if (cv) {
      const tree = SW.tech.tree(s);
      drawTechTree(cv, s, tree);
    }
  }

  // ---- viewport input binding ----
  function bindTechViewport(canvas, s, tree) {
    if (!canvas) return;
    let drag = null;
    canvas.onwheel = function (e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const old = SW.ui.techView.zoom;
      const next = U.clamp(old * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP), ZOOM_MIN, ZOOM_MAX);
      if (next === old) return;
      SW.ui.techView.x = mx - (mx - SW.ui.techView.x) * (next / old);
      SW.ui.techView.y = my - (my - SW.ui.techView.y) * (next / old);
      SW.ui.techView.zoom = next;
      drawTechTree(canvas, s, tree);
    };
    // Release any capture we took and clear the drag, always. The previous
    // version returned early on a node click without releasing pointer capture,
    // leaving the mouse stuck in pan mode after selecting a node.
    function endDrag(e) {
      if (canvas.releasePointerCapture && e && e.pointerId !== undefined) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      drag = null;
    }
    canvas.onpointerdown = function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      drag = { x: e.clientX, y: e.clientY, moved: false };
      if (canvas.setPointerCapture && e.pointerId !== undefined) {
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      }
      canvas.style.cursor = 'grabbing';
    };
    canvas.onpointermove = function (e) {
      if (!drag) return;
      e.preventDefault();
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 3) drag.moved = true;
      SW.ui.techView.x += dx; SW.ui.techView.y += dy;
      drag.x = e.clientX; drag.y = e.clientY;
      drawTechTree(canvas, s, tree);
    };
    canvas.onpointerup = function (e) {
      if (!drag) return;
      const wasClick = !drag.moved;
      endDrag(e);                       // clear drag + release capture FIRST
      canvas.style.cursor = 'grab';
      if (wasClick) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        for (const h of techHits) {
          if (Math.abs(h.x - mx) <= h.rw && Math.abs(h.y - my) <= h.rh) {
            SW.ui.techView.selected = h.id;
            _refreshDetail();
            drawTechTree(canvas, s, tree);   // re-highlight the selected node
            return;
          }
        }
      }
    };
    canvas.onpointerleave = function (e) { endDrag(e); setHover(null, canvas, s, tree); hideTip(); };
    canvas.onpointercancel = function (e) { endDrag(e); };
    canvas.onmousemove = function (e) {
      if (drag) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      for (const h of techHits) {
        if (Math.abs(h.x - mx) <= h.rw && Math.abs(h.y - my) <= h.rh) {
          if (_hoverId !== h.id) setHover(h.id, canvas, s, tree);
          showTip(h.id, e.clientX, e.clientY, rect);
          canvas.style.cursor = 'pointer';
          return;
        }
      }
      if (_hoverId) setHover(null, canvas, s, tree);
      hideTip();
      canvas.style.cursor = 'grab';
    };
    // Double-click a node to research it directly (if available + affordable),
    // otherwise just select it. Saves the trip to the detail-pane button.
    canvas.ondblclick = function (e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      for (const h of techHits) {
        if (Math.abs(h.x - mx) <= h.rw && Math.abs(h.y - my) <= h.rh) {
          SW.ui.techView.selected = h.id;
          tryResearch(h.id, canvas, s, tree);
          return;
        }
      }
    };
    canvas.onclick = null;
  }

  // Attempt to research a node; refresh tree + detail on success or toast why not.
  function tryResearch(id, canvas, s, tree) {
    const owned = SW.tech.has(s, id);
    if (owned) { SW.ui.techView.selected = id; _refreshDetail(); if (canvas) drawTechTree(canvas, s, tree); return; }
    const r = SW.ui.A().research(s, id);
    if (!r.ok) { SW.ui.toast({ kind: 'bad', text: r.msg || 'Cannot research that yet.' }); }
    else { SW.audio.sfx('click'); }
    // rebuild against fresh state so owned/affordable update everywhere
    const s2 = st(), tree2 = SW.tech.tree(s2);
    _refreshDetail();
    if (canvas) drawTechTree(canvas, s2, tree2);
  }

  // Set the hovered node and redraw so its connections light up.
  function setHover(id, canvas, s, tree) {
    _hoverId = id;
    if (canvas) drawTechTree(canvas, s, tree);
  }

  // A small light-up tooltip pinned near the node: name · status · what it does ·
  // what it needs · what it unlocks. This is the "communicate each node" piece.
  function ensureTip() {
    let tip = $('#techTip');
    if (!tip && typeof document !== 'undefined') {
      tip = document.createElement('div');
      tip.id = 'techTip';
      tip.className = 'techTip hidden';
      const ov = $('#techOverlay');
      if (ov && ov.appendChild) ov.appendChild(tip);
    }
    return tip;
  }
  function showTip(id, clientX, clientY, rect) {
    const tip = ensureTip();
    if (!tip) return;
    const s = st(), t = D.TECHS[id];
    if (!t) return;
    const owned = SW.tech.has(s, id), avail = SW.tech.available(s, id);
    const status = owned ? '<span class="tt-on">✓ researched</span>'
      : avail ? '<span class="tt-av">◇ ' + T_costLabel(s, id) + '</span>'
      : '<span class="tt-lk">⊘ locked</span>';
    // prereqs and what this unlocks
    const reqs = (t.req || []).map(function (r) { return D.TECHS[r] ? D.TECHS[r].name : r; });
    const unlocks = [];
    for (const oid in D.TECHS) { if ((D.TECHS[oid].req || []).indexOf(id) >= 0) unlocks.push(D.TECHS[oid].name); }
    let html = '<div class="tt-head"><span class="tt-name">' + esc(t.name) + '</span>' + status + '</div>';
    html += '<div class="tt-desc">' + esc(t.desc || '') + '</div>';
    if (reqs.length) html += '<div class="tt-rel"><b>needs</b> ' + esc(reqs.join(', ')) + '</div>';
    if (unlocks.length) html += '<div class="tt-rel"><b>unlocks</b> ' + esc(unlocks.slice(0, 4).join(', ')) + (unlocks.length > 4 ? '…' : '') + '</div>';
    html += '<div class="tt-foot">click to focus · button at right to research</div>';
    tip.innerHTML = html;
    tip.classList.remove('hidden');
    // Fixed positioning against the viewport, offset from the cursor and clamped
    // so the tip never spills off-screen (flips to the other side near edges).
    const vw = (typeof window !== 'undefined' && window.innerWidth) || 1280;
    const vh = (typeof window !== 'undefined' && window.innerHeight) || 720;
    const tw = tip.offsetWidth || 240, th = tip.offsetHeight || 90;
    let px = clientX + 16, py = clientY + 14;
    if (px + tw > vw - 8) px = clientX - tw - 16;
    if (py + th > vh - 8) py = Math.max(8, clientY - th - 12);
    tip.style.left = Math.max(8, px) + 'px';
    tip.style.top = Math.max(8, py) + 'px';
  }
  function hideTip() { const tip = $('#techTip'); if (tip && tip.classList) tip.classList.add('hidden'); }
  function T_costLabel(s, id) { return SW.tech.costOf(s, id) + (s.research >= SW.tech.costOf(s, id) ? '' : ' (saving)'); }

  // resize handler: re-fit on window resize while overlay is open
  function onResize() {
    if (!_overlayOpen) return;
    const cv = $('#techCanvasFull');
    const s = st();
    if (!cv || !s) return;
    const tree = SW.tech.tree(s);
    _overlayLayout = computeLayout(tree);
    autoFit(cv, _overlayLayout);
    drawTechTree(cv, s, tree);
  }
  if (typeof window !== 'undefined') window.addEventListener('resize', onResize);

  // ---- dock tab fallback (renderTech still called when tab='tech' in old saves;
  //      we keep the slot alive by redirecting to a lightweight placeholder) ----
  function renderTech(body) {
    // The tech tab is gone from the dock; this function is only called if
    // external code still sets activeTab='tech'. Render a stub that prompts
    // the player to use the topbar button instead.
    const s = st();
    body.innerHTML = '<div class="row" style="padding:10px 0"><span class="sub">Research moved to the topbar. Click <b>RESEARCH</b> above.</span></div>';
  }

  // ---- showTechTreeRich / showTechTree: kept for dispatch compatibility ----
  //  dispatch case 'openTechTree' calls this; we redirect to m.open()
  function showTechTreeRich() { m.open(); }
  function showTechTree()     { m.open(); }

  // ---- techDetailHtml: public, used by _refreshDetail and dispatch ----
  function techDetailHtml(s, id) {
    if (!id || !D.TECHS[id] || !SW.tech.visible(s, id)) {
      return '<div id="techDetail" class="techDetail"><h3>No signal selected</h3><div class="sub">Click a node to inspect its path.</div></div>';
    }
    const t = D.TECHS[id];
    const owned = SW.tech.has(s, id), available = SW.tech.available(s, id), cost = SW.tech.costOf(s, id);
    const reqs = (t.req || []).map(function (r) { return { name: D.TECHS[r] ? D.TECHS[r].name : r, owned: SW.tech.has(s, r) }; });
    const unlocks = Object.keys(D.TECHS).filter(function (k) { return (D.TECHS[k].req || []).indexOf(id) >= 0; });
    let html = '<div id="techDetail" class="techDetail" data-info="tech:' + id + '">' +
      '<div class="row"><h3 class="grow">' + esc(t.name) + '</h3>' +
      (owned ? '<span class="tag acc">owned</span>' : available ? '<span class="tag acc">available</span>' : '<span class="tag">locked</span>') + '</div>' +
      '<div class="sub">' + esc((t.branch || 'doctrine').toUpperCase()) + ' / tier ' + (t.tier || 0) + ' / cost <span class="num">' + cost + '◇</span></div>' +
      '<p>' + esc(t.desc) + '</p>';
    if (!owned) html += '<div class="row"><button class="primary" data-act="research" data-id="' + id + '" ' + (available && s.research >= cost ? '' : 'disabled') + '>research ' + cost + ' ◇</button></div>';
    html += '<h4>Requires</h4>';
    html += reqs.length ? reqs.map(function (r) { return '<span class="tag' + (r.owned ? ' acc' : '') + '">' + esc(r.name) + '</span>'; }).join(' ') : '<div class="sub">No prerequisites.</div>';
    html += '<h4>Unlocks</h4>';
    html += unlocks.length ? unlocks.map(function (k) { return '<span class="tag">' + esc(D.TECHS[k].name) + '</span>'; }).join(' ') : '<div class="sub">Terminal node for this path.</div>';
    if (t.visibleIf) html += '<h4>Signal</h4><div class="sub">Revealed by story flag: ' + esc(t.visibleIf) + '.</div>';
    if (t.group === 'doctrine') html += '<h4>Synergy</h4><div class="sub">One doctrine per run. The chosen branch researches 25% cheaper.</div>';
    else if (t.branch && SW.tech.doctrine(s) && D.DOCTRINE_DISCOUNT[SW.tech.doctrine(s)] === t.branch) html += '<h4>Synergy</h4><div class="sub">Your doctrine is reducing this branch cost.</div>';
    html += '</div>';
    return html;
  }

  function zoomTechView(factor) {
    SW.ui.techView.zoom = U.clamp(SW.ui.techView.zoom * factor, ZOOM_MIN, ZOOM_MAX);
  }

  m.renderTech      = renderTech;
  m.showTechTree    = showTechTree;
  m.showTechTreeRich = showTechTreeRich;
  m.techDetailHtml  = techDetailHtml;
  m.zoomTechView    = zoomTechView;
  m._hits = function () { return techHits; };   // test hook: node hit rects
  return m;
})();
