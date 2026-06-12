/* STARWEFT browser-boot check — loads the FULL stack (render/ui/audio/main)
   against a stub DOM and exercises every panel, modal, and the frame loop.
   Catches wiring errors (missing functions, bad references) without a browser.
   Run: node test/browser_boot.js */
'use strict';
const path = require('path');

let failures = 0;
function fail(msg, err) {
  failures++;
  console.error('  FAIL: ' + msg + (err ? ' — ' + (err.stack || err) : ''));
}
function step(msg, fn) {
  try { fn(); console.log('  ok: ' + msg); } catch (err) { fail(msg, err); }
}

// ---------- stub DOM ----------
function stubCtx() {
  const grad = { addColorStop: function () {} };
  return new Proxy({}, {
    get: function (t, k) {
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return function () { return grad; };
      if (k === 'measureText') return function () { return { width: 10 }; };
      if (typeof t[k] !== 'undefined') return t[k];
      return function () {};
    },
    set: function (t, k, v) { t[k] = v; return true; },
  });
}

const listeners = {}; // type -> [fn]
function stubEl(tag) {
  let html = '';
  const el = {
    tagName: (tag || 'DIV').toUpperCase(),
    children: [],
    dataset: {},
    style: { setProperty: function (k, v) { el.style[k] = v; } },
    value: '', checked: false, disabled: false,
    firstChild: null,
    _cls: {},
    classList: null,
    textContent: '',
    scrollTop: 0,
    _listeners: {},
    addEventListener: function (type, fn) { (el._listeners[type] = el._listeners[type] || []).push(fn); },
    removeEventListener: function () {},
    appendChild: function (c) { el.children.push(c); el.firstChild = el.children[0]; },
    removeChild: function (c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); el.firstChild = el.children[0] || null; },
    closest: function () { return null; },
    getBoundingClientRect: function () { return { left: 0, top: 0, width: 1280, height: 720 }; },
    setPointerCapture: function () {},
    querySelector: function () { return stubEl(); },
    querySelectorAll: function () { return []; },
    getContext: function () { return stubCtx(); },
    clientWidth: 1280, clientHeight: 720, width: 0, height: 0,
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return html; },
    set: function (v) { html = String(v); el.scrollTop = 0; },
  });
  el.classList = {
    add: function (c) { el._cls[c] = 1; },
    remove: function (c) { delete el._cls[c]; },
    toggle: function (c, v) { if (v === undefined) v = !el._cls[c]; if (v) el._cls[c] = 1; else delete el._cls[c]; },
    contains: function (c) { return !!el._cls[c]; },
  };
  return el;
}

const elCache = {};
const canvasEl = stubEl('canvas');
const documentElement = stubEl('html');
const rafQueue = [];
const intervals = [];

const documentStub = {
  querySelector: function (sel) { return elCache[sel] = elCache[sel] || stubEl(sel.indexOf('input') >= 0 ? 'input' : 'div'); },
  querySelectorAll: function () { return []; },
  getElementById: function (id) { return id === 'map' ? canvasEl : (elCache['#' + id] = elCache['#' + id] || stubEl()); },
  addEventListener: function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  activeElement: null,
  documentElement: documentElement,
  createElement: function (tag) { return stubEl(tag); },
};
const storageMap = {};
const windowStub = {
  addEventListener: function () {},
  devicePixelRatio: 1,
  innerWidth: 1280, innerHeight: 720,
};

globalThis.window = windowStub;
globalThis.document = documentStub;
globalThis.localStorage = {
  getItem: function (k) { return storageMap[k] !== undefined ? storageMap[k] : null; },
  setItem: function (k, v) { storageMap[k] = String(v); },
  removeItem: function (k) { delete storageMap[k]; },
};
globalThis.requestAnimationFrame = function (fn) { rafQueue.push(fn); return rafQueue.length; };
globalThis.setInterval = function (fn, ms) { intervals.push(fn); return intervals.length; };
globalThis.getComputedStyle = function () { return { getPropertyValue: function () { return '#9bd6ea'; } }; };
try { Object.defineProperty(globalThis, 'navigator', { value: { clipboard: null }, configurable: true }); } catch (e) {}
globalThis.prompt = function () { return null; };
// no AudioContext on purpose: audio must degrade gracefully

// ---------- load the whole stack, including main.js (boots immediately) ----------
const FILES = ['util', 'data', 'perks', 'starcat', 'lore', 'events_data', 'planets', 'sites', 'galaxy', 'economy', 'ships', 'combat', 'rivals', 'scourge', 'tech', 'story', 'worldevents', 'tutorial', 'quests', 'civics', 'game', 'audio', 'portraits', 'codex', 'render', 'market_analytics', 'ui_market', 'ui_ship', 'ui_system', 'ui_routes', 'ui_tech', 'ui_modals', 'ui', 'main'];
step('full stack loads and main.js boots', function () {
  for (const f of FILES) require(path.join(__dirname, '..', 'js', f + '.js'));
});

const SW = globalThis.SW;
const G = SW.game, A = SW.game.actions;

