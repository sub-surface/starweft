/* STARWEFT ui.js — coordinator: panel framework, data-act dispatch, topbar, toasts, shared helpers.
   Loads AFTER ui_market.js, ui_ship.js, ui_system.js, ui_routes.js, ui_tech.js, ui_modals.js.
   Browser only. */
var SW = globalThis.SW = globalThis.SW || {};

SW.ui = (function () {
  const U = SW.util, D = SW.data;
  const ui = {};

  // ============ private state ============
  let activeTab = 'fleet';
  ui.routeDraft = null;
  let mapMode = null;            // null | 'send' | 'route' | 'directive' | 'blitz' | 'embargo'
  ui.sendSellOnArrive = true;    // shared with ui_ship.js (renderCommandBar reads/writes it)
  let directiveDraft = null;
  ui.directiveForm = { c: 'FOOD', target: 60 }; // shared with ui_routes.js
  let lastRenderTick = -1;
  let _lastMetaTick = -1;        // last tick we refreshed the autosave slot metadata
  ui.editorOpen = false;         // shared with ui_routes.js
  let pinnedInfo = null;         // infobox fallback topic
  ui.techView = { x: 0, y: 0, zoom: 1, selected: null }; // shared with ui_tech.js
  let livePortraits = [];        // [{canvas, spec}] animated
  let panelOpenSections = {};    // system-panel section key -> true/false when toggled
  let panelOpenSectionsLoaded = false;
  let uiPointerActive = false;   // interval redraws must not remove active click targets
  let deferredUiRefresh = false;

  // ============ shared DOM helpers (exposed on ui for modules) ============
  function $(sel) { return document.querySelector(sel); }
  ui.$ = $;
  function st() { return SW.game.state; }
  ui.st = st;
  function A() { return SW.game.actions; }
  ui.A = A;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  ui.esc = esc;
  function commName(c) { return D.COMMODITIES[c].icon + ' ' + D.COMMODITIES[c].name; }
  ui.commName = commName;

  // ============ shared ship helpers (exposed for modules) ============
  function selectedShip() {
    const s = st();
    if (!s || !SW.render.selectedShip) return null;
    return s.ships.find(function (x) { return x.id === SW.render.selectedShip; }) || null;
  }
  ui.selectedShip = selectedShip;
  function logisticsShips(s) { return SW.ships.idleLogistics(s); } // headless logic lives in ships.js
  ui.logisticsShips = logisticsShips;
  function pickLogisticsShip(s, preferred) {
    if (preferred && SW.ships.freeForLogistics(preferred)) return preferred;
    return logisticsShips(s)[0] || null;
  }
  ui.pickLogisticsShip = pickLogisticsShip;

  // ============ portrait animation (exposed for modules) ============
  let livePortraitsDraw = livePortraits; // alias
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
    if (shipCv && shipCv.isConnected) { try { SW.codex.drawShip(shipCv, SW.uiModals.codexHull, now); } catch (e) {} }
    const sigCv = document.getElementById('sigilPreview');
    if (sigCv && sigCv.isConnected) {
      const hue = parseInt(($('#idHue') || { value: 195 }).value, 10);
      try { SW.portraits.drawSigil(sigCv.getContext('2d') && sigCv.getContext('2d').clearRect(0, 0, sigCv.width, sigCv.height) || sigCv.getContext('2d'), sigCv.width, ui._sigilSeed || 7, now, hue); } catch (e) {}
    }
  }
  function addPortrait(canvas, spec) { livePortraits.push({ canvas: canvas, spec: spec }); }
  ui.addPortrait = addPortrait;

  // ============ section helpers (exposed for ui_system) ============
  function stripTags(html) { return String(html).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }
  function sectionKey(panelKey, title) {
    const slug = stripTags(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    return panelKey + ':' + slug;
  }
  function panelSectionsStorageKey(state) {
    return 'starweft_panel_sections:v2';
  }
  function loadPanelSections(state) {
    if (panelOpenSectionsLoaded) return;
    panelOpenSectionsLoaded = true;
    panelOpenSections = {};
    try {
      const raw = localStorage.getItem(panelSectionsStorageKey(state));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      for (const k in parsed) panelOpenSections[k] = !!parsed[k];
    } catch (e) {}
  }
  function savePanelSections(state) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) localStorage.setItem(panelSectionsStorageKey(state), JSON.stringify(panelOpenSections));
    } catch (e) {}
  }
  function sectionizePanelHtml(html, panelKey) {
    loadPanelSections(st());
    const re = /<h4([^>]*)>([\s\S]*?)<\/h4>/gi;
    let out = '', last = 0, section = null, idx = 0, m;
    while ((m = re.exec(html))) {
      if (!section) out += html.slice(last, m.index);
      else {
        out += html.slice(last, m.index) + '</div></div>';
      }
      const title = stripTags(m[2]);
      const key = sectionKey(panelKey, title);
      const selectedBodyOpen = SW.tutorial && SW.tutorial.mapLocked(st()) &&
        SW.render && SW.render.selectedBody &&
        title.toLowerCase().indexOf(String(SW.render.selectedBody.name).toLowerCase()) === 0;
      const isMarket = title.toLowerCase().indexOf('market') === 0;
      const stored = panelOpenSections[key];
      const open = selectedBodyOpen || (stored === undefined ? isMarket : !!stored);
      out += '<div class="panelSection' + (open ? '' : ' collapsed') + '" data-section="' + key + '">' +
        '<h4' + m[1] + ' class="panelSectionHead" data-section="' + key + '" data-title="' + esc(title) + '" title="Click to expand/collapse">' +
        m[2] + '</h4><div class="panelSectionBody">';
      section = key;
      last = re.lastIndex;
    }
    if (!section) return html;
    out += html.slice(last) + '</div></div>';
    return out;
  }
  ui.sectionizePanelHtml = sectionizePanelHtml;
  // Force a panel accordion section open — the ring's ▦ build verb uses this
  // to land the player straight on Construction instead of a collapsed list.
  ui.openPanelSection = function (key) {
    loadPanelSections(st());
    panelOpenSections[key] = true;
    savePanelSections(st());
  };

  function onPanelSectionClick(e) {
    const h = e.target.closest && e.target.closest('#sysPanel h4[data-section]');
    if (!h || !h.dataset || !h.dataset.section) return;
    const s = st();
    loadPanelSections(s);
    panelOpenSections[h.dataset.section] = !(panelOpenSections[h.dataset.section] === true);
    savePanelSections(s);
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    SW.uiSystem.renderSysPanel();
  }

  function isUiPointerTarget(target) {
    return !!(target && target.closest && target.closest('#strip, #main .panel, #exchange, #techOverlay, #modalShade, #mapHint, #btnBackGalaxy'));
  }
  function releaseUiPointer() {
    if (!uiPointerActive) return;
    uiPointerActive = false;
    deferredUiRefresh = false;
  }

  // ============ modal helpers (exposed for all modules) ============
  let _modalOpener = null; // element that had focus when a modal was opened
  let _activeModalId = null;
  let _modalPauseLease = null;
  function showModal(id) {
    // Acquire one pause lease for the entire modal stack. Moving from Pause to
    // Settings and back must not briefly restart the simulation behind the shade.
    if (!_activeModalId) {
      _modalOpener = (typeof document !== 'undefined' && document.activeElement) ? document.activeElement : null;
      const s = st();
      if (s && !s.gameOver) {
        _modalPauseLease = { state: s, wasPaused: !!s.paused, speed: s.speed || 1 };
        if (!s.paused) A().setSpeed(s, 0);
      } else _modalPauseLease = null;
    }
    const shade = $('#modalShade');
    shade.classList.remove('hidden');
    if (shade.setAttribute) shade.setAttribute('aria-hidden', 'false');
    document.querySelectorAll('.modal').forEach(function (m) {
      m.classList.add('hidden');
      if (m.setAttribute) m.setAttribute('aria-hidden', 'true');
    });
    const modal = $('#' + id);
    modal.classList.remove('hidden');
    if (modal.setAttribute) {
      modal.setAttribute('aria-hidden', 'false');
      const heading = modal.querySelector && modal.querySelector('h1, h2, h3');
      modal.setAttribute('aria-label', heading && heading.textContent ? heading.textContent.trim() : 'STARWEFT dialog');
    }
    _activeModalId = id;
    // Move focus into the modal so keyboard users don't get stranded behind the shade.
    // Prefer the selected radio on launch; otherwise the first deliberate control.
    var b = modal && modal.querySelector && (modal.querySelector('[data-autofocus]') ||
      modal.querySelector('[role="radio"][aria-checked="true"]') || modal.querySelector('button, input, select, textarea'));
    if (b && b.focus) b.focus(); else if (modal && modal.focus) modal.focus();
  }
  ui.showModal = showModal;
  function hideModals() {
    const shade = $('#modalShade');
    shade.classList.add('hidden');
    if (shade.setAttribute) shade.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('.modal').forEach(function (m) { m.classList.add('hidden'); });
    const lease = _modalPauseLease;
    _modalPauseLease = null;
    _activeModalId = null;
    // Only release the run that acquired the lease. Launch/load may have replaced
    // G.state while a title dialog was open; that new state owns its own speed.
    if (lease && lease.state === st() && !lease.wasPaused && !lease.state.gameOver) {
      A().setSpeed(lease.state, lease.speed);
    }
    // Restore focus to the element that triggered the modal, if it is still in the DOM.
    // Every step guarded: stub DOM may not implement focus or body.contains.
    if (_modalOpener && _modalOpener.focus &&
        typeof document !== 'undefined' && document.body && document.body.contains &&
        document.body.contains(_modalOpener)) {
      _modalOpener.focus();
    }
    _modalOpener = null;
  }
  ui.hideModals = hideModals;
  ui.modalOpen = function () { return !$('#modalShade').classList.contains('hidden'); };
  ui.activeModal = function () { return _activeModalId ? $('#' + _activeModalId) : null; };

  // ============ toast (exposed for modules) ============
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
  let captionTimer = null;
  const AUDIO_CAPTIONS = {
    discover: 'New system discovered.', chime: 'Opportunity signal.', tech: 'Research completed.',
    build: 'Construction completed.', dread: 'Threat warning.', fall: 'A system has fallen.',
    shield: 'Defence held.', loss: 'A craft was lost.', raid: 'Conflict resolved.',
    panacea: 'Cure delivered.', survey: 'Survey completed.', victory: 'Thread completed.', defeat: 'Thread lost.'
  };
  ui.audioCaption = function (name) {
    if (!ui.prefs().soundCaptions || !AUDIO_CAPTIONS[name]) return;
    const el = $('#audioCaption'); if (!el) return;
    el.textContent = '[sound] ' + AUDIO_CAPTIONS[name];
    el.classList.remove('hidden');
    if (captionTimer) clearTimeout(captionTimer);
    captionTimer = setTimeout(function () { el.classList.add('hidden'); }, 2400);
  };

  // ============ infobox (exposed for ui_tech canvas hover) ============
  const UI_TOPICS = {
    credits: { title: 'CREDITS ¤', sub: 'currency', lines: ['Earned by selling where prices run high. Spent on ships, buildings, upkeep, and apologies.'] },
    research: { title: 'RESEARCH ◇', sub: 'progress', lines: ['Generated by prosperous population centers and surveys. Spent in the Tech tree.'] },
    fleet: { title: 'FLEET ▲', sub: 'ships', lines: ['Your hulls. Buy more at Sol or Industrial hubs. Idle ships are wasted ships.'] },
    infamy: { title: 'INFAMY †', sub: 'reputation', lines: ['Raiding raises it. At ' + D.TUNE.infamyBlackMarket + '+ the Reach\'s black markets open to you; at 5+ the Vigil starts collecting.'] },
    weaveHealth: { title: 'WEAVE HEALTH', sub: 'the state of the weave', lines: ['One number for the galaxy you tend: how well known worlds live, whether essentials reach them, whether factories can run, and how much of the map your threads touch.'] },
    more: { title: 'MORE ⋯', sub: 'the quiet controls', lines: ['Development, the Market terminal, the Codex, and sound — one tap away, out of the strip\'s width. Tap again to fold them back.'] },
    pin: { title: 'PIN ▣', sub: 'drawer', lines: ['Keeps this drawer open instead of folding it to its rail. Remembered on this device — pin it once and the old always-visible panel is back.'] },
    ringEnter: { title: 'ENTER ⏵', sub: 'orbital view', lines: ['Drops into orbit around this star — the same as double-clicking it.'] },
    ringDetails: { title: 'DETAILS ⓘ', sub: 'the full panel', lines: ['Opens the system panel: market, depot, construction, ships here. Stays closed until you ask for it again.'] },
    ringSend: { title: 'SEND ➤', sub: 'dispatch', lines: ['Sends your selected ship here — the same commitment as a manual SEND order.'] },
    ringBoard: { title: 'BOARD ◈', sub: 'Guild offers', lines: ['This system is carrying open pledge offers. Opens the board.'] },
    ringBookmark: { title: 'BOOKMARK ☆', sub: 'quick recall', lines: ['Marks this system so you can find it again fast — the search box and Journal both surface bookmarks.'] },
    ringBuild: { title: 'BUILD ▦', sub: 'construction', lines: ['Opens the system panel with Construction expanded — every buildable here, one tap from raising it.'] },
    founders: { title: 'FOUNDER', sub: 'who the Guild seats at the helm', lines: ['One rule-bend, one liability, for a Focused run. WEFT flies the network; the Founder bends its laws. Only matters if the run above is Focused, not Long Weave.'] },
    weave: { title: 'WEAVE ◈', sub: 'the score of your thread', lines: ['Earned only by keeping pledges. WEAVE = TONNAGE × THREAD: the size of the haul times a multiplier that rises with every pledge held at once and every completion in a row.', 'Trade earns credits; pledges earn WEAVE. A single missed deadline snaps the THREAD back to nothing.'] },
    pledges: { title: 'PLEDGES ◈', sub: 'the core verb, scored', lines: ['Take a pledge from the Guild board — carry a good to a hungry world before the deadline — and every crate you land on it scores WEAVE.', 'Hold several at once to lift the THREAD on all of them: the wager. Bust one and you forfeit its bond and reset the streak. Warp holds; weft moves.'] },
    acts: { title: 'THE ACT LADDER ◈', sub: 'a focused run', lines: ['Each act is a Guild Charter: a WEAVE quota and a clock. Its Commission tints the pledge economy — read it, and build to it.', 'Meet the quota and choose: BANK the thread (a clean win) or PUSH — draft a Boon, take a harder Charter, widen your reach. Miss the clock and you are Cut; lose the Loomship and you are Burned; lose the Heart and you are Eaten.'] },
  };
  function uiTopicInfo(id) {
    if (id === 'infamy' && SW.combat && SW.combat.infamyStatus) {
      const status = SW.combat.infamyStatus(st() && st().infamy);
      return { title: 'INFAMY ' + status.label.toUpperCase(), sub: 'reputation', lines: SW.combat.infamyLines(st()) };
    }
    return UI_TOPICS[id];
  }
  function renderInfobox(topic) {
    const s = st();
    const box = $('#infobox');
    const t = topic || pinnedInfo;
    let info = null;
    if (t) {
      info = t.kind === 'ui' ? uiTopicInfo(t.id) : SW.codex.describe(s, t);
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
  ui.renderInfobox = renderInfobox;
  function onHoverInfo(e) {
    const el = e.target.closest ? e.target.closest('[data-info]') : null;
    if (!el) return;
    const parts = el.dataset.info.split(':');
    renderInfobox({ kind: parts[0], id: parts.length > 2 ? parts.slice(1).join(':') : parts[1] });
  }
  ui.pinInfo = function (topic) { pinnedInfo = topic; renderInfobox(null); };

  // ============ boot ============
  ui.init = function () {
    ui.applyPrefs();
    document.addEventListener('click', dispatch);
    document.addEventListener('change', dispatchChange);
    document.addEventListener('input', dispatchInput);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', function (e) { SW.uiModals.simKeys(e, false); });
    document.addEventListener('mouseover', onHoverInfo);
    document.addEventListener('click', onPanelSectionClick);
    document.addEventListener('pointerdown', function (e) {
      SW.audio.ensure();
      uiPointerActive = isUiPointerTarget(e.target);
    });
    document.addEventListener('pointerup', releaseUiPointer);
    document.addEventListener('pointercancel', releaseUiPointer);
    window.addEventListener('blur', releaseUiPointer);

    document.querySelectorAll('#dockTabs button[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { ui.setTab(b.dataset.tab); });
    });
    syncDrawerDom(); // dock starts railed on desktop unless the pin pref says otherwise
    $('#spdPause').addEventListener('click', function () { A().togglePause(st()); syncSpeedButtons(); });
    $('#spd1').addEventListener('click', function () { A().setSpeed(st(), 1); syncSpeedButtons(); });
    $('#spd3').addEventListener('click', function () { A().setSpeed(st(), 3); syncSpeedButtons(); });
    $('#spd10').addEventListener('click', function () { A().setSpeed(st(), 10); syncSpeedButtons(); });
    $('#btnMute').addEventListener('click', function () { SW.audio.toggleMute(); syncAudioButtons(); });
    $('#btnMusic').addEventListener('click', function () { SW.audio.ensure(); SW.audio.toggleMusic(); syncAudioButtons(); });
    $('#btnMenu').addEventListener('click', function () { ui.closeSheet(); SW.uiModals.showMenu(); });
    $('#btnCodex').addEventListener('click', function () { ui.closeSheet(); ui.openLeaf(SW.uiModals.showCodex); });
    $('#btnTech').addEventListener('click', function () {
      ui.closeSheet();
      if (SW.uiTech.isOpen()) SW.uiTech.close(); else SW.uiTech.open();
    });
    $('#btnExchange').addEventListener('click', function () { ui.closeSheet(); SW.uiMarket.toggleExchange(); });
    $('#btnMore').addEventListener('click', function () { ui.toggleMore(); });
    $('#btnBackGalaxy').addEventListener('click', function () { ui.exitSystem(); });
    syncAudioButtons();

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

    const tk = $('#ticker');
    if (tk) tk.addEventListener('click', function () { SW.uiMarket.tickerClick(); });
    setInterval(refreshTick, 300);
    requestAnimationFrame(portraitLoop);
  };

  // ============ ticker beat (counter lives here; rotateTicker lives in ui_market) ============
  let tickerBeat = 0;

  function refreshTick() {
    const s = st();
    if (!s) return;
    // Keep the "Continue" slot metadata in step with autosaves so the main menu
    // shows the player's real progress. Cheap, and only when the autosave fires.
    if (s.tick > 0 && s.tick % (D.TUNE.autosaveEvery || 40) === 0 && s.tick !== _lastMetaTick) {
      _lastMetaTick = s.tick;
      ui.writeSaveMeta('auto');
    }
    if (++tickerBeat % 16 === 0) SW.uiMarket.rotateTicker(); // ~5s carousel
    if (uiPointerActive) {
      deferredUiRefresh = true;
      SW.audio.updateMood(s);
      return;
    }
    renderTopbar();
    SW.audio.updateMood(s);
    const focused = document.activeElement && (document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'INPUT');
    if (!focused && s.tick !== lastRenderTick) {
      lastRenderTick = s.tick;
      SW.uiSystem.renderSysPanel();
      SW.uiShip.renderCommandBar();
      renderRing();
      renderBoardFlyout();
      renderDock(false);
      if (!$('#exchange').classList.contains('hidden')) SW.uiMarket.renderExchange();
      renderInfobox(null);
    }
  }
  ui.refresh = function () {
    lastRenderTick = -1;
    renderTopbar();
    SW.uiSystem.renderSysPanel();
    SW.uiShip.renderCommandBar();
    renderRing();
    renderBoardFlyout();
    // Prologue UI gating: shrink the interface while the map is locked
    const _st = st();
    if (_st && SW.tutorial && SW.tutorial.mapLocked(_st)) {
      const sw = $('#searchWrap'); if (sw && sw.style) sw.style.display = 'none';
      const be = $('#btnExchange'); if (be && be.style) be.style.display = 'none';
      const bt = $('#btnTech'); if (bt && bt.style) bt.style.display = 'none';
      if (SW.uiTech.isOpen && SW.uiTech.isOpen()) SW.uiTech.close();
      document.querySelectorAll('#dockTabs button').forEach(function (b) {
        const t = b.dataset && b.dataset.tab;
        const show = t === 'fleet' || t === 'log';
        if (b.style) b.style.display = show ? '' : 'none';
        if (!show && b.classList && b.classList.contains('active')) ui.setTab('fleet');
      });
    } else {
      const sw = $('#searchWrap'); if (sw && sw.style) sw.style.display = '';
      const be = $('#btnExchange'); if (be && be.style) be.style.display = '';
      const bt = $('#btnTech'); if (bt && bt.style) bt.style.display = '';
      document.querySelectorAll('#dockTabs button').forEach(function (b) {
        if (b.style) b.style.display = '';
      });
    }
    renderDock(true);
    renderInfobox(null);
  };
  // Touch devices only: the dock is a bottom sheet. Tapping a tab opens it and
  // switches; tapping the *active* tab again closes it, so the map stays primary.
  ui.isTouch = function () {
    try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; }
  };
  function bodyClass() { return (typeof document !== 'undefined' && document.body && document.body.classList) || null; }
  ui.closeSheet = function () { const b = bodyClass(); if (b) b.remove('dockOpen'); };
  ui.setTab = function (tab) {
    const wasActive = activeTab === tab;
    activeTab = tab;
    document.querySelectorAll('#dockTabs button').forEach(function (x) { x.classList.toggle('active', x.dataset.tab === tab); });
    const b = bodyClass();
    if (b && ui.isTouch()) {
      if (wasActive && b.contains('dockOpen')) b.remove('dockOpen');
      else b.add('dockOpen');
    } else {
      // Desktop drawer semantics (SPEC[UI-DRAWERS]): a tab is a summons; re-tapping
      // the active tab dismisses; the thumbtack keeps it ambient
      if (wasActive && ui.drawer.isOpen('dock') && !ui.drawer.isPinned('dock')) ui.drawer.close('dock');
      else ui.drawer.open('dock');
    }
    renderDock(true);
  };

  // ============ drawers (SPEC[UI-DRAWERS]) ============
  // Same organs, closed by default: the four big surfaces are edge drawers.
  // The machine owns only open/pin state — every renderer keeps its DOM target
  // and signature. On touch the dock keeps the F1 bottom-sheet behavior
  // (body.dockOpen); the rail is a desktop idea. Pin preference is sticky.
  // sys: null until the player explicitly opens/closes it once — defaults to
  // open on desktop (legacy reflex) but closed on touch, where the panel is a
  // half-screen bottom sheet that would otherwise bury the ring/flyout (F5/F7)
  // under itself the moment a system is first selected. Once toggled, sticky.
  const drawerWant = { sys: null, dock: false };
  function syncDrawerDom() {
    const b = bodyClass();
    if (b) b.toggle('dockRail', !ui.isTouch() && !drawerWant.dock && !ui.drawer.isPinned('dock'));
    const pin = $('#btnPinDock');
    if (pin) {
      const on = ui.drawer.isPinned('dock');
      pin.textContent = on ? '▣' : '▢';
      if (pin.setAttribute) pin.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (pin.classList) pin.classList.toggle('active', on);
    }
  }
  ui.drawer = {
    isOpen: function (id) {
      if (id === 'exchange') return !$('#exchange').classList.contains('hidden');
      if (id === 'tech') return !!(SW.uiTech && SW.uiTech.isOpen && SW.uiTech.isOpen());
      if (id === 'sys') return !$('#sysPanel').classList.contains('hidden');
      if (id === 'dock') {
        if (ui.isTouch()) { const b = bodyClass(); return !!(b && b.contains('dockOpen')); }
        return !!(drawerWant.dock || ui.drawer.isPinned('dock'));
      }
      return false;
    },
    wants: function (id) {
      if (id === 'sys' && drawerWant.sys === null) return !ui.isTouch();
      return !!drawerWant[id];
    },
    open: function (id) {
      if (id === 'exchange') { if (!ui.drawer.isOpen('exchange')) SW.uiMarket.toggleExchange(); return; }
      if (id === 'tech') { if (!ui.drawer.isOpen('tech')) SW.uiTech.open(); return; }
      if (id === 'sys') { drawerWant.sys = true; SW.uiSystem.renderSysPanel(); return; }
      if (id === 'dock') {
        if (ui.isTouch()) { const b = bodyClass(); if (b) b.add('dockOpen'); }
        drawerWant.dock = true; syncDrawerDom(); renderDock(true);
      }
    },
    close: function (id) {
      if (id === 'exchange') { $('#exchange').classList.add('hidden'); return; }
      if (id === 'tech') { if (ui.drawer.isOpen('tech')) SW.uiTech.close(); return; }
      if (id === 'sys') { drawerWant.sys = false; $('#sysPanel').classList.add('hidden'); return; }
      if (id === 'dock') {
        if (ui.isTouch()) { ui.closeSheet(); return; }
        drawerWant.dock = false; syncDrawerDom();
      }
    },
    toggle: function (id) { if (ui.drawer.isOpen(id)) { ui.drawer.close(id); return false; } ui.drawer.open(id); return true; },
    isPinned: function (id) { const pins = ui.prefs().drawerPins || {}; return !!pins[id]; },
    pin: function (id, val) {
      const pins = Object.assign({}, ui.prefs().drawerPins || {});
      const on = (val === undefined) ? !pins[id] : !!val;
      pins[id] = on; ui.setPref('drawerPins', pins);
      if (on) ui.drawer.open(id); else syncDrawerDom();
      return on;
    },
  };
  ui.syncDrawerDom = syncDrawerDom;

  // ============ the orbital ring (SPEC[UI-ORBITAL-RING]) ============
  // Selecting a system no longer force-opens the panel — a ring of glyph
  // buttons orbits the star itself, contextual to what's actually available.
  // Content (which buttons) rebuilds on state change (renderRing, called from
  // ui.refresh/refreshTick); position (the wrapper's transform) syncs every
  // frame from render.js's post-render hook (ui.onFrame) via R.screenPosOf —
  // one source of truth, so the ring can never drift off the star.
  function ringButtons(s, sys) {
    const btns = [];
    if (sys.discovered) btns.push({ act: 'enterSys', glyph: '⏵', title: 'Enter — orbital view', info: 'ui:ringEnter' });
    btns.push({ act: 'ringDetails', glyph: 'ⓘ', title: 'Details — the full system panel', info: 'ui:ringDetails' });
    const ship = selectedShip();
    if (ship && ship.at !== null && ship.at !== sys.id && SW.ships.findPath(s, ship.at, sys.id)) {
      btns.push({ act: 'ringSend', glyph: '➤', title: 'Send ' + ship.name + ' here', info: 'ui:ringSend' });
    }
    if (sys.discovered && SW.pledges && SW.pledges.offersAt(s, sys.id).length) {
      btns.push({ act: 'ringBoard', glyph: '◈', title: 'Guild board — offers here', info: 'ui:ringBoard' });
    }
    const marked = (s.bookmarks || []).indexOf(sys.id) >= 0;
    btns.push({ act: 'bookmark', glyph: marked ? '★' : '☆', title: marked ? 'Remove bookmark' : 'Bookmark', info: 'ui:ringBookmark' });
    if (sys.discovered && sys.scourge !== 2 && SW.ships.inRange(s, sys) && SW.uiSystem.availableBuilds(s, sys).length) {
      btns.push({ act: 'ringBuild', glyph: '▦', title: 'Build here', info: 'ui:ringBuild' });
    }
    return btns;
  }
  function renderRing() {
    const ring = $('#ring');
    if (!ring) return;
    const s = st();
    const sysId = SW.render.selectedSys;
    if (SW.render.mode !== 'galaxy' || sysId === null || sysId === undefined || !s || !s.systems[sysId]) {
      ring.innerHTML = ''; ring.dataset.builtFor = ''; return;
    }
    const btns = ringButtons(s, s.systems[sysId]);
    const orbitR = ui.isTouch() ? 46 : 34;
    let html = '';
    for (let i = 0; i < btns.length; i++) {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI / btns.length);
      const bx = Math.round(Math.cos(ang) * orbitR), by = Math.round(Math.sin(ang) * orbitR);
      const b = btns[i];
      html += '<button data-act="' + b.act + '" title="' + esc(b.title) + '" data-info="' + esc(b.info) + '" style="transform:translate(' + bx + 'px,' + by + 'px) translate(-50%,-50%)">' + b.glyph + '</button>';
    }
    ring.innerHTML = html;
    ring.dataset.builtFor = String(sysId);
  }
  ui.renderRing = renderRing;

  // ============ the Guild board flyout (SPEC[UI-GUILD-BOARD]) ============
  // Open pledge offers glow at their destination system, not in a list. A
  // beacon tap (or the ring's ◈ board verb) opens this compact flyout —
  // terms + one take button per offer, anchored near the star. The held
  // manifest is not per-system and keeps its home in the Pledges drawer.
  let boardFlyoutSys = null;
  function renderBoardFlyout() {
    const fly = $('#boardFlyout');
    if (!fly) return;
    const s = st();
    if (boardFlyoutSys === null || !s || !s.systems[boardFlyoutSys]) { fly.classList.add('hidden'); fly.innerHTML = ''; return; }
    const sys = s.systems[boardFlyoutSys];
    const PG = SW.pledges;
    const offers = PG ? PG.offersAt(s, sys.id) : [];
    if (!offers.length) { boardFlyoutSys = null; fly.classList.add('hidden'); fly.innerHTML = ''; return; }
    const bd = SW.uiPledge.threadBreakdown(s);
    const full = s.pledges.length >= PG.maxActive(s);
    const nextThread = 1 + Math.max(0, s.pledges.length) * D.TUNE.pledgeConcurrentThread + bd.streakBonus;
    let html = '<div class="row"><span class="title grow">◈ ' + esc(sys.name) + '</span>' +
      '<button data-act="closeBoardFlyout" title="Dismiss">✕</button></div>';
    for (const o of offers) {
      const canAfford = s.credits >= o.bond;
      const dis = full || !canAfford;
      const weaveIf = Math.round(o.chips * nextThread);
      html += '<div class="listItem">' +
        '<div class="row"><span class="title grow">' + o.qty + '× ' + commName(o.c) + '</span>' +
        '<span class="num" title="WEAVE if taken now, at ×' + nextThread.toFixed(1) + '">+' + U.fmt(weaveIf) + '</span></div>' +
        '<div class="row"><span class="sub num grow">' + o.hops + ' hops · ' + o.window + '-tick window · bond ' + U.fmt(o.bond) + '¤</span>' +
        '<button class="primary" data-act="takePledge" data-id="' + o.id + '"' + (dis ? ' disabled' : '') +
        ' title="' + (full ? 'Manifest full' : (canAfford ? 'Seal this pledge' : 'Cannot cover the bond')) + '">take</button></div></div>';
    }
    fly.innerHTML = html;
  }
  ui.renderBoardFlyout = renderBoardFlyout;
  ui.openBoardFlyout = function (sysId) { boardFlyoutSys = sysId; renderBoardFlyout(); };
  ui.closeBoardFlyout = function () {
    boardFlyoutSys = null;
    const fly = $('#boardFlyout');
    if (fly) { fly.classList.add('hidden'); fly.innerHTML = ''; }
  };
  ui.boardFlyoutOpen = function () { return boardFlyoutSys !== null; };
  ui.boardFlyoutSysId = function () { return boardFlyoutSys; };

  // Called every rAF frame from render.js's post-render step: pure position +
  // visibility sync, never rebuilds content (that only happens on state change).
  ui.onFrame = function () {
    const ring = $('#ring');
    if (ring) {
      const sysId = SW.render.selectedSys;
      if (SW.render.mode !== 'galaxy' || sysId === null || sysId === undefined) { ring.classList.add('hidden'); }
      else {
        const pos = SW.render.screenPosOf(sysId);
        if (!pos || !ring.innerHTML) ring.classList.add('hidden');
        else { ring.classList.remove('hidden'); ring.style.transform = 'translate(' + Math.round(pos.x) + 'px,' + Math.round(pos.y) + 'px)'; }
      }
    }
    const fly = $('#boardFlyout');
    if (fly && boardFlyoutSys !== null) {
      if (SW.render.mode !== 'galaxy') { fly.classList.add('hidden'); }
      else {
        const fp = SW.render.screenPosOf(boardFlyoutSys);
        if (!fp || !fly.innerHTML) fly.classList.add('hidden');
        else {
          fly.classList.remove('hidden');
          // clamp on-screen: a star past the midpoint on a narrow viewport
          // would otherwise push the flyout's take button past the edge —
          // read real dimensions where available (offsetWidth is 0 while
          // hidden, so this must run after the class removal above)
          const main = $('#main');
          const vw = (main && main.clientWidth) || (typeof window !== 'undefined' && window.innerWidth) || 1280;
          const vh = (main && main.clientHeight) || (typeof window !== 'undefined' && window.innerHeight) || 720;
          const fw = fly.offsetWidth || 250, fh = fly.offsetHeight || 120;
          let left = fp.x + 56, top = fp.y - 20;
          left = Math.max(8, Math.min(left, vw - fw - 8));
          top = Math.max(8, Math.min(top, vh - fh - 8));
          fly.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
        }
      }
    }
  };

  // ============ the command strip (SPEC[UI-COMMAND-STRIP]) ============
  // The rarer buttons (Development, Market, Codex, sound) live behind the ⋯
  // glyph in a slide-down row: one tap away, never eating strip width.
  ui.toggleMore = function (force) {
    const more = $('#stripMore'), btn = $('#btnMore');
    if (!more) return false;
    const open = (force !== undefined) ? !!force : more.classList.contains('hidden');
    more.classList.toggle('hidden', !open);
    if (btn && btn.classList) btn.classList.toggle('active', open);
    if (btn && btn.setAttribute) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    return open;
  };
  ui.moreOpen = function () { const m = $('#stripMore'); return !!(m && !m.classList.contains('hidden')); };

  function renderTopbar() {
    const s = st();
    $('#stCredits').textContent = U.fmt(s.credits);
    $('#stResearch').textContent = U.fmt(Math.floor(s.research));
    $('#stFleet').textContent = s.ships.length;
    const weaveEl = $('#stWeave');
    if (weaveEl) {
      weaveEl.textContent = U.fmt(s.weave || 0);
      const held = (s.pledges && s.pledges.length) || 0;
      const wrap = $('#stWeaveWrap');
      if (wrap) wrap.title = 'WEAVE ' + U.fmt(s.weave || 0) + (held ? ' · ' + held + ' pledge' + (held === 1 ? '' : 's') + ' held' : '');
    }
    $('#stTick').textContent = s.tick;
    const inf = Math.floor(s.infamy || 0);
    $('#stInfamyWrap').style.display = inf > 0 ? '' : 'none';
    const infStatus = SW.combat.infamyStatus(s.infamy || 0);
    $('#stInfamy').textContent = infStatus.label + ' ' + U.fmt1(s.infamy || 0);
    $('#btnExchange').disabled = !SW.tech.has(s, 'exchange');
    syncSpeedButtons();
    const expiring = s.contracts.filter(function (c) { return c.deadline - s.tick < 80; });
    let html = '';
    if (s.tutorial && s.tutorial.active && s.tutorial.goal <= 1) {
      html += '<button class="alert hailChip" data-act="skipActZero" title="Skip before the first flight and enter Act I with the canonical capability floor">SKIP GUIDED WAKE</button>';
    }
    if (SW.acts && SW.acts.active(s)) {
      const a = s.acts;
      if (a.suspended === 'act0') {
        html += '<div class="alert hailChip" title="Act I pressure and its Charter clock begin only after the Wake holds">ACT 0 · CLOCK PAUSED</div>';
      } else if (a.boundary) {
        html += '<div class="alert hailChip" data-act="openPledges" title="A Charter boundary is open — bank or push in the Pledges tab">◈ ' + (a.summit ? 'SUMMIT' : 'ACT ' + SW.acts.roman(a.n) + ' MET') + '</div>';
      } else {
        const left = SW.acts.ticksLeft(s);
        const low = left < 120;
        html += '<div class="alert' + (low ? '' : '') + '" data-act="openPledges" title="Act ' + SW.acts.roman(a.n) + ' quota ' + U.fmt(a.quota) + ' — ' + U.fmt(Math.round(SW.acts.progress(s))) + ' woven, ' + left + ' ticks left">◈ ' + SW.acts.roman(a.n) + ' ' + Math.round(SW.acts.progress(s) / Math.max(1, a.quota) * 100) + '%' + (low ? ' ⧗' + left : '') + '</div>';
      }
    }
    // Beacons live on the map (SPEC[UI-SIGNALS]); the strip keeps one compact
    // overflow counter — a summary, not a second alert surface.
    const counts = SW.signals ? SW.signals.counts(s) : {};
    const parts = [];
    if (counts.threat) parts.push('△' + counts.threat);
    if (counts.stranded) parts.push('▲' + counts.stranded);
    if (counts.hail) parts.push('◌' + counts.hail);
    if (counts.board) parts.push('◈' + counts.board);
    if (parts.length) {
      html += '<div class="alert' + (counts.threat ? '' : ' hailChip') + '" data-act="jumpSignals" title="Signals on the map — tap to jump to the most urgent">' + parts.join(' ') + '</div>';
    }
    if (expiring.length) html += '<div class="alert" data-act="openOps">◷ CONTRACT</div>';
    if (s.story && s.story.hail) html += '<div class="alert" data-act="openHail" title="' + esc(s.story.hail.title || 'Incoming hail') + '">◌ HAIL</div>';
    // Hails that name no system have no beacon — they keep their chips.
    const looseHails = SW.signals ? SW.signals.unanchoredHails(s) : ((s.story && s.story.hails) || []);
    for (const h of looseHails.slice(0, 3)) {
      html += '<div class="alert hailChip' + (h.mood === 'bad' ? ' grim' : '') + '" data-act="openHail" data-key="' + esc(h.key) + '" title="' + esc(h.title || 'Signal') + ' — click to answer, or let it lapse">◌ ' + esc(h.title || 'SIGNAL') + (h.count > 1 ? ' ×' + h.count : '') + '</div>';
    }
    if (looseHails.length > 3) html += '<div class="alert hailChip" data-act="openSignals" title="All waiting signals — Journal tab">◌ +' + (looseHails.length - 3) + '</div>';
    $('#alerts').innerHTML = html;
    $('#objective span').textContent = s.story.objective || '…';
    const a11y = $('#mapA11y');
    if (a11y) {
      const sys = SW.render.selectedSys !== null && SW.render.selectedSys !== undefined ? s.systems[SW.render.selectedSys] : null;
      const ship = selectedShip();
      const summary = 'Objective: ' + (s.story.objective || 'none') + '. ' +
        (sys ? 'Selected system: ' + sys.name + '. ' : '') +
        (ship ? 'Selected craft: ' + ship.name + ', ' + ship.mode + '. ' : '') +
        (parts.length ? 'Signals: ' + parts.join(', ') + '.' : 'No urgent map signals.');
      if (a11y.textContent !== summary) a11y.textContent = summary;
    }
  }
  function syncSpeedButtons() {
    const s = st();
    $('#spdPause').classList.toggle('active', s.paused);
    $('#spd1').classList.toggle('active', !s.paused && s.speed === 1);
    $('#spd3').classList.toggle('active', !s.paused && s.speed === 3);
    $('#spd10').classList.toggle('active', !s.paused && s.speed === 10);
  }
  // Reflect audio mute state on the topbar buttons. Called on click, on init,
  // and whenever the Settings panel toggles audio, so all three stay in sync.
  function syncAudioButtons() {
    const mute = $('#btnMute'), music = $('#btnMusic');
    if (mute) { mute.style.opacity = SW.audio.muted ? 0.35 : 1; if (mute.setAttribute) mute.setAttribute('aria-pressed', SW.audio.muted ? 'true' : 'false'); }
    if (music) { music.style.opacity = SW.audio.musicMuted ? 0.35 : 1; if (music.setAttribute) music.setAttribute('aria-pressed', SW.audio.musicMuted ? 'true' : 'false'); }
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
  ui.jumpToSystem = jumpToSystem; // exposed for ui_market tickerClick

  // ============ map callbacks (render.js) ============
  ui.mapClick = function (sys) {
    const s = st();
    SW.audio.sfx('click');
    if (mapMode && !sys) { if (mapMode !== 'route') setMapMode(null); return; }
    if (mapMode === 'send' && sys) {
      const ship = selectedShip();
      if (ship) {
        const r = A().shipSend(s, ship.id, sys.id, ui.sendSellOnArrive);
        toast(r.ok ? { kind: 'info', text: ship.name + ' → ' + sys.name + (ui.sendSellOnArrive ? ' (sell on arrival)' : '') } : { kind: 'bad', text: r.msg });
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
      // Selection now summons the orbital ring (§13.5), not the panel — the
      // panel stays wherever the player last left it; ✕/Esc-dismiss stays
      // dismissed across further selections until the ring's ⓘ reopens it.
    } else pinnedInfo = null;
    // Tap-away (SPEC[UI-GUILD-BOARD]): clicking elsewhere on the map dismisses a
    // flyout anchored to a different system (or empty space)
    if (ui.boardFlyoutOpen() && (!sys || sys.id !== ui.boardFlyoutSysId())) ui.closeBoardFlyout();
    ui.refresh();
  };
  ui.mapHover = function (sys) {
    renderInfobox(sys ? { kind: 'system', id: sys.id } : null);
  };
  // A beacon tap does what the signal asks (SPEC[UI-SIGNALS]), not what
  // a generic system click would do.
  ui.beaconTap = function (b) {
    const s = st();
    SW.audio.sfx('click');
    if (b.kind === 'threat') {
      SW.render.centerOn(b.sys); SW.render.selectedSys = b.sys; ui.drawer.open('sys');
    } else if (b.kind === 'stranded') {
      SW.render.centerOn(b.sys); SW.render.selectedShip = b.shipId || null;
    } else if (b.kind === 'hail') {
      const r = A().openHail(s, b.hailKey || undefined);
      if (!r.ok) toast({ kind: 'bad', text: r.msg || 'The channel is dead.' });
    } else if (b.kind === 'board') {
      ui.openBoardFlyout(b.sys);
    } else if (b.kind === 'boundary') {
      ui.setTab('pledges');
    }
    ui.refresh();
  };
  ui.bodyClick = function (body) {
    SW.render.selectedBody = body || null;
    if (body) { pinnedInfo = { kind: 'body', body: body }; renderInfobox(null); }
    SW.uiSystem.renderSysPanel(); // body selection drives the sites section
  };
  ui.bodyHover = function (body) {
    renderInfobox(body ? { kind: 'body', body: body } : null);
  };
  ui.enterSystem = function (sysId) {
    const state = st();
    if (state && SW.game.actions.focusAperture) SW.game.actions.focusAperture(state, sysId);
    SW.render.enterSystem(sysId);
    if (state && SW.tutorial && SW.tutorial.isActive(state)) ui.drawer.open('sys');
    $('#btnBackGalaxy').classList.remove('hidden');
    // Tell the layout we're in system view so the system panel can drop below
    // the back button instead of colliding with it (CSS: #main.inSystem #sysPanel).
    var mn = $('#main'); if (mn && mn.classList) mn.classList.add('inSystem');
  };
  ui.exitSystem = function () {
    const s = st();
    if (s && SW.tutorial && SW.tutorial.mapLocked(s)) { toast({ kind: 'info', text: 'The weave begins at home.' }); return; }
    SW.render.exitSystem();
    $('#btnBackGalaxy').classList.add('hidden');
    var mn = $('#main'); if (mn && mn.classList) mn.classList.remove('inSystem');
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

  // ============ dock dispatch ============
  function renderDock(force) {
    const body = $('#dockBody');
    if (activeTab === 'fleet') SW.uiShip.renderFleet(body);
    else if (activeTab === 'routes') SW.uiRoutes.renderRoutes(body, force);
    else if (activeTab === 'ops') SW.uiRoutes.renderOps(body);
    else if (activeTab === 'you') SW.uiRoutes.renderYou(body);
    else if (activeTab === 'pledges') SW.uiPledge.renderPledges(body);
    else if (activeTab === 'log') SW.uiRoutes.renderLog(body);
    else if (activeTab === 'tech') SW.uiTech.renderTech(body, force); // fallback: tab removed from dock but kept for safety
  }

  // ============ identity helpers ============
  function applyIdentity(s) {
    const hue = s.identity.hue;
    document.documentElement.style.setProperty('--accent', 'hsl(' + hue + ',55%,72%)');
    document.documentElement.style.setProperty('--accent-dim', 'hsla(' + hue + ',55%,72%,0.16)');
  }
  function afterLoad() {
    const s = SW.game.state;
    applyIdentity(s);
    loadPanelSections(s);
    ui.exitSystem();
    SW.render.selectedSys = s.ships.length ? s.ships[0].at : s.homeId;
    SW.render.selectedShip = s.ships.length ? s.ships[0].id : null;
    SW.render.fit();
    SW.render.centerOn(SW.render.selectedSys !== null ? SW.render.selectedSys : s.homeId);
    pinnedInfo = null;
    ui.refresh();
    maybeGuidanceHint(s);
  }
  ui.afterLoad = afterLoad;

  // One-time gentle nudge (per browser, not per run) telling the player where to
  // look when unsure: the objective bar and the Journal. Skipped during the
  // tutorial — the prologue already hand-holds — and only once, ever. Stored in
  // browser prefs, not the legacy system (which is for roguelite unlocks).
  function maybeGuidanceHint(s) {
    if (!s || (SW.tutorial && SW.tutorial.isActive(s))) return;
    if (ui.prefs().guidanceSeen) return;
    ui.setPref('guidanceSeen', true);
    setTimeout(function () {
      toast({ kind: 'info', text: '◈ Unsure what to do? The objective bar (bottom) names your next step; the Journal tab holds contracts and signals.' });
    }, 1200);
  }

  // ============ module shims (main.js and G.handlers use these names) ============
  ui.showEvent = function () { SW.uiModals.showEvent(); };
  ui.showGameOver = function (go) { SW.uiModals.showGameOver(go); };
  ui.showTitle = function () { SW.uiModals.showTitle(); };
  ui.openCombatSim = function (ship, sys) { SW.uiModals.openCombatSim(ship, sys); };

  // ============ preferences (browser-local, not part of the save) ============
  // Settings live in localStorage, separate from game saves. Audio prefs stay in
  // SW.audio (their existing home); the rest live here under one key.
  let _prefs = null;
  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem('starweft_prefs') || '{}') || {}; }
    catch (e) { return {}; }
  }
  ui.prefs = function () { if (!_prefs) _prefs = loadPrefs(); return _prefs; };
  ui.applyPrefs = function () {
    const p = ui.prefs();
    const root = document.documentElement;
    const scale = [100, 125, 150, 200].indexOf(parseInt(p.uiScale, 10)) >= 0 ? parseInt(p.uiScale, 10) : 100;
    if (root.dataset) root.dataset.uiScale = String(scale);
    if (root.style && root.style.setProperty) root.style.setProperty('--ui-scale', String(scale / 100));
    if (root.classList) {
      root.classList.toggle('reduceMotion', !!p.reduceMotion);
      root.classList.toggle('highContrast', !!p.highContrast);
    }
    return p;
  };
  ui.setPref = function (k, v) {
    const p = ui.prefs(); p[k] = v;
    try { localStorage.setItem('starweft_prefs', JSON.stringify(p)); } catch (e) {}
    ui.applyPrefs();
    return v;
  };

  // Dev tools (cheat/feature panel) are gated: only with ?dev in the URL or a
  // sticky flag once enabled, so players never see it but it stays one chord away.
  ui.devEnabled = function () {
    try {
      if (typeof location !== 'undefined' && /[?&]dev\b/.test(location.search || '')) { localStorage.setItem('starweft_dev', '1'); return true; }
      return localStorage.getItem('starweft_dev') === '1';
    } catch (e) { return false; }
  };

  // Save-slot metadata for the menus. Written on save (with a wall-clock stamp,
  // which is fine in UI code — only sim code must stay Date-free for replay).
  ui.writeSaveMeta = function (slot) {
    const s = st(); if (!s) return;
    let when = '';
    try { when = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch (e) {}
    const meta = { name: (s.identity && s.identity.name) || 'Unnamed weft', tick: s.tick || 0, credits: s.credits || 0, origin: s.origin, when: when };
    try { localStorage.setItem('starweft_meta_' + (slot || 'auto'), JSON.stringify(meta)); } catch (e) {}
  };
  ui.saveMeta = function (slot) {
    try { return JSON.parse(localStorage.getItem('starweft_meta_' + (slot || 'auto')) || 'null'); }
    catch (e) { return null; }
  };

  // Daily-weave best scores, keyed by date (browser-local leaderboard-of-one).
  ui.dailyBest = function (dateKey) {
    try { const m = JSON.parse(localStorage.getItem('starweft_daily') || '{}'); return m[dateKey] || null; }
    catch (e) { return null; }
  };
  ui.recordDaily = function (dateKey, score) {
    try {
      const m = JSON.parse(localStorage.getItem('starweft_daily') || '{}');
      if (!m[dateKey] || score > m[dateKey]) { m[dateKey] = score; localStorage.setItem('starweft_daily', JSON.stringify(m)); }
    } catch (e) {}
  };

  ui.confirm = function (opts) { SW.uiModals.showConfirm(opts); };

  // Leaf modals (Help, Settings, Codex, Import) can be opened from the title
  // front door, the pause menu, or in-game. They must return to their opener,
  // not blow away the whole stack. captureReturn() snapshots "home" before a
  // leaf opens; closeLeaf() re-opens it. In-game home is "nothing" (just close).
  let _menuReturn = null;
  function captureReturn() {
    const titleOpen = ui.modalOpen() && !$('#titleModal').classList.contains('hidden');
    const menuOpen = ui.modalOpen() && !$('#menuModal').classList.contains('hidden');
    if (titleOpen) _menuReturn = 'title';
    else if (menuOpen) _menuReturn = 'pause';
    else _menuReturn = null; // opened from the live game — just close on done
  }
  ui.closeLeaf = function () {
    const r = _menuReturn; _menuReturn = null;
    if (r === 'title') ui.showTitle();
    else if (r === 'pause') SW.uiModals.showMenu();
    else hideModals();
  };
  ui.openLeaf = function (showFn) { captureReturn(); showFn(); };
  // The #sigilPreview canvas on the new-run form is animated by the existing
  // portrait loop (see top of this file); nothing to do here but keep the hook
  // so callers don't need to know that.
  ui.paintSigil = function () {};

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
        const idle = pickLogisticsShip(s, ship);
        if (!idle) { toast({ kind: 'bad', text: 'No idle ship for a supply run.' }); break; }
        const r = A().supplyMission(s, idle.id, sysId, btn.dataset.c, parseInt(btn.dataset.q, 10));
        toast(r.ok ? { kind: 'info', text: '▢ ' + idle.name + ' fetching ' + btn.dataset.q + ' ' + D.COMMODITIES[btn.dataset.c].name + ' from ' + r.source.name } : { kind: 'bad', text: r.msg });
        break;
      }
      case 'projectBuild': {
        const r = A().projectBuild(s, sysId, btn.dataset.b);
        if (!r.ok) toast({ kind: 'bad', text: r.msg });
        break;
      }
      case 'cancelProject': A().cancelProject(s, btn.dataset.id); break;
      case 'boardEvac': {
        const sh = (ship && ship.at === sysId && SW.ships.berths(ship)) ? ship :
          s.ships.find(function (x) { return x.mode === 'idle' && x.at === sysId && SW.ships.berths(x) && !x.pax; });
        if (!sh) { toast({ kind: 'bad', text: 'No idle berthed hull here. Couriers, Freighters and Liners carry souls.' }); break; }
        const r = A().boardEvac(s, sh.id);
        if (!r.ok) toast({ kind: 'bad', text: r.msg });
        else { SW.render.selectedShip = sh.id; A().shipSend(s, sh.id, r.haven, false); }
        break;
      }
      case 'boardCharter': {
        const sh = (ship && ship.at === sysId && SW.ships.berths(ship)) ? ship :
          s.ships.find(function (x) { return x.mode === 'idle' && x.at === sysId && SW.ships.berths(x) && !x.pax; });
        if (!sh) { toast({ kind: 'bad', text: 'No idle berthed hull here.' }); break; }
        const r = A().boardCharter(s, sh.id, btn.dataset.id);
        if (!r.ok) toast({ kind: 'bad', text: r.msg });
        else { SW.render.selectedShip = sh.id; const ch = sh.pax; if (ch) A().shipSend(s, sh.id, ch.to, false); }
        break;
      }
      case 'landPax': if (ship) { const r = A().landPax(s, ship.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); } break;
      case 'takePledge': { const r = A().takePledge(s, btn.dataset.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); else { SW.audio.sfx('click'); renderDock(true); } break; }
      case 'draftCharter': { const r = A().draftCharter(s, btn.dataset.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); else renderDock(true); break; }
      case 'skipActZero': { const r = A().skipActZero(s); if (!r.ok) toast({ kind: 'bad', text: r.msg }); else { ui.exitSystem(); ui.refresh(); } break; }
      case 'abandonPledge': {
        const abandon = function () { const r = A().abandonPledge(s, btn.dataset.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); else renderDock(true); };
        if (ui.prefs().confirmIrreversible) {
          ui.confirm({ title: 'Abandon this Pledge?', text: 'Its bond and promised world change will be forfeited.', yes: 'Abandon Pledge', danger: true, onYes: abandon });
          return;
        }
        abandon(); break;
      }
      case 'bankThread': { const r = A().bankThread(s); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'pushThread': { const r = A().pushThread(s, btn.dataset.boon); if (!r.ok) toast({ kind: 'bad', text: r.msg }); else { syncSpeedButtons(); ui.setTab('pledges'); } break; }
      case 'graduateThread': { const r = A().graduateThread(s); if (!r.ok) toast({ kind: 'bad', text: r.msg }); else { syncSpeedButtons(); renderDock(true); } break; }
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
      case 'scrap': if (ship) {
        const scrap = function () { const r = A().scrapShip(s, ship.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); else { SW.render.selectedShip = null; ui.refresh(); } };
        if (ui.prefs().confirmIrreversible) {
          ui.confirm({ title: 'Scrap ' + ship.name + '?', text: 'The craft and its current assignment will be permanently removed.', yes: 'Scrap craft', danger: true, onYes: scrap });
          return;
        }
        scrap();
      } break;
      case 'deliverPanacea': if (ship) { const r = A().deliverPanacea(s, ship.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); } break;
      case 'inoculate': if (ship) { const r = A().inoculate(s, ship.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); } break;
      case 'raidHere':
        if (ship && ship.at !== null) {
          if (SW.tech.has(s, 'simulacrum')) SW.uiModals.openRaidChoice(ship, s.systems[ship.at]);
          else {
            const r = A().raid(s, ship.id, ship.at);
            if (!r.ok) toast({ kind: 'bad', text: r.msg }); else SW.audio.sfx('raid');
          }
        }
        break;
      case 'followShip': if (ship) SW.render.followShip = SW.render.followShip === ship.id ? null : ship.id; break;
      case 'focusSys': if (sysId !== null) SW.render.centerOn(sysId); break;
      case 'simManual': SW.uiModals.beginRaidManual(); break;
      case 'simAuto': SW.uiModals.closeCombatSim(true); break;
      case 'simAbort': SW.uiModals.closeCombatSim(false); break;
      case 'enterSys': if (sysId !== null) ui.enterSystem(sysId); break;
      case 'bookmark': if (sysId !== null) A().toggleBookmark(s, sysId); break;
      case 'closeSysPanel': ui.drawer.close('sys'); break;
      // Ring verbs (SPEC[UI-ORBITAL-RING]) — the ring always concerns SW.render.selectedSys
      case 'ringDetails': ui.drawer.open('sys'); break;
      case 'ringSend': {
        if (ship && sysId !== null) {
          const r = A().shipSend(s, ship.id, sysId, ui.sendSellOnArrive);
          toast(r.ok ? { kind: 'info', text: ship.name + ' → ' + s.systems[sysId].name + (ui.sendSellOnArrive ? ' (sell on arrival)' : '') } : { kind: 'bad', text: r.msg });
        }
        break;
      }
      case 'ringBoard': if (sysId !== null) ui.beaconTap({ kind: 'board', sys: sysId }); break;
      case 'closeBoardFlyout': ui.closeBoardFlyout(); break;
      case 'ringBuild': if (sysId !== null) { ui.drawer.open('sys'); ui.openPanelSection('sys:construction'); } break;
      case 'alignPlane':
        if (SW.render.mode === 'system') {
          SW.render.resetSystemCam();
        } else {
          SW.render.alignToPlane();
        }
        break;

      case 'draftStart': ui.editorOpen = true; ui.routeDraft = []; setMapMode('route', '↻ click systems to add stops'); renderDock(true); return;
      case 'draftRemove': ui.routeDraft.splice(parseInt(btn.dataset.i, 10), 1); renderDock(true); return;
      case 'draftCancel': ui.editorOpen = false; ui.routeDraft = null; setMapMode(null); renderDock(true); return;
      case 'draftCreate': {
        const r = A().createRoute(s, ui.routeDraft);
        if (!r.ok) { toast({ kind: 'bad', text: r.msg }); return; }
        if (ship && ship.mode === 'idle' && !ship.routeId) A().assignShip(s, ship.id, r.route.id);
        ui.editorOpen = false; ui.routeDraft = null; setMapMode(null);
        break;
      }
      case 'quickRoute': {
        const r = A().createRoute(s, [
          { sys: parseInt(btn.dataset.from, 10), action: 'buy', c: btn.dataset.c },
          { sys: parseInt(btn.dataset.to, 10), action: 'sell' },
        ]);
        if (!r.ok) { toast({ kind: 'bad', text: r.msg }); return; }
        const idle = pickLogisticsShip(s, null);
        if (idle) A().assignShip(s, idle.id, r.route.id);
        toast({ kind: 'good', text: '↻ ' + r.route.name + ' created' + (idle ? ' — ' + idle.name + ' assigned.' : '.') });
        break;
      }
      case 'chainRoute': {
        const r = A().createChainRoute(s, btn.dataset.c);
        if (!r.ok) { toast({ kind: 'bad', text: r.msg }); return; }
        const idle = pickLogisticsShip(s, null);
        if (idle) A().assignShip(s, idle.id, r.route.id);
        break;
      }
      case 'yardsToggle': { const r = A().toggleAutoYards(s); if (r.ok) toast({ kind: 'info', text: 'Tessellation Yards: ' + (r.enabled ? 'auto' : 'off') + '.' }); break; }
      case 'buildSite': { const r = A().buildSite(s, sysId, btn.dataset.body, btn.dataset.fac); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'selectBody': {
        const bodySysId = SW.render.systemId !== null && SW.render.systemId !== undefined ? SW.render.systemId : sysId;
        const data = Number.isInteger(bodySysId) ? SW.planets.get(s, bodySysId) : null;
        const body = data && data.bodies.find(function (candidate) { return candidate.name === btn.dataset.body; });
        if (!body) { toast({ kind: 'bad', text: 'That orbital destination is unavailable.' }); break; }
        ui.bodyClick(body);
        const panel = $('#sysPanel');
        const next = panel && panel.querySelector && (panel.querySelector('[data-act="hopHere"]') || panel.querySelector('[data-act="selectBody"][aria-pressed="true"]'));
        if (next && next.focus) next.focus();
        break;
      }
      case 'hopHere': {
        const sh = (ship && ship.mode === 'idle' && ship.at === sysId) ? ship :
          s.ships.find(function (x) { return x.mode === 'idle' && x.at === sysId; });
        if (!sh) { toast({ kind: 'bad', text: 'No idle ship in-system.' }); break; }
        const r = A().shipHop(s, sh.id, btn.dataset.body);
        if (!r.ok) toast({ kind: 'bad', text: r.msg });
        else { SW.render.selectedShip = sh.id; toast({ kind: 'info', text: '⇢ ' + sh.name + ' → ' + btn.dataset.body + ' (' + r.eta + 't)' }); SW.audio.sfx('click'); }
        break;
      }
      case 'buyPerk': {
        const r = A().buyPerk(s, btn.dataset.id);
        if (!r.ok) toast({ kind: 'bad', text: r.msg });
        else if (SW.uiTech.isOpen()) SW.uiTech.open('aptitudes');
        break;
      }
      case 'devTab': SW.uiTech.open(btn.dataset.tab); return;
      case 'sellData': if (ship) { const r = A().sellData(s, ship.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); } break;
      case 'exComm': SW.uiMarket.setComm(btn.dataset.c); SW.uiMarket.renderExchange(true); break;
      case 'marketKeep': {
        const targetSys = parseInt(btn.dataset.sys, 10);
        const targetQty = parseInt(btn.dataset.target, 10) || 60;
        const dupe = s.directives.find(function (d) { return d.sys === targetSys && d.c === btn.dataset.c; });
        if (dupe) { toast({ kind: 'info', text: 'Directive already tracks that stock.' }); break; }
        const r = A().createDirective(s, targetSys, btn.dataset.c, targetQty);
        if (!r.ok) { toast({ kind: 'bad', text: r.msg }); break; }
        const idle = pickLogisticsShip(s, ship);
        if (idle) A().assignShipDirective(s, idle.id, r.directive.id);
        toast({ kind: 'good', text: 'Directive set: keep ' + D.COMMODITIES[btn.dataset.c].name + ' stocked' + (idle ? ' — ' + idle.name + ' assigned.' : '.') });
        break;
      }
      case 'clearQueue': if (ship) A().clearQueue(s, ship.id); break;
      case 'fetchHere': {
        if (sysId === null) break;
        const hauler = pickLogisticsShip(s, ship);
        if (!hauler) { toast({ kind: 'bad', text: 'No idle hauler for the job.' }); break; }
        const src = SW.economy.cheapestSource(s, btn.dataset.c, 5, sysId);
        if (!src) { toast({ kind: 'bad', text: 'No charted market stocks ' + D.COMMODITIES[btn.dataset.c].name + '.' }); break; }
        const r = A().order(s, hauler.id, { type: 'fetch', c: btn.dataset.c, from: src.id, to: sysId });
        if (!r.ok) toast({ kind: 'bad', text: r.msg });
        break;
      }
      case 'fetchOp': {
        const hauler = pickLogisticsShip(s, ship);
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
          for (const sh of logisticsShips(s)) {
            A().assignShip(s, sh.id, route.id); n++;
          }
          toast({ kind: 'info', text: n + ' ships assigned to ' + route.name + '.' });
        }
        break;
      }
      case 'employAll': {
        let n = 0;
        for (const sh of logisticsShips(s)) {
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
        const c = ui.directiveForm.c, target = ui.directiveForm.target;
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
      case 'openTechTree': SW.uiTech.open(); return;
      case 'closeTechOverlay': SW.uiTech.close(); return;
      // techSelect: update selection; the detail pane refreshes on next research action or re-open
      case 'techSelect': SW.ui.techView.selected = btn.dataset.id; return;
      case 'techZoomIn': SW.uiTech.zoomTechView(1.18); return;
      case 'techZoomOut': SW.uiTech.zoomTechView(1 / 1.18); return;
      case 'techResetView': SW.ui.techView.x = 0; SW.ui.techView.y = 0; SW.ui.techView.zoom = 1; return;
      case 'research': {
        const r = A().research(s, btn.dataset.id);
        if (!r.ok) toast({ kind: 'bad', text: r.msg });
        else if (SW.uiTech.isOpen()) SW.uiTech.open('research');
        break;
      }
      case 'buyout': { const r = A().buyoutRival(s, btn.dataset.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'payToll': { const r = A().payToll(s, parseInt(btn.dataset.i, 10)); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'breakBlockade': if (ship) { const r = A().breakBlockade(s, parseInt(btn.dataset.i, 10), ship.id); if (!r.ok) toast({ kind: 'bad', text: r.msg }); } break;
      case 'hireRetainer': { const r = A().hireRetainer(s, $('#retRegion').value); if (!r.ok) toast({ kind: 'bad', text: r.msg }); break; }
      case 'blitzMode': setMapMode('blitz', '◎ click a system to blitz'); return;
      case 'embargoMode': setMapMode('embargo', '⊘ click a system to embargo'); return;
      case 'bulkAssign': {
        const pick = $('#bulkRoute');
        const routeId = pick && pick.value;
        const route = s.routes.find(function (r) { return r.id === routeId; });
        if (!route) { toast({ kind: 'bad', text: 'Pick a route first.' }); break; }
        let n = 0;
        for (const sh of logisticsShips(s)) {
          A().assignShip(s, sh.id, route.id);
          n++;
        }
        toast({ kind: 'info', text: n + ' idle ships assigned to ' + route.name + '.' });
        break;
      }

      case 'choose': SW.uiModals.chooseEvent(parseInt(btn.dataset.i, 10)); return;
      case 'openHail': { const r = A().openHail(s, btn.dataset.key || undefined); if (!r.ok) toast({ kind: 'bad', text: r.msg || 'The channel is dead.' }); return; }
      case 'dismissHail': A().dismissHail(s, btn.dataset.key || undefined); break;
      case 'openSignals': ui.setTab('log'); break;
      case 'cheatResources':
      case 'cheatUnlock':
      case 'cheatReveal':
      case 'cheatFleet':
      case 'cheatStock': {
        const kind = act === 'cheatResources' ? 'resources' :
          act === 'cheatUnlock' ? 'unlock' :
            act === 'cheatReveal' ? 'reveal' :
              act === 'cheatFleet' ? 'fleet' : 'stock';
        const r = A().cheat(s, kind, parseInt(btn.dataset.sys, 10));
        toast(r.ok ? { kind: 'good', text: r.msg || 'Cheat applied.' } : { kind: 'bad', text: r.msg });
        if (r.ok) { ui.refresh(); SW.uiModals.showCheats(); }
        break;
      }
      case 'closeModal': hideModals(); break;
      case 'closeExchange': $('#exchange').classList.add('hidden'); break;
      case 'postgame': A().continuePostgame(s); hideModals(); break;
      case 'replayLastThread': {
        const launch = s && s.thread && s.thread.launch;
        if (!launch || !D.ARCHETYPES[launch.archetype] || !D.PRESSURE[launch.pressure]) { SW.uiModals.showNewRun(); return; }
        const cfg = SW.game.canonicalLaunch({
          seed: 'thread-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 0xffff).toString(16),
          archetype: launch.archetype,
          pressure: launch.pressure,
          guidance: launch.guidance === 'brief' ? 'brief' : 'full',
          identity: JSON.parse(JSON.stringify(s.identity || launch.identity || {}))
        });
        SW.game.newGame(cfg);
        hideModals(); afterLoad(); ui.writeSaveMeta('auto');
        SW.render.selectedSys = SW.game.state.homeId;
        if (SW.game.state.ships[0]) SW.render.selectedShip = SW.game.state.ships[0].id;
        ui.enterSystem(SW.game.state.homeId);
        ui.refresh();
        A().setSpeed(SW.game.state, 1);
        toast({ kind: 'good', text: 'Replaying ' + D.ARCHETYPES[cfg.archetype].name + ' · ' + D.PRESSURE[cfg.pressure].name + '.' });
        return;
      }
      case 'newGameMenu': ui.showTitle(); return;
      case 'newRun': SW.uiModals.showNewRun(); return;
      case 'customRun': SW.uiModals.showCustomRun(); return;
      case 'chronicle': SW.uiModals.showChronicle(); return;
      case 'dailyWeave': SW.uiModals.showDailyBrief(); return;
      case 'beginDaily': {
        const cfg = SW.uiModals.dailyConfig();
        SW.game.newGame(cfg);
        hideModals();
        afterLoad();
        ui.writeSaveMeta('auto');
        A().setSpeed(SW.game.state, ui.prefs().defaultSpeed || 1);
        toast({ kind: 'info', text: '✦ Daily Weave ' + cfg.daily + ' — good luck, weaver.' });
        return;
      }
      case 'backToTitle': ui.showTitle(); return;
      case 'settings': ui.openLeaf(SW.uiModals.showSettings); return;
      case 'closeSettings': ui.closeLeaf(); return;
      case 'closeLeaf': ui.closeLeaf(); return;
      case 'codexFromTitle': ui.openLeaf(SW.uiModals.showCodex); return;
      case 'setSfx': { SW.audio.toggleMute(); syncAudioButtons(); SW.uiModals.showSettings(); return; }
      case 'setMusic': { SW.audio.ensure(); SW.audio.toggleMusic(); syncAudioButtons(); SW.uiModals.showSettings(); return; }
      case 'setReduceMotion': { ui.setPref('reduceMotion', !ui.prefs().reduceMotion); SW.uiModals.showSettings(); return; }
      case 'setHighContrast': { ui.setPref('highContrast', !ui.prefs().highContrast); SW.uiModals.showSettings(); return; }
      case 'setSoundCaptions': { ui.setPref('soundCaptions', !ui.prefs().soundCaptions); SW.uiModals.showSettings(); return; }
      case 'setConfirmIrreversible': { ui.setPref('confirmIrreversible', !ui.prefs().confirmIrreversible); SW.uiModals.showSettings(); return; }
      case 'setUiScale': { ui.setPref('uiScale', parseInt(btn.dataset.scale, 10) || 100); SW.uiModals.showSettings(); return; }
      case 'setBootSkip': { ui.setPref('skipBoot', !ui.prefs().skipBoot); SW.uiModals.showSettings(); return; }
      case 'setDefaultSpeed': { ui.setPref('defaultSpeed', parseInt(btn.dataset.spd, 10) || 1); SW.uiModals.showSettings(); return; }
      case 'openRenameThread': SW.uiModals.showRenameThread(); return;
      case 'cancelRenameThread': SW.uiModals.showMenu(); return;
      case 'renameThread': {
        const input = $('#renameThreadInput');
        const r = A().renameThread(s, input ? input.value : '');
        if (!r.ok) { toast({ kind: 'bad', text: r.msg }); return; }
        ui.writeSaveMeta('auto');
        SW.uiModals.showMenu();
        toast({ kind: 'good', text: 'Thread renamed · ' + r.name });
        return;
      }
      case 'quitToMenu': {
        ui.confirm({
          title: 'Quit to main menu?',
          text: 'Your run is autosaved and will be waiting under "Continue". Return to the main menu now?',
          yes: 'Quit to menu', danger: true,
          onYes: function () { SW.game.save('auto'); ui.writeSaveMeta('auto'); ui.showTitle(); },
        });
        return;
      }
      case 'confirmYes': SW.uiModals.runConfirm(); return;
      case 'rerollSigil': ui._sigilSeed = Math.floor(Math.random() * 100000); return;
      case 'rerollName': SW.uiModals.rerollName(); return;
      case 'surpriseWeave': SW.uiModals.surpriseWeave(); return;
      case 'continueGame': { const r = SW.game.load('auto'); if (r.ok) { hideModals(); afterLoad(); } else toast({ kind: 'bad', text: r.msg }); return; }
      case 'begin': {
        const seedEl = $('#ngSeed');
        const seedV = seedEl && seedEl.value ? seedEl.value.trim() : '';
        const archetype = SW.uiModals.selectedArchetype();
        const pressure = SW.uiModals.selectedPressure();
        const guidance = SW.game.legacy().prologue ? 'brief' : 'full';
        const cfg = SW.game.canonicalLaunch({
          seed: seedV || undefined,
          archetype: archetype,
          pressure: pressure,
          guidance: guidance,
          identity: { name: SW.game.threadName(seedV, archetype), hue: 195, sigil: U.seedFrom(seedV) % 1000, motto: 'Finish the round.', myth: 'none' }
        });
        SW.game.newGame(cfg);
        const account = SW.game.accountState();
        account.settings.launch = { archetype: archetype, pressure: pressure };
        SW.game.saveAccount();
        hideModals();
        afterLoad();
        ui.writeSaveMeta('auto');
        SW.render.selectedSys = SW.game.state.homeId;
        if (SW.game.state.ships[0]) SW.render.selectedShip = SW.game.state.ships[0].id;
        ui.enterSystem(SW.game.state.homeId);
        ui.refresh();
        A().setSpeed(SW.game.state, 1);
        toast({ kind: 'good', text: D.ARCHETYPES[archetype].glyph + ' ' + D.ARCHETYPES[archetype].name + ' Thread launched · ' + D.PRESSURE[pressure].name + ' pressure.' });
        return;
      }
      case 'beginCustom': {
        const seedEl = $('#ngSeed');
        const seedV = seedEl && seedEl.value ? seedEl.value.trim() : '';
        SW.game.newGame({
          seed: seedV || undefined,
          difficulty: ($('#ngDiff') && $('#ngDiff').value) || 'standard',
          threat: ($('#ngThreat') && $('#ngThreat').value) || undefined,
          conditions: SW.uiModals.selectedConditions ? SW.uiModals.selectedConditions() : [],
          doctrineLean: ($('#ngLean') && $('#ngLean').value) || undefined,
          origin: chosenOriginFromModal(),
          founder: chosenFounderFromModal(),
          aptitude: ($('#ngApt') && $('#ngApt').value) || undefined,
          tutorial: !!($('#ngTut') && $('#ngTut').checked),
          // Custom preserves both historical shapes. A guided custom Focused
          // run now uses Act 0 and therefore keeps the Act Ladder enabled.
          acts: !!($('#ngShape') && $('#ngShape').checked),
          world: {
            density: ($('#ngDen') && $('#ngDen').value) || 'standard',
            wealth: ($('#ngWea') && $('#ngWea').value) || 'standard',
            age: ($('#ngAge') && $('#ngAge').value) || 'settled',
            topology: ($('#ngTopo') && $('#ngTopo').value) || 'natural',
            heart: ($('#ngHeart') && $('#ngHeart').value) || 'home',
          },
          identity: {
            name: (($('#idName') && $('#idName').value) || 'The Provisional Weft').slice(0, 40),
            motto: (($('#idMotto') && $('#idMotto').value) || 'Finish the round.').slice(0, 60),
            hue: parseInt(($('#idHue') && $('#idHue').value) || '195', 10) || 195,
            sigil: ui._sigilSeed || 7,
            myth: ($('#ngMyth') && $('#ngMyth').value) || 'none',
          },
        });
        hideModals();
        afterLoad();
        ui.writeSaveMeta('auto');
        // The cold open begins at home, in the system view, map locked,
        // with Stitch already on the stick — the first verb is one click away
        if (SW.tutorial.isActive(SW.game.state)) {
          SW.render.selectedSys = SW.game.state.homeId;
          if (SW.game.state.ships[0]) SW.render.selectedShip = SW.game.state.ships[0].id;
          ui.enterSystem(SW.game.state.homeId);
          ui.refresh();
        }
        // Honor the player's saved default speed (tutorial always eases in at 1).
        A().setSpeed(SW.game.state, SW.tutorial.isActive(SW.game.state) ? 1 : (ui.prefs().defaultSpeed || 1));
        return;
      }
      case 'help': ui.openLeaf(SW.uiModals.showHelp); return;
      case 'cheats': if (ui.devEnabled()) SW.uiModals.showCheats(); else toast({ kind: 'bad', text: 'Dev tools are off. Add ?dev to the URL to enable.' }); return;
      case 'saveManual': { const r = SW.game.save('manual'); if (r.ok) ui.writeSaveMeta('manual'); toast(r.ok ? { kind: 'good', text: 'Run saved.' } : { kind: 'bad', text: r.msg || 'Save failed.' }); hideModals(); break; }
      case 'loadManual': { const r = SW.game.load('manual'); if (r.ok) { hideModals(); afterLoad(); toast({ kind: 'good', text: 'Loaded.' }); } else toast({ kind: 'bad', text: r.msg }); return; }
      case 'exportSave': {
        const data = SW.game.exportSave();
        if (data && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(data).then(
            function () { toast({ kind: 'good', text: 'Save copied to clipboard.' }); },
            function () { toast({ kind: 'bad', text: 'Could not copy — try Import/Export from a secure (https) context.' }); }
          );
        } else toast({ kind: 'bad', text: 'Clipboard unavailable here.' });
        break;
      }
      case 'importSave': ui.openLeaf(SW.uiModals.showImport); return;
      case 'confirmImport': {
        const box = $('#importBox');
        const data = box && box.value ? box.value.trim() : '';
        if (!data) { toast({ kind: 'bad', text: 'Nothing to import — paste a save first.' }); return; }
        const r = SW.game.loadFromString(data);
        if (r.ok) { hideModals(); afterLoad(); toast({ kind: 'good', text: 'Save imported.' }); }
        else toast({ kind: 'bad', text: r.msg || 'That save could not be read.' });
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
      case 'authorizeSolNet': {
        const r = A().authorizeSolNet(s);
        toast(r.ok ? { kind: 'good', text: 'Sol Net authorized.' } : { kind: 'bad', text: r.msg || 'Contract is not ready.' });
        break;
      }
      case 'openOps': ui.setTab('ops'); break;
      case 'openPledges': ui.setTab('pledges'); break;
      case 'pinDock': ui.drawer.pin('dock'); break;
      case 'jumpSignals': {
        // jump to the most urgent beacon: threat > stranded > hail > board
        const rank = { threat: 0, stranded: 1, hail: 2, board: 3 };
        const list = (SW.signals ? SW.signals.list(s) : []).filter(function (x) { return rank[x.kind] !== undefined; });
        list.sort(function (a, b2) { return rank[a.kind] - rank[b2.kind]; });
        if (list.length) { ui.exitSystem(); SW.render.centerOn(list[0].sys); ui.beaconTap(list[0]); }
        break;
      }
    }
    ui.refresh();
  }

  // chosenOrigin lives in ui_modals (title screen owns it), but 'begin' dispatch needs it.
  // The title modal sets data-origin on cards; on begin we read the selected card from DOM.
  function chosenOriginFromModal() {
    const sel = document.querySelector('#titleModal .originCard.sel');
    return (sel && sel.dataset.origin) || 'courier';
  }
  function chosenFounderFromModal() {
    const sel = document.querySelector('#titleModal [data-founder].sel');
    return (sel && sel.dataset.founder) || 'courier';
  }

  function dispatchChange(e) {
    const t = e.target;
    if (t.id === 'dirComm') {
      ui.directiveForm.c = t.value;
    } else if (t.classList && t.classList.contains('draftAction')) {
      const i = parseInt(t.dataset.roleidx, 10);
      if (ui.routeDraft && ui.routeDraft[i]) { ui.routeDraft[i].action = t.value; renderDock(true); }
    } else if (t.classList && t.classList.contains('draftComm')) {
      const i = parseInt(t.dataset.cidx, 10);
      if (ui.routeDraft && ui.routeDraft[i]) { ui.routeDraft[i].c = t.value; SW.uiRoutes.updateProjection(); }
    }
  }

  function dispatchInput(e) {
    const t = e.target;
    if (t.id === 'dirTarget') {
      ui.directiveForm.target = parseInt(t.value, 10) || 60;
    }
  }

  function handleModalNavigation(e) {
    const modal = ui.activeModal();
    if (!modal) return false;
    const target = e.target || {};
    const radio = target.closest ? target.closest('[role="radio"]') : null;
    if (radio && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].indexOf(e.key) >= 0) {
      const group = radio.closest('[role="radiogroup"]');
      const radios = group && group.querySelectorAll ? Array.prototype.slice.call(group.querySelectorAll('[role="radio"]')) : [];
      if (radios.length) {
        let i = radios.indexOf(radio);
        if (e.key === 'Home') i = 0;
        else if (e.key === 'End') i = radios.length - 1;
        else i = (i + ((e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1) + radios.length) % radios.length;
        if (e.preventDefault) e.preventDefault();
        if (radios[i].click) radios[i].click();
        if (radios[i].focus) radios[i].focus();
        return true;
      }
    }
    if (e.key === 'Tab') {
      const selector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const controls = modal.querySelectorAll ? Array.prototype.slice.call(modal.querySelectorAll(selector)).filter(function (el) {
        return !el.classList || !el.classList.contains('hidden');
      }) : [];
      if (!controls.length) {
        if (e.preventDefault) e.preventDefault();
        if (modal.focus) modal.focus();
        return true;
      }
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { if (e.preventDefault) e.preventDefault(); if (last.focus) last.focus(); return true; }
      if (!e.shiftKey && document.activeElement === last) { if (e.preventDefault) e.preventDefault(); if (first.focus) first.focus(); return true; }
    }
    return false;
  }

  function onKey(e) {
    if (SW.uiModals.simKeys(e, true)) { e.preventDefault(); return; }
    // Let Escape through even from a focused field so it always backs out;
    // every other shortcut yields to typing.
    if (ui.modalOpen()) {
      if (handleModalNavigation(e)) return;
      if (e.key === 'Escape') {
        const id = _activeModalId;
        if (id === 'titleModal' || id === 'eventModal' || id === 'gameoverModal') return;
        if (id === 'settingsModal' || id === 'helpModal' || id === 'codexModal' || id === 'importModal') ui.closeLeaf();
        else hideModals();
      }
      return; // gameplay shortcuts never fire through a modal
    }
    if ((e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') && e.key !== 'Escape') return;
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
      if (ui.boardFlyoutOpen()) { ui.closeBoardFlyout(); return; }
      if (ui.moreOpen()) { ui.toggleMore(false); return; }
      if (SW.uiTech && SW.uiTech.isOpen && SW.uiTech.isOpen()) { SW.uiTech.close(); return; }
      if (!$('#exchange').classList.contains('hidden')) { $('#exchange').classList.add('hidden'); return; }
      if (SW.render.mode === 'system') { ui.exitSystem(); return; }
      if (mapMode) { setMapMode(null); if (ui.editorOpen) { ui.editorOpen = false; ui.routeDraft = null; renderDock(true); } return; }
      // an unpinned dock drawer is the most recent summons — dismiss it next
      if (!ui.isTouch() && ui.drawer.isOpen('dock') && !ui.drawer.isPinned('dock')) { ui.drawer.close('dock'); return; }
      // Nothing pinned/selected left to clear, and we're in-game: open the pause
      // menu — the muscle-memory behavior players expect from Esc.
      if (SW.render.selectedShip === null && SW.render.selectedSys === null && !pinnedInfo) {
        if (st() && st().tick > 0 && !st().gameOver) { SW.uiModals.showMenu(); return; }
      }
      // Otherwise Esc clears the current selection/pin first.
      SW.render.selectedShip = null; SW.render.selectedSys = null; pinnedInfo = null; ui.refresh();
    }
    syncSpeedButtons();
  }

  return ui;
})();
