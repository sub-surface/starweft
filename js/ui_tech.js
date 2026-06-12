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

  // ---- tuning constants (not in D.TUNE: purely UI layout) ----
  const NODE_W      = 120;   // chip width px (canvas units)
  const NODE_H      = 30;    // chip height px
  const COL_GAP     = 28;    // padding between branch columns
  const ROW_GAP     = 44;    // vertical gap between tiers
  const HEADER_H    = 22;    // branch label row height
  const MAX_TIER    = 4;
  const ZOOM_MIN    = 0.18;
  const ZOOM_MAX    = 3.5;
  const ZOOM_STEP   = 1.15;  // per wheel tick or button press

  // branch column tint fills
  const BRANCH_COL = {
    logistics: 'rgba(155,214,234,0.05)',
    core:      'rgba(201,209,217,0.04)',
    frontier:  'rgba(140,200,140,0.05)',
    vanguard:  'rgba(220,170,120,0.05)',
    scourge:   'rgba(220,100,100,0.06)',
  };

  let techHits = [];   // [{x,y,rw,rh,id}] in canvas-client coords for hit-testing

  // ---- layout ----
  function computeLayout(tree) {
    const branches = tree.branches;
    const bySlot = {};
    for (const n of tree.nodes) {
      const k = n.branch + ':' + n.tier;
      bySlot[k] = bySlot[k] || [];
      bySlot[k].push(n.id);
    }
    const maxSlots = {};
    for (const b of branches) {
      let mx = 1;
      for (let t = 1; t <= MAX_TIER; t++) mx = Math.max(mx, (bySlot[b + ':' + t] || []).length);
      maxSlots[b] = mx;
    }
    const colX = {}, colW = {};
    let cx = 0;
    for (const b of branches) {
      colX[b] = cx;
      colW[b] = maxSlots[b] * (NODE_W + COL_GAP / 2) + COL_GAP;
      cx += colW[b];
    }
    const totalW = cx;
    const rowH = NODE_H + ROW_GAP;
    const totalH = HEADER_H + (MAX_TIER + 1) * rowH + ROW_GAP / 2;
    const pos = {};
    for (const n of tree.nodes) {
      const slots = bySlot[n.branch + ':' + n.tier];
      const idx = slots.indexOf(n.id);
      const bx = colX[n.branch], bw = colW[n.branch];
      const cellW = bw / slots.length;
      const x = bx + idx * cellW + cellW / 2;
      const y = HEADER_H + n.tier * rowH + NODE_H / 2;
      pos[n.id] = { x: x, y: y, n: n };
    }
    return { pos: pos, colX: colX, colW: colW, totalW: totalW, totalH: totalH, rowH: rowH, branches: branches };
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
  function drawTechTree(canvas, s, tree) {
    if (!canvas) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#9bd6ea';
    const layout = computeLayout(tree);
    const { pos, colX, colW, totalW, totalH, rowH, branches } = layout;
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

    // branch column backgrounds
    for (const b of branches) {
      ctx.fillStyle = BRANCH_COL[b] || 'rgba(201,209,217,0.03)';
      ctx.fillRect(tx(colX[b]), ty(0), colW[b] * z, totalH * z);
    }

    // tier row separators
    ctx.strokeStyle = 'rgba(110,118,129,0.07)'; ctx.lineWidth = 1;
    for (let t = 1; t <= MAX_TIER; t++) {
      const sepY = ty(HEADER_H + t * rowH - ROW_GAP / 2);
      ctx.beginPath(); ctx.moveTo(tx(0), sepY); ctx.lineTo(tx(totalW), sepY); ctx.stroke();
    }

    // branch headers
    ctx.font = '8px "Segoe UI", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const b of branches) {
      ctx.fillStyle = 'rgba(155,175,200,0.55)';
      ctx.fillText(b.toUpperCase(), tx(colX[b] + colW[b] / 2), ty(HEADER_H / 2));
    }

    // prerequisite edges (L-shaped connectors)
    for (const e of tree.edges) {
      const a = pos[e[0]], b = pos[e[1]];
      if (!a || !b) continue;
      const isLit  = a.n.owned && b.n.owned;
      const isNext = a.n.owned && !b.n.owned && b.n.available;
      ctx.strokeStyle = isLit  ? 'rgba(155,214,234,0.4)' :
                        isNext ? 'rgba(155,214,234,0.18)' :
                                 'rgba(110,118,129,0.12)';
      ctx.lineWidth = isLit ? 1.5 * z : 1 * z;
      ctx.setLineDash(isNext ? [3 * z, 4 * z] : []);
      const ax  = tx(a.x),      ay  = ty(a.y + NODE_H / 2 + 1);
      const bx2 = tx(b.x),      by2 = ty(b.y - NODE_H / 2 - 1);
      const midY = (ay + by2) / 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(ax, midY); ctx.lineTo(bx2, midY); ctx.lineTo(bx2, by2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // nodes
    const hits = [];
    const selId = SW.ui.techView.selected;
    for (const id in pos) {
      const p = pos[id], n = p.n;
      if (!n.visible) continue;
      const sel = id === selId;
      const rx = tx(p.x - NODE_W / 2), ry = ty(p.y - NODE_H / 2);
      const rw = NODE_W * z,            rh = NODE_H * z,   rr = 3 * z;

      // fill
      ctx.fillStyle = n.owned     ? 'rgba(155,214,234,0.15)'  :
                      n.available ? (n.affordable ? 'rgba(155,214,234,0.06)' : 'rgba(201,209,217,0.03)') :
                                    'rgba(28,33,38,0.3)';
      roundRect(ctx, rx, ry, rw, rh, rr); ctx.fill();

      // stroke
      ctx.lineWidth = sel ? 2 : n.owned ? 1.5 : n.available ? 1 : 0.5;
      ctx.strokeStyle = sel      ? accent :
                        n.owned  ? 'rgba(155,214,234,0.55)' :
                        n.available ? (n.affordable ? 'rgba(155,214,234,0.38)' : 'rgba(201,209,217,0.22)') :
                                      'rgba(80,90,105,0.18)';
      roundRect(ctx, rx, ry, rw, rh, rr); ctx.stroke();

      // label
      const fs = Math.max(6, 8.5 * z);
      ctx.font = fs + 'px "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = n.owned     ? 'rgba(201,209,217,0.95)' :
                      n.available ? 'rgba(175,195,215,0.88)' :
                                    'rgba(95,110,125,0.5)';
      const label = n.name.length > 16 ? n.name.slice(0, 15) + '…' : n.name;
      ctx.fillText(label, tx(p.x), ty(p.y));

      // owned mark / cost badge
      if (n.owned) {
        ctx.font = Math.max(5, 6.5 * z) + 'px "Segoe UI"';
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(155,214,234,0.55)';
        ctx.fillText('✓', tx(p.x + NODE_W / 2 - 2), ty(p.y - NODE_H / 2 + 1));
      } else if (n.available) {
        ctx.font = Math.max(5, 6 * z) + 'px "Segoe UI", monospace';
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillStyle = n.affordable ? 'rgba(155,214,234,0.8)' : 'rgba(110,118,129,0.5)';
        ctx.fillText(n.cost + '◇', tx(p.x + NODE_W / 2 - 2), ty(p.y - NODE_H / 2 + 1));
      }

      hits.push({ x: tx(p.x), y: ty(p.y), rw: rw / 2, rh: rh / 2, id: id });
    }
    techHits = hits;

    return layout;
  }

  // ---- overlay open / close ----
  let _overlayOpen = false;
  let _overlayLayout = null;  // last computed layout for resize re-fit

  m.isOpen = function () { return _overlayOpen; };

  m.open = function () {
    _overlayOpen = true;
    const ovl = $('#techOverlay');
    if (!ovl) return;
    const s = st();
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

  m.close = function () {
    _overlayOpen = false;
    const ovl = $('#techOverlay');
    if (ovl) ovl.classList.add('hidden');
  };

  function _buildOverlayHtml(ovl, s, tree) {
    let html = '<div class="techOvHead">';
    html += '<span class="techOvTitle">◇ RESEARCH</span>';
    html += '<span class="techOvPts num" title="Available research points">◇ <span id="techPtsBadge">' + Math.floor(s.research) + '</span></span>';
    html += '<button data-act="techResetView" title="Fit tree to window" data-info="ui:research">reset view</button>';
    html += '<button data-act="closeTechOverlay" title="Close research tree (ESC)" aria-label="Close">✕</button>';
    html += '</div>';
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
    canvas.onpointerdown = function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      drag = { x: e.clientX, y: e.clientY, moved: false };
      if (canvas.setPointerCapture && e.pointerId !== undefined) canvas.setPointerCapture(e.pointerId);
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
      if (!drag.moved) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        for (const h of techHits) {
          if (Math.abs(h.x - mx) <= h.rw && Math.abs(h.y - my) <= h.rh) {
            SW.ui.techView.selected = h.id;
            _refreshDetail();
            return;
          }
        }
      }
      drag = null;
    };
    canvas.onpointerleave = function () { drag = null; };
    canvas.onmousemove = function (e) {
      if (drag) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      for (const h of techHits) {
        if (Math.abs(h.x - mx) <= h.rw && Math.abs(h.y - my) <= h.rh) {
          SW.ui.renderInfobox({ kind: 'tech', id: h.id });
          canvas.style.cursor = 'pointer';
          return;
        }
      }
      canvas.style.cursor = 'grab';
    };
    canvas.onclick = null;
  }

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
  return m;
})();