function pumpFrames(n) {
  for (let i = 0; i < n; i++) {
    const q = rafQueue.splice(0);
    for (const fn of q) fn(1000 + i * 16);
  }
}
function fireClick(act, data) {
  const btn = { dataset: Object.assign({ act: act }, data || {}), disabled: false, closest: function () { return btn; } };
  const evt = { target: { closest: function () { return btn; }, tagName: 'BUTTON' } };
  for (const fn of (listeners.click || [])) fn(evt);
}
function fireSectionClick(section) {
  const h = {
    dataset: { section: section },
    closest: function (sel) { return sel && sel.indexOf('#sysPanel h4') >= 0 ? h : null; },
  };
  const evt = {
    target: { closest: function (sel) { return h.closest(sel); } },
    preventDefault: function () {},
    stopPropagation: function () {},
  };
  for (const fn of (listeners.click || [])) fn(evt);
}
function fireChangeTarget(id, value) {
  const el = { id: id, value: value, dataset: {}, classList: { contains: function () { return false; } } };
  const evt = { target: el };
  for (const fn of (listeners.change || [])) fn(evt);
}
function fireInputTarget(id, value) {
  const el = { id: id, value: value, dataset: {}, classList: { contains: function () { return false; } } };
  const evt = { target: el };
  for (const fn of (listeners.input || [])) fn(evt);
}
function firePointer(type, target) {
  const evt = { target: target || { closest: function () { return null; } } };
  for (const fn of (listeners[type] || [])) fn(evt);
}

step('game state exists after boot', function () {
  if (!G.state || !G.state.systems.length) throw new Error('no state');
});

step('begin a new game via title-screen action', function () {
  elCache['#ngSeed'] = stubEl('input'); elCache['#ngSeed'].value = 'boot-test';
  elCache['#ngDiff'] = stubEl('select'); elCache['#ngDiff'].value = 'standard';
  fireClick('begin');
  if (G.state.seed !== 'boot-test') throw new Error('seed not applied: ' + G.state.seed);
  if (G.state.paused) throw new Error('game did not unpause');
});

step('simulate 300 ticks with UI refresh + frames', function () {
  for (let i = 0; i < 300; i++) {
    if (G.state.story.pending) {
      SW.ui.showEvent();              // exercise the modal builder
      A.chooseEvent(G.state, 0);
    }
    G.tick(G.state);
    if (i % 10 === 0) { SW.ui.refresh(); pumpFrames(2); }
  }
});

step('select home + ship, render system panel', function () {
  SW.render.selectedSys = G.state.homeId;
  SW.render.selectedShip = G.state.ships.length ? G.state.ships[0].id : null;
  SW.ui.refresh();
  const commandHtml = (elCache['#commandBar'] && elCache['#commandBar'].innerHTML) || '';
  if (commandHtml.indexOf('COMMAND') < 0 || commandHtml.indexOf('sendMode') < 0) throw new Error('command bar missing selected-unit controls');
  pumpFrames(3);
});

step('map hover + click on every system type', function () {
  for (const sys of G.state.systems) SW.ui.mapHover(sys, 100, 100);
  SW.ui.mapHover(null);
  SW.ui.mapClick(G.state.systems[G.state.homeId]);
  SW.ui.mapClick(null);
});

step('all dock tabs render', function () {
  ['fleet', 'routes', 'ops', 'you', 'log'].forEach(function (t) { SW.ui.setTab(t); });
});

step('camera alignment action flattens the orbit view', function () {
  SW.render.cam.pitch = 1.1;
  SW.render.cam.yaw = 2.4;
  fireClick('alignPlane');
  if (Math.abs(SW.render.cam.pitch - 0.45) > 0.001) throw new Error('pitch not aligned: ' + SW.render.cam.pitch);
  if (Math.abs(SW.render.cam.yaw - 0.6) > 0.001) throw new Error('yaw not aligned: ' + SW.render.cam.yaw);
});

step('orbit guide is projected from galactic axes', function () {
  SW.render.cam.yaw = 1.1;
  SW.render.cam.pitch = 0.7;
  if (typeof SW.render.galacticGuideAxes !== 'function') throw new Error('galacticGuideAxes missing');
  const g = SW.render.galacticGuideAxes(46);
  if (!g || !g.center || !g.core || !g.spin) throw new Error('guide axes incomplete');
  const coreDy = Math.abs(g.core.y - g.center.y);
  const spinDy = Math.abs(g.spin.y - g.center.y);
  if (coreDy < 1 && spinDy < 1) throw new Error('guide is screen-flat instead of plane-projected');
});

step('command bar owns ship actions; chip is status-only', function () {
  SW.render.selectedShip = G.state.ships.length ? G.state.ships[0].id : null;
  SW.ui.refresh();
  const bar = (elCache['#commandBar'] && elCache['#commandBar'].innerHTML) || '';
  const chip = (elCache['#shipChip'] && elCache['#shipChip'].innerHTML) || '';
  if (bar.indexOf('sendMode') < 0 || bar.indexOf('chkSellArrive') < 0) throw new Error('command bar missing send controls');
  if (bar.indexOf('followShip') < 0) throw new Error('command bar missing follow');
  if (chip.indexOf('sendMode') >= 0) throw new Error('ship chip still duplicates send controls');
});

step('interval refresh does not replace UI while pointer is down', function () {
  SW.render.selectedSys = G.state.homeId;
  SW.render.selectedShip = G.state.ships[0].id;
  SW.ui.refresh();
  let renders = 0;
  const orig = SW.uiSystem.renderSysPanel;
  try {
    SW.uiSystem.renderSysPanel = function () { renders++; return orig.apply(this, arguments); };
    G.tick(G.state);
    intervals.forEach(function (fn) { fn(); });
    if (renders === 0) throw new Error('test setup did not observe interval panel render');

    renders = 0;
    firePointer('pointerdown', { closest: function (sel) { return sel && sel.indexOf('#topbar') >= 0 ? {} : null; } });
    G.tick(G.state);
    intervals.forEach(function (fn) { fn(); });
    if (renders !== 0) throw new Error('panel rendered during active UI pointer press');

    firePointer('pointerup');
    if (renders !== 0) throw new Error('panel rendered synchronously on pointerup before click');
    fireClick('sendMode');
    if (!elCache['#map'] || elCache['#map']._cls.picking !== 1) throw new Error('first click after pointer release did not trigger SEND mode');
  } finally {
    SW.uiSystem.renderSysPanel = orig;
  }
});

