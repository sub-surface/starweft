/* STARWEFT ui_routes.js — Routes tab, ops tab, log tab, you tab, directives UI. Browser only.
   Note: renderYou and renderLog are dock tabs but live here (not ui_ship.js) to avoid
   one-tiny-file-per-tab proliferation. renderOps also lives here as it is ops-tab content. */
var SW = globalThis.SW = globalThis.SW || {};

SW.uiRoutes = (function () {
  const U = SW.util, D = SW.data;
  const m = {};

  // Shared helpers from coordinator — invoked at render time only (safe).
  function $(sel) { return SW.ui.$(sel); }
  function st() { return SW.ui.st(); }
  function A() { return SW.ui.A(); }
  function esc(s) { return SW.ui.esc(s); }
  function commName(c) { return SW.ui.commName(c); }
  function logisticsShips(s) { return SW.ui.logisticsShips(s); }

  // ============ YOU: the captain, not the network ============
  function renderYou(body) {
    const s = st();
    let html = '<div class="row"><canvas id="youSigil" width="56" height="56"></canvas>' +
      '<div class="grow"><div class="title">' + esc(s.identity.name) + '</div>' +
      '<div class="sub">"' + esc(s.identity.motto) + '"</div></div></div>';
    const doc = SW.tech.doctrine(s);
    const stanceNames = { hold: 'HOLD THE LINE', cure: 'CHASE THE CURE', exodus: 'PREPARE THE EXODUS' };
    html += '<div class="row">' +
      '<span class="tag" data-info="origin:' + s.origin + '">' + esc(D.ORIGINS[s.origin].name) + '</span>' +
      (doc ? '<span class="tag acc" data-info="tech:' + doc + '">' + esc(D.TECHS[doc].name) + '</span>' : '<span class="tag" style="opacity:0.5">no doctrine yet</span>') +
      (s.scourgeStance ? '<span class="tag' + (s.scourgeStance === 'hold' ? '' : ' acc') + '">' + stanceNames[s.scourgeStance] + '</span>' : '') +
      ((s.infamy || 0) >= 1 ? '<span class="tag bad">infamy ' + Math.floor(s.infamy) + '</span>' : '') +
      '</div>';

    // progression lives in the Development surface; this is the launcher
    const pts = s.perkPoints || 0;
    const owned = (s.perks || []).length;
    const msDone = Object.keys(s.milestones || {}).length;
    html += '<h4>Development</h4>';
    html += '<div class="row"><span class="sub grow">◇ ' + U.fmt(Math.floor(s.research)) + ' research · ✦ ' + pts + ' aptitude point' + (pts === 1 ? '' : 's') +
      ' · ' + owned + ' mastered · ◆ ' + msDone + '/' + D.PERK_MILESTONES.length + ' milestones</span></div>';
    html += '<div class="row">' +
      '<button class="' + (pts ? 'primary' : '') + '" data-act="devTab" data-tab="aptitudes" title="Spend aptitude points — the Development surface">✦ aptitudes</button>' +
      '<button data-act="devTab" data-tab="research" title="The research tree">◇ research</button>' +
      '<button data-act="devTab" data-tab="milestones" title="Where aptitude points come from">◆ milestones</button></div>';
    // the fleet's collected history
    let hauls = 0, surveys = 0, charted = 0, raids = 0;
    for (const sh of s.ships) {
      const r = sh.rec || {};
      hauls += r.hauls || 0; surveys += r.surveys || 0; charted += r.charted || 0; raids += r.raids || 0;
    }
    html += '<h4>Service record (fleet)</h4>';
    html += '<div class="sub">' + hauls + ' hauls · ' + surveys + ' surveys · ' + charted + ' first sightings · ' + raids + ' raids</div>';
    html += '<div class="sub">' + (s.stats.dataSold ? U.fmt(s.stats.dataSold) + '¤ in charts sold · ' : '') + (s.fragments || []).length + ' chronicle fragments</div>';
    body.innerHTML = html;
    const cv = document.getElementById('youSigil');
    if (cv) SW.ui.addPortrait(cv, { kind: 'sigil', seed: s.identity.sigil, hue: s.identity.hue });
  }

  // ============ routes tab ============
  function renderRoutes(body, force) {
    const s = st();
    if (SW.ui.editorOpen && !force) { updateProjection(); return; }
    let html = '';
    if (!s.story.flags.routes_unlocked) {
      body.innerHTML = '<div class="sub">Route automation is locked. Make a few manual deliveries — the Guild left you something.</div>';
      return;
    }
    if (SW.ui.editorOpen) {
      html += '<h4>New route — click systems on the map</h4>';
      if (!SW.ui.routeDraft.length) html += '<div class="sub">Add 2+ stops. Classic: buy at a producer, sell at a hungry world.</div>';
      SW.ui.routeDraft.forEach(function (stop, i) {
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
      html += '<div class="row"><button class="primary" data-act="draftCreate" ' + (SW.ui.routeDraft.length < 2 ? 'disabled' : '') + '>create</button>' +
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
        return '<option value="' + c + '"' + (c === SW.ui.directiveForm.c ? ' selected' : '') + '>' + D.COMMODITIES[c].name + '</option>';
      }).join('') + '</select>' +
        '<input id="dirTarget" type="number" value="' + SW.ui.directiveForm.target + '" min="10" max="500" style="width:54px">' +
        '<button data-act="dirStart">＋ keep stocked…</button></div>';
      for (const d of s.directives) {
        html += '<div class="listItem"><div class="row"><span class="title grow">◎ ' + esc(s.systems[d.sys].name) + ' · ' + commName(d.c) + ' ≥ ' + d.target + '</span>' +
          '<button class="danger" data-act="dirDel" data-id="' + d.id + '">✕</button></div>' +
          '<div class="sub">' + s.ships.filter(function (sh) { return sh.directiveId === d.id; }).length + ' ships</div></div>';
      }
      const idleShips = logisticsShips(s);
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
    if (!el || !SW.ui.routeDraft || SW.ui.routeDraft.length < 2) { if (el) el.textContent = ''; return; }
    const s = st();
    const ship = SW.ui.selectedShip();
    const hull = ship ? ship.hull : 'sparrow';
    const proj = SW.ships.projectRoute(s, SW.ui.routeDraft, hull);
    const perTick = proj.profit / Math.max(1, proj.dist / D.HULLS[hull].speed);
    el.textContent = 'projected ' + (proj.profit >= 0 ? '+' : '') + U.fmt(proj.profit) + '¤/loop ≈ ' +
      (perTick >= 0 ? '+' : '') + perTick.toFixed(1) + '¤/tick (' + D.HULLS[hull].name + ')';
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
    // wire contracts (classifieds from market analytics)
    if (SW.market && SW.market.classifieds) {
      const wire = SW.market.classifieds(s, 8);
      const actionable = wire.filter(function (ad) { return ad.kind === 'wanted' || ad.kind === 'surplus' || ad.kind === 'charter'; });
      if (actionable.length) {
        html += '<h4 title="Offers and needs from across the known weave.">The Wire</h4>';
        for (const ad of actionable) {
          const glyph = ad.kind === 'wanted' ? '⊳' : ad.kind === 'surplus' ? '⊲' : '⇄';
          let act = '';
          if (ad.kind === 'wanted' && ad.from !== null && ad.to !== null)
            act = ' <button data-act="fetchOp" data-from="' + ad.from + '" data-to="' + ad.to + '" data-c="' + ad.c + '" class="textBtn">&gt;take it&lt;</button>';
          else if (ad.kind === 'charter' && s.story.flags.routes_unlocked)
            act = ' <button data-act="quickRoute" data-from="' + ad.from + '" data-to="' + ad.to + '" data-c="' + ad.c + '" class="textBtn">&gt;sign on&lt;</button>';
          else if (ad.kind === 'surplus')
            act = ' <button data-act="centerSys" data-id="' + ad.from + '" class="textBtn">&gt;look&lt;</button>';
          html += '<div class="wireAd wire-' + ad.kind + '"><span class="wireGlyph">' + glyph + '</span> ' + esc(ad.text) + act + '</div>';
        }
      }
    }

    // blockades
    if (s.blockades.length) {
      html += '<h4>Blockades</h4>';
      s.blockades.forEach(function (bl, i) {
        const known = s.systems[bl.a].discovered || s.systems[bl.b].discovered;
        if (!known) return;
        const ship = SW.ui.selectedShip();
        const canBreak = ship && ship.mode === 'idle' && (ship.at === bl.a || ship.at === bl.b) && SW.combat.power(s, ship) >= 4;
        html += '<div class="listItem bad"><div class="row"><span class="title grow">⊘ ' + esc(s.systems[bl.a].name) + ' ↔ ' + esc(s.systems[bl.b].name) + '</span></div>' +
          '<div class="row"><span class="sub num grow">' + (bl.until - s.tick) + ' ticks · toll ' + U.fmt(bl.toll) + '¤</span>' +
          '<button data-act="payToll" data-i="' + i + '" ' + (s.credits < bl.toll ? 'disabled' : '') + '>pay</button>' +
          '<button class="danger" data-act="breakBlockade" data-i="' + i + '" ' + (canBreak ? '' : 'disabled') + ' title="Needs an armed, idle, selected ship at either end">‡ break</button></div></div>';
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
    if ((s.infamy || 0) > 0.5) html += '<div class="sub">† infamy ' + s.infamy.toFixed(1) + (s.infamy >= D.TUNE.infamyBlackMarket ? ' — Reach black markets open (+15% sell)' : '') + '</div>';
    body.innerHTML = html;
  }

  // ============ log tab ============
  function renderLog(body) {
    const s = st();
    let html = '';
    // signals inbox: waiting hails, answered or dismissed in your own time
    const hails = (s.story && s.story.hails) || [];
    if (hails.length || (s.story && s.story.hail)) {
      html += '<h4 title="Open channels. Answer them, or let them lapse — silence is also an answer.">Signals</h4>';
      if (s.story.hail) {
        html += '<div class="listItem"><div class="row"><span class="title grow">◌ ' + esc(s.story.hail.title || 'Incoming hail') + '</span>' +
          '<button class="primary" data-act="openHail">open</button>' +
          '<button data-act="dismissHail">✕</button></div></div>';
      }
      for (const h of hails) {
        html += '<div class="listItem' + (h.mood === 'bad' ? ' bad' : '') + '"><div class="row"><span class="title grow">◌ ' + esc(h.title || 'Signal') +
          (h.count > 1 ? ' <span class="tag">×' + h.count + '</span>' : '') + '</span><span class="sub num">⧗' + h.at + '</span>' +
          '<button class="primary" data-act="openHail" data-key="' + esc(h.key) + '">open</button>' +
          '<button data-act="dismissHail" data-key="' + esc(h.key) + '" title="Decline. Some callers remember.">✕</button></div></div>';
      }
    }
    if (SW.quests && SW.quests.markJournalViewed) SW.quests.markJournalViewed(s);
    const contracts = (SW.quests && SW.quests.company) ? SW.quests.company(s) : [];
    if (contracts.length) {
      html += '<h4>Company Contracts</h4>';
      for (const ct of contracts) {
        html += '<div class="listItem"><div class="row"><span class="title grow">' + esc(ct.title) + '</span>' +
          '<span class="tag">' + esc(ct.issuer) + '</span></div>' +
          '<div class="sub">' + esc(ct.summary) + '</div>';
        for (const step of ct.steps) {
          html += '<div class="row"><span class="sub grow">' +
            (step.done ? '[x] ' : (step.current ? '[>] ' : '[ ] ')) + esc(step.label) + '</span></div>';
        }
        if (ct.action) {
          html += '<div class="row"><span class="grow"></span><button class="primary" data-act="' + esc(ct.action) + '">' + esc(ct.actionLabel || 'Authorize') + '</button></div>';
        }
        html += '</div>';
      }
      html += '<h4>Chronicle Log</h4>';
    }
    const log = s.story.log.slice().reverse();
    if (!log.length) html += '<div class="sub">The story will find you.</div>';
    for (const entry of log) {
      html += '<div class="listItem"><div class="row"><span class="title grow">' + esc(entry.title) +
        ((entry.n || 1) > 1 ? ' <span class="tag" title="This scene repeated; the journal keeps one line.">×' + entry.n + '</span>' : '') +
        '</span><span class="sub num">⧗' + entry.tick + '</span></div>' +
        '<div class="sub">' + esc(entry.text).slice(0, 200) + '</div>' +
        '<div class="sub" style="color:var(--accent)">→ ' + esc(entry.choice) + (entry.result ? ' · ' + esc(entry.result) : '') + '</div></div>';
    }
    body.innerHTML = html;
  }

  m.renderYou = renderYou;
  m.renderRoutes = renderRoutes;
  m.updateProjection = updateProjection;
  m.renderOps = renderOps;
  m.renderLog = renderLog;
  return m;
})();
