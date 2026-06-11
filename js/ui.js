/* STARWEFT ui.js — dashboard, infobox, exchange, codex, modals. Browser only. */
var SW = globalThis.SW = globalThis.SW || {};

SW.ui = (function () {
  const U = SW.util, D = SW.data;
  const ui = {};

  let activeTab = 'fleet';
  ui.routeDraft = null;
  let mapMode = null;            // null | 'send' | 'route' | 'directive' | 'blitz' | 'embargo'
  let sendSellOnArrive = true;
  let directiveDraft = null;
  let lastRenderTick = -1;
  let editorOpen = false;
  let pinnedInfo = null;         // infobox fallback topic
  let exchangeComm = 'FOOD';
  let codexTab = 'ships', codexHull = 'sparrow';
  let techHits = [];             // tech canvas hitboxes
  ui.techView = { x: 0, y: 0, zoom: 1, selected: null };
  let livePortraits = [];        // [{canvas, spec}] animated

  function $(sel) { return document.querySelector(sel); }
  function st() { return SW.game.state; }
  function A() { return SW.game.actions; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function commName(c) { return D.COMMODITIES[c].icon + ' ' + D.COMMODITIES[c].name; }

  // ============ boot ============
  ui.init = function () {
    document.addEventListener('click', dispatch);
    document.addEventListener('change', dispatchChange);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', function (e) { simKeys(e, false); });
    document.addEventListener('mouseover', onHoverInfo);
    document.addEventListener('pointerdown', function () { SW.audio.ensure(); }, { once: true });

    document.querySelectorAll('#dockTabs button').forEach(function (b) {
      b.addEventListener('click', function () { ui.setTab(b.dataset.tab); });
    });
    $('#spdPause').addEventListener('click', function () { A().togglePause(st()); syncSpeedButtons(); });
    $('#spd1').addEventListener('click', function () { A().setSpeed(st(), 1); syncSpeedButtons(); });
    $('#spd3').addEventListener('click', function () { A().setSpeed(st(), 3); syncSpeedButtons(); });
    $('#spd10').addEventListener('click', function () { A().setSpeed(st(), 10); syncSpeedButtons(); });
    $('#btnMute').addEventListener('click', function () {
      const m = SW.audio.toggleMute();
      $('#btnMute').style.opacity = m ? 0.35 : 1;
    });
    $('#btnMusic').addEventListener('click', function () {
      SW.audio.ensure();
      const m = SW.audio.toggleMusic();
      $('#btnMusic').style.opacity = m ? 0.35 : 1;
    });
    $('#btnMenu').addEventListener('click', function () { showMenu(); });
    $('#btnCodex').addEventListener('click', function () { showCodex(); });
    $('#btnExchange').addEventListener('click', function () { toggleExchange(); });
    $('#btnBackGalaxy').addEventListener('click', function () { ui.exitSystem(); });
    if (SW.audio.muted) $('#btnMute').style.opacity = 0.35;
    if (SW.audio.musicMuted) $('#btnMusic').style.opacity = 0.35;

    // search
    const sb = $('#searchBox');
    sb.addEventListener('input', renderSearch);
    sb.addEventListener('focus', renderSearch);
    sb.addEventListener('blur', function () { setTimeout(function () { $('#searchResults').classList.add('hidden'); }, 180); });
    sb.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const first = $('#searchResults .sr');
        if (first && first.dataset.sys !== undefined) jumpToSystem(parseInt(first.dataset.sys, 10));
        sb.blur();
      }
      e.stopPropagation();
    });

    setInterval(refreshTick, 300);
    requestAnimationFrame(portraitLoop);
  };

  function refreshTick() {
    const s = st();
    if (!s) return;
    renderTopbar();
    SW.audio.updateMood(s);
    const focused = document.activeElement && (document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'INPUT');
    if (!focused && s.tick !== lastRenderTick) {
      lastRenderTick = s.tick;
      renderSysPanel();
      renderShipChip();
      renderCommandBar();
      renderDock(false);
      if (!$('#exchange').classList.contains('hidden')) renderExchange();
      renderInfobox(null);
    }
  }
  ui.refresh = function () { lastRenderTick = -1; renderTopbar(); renderSysPanel(); renderShipChip(); renderCommandBar(); renderDock(true); renderInfobox(null); };
  ui.setTab = function (tab) {
    activeTab = tab;
    document.querySelectorAll('#dockTabs button').forEach(function (x) { x.classList.toggle('active', x.dataset.tab === tab); });
    renderDock(true);
  };

  // ============ portrait animation loop ============
  let lastPortraitDraw = 0;
  function portraitLoop(now) {
    requestAnimationFrame(portraitLoop);
    if (now - lastPortraitDraw < 65) return; // ~15fps is plenty for blinking faces
    lastPortraitDraw = now;
    livePortraits = livePortraits.filter(function (p) { return p.canvas.isConnected; });
    for (const p of livePortraits) {
      try { SW.portraits.draw(p.canvas, p.spec, now); } catch (e) {}
    }
    const shipCv = document.getElementById('codexShipCanvas');
    if (shipCv && shipCv.isConnected) { try { SW.codex.drawShip(shipCv, codexHull, now); } catch (e) {} }
    const sigCv = document.getElementById('sigilPreview');
    if (sigCv && sigCv.isConnected) {
      const hue = parseInt(($('#idHue') || { value: 195 }).value, 10);
      try { SW.portraits.drawSigil(sigCv.getContext('2d') && sigCv.getContext('2d').clearRect(0, 0, sigCv.width, sigCv.height) || sigCv.getContext('2d'), sigCv.width, ui._sigilSeed || 7, now, hue); } catch (e) {}
    }
  }
  function addPortrait(canvas, spec) { livePortraits.push({ canvas: canvas, spec: spec }); }

  // ============ topbar ============
  function renderTopbar() {
    const s = st();
    $('#stCredits').textContent = U.fmt(s.credits);
    $('#stResearch').textContent = U.fmt(Math.floor(s.research));
    $('#stFleet').textContent = s.ships.length;
    $('#stTick').textContent = s.tick;
    const inf = Math.floor(s.infamy || 0);
    $('#stInfamyWrap').style.display = inf > 0 ? '' : 'none';
    $('#stInfamy').textContent = inf;
    $('#btnExchange').disabled = !SW.tech.has(s, 'exchange');
    syncSpeedButtons();
    const threatened = s.systems.filter(function (x) { return x.scourge === 1 && x.discovered; });
    const stranded = s.ships.filter(function (x) { return x.stranded; });
    const expiring = s.contracts.filter(function (c) { return c.deadline - s.tick < 80; });
    let html = '';
    if (threatened.length) html += '<div class="alert" data-act="jumpThreat">⚠ ' + threatened.length + ' THREATENED</div>';
    if (stranded.length) html += '<div class="alert" data-act="jumpStranded">⛽ ' + stranded.length + ' STRANDED</div>';
    if (expiring.length) html += '<div class="alert" data-act="openOps">⌛ CONTRACT</div>';
    $('#alerts').innerHTML = html;
    $('#objective span').textContent = s.story.objective || '…';
  }
  function syncSpeedButtons() {
    const s = st();
    $('#spdPause').classList.toggle('active', s.paused);
    $('#spd1').classList.toggle('active', !s.paused && s.speed === 1);
    $('#spd3').classList.toggle('active', !s.paused && s.speed === 3);
    $('#spd10').classList.toggle('active', !s.paused && s.speed === 10);
  }

  // ============ search ============
  function renderSearch() {
    const s = st();
    const q = $('#searchBox').value.trim().toLowerCase();
    const box = $('#searchResults');
    let html = '';
    let matches;
    if (!q) {
      matches = (s.bookmarks || []).map(function (id) { return s.systems[id]; });
      if (matches.length) html += '<div class="sr" style="pointer-events:none"><span class="dim">BOOKMARKS</span></div>';
    } else {
      matches = s.systems.filter(function (x) { return x.discovered && x.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 9);
    }
    for (const sys of matches) {
      html += '<div class="sr" data-sys="' + sys.id + '">' + esc(sys.name) +
        ' <span class="dim">' + D.SYS_TYPES[sys.type].name + ' · ' + U.fmt1(U.dist(sys, s.systems[s.homeId])) + ' ly</span></div>';
    }
    if (!html) html = '<div class="sr"><span class="dim">no charted matches</span></div>';
    box.innerHTML = html;
    box.classList.remove('hidden');
    box.querySelectorAll('.sr[data-sys]').forEach(function (el) {
      el.addEventListener('click', function () { jumpToSystem(parseInt(el.dataset.sys, 10)); });
    });
  }
  function jumpToSystem(id) {
    ui.exitSystem();
    SW.render.centerOn(id);
    SW.render.selectedSys = id;
    $('#searchResults').classList.add('hidden');
    $('#searchBox').value = '';
    ui.refresh();
  }

  // ============ infobox (the ever-present explainer) ============
  const UI_TOPICS = {
    credits: { title: 'CREDITS ¤', sub: 'currency', lines: ['Earned by selling where prices run high. Spent on ships, buildings, upkeep, and apologies.'] },
    research: { title: 'RESEARCH ◇', sub: 'progress', lines: ['Generated by prosperous population centers and surveys. Spent in the Tech tree.'] },
    fleet: { title: 'FLEET ▲', sub: 'ships', lines: ['Your hulls. Buy more at Sol or Industrial hubs. Idle ships are wasted ships.'] },
    infamy: { title: 'INFAMY ☠', sub: 'reputation', lines: ['Raiding raises it. At ' + D.TUNE.infamyBlackMarket + '+ the Reach\'s black markets open to you; at 5+ the Vigil starts collecting.'] },
  };
  function renderInfobox(topic) {
    const s = st();
    const box = $('#infobox');
    const t = topic || pinnedInfo;
    let info = null;
    if (t) {
      info = t.kind === 'ui' ? UI_TOPICS[t.id] : SW.codex.describe(s, t);
    }
    if (!info) {
      info = {
        title: s && s.identity ? s.identity.name : 'STARWEFT', sub: 'hover anything to learn about it',
        lines: ['Drag: orbit · Shift-drag: pan · Wheel: zoom · Double-click: enter a system.', s && s.identity ? '"' + s.identity.motto + '"' : ''],
      };
    }
    let html = '<div class="ib-sub">' + esc(info.sub || '') + '</div>';
    html += '<div class="ib-title">' + esc(info.title || '') + '</div>';
    for (const line of (info.lines || [])) if (line) html += '<div class="ib-line">' + esc(line) + '</div>';
    box.innerHTML = html;
  }
  function onHoverInfo(e) {
    const el = e.target.closest ? e.target.closest('[data-info]') : null;
    if (!el) return;
    const parts = el.dataset.info.split(':');
    renderInfobox({ kind: parts[0], id: parts.length > 2 ? parts.slice(1).join(':') : parts[1] });
  }
  ui.pinInfo = function (topic) { pinnedInfo = topic; renderInfobox(null); };

  // ============ map callbacks (render.js) ============
  ui.mapClick = function (sys) {
    const s = st();
    SW.audio.sfx('click');
    if (mapMode && !sys) { if (mapMode !== 'route') setMapMode(null); return; }
    if (mapMode === 'send' && sys) {
      const ship = selectedShip();
      if (ship) {
        const r = A().shipSend(s, ship.id, sys.id, sendSellOnArrive);
        toast(r.ok ? { kind: 'info', text: ship.name + ' → ' + sys.name + (sendSellOnArrive ? ' (sell on arrival)' : '') } : { kind: 'bad', text: r.msg });
      }
      setMapMode(null); ui.refresh(); return;
    }
    if (mapMode === 'route' && sys) {
      if (!sys.discovered) { toast({ kind: 'bad', text: 'Uncharted system.' }); return; }
      ui.routeDraft.push({ sys: sys.id, action: SW.tech.has(s, 'smartroutes') ? 'smart' : (ui.routeDraft.length % 2 === 0 ? 'buy' : 'sell'), c: defaultBuy(sys) });
      renderDock(true); return;
    }
    if (mapMode === 'directive' && sys) {
      if (directiveDraft) {
        const r = A().createDirective(s, sys.id, directiveDraft.c, directiveDraft.target);
        toast(r.ok ? { kind: 'good', text: 'Directive: keep ' + sys.name + ' stocked with ' + commName(directiveDraft.c) } : { kind: 'bad', text: r.msg });
      }
      directiveDraft = null; setMapMode(null); ui.refresh(); return;
    }
    if (mapMode === 'blitz' && sys) { const r = A().blitz(s, sys.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); setMapMode(null); ui.refresh(); return; }
    if (mapMode === 'embargo' && sys) { const r = A().embargo(s, sys.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); setMapMode(null); ui.refresh(); return; }

    SW.render.selectedSys = sys ? sys.id : null;
    if (sys) {
      pinnedInfo = { kind: 'system', id: sys.id };
      const here = s.ships.filter(function (sh) { return sh.at === sys.id; });
      if (here.length && !selectedShip()) SW.render.selectedShip = here[0].id;
    } else pinnedInfo = null;
    ui.refresh();
  };
  ui.mapHover = function (sys) {
    renderInfobox(sys ? { kind: 'system', id: sys.id } : null);
  };
  ui.bodyClick = function (body) {
    SW.render.selectedBody = body || null;
    if (body) { pinnedInfo = { kind: 'body', body: body }; renderInfobox(null); }
    renderSysPanel(); // body selection drives the sites section
  };
  ui.bodyHover = function (body) {
    renderInfobox(body ? { kind: 'body', body: body } : null);
  };
  ui.enterSystem = function (sysId) {
    SW.render.enterSystem(sysId);
    $('#btnBackGalaxy').classList.remove('hidden');
  };
  ui.exitSystem = function () {
    SW.render.exitSystem();
    $('#btnBackGalaxy').classList.add('hidden');
  };

  function defaultBuy(sys) {
    let best = null, bestStock = 0;
    for (const c in sys.prod) if ((sys.stocks[c] || 0) > bestStock) { best = c; bestStock = sys.stocks[c]; }
    return best || 'ORE';
  }
  function setMapMode(mode, hint) {
    mapMode = mode;
    $('#map').classList.toggle('picking', !!mode);
    const h = $('#mapHint');
    if (mode && hint) { h.textContent = hint; h.classList.remove('hidden'); }
    else h.classList.add('hidden');
    SW.render.showRange = (mode === 'route');
  }

  // ============ system panel ============
  function renderSysPanel() {
    const s = st(), panel = $('#sysPanel');
    const sysId = SW.render.selectedSys;
    if (sysId === null || sysId === undefined || !s.systems[sysId]) { panel.classList.add('hidden'); return; }
    const sys = s.systems[sysId];
    panel.classList.remove('hidden');
    if (!sys.discovered) {
      panel.innerHTML = '<h3>UNCHARTED</h3><div class="sub">A silhouette on old light. Send a probe.</div>';
      return;
    }
    const marked = (s.bookmarks || []).indexOf(sys.id) >= 0;
    let html = '<div class="row"><h3 class="grow" data-info="system:' + sys.id + '">' + esc(sys.name) + (sys.id === s.homeId ? ' <span class="tag acc">HOME</span>' : '') + '</h3>' +
      '<button data-act="bookmark" title="Bookmark">' + (marked ? '◈' : '◇') + '</button>' +
      '<button data-act="focusSys" title="Center camera here (F)">◎</button>' +
      '<button data-act="enterSys" title="Orbital view (double-click on map)">⊙ view</button></div>';
    html += '<div class="sub">' + esc(sys.spec) + ' · ' + D.SYS_TYPES[sys.type].name +
      (sys.ideology !== 'free' ? ' · <span data-info="faction:' + sys.ideology + '">' + D.IDEOLOGIES[sys.ideology].name + '</span>' : '') +
      (sys.region ? ' · <span data-info="region:' + sys.region + '">' + D.REGIONS[sys.region].name + '</span>' : '') + '</div>';
    if (!sys.surveyed) html += '<div class="sub">Unsurveyed — idle a scout here to chart its worlds' + (sys.surveyProg ? ' (' + Math.round(100 * sys.surveyProg / D.TUNE.surveyTicks) + '%)' : '') + '.</div>';
    if (SW.tech.has(s, 'driftholds') && sys.id !== s.homeId && sys.surveyed && sys.scourge !== 2) {
      html += '<div class="row"><button data-act="relocate" ' + (s.credits < D.TUNE.relocateCost ? 'disabled' : '') +
        ' title="Move the Home anchorage here. The command web re-centers; the Scourge loses your scent.">⚓ relocate home (' + U.fmt(D.TUNE.relocateCost) + '¤)</button></div>';
    }

    if (sys.scourge === 2) {
      html += '<div class="listItem bad"><span style="color:var(--danger)">† Corrupted.</span> <span class="sub">' +
        (sys.id === s.scourge.originId ? 'The origin. Deliver ' + D.TUNE.panaceaToWin + ' Panacea here (' + s.scourge.delivered + ' so far).' : 'Impassable without Inoculated Hulls.') + '</span></div>';
      panel.innerHTML = html;
      return;
    }
    if (sys.scourge === 1) {
      html += '<div class="listItem bad"><span style="color:var(--danger)">⚠ Scourge in ' + Math.max(0, sys.threatAt - s.tick) + ' ticks.</span><div class="sub">Evacuate. A ship with ' + D.TUNE.panaceaToInoculate + ' Panacea can inoculate.</div></div>';
    }
    if (sys.pop > 0) {
      const cls = sys.prosperity > 60 ? 'hi' : sys.prosperity > 35 ? '' : 'lo';
      html += '<div class="row"><span class="sub">POP ' + U.fmt1(sys.pop) + 'M</span><div class="bar"><div class="' + cls + '" style="width:' + Math.round(sys.prosperity) + '%"></div></div><span class="sub num">' + Math.round(sys.prosperity) + '%</span></div>';
    }
    const pres = Object.keys(sys.presence).filter(function (f) { return sys.presence[f] > 0.2; });
    if (pres.length) {
      const dom = SW.economy.dominant(sys);
      html += '<div class="row">';
      for (const f of pres) {
        const name = f === 'player' ? 'YOU' : (s.rivals.find(function (r) { return r.id === f; }) || { name: f }).name;
        html += '<span class="tag' + (f === 'player' ? ' acc' : '') + '"' + (f !== 'player' ? ' data-info="rival:' + f + '"' : '') + '>' + esc(name) + (dom === f ? ' ★' : '') + ' ' + sys.presence[f].toFixed(1) + '</span>';
      }
      html += '</div>';
    }

    // market
    const ship = selectedShip();
    const shipHere = ship && ship.mode === 'idle' && ship.at === sys.id;
    const canFetch = ship && ship.mode === 'idle' && !shipHere; // FETCH: one-click gather-and-deliver
    html += '<h4>Market</h4><table class="mkt"><tr><th>good</th><th>stock</th><th>price</th><th>Δ</th>' + (shipHere || canFetch ? '<th></th>' : '') + '</tr>';
    for (const c of D.COMM_IDS) {
      if (D.COMMODITIES[c].locked && !SW.tech.has(s, 'panacea')) continue;
      const stock = Math.floor(sys.stocks[c] || 0);
      if (stock === 0 && !(sys.cons[c] > 0) && !shipHere) continue;
      const price = SW.economy.price(s, sys, c);
      const ratio = price / D.COMMODITIES[c].base;
      // deal colors: green = buy here, orange = sell here
      const pcol = ratio < 0.8 ? '#7fe0a8' : ratio > 1.35 ? '#ffb070' : 'var(--ink-dim)';
      const hist = sys.hist && sys.hist[c];
      let trend = '·';
      if (hist && hist.length > 3) {
        const old = hist[Math.max(0, hist.length - 4)];
        trend = price > old * 1.06 ? '↑' : price < old * 0.94 ? '↓' : '·';
      }
      html += '<tr data-info="commodity:' + c + '"><td>' + commName(c) + '</td><td>' + stock + '</td><td style="color:' + pcol + '">' + Math.round(price) + '</td><td>' + trend + '</td>';
      if (shipHere) {
        html += '<td><button data-act="buy" data-c="' + c + '" data-q="5">+5</button> <button data-act="buy" data-c="' + c + '" data-q="999">max</button> ' +
          ((ship.cargo[c] || 0) > 0 ? '<button data-act="sellc" data-c="' + c + '">sell</button>' : '') + '</td>';
      } else if (canFetch) {
        html += '<td><button data-act="fetchHere" data-c="' + c + '" title="Order ' + esc(ship.name) + ': buy ' + D.COMMODITIES[c].name + ' at the cheapest charted source, deliver it here">⇄ fetch</button></td>';
      }
      html += '</tr>';
    }
    html += '</table>';

    // depot
    if (sys.depot) {
      const items = Object.keys(sys.depot).filter(function (c) { return sys.depot[c] > 0.5; });
      html += '<h4>Depot</h4>';
      if (!items.length) html += '<div class="sub">Empty. Routes can drop goods here; builds consume from it.</div>';
      for (const c of items) {
        html += '<div class="row"><span class="grow">' + commName(c) + ' × ' + Math.floor(sys.depot[c]) + '</span>' +
          (shipHere ? '<button data-act="depotTake" data-c="' + c + '">load</button>' : '') + '</div>';
      }
      if (shipHere && SW.ships.cargoTotal(ship) > 0) {
        html += '<div class="row"><span class="sub grow">drop:</span>';
        for (const c in ship.cargo) html += '<button data-act="depotDrop" data-c="' + c + '">' + D.COMMODITIES[c].icon + '</button>';
        html += '</div>';
      }
    }

    // construction
    const builds = Object.keys(D.BUILDINGS).filter(function (b) {
      const def = D.BUILDINGS[b];
      if (sys.buildings.indexOf(b) >= 0) return false;
      if (def.tech && !SW.tech.has(s, def.tech)) return false;
      if (def.onlyType === 'producer' && Object.keys(sys.prod).length === 0) return false;
      if (def.onlyType === 'pop' && !(sys.pop > 0 && sys.type === 'pop')) return false;
      if (def.onlyWonder && sys.wonder !== def.onlyWonder) return false;
      return true;
    });
    if (sys.buildings.length || builds.length) html += '<h4>Construction</h4>';
    if (sys.buildings.length) {
      html += '<div class="row">' + sys.buildings.map(function (b) {
        return '<span class="tag acc" data-info="building:' + b + '">' + D.BUILDINGS[b].icon + ' ' + D.BUILDINGS[b].name + '</span>';
      }).join('') + '</div>';
    }
    for (const b of builds) {
      const def = D.BUILDINGS[b];
      const localShips = s.ships.filter(function (sh) { return sh.at === sys.id && sh.mode === 'idle'; });
      let missing = [];
      for (const c in def.mats) {
        let have = (sys.depot ? (sys.depot[c] || 0) : 0);
        for (const sh of localShips) have += sh.cargo[c] || 0;
        if (have < def.mats[c]) missing.push({ c: c, need: Math.ceil(def.mats[c] - have) });
      }
      const bCost = SW.game.buildingCost(s, b);
      html += '<div class="listItem" data-info="building:' + b + '"><div class="row"><span class="title grow">' + def.icon + ' ' + def.name + '</span>' +
        '<button data-act="build" data-b="' + b + '" ' + (missing.length || s.credits < bCost ? 'disabled' : '') + '>build</button></div>' +
        '<div class="sub num">' + U.fmt(bCost) + '¤ + ' + Object.keys(def.mats).map(function (c) { return def.mats[c] + ' ' + D.COMMODITIES[c].icon; }).join(' + ') + '</div>';
      if (missing.length) {
        html += '<div class="row"><span class="sub">missing:</span>' + missing.map(function (m) {
          return '<span class="tag">' + m.need + ' ' + D.COMMODITIES[m.c].icon + '</span><button data-act="supply" data-c="' + m.c + '" data-q="' + m.need + '">supply</button>';
        }).join('') + '</div>';
      }
      html += '</div>';
    }

    // in-system sites: facilities anchored to bodies (governor layer)
    if (sys.sites && sys.sites.length) {
      html += '<h4>Sites</h4><div class="row">' + sys.sites.map(function (site) {
        const f = D.FACILITIES[site.fac];
        return '<span class="tag acc" title="' + esc(site.body) + ' — ' + esc(f.name) + '">' + f.icon + ' ' + esc(site.body) + '</span>';
      }).join('') + '</div>';
    }
    const selBody = (SW.render.mode === 'system' && SW.render.systemId === sys.id) ? SW.render.selectedBody : null;
    if (selBody && sys.surveyed && sys.scourge !== 2) {
      const opts = SW.sites.options(s, sys, selBody);
      const cur = SW.sites.at(sys, selBody.name);
      if (cur || opts.length) {
        html += '<h4>' + esc(selBody.name) + '</h4>';
        if (cur) {
          const cf = D.FACILITIES[cur.fac];
          html += '<div class="sub">' + cf.icon + ' ' + cf.name + ' anchored here.</div>';
        }
        for (const fid of opts) {
          const f = D.FACILITIES[fid];
          const fCost = SW.sites.costOf(s, fid);
          html += '<div class="listItem"><div class="row"><span class="title grow">' + f.icon + ' ' + f.name + '</span>' +
            '<button data-act="buildSite" data-fac="' + fid + '" data-body="' + esc(selBody.name) + '" ' + (s.credits < fCost ? 'disabled' : '') + '>build</button></div>' +
            '<div class="sub num">' + U.fmt(fCost) + '¤ + ' + Object.keys(f.mats).map(function (c) { return f.mats[c] + ' ' + D.COMMODITIES[c].icon; }).join(' + ') + ' · ' + esc(f.desc) + '</div></div>';
        }
      }
    }

    // shipyard
    if (sys.id === s.homeId || sys.type === 'industrial') {
      html += '<h4>Shipyard</h4>';
      for (const h in D.HULLS) {
        const hull = D.HULLS[h];
        if (hull.tech && !SW.tech.has(s, hull.tech)) continue;
        const cost = SW.ships.hullCost(s, h);
        html += '<div class="row" data-info="hull:' + h + '"><span class="grow">' + hull.glyph + ' ' + hull.name + ' <span class="sub">cap ' + hull.cap + (hull.power ? ' · pwr ' + hull.power : '') + (hull.survey ? ' · survey' : '') + '</span></span>' +
          '<button data-act="buyShip" data-h="' + h + '" ' + (s.credits < cost ? 'disabled' : '') + ' class="num">' + U.fmt(cost) + '</button></div>';
      }
    }
    const here = s.ships.filter(function (sh) { return sh.at === sys.id; });
    if (here.length) {
      html += '<h4>Ships here</h4>';
      for (const sh of here) {
        html += '<div class="row" data-info="ship:' + sh.id + '"><span class="grow">' + D.HULLS[sh.hull].glyph + ' ' + esc(sh.name) + '</span><button data-act="selShip" data-id="' + sh.id + '">select</button></div>';
      }
    }
    panel.innerHTML = html;
  }

  // ============ ship chip ============
  function selectedShip() {
    const s = st();
    if (!s || !SW.render.selectedShip) return null;
    return s.ships.find(function (x) { return x.id === SW.render.selectedShip; }) || null;
  }
  function renderShipChip() {
    const s = st(), chip = $('#shipChip');
    const ship = selectedShip();
    if (!ship) { chip.classList.add('hidden'); return; }
    chip.classList.remove('hidden');
    const hull = D.HULLS[ship.hull];
    let status;
    if (ship.mode === 'travel') status = '→ ' + esc(s.systems[ship.leg.to].name) + ' · ETA ' + Math.max(0, ship.leg.arrive - s.tick);
    else if (ship.routeId) { const r = s.routes.find(function (x) { return x.id === ship.routeId; }); status = '↻ ' + esc(r ? r.name : 'route'); }
    else if (ship.directiveId) status = '◎ directive';
    else if (ship.mission && ship.mission.kind === 'supply') status = '▢ supply run';
    else status = 'idle · ' + esc(ship.at !== null ? s.systems[ship.at].name : '?');

    let html = '<div class="row" data-info="ship:' + ship.id + '"><span class="title grow">' + hull.glyph + ' ' + esc(ship.name) + '</span><span class="sub">' + hull.name + '</span>' +
      '<button data-act="deselShip">✕</button></div>';
    html += '<div class="sub">' + status + ' · hold ' + SW.ships.cargoTotal(ship) + '/' + SW.ships.cap(s, ship) +
      (hull.power ? ' · pwr ' + SW.combat.power(s, ship) : '') +
      (ship.stranded ? ' · <span style="color:var(--danger)">stranded</span>' : '') + '</div>';
    const cargo = Object.keys(ship.cargo);
    const chipDataV = SW.ships.dataValue(ship);
    if (cargo.length || chipDataV > 0) {
      html += '<div class="row">' + cargo.map(function (c) {
        return '<span class="tag" data-info="commodity:' + c + '">' + D.COMMODITIES[c].icon + ' ' + Math.floor(ship.cargo[c]) + '</span>';
      }).join('') +
      (chipDataV > 0 ? '<span class="tag acc" title="Unsold cartography data — worth ' + U.fmt(chipDataV) + '¤ at a populated port, lost if the ship is.">◈ ' + U.fmt(chipDataV) + '¤</span>' : '') + '</div>';
    }
    chip.innerHTML = html; // the chip is status + cargo; all commands live in the command bar
  }

  function renderCommandBar() {
    const s = st(), bar = $('#commandBar');
    if (!bar) return;
    const ship = selectedShip();
    if (!ship) { bar.classList.add('hidden'); bar.innerHTML = ''; return; }
    const hull = D.HULLS[ship.hull];
    let status;
    if (ship.mode === 'travel') status = 'en route to ' + esc(s.systems[ship.leg.to].name) + ' / ETA ' + Math.max(0, ship.leg.arrive - s.tick);
    else if (ship.routeId) {
      const route = s.routes.find(function (x) { return x.id === ship.routeId; });
      status = 'route / ' + esc(route ? route.name : 'unknown');
    } else if (ship.directiveId) status = 'directive';
    else if (ship.mission && ship.mission.kind === 'supply') status = 'supply run';
    else status = ship.at !== null ? 'holding at ' + esc(s.systems[ship.at].name) : 'in transit';
    // the "why" line: orders are always visible, never opaque
    const queue = ship.queue || [];
    if (queue.length) {
      status = esc(ship.queueNote || 'orders') + ' · ' + esc(SW.ships.describeCmd(s, queue[0])) + ' · ' + queue.length + ' step' + (queue.length === 1 ? '' : 's') + ' left';
    }
    const load = SW.ships.cargoTotal(ship) + '/' + SW.ships.cap(s, ship);
    const idle = ship.mode === 'idle';
    const sys = idle && ship.at !== null ? s.systems[ship.at] : null;
    const following = SW.render.followShip === ship.id;
    let html = '<div class="cmdTitle">COMMAND</div>' +
      '<div class="cmdUnit" data-info="ship:' + ship.id + '"><b>' + hull.glyph + ' ' + esc(ship.name) + '</b>' +
      '<span>' + esc(hull.name) + '</span><span class="num">' + load + '</span><span>' + status + '</span></div>' +
      '<div class="cmdActions">' +
      '<button class="primary" data-act="sendMode" ' + (idle ? '' : 'disabled') + '>SEND</button>' +
      '<label class="sub" style="cursor:pointer"><input type="checkbox" id="chkSellArrive" ' + (sendSellOnArrive ? 'checked' : '') + '> sell on arrival</label>' +
      '<button data-act="focusShip" data-id="' + ship.id + '">FOCUS</button>' +
      '<button data-act="followShip" class="' + (following ? 'primary' : '') + '" title="Camera shadows this ship (pan to break off)">' + (following ? 'FOLLOWING' : 'FOLLOW') + '</button>';
    if (hull.survey) {
      html += '<button data-act="autoExplore" class="' + (ship.autoExplore ? 'primary' : '') + '" ' + (idle ? '' : 'disabled') + '>' + (ship.autoExplore ? 'AUTO ON' : 'AUTO EXPLORE') + '</button>';
    }
    if (idle && s.routes.length && !ship.routeId) {
      html += '<select id="selAssignRoute"><option value="">route…</option>' + s.routes.map(function (r) {
        return '<option value="' + r.id + '">' + esc(r.name) + '</option>';
      }).join('') + '</select>';
    }
    if (queue.length) html += '<button data-act="clearQueue" title="Cancel the current orders">✕ ORDERS</button>';
    if (ship.routeId || ship.directiveId || ship.mission) html += '<button data-act="unassign">RELEASE</button>';
    const dataV = SW.ships.dataValue(ship);
    if (sys && dataV > 0 && sys.type === 'pop') {
      html += '<button class="primary" data-act="sellData" title="Sell cartography data to the local Cartographer">◈ SELL DATA (+' + U.fmt(dataV) + '¤)</button>';
    }
    if (sys && SW.combat.power(s, ship) >= 3 && sys.id !== s.homeId && sys.scourge !== 2) {
      const cd = Math.max(0, (ship.raidCooldownUntil || 0) - s.tick);
      html += '<button class="danger" data-act="raidHere" ' + (cd ? 'disabled' : '') + ' title="Raid this system\'s commerce. Infamy will follow.">☠ RAID' + (cd ? ' (' + cd + ')' : '') + '</button>';
    }
    if (sys && sys.id === s.scourge.originId && (ship.cargo.PANACEA || 0) > 0) {
      html += '<button class="primary" data-act="deliverPanacea">✺ DELIVER PANACEA</button>';
    }
    if (sys && sys.scourge === 1 && (ship.cargo.PANACEA || 0) >= D.TUNE.panaceaToInoculate) {
      html += '<button class="primary" data-act="inoculate">✚ INOCULATE</button>';
    }
    if (idle) html += '<button data-act="scrap" title="Scrap for 50%">SCRAP</button>';
    html += '<button data-act="deselShip">CLEAR</button></div>';
    bar.innerHTML = html;
    bar.classList.remove('hidden');
    const chk = $('#chkSellArrive');
    if (chk) chk.addEventListener('change', function () { sendSellOnArrive = chk.checked; });
    const sel = $('#selAssignRoute');
    if (sel) sel.addEventListener('change', function () { if (sel.value) { A().assignShip(s, ship.id, sel.value); ui.refresh(); } });
  }

  // ============ dock ============
  function renderDock(force) {
    const body = $('#dockBody');
    if (activeTab === 'fleet') renderFleet(body);
    else if (activeTab === 'routes') renderRoutes(body, force);
    else if (activeTab === 'ops') renderOps(body);
    else if (activeTab === 'tech') renderTech(body, force);
    else if (activeTab === 'log') renderLog(body);
  }

  function renderFleet(body) {
    const s = st();
    const idle = s.ships.filter(function (sh) { return sh.mode === 'idle' && !sh.routeId && !sh.directiveId && !sh.mission; });
    let html = '<div class="row"><span class="sub grow">' + s.ships.length + ' ships · ' + idle.length + ' idle</span>' +
      (SW.tech.has(s, 'autoyards') ? '<button data-act="yardsToggle" class="' + (s.autoYardsOff ? '' : 'primary') + '" title="Tessellation Yards: build haulers for unmanned routes, reclaim long-idle ones" data-info="tech:autoyards">yards: ' + (s.autoYardsOff ? 'off' : 'auto') + '</button>' : '') +
      (idle.length > 1 && s.story.flags.routes_unlocked ? '<button data-act="employAll" title="Assign idle cargo ships to routes (or spin one up from the best opportunity)">employ idle</button>' : '') + '</div>';
    if (!s.ships.length) html += '<div class="sub">No ships. Build a Sparrow at Sol while you still can.</div>';
    for (const ship of s.ships) {
      const hull = D.HULLS[ship.hull];
      let statusTxt;
      if (ship.mode === 'travel') statusTxt = '→ ' + esc(s.systems[ship.leg.to].name) + ' (' + Math.max(0, ship.leg.arrive - s.tick) + ')';
      else if (ship.routeId) { const r = s.routes.find(function (x) { return x.id === ship.routeId; }); statusTxt = '↻ ' + esc(r ? r.name : '?'); }
      else if (ship.directiveId) statusTxt = '◎ directive';
      else if (ship.mission && ship.mission.kind === 'supply') statusTxt = '▢ supply';
      else statusTxt = 'idle · ' + esc(s.systems[ship.at].name);
      const load = SW.ships.cargoTotal(ship);
      html += '<div class="listItem clicky" data-act="focusShip" data-id="' + ship.id + '" data-info="ship:' + ship.id + '">' +
        '<div class="row"><span class="title grow">' + hull.glyph + ' ' + esc(ship.name) + '</span><span class="sub">' + statusTxt + '</span></div>' +
        '<div class="row"><div class="bar"><div style="width:' + Math.round(100 * load / SW.ships.cap(s, ship)) + '%"></div></div><span class="sub num">' + load + '/' + SW.ships.cap(s, ship) + '</span></div>' +
        '</div>';
    }
    body.innerHTML = html;
  }

  function renderRoutes(body, force) {
    const s = st();
    if (editorOpen && !force) { updateProjection(); return; }
    let html = '';
    if (!s.story.flags.routes_unlocked) {
      body.innerHTML = '<div class="sub">Route automation is locked. Make a few manual deliveries — the Guild left you something.</div>';
      return;
    }
    if (editorOpen) {
      html += '<h4>New route — click systems on the map</h4>';
      if (!ui.routeDraft.length) html += '<div class="sub">Add 2+ stops. Classic: buy at a producer, sell at a hungry world.</div>';
      ui.routeDraft.forEach(function (stop, i) {
        const sys = s.systems[stop.sys];
        html += '<div class="listItem"><div class="row"><span class="title grow">' + (i + 1) + '. ' + esc(sys.name) + '</span>' +
          '<button data-act="draftRemove" data-i="' + i + '">✕</button></div>' +
          '<div class="row"><select data-roleidx="' + i + '" class="draftAction">' +
          '<option value="buy"' + (stop.action === 'buy' ? ' selected' : '') + '>buy</option>' +
          '<option value="sell"' + (stop.action === 'sell' ? ' selected' : '') + '>sell all</option>' +
          (SW.tech.has(s, 'smartroutes') ? '<option value="smart"' + (stop.action === 'smart' ? ' selected' : '') + '>smart (auto)</option>' : '') +
          (sys.depot ? '<option value="drop"' + (stop.action === 'drop' ? ' selected' : '') + '>drop → depot</option><option value="take"' + (stop.action === 'take' ? ' selected' : '') + '>take ← depot</option>' : '') +
          '</select>';
        if (stop.action === 'buy' || stop.action === 'take') {
          html += '<select data-cidx="' + i + '" class="draftComm">' + D.COMM_IDS.filter(function (c) { return !D.COMMODITIES[c].locked || SW.tech.has(s, 'panacea'); }).map(function (c) {
            return '<option value="' + c + '"' + (stop.c === c ? ' selected' : '') + '>' + D.COMMODITIES[c].name + '</option>';
          }).join('') + '</select>';
        }
        html += '</div></div>';
      });
      html += '<div class="row"><span class="sub grow num" id="projProfit"></span></div>';
      html += '<div class="row"><button class="primary" data-act="draftCreate" ' + (ui.routeDraft.length < 2 ? 'disabled' : '') + '>create</button>' +
        '<button data-act="draftCancel">cancel</button></div><hr class="thin">';
    } else {
      html += '<div class="row"><button class="primary" data-act="draftStart">＋ new route</button></div>';
      if (SW.tech.has(s, 'metaroutes')) {
        html += '<h4 data-info="tech:metaroutes">Weftworks</h4><div class="row"><span class="sub grow">weave a full supply chain:</span>' +
          D.RECIPES.filter(function (r) { return !r.playerFabOnly; }).map(function (r) {
            return '<button data-act="chainRoute" data-c="' + r.out + '" title="' +
              Object.keys(r.inputs).map(function (i) { return D.COMMODITIES[i].name; }).join(' + ') + ' → ' + D.COMMODITIES[r.out].name +
              ' → market">' + D.COMMODITIES[r.out].icon + ' ' + D.COMMODITIES[r.out].name + '</button>';
          }).join('') + '</div>';
      }
      if (SW.tech.has(s, 'analytics')) {
        html += '<h4>Opportunities</h4>';
        const ops = SW.economy.opportunities(s, 5, { onePerCommodity: true });
        if (!ops.length) html += '<div class="sub">Markets are calm. Suspiciously calm.</div>';
        for (const op of ops) {
          html += '<div class="row"><span class="grow sub">' + commName(op.c) + ' · ' + esc(s.systems[op.from].name) + ' → ' + esc(s.systems[op.to].name) +
            ' <b style="color:var(--accent)" class="num">+' + Math.round(op.margin) + '/u</b></span>' +
            '<button data-act="centerSys" data-id="' + op.from + '">◎</button>' +
            '<button data-act="fetchOp" data-from="' + op.from + '" data-to="' + op.to + '" data-c="' + op.c + '" title="One-shot fetch with an idle hauler">⤳</button>' +
            '<button data-act="quickRoute" data-from="' + op.from + '" data-to="' + op.to + '" data-c="' + op.c + '" title="Create this route">＋</button></div>';
        }
      }
    }
    for (const r of s.routes) {
      const stops = r.stops.map(function (stop) { return esc(s.systems[stop.sys].name.split(' ')[0]); }).join('→');
      html += '<div class="listItem"><div class="row"><span class="title grow">' + esc(r.name) + (r.paused ? ' <span class="tag">paused</span>' : '') + '</span>' +
        '<button data-act="routeAssignIdle" data-id="' + r.id + '" title="Assign all idle cargo ships">+idle</button>' +
        '<button data-act="routeDup" data-id="' + r.id + '" title="Duplicate">⧉</button>' +
        '<button data-act="routePause" data-id="' + r.id + '">' + (r.paused ? '▶' : '⏸') + '</button>' +
        '<button class="danger" data-act="routeDel" data-id="' + r.id + '">✕</button></div>' +
        '<div class="sub">' + stops + ' · ' + r.ships.length + ' ships · <span class="num">' + (r.totalProfit >= 0 ? '+' : '') + U.fmt(r.totalProfit) + '¤</span></div>' +
        '</div>';
    }
    if (SW.tech.has(s, 'directives')) {
      html += '<h4>Directives</h4>';
      html += '<div class="row"><select id="dirComm">' + D.COMM_IDS.filter(function (c) { return !D.COMMODITIES[c].locked || SW.tech.has(s, 'panacea'); }).map(function (c) {
        return '<option value="' + c + '">' + D.COMMODITIES[c].name + '</option>';
      }).join('') + '</select>' +
        '<input id="dirTarget" type="number" value="60" min="10" max="500" style="width:54px">' +
        '<button data-act="dirStart">＋ keep stocked…</button></div>';
      for (const d of s.directives) {
        html += '<div class="listItem"><div class="row"><span class="title grow">◎ ' + esc(s.systems[d.sys].name) + ' · ' + commName(d.c) + ' ≥ ' + d.target + '</span>' +
          '<button class="danger" data-act="dirDel" data-id="' + d.id + '">✕</button></div>' +
          '<div class="sub">' + s.ships.filter(function (sh) { return sh.directiveId === d.id; }).length + ' ships</div></div>';
      }
      const idleShips = s.ships.filter(function (sh) { return sh.mode === 'idle' && !sh.routeId && !sh.directiveId; });
      if (s.directives.length && idleShips.length) {
        html += '<div class="row"><select id="dirShip">' + idleShips.map(function (sh) { return '<option value="' + sh.id + '">' + esc(sh.name) + '</option>'; }).join('') + '</select>' +
          '<select id="dirPick">' + s.directives.map(function (d) { return '<option value="' + d.id + '">' + esc(s.systems[d.sys].name) + ' ' + D.COMMODITIES[d.c].icon + '</option>'; }).join('') + '</select>' +
          '<button data-act="dirAssign">assign</button></div>';
      }
    }
    body.innerHTML = html;
    updateProjection();
  }
  function updateProjection() {
    const el = $('#projProfit');
    if (!el || !ui.routeDraft || ui.routeDraft.length < 2) { if (el) el.textContent = ''; return; }
    const s = st();
    const ship = selectedShip();
    const hull = ship ? ship.hull : 'sparrow';
    const proj = SW.ships.projectRoute(s, ui.routeDraft, hull);
    el.textContent = 'projected ' + (proj.profit >= 0 ? '+' : '') + U.fmt(proj.profit) + '¤ / loop (' + D.HULLS[hull].name + ')';
    el.style.color = proj.profit > 0 ? 'var(--accent)' : 'var(--danger)';
  }

  // ============ ops tab ============
  function renderOps(body) {
    const s = st();
    let html = '';
    // contracts
    html += '<h4>Contracts</h4>';
    if (!s.contracts.length) html += '<div class="sub">The galaxy is quiet. It won\'t last.</div>';
    for (const ct of s.contracts) {
      const left = ct.deadline - s.tick;
      html += '<div class="listItem' + (left < 80 ? ' bad' : '') + '"><div class="row"><span class="title grow">' + esc(ct.label) + '</span>' +
        '<button data-act="centerSys" data-id="' + ct.sysId + '">◎</button></div>' +
        '<div class="sub num">' + (ct.kind === 'survey' ? 'survey it' : ct.progress + '/' + ct.qty) + ' · ' + left + ' ticks · ' + U.fmt(ct.reward.credits || 0) + '¤ + ' + (ct.reward.research || 0) + '◇</div></div>';
    }
    // blockades
    if (s.blockades.length) {
      html += '<h4>Blockades</h4>';
      s.blockades.forEach(function (bl, i) {
        const known = s.systems[bl.a].discovered || s.systems[bl.b].discovered;
        if (!known) return;
        const ship = selectedShip();
        const canBreak = ship && ship.mode === 'idle' && (ship.at === bl.a || ship.at === bl.b) && SW.combat.power(s, ship) >= 4;
        html += '<div class="listItem bad"><div class="row"><span class="title grow">⊘ ' + esc(s.systems[bl.a].name) + ' ↔ ' + esc(s.systems[bl.b].name) + '</span></div>' +
          '<div class="row"><span class="sub num grow">' + (bl.until - s.tick) + ' ticks · toll ' + U.fmt(bl.toll) + '¤</span>' +
          '<button data-act="payToll" data-i="' + i + '" ' + (s.credits < bl.toll ? 'disabled' : '') + '>pay</button>' +
          '<button class="danger" data-act="breakBlockade" data-i="' + i + '" ' + (canBreak ? '' : 'disabled') + ' title="Needs an armed, idle, selected ship at either end">⚔ break</button></div></div>';
      });
    }
    // operations
    html += '<h4>Operations</h4>';
    html += '<div class="row"><button data-act="blitzMode" ' + (s.credits < D.TUNE.blitzCost ? 'disabled' : '') + ' title="Presence gains ×3 at a system for ' + D.TUNE.blitzTicks + ' ticks">◎ trade blitz (' + U.fmt(D.TUNE.blitzCost) + ')</button>' +
      (SW.tech.has(s, 'diplomacy') ? '<button data-act="embargoMode" ' + (s.credits < D.TUNE.embargoCost ? 'disabled' : '') + ' title="Freeze rival expansion at a system">⊘ embargo (' + U.fmt(D.TUNE.embargoCost) + ')</button>' : '') + '</div>';
    if (s.ops.blitz) html += '<div class="sub">◎ blitz at ' + esc(s.systems[s.ops.blitz.sys].name) + ' — ' + (s.ops.blitz.until - s.tick) + ' ticks</div>';
    if (s.ops.embargo) html += '<div class="sub">⊘ embargo at ' + esc(s.systems[s.ops.embargo.sys].name) + ' — ' + (s.ops.embargo.until - s.tick) + ' ticks</div>';
    if (SW.tech.has(s, 'retainers')) {
      html += '<div class="row"><select id="retRegion">' + Object.keys(D.REGIONS).map(function (r) {
        return '<option value="' + r + '">' + D.REGIONS[r].name + '</option>';
      }).join('') + '</select><button data-act="hireRetainer">⛨ retainer (' + U.fmt(D.TUNE.retainerCost) + ')</button></div>';
      for (const ret of s.retainers) {
        html += '<div class="sub">⛨ patrol in ' + D.REGIONS[ret.region].name + ' — ' + (ret.until - s.tick) + ' ticks</div>';
      }
    }
    // rivals
    html += '<h4>Rival networks</h4>';
    for (const r of s.rivals) {
      const zone = SW.rivals.zone(s, r);
      html += '<div class="listItem" data-info="rival:' + r.id + '"><div class="row"><span class="title grow">' + esc(r.name) + '</span>' +
        (!r.alive ? '<span class="tag bad">' + (r.absorbed ? 'absorbed' : 'collapsed') + '</span>' : '') + '</div>';
      if (r.alive) {
        if (!r.met) html += '<div class="sub">Not yet encountered.</div>';
        else {
          html += '<div class="sub">' + zone.length + ' systems · ' + (r.pact ? 'non-compete pact' : 'competing') + '</div>';
          for (const L of (r.lines || [])) {
            const la = s.systems[L.a], lb = s.systems[L.b];
            if (!la.discovered && !lb.discovered) continue; // their dark lanes stay dark
            html += '<div class="row"><span class="sub grow">↻ ' + commName(L.c) + ' · ' + esc(la.name) + ' → ' + esc(lb.name) + '</span>' +
              '<button data-act="centerSys" data-id="' + L.a + '" title="Find this trade line">◎</button></div>';
          }
          if (SW.tech.has(s, 'diplomacy')) {
            const cost = SW.rivals.buyoutCost(s, r);
            html += '<div class="row"><button data-act="buyout" data-id="' + r.id + '" ' + (s.credits < cost ? 'disabled' : '') + '>buy out — ' + U.fmt(cost) + '¤</button></div>';
          }
        }
      }
      html += '</div>';
    }
    // standing
    html += '<h4>Standing</h4><div class="row">';
    for (const f of ['vigil', 'synod', 'combine', 'mariners', 'loom', 'severed']) {
      const v = s.rep[f] || 0;
      html += '<span class="tag' + (v > 2 ? ' acc' : v < -2 ? ' bad' : '') + '" data-info="faction:' + f + '">' + D.IDEOLOGIES[f] ? '' : '';
      html += (D.IDEOLOGIES[f] ? D.IDEOLOGIES[f].name.split(' ')[0] : f) + ' ' + (v > 0 ? '+' : '') + v.toFixed(1) + '</span>';
    }
    html += '</div>';
    if ((s.infamy || 0) > 0.5) html += '<div class="sub">☠ infamy ' + s.infamy.toFixed(1) + (s.infamy >= D.TUNE.infamyBlackMarket ? ' — Reach black markets open (+15% sell)' : '') + '</div>';
    body.innerHTML = html;
  }

  // ============ tech tab (canvas tree) ============
  function renderTech(body, force) {
    const s = st();
    let html = '<div class="row"><span class="title grow num">◇ ' + Math.floor(s.research) + '</span><span class="sub">click a node to research</span><button data-act="openTechTree">expand</button></div>';
    html += '<canvas id="techCanvas"></canvas>';
    // aptitudes: the captain, not the network — points come from milestones
    const pts = s.perkPoints || 0;
    const perkList = SW.perks.list(s);
    const ownedN = perkList.filter(function (p) { return p.owned; }).length;
    if (pts > 0 || ownedN > 0) {
      html += '<h4>Aptitudes <span class="tag' + (pts ? ' acc' : '') + '">' + pts + ' point' + (pts === 1 ? '' : 's') + '</span></h4>';
      const cats = [];
      for (const p of perkList) if (cats.indexOf(p.cat) < 0) cats.push(p.cat);
      for (const cat of cats) {
        const chain = perkList.filter(function (p) { return p.cat === cat; });
        if (!chain.some(function (p) { return p.owned || p.available; })) continue;
        html += '<div class="row"><span class="sub" style="width:86px">' + cat.toUpperCase() + '</span>';
        for (const p of chain) {
          if (p.owned) html += '<span class="tag acc" title="' + esc(p.desc) + '">' + p.icon + ' ' + esc(p.name) + '</span>';
          else if (p.available) html += '<button data-act="buyPerk" data-id="' + p.id + '" ' + (pts ? '' : 'disabled') + ' title="' + esc(p.desc) + '">' + p.icon + ' ' + esc(p.name) + '</button>';
          else html += '<span class="tag" style="opacity:0.4" title="Requires ' + esc((D.PERKS[p.req] || {}).name || '') + '">' + p.icon + '</span>';
        }
        html += '</div>';
      }
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
    showModal('techModal');
    drawTechTree($('#techCanvasFull'), s, tree, { large: true });
  }

  function showTechTreeRich() {
    const s = st();
    const tree = SW.tech.tree(s);
    const modal = $('#techModal');
    const visible = SW.tech.list(s).filter(function (t) { return t.visible; });
    if (!ui.techView.selected || !D.TECHS[ui.techView.selected] || !SW.tech.visible(s, ui.techView.selected)) {
      const first = visible.find(function (t) { return t.available && !t.owned; }) || visible[0];
      ui.techView.selected = first ? first.id : null;
    }
    let html = '<div class="techHead"><h2><i>◇</i> TECH TREE</h2><span class="sub num">◇ ' + Math.floor(s.research) + '</span>' +
      '<button data-act="techZoomOut" title="Zoom out">-</button><button data-act="techZoomIn" title="Zoom in">+</button>' +
      '<button data-act="techResetView" title="Reset tech tree view">reset</button><button data-act="closeModal">x</button></div>';
    html += '<div class="techToolbar"><span>drag to pan</span><span>wheel to zoom</span><span>click a node for details</span></div>';
    html += '<div class="techGrid"><div class="techMap"><canvas id="techCanvasFull"></canvas></div><div class="techSide">';
    html += techDetailHtml(s, ui.techView.selected);
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
      html += '<div class="listItem techPick' + (ui.techView.selected === t.id ? ' sel' : '') + '" data-act="techSelect" data-id="' + t.id + '" data-info="tech:' + t.id + '"><div class="row"><span class="title grow">' + esc(t.name) + '</span>' + status + '</div>' +
        '<div class="sub">' + esc(t.desc) + '</div>' + techPathHtml(t.id) + '</div>';
    }
    html += '</div></div></div>';
    modal.innerHTML = html;
    showModal('techModal');
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
    ui.techView.zoom = U.clamp(ui.techView.zoom * factor, 0.55, 2.4);
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
    const view = opts.large ? ui.techView : { x: 0, y: 0, zoom: 1 };
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
            ui.techView.selected = h.id;
            showTechTreeRich();
            return;
          }
          const r2 = A().research(st(), h.id);
          if (!r2.ok && r2.msg !== 'Not available yet.') toast({ kind: 'bad', text: r2.msg });
          ui.refresh();
          return;
        }
      }
    };
    canvas.onmousemove = function (e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      for (const h of hits) {
        if (Math.hypot(h.x - mx, h.y - my) <= h.r) { renderInfobox({ kind: 'tech', id: h.id }); return; }
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
      const old = ui.techView.zoom;
      const next = U.clamp(old * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.55, 2.4);
      if (next === old) return;
      ui.techView.x = mx - (mx - ui.techView.x) * (next / old);
      ui.techView.y = my - (my - ui.techView.y) * (next / old);
      ui.techView.zoom = next;
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
      ui.techView.x += e.clientX - drag.x;
      ui.techView.y += e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      showTechTreeRich();
    };
    canvas.onpointerup = function (e) { if (e && e.preventDefault) e.preventDefault(); drag = null; };
    canvas.onpointerleave = function () { drag = null; };
  }

  // ============ log tab ============
  function renderLog(body) {
    const s = st();
    let html = '';
    const log = s.story.log.slice().reverse();
    if (!log.length) html = '<div class="sub">The story will find you.</div>';
    for (const entry of log) {
      html += '<div class="listItem"><div class="row"><span class="title grow">' + esc(entry.title) + '</span><span class="sub num">⧗' + entry.tick + '</span></div>' +
        '<div class="sub">' + esc(entry.text).slice(0, 200) + '</div>' +
        '<div class="sub" style="color:var(--accent)">→ ' + esc(entry.choice) + (entry.result ? ' · ' + esc(entry.result) : '') + '</div></div>';
    }
    body.innerHTML = html;
  }

  // ============ exchange (market dashboard) ============
  function toggleExchange() {
    const ex = $('#exchange');
    if (ex.classList.contains('hidden')) { ex.classList.remove('hidden'); renderExchange(); }
    else ex.classList.add('hidden');
  }
  function renderExchange() {
    const s = st();
    const ex = $('#exchange');
    let html = '<header><h2><i style="color:var(--accent)">▦</i> THE MARKET</h2>';
    for (const c of D.COMM_IDS) {
      if (D.COMMODITIES[c].locked && !SW.tech.has(s, 'panacea')) continue;
      html += '<span class="commChip' + (c === exchangeComm ? ' sel' : '') + '" data-exc="' + c + '" data-info="commodity:' + c + '">' + commName(c) + '</span>';
    }
    html += '<div style="flex:1"></div><button data-act="closeExchange">✕</button></header>';
    html += '<div id="exGrid"><div id="exMain">';

    // per-system table for the chosen commodity
    const rows = s.systems.filter(function (x) { return x.discovered && x.scourge !== 2; })
      .map(function (x) { return { sys: x, price: SW.economy.price(s, x, exchangeComm), stock: Math.floor(x.stocks[exchangeComm] || 0) }; })
      .sort(function (a, b) { return a.price - b.price; });
    html += '<table class="mkt"><tr><th>system</th><th>stock</th><th>price</th><th>trend</th><th></th></tr>';
    for (const row of rows.slice(0, 30)) {
      const hist = row.sys.hist && row.sys.hist[exchangeComm];
      const ratio = row.price / D.COMMODITIES[exchangeComm].base;
      const pc = ratio < 0.8 ? '#7fe0a8' : ratio > 1.35 ? '#ffb070' : 'var(--ink-dim)';
      html += '<tr data-info="system:' + row.sys.id + '"><td>' + esc(row.sys.name) + '</td><td class="num">' + row.stock + '</td><td class="num" style="color:' + pc + '">' + Math.round(row.price) + '</td>' +
        '<td>' + sparkHtml(hist) + '</td>' +
        '<td><button data-act="centerSys" data-id="' + row.sys.id + '">◎</button></td></tr>';
    }
    html += '</table></div><div id="exSide">';

    // opportunities with one-click route creation
    html += '<h4>Best opportunities</h4>';
    const ops = SW.economy.opportunities(s, 8);
    for (const op of ops) {
      html += '<div class="row"><span class="grow sub">' + commName(op.c) + ' ' + esc(s.systems[op.from].name.split(' ')[0]) + '→' + esc(s.systems[op.to].name.split(' ')[0]) +
        ' <b class="num" style="color:var(--accent)">+' + Math.round(op.margin) + '</b></span>' +
        '<button data-act="quickRoute" data-from="' + op.from + '" data-to="' + op.to + '" data-c="' + op.c + '">＋ route</button></div>';
    }
    // fleet utilization
    const idle = s.ships.filter(function (sh) { return sh.mode === 'idle' && !sh.routeId && !sh.directiveId && !sh.mission; });
    html += '<h4>Fleet</h4>';
    html += '<div class="sub">' + s.ships.length + ' ships · ' + idle.length + ' idle · ' + s.routes.length + ' routes</div>';
    if (idle.length) {
      html += '<div class="row"><button data-act="employAll">employ all idle</button></div>';
      if (s.routes.length) {
        html += '<div class="row"><select id="bulkRoute">' + s.routes.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + '</option>'; }).join('') + '</select>' +
          '<button data-act="bulkAssign">assign idle →</button></div>';
      }
    }
    html += '<h4>Routes</h4>';
    for (const r of s.routes) {
      html += '<div class="row"><span class="grow sub">' + esc(r.name) + ' · ' + r.ships.length + '▲</span><span class="num sub">' + (r.totalProfit >= 0 ? '+' : '') + U.fmt(r.totalProfit) + '</span></div>';
    }
    html += '</div></div>';
    ex.innerHTML = html;
    ex.querySelectorAll('[data-exc]').forEach(function (el) {
      el.addEventListener('click', function () { exchangeComm = el.dataset.exc; renderExchange(); });
    });
    ex.querySelectorAll('canvas.spark').forEach(drawSpark);
  }
  function sparkHtml(hist) {
    if (!hist || hist.length < 3) return '<span class="sub">·</span>';
    return '<canvas class="spark" width="64" height="16" data-hist="' + hist.join(',') + '"></canvas>';
  }
  function drawSpark(cv) {
    const vals = cv.dataset.hist.split(',').map(Number);
    const ctx = cv.getContext('2d');
    const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    ctx.strokeStyle = 'rgba(201,209,217,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    vals.forEach(function (v, i) {
      const x = (i / (vals.length - 1)) * 62 + 1;
      const y = hi === lo ? 8 : 14 - ((v - lo) / (hi - lo)) * 12;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // ============ codex ============
  function showCodex() {
    renderCodex();
    showModal('codexModal');
  }
  function renderCodex() {
    const s = st();
    const modal = $('#codexModal');
    let html = '<h2><i>◈</i> CODEX</h2><div class="codexTabs">' +
      ['ships', 'cast', 'chronicle'].map(function (t) {
        return '<button data-codextab="' + t + '" class="' + (codexTab === t ? 'active' : '') + '">' + t + '</button>';
      }).join('') + '</div>';
    if (codexTab === 'ships') {
      html += '<div class="row" style="margin-bottom:8px">';
      for (const h in D.HULLS) {
        const owned = !D.HULLS[h].tech || SW.tech.has(s, D.HULLS[h].tech);
        html += '<button data-codexhull="' + h + '" ' + (codexHull === h ? 'class="primary"' : '') + ' style="' + (owned ? '' : 'opacity:0.4') + '">' + D.HULLS[h].glyph + ' ' + D.HULLS[h].name + '</button>';
      }
      html += '</div>';
      html += '<canvas id="codexShipCanvas" width="660" height="260" style="width:100%;border:1px solid var(--line);background:rgba(255,255,255,0.012)"></canvas>';
      const hull = D.HULLS[codexHull];
      html += '<div class="row" style="margin-top:8px"><span class="grow sub">cap <b class="num">' + hull.cap + '</b> · speed <b class="num">' + hull.speed + '</b> ly/t · upkeep <b class="num">' + hull.upkeep + '</b>¤' + (hull.power ? ' · power <b class="num">' + hull.power + '</b>' : '') + (hull.survey ? ' · survey <b class="num">' + hull.survey + '</b>' : '') + '</span></div>';
      html += '<div class="sub">' + esc(hull.desc) + '</div>';
      html += '<div class="sub" style="margin-top:6px;color:var(--ink-faint)">wireframe lathed live from a seeded harmonic profile r(z), revolved and slowly turned — every hull is an equation.</div>';
    } else if (codexTab === 'cast') {
      html += '<div class="castGrid">';
      for (const id in SW.portraits.CAST) {
        html += '<div class="castCell"><canvas width="96" height="96" data-cast="' + id + '"></canvas><div class="cname">' + esc(SW.portraits.CAST[id].label || id) + '</div></div>';
      }
      html += '</div>';
      html += '<div class="sub" style="margin-top:8px;color:var(--ink-faint)">faces are parametric line-art: seeded geometry, live blinks. Encounter strangers are generated the same way, fresh each meeting.</div>';
    } else {
      // chronicle
      const have = new Set(s.fragments || []);
      html += '<div class="sub" style="margin-bottom:8px">' + have.size + '/' + SW.lore.FRAGMENTS.length + ' fragments recovered — surveys, ruins, and strangers carry the rest.</div>';
      for (const ep of SW.lore.EPOCHS) {
        html += '<div class="epoch"><div class="ewhen">' + esc(ep.name.toUpperCase()) + ' — ' + esc(ep.when) + '</div>' +
          '<div class="etext">' + esc(ep.text) + '</div>';
        for (const f of SW.lore.FRAGMENTS.filter(function (x) { return x.epoch === ep.id; })) {
          if (have.has(f.id)) {
            html += '<div class="frag" data-info="fragment:' + f.id + '"><div class="ftitle">◈ ' + esc(f.title) + '</div><div class="sub">' + esc(f.text) + '</div></div>';
          } else {
            html += '<div class="frag locked">▒▒▒▒▒▒ undiscovered fragment</div>';
          }
        }
        html += '</div>';
      }
    }
    html += '<div class="choices" style="margin-top:10px"><button data-act="closeModal">close</button></div>';
    modal.innerHTML = html;
    modal.querySelectorAll('[data-codextab]').forEach(function (el) {
      el.addEventListener('click', function () { codexTab = el.dataset.codextab; renderCodex(); });
    });
    modal.querySelectorAll('[data-codexhull]').forEach(function (el) {
      el.addEventListener('click', function () { codexHull = el.dataset.codexhull; renderCodex(); });
    });
    modal.querySelectorAll('canvas[data-cast]').forEach(function (cv) {
      addPortrait(cv, { kind: 'cast', id: cv.dataset.cast });
    });
  }

  // ============ event modal ============
  ui.showEvent = function () {
    const s = st();
    const e = SW.story.pendingEvent(s);
    if (!e) return;
    const modal = $('#eventModal');
    const text = typeof e.text === 'function' ? e.text(s) : e.text;
    let html = '<h2>' + esc(e.title) + '</h2>';
    html += '<div class="evHead"><div><canvas id="evPortrait" width="96" height="96"></canvas>' +
      '<div class="who">' + esc(e.speaker ? SW.portraits.labelFor(e.speaker) : '—') + '</div></div>' +
      '<div class="body" style="flex:1">' + esc(text) + '</div></div>';
    html += '<div class="choices">';
    e.choices.forEach(function (ch, i) {
      const ok = !ch.req || ch.req(s);
      html += '<button data-act="choose" data-i="' + i + '" ' + (ok ? '' : 'disabled') + '>' + esc(ch.label) + '</button>';
    });
    html += '</div><div class="result hidden" id="evResult"></div>';
    modal.innerHTML = html;
    modal.classList.toggle('bad', e.mood === 'bad');
    if (e.speaker) addPortrait($('#evPortrait'), e.speaker);
    showModal('eventModal');
  };
  function chooseEvent(i) {
    const s = st();
    const r = A().chooseEvent(s, i);
    if (r.ok && r.result) {
      const res = $('#evResult');
      res.textContent = r.result;
      res.classList.remove('hidden');
      $('#eventModal .choices').innerHTML = '<button class="primary" data-act="closeModal">continue</button>';
    } else hideModals();
    ui.refresh();
  }

  // ============ game over ============
  ui.showGameOver = function (go) {
    const s = st();
    const modal = $('#gameoverModal');
    const stats = s.stats;
    let html = '<h2>' + (go.win ? '<i>✦</i> THE WEAVE HOLDS' : '✖ THE WEAVE UNRAVELS') + '</h2>';
    html += '<div class="body">' + esc(go.reason) + '</div>';
    html += '<div class="statGrid">' +
      gr('Origin · Doctrine', D.ORIGINS[s.origin].name + ' · ' + (SW.tech.doctrine(s) ? D.TECHS[SW.tech.doctrine(s)].name.replace('Doctrine: ', '') : 'none')) +
      gr('Cycles', go.tick) +
      gr('Deliveries', stats.deliveries || 0) +
      gr('Credits earned', U.fmt(stats.creditsEarned || 0) + '¤') +
      gr('Ships built / lost', (stats.shipsBuilt || 0) + ' / ' + (stats.shipsLost || 0)) +
      gr('Surveys', stats.surveys || 0) +
      gr('Contracts done', stats.contractsDone || 0) +
      gr('Raids repelled / led', (stats.raidsRepelled || 0) + ' / ' + (stats.raidsLed || 0)) +
      gr('Systems lost', stats.systemsLost || 0) +
      gr('Souls saved', U.fmt1(stats.popSaved || 0) + 'M') +
      gr('Fragments', (s.fragments || []).length + '/' + SW.lore.FRAGMENTS.length) +
      '</div>';
    html += '<div class="titleArt" style="font-size:20px;letter-spacing:4px">WEAVE RATING <i>' + U.fmt(go.score) + '</i></div>';
    html += '<div class="choices">';
    if (go.win) html += '<button class="primary" data-act="postgame">keep weaving</button>';
    html += '<button data-act="newGameMenu">new run</button></div>';
    modal.innerHTML = html;
    modal.classList.toggle('bad', !go.win);
    showModal('gameoverModal');
  };
  function gr(k, v) { return '<div>' + k + '</div><div class="v">' + v + '</div>'; }

  // ============ title / identity / origins ============
  let chosenOrigin = 'courier';
  ui.showTitle = function () {
    const modal = $('#titleModal');
    const hasAuto = SW.game.hasSave('auto');
    ui._sigilSeed = Math.floor(Math.random() * 1000);
    let html = '<div class="titleArt"><i>✦</i> STARWEFT</div>' +
      '<div class="tagline">The worlds drifted apart. You are the thread.</div>';
    if (hasAuto) html += '<div class="choices"><button class="primary" data-act="continueGame">continue last weave</button></div><hr class="thin">';
    html += '<h4>Identity</h4>';
    html += '<div class="row"><canvas id="sigilPreview" width="64" height="64" style="border:1px solid var(--line)"></canvas>' +
      '<div style="flex:1"><div class="row"><input id="idName" placeholder="network name" value="The Provisional Weft" style="flex:1"></div>' +
      '<div class="row"><input id="idMotto" placeholder="motto" value="Finish the round." style="flex:1"></div>' +
      '<div class="row"><span class="sub">hue</span><input id="idHue" type="range" min="0" max="359" value="195" style="flex:1">' +
      '<button data-act="rerollSigil" title="New sigil">↻</button></div></div></div>';
    html += '<h4>Origin</h4>';
    for (const o in D.ORIGINS) {
      const def = D.ORIGINS[o];
      const unlocked = SW.game.originUnlocked(o);
      html += '<div class="originCard' + (chosenOrigin === o ? ' sel' : '') + (unlocked ? '' : ' lock') + '" data-origin="' + (unlocked ? o : '') + '">' +
        '<div style="flex:1"><div class="oname">' + esc(def.name) + (unlocked ? '' : ' 🔒') + '</div>' +
        '<div class="sub">' + (unlocked ? esc(def.desc) : 'Locked — ' + esc(D.LEGACY_HINTS[def.locked])) + '</div></div></div>';
    }
    html += '<h4>Galaxy</h4>';
    html += '<div class="row"><span class="sub" style="width:64px">difficulty</span><select id="ngDiff">' +
      Object.keys(D.DIFFICULTY).map(function (d) {
        return '<option value="' + d + '"' + (d === 'standard' ? ' selected' : '') + '>' + D.DIFFICULTY[d].name + ' — ' + D.DIFFICULTY[d].desc + '</option>';
      }).join('') + '</select></div>';
    html += '<div class="row"><span class="sub" style="width:64px">aptitude</span><select id="ngApt" style="flex:1">' +
      '<option value="">— undecided (find yourself out there) —</option>' +
      Object.keys(D.PERKS).filter(function (id) { return !D.PERKS[id].req; }).map(function (id) {
        const p = D.PERKS[id];
        return '<option value="' + id + '">' + p.icon + ' ' + p.name + ' — ' + p.desc + '</option>';
      }).join('') + '</select></div>';
    html += '<div class="row"><span class="sub" style="width:64px">seed</span><input id="ngSeed" placeholder="random" style="flex:1"></div>';
    html += '<div class="choices" style="margin-top:12px"><button class="primary" data-act="begin">begin weaving</button>' +
      '<button data-act="help">how to play</button></div>';
    modal.innerHTML = html;
    modal.querySelectorAll('[data-origin]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (!el.dataset.origin) return;
        chosenOrigin = el.dataset.origin;
        modal.querySelectorAll('.originCard').forEach(function (x) { x.classList.toggle('sel', x === el); });
      });
    });
    showModal('titleModal');
  };

  function applyIdentity(s) {
    const hue = s.identity.hue;
    document.documentElement.style.setProperty('--accent', 'hsl(' + hue + ',55%,72%)');
    document.documentElement.style.setProperty('--accent-dim', 'hsla(' + hue + ',55%,72%,0.16)');
  }

  // ============ menus ============
  function showMenu() {
    const modal = $('#menuModal');
    modal.innerHTML = '<h2>MENU</h2><div class="choices">' +
      '<button data-act="saveManual">save</button>' +
      '<button data-act="loadManual" ' + (SW.game.hasSave('manual') ? '' : 'disabled') + '>load</button>' +
      '<button data-act="exportSave">export save → clipboard</button>' +
      '<button data-act="importSave">import save</button>' +
      '<button data-act="help">how to play</button>' +
      '<button data-act="newGameMenu">new run</button>' +
      '<button data-act="closeModal">resume</button></div>';
    showModal('menuModal');
  }
  function showHelp() {
    const modal = $('#helpModal');
    modal.innerHTML = '<h2>HOW TO WEAVE</h2><div class="body">' +
      '<b>Trade.</b> Markets price by scarcity. Select a ship, buy cheap, SEND ➤ somewhere hungry. Routes automate it after 3 deliveries.\n\n' +
      '<b>Explore.</b> The bubble is 3D: drag to orbit, shift-drag to pan, wheel to zoom, double-click a system for its orbital view. Scouts survey idle; surveys pay research and find the Chronicle.\n\n' +
      '<b>Expand.</b> Routes need command range (Sol + relays). Buildings consume materials delivered on-site.\n\n' +
      '<b>Defend.</b> Pirates raid laden ships in rough regions. Corvettes escort routes; Lancers hit harder; retainers patrol regions. Or raid them back — infamy opens black markets and closes doors.\n\n' +
      '<b>Decide.</b> Origins shape your start; one Doctrine per run shapes everything after. Contracts and blockades arrive whether you like it or not.\n\n' +
      '<b>Survive.</b> The Scourge spreads coreward-out. Quarantine, inoculate, then deliver ' + D.TUNE.panaceaToWin + ' PANACEA to the origin.\n\n' +
      '<span class="kbd">Space</span> pause · <span class="kbd">1/2/3</span> speed · <span class="kbd">Esc</span> back/close · the infobox (bottom-left) explains whatever you hover.</div>' +
      '<div class="choices"><button class="primary" data-act="closeModal">got it</button></div>';
    showModal('helpModal');
  }
  function showModal(id) {
    $('#modalShade').classList.remove('hidden');
    document.querySelectorAll('.modal').forEach(function (m) { m.classList.add('hidden'); });
    $('#' + id).classList.remove('hidden');
  }
  function hideModals() {
    $('#modalShade').classList.add('hidden');
    document.querySelectorAll('.modal').forEach(function (m) { m.classList.add('hidden'); });
  }
  ui.modalOpen = function () { return !$('#modalShade').classList.contains('hidden'); };

  // ============ toasts ============
  function toast(t) {
    const wrap = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (t.kind || '');
    el.textContent = t.text;
    wrap.appendChild(el);
    while (wrap.children.length > 4) wrap.removeChild(wrap.firstChild);
    setTimeout(function () { el.classList.add('fade'); }, 3400);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4100);
    $('#ticker').textContent = t.text;
  }
  ui.toast = toast;

  // ============ dispatch ============
  function dispatch(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    const s = st(), act = btn.dataset.act;
    const ship = selectedShip();
    const sysId = SW.render.selectedSys;
    SW.audio.ensure();

    switch (act) {
      case 'buy': if (ship) { const r = A().shipBuy(s, ship.id, btn.dataset.c, parseInt(btn.dataset.q, 10)); if (!r.ok) toast({ kind: 'bad', text: r.msg }); else SW.audio.sfx('buy'); } break;
      case 'sellc': if (ship) { const r = A().shipSell(s, ship.id, btn.dataset.c, 9999); if (!r.ok) toast({ kind: 'bad', text: r.msg }); else SW.audio.sfx('sell'); } break;
      case 'depotTake': if (ship) A().depotTake(s, ship.id, btn.dataset.c, 9999); break;
      case 'depotDrop': if (ship) A().depotDrop(s, ship.id, btn.dataset.c, 9999); break;
      case 'build': { const r = A().build(s, sysId, btn.dataset.b); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'supply': {
        const idle = (ship && ship.mode === 'idle' && !ship.routeId) ? ship :
          s.ships.find(function (sh) { return sh.mode === 'idle' && !sh.routeId && !sh.directiveId && !sh.mission; });
        if (!idle) { toast({ kind: 'bad', text: 'No idle ship for a supply run.' }); break; }
        const r = A().supplyMission(s, idle.id, sysId, btn.dataset.c, parseInt(btn.dataset.q, 10));
        toast(r.ok ? { kind: 'info', text: '▢ ' + idle.name + ' fetching ' + btn.dataset.q + ' ' + D.COMMODITIES[btn.dataset.c].name + ' from ' + r.source.name } : { kind: 'bad', text: r.msg });
        break;
      }
      case 'buyShip': { const r = A().buyShip(s, btn.dataset.h, sysId); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'selShip': SW.render.selectedShip = btn.dataset.id; break;
      case 'deselShip': SW.render.selectedShip = null; SW.render.followShip = null; break;
      case 'focusShip': {
        SW.render.selectedShip = btn.dataset.id;
        const sh = selectedShip();
        if (sh) {
          const pos = SW.ships.pos(s, sh);
          SW.render.cam.tx = pos.x; SW.render.cam.ty = pos.y; SW.render.cam.tz = pos.z;
          if (sh.at !== null) SW.render.selectedSys = sh.at;
        }
        break;
      }
      case 'sendMode': setMapMode('send', '➤ click a destination for ' + (ship ? ship.name : 'ship')); return;
      case 'autoExplore': if (ship) { const r = A().toggleAutoExplore(s, ship.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); } break;
      case 'unassign': if (ship) A().unassignShip(s, ship.id); break;
      case 'scrap': if (ship) { const r = A().scrapShip(s, ship.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); else SW.render.selectedShip = null; } break;
      case 'deliverPanacea': if (ship) { const r = A().deliverPanacea(s, ship.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); } break;
      case 'inoculate': if (ship) { const r = A().inoculate(s, ship.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); } break;
      case 'raidHere':
        if (ship && ship.at !== null) {
          if (SW.tech.has(s, 'simulacrum')) ui.openCombatSim(ship, s.systems[ship.at]);
          else { const r = A().raid(s, ship.id, ship.at); if (!r.ok) toast({ kind: 'bad', text: r.msg }); else SW.audio.sfx('raid'); }
        }
        break;
      case 'followShip': if (ship) SW.render.followShip = SW.render.followShip === ship.id ? null : ship.id; break;
      case 'focusSys': if (sysId !== null) SW.render.centerOn(sysId); break;
      case 'simAuto': closeCombatSim(true); break;
      case 'simAbort': closeCombatSim(false); break;
      case 'enterSys': if (sysId !== null) ui.enterSystem(sysId); break;
      case 'bookmark': if (sysId !== null) A().toggleBookmark(s, sysId); break;
      case 'alignPlane':
        if (SW.render.mode === 'system') {
          SW.render.systemPan.x = 0; SW.render.systemPan.y = 0; SW.render.systemZoom = 1;
        } else {
          SW.render.alignToPlane();
        }
        break;

      case 'draftStart': editorOpen = true; ui.routeDraft = []; setMapMode('route', '↻ click systems to add stops'); renderDock(true); return;
      case 'draftRemove': ui.routeDraft.splice(parseInt(btn.dataset.i, 10), 1); renderDock(true); return;
      case 'draftCancel': editorOpen = false; ui.routeDraft = null; setMapMode(null); renderDock(true); return;
      case 'draftCreate': {
        const r = A().createRoute(s, ui.routeDraft);
        if (!r.ok) { toast({ kind: 'bad', text: r.msg }); return; }
        if (ship && ship.mode === 'idle' && !ship.routeId) A().assignShip(s, ship.id, r.route.id);
        editorOpen = false; ui.routeDraft = null; setMapMode(null);
        break;
      }
      case 'quickRoute': {
        const r = A().createRoute(s, [
          { sys: parseInt(btn.dataset.from, 10), action: 'buy', c: btn.dataset.c },
          { sys: parseInt(btn.dataset.to, 10), action: 'sell' },
        ]);
        if (!r.ok) { toast({ kind: 'bad', text: r.msg }); return; }
        const idle = s.ships.find(function (sh) { return sh.mode === 'idle' && !sh.routeId && !sh.directiveId && !sh.mission && !D.HULLS[sh.hull].survey; });
        if (idle) A().assignShip(s, idle.id, r.route.id);
        toast({ kind: 'good', text: '↻ ' + r.route.name + ' created' + (idle ? ' — ' + idle.name + ' assigned.' : '.') });
        break;
      }
      case 'chainRoute': {
        const r = A().createChainRoute(s, btn.dataset.c);
        if (!r.ok) { toast({ kind: 'bad', text: r.msg }); return; }
        const idle = s.ships.find(function (sh) { return sh.mode === 'idle' && !sh.routeId && !sh.directiveId && !sh.mission && !D.HULLS[sh.hull].survey; });
        if (idle) A().assignShip(s, idle.id, r.route.id);
        break;
      }
      case 'yardsToggle': { const r = A().toggleAutoYards(s); if (r.ok) toast({ kind: 'info', text: 'Tessellation Yards: ' + (r.enabled ? 'auto' : 'off') + '.' }); break; }
      case 'buildSite': { const r = A().buildSite(s, sysId, btn.dataset.body, btn.dataset.fac); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'buyPerk': { const r = A().buyPerk(s, btn.dataset.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'sellData': if (ship) { const r = A().sellData(s, ship.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); } break;
      case 'clearQueue': if (ship) A().clearQueue(s, ship.id); break;
      case 'fetchHere': {
        if (!ship || sysId === null) break;
        const src = SW.economy.cheapestSource(s, btn.dataset.c, 5, sysId);
        if (!src) { toast({ kind: 'bad', text: 'No charted market stocks ' + D.COMMODITIES[btn.dataset.c].name + '.' }); break; }
        const r = A().order(s, ship.id, { type: 'fetch', c: btn.dataset.c, from: src.id, to: sysId });
        if (!r.ok) toast({ kind: 'bad', text: r.msg });
        break;
      }
      case 'fetchOp': {
        const hauler = (ship && ship.mode === 'idle') ? ship :
          s.ships.find(function (x) { return x.mode === 'idle' && !x.routeId && !x.directiveId && !x.mission && !(x.queue && x.queue.length) && !D.HULLS[x.hull].survey; });
        if (!hauler) { toast({ kind: 'bad', text: 'No idle hauler for the job.' }); break; }
        const r = A().order(s, hauler.id, { type: 'fetch', c: btn.dataset.c, from: parseInt(btn.dataset.from, 10), to: parseInt(btn.dataset.to, 10) });
        if (!r.ok) toast({ kind: 'bad', text: r.msg });
        break;
      }
      case 'relocate': {
        const r = A().relocateHome(s, sysId);
        if (!r.ok) toast({ kind: 'bad', text: r.msg });
        break;
      }
      case 'routePause': A().toggleRoute(s, btn.dataset.id); break;
      case 'routeDel': A().deleteRoute(s, btn.dataset.id); break;
      case 'routeDup': {
        const r0 = s.routes.find(function (x) { return x.id === btn.dataset.id; });
        if (r0) A().createRoute(s, JSON.parse(JSON.stringify(r0.stops)), r0.name + ' II');
        break;
      }
      case 'routeAssignIdle': {
        const route = s.routes.find(function (x) { return x.id === btn.dataset.id; });
        if (route) {
          let n = 0;
          for (const sh of s.ships) {
            if (sh.mode === 'idle' && !sh.routeId && !sh.directiveId && !sh.mission && !D.HULLS[sh.hull].survey) { A().assignShip(s, sh.id, route.id); n++; }
          }
          toast({ kind: 'info', text: n + ' ships assigned to ' + route.name + '.' });
        }
        break;
      }
      case 'employAll': {
        let n = 0;
        for (const sh of s.ships) {
          if (sh.mode !== 'idle' || sh.routeId || sh.directiveId || sh.mission || D.HULLS[sh.hull].survey) continue;
          const route = s.routes.slice().sort(function (a, b) { return a.ships.length - b.ships.length; })[0];
          if (route && route.ships.length < 3) { A().assignShip(s, sh.id, route.id); n++; continue; }
          const ops = SW.economy.opportunities(s, 3).filter(function (o) {
            return SW.ships.inRange(s, s.systems[o.from]) && SW.ships.inRange(s, s.systems[o.to]);
          });
          if (ops.length && s.story.flags.routes_unlocked) {
            const r2 = A().createRoute(s, [{ sys: ops[0].from, action: 'buy', c: ops[0].c }, { sys: ops[0].to, action: 'sell' }]);
            if (r2.ok) { A().assignShip(s, sh.id, r2.route.id); n++; }
          }
        }
        toast({ kind: 'info', text: n + ' idle ships put to work.' });
        break;
      }
      case 'dirStart': {
        const c = $('#dirComm').value, target = parseInt($('#dirTarget').value, 10) || 60;
        directiveDraft = { c: c, target: target };
        setMapMode('directive', '◎ click the system to keep stocked with ' + D.COMMODITIES[c].name);
        return;
      }
      case 'dirDel': A().deleteDirective(s, btn.dataset.id); break;
      case 'dirAssign': {
        const shipId = $('#dirShip').value, dirId = $('#dirPick').value;
        if (shipId && dirId) A().assignShipDirective(s, shipId, dirId);
        break;
      }
      case 'openTechTree': showTechTreeRich(); return;
      case 'techSelect': ui.techView.selected = btn.dataset.id; showTechTreeRich(); return;
      case 'techZoomIn': zoomTechView(1.18); showTechTreeRich(); return;
      case 'techZoomOut': zoomTechView(1 / 1.18); showTechTreeRich(); return;
      case 'techResetView': ui.techView.x = 0; ui.techView.y = 0; ui.techView.zoom = 1; showTechTreeRich(); return;
      case 'research': { const r = A().research(s, btn.dataset.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'buyout': { const r = A().buyoutRival(s, btn.dataset.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'payToll': { const r = A().payToll(s, parseInt(btn.dataset.i, 10)); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'breakBlockade': if (ship) { const r = A().breakBlockade(s, parseInt(btn.dataset.i, 10), ship.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); } break;
      case 'hireRetainer': { const r = A().hireRetainer(s, $('#retRegion').value); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'blitzMode': setMapMode('blitz', '◎ click a system to blitz'); return;
      case 'embargoMode': setMapMode('embargo', '⊘ click a system to embargo'); return;

      case 'choose': chooseEvent(parseInt(btn.dataset.i, 10)); return;
      case 'closeModal': hideModals(); break;
      case 'closeExchange': $('#exchange').classList.add('hidden'); break;
      case 'postgame': A().continuePostgame(s); hideModals(); break;
      case 'newGameMenu': ui.showTitle(); return;
      case 'rerollSigil': ui._sigilSeed = Math.floor(Math.random() * 100000); return;
      case 'continueGame': { const r = SW.game.load('auto'); if (r.ok) { hideModals(); afterLoad(); } else toast({ kind: 'bad', text: r.msg }); return; }
      case 'begin': {
        const seedV = $('#ngSeed').value.trim();
        SW.game.newGame({
          seed: seedV || undefined,
          difficulty: $('#ngDiff').value,
          origin: chosenOrigin,
          aptitude: ($('#ngApt') && $('#ngApt').value) || undefined,
          identity: {
            name: ($('#idName').value || 'The Provisional Weft').slice(0, 40),
            motto: ($('#idMotto').value || 'Finish the round.').slice(0, 60),
            hue: parseInt($('#idHue').value, 10) || 195,
            sigil: ui._sigilSeed || 7,
          },
        });
        hideModals();
        afterLoad();
        A().setSpeed(SW.game.state, 1);
        return;
      }
      case 'help': showHelp(); return;
      case 'saveManual': { const r = SW.game.save('manual'); toast(r.ok ? { kind: 'good', text: 'Saved.' } : { kind: 'bad', text: r.msg || 'Save failed.' }); hideModals(); break; }
      case 'loadManual': { const r = SW.game.load('manual'); if (r.ok) { hideModals(); afterLoad(); toast({ kind: 'good', text: 'Loaded.' }); } else toast({ kind: 'bad', text: r.msg }); return; }
      case 'exportSave': {
        const data = SW.game.exportSave();
        if (data && navigator.clipboard) navigator.clipboard.writeText(data).then(function () { toast({ kind: 'good', text: 'Save copied to clipboard.' }); });
        break;
      }
      case 'importSave': {
        const data = prompt('Paste your exported save:');
        if (data) { const r = SW.game.loadFromString(data); if (r.ok) { hideModals(); afterLoad(); toast({ kind: 'good', text: 'Imported.' }); } else toast({ kind: 'bad', text: r.msg }); }
        return;
      }
      case 'centerSys': {
        const id = parseInt(btn.dataset.id, 10);
        ui.exitSystem();
        SW.render.centerOn(id);
        SW.render.selectedSys = id;
        break;
      }
      case 'jumpThreat': {
        const sysT = s.systems.find(function (x) { return x.scourge === 1 && x.discovered; });
        if (sysT) { ui.exitSystem(); SW.render.centerOn(sysT.id); SW.render.selectedSys = sysT.id; }
        break;
      }
      case 'jumpStranded': {
        const sh = s.ships.find(function (x) { return x.stranded; });
        if (sh && sh.at !== null) { ui.exitSystem(); SW.render.centerOn(sh.at); SW.render.selectedShip = sh.id; }
        break;
      }
      case 'openOps': ui.setTab('ops'); break;
    }
    ui.refresh();
  }

  function dispatchChange(e) {
    const t = e.target;
    if (t.classList && t.classList.contains('draftAction')) {
      const i = parseInt(t.dataset.roleidx, 10);
      if (ui.routeDraft && ui.routeDraft[i]) { ui.routeDraft[i].action = t.value; renderDock(true); }
    } else if (t.classList && t.classList.contains('draftComm')) {
      const i = parseInt(t.dataset.cidx, 10);
      if (ui.routeDraft && ui.routeDraft[i]) { ui.routeDraft[i].c = t.value; updateProjection(); }
    }
  }

  function afterLoad() {
    const s = SW.game.state;
    applyIdentity(s);
    ui.exitSystem();
    SW.render.selectedSys = s.ships.length ? s.ships[0].at : s.homeId;
    SW.render.selectedShip = s.ships.length ? s.ships[0].id : null;
    SW.render.fit();
    SW.render.centerOn(SW.render.selectedSys !== null ? SW.render.selectedSys : s.homeId);
    pinnedInfo = null;
    ui.refresh();
  }
  ui.afterLoad = afterLoad;

  // ============ tactical simulacrum (manual combat) ============
  // A timed lane-defense engagement. Performance bends the raid odds by up to
  // ±25% (clamped in the sim) — skill is an edge, never a guarantee. The
  // AUTO-RESOLVE button keeps the stats-only path for players who'd rather not.
  let sim = null;
  ui.openCombatSim = function (ship, sys) {
    const s = st();
    if (!s || !ship || !sys) return;
    const power = SW.combat.power(s, ship);
    let defense = 3 + (sys.pop || 0) * 0.15 + SW.combat.patrolPower(s, sys.region);
    if (sys.ideology === 'vigil') defense += 6;
    const modal = $('#combatSim');
    modal.innerHTML = '<div class="modalCard"><h3>TACTICAL SIMULACRUM</h3>' +
      '<div class="sub">' + esc(ship.name) + ' (pwr ' + power + ')  vs  ' + esc(sys.name) + ' (def ~' + Math.round(defense) + ')</div>' +
      '<canvas id="simCanvas" width="520" height="320" style="display:block;margin:8px auto;border:1px solid var(--line,#2a2f36)"></canvas>' +
      '<div class="row"><span class="sub grow">←/→ or A/D to fly · guns are automatic · clear the wave, keep your hull</span>' +
      '<button data-act="simAuto">AUTO-RESOLVE</button><button class="danger" data-act="simAbort">ABORT</button></div></div>';
    modal.classList.remove('hidden');
    const cv = document.getElementById('simCanvas');
    const wasPaused = s.paused;
    s.paused = true;
    const total = Math.max(4, Math.min(24, Math.round(defense * 1.5)));
    const inv = [];
    for (let i = 0; i < total; i++) {
      inv.push({ x: 60 + (i % 8) * 52, y: 36 + Math.floor(i / 8) * 34, alive: true, ph: i * 0.7 });
    }
    sim = {
      ship: ship, sys: sys, cv: cv, wasPaused: wasPaused,
      px: 260, keys: {}, shots: [], bombs: [], inv: inv, total: total,
      hp: 3, t0: 0, lastShot: 0, lastBomb: 0, over: false,
      bombRate: Math.min(900, 280 + 4000 / Math.max(2, defense)),
    };
    requestAnimationFrame(simFrame);
  };
  function closeCombatSim(autoResolve) {
    const s = st();
    const wasSim = sim;
    $('#combatSim').classList.add('hidden');
    $('#combatSim').innerHTML = '';
    sim = null;
    if (!wasSim) return;
    if (s) s.paused = wasSim.wasPaused;
    if (autoResolve && s) {
      const r = A().raid(s, wasSim.ship.id, wasSim.sys.id);
      if (!r.ok) toast({ kind: 'bad', text: r.msg }); else SW.audio.sfx('raid');
    }
  }
  function finishCombatSim() {
    const s = st(), w = sim;
    if (!w) return;
    const kills = w.inv.filter(function (i) { return !i.alive; }).length;
    const performance = (kills / w.total) * 0.6 + (Math.max(0, w.hp) / 3) * 0.4;
    const edge = Math.max(-0.25, Math.min(0.25, (performance - 0.5) * 0.5));
    $('#combatSim').classList.add('hidden');
    $('#combatSim').innerHTML = '';
    sim = null;
    if (s) {
      s.paused = w.wasPaused;
      const r = A().raid(s, w.ship.id, w.sys.id, edge);
      if (!r.ok) toast({ kind: 'bad', text: r.msg });
      else {
        SW.audio.sfx('raid');
        toast({ kind: 'info', text: '⌖ Simulacrum: ' + kills + '/' + w.total + ' cleared, hull ' + Math.max(0, w.hp) + '/3 — odds ' + (edge >= 0 ? '+' : '') + Math.round(edge * 100) + '%.' });
      }
    }
  }
  function simFrame(now) {
    if (!sim) return;
    requestAnimationFrame(simFrame);
    const w = sim, cv = w.cv;
    if (!cv) { closeCombatSim(false); return; }
    const c2 = cv.getContext('2d');
    if (!c2) { closeCombatSim(false); return; }
    if (!w.t0) w.t0 = now;
    const t = (now - w.t0) / 1000;
    const W2 = 520, H2 = 320;
    // input
    if (w.keys.left) w.px -= 4.6;
    if (w.keys.right) w.px += 4.6;
    w.px = Math.max(16, Math.min(W2 - 16, w.px));
    // autofire
    if (now - w.lastShot > 340) { w.lastShot = now; w.shots.push({ x: w.px, y: H2 - 30 }); }
    for (const sh of w.shots) sh.y -= 6.5;
    w.shots = w.shots.filter(function (sh) { return sh.y > -8; });
    // invaders drift + bomb
    const alive = w.inv.filter(function (i) { return i.alive; });
    for (const i of w.inv) i.dx = Math.sin(t * 1.3 + i.ph) * 34;
    if (alive.length && now - w.lastBomb > w.bombRate) {
      w.lastBomb = now;
      const src = alive[Math.floor((Math.sin(now) * 0.5 + 0.5) * alive.length) % alive.length];
      w.bombs.push({ x: src.x + src.dx, y: src.y + 8 });
    }
    for (const b of w.bombs) b.y += 3.4;
    // collisions
    for (const sh of w.shots) {
      for (const i of w.inv) {
        if (!i.alive) continue;
        if (Math.abs(sh.x - (i.x + i.dx)) < 14 && Math.abs(sh.y - i.y) < 12) { i.alive = false; sh.y = -99; }
      }
    }
    w.bombs = w.bombs.filter(function (b) {
      if (b.y > H2 - 36 && b.y < H2 - 12 && Math.abs(b.x - w.px) < 12) { w.hp--; return false; }
      return b.y < H2 + 8;
    });
    // draw (monochrome, accent for you, red for harm)
    c2.fillStyle = '#04050a';
    c2.fillRect(0, 0, W2, H2);
    c2.fillStyle = 'rgba(201,209,217,0.9)';
    c2.font = '12px Consolas, monospace';
    c2.fillText('T-' + Math.max(0, 18 - t).toFixed(0), 10, 16);
    c2.fillText('HULL ' + '▮'.repeat(Math.max(0, w.hp)) + '▯'.repeat(3 - Math.max(0, w.hp)), W2 - 96, 16);
    c2.font = '16px sans-serif';
    for (const i of w.inv) {
      if (!i.alive) continue;
      c2.fillStyle = 'rgba(160,170,185,0.95)';
      c2.fillText('∆', i.x + i.dx - 6, i.y + 6);
    }
    c2.fillStyle = 'rgba(255,77,87,0.95)';
    for (const b of w.bombs) c2.fillRect(b.x - 1.5, b.y - 4, 3, 8);
    const st2 = st();
    const hue = st2 && st2.identity ? st2.identity.hue : 195;
    c2.strokeStyle = c2.fillStyle = 'hsla(' + hue + ',55%,72%,0.95)';
    for (const sh of w.shots) c2.fillRect(sh.x - 1, sh.y - 6, 2, 9);
    c2.beginPath();
    c2.moveTo(w.px, H2 - 34); c2.lineTo(w.px - 11, H2 - 14); c2.lineTo(w.px, H2 - 20); c2.lineTo(w.px + 11, H2 - 14);
    c2.closePath(); c2.fill();
    // end conditions
    if (!w.over && (t > 18 || w.hp <= 0 || !alive.length)) { w.over = true; finishCombatSim(); }
  }
  function simKeys(e, down) {
    if (!sim) return false;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { sim.keys.left = down; return true; }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { sim.keys.right = down; return true; }
    if (down && e.key === 'Escape') { closeCombatSim(false); return true; }
    return false;
  }
  function onKey(e) {
    if (simKeys(e, true)) { e.preventDefault(); return; }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    const s = st();
    if (!s) return;
    if (e.code === 'Space') { e.preventDefault(); if (!ui.modalOpen()) { A().togglePause(s); syncSpeedButtons(); } }
    else if (e.key === '1') A().setSpeed(s, 1);
    else if (e.key === '2') A().setSpeed(s, 3);
    else if (e.key === '3') A().setSpeed(s, 10);
    else if (e.key === 'f' || e.key === 'F') { if (SW.render.selectedSys !== null) SW.render.centerOn(SW.render.selectedSys); }
    else if (e.key === 'g' || e.key === 'G') { if (SW.render.mode !== 'system') SW.render.alignToPlane(); }
    else if (e.key === 'Home') { ui.exitSystem(); SW.render.centerOn(s.homeId); }
    else if (e.key === 'F3') { e.preventDefault(); SW.render.showPerf = !SW.render.showPerf; }
    else if (e.key === 'Escape') {
      if (!$('#exchange').classList.contains('hidden')) { $('#exchange').classList.add('hidden'); return; }
      if (SW.render.mode === 'system') { ui.exitSystem(); return; }
      if (mapMode) { setMapMode(null); if (editorOpen) { editorOpen = false; ui.routeDraft = null; renderDock(true); } }
      else if (ui.modalOpen() && !st().story.pending && !st().gameOver) hideModals();
      else { SW.render.selectedShip = null; SW.render.selectedSys = null; pinnedInfo = null; ui.refresh(); }
    }
    syncSpeedButtons();
  }

  return ui;
})();
