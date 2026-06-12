/* STARWEFT ui_modals.js — Modals, menus, codex, events, game over, title screen, combat sim. Browser only. */
var SW = globalThis.SW = globalThis.SW || {};

SW.uiModals = (function () {
  const U = SW.util, D = SW.data;
  const m = {};

  // Shared helpers from coordinator — invoked at render time only (safe).
  function $(sel) { return SW.ui.$(sel); }
  function st() { return SW.ui.st(); }
  function A() { return SW.ui.A(); }
  function esc(s) { return SW.ui.esc(s); }
  function commName(c) { return SW.ui.commName(c); }

  // Module-private state
  let codexTab = 'ships', codexHull = 'sparrow';
  let chosenOrigin = 'courier';
  let sim = null;

  // Expose codexHull for portraitLoop in coordinator (reads at animation time)
  Object.defineProperty(m, 'codexHull', { get: function () { return codexHull; } });

  // ============ codex ============
  function showCodex() {
    renderCodex();
    SW.ui.showModal('codexModal');
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
      SW.ui.addPortrait(cv, { kind: 'cast', id: cv.dataset.cast });
    });
  }

  // ============ event modal ============
  function showEvent() {
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
    if (e.speaker) SW.ui.addPortrait($('#evPortrait'), e.speaker);
    SW.ui.showModal('eventModal');
  }
  function chooseEvent(i) {
    const s = st();
    const r = A().chooseEvent(s, i);
    if (r.ok && r.result) {
      const res = $('#evResult');
      res.textContent = r.result;
      res.classList.remove('hidden');
      $('#eventModal .choices').innerHTML = '<button class="primary" data-act="closeModal">continue</button>';
    } else SW.ui.hideModals();
    SW.ui.refresh();
  }

  // ============ game over ============
  function showGameOver(go) {
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
    SW.ui.showModal('gameoverModal');
  }
  function gr(k, v) { return '<div>' + k + '</div><div class="v">' + v + '</div>'; }

  // ============ title / identity / origins ============
  function showTitle() {
    const modal = $('#titleModal');
    const hasAuto = SW.game.hasSave('auto');
    SW.ui._sigilSeed = Math.floor(Math.random() * 1000);
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
    html += '<div class="row"><span class="sub" style="width:64px">world</span>' +
      '<select id="ngDen">' + Object.keys(D.WORLD.density).map(function (k) { return '<option value="' + k + '"' + (k === 'standard' ? ' selected' : '') + '>' + D.WORLD.density[k].name + '</option>'; }).join('') + '</select>' +
      '<select id="ngWea">' + Object.keys(D.WORLD.wealth).map(function (k) { return '<option value="' + k + '"' + (k === 'standard' ? ' selected' : '') + '>' + D.WORLD.wealth[k].name + '</option>'; }).join('') + '</select>' +
      '<span class="sub">deep wilds and rival networks always active</span></div>';
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
    SW.ui.showModal('titleModal');
  }

  // ============ menus ============
  function showMenu() {
    const modal = $('#menuModal');
    modal.innerHTML = '<h2>MENU</h2><div class="choices">' +
      '<button data-act="saveManual">save</button>' +
      '<button data-act="loadManual" ' + (SW.game.hasSave('manual') ? '' : 'disabled') + '>load</button>' +
      '<button data-act="exportSave">export save → clipboard</button>' +
      '<button data-act="importSave">import save</button>' +
      '<button data-act="cheats">feature check</button>' +
      '<button data-act="help">how to play</button>' +
      '<button data-act="newGameMenu">new run</button>' +
      '<button data-act="closeModal">resume</button></div>';
    SW.ui.showModal('menuModal');
  }
  function showCheats() {
    const s = st();
    const sysId = SW.render.selectedSys !== null && SW.render.selectedSys !== undefined ? SW.render.selectedSys : s.homeId;
    const sys = s.systems[sysId] || s.systems[s.homeId];
    const hidden = s.systems.filter(function (x) { return !x.discovered; }).length;
    const unlocked = s.tech.unlocked.length;
    const html = '<h2>FEATURE CHECK</h2>' +
      '<div class="statGrid">' +
      '<div>credits</div><div class="v">' + U.fmt(s.credits) + '</div>' +
      '<div>research</div><div class="v">' + Math.floor(s.research) + '</div>' +
      '<div>tech</div><div class="v">' + unlocked + '/' + Object.keys(D.TECHS).length + '</div>' +
      '<div>ships</div><div class="v">' + s.ships.length + '</div>' +
      '<div>hidden systems</div><div class="v">' + hidden + '</div>' +
      '</div><div class="choices">' +
      '<button data-act="cheatResources">resources</button>' +
      '<button data-act="cheatUnlock">unlock feature gates</button>' +
      '<button data-act="cheatReveal">reveal + survey map</button>' +
      '<button data-act="cheatStock" data-sys="' + sys.id + '">stock ' + esc(sys.name) + '</button>' +
      '<button data-act="cheatFleet" data-sys="' + sys.id + '">spawn test fleet</button>' +
      '<button data-act="closeModal">close</button></div>';
    $('#cheatModal').innerHTML = html;
    SW.ui.showModal('cheatModal');
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
    SW.ui.showModal('helpModal');
  }

  // ============ tactical simulacrum (manual combat) ============
  // A timed lane-defense engagement. Performance bends the raid odds by up to
  // ±25% (clamped in the sim) — skill is an edge, never a guarantee. The
  // AUTO-RESOLVE button keeps the stats-only path for players who'd rather not.
  function openCombatSim(ship, sys) {
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
  }
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
      if (!r.ok) SW.ui.toast({ kind: 'bad', text: r.msg }); else SW.audio.sfx('raid');
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
      if (!r.ok) SW.ui.toast({ kind: 'bad', text: r.msg });
      else {
        SW.audio.sfx('raid');
        SW.ui.toast({ kind: 'info', text: '⌖ Simulacrum: ' + kills + '/' + w.total + ' cleared, hull ' + Math.max(0, w.hp) + '/3 — odds ' + (edge >= 0 ? '+' : '') + Math.round(edge * 100) + '%.' });
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

  m.showCodex = showCodex;
  m.showEvent = showEvent;
  m.chooseEvent = chooseEvent;
  m.showGameOver = showGameOver;
  m.showTitle = showTitle;
  m.showMenu = showMenu;
  m.showCheats = showCheats;
  m.showHelp = showHelp;
  m.openCombatSim = openCombatSim;
  m.closeCombatSim = closeCombatSim;
  m.simKeys = simKeys;
  return m;
})();
