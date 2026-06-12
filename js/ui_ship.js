/* STARWEFT ui_ship.js — Ship chip, command bar, fleet tab. Browser only. */
var SW = globalThis.SW = globalThis.SW || {};

SW.uiShip = (function () {
  const U = SW.util, D = SW.data;
  const m = {};

  // Shared helpers from coordinator — invoked at render time only (safe).
  function $(sel) { return SW.ui.$(sel); }
  function st() { return SW.ui.st(); }
  function A() { return SW.ui.A(); }
  function esc(s) { return SW.ui.esc(s); }
  function selectedShip() { return SW.ui.selectedShip(); }
  function logisticsShips(s) { return SW.ui.logisticsShips(s); }

  // ============ ship chip ============
  function renderShipChip() {
    const s = st(), chip = $('#shipChip');
    const ship = selectedShip();
    if (!ship) { chip.classList.add('hidden'); return; }
    chip.classList.remove('hidden');
    const hull = D.HULLS[ship.hull];
    let status;
    if (ship.mode === 'travel') status = '→ ' + esc(s.systems[ship.leg.to].name) + ' · ETA ' + Math.max(0, ship.leg.arrive - s.tick);
    else if (ship.mode === 'shuttle' && ship.hop) status = '⇢ → ' + esc(ship.hop.to) + ' · ETA ' + Math.max(0, ship.hop.arrive - s.tick);
    else if (ship.routeId) { const r = s.routes.find(function (x) { return x.id === ship.routeId; }); status = '↻ ' + esc(r ? r.name : 'route'); }
    else if (ship.directiveId) status = '◎ directive';
    else if (ship.mission && ship.mission.kind === 'supply') status = '▢ supply run';
    else status = 'idle · ' + esc(ship.at !== null ? s.systems[ship.at].name : '?') + (ship.body ? ' · ' + esc(ship.body) : '');

    let html = '<div class="row" data-info="ship:' + ship.id + '"><span class="title grow">' + hull.glyph + ' ' + esc(ship.name) + '</span><span class="sub">' + hull.name + '</span>' +
      '<button data-act="deselShip">✕</button></div>';
    html += '<div class="sub">' + status + ' · hold ' + SW.ships.cargoTotal(ship) + '/' + SW.ships.cap(s, ship) +
      (hull.power ? ' · pwr ' + SW.combat.power(s, ship) : '') +
      (ship.stranded ? ' · <span style="color:var(--danger)">stranded</span>' : '') + '</div>';
    if (ship.rec) {
      const R2 = ship.rec;
      const bits = [];
      if (R2.hauls) bits.push(R2.hauls + ' hauls');
      if (R2.surveys) bits.push(R2.surveys + ' surveys');
      if (R2.charted) bits.push(R2.charted + ' first sightings');
      if (R2.raids) bits.push(R2.raids + ' raids');
      if (bits.length) html += '<div class="sub" title="Service record — this hull\'s history">≡ ' + bits.join(' · ') + '</div>';
    }
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
    else if (ship.mode === 'shuttle' && ship.hop) status = 'shuttling to ' + esc(ship.hop.to) + ' / ETA ' + Math.max(0, ship.hop.arrive - s.tick);
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
      '<label class="sub" style="cursor:pointer"><input type="checkbox" id="chkSellArrive" ' + (SW.ui.sendSellOnArrive ? 'checked' : '') + '> sell on arrival</label>' +
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
      const sim = SW.tech.has(s, 'simulacrum');
      html += '<button class="danger" data-act="raidHere" ' + (cd ? 'disabled' : '') + ' title="' + (sim ? 'Plan the raid in the Tactical Simulacrum, then fly it or auto-resolve.' : 'Raid this system\'s commerce. Infamy will follow.') + '">† RAID' + (cd ? ' (' + cd + ')' : '') + '</button>';
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
    if (chk) chk.addEventListener('change', function () { SW.ui.sendSellOnArrive = chk.checked; });
    const sel = $('#selAssignRoute');
    if (sel) sel.addEventListener('change', function () { if (sel.value) { A().assignShip(s, ship.id, sel.value); SW.ui.refresh(); } });
  }

  // ============ fleet tab ============
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
      else if (ship.mode === 'shuttle' && ship.hop) statusTxt = '⇢ → ' + esc(ship.hop.to) + ' (' + Math.max(0, ship.hop.arrive - s.tick) + ')';
      else if (ship.routeId) { const r = s.routes.find(function (x) { return x.id === ship.routeId; }); statusTxt = '↻ ' + esc(r ? r.name : '?'); }
      else if (ship.directiveId) statusTxt = '◎ directive';
      else if (ship.mission && ship.mission.kind === 'supply') statusTxt = '▢ supply';
      else statusTxt = 'idle · ' + esc(s.systems[ship.at].name) + (ship.body ? ' · ' + esc(ship.body) : '');
      const load = SW.ships.cargoTotal(ship);
      html += '<div class="listItem clicky" data-act="focusShip" data-id="' + ship.id + '" data-info="ship:' + ship.id + '">' +
        '<div class="row"><span class="title grow">' + hull.glyph + ' ' + esc(ship.name) + '</span><span class="sub">' + statusTxt + '</span></div>' +
        '<div class="row"><div class="bar"><div style="width:' + Math.round(100 * load / SW.ships.cap(s, ship)) + '%"></div></div><span class="sub num">' + load + '/' + SW.ships.cap(s, ship) + '</span></div>' +
        '</div>';
    }
    body.innerHTML = html;
  }

  m.renderShipChip = renderShipChip;
  m.renderCommandBar = renderCommandBar;
  m.renderFleet = renderFleet;
  return m;
})();