step('follow + focus camera actions', function () {
  const shipId = G.state.ships[0].id;
  SW.render.selectedShip = shipId;
  fireClick('followShip');
  if (SW.render.followShip !== shipId) throw new Error('follow did not engage');
  fireClick('followShip');
  if (SW.render.followShip !== null) throw new Error('follow did not toggle off');
  SW.render.selectedSys = G.state.homeId;
  fireClick('focusSys'); // must not throw
});

step('combat simulacrum entry points exist', function () {
  if (typeof SW.ui.openCombatSim !== 'function') throw new Error('openCombatSim missing');
  if (!SW.data.TECHS.simulacrum || !SW.data.TECHS.deepdrives || !SW.data.TECHS.orbitalworks) throw new Error('new techs missing');
});

step('raid button opens simulacrum choice once unlocked', function () {
  const s = G.state;
  if (s.tech.unlocked.indexOf('corvettes') < 0) s.tech.unlocked.push('corvettes');
  if (s.tech.unlocked.indexOf('simulacrum') < 0) s.tech.unlocked.push('simulacrum');
  s.credits = 20000;
  const target = s.systems.find(function (sys) { return sys.id !== s.homeId && sys.discovered && sys.scourge !== 2; }) || s.systems[s.systems[s.homeId].links[0]];
  target.discovered = true;
  SW.ui.hideModals();
  const cv = SW.ships.create(s, 'corvette', target.id);
  cv.raidCooldownUntil = 0;
  SW.render.selectedShip = cv.id;
  SW.render.selectedSys = target.id;
  const inf0 = s.infamy || 0;
  const paused0 = s.paused;
  SW.ui.refresh();
  const commandHtml = (elCache['#commandBar'] && elCache['#commandBar'].innerHTML) || '';
  if (commandHtml.indexOf('data-act="simRaid"') >= 0) throw new Error('separate sim button still rendered');
  fireClick('raidHere');
  if ((s.infamy || 0) !== inf0) throw new Error('raidHere resolved before player chose manual or auto');
  if (s.paused !== paused0) throw new Error('raid choice changed pause state');
  if (elCache['#modalShade'].classList.contains('hidden') || elCache['#combatSim'].classList.contains('hidden')) throw new Error('raidHere did not open visible choice modal');
  const modalHtml = (elCache['#combatSim'] && elCache['#combatSim'].innerHTML) || '';
  if (modalHtml.indexOf('MANUAL BREACH') < 0 || modalHtml.indexOf('AUTO-RESOLVE') < 0) throw new Error('raid choice modal missing manual/auto actions');
  fireClick('simAuto');
  if ((s.infamy || 0) <= inf0) throw new Error('simAuto did not resolve the raid');
  if (s.paused !== paused0) throw new Error('simAuto did not restore pause state');
});

step('galactic LOD: frames render at every zoom scale', function () {
  for (const d of [30, 150, 700, 1600, 5000, 20000, 90000]) {
    SW.render.cam.dist = d; SW.render.cam.distTarget = d;
    pumpFrames(3);
  }
});

step('eased zoom glides toward its target distance', function () {
  SW.render.cam.dist = 150;
  SW.render.cam.distTarget = 1200;
  pumpFrames(80);
  if (Math.abs(SW.render.cam.dist - 1200) > 1) throw new Error('zoom did not converge: ' + SW.render.cam.dist);
  SW.render.cam.dist = 150; SW.render.cam.distTarget = 150;
});

step('tech tree opens via btnTech, overlay becomes visible', function () {
  // open via topbar button action
  fireClick('openTechTree');
  if (!SW.uiTech.isOpen()) throw new Error('tech overlay not open after openTechTree');
  // pump RAF so bindTechViewport and canvas draw execute
  pumpFrames(2);
  // canvas must have viewport handlers bound
  const canvas = elCache['#techCanvasFull'];
  if (!canvas || typeof canvas.onwheel !== 'function') throw new Error('tech canvas wheel handler missing after open');
  if (typeof canvas.onpointerdown !== 'function') throw new Error('tech canvas pan handler missing after open');
  // close via dispatch action
  fireClick('closeTechOverlay');
  if (SW.uiTech.isOpen()) throw new Error('tech overlay still open after closeTechOverlay');
  // re-open for subsequent tests
  fireClick('openTechTree');
  pumpFrames(2);
  if (!SW.uiTech.isOpen()) throw new Error('tech overlay did not re-open');
});

