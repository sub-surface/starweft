/* STARWEFT ui_tech.js — research constellation and inspector. Browser only. */
var SW = globalThis.SW = globalThis.SW || {};

SW.uiTech = (function () {
  const U = SW.util, D = SW.data;
  const m = {};

  function $(sel) { return SW.ui.$(sel); }
  function st() { return SW.ui.st(); }
  function esc(s) { return SW.ui.esc(s); }

  const BRANCHES = ['logistics', 'core', 'frontier', 'vanguard', 'scourge'];
  const BRANCH_META = {
    logistics: { label: 'LOGISTICS', note: 'cargo, routes, markets, automation' },
    core:      { label: 'CORE',      note: 'capacity, speed, orbital industry' },
    frontier:  { label: 'FRONTIER',  note: 'range, surveys, gates, deep space' },
    vanguard:  { label: 'VANGUARD',  note: 'escorts, raids, bastions, force' },
    scourge:   { label: 'SCOURGE',   note: 'analysis, inoculation, panacea' },
    doctrine:  { label: 'DOCTRINE',  note: 'one identity-defining choice per run' },
  };

  // ============ public surfaces ============
  function renderTech(body) {
    const s = st();
    const tree = SW.tech.tree(s);
    const visible = visibleTechs(s);
    const owned = visible.filter(function (t) { return t.owned; }).length;
    const open = visible.filter(function (t) { return t.available && !t.owned; }).length;
    let html = '<div class="techDockHead">' +
      '<div><div class="techEyebrow">RESEARCH CONSTELLATION</div>' +
      '<div class="techResearch num">◇ ' + Math.floor(s.research) + '</div></div>' +
      '<button data-act="openTechTree" data-info="ui:research" aria-label="Open research constellation">open atlas</button></div>';
    html += '<div class="techDockLegend"><span><b class="planetMark">○</b> unresearched</span>' +
      '<span><b class="starMark">✦</b> woven</span><span><b class="orbitMark">◎</b> available</span></div>';
    html += '<canvas id="techCanvas" data-info="ui:research" role="img" aria-label="Research constellation. Select a signal to inspect it."></canvas>';
    html += '<div class="techDockFoot"><span>' + owned + ' woven</span><span>' + open + ' open signal' + (open === 1 ? '' : 's') + '</span></div>';
    if ((s.perkPoints || 0) > 0) {
      html += '<div class="techAptitudeNote">◆ ' + s.perkPoints + ' aptitude point' + (s.perkPoints === 1 ? '' : 's') + ' waiting in YOU</div>';
    }
    body.innerHTML = html;
    drawTechTree($('#techCanvas'), s, tree, { preview: true });
  }

  function showTechTree() { showTechTreeRich(); }

  function showTechTreeRich() {
    const s = st();
    const tree = SW.tech.tree(s);
    const visible = visibleTechs(s);
    ensureSelection(s, visible);
    const modal = $('#techModal');
    const owned = visible.filter(function (t) { return t.owned; }).length;
    const total = visible.length;
    let html = '<div class="techHead"><div class="grow"><div class="techEyebrow">THE WEFT OF KNOWLEDGE</div>' +
      '<h2><i>✦</i> RESEARCH CONSTELLATION</h2></div>' +
      '<div class="techHeadCount"><span class="num">◇ ' + Math.floor(s.research) + '</span><small>' + owned + '/' + total + ' woven</small></div>' +
      '<button data-act="techZoomOut" data-info="ui:research" title="Zoom out" aria-label="Zoom research constellation out">−</button>' +
      '<button data-act="techZoomIn" data-info="ui:research" title="Zoom in" aria-label="Zoom research constellation in">+</button>' +
      '<button data-act="techResetView" data-info="ui:research" title="Reset view">reset</button>' +
      '<button data-act="closeModal" data-info="ui:research" title="Close research constellation" aria-label="Close">✕</button></div>';
    html += '<div class="techToolbar"><span>drag empty space to pan</span><span>wheel to zoom</span><span>select before spending</span></div>';
    html += '<div class="techGrid"><div class="techMap"><canvas id="techCanvasFull" data-info="ui:research" role="img" aria-label="Interactive research constellation"></canvas>' +
      '<div class="techMapKey"><span><b class="planetMark">○</b> planet: unresearched</span><span><b class="starMark">✦</b> star: woven</span><span><b class="orbitMark">◎</b> bright orbit: available</span></div></div>' +
      '<aside class="techSide">' + techDetailHtml(s, SW.ui.techView.selected) + availableHtml(s, visible) + branchProgressHtml(s, visible) + '</aside></div>';
    modal.innerHTML = html;
    SW.ui.showModal('techModal');
    drawTechTree($('#techCanvasFull'), s, tree, { large: true });
  }

  function techDetailHtml(s, id) {
    if (!id || !D.TECHS[id] || !SW.tech.visible(s, id)) {
      return '<section id="techDetail" class="techDetail"><div class="techEmptyGlyph">○</div><h3>No signal selected</h3><div class="sub">Choose a planet or star in the atlas.</div></section>';
    }
    const t = D.TECHS[id];
    const owned = SW.tech.has(s, id);
    const available = SW.tech.available(s, id);
    const affordable = s.research >= SW.tech.costOf(s, id);
    const cost = SW.tech.costOf(s, id);
    const reqs = (t.req || []).map(function (r) { return { id: r, owned: SW.tech.has(s, r) }; });
    const unlocks = Object.keys(D.TECHS).filter(function (k) { return (D.TECHS[k].req || []).indexOf(id) >= 0 && SW.tech.visible(s, k); });
    const missing = reqs.filter(function (r) { return !r.owned; });
    const status = owned ? 'WOVEN' : available ? (affordable ? 'OPEN SIGNAL' : 'OPEN · NEEDS RESEARCH') : 'DISTANT SIGNAL';
    const meta = BRANCH_META[t.branch] || BRANCH_META.doctrine;
    let html = '<section id="techDetail" class="techDetail" data-info="tech:' + id + '">' +
      '<div class="techDetailTop"><div class="techDetailGlyph ' + (owned ? 'owned' : available ? 'available' : 'locked') + '">' + (owned ? '✦' : '○') + '</div>' +
      '<div class="grow"><div class="techStatus">' + status + '</div><h3>' + esc(t.name) + '</h3>' +
      '<div class="sub">' + esc(meta.label) + (t.group === 'doctrine' ? '' : ' · orbit ' + (t.tier || 0)) + ' · <span class="num">' + cost + '◇</span></div></div></div>' +
      '<p>' + esc(t.desc) + '</p>';
    if (!owned) {
      html += '<button class="techResearchButton primary" data-act="research" data-id="' + id + '" data-info="tech:' + id + '" ' +
        (available && affordable ? '' : 'disabled') + '>WEAVE THIS STAR · ' + cost + ' ◇</button>';
      if (!available && missing.length) {
        html += '<div class="techWhyLocked">Complete ' + missing.map(function (r) { return esc(D.TECHS[r] ? D.TECHS[r].name : r.id); }).join(' and ') + ' first.</div>';
      } else if (available && !affordable) {
        html += '<div class="techWhyLocked">' + Math.max(0, Math.ceil(cost - s.research)) + ' more research required.</div>';
      }
    }
    html += '<div class="techRelation"><h4>Requires</h4>' + relationLinks(reqs.map(function (r) { return r.id; }), s, 'No prerequisite signal.') + '</div>';
    html += '<div class="techRelation"><h4>Unlocks</h4>' + relationLinks(unlocks, s, 'Terminal star in this path.') + '</div>';
    if (t.visibleIf) html += '<div class="techSignalNote">This signal entered the atlas through events in the current run.</div>';
    if (t.group === 'doctrine') html += '<div class="techSignalNote">Doctrine is permanent for this run. It discounts one branch by 25% and closes the other doctrines.</div>';
    else if (SW.tech.doctrine(s) && D.DOCTRINE_DISCOUNT[SW.tech.doctrine(s)] === t.branch) html += '<div class="techSignalNote">Your doctrine is reducing this signal\'s cost by 25%.</div>';
    html += '</section>';
    return html;
  }

  function availableHtml(s, visible) {
    const open = visible.filter(function (t) { return t.available && !t.owned; })
      .sort(function (a, b) { return Number(b.affordable) - Number(a.affordable) || branchRank(a.branch) - branchRank(b.branch) || a.cost - b.cost; });
    let html = '<section class="techSideSection"><div class="techSectionHead"><h4>Open signals</h4><span>' + open.length + '</span></div>';
    if (!open.length) return html + '<div class="sub">No research signal is open yet. Follow a dependency thread or wait for the world to reveal one.</div></section>';
    html += '<div class="techSignalList">';
    for (const t of open) {
      html += '<button class="techSignal' + (SW.ui.techView.selected === t.id ? ' sel' : '') + '" data-act="techSelect" data-id="' + t.id + '" data-info="tech:' + t.id + '">' +
        '<span class="techSignalIcon">' + (t.affordable ? '◎' : '○') + '</span><span class="grow"><b>' + esc(t.name) + '</b><small>' + esc((BRANCH_META[t.branch] || BRANCH_META.doctrine).label) + '</small></span>' +
        '<span class="num">' + t.cost + '◇</span></button>';
    }
    return html + '</div></section>';
  }

  function branchProgressHtml(s, visible) {
    let html = '<section class="techSideSection"><div class="techSectionHead"><h4>Constellations</h4><span>branch progress</span></div><div class="techBranchProgress">';
    for (const branch of BRANCHES) {
      const items = visible.filter(function (t) { return t.branch === branch; });
      if (!items.length) continue;
      const owned = items.filter(function (t) { return t.owned; }).length;
      const jump = items.find(function (t) { return t.available && !t.owned; }) || items.find(function (t) { return !t.owned; }) || items[items.length - 1];
      const pct = Math.round((owned / items.length) * 100);
      html += '<button class="techBranchLine" data-act="techSelect" data-id="' + jump.id + '" data-info="tech:' + jump.id + '">' +
        '<span><b>' + BRANCH_META[branch].label + '</b><small>' + esc(BRANCH_META[branch].note) + '</small></span>' +
        '<span class="techBranchMeter"><i style="width:' + pct + '%"></i></span><span class="num">' + owned + '/' + items.length + '</span></button>';
    }
    const docs = visible.filter(function (t) { return t.branch === 'doctrine'; });
    if (docs.length) {
      const chosen = docs.find(function (t) { return t.owned; });
      const jump = chosen || docs.find(function (t) { return t.available; }) || docs[0];
      html += '<button class="techBranchLine doctrine" data-act="techSelect" data-id="' + jump.id + '" data-info="tech:' + jump.id + '">' +
        '<span><b>DOCTRINE</b><small>' + (chosen ? esc(chosen.name.replace('Doctrine: ', '')) + ' chosen' : 'one permanent course') + '</small></span>' +
        '<span class="techBranchMeter"><i style="width:' + (chosen ? 100 : 0) + '%"></i></span><span>' + (chosen ? '✦' : '○') + '</span></button>';
    }
    return html + '</div></section>';
  }

  function relationLinks(ids, s, emptyText) {
    if (!ids.length) return '<div class="sub">' + esc(emptyText) + '</div>';
    return '<div class="techRelations">' + ids.map(function (id) {
      const t = D.TECHS[id];
      if (!t) return '';
      const owned = SW.tech.has(s, id);
      return '<button class="techLink' + (owned ? ' owned' : '') + '" data-act="techSelect" data-id="' + id + '" data-info="tech:' + id + '">' +
        (owned ? '✦ ' : '○ ') + esc(t.name) + '</button>';
    }).join('') + '</div>';
  }

  function visibleTechs(s) {
    return SW.tech.list(s).filter(function (t) { return SW.tech.visible(s, t.id); });
  }

  function ensureSelection(s, visible) {
    if (SW.ui.techView.selected && D.TECHS[SW.ui.techView.selected] && SW.tech.visible(s, SW.ui.techView.selected)) return;
    const first = visible.find(function (t) { return t.available && !t.owned && t.affordable; }) ||
      visible.find(function (t) { return t.available && !t.owned; }) || visible.find(function (t) { return t.owned; }) || visible[0];
    SW.ui.techView.selected = first ? first.id : null;
  }

  function zoomTechView(factor) {
    SW.ui.techView.zoom = U.clamp(SW.ui.techView.zoom * factor, 0.65, 2.2);
  }

  function branchRank(branch) {
    const order = { logistics: 1, core: 2, frontier: 3, vanguard: 4, scourge: 5, doctrine: 6 };
    return order[branch] || 99;
  }

  // ============ constellation canvas ============
  function drawTechTree(canvas, s, tree, opts) {
    if (!canvas) return;
    opts = opts || {};
    let hits = paintTechTree(canvas, s, tree, opts);
    canvas.onclick = function (e) {
      if (canvas._techSuppressClick) { canvas._techSuppressClick = false; return; }
      const h = hitAt(canvas, e, hits);
      if (!h) return;
      SW.ui.techView.selected = h.id;
      showTechTreeRich();
    };
    canvas.onmousemove = function (e) {
      const h = hitAt(canvas, e, hits);
      canvas.style.cursor = h ? 'pointer' : (opts.large ? 'grab' : 'crosshair');
      if (h) SW.ui.renderInfobox({ kind: 'tech', id: h.id });
    };
    canvas.onmouseleave = function () { canvas.style.cursor = opts.large ? 'grab' : 'crosshair'; };
    if (opts.large) {
      bindTechViewport(canvas, function () { hits = paintTechTree(canvas, st(), SW.tech.tree(st()), opts); });
    }
  }

  function hitAt(canvas, e, hits) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (const h of hits) if (Math.hypot(h.x - mx, h.y - my) <= h.r) return h;
    return null;
  }

  function paintTechTree(canvas, s, tree, opts) {
    const large = !!opts.large;
    const Wd = canvas.clientWidth || (large ? 760 : 300);
    const viewH = large ? (canvas.clientHeight || 560) : 292;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(Wd * dpr));
    canvas.height = Math.max(1, Math.floor(viewH * dpr));
    canvas.style.height = viewH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, Wd, viewH);
    const view = large ? SW.ui.techView : { x: 0, y: 0, zoom: 1 };
    const z = view.zoom || 1;
    function tx(x) { return large ? x * z + view.x : x; }
    function ty(y) { return large ? y * z + view.y : y; }
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#9bd6ea';
    const layout = constellationLayout(Wd, viewH, tree, large);
    const selected = SW.ui.techView.selected;

    drawDeepField(ctx, Wd, viewH, large);
    drawOrbitGuides(ctx, layout, tx, ty, z, large);
    drawThreads(ctx, tree, layout, tx, ty, z, accent);
    drawCore(ctx, tx(layout.cx), ty(layout.cy), large, accent);

    const hits = [];
    for (const item of layout.items) {
      const n = item.n;
      if (!n.visible) continue;
      const x = tx(item.x), y = ty(item.y);
      const r = (large ? nodeRadius(n) : Math.max(4.5, nodeRadius(n) - 1.5)) * Math.min(1.15, z);
      drawNode(ctx, x, y, r, n, selected === n.id, accent, large);
      drawNodeLabel(ctx, x, y, r, n, selected === n.id, large, accent);
      hits.push({ x: x, y: y, r: Math.max(large ? 18 : 13, r + 8), id: n.id });
    }
    return hits;
  }

  function constellationLayout(W, H, tree, large) {
    const cx = W / 2;
    const cy = H / 2 + (large ? 10 : 4);
    const outer = Math.max(82, Math.min(W, H) * (large ? 0.39 : 0.365));
    const branchAngles = {};
    BRANCHES.forEach(function (b, i) { branchAngles[b] = -Math.PI / 2 + i * (Math.PI * 2 / BRANCHES.length); });
    const items = [];
    const pos = {};
    for (const n of tree.nodes) {
      if (!n.visible) continue;
      const angle = branchAngles[n.branch] || -Math.PI / 2;
      const tier = Math.max(1, n.tier || 1);
      const radius = outer * (0.26 + (tier - 1) * 0.245);
      const tangentOffset = (n.slot - (n.slots - 1) / 2) * (large ? 34 : 16);
      const x = cx + Math.cos(angle) * radius - Math.sin(angle) * tangentOffset;
      const y = cy + Math.sin(angle) * radius + Math.cos(angle) * tangentOffset;
      const item = { x: x, y: y, n: n };
      items.push(item); pos[n.id] = item;
    }
    const visibleDocs = tree.doctrines.filter(function (d) { return d.visible; });
    visibleDocs.forEach(function (d, i) {
      const angle = -Math.PI / 2 + i * (Math.PI * 2 / Math.max(3, visibleDocs.length));
      const radius = large ? 38 : 27;
      const n = Object.assign({ branch: 'doctrine', tier: 0, slots: visibleDocs.length, slot: i }, d);
      const item = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, n: n };
      items.push(item); pos[n.id] = item;
    });
    return { cx: cx, cy: cy, outer: outer, branchAngles: branchAngles, items: items, pos: pos };
  }

  function drawDeepField(ctx, W, H, large) {
    ctx.fillStyle = 'rgba(255,255,255,0.018)';
    const count = large ? 72 : 26;
    for (let i = 0; i < count; i++) {
      const x = ((i * 83 + 31) % 997) / 997 * W;
      const y = ((i * 151 + 67) % 991) / 991 * H;
      const r = i % 9 === 0 ? 0.8 : 0.4;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawOrbitGuides(ctx, layout, tx, ty, z, large) {
    ctx.save();
    ctx.setLineDash([2, 7]);
    ctx.strokeStyle = 'rgba(110,118,129,0.10)';
    ctx.lineWidth = 1;
    for (let tier = 1; tier <= 4; tier++) {
      const r = layout.outer * (0.26 + (tier - 1) * 0.245) * z;
      ctx.beginPath(); ctx.arc(tx(layout.cx), ty(layout.cy), r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const branch of BRANCHES) {
      const a = layout.branchAngles[branch];
      const x2 = layout.cx + Math.cos(a) * (layout.outer + (large ? 28 : 18));
      const y2 = layout.cy + Math.sin(a) * (layout.outer + (large ? 28 : 18));
      ctx.strokeStyle = 'rgba(110,118,129,0.12)';
      ctx.beginPath(); ctx.moveTo(tx(layout.cx), ty(layout.cy)); ctx.lineTo(tx(x2), ty(y2)); ctx.stroke();
      ctx.fillStyle = 'rgba(110,118,129,0.78)';
      ctx.font = (large ? '9px' : '7px') + ' "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(BRANCH_META[branch].label, tx(x2), ty(y2) + (Math.sin(a) > 0.45 ? 10 : -5));
    }
    ctx.restore();
  }

  function drawThreads(ctx, tree, layout, tx, ty, z, accent) {
    const visibleRoots = layout.items.filter(function (p) { return p.n.branch !== 'doctrine' && p.n.visible && !(D.TECHS[p.n.id].req || []).length; });
    for (const root of visibleRoots) drawThread(ctx, { x: layout.cx, y: layout.cy, n: { owned: true } }, root, tx, ty, z, accent, false);
    for (const e of tree.edges) {
      const a = layout.pos[e[0]], b = layout.pos[e[1]];
      if (!a || !b || !a.n.visible || !b.n.visible) continue;
      drawThread(ctx, a, b, tx, ty, z, accent, true);
    }
  }

  function drawThread(ctx, a, b, tx, ty, z, accent, curve) {
    const active = a.n.owned && b.n.owned;
    const fed = a.n.owned && !b.n.owned;
    ctx.save();
    ctx.strokeStyle = active ? accent : fed ? 'rgba(201,209,217,0.42)' : 'rgba(110,118,129,0.17)';
    ctx.globalAlpha = active ? 0.48 : 1;
    ctx.lineWidth = active ? 1.35 : 1;
    if (!active) ctx.setLineDash(fed ? [4, 5] : [2, 7]);
    ctx.beginPath();
    ctx.moveTo(tx(a.x), ty(a.y));
    if (curve) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const bend = 0.08;
      ctx.quadraticCurveTo(tx(mx - dy * bend), ty(my + dx * bend), tx(b.x), ty(b.y));
    } else ctx.lineTo(tx(b.x), ty(b.y));
    ctx.stroke();
    ctx.restore();
  }

  function drawCore(ctx, x, y, large, accent) {
    ctx.save();
    ctx.strokeStyle = 'rgba(201,209,217,0.18)';
    ctx.beginPath(); ctx.arc(x, y, large ? 20 : 14, 0, Math.PI * 2); ctx.stroke();
    drawStar(ctx, x, y, large ? 7 : 5, accent, 0.8);
    ctx.fillStyle = 'rgba(110,118,129,0.8)';
    ctx.font = (large ? '8px' : '6.5px') + ' "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WEFT-7', x, y + (large ? 31 : 22));
    ctx.restore();
  }

  function nodeRadius(n) {
    if (n.branch === 'doctrine') return 9;
    return n.tier >= 4 ? 9 : n.tier === 1 ? 7 : 8;
  }

  function drawNode(ctx, x, y, r, n, selected, accent, large) {
    ctx.save();
    if (selected) {
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * (r + 10), y + Math.sin(a) * (r + 10));
        ctx.lineTo(x + Math.cos(a) * (r + 13), y + Math.sin(a) * (r + 13));
        ctx.stroke();
      }
    }
    if (n.owned) {
      drawStar(ctx, x, y, r + 2, accent, selected ? 1 : 0.9);
      ctx.shadowColor = accent; ctx.shadowBlur = large ? 12 : 7;
      ctx.fillStyle = accent; ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.fill();
    } else {
      const available = n.available && n.visible;
      const affordable = available && n.affordable;
      ctx.fillStyle = available ? 'rgba(201,209,217,0.065)' : 'rgba(110,118,129,0.025)';
      ctx.strokeStyle = affordable ? accent : available ? 'rgba(201,209,217,0.72)' : 'rgba(110,118,129,0.38)';
      ctx.lineWidth = affordable ? 1.45 : 1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // A small terminator makes unresearched nodes read as planets, not generic circles.
      ctx.strokeStyle = available ? 'rgba(201,209,217,0.32)' : 'rgba(110,118,129,0.22)';
      ctx.beginPath(); ctx.arc(x + r * 0.22, y, r * 0.78, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      if (available) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.38); ctx.scale(1.65, 0.42);
        ctx.strokeStyle = affordable ? accent : 'rgba(201,209,217,0.52)';
        ctx.globalAlpha = affordable ? 0.78 : 0.55;
        ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawStar(ctx, x, y, radius, fill, alpha) {
    ctx.save();
    ctx.fillStyle = fill; ctx.globalAlpha = alpha;
    ctx.beginPath();
    const points = 8;
    for (let i = 0; i < points * 2; i++) {
      const a = -Math.PI / 2 + i * Math.PI / points;
      const rr = i % 2 === 0 ? radius : radius * 0.34;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawNodeLabel(ctx, x, y, r, n, selected, large, accent) {
    if (!large && !n.owned && !n.available) return;
    const words = n.name.replace('Doctrine: ', '').split(' ');
    const line1 = words.slice(0, 2).join(' ').slice(0, large ? 20 : 14);
    const line2 = large && words.length > 2 ? words.slice(2, 4).join(' ').slice(0, 18) : '';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = (large ? '9px' : '7px') + ' "Segoe UI", sans-serif';
    ctx.fillStyle = selected ? accent : n.owned ? 'rgba(201,209,217,0.94)' : n.available ? 'rgba(201,209,217,0.78)' : 'rgba(110,118,129,0.64)';
    ctx.fillText(line1, x, y + r + (large ? 13 : 10));
    if (line2) ctx.fillText(line2, x, y + r + 24);
    if (large && !n.owned && n.available) {
      ctx.fillStyle = n.affordable ? accent : 'rgba(110,118,129,0.82)';
      ctx.font = '8px Consolas, monospace';
      ctx.fillText(n.cost + '◇', x, y - r - 7);
    }
    ctx.restore();
  }

  function bindTechViewport(canvas, redraw) {
    let drag = null;
    canvas.onwheel = function (e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const old = SW.ui.techView.zoom;
      const next = U.clamp(old * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.65, 2.2);
      if (next === old) return;
      SW.ui.techView.x = mx - (mx - SW.ui.techView.x) * (next / old);
      SW.ui.techView.y = my - (my - SW.ui.techView.y) * (next / old);
      SW.ui.techView.zoom = next;
      redraw();
    };
    canvas.onpointerdown = function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      drag = { x: e.clientX, y: e.clientY, ox: e.clientX, oy: e.clientY, moved: false };
      canvas.style.cursor = 'grabbing';
      if (canvas.setPointerCapture && e.pointerId !== undefined) canvas.setPointerCapture(e.pointerId);
    };
    canvas.onpointermove = function (e) {
      if (!drag) return;
      e.preventDefault();
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      SW.ui.techView.x += dx; SW.ui.techView.y += dy;
      drag.x = e.clientX; drag.y = e.clientY;
      if (Math.hypot(e.clientX - drag.ox, e.clientY - drag.oy) > 4) drag.moved = true;
      redraw();
    };
    canvas.onpointerup = function (e) {
      if (e && e.preventDefault) e.preventDefault();
      if (drag && drag.moved) canvas._techSuppressClick = true;
      drag = null; canvas.style.cursor = 'grab';
    };
    canvas.onpointerleave = function () {
      if (drag && drag.moved) canvas._techSuppressClick = true;
      drag = null; canvas.style.cursor = 'grab';
    };
  }

  m.renderTech = renderTech;
  m.showTechTree = showTechTree;
  m.showTechTreeRich = showTechTreeRich;
  m.techDetailHtml = techDetailHtml;
  m.zoomTechView = zoomTechView;
  return m;
})();
