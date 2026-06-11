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
  const el = {
    tagName: (tag || 'DIV').toUpperCase(),
    children: [],
    dataset: {},
    style: { setProperty: function (k, v) { el.style[k] = v; } },
    value: '', checked: false, disabled: false,
    firstChild: null,
    _cls: {},
    classList: null,
    innerHTML: '', textContent: '',
    addEventListener: function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
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
const FILES = ['util', 'data', 'perks', 'starcat', 'lore', 'events_data', 'planets', 'sites', 'galaxy', 'economy', 'ships', 'combat', 'rivals', 'scourge', 'tech', 'story', 'worldevents', 'game', 'audio', 'portraits', 'codex', 'render', 'ui', 'main'];
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
  ['fleet', 'routes', 'ops', 'tech', 'you', 'log'].forEach(function (t) { SW.ui.setTab(t); });
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

step('tech tree opens as expanded scrollable modal', function () {
  fireClick('openTechTree');
  const html = (elCache['#techModal'] && elCache['#techModal'].innerHTML) || '';
  if (html.indexOf('techCanvasFull') < 0) throw new Error('expanded tech canvas missing');
  if (html.indexOf('techDetail') < 0) throw new Error('tech detail pane missing');
  if (html.indexOf('techZoomIn') < 0 || html.indexOf('techResetView') < 0) throw new Error('tech viewport controls missing');
});

step('expanded tech tree supports pan, zoom, and node details', function () {
  fireClick('openTechTree');
  if (!SW.ui.techView) throw new Error('tech view state missing');
  const zoom0 = SW.ui.techView.zoom;
  fireClick('techZoomIn');
  if (SW.ui.techView.zoom <= zoom0) throw new Error('zoom in did not change zoom');
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
  fireClick('techSelect', { id: 'analytics' });
  const html = (elCache['#techModal'] && elCache['#techModal'].innerHTML) || '';
  if (html.indexOf('Market Analytics') < 0 || html.indexOf('Unlocks') < 0) throw new Error('selected tech details missing');
  fireClick('techResetView');
  if (SW.ui.techView.zoom !== 1 || SW.ui.techView.x !== 0 || SW.ui.techView.y !== 0) throw new Error('reset did not restore tech viewport');
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

step('build + supply buttons through dispatcher', function () {
  G.state.credits = 9999;
  fireClick('buyShip', { h: 'sparrow' });
  fireClick('supply', { c: 'ALLOY', q: '8' });
  fireClick('build', { b: 'relay' }); // expected to fail politely (no mats yet) — must not throw
});

step('tech research through dispatcher', function () {
  G.state.research = 500;
  SW.ui.setTab('tech');
  fireClick('research', { id: 'couriers' });
  if (!SW.tech.has(G.state, 'couriers')) throw new Error('research via UI failed');
});

step('menu, help, save, load via dispatcher', function () {
  fireClick('saveManual');
  if (!storageMap.starweft_manual) throw new Error('manual save not written');
  fireClick('help');
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

step('interval loop bodies run without throwing', function () {
  for (const fn of intervals) { fn(); fn(); }
  pumpFrames(5);
});

step('autosave happened via tick loop', function () {
  for (let i = 0; i < 50; i++) G.tick(G.state);
  if (!storageMap.starweft_auto) throw new Error('no autosave in storage');
});

console.log('\n' + (failures ? failures + ' FAILURES' : 'BROWSER BOOT CHECK PASSED ✓'));
process.exit(failures ? 1 : 0);