step('tech overlay supports pan, zoom, and node details', function () {
  // ensure overlay is open with bound canvas handlers
  fireClick('openTechTree');
  pumpFrames(2);
  if (!SW.ui.techView) throw new Error('tech view state missing');
  // capture zoom AFTER open+autoFit so baseline is the fitted zoom
  const zoom0 = SW.ui.techView.zoom;
  // zoom via direct call (mirrors what techZoomIn dispatch does)
  SW.uiTech.zoomTechView(1.18);
  if (SW.ui.techView.zoom <= zoom0) throw new Error('zoomTechView did not change zoom');
  const canvas = elCache['#techCanvasFull'];
  if (!canvas || typeof canvas.onwheel !== 'function') throw new Error('tech canvas wheel handler missing');
  const zoom1 = SW.ui.techView.zoom;
  canvas.onwheel({ deltaY: -100, clientX: 200, clientY: 120, preventDefault: function () {} });
  if (SW.ui.techView.zoom <= zoom1) throw new Error('wheel zoom did not change zoom');
  if (typeof canvas.onpointerdown !== 'function' || typeof canvas.onpointermove !== 'function') throw new Error('tech canvas pan handlers missing');
  const x0 = SW.ui.techView.x, y0 = SW.ui.techView.y;
  canvas.onpointerdown({ clientX: 120, clientY: 120, button: 0, preventDefault: function () {}, pointerId: 1 });
  canvas.onpointermove({ clientX: 152, clientY: 144, preventDefault: function () {} });
  canvas.onpointerup({ preventDefault: function () {} });
  if (SW.ui.techView.x === x0 && SW.ui.techView.y === y0) throw new Error('drag pan did not move viewport');
  // reset view
  SW.ui.techView.selected = 'analytics';
  fireClick('techResetView');
  if (SW.ui.techView.zoom !== 1 || SW.ui.techView.x !== 0 || SW.ui.techView.y !== 0) throw new Error('reset did not restore tech viewport');
  // detail html must contain selected tech info
  const s = SW.game.state;
  const detail = SW.uiTech.techDetailHtml(s, 'analytics');
  if (detail.indexOf('Market Analytics') < 0 || detail.indexOf('Unlocks') < 0) throw new Error('techDetailHtml missing content for analytics');
});

step('system view exposes pan controls', function () {
  SW.render.enterSystem(G.state.homeId);
  SW.render.systemPan.x = 0;
  SW.render.systemPan.y = 0;
  SW.render.systemAngle = 0;
  if (typeof SW.render.panSystemView !== 'function') throw new Error('panSystemView missing');
  SW.render.panSystemView(24, -12);
  if (SW.render.systemPan.x !== 24 || SW.render.systemPan.y !== -12) throw new Error('system pan not applied');
  SW.render.systemPan.x = 0;
  SW.render.systemPan.y = 0;
  SW.render.panSystemView(24, 2, true);
  if (SW.render.systemPan.x === 0 || SW.render.systemPan.y !== 0) throw new Error('system pan threshold did not favor horizontal drag');
  SW.render.panSystemView(2, 24, true);
  if (SW.render.systemPan.y === 0) throw new Error('system pan threshold did not allow vertical drag');
  if (typeof SW.render.rotateSystemView !== 'function') throw new Error('rotateSystemView missing');
  if (typeof SW.render.systemOrbitShape !== 'function') throw new Error('systemOrbitShape missing');
  const before = SW.render.systemOrbitShape();
  if (Math.abs(before.rotation + Math.PI / 2) > 0.001) throw new Error('default orbit plane lacks 90-degree correction');
  SW.render.rotateSystemView(0.4, 0.2);
  if (Math.abs(SW.render.systemAngle - 0.4) > 0.001) throw new Error('system rotation not applied');
  const after = SW.render.systemOrbitShape();
  if (Math.abs(after.rotation - before.rotation) < 0.001) throw new Error('orbit plane did not rotate');
  if (Math.abs(after.squash - before.squash) < 0.001) throw new Error('orbit inclination did not change');
  SW.render.exitSystem();
});

step('system view skybox maps actual galaxy positions', function () {
  SW.render.enterSystem(G.state.homeId);
  if (typeof SW.render.systemSkyPoint !== 'function') throw new Error('systemSkyPoint missing');
  const home = G.state.systems[G.state.homeId];
  const other = G.state.systems.find(function (x) { return x.id !== home.id && Math.abs(x.x - home.x) + Math.abs(x.y - home.y) + Math.abs(x.z - home.z) > 1; });
  const p0 = SW.render.systemSkyPoint(home, other);
  SW.render.rotateSystemView(0.5, 0);
  const p1 = SW.render.systemSkyPoint(home, other);
  if (!p0 || !p1 || (p0.x === p1.x && p0.y === p1.y)) throw new Error('system skybox is not tied to view/galaxy coordinates');
  SW.render.exitSystem();
});

step('asteroid belts expose annular pick targets', function () {
  SW.render.enterSystem(G.state.homeId);
  pumpFrames(3);
  if (typeof SW.render.debugBodyPickables !== 'function') throw new Error('debugBodyPickables missing');
  const picks = SW.render.debugBodyPickables();
  const belt = picks.find(function (p) { return p.body && p.body.name === 'The Belt'; });
  if (!belt) throw new Error('The Belt pick target missing');
  if (belt.kind !== 'annulus') throw new Error('The Belt pick target is not annular');
  if (!(belt.outerR > belt.innerR && belt.innerR > 0)) throw new Error('invalid belt annulus radii');
  SW.render.exitSystem();
});

step('right-drag pans freely on both axes (no snapping)', function () {
  SW.render.exitSystem();
  if (typeof SW.render.panGalaxyView !== 'function') throw new Error('panGalaxyView missing');
  SW.render.cam.tz = 12;
  const tx0 = SW.render.cam.tx;
  SW.render.panGalaxyView(40, 3, false); // mostly-horizontal diagonal must move BOTH axes
  if (SW.render.cam.tx === tx0) throw new Error('pan never moved x');
  if (SW.render.cam.tz === 12) throw new Error('free pan snapped the minor axis');
});

