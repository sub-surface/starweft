/* STARWEFT ui_market.js — Exchange terminal, ticker, market rendering. Browser only. */
var SW = globalThis.SW = globalThis.SW || {};

SW.uiMarket = (function () {
  const U = SW.util, D = SW.data;
  const m = {};

  // Shared helpers from coordinator — called at render time only (safe: coordinator loads after us,
  // but these are only invoked when render functions are called, not at module load time).
  function $(sel) { return SW.ui.$(sel); }
  function st() { return SW.ui.st(); }
  function esc(s) { return SW.ui.esc(s); }
  function commName(c) { return SW.ui.commName(c); }

  // ============ ticker carousel ============
  // One ambient channel: market movers, world headlines, dock gossip.
  // Clicking an item focuses what it's about.
  let tickerBeat = 0, tickerCount = 0, tickerAction = null;
  const TICKER_FLAVOR = [
    'Dock gossip: the Mariners are paying for quiet lanes again',
    'Lost: one cargo manifest, sentimental value. Reward in FUEL',
    'The Synod reminds all pilots that the lanes are prayers',
    'Combine futures desk closed pending "recalibration"',
    'Heard on the wire: a scout came back from the dark singing',
    'Vigil bulletin: report unlicensed lane-keels. Report everything',
    'Classified: Sparrow hull, lightly raided, runs fine, no questions',
    'The Severed do not advertise. This space intentionally dark',
    'Earth Anchorage noodle stand now accepts CRYSTAL. Owner regrets it',
    'Loomkeeper pamphlet: WEFT AND BE WOVEN',
    'Salvage law reminder: if it sings, it is not salvage',
    'A drifter swears the black hole blinked. Drinks were involved',
  ];
  function tickerMovers(s) {
    const out = [];
    for (const c of D.COMM_IDS) {
      if (D.COMMODITIES[c].locked) continue;
      let now = 0, then = 0, n = 0;
      for (const sys of s.systems) {
        const h = sys.hist && sys.hist[c];
        if (!h || h.length < 5) continue;
        now += h[h.length - 1]; then += h[h.length - 5]; n++;
      }
      if (n < 3 || then <= 0) continue;
      const pct = (now - then) / then * 100;
      if (Math.abs(pct) >= 5) out.push({ c: c, pct: pct });
    }
    out.sort(function (a, b) { return Math.abs(b.pct) - Math.abs(a.pct); });
    return out.slice(0, 3);
  }
  function rotateTicker() {
    const s = st();
    if (!s) return;
    const items = [];
    for (const mv of tickerMovers(s)) {
      items.push({
        text: (mv.pct > 0 ? '▲ ' : '▼ ') + D.COMMODITIES[mv.c].name + ' ' + (mv.pct > 0 ? '+' : '') + Math.round(mv.pct) + '% across the weave',
        act: { kind: 'exchange', c: mv.c },
      });
    }
    for (const nw of (s.news || []).slice(-6).reverse()) {
      items.push({ text: nw.text, act: nw.sys !== null && nw.sys !== undefined ? { kind: 'sys', id: nw.sys } : null });
    }
    items.push({ text: '"' + TICKER_FLAVOR[(Math.floor(s.tick / 40) + tickerCount) % TICKER_FLAVOR.length] + '"', act: null });
    tickerCount++;
    const it = items[tickerCount % items.length];
    tickerAction = it.act;
    const el = $('#ticker');
    if (!el) return;
    el.textContent = it.text;
    el.style.cursor = it.act ? 'pointer' : '';
  }
  function tickerClick() {
    const s = st();
    if (!s || !tickerAction) return;
    if (tickerAction.kind === 'sys' && s.systems[tickerAction.id]) SW.ui.jumpToSystem(tickerAction.id);
    else if (tickerAction.kind === 'exchange' && SW.tech.has(s, 'exchange')) {
      m.setComm(tickerAction.c);
      $('#exchange').classList.remove('hidden');
      m.renderExchange();
    }
  }

  // Private commodity selection state (coordinator sets via setComm for dispatch case 'exComm')
  let exchangeComm = 'FOOD';
  m.setComm = function (c) { exchangeComm = c; };

  // ============ exchange (market dashboard) ============
  // marketTarget, inboundCargo, marketRole live in js/market_analytics.js (SW.market).
  function toggleExchange() {
    const ex = $('#exchange');
    if (ex.classList.contains('hidden')) { ex.classList.remove('hidden'); m.renderExchange(); }
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

    // Known Economy index — only discovered, non-corrupted systems (no hidden leakage)
    html += '<h4>Known Economy</h4>';
    const totalWealth = SW.market.knownWealth(s);
    const activeRoutes = s.routes.filter(function (r) { return r.ships && r.ships.length > 0; }).length;
    const totalFleetValue = s.ships.reduce(function (sum, sh) { const h = D.HULLS[sh.hull]; return sum + (h.cost || 0); }, 0);
    html += '<div class="row"><span class="sub">wealth</span><span class="num">' + U.fmt(totalWealth) + '¤</span></div>';
    html += '<div class="row"><span class="sub">fleet value</span><span class="num">' + U.fmt(totalFleetValue) + '¤</span></div>';
    html += '<div class="row"><span class="sub">active routes</span><span class="num">' + activeRoutes + '</span></div>';

    // per-system table for the chosen commodity
    const rows = s.systems.filter(function (x) { return x.discovered && x.scourge !== 2; })
      .map(function (x) { return { sys: x, price: SW.economy.price(s, x, exchangeComm), stock: Math.floor(x.stocks[exchangeComm] || 0) }; })
      .sort(function (a, b) { return a.price - b.price; });
    html += '<h4>Commodity Tape</h4><table class="mkt"><tr><th>system</th><th>stock</th><th>price</th><th>trend</th><th></th></tr>';
    for (const row of rows.slice(0, 30)) {
      const hist = row.sys.hist && row.sys.hist[exchangeComm];
      const ratio = row.price / D.COMMODITIES[exchangeComm].base;
      const pc = ratio < 0.8 ? '#7fe0a8' : ratio > 1.35 ? '#ffb070' : 'var(--ink-dim)';
      html += '<tr data-info="system:' + row.sys.id + '"><td>' + esc(row.sys.name) + '</td><td class="num">' + row.stock + '</td><td class="num" style="color:' + pc + '">' + Math.round(row.price) + '</td>' +
        '<td>' + sparkHtml(hist) + '</td>' +
        '<td><button data-act="centerSys" data-id="' + row.sys.id + '">◎</button></td></tr>';
    }
    html += '</table>';

    const depth = rows.map(function (row) {
      const target = SW.market.marketTarget(row.sys, exchangeComm);
      const inbound = SW.market.inboundCargo(s, row.sys.id, exchangeComm);
      const gap = Math.max(0, target - row.stock - inbound);
      return {
        sys: row.sys, price: row.price, stock: row.stock, target: target,
        inbound: inbound, gap: gap, role: SW.market.marketRole(row.sys, exchangeComm, target, gap),
      };
    }).filter(function (row) {
      return row.stock > 0 || row.target > 0 || row.inbound > 0 || (row.sys.prod[exchangeComm] || 0) > 0;
    }).sort(function (a, b) {
      if (b.gap !== a.gap) return b.gap - a.gap;
      if (a.role !== b.role) return a.role < b.role ? -1 : 1;
      return a.price - b.price;
    });
    html += '<h4>Supply map</h4><table class="mkt"><tr><th>system</th><th>role</th><th>stock</th><th>target</th><th>gap</th><th>in-flight</th><th>actions</th></tr>';
    for (const row of depth.slice(0, 18)) {
      const src = row.gap > 0 ? SW.economy.cheapestSource(s, exchangeComm, Math.min(5, row.gap), row.sys.id) : null;
      let actions = '<button data-act="centerSys" data-id="' + row.sys.id + '" class="textBtn">' + '>' + 'focus' + '<' + '</button>';
      if (src) actions += ' <button data-act="fetchOp" data-from="' + src.id + '" data-to="' + row.sys.id + '" data-c="' + exchangeComm + '" class="textBtn">' + '>' + 'fetch' + '<' + '</button>';
      if (src && s.story.flags.routes_unlocked) actions += ' <button data-act="quickRoute" data-from="' + src.id + '" data-to="' + row.sys.id + '" data-c="' + exchangeComm + '" class="textBtn">' + '>' + 'route' + '<' + '</button>';
      if (row.target > 0 && SW.tech.has(s, 'directives')) actions += ' <button data-act="marketKeep" data-sys="' + row.sys.id + '" data-c="' + exchangeComm + '" data-target="' + row.target + '">keep</button>';
      html += '<tr data-info="system:' + row.sys.id + '"><td>' + esc(row.sys.name) + '</td>' +
        '<td>' + row.role + '</td><td class="num">' + row.stock + '</td>' +
        '<td class="num">' + (row.target || '·') + '</td>' +
        '<td class="num" style="color:' + (row.gap > 0 ? 'var(--danger)' : 'var(--ink-dim)') + '">' + (row.gap || '·') + '</td>' +
        '<td class="num">' + (row.inbound || '·') + '</td><td>' +
        actions + '</td></tr>';
    }
    if (!depth.length) html += '<tr><td colspan="7" class="sub">No discovered demand or supply yet.</td></tr>';
    html += '</table></div><div id="exSide">';

    // opportunities with one-click route creation
    html += '<h4>Best opportunities</h4>';
    const ops = SW.economy.opportunities(s, 8);
    for (const op of ops) {
      html += '<div class="row"><span class="grow sub">' + commName(op.c) + ' ' + esc(s.systems[op.from].name.split(' ')[0]) + '→' + esc(s.systems[op.to].name.split(' ')[0]) +
        ' <b class="num" style="color:var(--accent)">+' + Math.round(op.margin) + '</b></span>' +
        '<button data-act="quickRoute" data-from="' + op.from + '" data-to="' + op.to + '" data-c="' + op.c + '">＋ route</button></div>';
    }
    const recipe = D.RECIPES.find(function (r) { return r.out === exchangeComm && (!r.tech || SW.tech.has(s, r.tech)); });
    if (recipe) {
      html += '<h4>Supply chain</h4>';
      html += '<div class="sub">' + Object.keys(recipe.inputs).map(function (c) {
        return recipe.inputs[c] + ' ' + D.COMMODITIES[c].name;
      }).join(' + ') + ' -> ' + D.COMMODITIES[exchangeComm].name + '</div>';
      html += SW.tech.has(s, 'metaroutes') ?
        '<div class="row"><button data-act="chainRoute" data-c="' + exchangeComm + '">weave route</button></div>' :
        '<div class="sub">Weftworks can automate this into one chain route.</div>';
    }
    // movers: the terminal reads the same history the sparklines do
    html += '<h4>Movers</h4>';
    const mv = tickerMovers(s);
    if (!mv.length) html += '<div class="sub">Markets becalmed. Suspicious in its own way.</div>';
    for (const mover of mv) {
      html += '<div class="row"><span class="grow sub" data-info="commodity:' + mover.c + '">' + commName(mover.c) + '</span>' +
        '<span class="num" style="color:' + (mover.pct > 0 ? '#ffb070' : '#7fe0a8') + '">' + (mover.pct > 0 ? '▲ +' : '▼ ') + Math.round(mover.pct) + '%</span>' +
        '<button data-act="exComm" data-c="' + mover.c + '">view</button></div>';
    }
    // bulletins: paid placements, allegedly
    html += '<h4 title="The terminal carries advertising. The terminal regrets nothing.">Bulletins</h4>';
    html += '<div class="sub">' + esc(TICKER_FLAVOR[Math.floor(s.tick / 40) % TICKER_FLAVOR.length]) + '</div>';
    html += '<div class="sub">' + esc(TICKER_FLAVOR[(Math.floor(s.tick / 40) + 5) % TICKER_FLAVOR.length]) + '</div>';
    // fleet utilization
    const idle = SW.ui.logisticsShips(s);
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

  function renderExchangeV2() {
    const s = st();
    const ex = $('#exchange');
    let html = '<header><h2><i style="color:var(--accent)">â–¦</i> THE MARKET</h2>';
    for (const c of D.COMM_IDS) {
      if (D.COMMODITIES[c].locked && !SW.tech.has(s, 'panacea')) continue;
      html += '<span class="commChip' + (c === exchangeComm ? ' sel' : '') + '" data-exc="' + c + '" data-info="commodity:' + c + '">' + commName(c) + '</span>';
    }
    html += '<div style="flex:1"></div><button data-act="closeExchange">âœ•</button></header>';
    html += '<div id="exGrid"><div id="exMain">';

    const report = SW.market.buildCommodityReport(s, exchangeComm);
    const totalWealth = SW.market.knownWealth(s);
    const activeRoutes = s.routes.filter(function (r) { return r.ships && r.ships.length > 0; }).length;
    const totalFleetValue = s.ships.reduce(function (sum, sh) { const h = D.HULLS[sh.hull]; return sum + (h.cost || 0); }, 0);
    html += '<h4>Known Economy</h4>';
    html += '<div class="row"><span class="sub">wealth</span><span class="num">' + U.fmt(totalWealth) + ' cr</span></div>';
    html += '<div class="row"><span class="sub">fleet value</span><span class="num">' + U.fmt(totalFleetValue) + ' cr</span></div>';
    html += '<div class="row"><span class="sub">active routes</span><span class="num">' + activeRoutes + '</span></div>';

    html += '<h4>Commodity Tape <span class="sub">need-first</span></h4><table class="mkt"><tr><th>system</th><th>role</th><th>stock</th><th>gap</th><th>price</th><th>trend</th><th></th></tr>';
    for (const row of report.rows.slice(0, 30)) {
      const ratio = row.price / D.COMMODITIES[exchangeComm].base;
      const pc = ratio < 0.8 ? '#7fe0a8' : ratio > 1.35 ? '#ffb070' : 'var(--ink-dim)';
      html += '<tr data-info="system:' + row.sys.id + '"><td>' + esc(row.sys.name) + '</td><td>' + row.role + '</td><td class="num">' + row.stock + '</td>' +
        '<td class="num" style="color:' + (row.gap > 0 ? 'var(--danger)' : 'var(--ink-dim)') + '">' + (row.gap || '-') + '</td>' +
        '<td class="num" style="color:' + pc + '">' + Math.round(row.price) + '</td>' +
        '<td>' + sparkHtmlV2(row.hist, row.deltaPct) + '<span class="sub">' + (row.deltaPct > 0 ? '+' : '') + Math.round(row.deltaPct) + '%</span></td>' +
        '<td><button data-act="centerSys" data-id="' + row.sys.id + '">â—Ž</button></td></tr>';
    }
    html += '</table>';

    html += '<h4>Sources & sinks</h4><div class="marketPairs">';
    html += '<div><div class="sub">cheapest sources</div>';
    for (const row of report.sources.slice(0, 5)) {
      html += '<div class="row" data-info="system:' + row.sys.id + '"><span class="grow">' + esc(row.sys.name) + '</span><span class="num">' + row.stock + ' @ ' + Math.round(row.price) + '</span></div>';
    }
    html += '</div><div><div class="sub">dearest needs</div>';
    for (const row of report.sinks.slice(0, 5)) {
      html += '<div class="row" data-info="system:' + row.sys.id + '"><span class="grow">' + esc(row.sys.name) + '</span><span class="num">' + (row.gap || row.target || '-') + ' @ ' + Math.round(row.price) + '</span></div>';
    }
    html += '</div></div>';

    const depth = report.rows.filter(function (row) {
      return row.stock > 0 || row.target > 0 || row.inbound > 0 || (row.sys.prod[exchangeComm] || 0) > 0;
    });
    html += '<h4>Supply map</h4><table class="mkt"><tr><th>system</th><th>role</th><th>stock</th><th>target</th><th>gap</th><th>in-flight</th><th>actions</th></tr>';
    for (const row of depth.slice(0, 18)) {
      const need = Math.min(5, row.gap);
      const srcRow = row.gap > 0 ? report.sources.find(function (r) { return r.sys.id !== row.sys.id && r.stock >= need; }) : null;
      const src = srcRow && srcRow.sys;
      let actions = '<button data-act="centerSys" data-id="' + row.sys.id + '" class="textBtn">' + '>' + 'focus' + '<' + '</button>';
      if (src) actions += ' <button data-act="fetchOp" data-from="' + src.id + '" data-to="' + row.sys.id + '" data-c="' + exchangeComm + '" class="textBtn">' + '>' + 'fetch' + '<' + '</button>';
      if (src && s.story.flags.routes_unlocked) actions += ' <button data-act="quickRoute" data-from="' + src.id + '" data-to="' + row.sys.id + '" data-c="' + exchangeComm + '" class="textBtn">' + '>' + 'route' + '<' + '</button>';
      if (row.target > 0 && SW.tech.has(s, 'directives')) actions += ' <button data-act="marketKeep" data-sys="' + row.sys.id + '" data-c="' + exchangeComm + '" data-target="' + row.target + '">keep</button>';
      html += '<tr data-info="system:' + row.sys.id + '"><td>' + esc(row.sys.name) + '</td>' +
        '<td>' + row.role + '</td><td class="num">' + row.stock + '</td>' +
        '<td class="num">' + (row.target || '-') + '</td>' +
        '<td class="num" style="color:' + (row.gap > 0 ? 'var(--danger)' : 'var(--ink-dim)') + '">' + (row.gap || '-') + '</td>' +
        '<td class="num">' + (row.inbound || '-') + '</td><td>' + actions + '</td></tr>';
    }
    if (!depth.length) html += '<tr><td colspan="7" class="sub">No discovered demand or supply yet.</td></tr>';
    html += '</table></div><div id="exSide">';

    html += '<h4>Best opportunities</h4>';
    const ops = SW.economy.opportunities(s, 8);
    for (const op of ops) {
      html += '<div class="row"><span class="grow sub">' + commName(op.c) + ' ' + esc(s.systems[op.from].name.split(' ')[0]) + 'â†’' + esc(s.systems[op.to].name.split(' ')[0]) +
        ' <b class="num" style="color:var(--accent)">+' + Math.round(op.margin) + '</b></span>' +
        '<button data-act="quickRoute" data-from="' + op.from + '" data-to="' + op.to + '" data-c="' + op.c + '">ï¼‹ route</button></div>';
    }
    const recipe = D.RECIPES.find(function (r) { return r.out === exchangeComm && (!r.tech || SW.tech.has(s, r.tech)); });
    if (recipe) {
      html += '<h4>Supply chain</h4>';
      html += '<div class="sub">' + Object.keys(recipe.inputs).map(function (c) { return recipe.inputs[c] + ' ' + D.COMMODITIES[c].name; }).join(' + ') + ' -> ' + D.COMMODITIES[exchangeComm].name + '</div>';
      html += SW.tech.has(s, 'metaroutes') ? '<div class="row"><button data-act="chainRoute" data-c="' + exchangeComm + '">weave route</button></div>' : '<div class="sub">Weftworks can automate this into one chain route.</div>';
    }
    html += '<h4>Movers</h4>';
    const mv = report.movers.slice(0, 6);
    if (!mv.length) html += '<div class="sub">Markets becalmed. Suspicious in its own way.</div>';
    for (const mover of mv) {
      html += '<div class="row"><span class="grow sub" data-info="system:' + mover.sys.id + '">' + esc(mover.sys.name) + '</span>' +
        '<span class="num" style="color:' + (mover.deltaPct > 0 ? '#ffb070' : '#7fe0a8') + '">' + (mover.deltaPct > 0 ? 'â–² +' : 'â–¼ ') + Math.round(mover.deltaPct) + '%</span>' +
        '<button data-act="centerSys" data-id="' + mover.sys.id + '">view</button></div>';
    }
    html += '<h4 title="The terminal carries advertising. The terminal regrets nothing.">Bulletins</h4>';
    html += '<div class="sub">' + esc(TICKER_FLAVOR[Math.floor(s.tick / 40) % TICKER_FLAVOR.length]) + '</div>';
    html += '<div class="sub">' + esc(TICKER_FLAVOR[(Math.floor(s.tick / 40) + 5) % TICKER_FLAVOR.length]) + '</div>';
    const idle = SW.ui.logisticsShips(s);
    html += '<h4>Fleet</h4>';
    html += '<div class="sub">' + s.ships.length + ' ships - ' + idle.length + ' idle - ' + s.routes.length + ' routes</div>';
    if (idle.length) {
      html += '<div class="row"><button data-act="employAll">employ all idle</button></div>';
      if (s.routes.length) {
        html += '<div class="row"><select id="bulkRoute">' + s.routes.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + '</option>'; }).join('') + '</select>' +
          '<button data-act="bulkAssign">assign idle â†’</button></div>';
      }
    }
    html += '<h4>Routes</h4>';
    for (const r of s.routes) {
      html += '<div class="row"><span class="grow sub">' + esc(r.name) + ' - ' + r.ships.length + ' ships</span><span class="num sub">' + (r.totalProfit >= 0 ? '+' : '') + U.fmt(r.totalProfit) + '</span></div>';
    }
    html += '</div></div>';
    ex.innerHTML = html;
    ex.querySelectorAll('[data-exc]').forEach(function (el) {
      el.addEventListener('click', function () { exchangeComm = el.dataset.exc; renderExchangeV2(); });
    });
    ex.querySelectorAll('canvas.spark').forEach(drawSparkV2);
  }

  function sparkHtmlV2(hist, deltaPct) {
    if (!hist || hist.length < 3) return '<span class="sub">-</span>';
    return '<canvas class="spark" width="72" height="18" data-delta="' + (deltaPct || 0) + '" data-hist="' + hist.join(',') + '"></canvas>';
  }

  function drawSparkV2(cv) {
    const vals = cv.dataset.hist.split(',').map(Number);
    const ctx = cv.getContext('2d');
    const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    const delta = Number(cv.dataset.delta || 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = 'rgba(201,209,217,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(1, 9); ctx.lineTo(71, 9); ctx.stroke();
    ctx.strokeStyle = delta > 1 ? '#ffb070' : delta < -1 ? '#7fe0a8' : 'rgba(201,209,217,0.8)';
    ctx.beginPath();
    vals.forEach(function (v, i) {
      const x = (i / (vals.length - 1)) * 70 + 1;
      const y = hi === lo ? 9 : 16 - ((v - lo) / (hi - lo)) * 14;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  m.rotateTicker = rotateTicker;
  m.tickerClick = tickerClick;
  m.toggleExchange = toggleExchange;
  m.renderExchange = renderExchangeV2;
  m.sparkHtml = sparkHtmlV2;

  return m;
})();
