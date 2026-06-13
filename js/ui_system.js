/* STARWEFT ui_system.js — Selected system panel. Browser only. */
var SW = globalThis.SW = globalThis.SW || {};

SW.uiSystem = (function () {
  const U = SW.util, D = SW.data;
  const m = {};

  // Shared helpers from coordinator — invoked at render time only (safe).
  function $(sel) { return SW.ui.$(sel); }
  function st() { return SW.ui.st(); }
  function A() { return SW.ui.A(); }
  function esc(s) { return SW.ui.esc(s); }
  function commName(c) { return SW.ui.commName(c); }
  function selectedShip() { return SW.ui.selectedShip(); }
  function pickLogisticsShip(s, preferred) { return SW.ui.pickLogisticsShip(s, preferred); }

  // ============ shared facility formatter ============
  // Returns a short human-readable benefit string for a facility definition, e.g.
  //   '+0.45 Ore/t to this market', '+0.25 research/t', '+40 storage', '+2M settlers'
  function facilityFxText(fid) {
    const f = D.FACILITIES[fid];
    if (!f || !f.fx) return '';
    const parts = [];
    if (f.fx.prod) {
      for (const c in f.fx.prod) {
        const comm = D.COMMODITIES[c];
        parts.push('+' + f.fx.prod[c].toFixed(2) + ' ' + (comm ? comm.name : c) + '/t');
      }
    }
    if (f.fx.research) parts.push('+' + f.fx.research.toFixed(2) + ' research/t');
    if (f.fx.cap)      parts.push('+' + f.fx.cap + ' storage cap');
    if (f.fx.pop)      parts.push('+' + f.fx.pop + 'M settlers');
    return parts.join(' · ');
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
        ' title="Move the Home anchorage here. The command web re-centers; the Scourge loses your scent.">⌂ relocate home (' + U.fmt(D.TUNE.relocateCost) + '¤)</button></div>';
    }

    if (sys.scourge === 2) {
      html += '<div class="listItem bad"><span style="color:var(--danger)">† Corrupted.</span> <span class="sub">' +
        (sys.id === s.scourge.originId ? 'The origin. Deliver ' + D.TUNE.panaceaToWin + ' Panacea here (' + s.scourge.delivered + ' so far).' : 'Impassable without Inoculated Hulls.') + '</span></div>';
      panel.innerHTML = html;
      return;
    }
    if (sys.scourge === 1) {
      html += '<div class="listItem bad"><span style="color:var(--danger)">△ Scourge in ' + Math.max(0, sys.threatAt - s.tick) + ' ticks.</span><div class="sub">Evacuate. A ship with ' + D.TUNE.panaceaToInoculate + ' Panacea can inoculate.</div></div>';
    }
    if (sys.pop > 0) {
      const cls = sys.prosperity > 60 ? 'hi' : sys.prosperity > 35 ? '' : 'lo';
      html += '<div class="row"><span class="sub">POP ' + U.fmt1(sys.pop) + 'M</span><div class="bar"><div class="' + cls + '" style="width:' + Math.round(sys.prosperity) + '%"></div></div><span class="sub num">' + Math.round(sys.prosperity) + '%</span></div>';
    }
    const cohort = (s.cohorts || []).find(function (co) { return co.from === sys.id && co.n > 0; });
    const charters = (s.charters || []).filter(function (ch) { return ch.from === sys.id; });
    if (cohort || charters.length) {
      html += '<h4>Passengers</h4>';
      if (cohort) {
        html += '<div class="listItem bad"><div class="row"><span class="grow">⇡ ' + U.fmt1(cohort.n) + 'M evacuees waiting</span>' +
          '<button class="primary" data-act="boardEvac" title="Board the selected idle berthed hull, or any idle berthed hull here, then send it to the haven.">evacuate</button></div>' +
          '<div class="sub">Haven: ' + esc(s.systems[cohort.haven].name) + ' · deadline ' + Math.max(0, (cohort.deadline || sys.threatAt) - s.tick) + 't.</div></div>';
      }
      for (const ch of charters) {
        html += '<div class="listItem"><div class="row"><span class="grow">⇡ ' + U.fmt1(ch.n) + 'M charter to ' + esc(s.systems[ch.to].name) + '</span>' +
          '<button data-act="boardCharter" data-id="' + ch.id + '" title="Board passengers onto an idle berthed hull here, then send it to the destination.">' + U.fmt(ch.fare) + '¤</button></div>' +
          '<div class="sub">Expires in ' + Math.max(0, ch.expires - s.tick) + 't · needs ' + Math.ceil(ch.n / D.TUNE.berthPop) + ' berths.</div></div>';
      }
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
    const locked = SW.tutorial && SW.tutorial.mapLocked(s); // prologue: the cradle only
    const ship = selectedShip();
    const shipHere = ship && ship.mode === 'idle' && ship.at === sys.id;
    const fetchShip = !shipHere && !locked ? pickLogisticsShip(s, ship) : null; // FETCH: one-click gather-and-deliver
    const canFetch = !!fetchShip;
    const berth = shipHere ? ship.body : null; // berth rates color the whole table
    html += '<h4>Market' + (berth ? ' <span class="sub">— berthed at ' + esc(berth) + '</span>' : '') + '</h4>' +
      '<table class="mkt"><tr><th>good</th><th>stock</th><th>price</th><th>Δ</th>' + (shipHere || canFetch ? '<th></th>' : '') + '</tr>';
    for (const c of D.COMM_IDS) {
      if (D.COMMODITIES[c].locked && !SW.tech.has(s, 'panacea')) continue;
      const stock = Math.floor(sys.stocks[c] || 0);
      if (stock === 0 && !(sys.cons[c] > 0) && !shipHere) continue;
      const bm = berth ? SW.economy.berthMult(s, sys, berth, c) : 1;
      const price = SW.economy.price(s, sys, c) * bm;
      const ratio = price / D.COMMODITIES[c].base;
      // deal colors: green = buy here, orange = sell here
      const pcol = ratio < 0.8 ? '#7fe0a8' : ratio > 1.35 ? '#ffb070' : 'var(--ink-dim)';
      const hist = sys.hist && sys.hist[c];
      let trend = '·';
      if (hist && hist.length > 3) {
        const old = hist[Math.max(0, hist.length - 4)];
        trend = price > old * 1.06 ? '↑' : price < old * 0.94 ? '↓' : '·';
      }
      const bmark = bm < 1 ? ' <span style="color:#7fe0a8" title="' + esc(berth || '') + ' rate">▾</span>' : bm > 1 ? ' <span style="color:#ffb070" title="' + esc(berth || '') + ' rate">▴</span>' : '';
      html += '<tr data-info="commodity:' + c + '"><td>' + commName(c) + '</td><td>' + stock + '</td><td style="color:' + pcol + '">' + Math.round(price) + bmark + '</td><td>' + trend + '</td>';
      if (shipHere) {
        html += '<td><button data-act="buy" data-c="' + c + '" data-q="5">+5</button> <button data-act="buy" data-c="' + c + '" data-q="999">max</button> ' +
          ((ship.cargo[c] || 0) > 0 ? '<button data-act="sellc" data-c="' + c + '">sell</button>' : '') + '</td>';
      } else if (canFetch) {
        html += '<td><button data-act="fetchHere" data-c="' + c + '" title="Order ' + esc(fetchShip.name) + ': buy ' + D.COMMODITIES[c].name + ' at the cheapest charted source, deliver it here">⇄ fetch</button></td>';
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

    // construction — hidden in the prologue: the escrow is for the Hydrofarm,
    // and a player who spends it on a Depot has bought themselves a wall
    const builds = locked ? [] : Object.keys(D.BUILDINGS).filter(function (b) {
      const def = D.BUILDINGS[b];
      if (sys.buildings.indexOf(b) >= 0) return false;
      if (def.tech && !SW.tech.has(s, def.tech)) return false;
      if (def.onlyType === 'producer' && Object.keys(sys.prod).length === 0) return false;
      if (def.onlyType === 'pop' && !(sys.pop > 0 && sys.type === 'pop')) return false;
      if (def.onlyWonder && sys.wonder !== def.onlyWonder) return false;
      return true;
    });
    if ((!locked && sys.buildings.length) || builds.length) html += '<h4>Construction</h4>';
    if (!locked && sys.buildings.length) {
      html += '<div class="row">' + sys.buildings.map(function (b) {
        return '<span class="tag acc" data-info="building:' + b + '">' + D.BUILDINGS[b].icon + ' ' + D.BUILDINGS[b].name + '</span>';
      }).join('') + '</div>';
    }
    for (const b of builds) {
      const def = D.BUILDINGS[b];
      const bCost = SW.game.buildingCost(s, b);
      const plan = SW.market.supplyPlan(s, sys.id, def.mats);
      const localReady = plan.every(function (row) { return row.local >= row.need; });
      const project = (s.projects || []).find(function (p) { return p.sys === sys.id && p.b === b; });
      html += '<div class="listItem" data-info="building:' + b + '"><div class="row"><span class="title grow">' + def.icon + ' ' + def.name + '</span>';
      if (project) {
        html += '<button class="danger" data-act="cancelProject" data-id="' + project.id + '" title="Cancel the project. Supplies already moving finish their delivery.">✕</button>';
      } else if (localReady) {
        html += '<button data-act="build" data-b="' + b + '" ' + (s.credits < bCost ? 'disabled' : '') + '>build</button>';
      } else {
        html += '<button class="primary" data-act="projectBuild" data-b="' + b + '" title="One order: idle haulers fetch every missing material, then the ' + def.name + ' is raised automatically.">▢ supply &amp; build</button>';
      }
      html += '</div><div class="sub num">' + U.fmt(bCost) + '¤ + ' + Object.keys(def.mats).map(function (c) { return def.mats[c] + ' ' + D.COMMODITIES[c].icon; }).join(' + ') + '</div>';
      if (b === 'relay') {
        const R = SW.ships.rangeOf(s);
        const newly = s.systems.filter(function (x) { return x.discovered && !SW.ships.inRange(s, x) && U.dist(sys, x) <= R; }).length;
        if (newly) html += '<div class="sub">◬ would bring ' + newly + ' charted system' + (newly === 1 ? '' : 's') + ' into command range.</div>';
      }
      if (project) {
        html += '<div class="sub">▢ project under way' + (project.note ? ' — <span class="num">' + esc(project.note) + '</span>' : '') + '</div>';
      }
      if (!localReady) {
        html += '<div class="row"><span class="sub">plan:</span>' + plan.map(function (row) {
          const covered = row.local + row.inbound;
          const tone = row.uncovered > 0 && !project ? '' : ' acc';
          return '<span class="tag' + tone + '" title="' + D.COMMODITIES[row.c].name + ': ' + row.local + ' on-site, ' + row.inbound + ' inbound, need ' + row.need + '">' +
            D.COMMODITIES[row.c].icon + ' ' + Math.min(covered, row.need) + '/' + row.need + (row.inbound > 0 ? ' ⇣' : '') + '</span>';
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
      const optsAll = SW.sites.options(s, sys, selBody);
      const opts = locked ? ((s.tutorial && s.tutorial.goal >= 4) ? optsAll.filter(function (fid) { return fid === 'hydrofarm'; }) : []) : optsAll;
      const curList = SW.sites.listAt(sys, selBody.name);
      // the in-system verb: shuttle the selected (or any idle) local ship here
      const hopShip = (ship && ship.mode === 'idle' && ship.at === sys.id) ? ship :
        s.ships.find(function (sh) { return sh.mode === 'idle' && sh.at === sys.id; });
      const hopping = s.ships.find(function (sh) { return sh.at === sys.id && sh.mode === 'shuttle' && sh.hop && sh.hop.to === selBody.name; });
      if (curList.length || opts.length || hopShip || hopping) {
        const cap = SW.sites.slotCap(selBody);
        html += '<h4>' + esc(selBody.name) + ' <span class="sub">anchorage ' + curList.length + '/' + cap + '</span></h4>';
        if (hopping) {
          html += '<div class="sub">⇢ ' + esc(hopping.name) + ' en route — ' + Math.max(0, hopping.hop.arrive - s.tick) + 't.</div>';
        } else if (hopShip && (hopShip.body || null) !== selBody.name) {
          const eta = SW.ships.hopTicks(s, sys.id, hopShip.body, selBody.name);
          html += '<div class="row"><button class="primary" data-act="hopHere" data-body="' + esc(selBody.name) + '" ' +
            'title="Shuttle ' + esc(hopShip.name) + ' to a berth at ' + esc(selBody.name) + ' (~' + eta + 't). Berth rates apply to trades.">⇢ FLY HERE (' + eta + 't)</button></div>' +
            (locked ? '<div class="sub">This is the prologue verb: berth, buy, haul, sell.</div>' : '');
        } else if (hopShip) {
          html += '<div class="sub">⇢ ' + esc(hopShip.name) + ' is berthed here.</div>';
        }
        for (const cur of curList) {
          const cf = D.FACILITIES[cur.fac];
          const fxLine = facilityFxText(cur.fac);
          html += '<div class="sub">' + cf.icon + ' ' + cf.name + (cf.orbital ? ' (in orbit)' : '') + ' anchored here.' +
            (fxLine ? ' <span class="sub num">' + esc(fxLine) + '</span>' : '') + '</div>';
        }
        for (const fid of opts) {
          const f = D.FACILITIES[fid];
          const fCost = SW.sites.costOf(s, fid);
          const fxLine = facilityFxText(fid);
          html += '<div class="listItem"><div class="row"><span class="title grow">' + f.icon + ' ' + f.name + '</span>' +
            '<button data-act="buildSite" data-fac="' + fid + '" data-body="' + esc(selBody.name) + '" ' + (s.credits < fCost ? 'disabled' : '') + '>build</button></div>' +
            '<div class="sub num">' + U.fmt(fCost) + '¤ + ' + Object.keys(f.mats).map(function (c) { return f.mats[c] + ' ' + D.COMMODITIES[c].icon; }).join(' + ') + ' · ' + esc(f.desc) + '</div>' +
            (fxLine ? '<div class="sub num">' + esc(fxLine) + '</div>' : '') +
            '</div>';
        }
      }
    }

    // shipyard — hidden in the prologue (one hull, one escrow, one lesson)
    if (!locked && (sys.id === s.homeId || sys.type === 'industrial')) {
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
        const where = sh.mode === 'shuttle' && sh.hop ? '⇢ → ' + esc(sh.hop.to) + ' (' + Math.max(0, sh.hop.arrive - s.tick) + 't)' :
          sh.body ? '· ' + esc(sh.body) : '· anchorage';
        html += '<div class="row" data-info="ship:' + sh.id + '"><span class="grow">' + D.HULLS[sh.hull].glyph + ' ' + esc(sh.name) + ' <span class="sub">' + where + '</span></span><button data-act="selShip" data-id="' + sh.id + '">select</button></div>';
      }
    }
    panel.innerHTML = SW.ui.sectionizePanelHtml(html, 'sys');
  }

  m.renderSysPanel = renderSysPanel;
  return m;
})();