step('route editor flow (draft → create)', function () {
  G.state.story.flags.routes_unlocked = true;
  SW.ui.setTab('routes');
  fireClick('draftStart');
  const home = G.state.systems[G.state.homeId];
  const nb = G.state.systems[home.links[0]];
  SW.ui.mapClick(nb);
  SW.ui.mapClick(home);
  if (!SW.ui.routeDraft || SW.ui.routeDraft.length !== 2) throw new Error('draft has ' + (SW.ui.routeDraft || []).length + ' stops');
  fireClick('draftCreate');
  if (!G.state.routes.length) throw new Error('route not created');
});

step('market buy/sell buttons through dispatcher', function () {
  const ship = G.state.ships[0];
  if (!ship) return;
  SW.ships.unassign(G.state, ship);
  ship.mode = 'idle'; ship.at = G.state.homeId; ship.leg = null; ship.path = [];
  G.state.systems[G.state.homeId].stocks.FOOD = 50;
  G.state.credits += 500;
  SW.render.selectedShip = ship.id;
  SW.render.selectedSys = G.state.homeId;
  SW.ui.refresh();
  fireClick('buy', { c: 'FOOD', q: '5' });
  if (!ship.cargo.FOOD) throw new Error('buy via UI failed');
  fireClick('sellc', { c: 'FOOD' });
  if (ship.cargo.FOOD) throw new Error('sell via UI failed');
});

step('left system-panel sections start collapsed and toggle on click', function () {
  SW.render.selectedSys = G.state.homeId;
  SW.ui.refresh();
  const html = (elCache['#sysPanel'] && elCache['#sysPanel'].innerHTML) || '';
  const match = html.match(/<h4[^>]*data-section="([^"]+)"[^>]*data-title="Market"/);
  if (!match) throw new Error('market heading is not a collapsible section heading: ' + html.slice(0, 400));
  const section = match[1];
  if (html.indexOf('class="panelSection collapsed" data-section="' + section + '"') >= 0) {
    throw new Error('market section should be open by default');
  }
  fireSectionClick(section);
  const opened = (elCache['#sysPanel'] && elCache['#sysPanel'].innerHTML) || '';
  if (opened.indexOf('class="panelSection collapsed" data-section="' + section + '"') >= 0) {
    throw new Error('click did not open market section');
  }
  const other = G.state.systems.find(function (sys) { return sys.id !== G.state.homeId && sys.discovered; });
  if (!other) throw new Error('no discovered system available for cross-system section test');
  SW.render.selectedSys = other.id;
  SW.ui.refresh();
  const reopened = (elCache['#sysPanel'] && elCache['#sysPanel'].innerHTML) || '';
  if (reopened.indexOf('class="panelSection collapsed" data-section="' + section + '"') >= 0) {
    throw new Error('market section did not stay open across systems');
  }
  fireSectionClick(section);
  const closed = (elCache['#sysPanel'] && elCache['#sysPanel'].innerHTML) || '';
  if (closed.indexOf('class="panelSection collapsed" data-section="' + section + '"') < 0) {
    throw new Error('second click did not collapse market section');
  }
  SW.render.selectedSys = G.state.homeId;
  SW.ui.refresh();
  const returned = (elCache['#sysPanel'] && elCache['#sysPanel'].innerHTML) || '';
  if (returned.indexOf('class="panelSection collapsed" data-section="' + section + '"') < 0) {
    throw new Error('closed market section did not remain closed when returning to home');
  }
});

step('build + supply buttons through dispatcher', function () {
  G.state.credits = 9999;
  fireClick('buyShip', { h: 'sparrow' });
  fireClick('supply', { c: 'ALLOY', q: '8' });
  fireClick('build', { b: 'relay' }); // expected to fail politely (no mats yet) — must not throw
});

step('supply defaults to cargo, then fighters, never selected scouts', function () {
  const s = G.state;
  const home = s.systems[s.homeId];
  const nb = s.systems[home.links[0]];
  s.story.flags.routes_unlocked = true;
  s.credits = 9999;
  home.stocks.ALLOY = 80;
  home.stocks.GAS = 80;
  home.discovered = true; nb.discovered = true;
  const hold = A.createRoute(s, [
    { sys: home.id, action: 'buy', c: 'FOOD' },
    { sys: nb.id, action: 'sell' },
  ]).route;
  const existing = s.ships.slice();
  const scout = SW.ships.create(s, 'pathfinder', home.id);
  const fighter = SW.ships.create(s, 'corvette', home.id);
  const cargo = SW.ships.create(s, 'courier', home.id);
  existing.forEach(function (sh) {
    if (sh.mode === 'idle') SW.ships.assignToRoute(s, sh, hold);
  });
  [scout, fighter, cargo].forEach(function (sh) {
    SW.ships.unassign(s, sh);
    sh.mode = 'idle'; sh.at = home.id; sh.path = []; sh.leg = null; sh.mission = null; sh.queue = []; sh.cargo = {}; sh.basis = {};
  });
  SW.render.selectedSys = home.id;
  SW.render.selectedShip = scout.id;
  fireClick('supply', { c: 'ALLOY', q: '6' });
  if (!(cargo.cargo.ALLOY || (cargo.mission && cargo.mission.c === 'ALLOY'))) throw new Error('cargo ship was not chosen before scout/fighter');
  if (scout.cargo.ALLOY || scout.mission) throw new Error('selected scout was drafted into supply');
  cargo.mode = 'idle'; cargo.at = home.id; cargo.path = []; cargo.leg = null; cargo.mission = null;
  SW.ships.assignToRoute(s, cargo, hold);
  fireClick('supply', { c: 'GAS', q: '4' });
  if (!(fighter.cargo.GAS || (fighter.mission && fighter.mission.c === 'GAS'))) throw new Error('fighter was not chosen after cargo ships were busy');
  if (scout.cargo.GAS || scout.mission) throw new Error('scout was used before fighter fallback');
});

