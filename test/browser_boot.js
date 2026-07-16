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
const FILES = ['util', 'data', 'perks', 'starcat', 'lore', 'events_data', 'planets', 'sites', 'galaxy', 'economy', 'ships', 'combat', 'rivals', 'scourge', 'tech', 'story', 'worldevents', 'tutorial', 'quests', 'civics', 'pledges', 'game', 'audio', 'portraits', 'codex', 'render', 'market_analytics', 'ui_market', 'ui_ship', 'ui_system', 'ui_routes', 'ui_pledge', 'ui_tech', 'ui_modals', 'ui', 'boot', 'main'];
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
  ['fleet', 'routes', 'ops', 'pledges', 'you', 'log'].forEach(function (t) { SW.ui.setTab(t); });
});

step('PLEDGE surface: board + manifest render, take + abandon dispatch', function () {
  const s = G.state;
  s.credits = 8000;
  // ensure at least one populated, discovered destination and a stocked board
  s.systems.filter(function (x) { return x.pop > 0 && x.id !== s.homeId && x.scourge !== 2; })
    .slice(0, 4).forEach(function (x) { x.discovered = true; });
  SW.pledges.refreshBoard(s);
  SW.ui.setTab('pledges');
  SW.ui.refresh();
  let dock = (elCache['#dockBody'] && elCache['#dockBody'].innerHTML) || '';
  if (dock.indexOf('WEAVE') < 0) throw new Error('pledge surface missing WEAVE headline');
  if (dock.indexOf('Guild board') < 0) throw new Error('pledge surface missing the board');
  if (s.board.length && dock.indexOf('data-act="takePledge"') < 0) throw new Error('board offers have no take button');
  // the topbar WEAVE readout exists and updates
  if (!elCache['#stWeave']) throw new Error('topbar WEAVE stat missing');
  // take a pledge through the dispatch, then complete it via the seam
  if (s.board.length) {
    const offerId = s.board[0].id, held0 = s.pledges.length;
    fireClick('takePledge', { id: offerId });
    if (s.pledges.length !== held0 + 1) throw new Error('takePledge did not seal a pledge');
    const p = s.pledges[s.pledges.length - 1];
    SW.pledges.onDeliver(s, p.to, p.c, p.qty);
    if (s.weave <= 0) throw new Error('completing a pledge scored no WEAVE');
    SW.ui.setTab('pledges'); SW.ui.refresh();
    dock = (elCache['#dockBody'] && elCache['#dockBody'].innerHTML) || '';
    // take another and abandon it via dispatch
    SW.pledges.refreshBoard(s);
    if (s.board.length) {
      fireClick('takePledge', { id: s.board[0].id });
      const pid = s.pledges[s.pledges.length - 1].id, n = s.pledges.length;
      fireClick('abandonPledge', { id: pid });
      if (s.pledges.length !== n - 1) throw new Error('abandonPledge did not drop the pledge');
    }
  }
  SW.ui.setTab('fleet');
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

step('command bar is the single selected-ship surface (chip merged in)', function () {
  const ship = G.state.ships.length ? G.state.ships[0] : null;
  SW.render.selectedShip = ship ? ship.id : null;
  if (ship) ship.cargo.FOOD = 3;
  SW.ui.refresh();
  const bar = (elCache['#commandBar'] && elCache['#commandBar'].innerHTML) || '';
  if (bar.indexOf('sendMode') < 0 || bar.indexOf('chkSellArrive') < 0) throw new Error('command bar missing send controls');
  if (bar.indexOf('followShip') < 0) throw new Error('command bar missing follow');
  if (ship && bar.indexOf('commodity:FOOD') < 0) throw new Error('command bar does not show the manifest');
  if (typeof SW.uiShip.renderShipChip === 'function') throw new Error('ship chip surface should be gone');
  if (ship) { delete ship.cargo.FOOD; delete ship.basis.FOOD; }
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
  // Regression: a CLICK (down then up, no move) must release pointer capture and
  // not leave the canvas in pan mode — the bug where selecting a node stuck the
  // mouse in drag. After pointerup, a bare pointermove (no button) must NOT pan.
  let released = false;
  canvas.releasePointerCapture = function () { released = true; };
  canvas.setPointerCapture = function () {};
  canvas.onpointerdown({ clientX: 130, clientY: 130, button: 0, preventDefault: function () {}, pointerId: 2 });
  canvas.onpointerup({ clientX: 130, clientY: 130, preventDefault: function () {}, pointerId: 2 });
  if (!released) throw new Error('pointer capture not released after a click (drag-stuck bug)');
  const px = SW.ui.techView.x, py = SW.ui.techView.y;
  canvas.onpointermove({ clientX: 300, clientY: 300, preventDefault: function () {} });
  if (SW.ui.techView.x !== px || SW.ui.techView.y !== py) throw new Error('canvas still panning after click released the drag (drag-stuck bug)');
  // Double-click a researchable node researches it directly (the real hit-test path).
  if (typeof canvas.ondblclick !== 'function') throw new Error('tech canvas missing ondblclick (double-click research)');
  {
    G.state.research = 99999;
    SW.uiTech.open('research');
    pumpFrames(2);
    const hits = SW.uiTech._hits ? SW.uiTech._hits() : [];
    // pick a hit whose tech is available, not owned, affordable
    let picked = null;
    for (const h of hits) {
      if (SW.tech.available(G.state, h.id) && !SW.tech.has(G.state, h.id)) { picked = h; break; }
    }
    if (picked) {
      const cv2 = elCache['#techCanvasFull'];
      // getBoundingClientRect is {left:0, top:0} in the stub, so client == canvas coords
      cv2.ondblclick({ clientX: picked.x, clientY: picked.y, preventDefault: function () {} });
      if (!SW.tech.has(G.state, picked.id)) throw new Error('double-click did not research the node under the cursor');
    }
  }
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

step('hail list renders quiet chips and a Journal signals inbox', function () {
  const s = G.state;
  s.story.pending = null;
  s.story.hails = [
    { key: 'ev_festival', id: 'ev_festival', ctx: null, at: s.tick, title: 'FESTIVAL OF LIGHTS', count: 3, mood: null },
    { key: 'ev_pirates', id: 'ev_pirates', ctx: null, at: s.tick, title: 'TOLL COLLECTORS', count: 1, mood: 'bad' },
  ];
  SW.ui.refresh();
  const alerts = (elCache['#alerts'] && elCache['#alerts'].innerHTML) || '';
  if (alerts.indexOf('hailChip') < 0) throw new Error('hail list chips not rendered');
  if (alerts.indexOf('×3') < 0) throw new Error('hail occurrence count not shown');
  SW.ui.setTab('log');
  const dock = (elCache['#dockBody'] && elCache['#dockBody'].innerHTML) || '';
  if (dock.indexOf('Signals') < 0) throw new Error('Journal tab missing signals inbox');
  if (dock.indexOf('dismissHail') < 0) throw new Error('signals inbox missing dismiss');
  fireClick('openHail', { key: 'ev_festival' });
  if (s.story.pending !== 'ev_festival') throw new Error('keyed hail did not open its event: ' + s.story.pending);
  if (s.story.hails.length !== 1) throw new Error('opened hail not removed from list');
  s.story.pending = null;
  fireClick('dismissHail', { key: 'ev_pirates' });
  if (s.story.hails.length !== 0) throw new Error('dismissed hail not removed');
  SW.ui.setTab('fleet');
});

step('journal groups repeated entries as ×N', function () {
  const s = G.state;
  s.story.log.length = 0;
  s.story.pending = 'ev_festival'; SW.story.choose(s, 0);
  s.story.pending = 'ev_festival'; SW.story.choose(s, 0);
  if (s.story.log.length !== 1) throw new Error('repeat log entries did not group: ' + s.story.log.length);
  if (s.story.log[0].n !== 2) throw new Error('group count wrong: ' + s.story.log[0].n);
  SW.ui.setTab('log');
  const dock = (elCache['#dockBody'] && elCache['#dockBody'].innerHTML) || '';
  if (dock.indexOf('×2') < 0) throw new Error('grouped count not rendered in journal');
  SW.ui.setTab('fleet');
});

step('development surface tabs render aptitudes and milestones', function () {
  SW.uiTech.open('aptitudes');
  let ovl = (elCache['#techOverlay'] && elCache['#techOverlay'].innerHTML) || '';
  if (ovl.indexOf('perkGrid') < 0) throw new Error('aptitude grid missing');
  if (ovl.indexOf('DEVELOPMENT') < 0) throw new Error('development header missing');
  SW.uiTech.open('milestones');
  ovl = (elCache['#techOverlay'] && elCache['#techOverlay'].innerHTML) || '';
  if (ovl.indexOf('MILESTONES') < 0 || ovl.indexOf('msCard') < 0) throw new Error('milestones pane missing');
  if (ovl.indexOf('msGroupHead') < 0) throw new Error('milestones not grouped');
  if (ovl.indexOf('msBar') < 0) throw new Error('milestones missing progress bars for in-progress items');
  SW.uiTech.open('research');
  pumpFrames(2);
  ovl = (elCache['#techOverlay'] && elCache['#techOverlay'].innerHTML) || '';
  if (ovl.indexOf('techCanvasFull') < 0) throw new Error('research canvas missing after tab switch');
  SW.uiTech.close();
});

step('supply project dispatches haulers through one action', function () {
  const s = G.state;
  const home = s.systems[s.homeId];
  const src = s.systems[home.links[0]];
  src.discovered = true;
  src.stocks.ALLOY = 60;
  s.credits = 9999;
  s.projects = [];
  const hauler = SW.ships.create(s, 'courier', home.id);
  SW.ships.unassign(s, hauler);
  hauler.mode = 'idle'; hauler.at = home.id; hauler.path = []; hauler.leg = null; hauler.mission = null; hauler.queue = []; hauler.cargo = {}; hauler.basis = {};
  home.buildings = home.buildings.filter(function (b) { return b !== 'relay'; });
  if (home.depot) delete home.depot.ALLOY;
  SW.render.selectedSys = home.id;
  fireClick('projectBuild', { b: 'relay' });
  if (!s.projects.length) throw new Error('project was not created');
  if (!s.ships.some(function (sh) { return sh.mission && sh.mission.kind === 'supply' && sh.mission.c === 'ALLOY'; })) throw new Error('no supply mission dispatched');
  SW.ui.refresh();
  const panel = (elCache['#sysPanel'] && elCache['#sysPanel'].innerHTML) || '';
  if (panel.indexOf('cancelProject') < 0) throw new Error('project status/cancel not rendered');
  fireClick('cancelProject', { id: s.projects[0].id });
  if (s.projects.length) throw new Error('project not cancelled');
});

step('passenger offers render and dispatch from the system panel', function () {
  const s = G.state;
  const home = s.systems[s.homeId];
  const dest = s.systems.find(function (sys) { return sys.id !== home.id && sys.type === 'pop' && sys.scourge === 0; }) || s.systems[home.links[0]];
  home.discovered = true; dest.discovered = true; dest.scourge = 0;
  s.credits = 9999;
  if (s.tech.unlocked.indexOf('freighters') < 0) s.tech.unlocked.push('freighters');
  s.charters = [{ id: 'ch-boot', from: home.id, to: dest.id, n: 0.3, fare: 222, expires: s.tick + 50 }];
  s.cohorts = [{ id: 'co-boot', from: home.id, haven: dest.id, hops: 1, n: 0.2, moving: [], deadline: s.tick + 40 }];
  const liner = SW.ships.create(s, 'liner', home.id, 'Boot Liner');
  SW.render.selectedSys = home.id;
  SW.render.selectedShip = liner.id;
  SW.ui.refresh();
  const panel = (elCache['#sysPanel'] && elCache['#sysPanel'].innerHTML) || '';
  if (panel.indexOf('boardEvac') < 0) throw new Error('evac boarding button not rendered');
  if (panel.indexOf('boardCharter') < 0) throw new Error('charter boarding button not rendered');
  fireClick('boardCharter', { id: 'ch-boot' });
  if (!liner.pax || liner.pax.kind !== 'charter') throw new Error('charter dispatch did not board passengers');
  liner.mode = 'idle'; liner.at = home.id; liner.pax = null;
  fireClick('boardEvac');
  if (!liner.pax || liner.pax.kind !== 'evac') throw new Error('evac dispatch did not board passengers');
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

step('boot screen short-circuits headlessly and invokes the title handoff', function () {
  if (!SW.boot || typeof SW.boot.play !== 'function') throw new Error('SW.boot.play missing');
  let called = 0;
  // No window.matchMedia in the stub DOM, so play() must skip the crawl and call
  // the callback synchronously -- this is the contract main.js depends on to reach
  // the title screen. If this ever blocks, the game would boot to a black overlay.
  SW.boot.play(function () { called++; });
  if (called !== 1) throw new Error('boot.play did not invoke callback exactly once headlessly (got ' + called + ')');
  if (SW.boot.isActive && SW.boot.isActive()) throw new Error('boot left itself active after headless skip');
});

step('front-door title shows the menu verbs, new-run setup omits dead selectors', function () {
  SW.ui.showTitle();
  const front = (elCache['#titleModal'] && elCache['#titleModal'].innerHTML) || '';
  if (front.indexOf('data-act="newRun"') < 0) throw new Error('front door missing New weave');
  if (front.indexOf('data-act="settings"') < 0) throw new Error('front door missing Settings');
  // Identity/origin config must NOT be on the landing — it lives one step in.
  if (front.indexOf('id="ngDiff"') >= 0) throw new Error('setup form leaked onto the front door');
  if (front.indexOf('data-act="dailyWeave"') < 0) throw new Error('front door missing Daily weave');
  // Step into setup and check the form is there, minus the removed selectors.
  SW.uiModals.showNewRun();
  const setup = (elCache['#titleModal'] && elCache['#titleModal'].innerHTML) || '';
  if (setup.indexOf('id="ngDiff"') < 0) throw new Error('new-run setup missing difficulty');
  if (setup.indexOf('id="ngThreat"') < 0) throw new Error('new-run setup missing threat selector');
  if (setup.indexOf('id="ngLean"') < 0) throw new Error('new-run setup missing doctrine lean');
  if (setup.indexOf('data-cond=') < 0) throw new Error('new-run setup missing weave conditions');
  if (setup.indexOf('id="ngForecast"') < 0) throw new Error('new-run setup missing forecast');
  if (setup.indexOf('data-act="begin"') < 0) throw new Error('new-run setup missing begin');
  if (setup.indexOf('ngBad') >= 0) throw new Error('badlands depth selector still present');
  if (setup.indexOf('ngRiv') >= 0) throw new Error('rival count selector still present');
  // authored-world dials + founding myth + the promoted prologue switch
  if (setup.indexOf('id="ngAge"') < 0) throw new Error('new-run setup missing galaxy age');
  if (setup.indexOf('id="ngTopo"') < 0) throw new Error('new-run setup missing topology');
  if (setup.indexOf('id="ngHeart"') < 0) throw new Error('new-run setup missing the heart');
  if (setup.indexOf('id="ngMyth"') < 0) throw new Error('new-run setup missing founding myth');
  if (setup.indexOf('id="ngTut"') < 0) throw new Error('new-run setup missing prologue toggle');
  if (setup.indexOf('id="prologueCard"') < 0) throw new Error('prologue toggle not promoted to a switch card');
  // collapsible sections + the surprise-me / name reroll QOL controls
  if (setup.indexOf('data-fold="conditions"') < 0) throw new Error('weave conditions not collapsible');
  if (setup.indexOf('data-act="surpriseWeave"') < 0) throw new Error('surprise-me button missing');
  if (setup.indexOf('data-act="rerollName"') < 0) throw new Error('name reroll button missing');
  // the randomizers run without throwing against the form
  SW.uiModals.rerollName();
  SW.uiModals.surpriseWeave();
});

step('daily weave config is deterministic and well-formed', function () {
  const a = SW.uiModals.dailyConfig('2026-06-13');
  const b = SW.uiModals.dailyConfig('2026-06-13');
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('daily config not deterministic for a date');
  if (a.seed !== 'daily-2026-06-13') throw new Error('daily seed not date-derived');
  if (!Array.isArray(a.conditions) || a.conditions.length < 1) throw new Error('daily has no conditions');
  if (a.daily !== '2026-06-13') throw new Error('daily key not stamped');
  // the authored-world dials are derived deterministically too
  if (!a.world.age || !a.world.topology || !a.world.heart) throw new Error('daily config missing authored-world dials');
  if (!a.identity.myth) throw new Error('daily config missing founding myth');
  // A different day should (almost always) differ in seed.
  const c = SW.uiModals.dailyConfig('2026-06-14');
  if (c.seed === a.seed) throw new Error('different day produced same seed');
  // The daily brief renders.
  SW.uiModals.showDailyBrief();
  const brief = (elCache['#confirmModal'] && elCache['#confirmModal'].innerHTML) || '';
  if (brief.indexOf('data-act="beginDaily"') < 0) throw new Error('daily brief missing begin button');
});

step('settings panel renders toggles and persists prefs', function () {
  SW.uiModals.showSettings();
  let html = (elCache['#settingsModal'] && elCache['#settingsModal'].innerHTML) || '';
  if (html.indexOf('data-act="setReduceMotion"') < 0) throw new Error('settings missing reduce-motion toggle');
  if (html.indexOf('data-act="setDefaultSpeed"') < 0) throw new Error('settings missing default speed');
  fireClick('setReduceMotion');
  if (!storageMap.starweft_prefs || JSON.parse(storageMap.starweft_prefs).reduceMotion !== true) throw new Error('reduce-motion pref not persisted');
  fireClick('setDefaultSpeed', { spd: '3' });
  if (JSON.parse(storageMap.starweft_prefs).defaultSpeed !== 3) throw new Error('default speed pref not persisted');
});

step('import modal and generic confirm wire up', function () {
  SW.uiModals.showImport();
  const imp = (elCache['#importModal'] && elCache['#importModal'].innerHTML) || '';
  if (imp.indexOf('id="importBox"') < 0 || imp.indexOf('data-act="confirmImport"') < 0) throw new Error('import modal missing textarea/confirm');
  let ran = false;
  SW.ui.confirm({ title: 'Test', text: 'ok?', onYes: function () { ran = true; } });
  const cm = (elCache['#confirmModal'] && elCache['#confirmModal'].innerHTML) || '';
  if (cm.indexOf('data-act="confirmYes"') < 0) throw new Error('confirm modal missing yes action');
  fireClick('confirmYes');
  if (!ran) throw new Error('confirm onYes did not run');
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
  if (!storageMap.starweft_meta_manual) throw new Error('manual save metadata not written');
  fireClick('help');
  fireClick('closeModal');
  // Dev/cheat panel is gated: with dev off, clicking 'cheats' must NOT open it.
  delete storageMap.starweft_dev;
  fireClick('cheats');
  const gated = (elCache['#cheatModal'] && elCache['#cheatModal'].innerHTML) || '';
  if (gated.indexOf('FEATURE CHECK') >= 0) throw new Error('cheat panel opened while dev disabled');
  // Enable dev (as ?dev would) and confirm it now opens.
  storageMap.starweft_dev = '1';
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
