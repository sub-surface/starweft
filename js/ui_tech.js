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

    // Which edges/nodes connect to the hovered or selected node — lift those.
    const focusId = _hoverId || SW.ui.techView.selected;
    const connected = {};
    if (focusId) {
      connected[focusId] = true;
      for (const e of tree.edges) {
        if (e[0] === focusId || e[1] === focusId) { connected[e[0]] = true; connected[e[1]] = true; }
      }
    }

    // branch column backgrounds — subtle, single faint ink wash (monochrome)
    for (const b of branches) {
      ctx.fillStyle = 'rgba(201,209,217,0.018)';
      ctx.fillRect(tx(colX[b]), ty(0), colW[b] * z, totalH * z);
    }

    // branch headers — small caps in dim ink, matching panel section heads
    ctx.font = '600 ' + Math.max(8, 9 * z) + 'px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const b of branches) {
      ctx.fillStyle = P.inkDim;
      ctx.fillText(b.toUpperCase(), tx(colX[b] + colW[b] / 2), ty(HEADER_H / 2));
    }

    // prerequisite edges. Owned chains glow accent; the next reachable step is a
    // dashed accent hint; a focused node lifts all its connections.
    for (const e of tree.edges) {
      const a = pos[e[0]], b = pos[e[1]];
      if (!a || !b) continue;
      const isLit   = a.n.owned && b.n.owned;
      const isNext  = a.n.owned && !b.n.owned && b.n.available;
      const focused = focusId && (e[0] === focusId || e[1] === focusId);
      if (focused) { ctx.strokeStyle = P.accent; ctx.lineWidth = 2 * z; ctx.setLineDash([]); }
      else if (isLit)  { ctx.strokeStyle = hexA(P.accent, 0.5); ctx.lineWidth = 1.5 * z; ctx.setLineDash([]); }
      else if (isNext) { ctx.strokeStyle = hexA(P.accent, 0.28); ctx.lineWidth = 1.2 * z; ctx.setLineDash([3 * z, 4 * z]); }
      else { ctx.strokeStyle = P.line; ctx.lineWidth = 1 * z; ctx.setLineDash([]); }
      const ax  = tx(a.x),      ay  = ty(a.y + NODE_H / 2 + 1);
      const bx2 = tx(b.x),      by2 = ty(b.y - NODE_H / 2 - 1);
      const midY = (ay + by2) / 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(ax, midY); ctx.lineTo(bx2, midY); ctx.lineTo(bx2, by2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // nodes — clean cards, clear state language, readable labels
    const hits = [];
    const selId = SW.ui.techView.selected;
    for (const id in pos) {
      const p = pos[id], n = p.n;
      if (!n.visible) continue;
      const sel = id === selId;
      const hov = id === _hoverId;
      const dim = focusId && !connected[id];   // fade nodes unrelated to the focus
      const rx = tx(p.x - NODE_W / 2), ry = ty(p.y - NODE_H / 2);
      const rw = NODE_W * z,            rh = NODE_H * z,   rr = 4 * z;
      ctx.globalAlpha = dim ? 0.4 : 1;

      // fill: owned = accent wash, available = panel, locked = void
      ctx.fillStyle = n.owned     ? P.accentDim :
                      n.available ? 'rgba(10,12,15,0.92)' :
                                    'rgba(10,12,15,0.55)';
      roundRect(ctx, rx, ry, rw, rh, rr); ctx.fill();

      // stroke: matches our button/card borders
      ctx.lineWidth = (sel || hov) ? 2 : n.owned ? 1.5 : 1;
      ctx.strokeStyle = (sel || hov) ? P.accent :
                        n.owned      ? hexA(P.accent, 0.5) :
                        n.available  ? (n.affordable ? hexA(P.accent, 0.4) : P.lineBright) :
                                       P.line;
      roundRect(ctx, rx, ry, rw, rh, rr); ctx.stroke();

      // a small left status pip (filled = owned, ring = available, faint = locked)
      const pipX = tx(p.x - NODE_W / 2) + 8 * z, pipY = ty(p.y), pipR = 3 * z;
      ctx.beginPath(); ctx.arc(pipX, pipY, pipR, 0, Math.PI * 2);
      if (n.owned) { ctx.fillStyle = P.accent; ctx.fill(); }
      else if (n.available && n.affordable) { ctx.strokeStyle = P.accent; ctx.lineWidth = 1.4 * z; ctx.stroke(); }
      else if (n.available) { ctx.strokeStyle = P.inkDim; ctx.lineWidth = 1.2 * z; ctx.stroke(); }
      else { ctx.fillStyle = P.inkFaint; ctx.fill(); }

      // label — bigger, readable, ink/dim by state
      const fs = Math.max(8.5, 11 * z);
      ctx.font = (n.owned ? '600 ' : '') + fs + 'px "Segoe UI", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = n.owned ? P.ink : n.available ? P.ink : P.inkDim;
      const maxChars = Math.max(8, Math.floor(rw / (fs * 0.6)) - 3);
      const label = n.name.length > maxChars ? n.name.slice(0, maxChars - 1) + '…' : n.name;
      ctx.fillText(label, pipX + 7 * z, ty(p.y));

      // owned check / cost badge, right-aligned
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      if (n.owned) {
        ctx.font = Math.max(8, 9 * z) + 'px "Segoe UI", sans-serif';
        ctx.fillStyle = P.accent;
        ctx.fillText('✓', tx(p.x + NODE_W / 2) - 7 * z, ty(p.y));
      } else if (n.available) {
        ctx.font = Math.max(7.5, 9 * z) + 'px Consolas, monospace';
        ctx.fillStyle = n.affordable ? P.accent : P.inkDim;
        ctx.fillText(n.cost + '◇', tx(p.x + NODE_W / 2) - 7 * z, ty(p.y));
      }
      ctx.globalAlpha = 1;

      hits.push({ x: tx(p.x), y: ty(p.y), rw: rw / 2, rh: rh / 2, id: id });
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