step('ambient hails render as actionable chips', function () {
  const ship = G.state.ships[0];
  G.state.story.pending = null;
  G.state.story.hail = { id: 'ev_derelict', ctx: { sysId: G.state.homeId, shipId: ship.id }, at: G.state.tick, fac: 'drifter', title: 'Derelict signal' };
  SW.ui.refresh();
  const alerts = (elCache['#alerts'] && elCache['#alerts'].innerHTML) || '';
  if (alerts.indexOf('openHail') < 0) throw new Error('hail chip not rendered in alerts: ' + alerts);
  fireClick('openHail');
  if (G.state.story.hail) throw new Error('hail was not consumed');
  if (G.state.story.pending !== 'ev_derelict') throw new Error('hail did not open event: ' + G.state.story.pending);
  G.state.story.pending = null;
});

step('exchange bulk assign button assigns idle ships', function () {
  G.state.story.flags.routes_unlocked = true;
  G.state.tech.unlocked.push('exchange');
  const route = G.state.routes[0] || A.createRoute(G.state, [
    { sys: G.state.homeId, action: 'buy', c: 'FOOD' },
    { sys: G.state.systems[G.state.homeId].links[0], action: 'sell' },
  ]).route;
  const ship = G.state.ships[0];
  SW.ships.unassign(G.state, ship);
  ship.mode = 'idle'; ship.at = G.state.homeId; ship.leg = null; ship.path = []; ship.mission = null; ship.queue = [];
  elCache['#bulkRoute'] = stubEl('select'); elCache['#bulkRoute'].value = route.id;
  fireClick('bulkAssign');
  if (ship.routeId !== route.id) throw new Error('bulkAssign did not assign idle ship');
});

step('exchange shows supply depth and can create keep-stocked directives', function () {
  const s = G.state;
  if (s.tech.unlocked.indexOf('exchange') < 0) s.tech.unlocked.push('exchange');
  if (s.tech.unlocked.indexOf('directives') < 0) s.tech.unlocked.push('directives');
  const home = s.systems[s.homeId];
  const source = s.systems[home.links[0]];
  home.discovered = true; source.discovered = true;
  home.cons.FOOD = Math.max(home.cons.FOOD || 0, 0.2);
  home.capacity.FOOD = 120;
  home.stocks.FOOD = 3;
  source.stocks.FOOD = 90;
  const runner = SW.ships.create(s, 'courier', source.id);
  runner.mode = 'travel';
  runner.at = source.id;
  runner.leg = { from: source.id, to: home.id, depart: s.tick, arrive: s.tick + 999 };
  runner.path = [home.id];
  runner.cargo.FOOD = 7;
  runner.mission = { kind: 'supply', stage: 'deliver', c: 'FOOD', qty: 7, source: source.id, target: home.id };
  elCache['#exchange'].classList.remove('hidden');
  fireClick('exComm', { c: 'FOOD' });
  const html = (elCache['#exchange'] && elCache['#exchange'].innerHTML) || '';
  if (html.indexOf('Known Economy') < 0) throw new Error('known economy index missing');
  if (html.indexOf('Sources & sinks') < 0) throw new Error('source/sink market graph panel missing');
  if (html.indexOf('Supply map') < 0) throw new Error('supply depth panel missing');
  if (html.indexOf('in-flight') < 0) throw new Error('in-flight cargo column missing');
  if (html.indexOf('need-first') < 0) throw new Error('market sorting explanation missing');
  if (html.indexOf('>focus<') < 0 || html.indexOf('>fetch<') < 0 || html.indexOf('>route<') < 0) throw new Error('supply map actions are not clearly named');
  if (html.indexOf('data-act="marketKeep"') < 0) throw new Error('keep-stocked action missing');
  elCache['#exchange'].scrollTop = 220;
  SW.uiMarket.renderExchange();
  if (elCache['#exchange'].scrollTop !== 220) throw new Error('market render reset scroll position');
  const before = s.directives.length;
  fireClick('marketKeep', { sys: String(home.id), c: 'FOOD', target: '30' });
  if (s.directives.length !== before + 1) throw new Error('marketKeep did not create directive');
  const d = s.directives[s.directives.length - 1];
  if (d.sys !== home.id || d.c !== 'FOOD' || d.target !== 30) throw new Error('directive details wrong');
});

step('infamy display uses tier labels', function () {
  G.state.infamy = 6;
  SW.ui.refresh();
  const text = String((elCache['#stInfamy'] && elCache['#stInfamy'].textContent) || '');
  if (text.indexOf('Most Wanted') < 0) throw new Error('infamy tier missing from topbar: ' + text);
});

