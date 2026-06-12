/* STARWEFT ui_tech.js — Tech tree, canvas rendering, viewport pan/zoom. Browser only. */
var SW = globalThis.SW = globalThis.SW || {};

SW.uiTech = (function () {
  const U = SW.util, D = SW.data;
  const m = {};

  // Shared helpers from coordinator — invoked at render time only (safe).
  function $(sel) { return SW.ui.$(sel); }
  function st() { return SW.ui.st(); }
  function A() { return SW.ui.A(); }
  function esc(s) { return SW.ui.esc(s); }

  let techHits = []; // tech canvas hitboxes, private to this module

  // ============ tech tab (canvas tree) ============
  function renderTech(body, force) {
    const s = st();
    let html = '<div class="row"><span class="title grow num">◇ ' + Math.floor(s.research) + '</span><span class="sub">click a node to research</span><button data-act="openTechTree">expand</button></div>';
    html += '<canvas id="techCanvas"></canvas>';
    // aptitudes live in the YOU tab; just flag waiting points here
    if ((s.perkPoints || 0) > 0) {
      html += '<div class="row"><span class="tag acc">◆ ' + s.perkPoints + ' aptitude point' + (s.perkPoints === 1 ? '' : 's') + ' waiting — see the YOU tab</span></div>';
    }
    const tree = SW.tech.tree(s);
    if (tree.doctrines.some(function (d2) { return d2.visible; })) {
      html += '<h4>Doctrine — one per run</h4>';
      for (const doc of tree.doctrines) {
        if (!doc.visible) continue;
        html += '<div class="listItem" data-info="tech:' + doc.id + '"><div class="row"><span class="title grow">' + esc(doc.name) + '</span>' +
          (doc.owned ? '<span class="tag acc">chosen</span>' :
            '<button class="primary" data-act="research" data-id="' + doc.id + '" ' + (doc.affordable && doc.available ? '' : 'disabled') + '>' + doc.cost + ' ◇</button>') + '</div>' +
          '<div class="sub">' + esc(doc.desc) + '</div></div>';
      }
    }
    body.innerHTML = html;
    drawTechTree($('#techCanvas'), s, tree);
  }

  function showTechTree() {
    const s = st();
    const tree = SW.tech.tree(s);
    const modal = $('#techModal');
    let html = '<div class="row"><h2 class="grow"><i>◇</i> TECH TREE</h2><span class="sub num">◇ ' + Math.floor(s.research) + '</span><button data-act="closeModal">✕</button></div>';
    html += '<div class="techGrid"><div class="techMap"><canvas id="techCanvasFull"></canvas></div><div class="techList">';
    const items = SW.tech.list(s).filter(function (t) { return t.visible; })
      .sort(function (a, b) { return branchRank(a.branch) - branchRank(b.branch) || a.tier - b.tier || a.cost - b.cost; });
    let lastBranch = null;
    for (const t of items) {
      if (t.branch !== lastBranch) {
        lastBranch = t.branch;
        html += '<h4>' + esc(t.branch === 'doctrine' ? 'doctrine' : t.branch) + '</h4>';
      }
      const status = t.owned ? '<span class="tag acc">owned</span>' :
        t.available ? '<button class="primary" data-act="research" data-id="' + t.id + '" ' + (t.affordable ? '' : 'disabled') + '>' + t.cost + ' ◇</button>' :
        '<span class="tag">locked</span>';
      html += '<div class="listItem" data-info="tech:' + t.id + '"><div class="row"><span class="title grow">' + esc(t.name) + '</span>' + status + '</div>' +
        '<div class="sub">' + esc(t.desc) + '</div>' + techPathHtml(t.id) + '</div>';
    }
    html += '</div></div>';
    modal.innerHTML = html;
    SW.ui.showModal('techModal');
    drawTechTree($('#techCanvasFull'), s, tree, { large: true });
  }

  function showTechTreeRich() {
    const s = st();
    const tree = SW.tech.tree(s);
    const modal = $('#techModal');
    const visible = SW.tech.list(s).filter(function (t) { return t.visible; });
    if (!SW.ui.techView.selected || !D.TECHS[SW.ui.techView.selected] || !SW.tech.visible(s, SW.ui.techView.selected)) {
      const first = visible.find(function (t) { return t.available && !t.owned; }) || visible[0];
      SW.ui.techView.selected = first ? first.id : null;
    }
    let html = '<div class="techHead"><h2><i>◇</i> TECH TREE</h2><span class="sub num">◇ ' + Math.floor(s.research) + '</span>' +
      '<button data-act="techZoomOut" title="Zoom out">-</button><button data-act="techZoomIn" title="Zoom in">+</button>' +
      '<button data-act="techResetView" title="Reset tech tree view">reset</button><button data-act="closeModal">x</button></div>';
    html += '<div class="techToolbar"><span>drag to pan</span><span>wheel to zoom</span><span>click a node for details</span></div>';
    html += '<div class="techGrid"><div class="techMap"><canvas id="techCanvasFull"></canvas></div><div class="techSide">';
    html += techDetailHtml(s, SW.ui.techView.selected);
    html += '<div class="techList">';
    const items = visible.sort(function (a, b) { return branchRank(a.branch) - branchRank(b.branch) || a.tier - b.tier || a.cost - b.cost; });
    let lastBranch = null;
    for (const t of items) {
      if (t.branch !== lastBranch) {
        lastBranch = t.branch;
        html += '<h4>' + esc(t.branch === 'doctrine' ? 'doctrine' : t.branch) + '</h4>';
      }
      const status = t.owned ? '<span class="tag acc">owned</span>' :
        t.available ? '<button class="primary" data-act="research" data-id="' + t.id + '" ' + (t.affordable ? '' : 'disabled') + '>' + t.cost + ' ◇</button>' :
        '<span class="tag">locked</span>';
      html += '<div class="listItem techPick' + (SW.ui.techView.selected === t.id ? ' sel' : '') + '" data-act="techSelect" data-id="' + t.id + '" data-info="tech:' + t.id + '"><div class="row"><span class="title grow">' + esc(t.name) + '</span>' + status + '</div>' +
        '<div class="sub">' + esc(t.desc) + '</div>' + techPathHtml(t.id) + '</div>';
    }
    html += '</div></div></div>';
    modal.innerHTML = html;
    SW.ui.showModal('techModal');
    drawTechTree($('#techCanvasFull'), s, tree, { large: true });
  }

  function techDetailHtml(s, id) {
    if (!id || !D.TECHS[id] || !SW.tech.visible(s, id)) {
      return '<div id="techDetail" class="techDetail"><h3>No signal selected</h3><div class="sub">Select a node to inspect its path.</div></div>';
    }
    const t = D.TECHS[id];
    const owned = SW.tech.has(s, id), available = SW.tech.available(s, id), cost = SW.tech.costOf(s, id);
    const reqs = (t.req || []).map(function (r) { return { name: D.TECHS[r] ? D.TECHS[r].name : r, owned: SW.tech.has(s, r) }; });
    const unlocks = Object.keys(D.TECHS).filter(function (k) { return (D.TECHS[k].req || []).indexOf(id) >= 0; });
    let html = '<div id="techDetail" class="techDetail" data-info="tech:' + id + '"><div class="row"><h3 class="grow">' + esc(t.name) + '</h3>' +
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
    SW.ui.techView.zoom = U.clamp(SW.ui.techView.zoom * factor, 0.55, 2.4);
  }

  function branchRank(branch) {
    const order = { logistics: 1, core: 2, frontier: 3, vanguard: 4, scourge: 5, doctrine: 6 };
    return order[branch] || 99;
  }

  function techPathHtml(id) {
    const t = D.TECHS[id];
    const reqs = (t.req || []).map(function (r) { return D.TECHS[r] ? D.TECHS[r].name : r; });
    const unlocks = Object.keys(D.TECHS).filter(function (k) { return (D.TECHS[k].req || []).indexOf(id) >= 0; })
      .map(function (k) { return D.TECHS[k].name; });
    let html = '';
    if (reqs.length) html += '<div class="sub">requires: ' + esc(reqs.join(', ')) + '</div>';
    if (unlocks.length) html += '<div class="sub">unlocks: ' + esc(unlocks.join(', ')) + '</div>';
    if (t.group === 'doctrine') html += '<div class="sub">synergy: one doctrine per run; its branch researches 25% cheaper.</div>';
    return html;
  }

  function drawTechTree(canvas, s, tree, opts) {
    if (!canvas) return;
    opts = opts || {};
    const Wd = canvas.clientWidth || 300;
    const branches = tree.branches;
    const maxTier = 4;
    const rowH = opts.large ? 82 : 56;
    const layoutW = opts.large ? Math.max(Wd * 1.35, 900) : Wd;
    const colW = layoutW / branches.length;
    const Hd = (maxTier + 1) * rowH + (opts.large ? 44 : 16);
    const viewH = opts.large ? (canvas.clientHeight || 520) : Hd;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Wd * dpr; canvas.height = viewH * dpr;
    canvas.style.height = opts.large ? '100%' : Hd + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const view = opts.large ? SW.ui.techView : { x: 0, y: 0, zoom: 1 };
    const z = view.zoom || 1;
    function tx(x) { return opts.large ? x * z + view.x : x; }
    function ty(y) { return opts.large ? y * z + view.y : y; }
    const hits = [];
    const pos = {};
    for (const n of tree.nodes) {
      const x = n.col * colW + colW / 2 + (n.slots > 1 ? (n.slot - (n.slots - 1) / 2) * Math.min(colW / n.slots, 64) : 0);
      const y = n.tier * rowH + 26;
      pos[n.id] = { x: x, y: y, n: n };
    }
    // branch lanes make the expanded tree scannable while preserving the free panning canvas.
    if (opts.large) {
      branches.forEach(function (b, i) {
        ctx.fillStyle = i % 2 ? 'rgba(201,209,217,0.018)' : 'rgba(201,209,217,0.009)';
        ctx.fillRect(tx(i * colW), ty(0), colW * z, Hd * z);
        ctx.strokeStyle = 'rgba(110,118,129,0.08)';
        ctx.beginPath();
        ctx.moveTo(tx(i * colW), ty(0));
        ctx.lineTo(tx(i * colW), ty(Hd));
        ctx.stroke();
      });
    }
    // edges
    ctx.lineWidth = 1;
    for (const e of tree.edges) {
      const a = pos[e[0]], b = pos[e[1]];
      if (!a || !b) continue;
      ctx.strokeStyle = (a.n.owned && b.n.owned) ? 'rgba(201,209,217,0.5)' : a.n.owned ? 'rgba(201,209,217,0.3)' : 'rgba(110,118,129,0.18)';
      ctx.beginPath();
      ctx.moveTo(tx(a.x), ty(a.y + 9));
      ctx.bezierCurveTo(tx(a.x), ty(a.y + 26), tx(b.x), ty(b.y - 26), tx(b.x), ty(b.y - 10));
      ctx.stroke();
    }
    // branch headers
    ctx.font = (opts.large ? '9px' : '8px') + ' "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    branches.forEach(function (b, i) {
      ctx.fillStyle = 'rgba(110,118,129,0.8)';
      ctx.fillText(b.toUpperCase(), tx(i * colW + colW / 2), ty(9));
    });
    // nodes
    const accentCol = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#9bd6ea';
    for (const id in pos) {
      const p = pos[id], n = p.n;
      const r = 8;
      const visible = n.visible;
      const x = tx(p.x), y = ty(p.y);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (n.owned) { ctx.fillStyle = accentCol; ctx.fill(); }
      else if (n.available && visible) {
        ctx.strokeStyle = n.affordable ? accentCol : 'rgba(201,209,217,0.7)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(110,118,129,' + (visible ? 0.45 : 0.15) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = n.owned ? 'rgba(201,209,217,0.95)' : visible ? 'rgba(110,118,129,0.95)' : 'rgba(110,118,129,0.3)';
      ctx.font = (opts.large ? '9px' : '7.5px') + ' "Segoe UI", sans-serif';
      const words = n.name.split(' ');
      ctx.fillText(words.slice(0, 2).join(' ').slice(0, 14), x, y + r + 9);
      if (!n.owned && n.available && visible) {
        ctx.fillStyle = 'rgba(110,118,129,0.9)';
        ctx.fillText(n.cost + '◇', x, y - r - 3);
      }
      if (visible) hits.push({ x: x, y: y, r: opts.large ? 18 : 13, id: id });
    }
    techHits = hits;
    ctx.textAlign = 'left';
    canvas.onclick = function (e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      for (const h of hits) {
        if (Math.hypot(h.x - mx, h.y - my) <= h.r) {
          if (opts.large) {
            SW.ui.techView.selected = h.id;
            showTechTreeRich();
            return;
          }
          const r2 = A().research(st(), h.id);
          if (!r2.ok && r2.msg !== 'Not available yet.') SW.ui.toast({ kind: 'bad', text: r2.msg });
          SW.ui.refresh();
          return;
        }
      }
    };
    canvas.onmousemove = function (e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      for (const h of hits) {
        if (Math.hypot(h.x - mx, h.y - my) <= h.r) { SW.ui.renderInfobox({ kind: 'tech', id: h.id }); return; }
      }
    };
    if (opts.large) bindTechViewport(canvas);
  }

  function bindTechViewport(canvas) {
    let drag = null;
    canvas.onwheel = function (e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const old = SW.ui.techView.zoom;
      const next = U.clamp(old * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.55, 2.4);
      if (next === old) return;
      SW.ui.techView.x = mx - (mx - SW.ui.techView.x) * (next / old);
      SW.ui.techView.y = my - (my - SW.ui.techView.y) * (next / old);
      SW.ui.techView.zoom = next;
      showTechTreeRich();
    };
    canvas.onpointerdown = function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      drag = { x: e.clientX, y: e.clientY };
      if (canvas.setPointerCapture && e.pointerId !== undefined) canvas.setPointerCapture(e.pointerId);
    };
    canvas.onpointermove = function (e) {
      if (!drag) return;
      e.preventDefault();
      SW.ui.techView.x += e.clientX - drag.x;
      SW.ui.techView.y += e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      showTechTreeRich();
    };
    canvas.onpointerup = function (e) { if (e && e.preventDefault) e.preventDefault(); drag = null; };
    canvas.onpointerleave = function () { drag = null; };
  }

  m.renderTech = renderTech;
  m.showTechTree = showTechTree;
  m.showTechTreeRich = showTechTreeRich;
  m.techDetailHtml = techDetailHtml;
  m.zoomTechView = zoomTechView;
  return m;
})();