step('directive form preserves edits across redraws and events', function () {
  const s = G.state;
  if (s.tech.unlocked.indexOf('directives') < 0) s.tech.unlocked.push('directives');
  SW.ui.setTab('routes');
  fireChangeTarget('dirComm', 'MEDS');
  fireInputTarget('dirTarget', '140');
  SW.ui.refresh();
  const html = (elCache['#dockBody'] && elCache['#dockBody'].innerHTML) || '';
  if (html.indexOf('<option value="MEDS" selected>') < 0) throw new Error('directive commodity reset after redraw');
  if (html.indexOf('id="dirTarget" type="number" value="140"') < 0) throw new Error('directive target reset after redraw');
  const before = s.directives.length;
  fireClick('dirStart');
  SW.ui.mapClick(s.systems[s.homeId]);
  const d = s.directives[s.directives.length - 1];
  if (s.directives.length !== before + 1 || d.c !== 'MEDS' || d.target !== 140) throw new Error('directive did not use preserved form values');
});

step('title screen omits shallow badlands and no-rivals selectors', function () {
  SW.ui.showTitle();
  const html = (elCache['#titleModal'] && elCache['#titleModal'].innerHTML) || '';
  if (html.indexOf('ngBad') >= 0) throw new Error('badlands depth selector still present');
  if (html.indexOf('ngRiv') >= 0) throw new Error('rival count selector still present');
});

step('tech research through dispatcher', function () {
  G.state.research = 500;
  // research action works without being in a tab; fire via dispatcher
  fireClick('research', { id: 'couriers' });
  if (!SW.tech.has(G.state, 'couriers')) throw new Error('research via UI failed');
});

step('menu, help, save, load via dispatcher', function () {
  fireClick('saveManual');
  if (!storageMap.starweft_manual) throw new Error('manual save not written');
  fireClick('help');
  fireClick('closeModal');
  fireClick('cheats');
  const cheatHtml = (elCache['#cheatModal'] && elCache['#cheatModal'].innerHTML) || '';
  if (cheatHtml.indexOf('FEATURE CHECK') < 0 || cheatHtml.indexOf('cheatResources') < 0) throw new Error('cheat panel missing actions');
  const cr0 = G.state.credits, res0 = G.state.research, shipN = G.state.ships.length;
  fireClick('cheatResources');
  if (G.state.credits <= cr0 || G.state.research <= res0) throw new Error('cheat resources did not apply');
  fireClick('cheatUnlock');
  if (!SW.tech.has(G.state, 'exchange') || !SW.tech.has(G.state, 'deepdrives') || !G.state.story.flags.routes_unlocked) throw new Error('cheat unlock did not open feature gates');
  fireClick('cheatFleet');
  if (G.state.ships.length <= shipN || !G.state.ships.some(function (sh) { return sh.hull === 'lancer'; })) throw new Error('cheat fleet did not spawn test hulls');
  const hiddenBefore = G.state.systems.filter(function (sys) { return !sys.discovered; }).length;
  fireClick('cheatReveal');
  const hiddenAfter = G.state.systems.filter(function (sys) { return !sys.discovered; }).length;
  if (!(hiddenAfter < hiddenBefore || hiddenAfter === 0)) throw new Error('cheat reveal did not discover systems');
  fireClick('closeModal');
  fireClick('loadManual');
  if (!G.state) throw new Error('load broke state');
});

step('game over modal (forced win) renders', function () {
  G.state.story.flags.sample_collected = true;
  G.state.research = 5000;
  A.research(G.state, 'scourge1'); A.research(G.state, 'scourge2'); A.research(G.state, 'panacea');
  G.state.story.flags.scourge_cured = true;
  G.tick(G.state);
  if (!G.state.gameOver || !G.state.gameOver.win) throw new Error('no win registered');
  SW.ui.showGameOver(G.state.gameOver);
  fireClick('postgame');
  if (G.state.gameOver) throw new Error('postgame did not clear gameOver');
});

step('postgame continue resumes the simulation', function () {
  G.state.gameOver = { win: true, reason: 'test', tick: G.state.tick, score: 0 };
  G.state.paused = true;
  const r = A.continuePostgame(G.state);
  if (!r.ok) throw new Error('continuePostgame rejected: ' + (r.msg || 'no msg'));
  if (G.state.gameOver) throw new Error('continuePostgame did not clear gameOver');
  if (G.state.paused) throw new Error('continuePostgame left the game paused');
  if (G.state.speed !== 1) throw new Error('continuePostgame did not restore normal speed');
});

step('interval loop bodies run without throwing', function () {
  for (const fn of intervals) { fn(); fn(); }
  pumpFrames(5);
});

step('autosave happened via tick loop', function () {
  for (let i = 0; i < 50; i++) G.tick(G.state);
  if (!storageMap.starweft_auto) throw new Error('no autosave in storage');
});

step('Sol prologue boots locked into the system view', function () {
  G.newGame({ seed: 'boot-tutorial', difficulty: 'standard', tutorial: true });
  const s = G.state;
  if (!SW.tutorial.isActive(s)) throw new Error('tutorial not active');
  SW.ui.enterSystem(s.homeId);
  if (SW.render.mode !== 'system') throw new Error('not in system view');
  G.tick(s);
  if (!s.story.objective || s.story.objective.indexOf('BELT') < 0) throw new Error('prologue prompt not set: ' + s.story.objective);
  SW.ui.exitSystem();                       // must be refused while locked
  if (SW.render.mode !== 'system') throw new Error('map lock did not hold');
  SW.ui.refresh();                          // panels render in tutorial state without throwing
  pumpFrames(3);
  // complete the first beat via actions; prompt advances on the next tick
  const r = A.shipHop(s, s.ships[0].id, 'The Belt');
  if (!r.ok) throw new Error('Belt hop failed: ' + r.msg);
  G.tick(s);
  if (s.tutorial.goal !== 1) throw new Error('cast-off beat did not advance (goal=' + s.tutorial.goal + ')');
  // panels render with a ship mid-shuttle (command bar, fleet, sys panel)
  SW.ui.refresh();
  pumpFrames(2);
  // UI gating: locked state hides search and exchange; only fleet+log tabs visible
  SW.ui.refresh();
  const sw = elCache['#searchWrap'];
  if (sw && sw.style) {
    if (sw.style.display !== 'none') throw new Error('#searchWrap not hidden during tutorial lock (display=' + sw.style.display + ')');
  }
  const be = elCache['#btnExchange'];
  if (be && be.style) {
    if (be.style.display !== 'none') throw new Error('#btnExchange not hidden during tutorial lock (display=' + be.style.display + ')');
  }
  const bt = elCache['#btnTech'];
  if (bt && bt.style) {
    if (bt.style.display !== 'none') throw new Error('#btnTech not hidden during tutorial lock (display=' + bt.style.display + ')');
  }
  // simulate unlock and verify elements are restored
  s.tutorial.mapUnlocked = true;
  SW.ui.refresh();
  if (sw && sw.style) {
    if (sw.style.display === 'none') throw new Error('#searchWrap not restored after map unlock');
  }
  if (be && be.style) {
    if (be.style.display === 'none') throw new Error('#btnExchange not restored after map unlock');
  }
  if (bt && bt.style) {
    if (bt.style.display === 'none') throw new Error('#btnTech not restored after map unlock');
  }
});

step('Sol prologue selected body exposes FLY HERE without manual expansion', function () {
  G.newGame({ seed: 'boot-tutorial-body', difficulty: 'standard', tutorial: true });
  const s = G.state;
  G.tick(s);
  SW.render.enterSystem(s.homeId);
  SW.render.selectedSys = s.homeId;
  SW.render.selectedShip = s.ships[0].id;
  SW.render.selectedBody = SW.planets.body(s, s.homeId, 'The Belt');
  SW.ui.refresh();
  const html = (elCache['#sysPanel'] && elCache['#sysPanel'].innerHTML) || '';
  if (html.indexOf('FLY HERE') < 0) throw new Error('selected body lacks FLY HERE action');
  if (html.indexOf('Mining Station') >= 0 || html.indexOf('Orbital Spindle') >= 0) throw new Error('prologue exposes non-current body construction');
  const idx = html.indexOf('The Belt');
  if (idx < 0) throw new Error('selected Belt section missing from panel HTML');
  const sectionStart = html.lastIndexOf('panelSection', idx);
  const sectionOpen = sectionStart >= 0 && html.slice(sectionStart, Math.min(html.length, sectionStart + 80)).indexOf('collapsed') < 0;
  if (!sectionOpen) throw new Error('selected Belt section is collapsed in prologue');
});

step('Sol prologue opens market during buy and sell beats', function () {
  G.newGame({ seed: 'boot-tutorial-market', difficulty: 'standard', tutorial: true });
  const s = G.state;
  G.tick(s);
  const ship = s.ships[0];
  ship.body = 'The Belt';
  s.tutorial.goal = 1;
  SW.render.enterSystem(s.homeId);
  SW.render.selectedSys = s.homeId;
  SW.render.selectedShip = ship.id;
  SW.render.selectedBody = SW.planets.body(s, s.homeId, 'The Belt');
  SW.ui.refresh();
  const html = (elCache['#sysPanel'] && elCache['#sysPanel'].innerHTML) || '';
  const marketIdx = html.indexOf('Market');
  if (marketIdx < 0) throw new Error('market section missing');
  const sectionStart = html.lastIndexOf('panelSection', marketIdx);
  const sectionOpen = sectionStart >= 0 && html.slice(sectionStart, Math.min(html.length, sectionStart + 80)).indexOf('collapsed') < 0;
  if (!sectionOpen) throw new Error('market section is collapsed during prologue cargo beat');
  if (html.indexOf('data-c="ORE"') < 0) throw new Error('ore buy/sell controls missing during prologue cargo beat');
});

step('Journal groups company contract with the run log', function () {
  G.newGame({ seed: 'boot-tutorial-journal', difficulty: 'standard', tutorial: true });
  const s = G.state;
  G.tick(s);
  SW.ui.setTab('log');
  const html0 = (elCache['#dockBody'] && elCache['#dockBody'].innerHTML) || '';
  if (html0.indexOf('Company Contracts') < 0) throw new Error('journal lacks company contract heading');
  if (html0.indexOf('First Contract: Sol Logistics Net') < 0) throw new Error('journal lacks Sol Net contract');
  if (html0.indexOf('Berth Stitch at The Belt') < 0) throw new Error('journal lacks current prologue step');

  s.tutorial.goal = 6;
  s.tutorial.netPrompted = true;
  SW.ui.setTab('log');
  const html1 = (elCache['#dockBody'] && elCache['#dockBody'].innerHTML) || '';
  if (html1.indexOf('Authorize Sol Net') < 0) throw new Error('journal lacks Sol Net authorization action');
  fireClick('authorizeSolNet');
  if (!s.story.flags.sol_net_authorized || !s.story.flags.routes_unlocked) throw new Error('Sol Net authorization did not set company flags');
});

console.log('\n' + (failures ? failures + ' FAILURES' : 'BROWSER BOOT CHECK PASSED ✓'));
process.exit(failures ? 1 : 0);
