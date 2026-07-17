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
  let chosenFounder = 'courier';
  let sim = null, raidChoice = null;

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
    html += '<div class="choices" style="margin-top:10px"><button data-act="closeLeaf">close</button></div>';
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
    // Daily weave: bank the run's Weave Rating against today's best.
    if (s.daily && SW.ui.recordDaily) SW.ui.recordDaily(s.daily, go.score || 0);
    let html = '<h2>' + (go.win ? '<i>✦</i> THE WEAVE HOLDS' : '✕ THE WEAVE UNRAVELS') + '</h2>';
    html += '<div class="body">' + esc(go.reason) + '</div>';
    // The epitaph (focused runs) — the death is a chapter, not an error (SPEC[NAR-EPITAPH]).
    if (go.epitaph) {
      const e = go.epitaph;
      html += '<div class="body" style="opacity:.85;font-style:italic">“' + esc(e.line) + '”</div>';
      html += '<div class="statGrid">' +
        gr('Thread', esc(e.threadName)) +
        gr('Reached', 'Act ' + (SW.acts ? SW.acts.roman(e.act) : e.act) + (e.commission ? ' · ' + esc(e.commission) : '')) +
        gr('WEAVE woven', U.fmt(e.weave)) +
        gr('Acts kept', e.actsCleared || 0) +
        (e.boons && e.boons.length ? gr('Boons drafted', e.boons.map(esc).join(' · ')) : '') +
        '</div>';
    }
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

  // ============ title — the front door ============
  // Two-stage: this landing is the "main menu" (logo + the four verbs); the
  // new-run setup form lives in showNewRun(). A returning player sees Continue
  // first and never has to scroll past config they don't want.
  function showTitle() {
    const modal = $('#titleModal');
    modal.classList.remove('setupModal');
    modal.classList.add('titleFront');
    const hasAuto = SW.game.hasSave('auto');
    const meta = SW.ui.saveMeta('auto');
    let html = '<div class="titleArt"><i>✦</i> STARWEFT</div>' +
      '<div class="tagline">The worlds drifted apart. You are the thread.</div>' +
      '<div class="titleBlurb">A cozy space-logistics strategy game — weave isolated star systems back into one living trade network, before the Scourge eats the galaxy from the rim.</div>';
    html += '<div class="frontMenu">';
    if (hasAuto) {
      html += '<button class="frontBtn primary" data-act="continueGame">' +
        '<span class="fbLabel">▸ Continue last weave</span>' +
        (meta ? '<span class="fbSub">' + esc(meta.name) + ' · cycle ' + meta.tick + ' · ' + U.fmt(meta.credits) + '¤</span>' : '') +
        '</button>';
    }
    html += '<button class="frontBtn' + (hasAuto ? '' : ' primary') + '" data-act="newRun"><span class="fbLabel">▸ New weave</span><span class="fbSub">choose your origin, doctrine, and galaxy</span></button>';
    html += '<button class="frontBtn" data-act="dailyWeave"><span class="fbLabel">▸ Daily weave</span><span class="fbSub">' + esc(dailySub()) + '</span></button>';
    html += '<button class="frontBtn" data-act="help"><span class="fbLabel">▸ How to play</span></button>';
    html += '<button class="frontBtn" data-act="settings"><span class="fbLabel">▸ Settings</span></button>';
    html += '<button class="frontBtn" data-act="codexFromTitle"><span class="fbLabel">▸ Codex &amp; lore</span></button>';
    html += '</div>';
    html += '<div class="titleFoot"><span>v' + (D.SAVE_VERSION || 1) + '.0</span><span class="dot">·</span>' +
      '<a id="buildLink" href="https://github.com/sub-surface/starweft" target="_blank" rel="noopener" title="The exact commit this build is running">build …</a>' +
      '<span class="dot">·</span><a href="https://star.subsurfaces.net" target="_blank" rel="noopener">star.subsurfaces.net</a></div>';
    modal.innerHTML = html;
    SW.ui.showModal('titleModal');
    fillBuildHash();
  }

  // Resolve the running build's commit and show its short SHA in the footer.
  // No build step exists, so we fetch the latest main commit at runtime (cached
  // for the session) and link it. Fails quietly to a static label offline.
  let _buildHash = null;
  function fillBuildHash() {
    const link = $('#buildLink');
    if (!link) return;
    if (_buildHash) { setBuild(link, _buildHash); return; }
    if (typeof fetch !== 'function') { link.textContent = 'github'; return; }
    fetch('https://api.github.com/repos/sub-surface/starweft/commits/main', { headers: { 'Accept': 'application/vnd.github.sha' } })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (sha) {
        if (!sha) { link.textContent = 'github'; return; }
        _buildHash = sha.trim().slice(0, 7);
        // Re-grab the link in case the title re-rendered while the fetch was in flight.
        const l2 = $('#buildLink'); if (l2) setBuild(l2, _buildHash);
      })
      .catch(function () { const l = $('#buildLink'); if (l) l.textContent = 'github'; });
  }
  function setBuild(link, sha) {
    link.textContent = 'build ' + sha;
    link.href = 'https://github.com/sub-surface/starweft/commit/' + sha;
  }

  // ============ daily weave — a deterministic shared galaxy per day ============
  // The date string is the seed (date comes from the UI clock, never sim code).
  // Same day → same galaxy + same conditions for everyone. Score = Weave Rating.
  function todayKey() {
    try { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    catch (e) { return '2026-01-01'; }
  }
  function dailyConfig(dateKey) {
    const key = dateKey || todayKey();
    const h = U.seedFrom('daily-' + key);
    // Derive everything from the date hash so it's identical for all players.
    const diffs = ['standard', 'standard', 'brutal'];
    const dens = Object.keys(D.WORLD.density);
    const weas = Object.keys(D.WORLD.wealth);
    const ages = Object.keys(D.WORLD.age);
    const topos = Object.keys(D.WORLD.topology);
    const hearts = Object.keys(D.HEART);
    const myths = D.MYTH_ORDER.slice();
    const pool = D.CONDITION_ORDER.slice();
    // pick two distinct conditions deterministically. Use unsigned shifts —
    // the hash exceeds 2^31, so signed >> would go negative and break indexing.
    const i1 = h % pool.length;
    const i2 = (h >>> 5) % pool.length;
    const conds = i1 === i2 ? [pool[i1]] : [pool[i1], pool[i2]];
    return {
      seed: 'daily-' + key,
      difficulty: diffs[(h >>> 3) % diffs.length],
      world: {
        density: dens[(h >>> 7) % dens.length], wealth: weas[(h >>> 9) % weas.length],
        age: ages[(h >>> 11) % ages.length], topology: topos[(h >>> 13) % topos.length], heart: hearts[(h >>> 15) % hearts.length],
      },
      conditions: conds,
      tutorial: false,
      daily: key,
      identity: { name: 'Daily Weft ' + key, motto: 'One galaxy, one day.', hue: 195, sigil: h % 1000, myth: myths[(h >>> 17) % myths.length] },
    };
  }
  function dailySub() {
    const cfg = dailyConfig();
    const names = cfg.conditions.map(function (c) { return D.CONDITIONS[c] ? D.CONDITIONS[c].glyph : ''; }).join(' ');
    return 'today: ' + cfg.daily + ' · ' + names + ' · everyone, same galaxy';
  }
  function showDailyBrief() {
    const cfg = dailyConfig();
    const best = SW.ui.dailyBest ? SW.ui.dailyBest(cfg.daily) : null;
    const modal = $('#confirmModal');
    let html = '<h2><i>✦</i> DAILY WEAVE</h2>';
    html += '<div class="sub" style="margin-bottom:6px">' + esc(cfg.daily) + ' — the same galaxy and conditions for every weaver today. Your best Weave Rating is your score.</div>';
    html += '<div class="dailySpec">' +
      '<div><b>Difficulty</b> ' + esc(D.DIFFICULTY[cfg.difficulty].name) + '</div>' +
      '<div><b>World</b> ' + esc(D.WORLD.density[cfg.world.density].name.split(' —')[0]) + ' · ' + esc(D.WORLD.wealth[cfg.world.wealth].name.split(' —')[0]) + '</div>' +
      '<div><b>Conditions</b> ' + cfg.conditions.map(function (c) { return D.CONDITIONS[c].glyph + ' ' + esc(D.CONDITIONS[c].name); }).join(' · ') + '</div>' +
      (best ? '<div><b>Your best today</b> ' + U.fmt(best) + '</div>' : '') +
      '</div>';
    html += '<div class="choices" style="flex-direction:row;gap:8px;margin-top:12px">' +
      '<button class="primary grow" data-act="beginDaily">weave it ▸</button>' +
      '<button data-act="backToTitle">back</button></div>';
    modal.innerHTML = html;
    SW.ui.showModal('confirmModal');
  }

  // ============ new-run setup — identity / origins / galaxy ============
  // new-run selections that aren't plain form fields
  let chosenThreat = 'inherit';
  let chosenLean = '';
  let chosenConditions = {};   // id -> true
  let chosenMyth = 'none';

  // Build the inline kit summary for an origin (ships, credits, tech, hooks).
  function originKit(def) {
    const bits = [];
    const ships = (def.ships || ['sparrow']).map(function (h) {
      const hu = D.HULLS[h]; return (hu ? hu.glyph + ' ' + hu.name : h);
    });
    bits.push(ships.join(' + '));
    const c = def.credits || 0;
    if (c) bits.push((c > 0 ? '+' : '') + c + '¤');
    if (def.techs && def.techs.length) bits.push(def.techs.map(function (t) { return D.TECHS[t] ? D.TECHS[t].name.replace('Doctrine: ', '') : t; }).join(', '));
    const hooks = [];
    if (def.scourgeEarlier) hooks.push('Scourge stirs early');
    if (def.startReach) hooks.push('starts in the Reach · black markets');
    if (def.surveyBonus) hooks.push('+surveys');
    if (def.infamy) hooks.push('infamy ' + def.infamy);
    return { kit: bits.join(' · '), hooks: hooks };
  }

  // A plain-language forecast of the current galaxy dials.
  function forecastLine() {
    const diff = D.DIFFICULTY[$('#ngDiff') ? $('#ngDiff').value : 'standard'] || D.DIFFICULTY.standard;
    const den = D.WORLD.density[$('#ngDen') ? $('#ngDen').value : 'standard'] || D.WORLD.density.standard;
    const wea = D.WORLD.wealth[$('#ngWea') ? $('#ngWea').value : 'standard'] || D.WORLD.wealth.standard;
    const ageK = $('#ngAge') ? $('#ngAge').value : 'settled';
    const heartK = $('#ngHeart') ? $('#ngHeart').value : 'home';
    const thr = D.THREAT[chosenThreat] || {};
    let startAt = thr.scourgeStart !== undefined ? thr.scourgeStart : diff.scourgeStart;
    const wake = startAt < 0 ? 'the Scourge never wakes' : 'the Scourge wakes ~cycle ' + startAt;
    const wealthWord = wea.mult >= 1.4 ? 'fat markets' : wea.mult <= 0.6 ? 'lean markets' : 'balanced markets';
    const skyWord = den.sysCount >= 320 ? 'close skies' : den.sysCount <= 200 ? 'a long dark' : 'open skies';
    const ageWord = ageK === 'young' ? 'a young galaxy, well-charted' : ageK === 'ancient' ? 'an ancient dark, all but forgotten' : 'a settled galaxy';
    const heartWord = heartK === 'rim' ? 'you wake on the far rim' : heartK === 'drift' ? 'you wake adrift, homeless' : 'you wake at the Old Orchard';
    return den.sysCount + ' systems · ' + ageWord + ' · ' + wealthWord + ' · ' + skyWord + ' · ' + heartWord + ' · ' + wake + '.';
  }

  // A collapsible section header. `open` sets the initial state; `count`, when
  // > 0, shows a small badge (used by Weave conditions to show how many stack).
  // Toggling is wired generically after render via [data-fold].
  function foldHead(key, title, subtitle, open, count) {
    return '<h4 class="foldHead' + (open ? ' open' : '') + '" data-fold="' + key + '">' +
      '<span class="foldCaret">' + (open ? '▾' : '▸') + '</span>' + esc(title) +
      (count ? '<span class="foldCount" data-fold-count="' + key + '">' + count + '</span>' : '<span class="foldCount hidden" data-fold-count="' + key + '"></span>') +
      (subtitle ? '<span class="h4sub">— ' + esc(subtitle) + '</span>' : '') + '</h4>';
  }

  function showNewRun() {
    const modal = $('#titleModal');
    modal.classList.remove('titleFront');
    modal.classList.add('setupModal');
    SW.ui._sigilSeed = Math.floor(Math.random() * 1000);
    let html = '<div class="setupHead"><button class="backLink" data-act="backToTitle">‹ back</button>' +
      '<div class="titleArt" style="font-size:20px;letter-spacing:5px">NEW WEAVE</div>' +
      '<button class="surpriseBtn" data-act="surpriseWeave" title="Roll a fresh galaxy, doctrine and myth — then tweak to taste">✦ surprise me</button></div>';

    // Prologue toggle — promoted to the top as a proper switch card. It's the
    // single most consequential choice (guided wake at home vs. dropped cold),
    // so it leads. Default on for first-timers, off once completed.
    const prologueDone = !!SW.game.legacy().prologue;
    const prologueOn = !prologueDone;
    html += '<label class="prologueToggle' + (prologueOn ? ' on' : '') + '" id="prologueCard">' +
      '<input type="checkbox" id="ngTut"' + (prologueOn ? ' checked' : '') + '>' +
      '<span class="ptMark">' + (prologueOn ? '◉' : '○') + '</span>' +
      '<span class="ptText"><span class="ptName">Sol Prologue' +
      (prologueDone ? ' <span class="ptDone">✓ completed</span>' : '') + '</span>' +
      '<span class="ptDesc">Wake at home in the Sol system and learn the one verb that runs everything. ' +
      (prologueDone ? 'Replay the guided opening, or skip straight to the open galaxy.' : 'Recommended for your first weave.') +
      '</span></span></label>';

    // Run shape — the roguelike frame. Focused = the Act Ladder (quotas, a
    // clock, bank-or-push, permadeath). Long Weave = the open sandbox. Default
    // Focused: the game is a roguelike now, but the sandbox is one click away.
    html += '<label class="prologueToggle on" id="shapeCard">' +
      '<input type="checkbox" id="ngShape" checked>' +
      '<span class="ptMark">◈</span>' +
      '<span class="ptText"><span class="ptName">Focused run — the Act Ladder</span>' +
      '<span class="ptDesc">Guild Charters with a WEAVE quota and a clock. Meet it, then bank or push for a harder, richer act. Permadeath: Cut, Burned, or Eaten. Unchecked = the open Long Weave sandbox, no clock.</span></span></label>';

    // Two-column body: left = who you are (Identity + Origin), right = the
    // galaxy you're dropped into. Forecast + actions live in a sticky footer.
    html += '<div class="setupCols"><div class="setupCol">';

    // Identity
    html += '<h4>Identity</h4>';
    html += '<div class="row"><canvas id="sigilPreview" width="64" height="64" style="border:1px solid var(--line)"></canvas>' +
      '<div style="flex:1"><div class="row"><input id="idName" placeholder="network name" value="The Provisional Weft" style="flex:1">' +
      '<button data-act="rerollName" title="New network name">↻</button></div>' +
      '<div class="row"><input id="idMotto" placeholder="motto" value="Finish the round." style="flex:1"></div>' +
      '<div class="row"><span class="sub">hue</span><input id="idHue" type="range" min="0" max="359" value="195" style="flex:1">' +
      '<button data-act="rerollSigil" title="New sigil">↻</button></div></div></div>';
    // Founding Myth — one line of lore. Flavor only; tints the opening ticker.
    html += '<div class="row"><span class="sub" style="width:70px">myth</span><select id="ngMyth" data-myth style="flex:1">' +
      D.MYTH_ORDER.map(function (id) {
        return '<option value="' + id + '"' + (id === chosenMyth ? ' selected' : '') + '>' + esc(D.MYTHS[id].name) + '</option>';
      }).join('') + '</select></div>';
    html += '<div class="mythLine" id="ngMythLine">' + esc((D.MYTHS[chosenMyth] && D.MYTHS[chosenMyth].line) || '') + '</div>';

    // Origin — rich cards
    html += '<h4>Origin</h4>';
    for (const o in D.ORIGINS) {
      const def = D.ORIGINS[o];
      const unlocked = SW.game.originUnlocked(o);
      if (unlocked) {
        const k = originKit(def);
        html += '<div class="originCard rich' + (chosenOrigin === o ? ' sel' : '') + '" data-origin="' + o + '">' +
          '<div style="flex:1"><div class="oname">' + esc(def.name) + '</div>' +
          '<div class="sub">' + esc(def.desc) + '</div>' +
          '<div class="oKit">' + esc(k.kit) + '</div>' +
          (k.hooks.length ? '<div class="oHooks">' + k.hooks.map(function (h) { return '<span class="oHook">' + esc(h) + '</span>'; }).join('') + '</div>' : '') +
          '</div></div>';
      } else {
        html += '<div class="originCard rich lock" data-origin="">' +
          '<div style="flex:1"><div class="oname">' + esc(def.name) + ' <span class="lockTag">⊘ locked</span></div>' +
          '<div class="sub">' + esc(unlockGoal(def)) + '</div></div></div>';
      }
    }

    // Founder (SPEC[RUN-FOUNDERS]) — who the Guild seats at the Loomship's helm for a
    // Focused run. Orthogonal to Origin: one rule-bend, one liability, one
    // lore line. Only matters if the Focused toggle above is checked; shown
    // unconditionally (like Origin) rather than wired to that toggle live —
    // newGame ignores opts.founder entirely for a Long Weave run either way.
    html += '<h4 data-info="ui:founders">Founder</h4>';
    for (const fid of D.FOUNDER_IDS) {
      const def = D.FOUNDERS[fid];
      html += '<div class="originCard rich' + (chosenFounder === fid ? ' sel' : '') + '" data-founder="' + fid + '">' +
        '<div style="flex:1"><div class="oname">' + esc(def.name) + '</div>' +
        '<div class="sub">' + esc(def.bend) + '</div>' +
        '<div class="oHooks"><span class="oHook">' + esc(def.liability) + '</span></div>' +
        '</div></div>';
    }

    // ---- right column: the galaxy ----
    html += '</div><div class="setupCol">';

    // Galaxy dials — one aligned label|control grid so the whole column reads
    // as a tidy form instead of ragged wrapping rows. dialRow() emits one cell
    // pair; the .dialGrid CSS keeps every control flush and full-width.
    function opts(table, selected, fmt) {
      return Object.keys(table).map(function (k) {
        return '<option value="' + k + '"' + (k === selected ? ' selected' : '') + '>' + (fmt ? fmt(k, table[k]) : table[k].name) + '</option>';
      }).join('');
    }
    // Hover help for each dial. Native title= tooltips — the in-game infobox
    // HUD doesn't exist behind this pre-game modal, so title is the right tool.
    // Each tip leads with what the dial *is*, then how its values read, drawn
    // from the data tables so they can't drift out of sync.
    function tableTip(lead, table) {
      const vals = Object.keys(table).map(function (k) {
        const v = table[k]; return v.name.split(' —')[0] + (v.desc ? ': ' + v.desc : '');
      });
      return lead + '\n\n' + vals.join('\n');
    }
    const tips = {
      difficulty: tableTip('Starting economy and the Scourge\'s base clock.', D.DIFFICULTY),
      systems: tableTip('How many star systems, and how far apart — travel time is your scarcest resource.', D.WORLD.density),
      markets: tableTip('Galaxy-wide wealth: how fat the markets are. Lean markets are the purest "you are the thread" feel.', D.WORLD.wealth),
      age: tableTip('The Sundering — how long ago the worlds drifted apart. Tints how charted you start and how much old wealth lies buried.', D.WORLD.age),
      pattern: tableTip('How the stars cluster. Shapes how the map feels to cross — not its size.', D.WORLD.topology),
      heart: tableTip('Where you wake. Decoupled from your origin.', D.HEART),
      threat: tableTip('The Scourge clock, decoupled from difficulty. A relaxed economy can still face a scary reckoning.', D.THREAT),
    };
    function dialRow(label, control, tipKey) {
      const lab = tips[tipKey] ? '<span class="dialHelp" title="' + esc(tips[tipKey]) + '">' + label + '</span>' : label;
      return '<div class="dialLabel">' + lab + '</div><div class="dialCtrl">' + control + '</div>';
    }
    html += '<h4>Galaxy</h4>';
    html += '<div class="dialGrid">';
    html += dialRow('difficulty', '<select id="ngDiff" data-forecast>' + opts(D.DIFFICULTY, 'standard', function (k, v) { return v.name + ' — ' + v.desc; }) + '</select>', 'difficulty');
    html += dialRow('systems', '<select id="ngDen" data-forecast>' + opts(D.WORLD.density, 'standard') + '</select>', 'systems');
    html += dialRow('markets', '<select id="ngWea" data-forecast>' + opts(D.WORLD.wealth, 'standard') + '</select>', 'markets');
    html += dialRow('age', '<select id="ngAge" data-forecast>' + opts(D.WORLD.age, 'settled') + '</select>', 'age');
    html += dialRow('pattern', '<select id="ngTopo" data-forecast>' + opts(D.WORLD.topology, 'natural') + '</select>', 'pattern');
    html += dialRow('the heart', '<select id="ngHeart" data-forecast>' + opts(D.HEART, 'home') + '</select>', 'heart');
    html += dialRow('threat', '<select id="ngThreat" data-forecast>' + opts(D.THREAT, chosenThreat, function (k, v) { return v.name + ' — ' + v.desc; }) + '</select>', 'threat');
    html += '</div>';

    // (Live forecast now lives in the sticky footer below.)

    // Doctrine lean + aptitude — collapsible (optional, decided out there)
    html += foldHead('inclination', 'Inclination', 'optional leanings, decided fully out there', false);
    html += '<div class="foldBody hidden" data-fold-body="inclination"><div class="dialGrid">';
    html += dialRow('doctrine', '<select id="ngLean"><option value="">— decide out there —</option>' +
      Object.keys(D.DOCTRINE_DISCOUNT).map(function (id) {
        return '<option value="' + id + '"' + (id === chosenLean ? ' selected' : '') + '>' + D.TECHS[id].name.replace('Doctrine: ', '') + ' — ' + D.TECHS[id].desc + '</option>';
      }).join('') + '</select>');
    html += dialRow('aptitude', '<select id="ngApt"><option value="">— undecided (find yourself out there) —</option>' +
      Object.keys(D.PERKS).filter(function (id) { return !D.PERKS[id].req; }).map(function (id) {
        const p = D.PERKS[id];
        return '<option value="' + id + '">' + p.icon + ' ' + p.name + ' — ' + p.desc + '</option>';
      }).join('') + '</select>');
    html += '</div></div>';

    // Weave conditions — collapsible; count badge shows how many are stacked.
    const condCount = Object.keys(chosenConditions).filter(function (k) { return chosenConditions[k]; }).length;
    html += foldHead('conditions', 'Weave conditions', 'optional spice, stack freely', false, condCount);
    html += '<div class="foldBody hidden" data-fold-body="conditions"><div class="condGrid">';
    for (const cid of D.CONDITION_ORDER) {
      const c = D.CONDITIONS[cid];
      const on = !!chosenConditions[cid];
      html += '<div class="condCard k-' + c.kind + (on ? ' on' : '') + '" data-cond="' + cid + '">' +
        '<div class="condTop"><span class="condGlyph">' + c.glyph + '</span><span class="condName">' + esc(c.name) + '</span>' +
        '<span class="condMark">' + (on ? '◉' : '○') + '</span></div>' +
        '<div class="condDesc">' + esc(c.desc) + '</div></div>';
    }
    html += '</div></div>';

    // Seed (prologue toggle now lives at the top of the panel)
    html += '<div class="dialGrid"><div class="dialLabel">seed</div><div class="dialCtrl"><input id="ngSeed" placeholder="random"></div></div>';

    // close right column + columns wrapper
    html += '</div></div>';

    // Sticky footer: the live forecast (the payoff line) stays in view while
    // you tune dials, with the begin/back actions pinned beside it.
    html += '<div class="setupFoot">' +
      '<div class="forecast" id="ngForecast">' + esc(forecastLine()) + '</div>' +
      '<div class="setupActions">' +
      '<button data-act="backToTitle">back</button>' +
      '<button class="primary grow" data-act="begin">begin weaving ▸</button>' +
      '</div></div>';
    modal.innerHTML = html;

    // wire origin selection
    modal.querySelectorAll('[data-origin]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (!el.dataset.origin) return;
        chosenOrigin = el.dataset.origin;
        modal.querySelectorAll('.originCard').forEach(function (x) { x.classList.toggle('sel', x === el); });
      });
    });
    // wire founder selection
    modal.querySelectorAll('[data-founder]').forEach(function (el) {
      el.addEventListener('click', function () {
        chosenFounder = el.dataset.founder;
        modal.querySelectorAll('[data-founder]').forEach(function (x) { x.classList.toggle('sel', x === el); });
      });
    });
    // collapsible section headers (Inclination, Weave conditions)
    modal.querySelectorAll('[data-fold]').forEach(function (h) {
      h.addEventListener('click', function () {
        const key = h.dataset.fold;
        const open = h.classList.toggle('open');
        const body = modal.querySelector('[data-fold-body="' + key + '"]');
        if (body) body.classList.toggle('hidden', !open);
        const caret = h.querySelector('.foldCaret'); if (caret) caret.textContent = open ? '▾' : '▸';
      });
    });
    function updateCondCount() {
      const n = Object.keys(chosenConditions).filter(function (k) { return chosenConditions[k]; }).length;
      const badge = modal.querySelector('[data-fold-count="conditions"]');
      if (badge) { badge.textContent = n ? n : ''; badge.classList.toggle('hidden', !n); }
    }
    // wire condition toggles
    modal.querySelectorAll('[data-cond]').forEach(function (el) {
      el.addEventListener('click', function () {
        const id = el.dataset.cond;
        chosenConditions[id] = !chosenConditions[id];
        el.classList.toggle('on', !!chosenConditions[id]);
        const mark = el.querySelector('.condMark'); if (mark) mark.textContent = chosenConditions[id] ? '◉' : '○';
        updateCondCount();
      });
    });
    // founding myth: remember the pick and show its line live
    const mythSel = $('#ngMyth');
    if (mythSel) {
      mythSel.addEventListener('change', function () {
        chosenMyth = mythSel.value;
        const l = $('#ngMythLine'); if (l) l.textContent = (D.MYTHS[chosenMyth] && D.MYTHS[chosenMyth].line) || '';
      });
    }
    // prologue switch: keep the card's .on state + mark glyph in sync
    const ptBox = $('#ngTut'), ptCard = $('#prologueCard');
    if (ptBox && ptCard) {
      ptBox.addEventListener('change', function () {
        ptCard.classList.toggle('on', ptBox.checked);
        const m = ptCard.querySelector('.ptMark'); if (m) m.textContent = ptBox.checked ? '◉' : '○';
      });
    }
    // live forecast on any galaxy/threat change
    modal.querySelectorAll('[data-forecast]').forEach(function (el) {
      el.addEventListener('change', function () {
        if (el.id === 'ngThreat') chosenThreat = el.value;
        const f = $('#ngForecast'); if (f) f.textContent = forecastLine();
      });
    });
    SW.ui.showModal('titleModal');
    if (SW.ui.paintSigil) SW.ui.paintSigil();
  }

  // Read the selected weave conditions (called by the 'begin' dispatch).
  m.selectedConditions = function () {
    return Object.keys(chosenConditions).filter(function (k) { return chosenConditions[k]; });
  };
  m.selectedThreat = function () { return chosenThreat; };
  m.selectedLean = function () { const el = $('#ngLean'); return (el && el.value) || ''; };

  // A network name + motto generator for the Identity reroll button. Pre-game,
  // so it uses Math.random (UI only — never the sim RNG). Two evocative parts
  // stitched into a "The <Adjective> <Noun>" that reads like a trade house.
  const NAME_A = ['Provisional', 'Patient', 'Far-Threaded', 'Quiet', 'Severed', 'Gilded', 'Long', 'Errant', 'Tidal', 'Hollow', 'Bright', 'Unbroken', 'Drifting', 'Lantern', 'Salt'];
  const NAME_B = ['Weft', 'Thread', 'Loom', 'Ferry', 'Reach', 'Caravan', 'Concord', 'Span', 'Skein', 'Passage', 'Line', 'Hand', 'Compact', 'Tide', 'Knot'];
  const MOTTOS = ['Finish the round.', 'One galaxy, one thread.', 'We carry what others won\'t.', 'No world left dark.', 'The long way is the only way.', 'Spin it back together.', 'Late is still arrival.', 'Profit, then mercy.'];
  function pickR(a) { return a[Math.floor(Math.random() * a.length)]; }
  m.rerollName = function () {
    const name = 'The ' + pickR(NAME_A) + ' ' + pickR(NAME_B);
    const nEl = $('#idName'); if (nEl) nEl.value = name;
    // motto rerolls alongside the name ~half the time, so it stays a surprise
    if (Math.random() < 0.5) { const mEl = $('#idMotto'); if (mEl) mEl.value = pickR(MOTTOS); }
  };

  // "Surprise me": roll every dial to a random-but-valid value, a fresh myth,
  // name, motto and sigil — then the player tweaks to taste. Sets the form
  // controls directly and refreshes the dependent UI (forecast, myth line,
  // condition badge). Conditions are left untouched (they're deliberate spice).
  m.surpriseWeave = function () {
    function setSel(id, keys) { const el = $('#' + id); if (el) el.value = keys[Math.floor(Math.random() * keys.length)]; }
    setSel('ngDiff', Object.keys(D.DIFFICULTY));
    setSel('ngDen', Object.keys(D.WORLD.density));
    setSel('ngWea', Object.keys(D.WORLD.wealth));
    setSel('ngAge', Object.keys(D.WORLD.age));
    setSel('ngTopo', Object.keys(D.WORLD.topology));
    setSel('ngHeart', Object.keys(D.HEART));
    const threats = Object.keys(D.THREAT); chosenThreat = threats[Math.floor(Math.random() * threats.length)];
    const tEl = $('#ngThreat'); if (tEl) tEl.value = chosenThreat;
    chosenMyth = D.MYTH_ORDER[Math.floor(Math.random() * D.MYTH_ORDER.length)];
    const myEl = $('#ngMyth'); if (myEl) myEl.value = chosenMyth;
    const ml = $('#ngMythLine'); if (ml) ml.textContent = (D.MYTHS[chosenMyth] && D.MYTHS[chosenMyth].line) || '';
    m.rerollName();
    SW.ui._sigilSeed = Math.floor(Math.random() * 100000);
    const f = $('#ngForecast'); if (f) f.textContent = forecastLine();
  };

  // Turn a locked origin's unlock condition into an aspirational goal line.
  function unlockGoal(def) {
    const map = { won: 'Win a run to unlock.', wonder: 'Discover a stellar wonder to unlock.', infamy: 'Reach infamy 5 (go pirate) to unlock.' };
    return map[def.locked] || ('Locked — ' + (D.LEGACY_HINTS[def.locked] || 'keep weaving'));
  }

  // ============ pause menu — grouped, prod-ready ============
  // Resume sits first (the common case). Destructive actions are visually set
  // apart and confirm before acting. The dev/feature panel is NOT here — it is
  // gated behind ?dev (see SW.ui.devEnabled).
  function showMenu() {
    const modal = $('#menuModal');
    const hasManual = SW.game.hasSave('manual');
    let html = '<h2>PAUSED</h2>';
    html += '<div class="menuGroup">' +
      '<button class="frontBtn primary" data-act="closeModal"><span class="fbLabel">▸ Resume</span><span class="fbSub"><span class="kbd">Esc</span> or <span class="kbd">Space</span></span></button>' +
      '</div>';
    html += '<div class="menuGroup">' +
      '<button class="frontBtn" data-act="saveManual"><span class="fbLabel">Save run</span></button>' +
      '<button class="frontBtn" data-act="loadManual"' + (hasManual ? '' : ' disabled') + '><span class="fbLabel">Load run</span>' + (hasManual ? '<span class="fbSub">' + savedLabel('manual') + '</span>' : '<span class="fbSub">no manual save yet</span>') + '</button>' +
      '<button class="frontBtn" data-act="exportSave"><span class="fbLabel">Export save</span><span class="fbSub">copy to clipboard</span></button>' +
      '<button class="frontBtn" data-act="importSave"><span class="fbLabel">Import save</span></button>' +
      '</div>';
    html += '<div class="menuGroup">' +
      '<button class="frontBtn" data-act="settings"><span class="fbLabel">Settings</span></button>' +
      '<button class="frontBtn" data-act="help"><span class="fbLabel">How to play</span></button>' +
      (SW.ui.devEnabled && SW.ui.devEnabled() ? '<button class="frontBtn" data-act="cheats"><span class="fbLabel">Dev / feature check</span><span class="fbSub">developer tools</span></button>' : '') +
      '</div>';
    html += '<div class="menuGroup">' +
      '<button class="frontBtn danger" data-act="quitToMenu"><span class="fbLabel">Quit to main menu</span><span class="fbSub">your run is autosaved</span></button>' +
      '</div>';
    modal.innerHTML = html;
    SW.ui.showModal('menuModal');
  }

  function savedLabel(slot) {
    const meta = SW.ui.saveMeta(slot);
    if (!meta) return '';
    return esc(meta.name) + ' · cycle ' + meta.tick + (meta.when ? ' · ' + meta.when : '');
  }

  // ============ settings ============
  function showSettings() {
    const modal = $('#settingsModal');
    const p = SW.ui.prefs();
    function row(act, on, label, sub) {
      return '<button class="frontBtn toggleBtn" data-act="' + act + '"><span class="fbLabel">' + label +
        '<span class="toggleState">' + (on ? '◉ on' : '○ off') + '</span></span>' +
        (sub ? '<span class="fbSub">' + sub + '</span>' : '') + '</button>';
    }
    let html = '<h2><i>⚙</i> SETTINGS</h2><div class="menuGroup">';
    html += row('setSfx', !SW.audio.muted, 'Sound effects', 'market chimes, ship clicks, raids');
    html += row('setMusic', !SW.audio.musicMuted, 'Ambient music', 'the slow drift between the stars');
    html += row('setReduceMotion', !!p.reduceMotion, 'Reduce motion', 'calmer camera, skip the boot crawl');
    html += row('setBootSkip', !!p.skipBoot, 'Skip boot sequence', 'jump straight to the menu next visit');
    html += '</div><div class="menuGroup">';
    html += '<div class="setRow"><span class="fbLabel grow">Default speed</span><span class="segGroup">' +
      [['1', '▶', 1], ['2', '▶▶', 3], ['3', '▶▶▶', 10]].map(function (sp) {
        return '<button class="seg' + (p.defaultSpeed === sp[2] ? ' on' : '') + '" data-act="setDefaultSpeed" data-spd="' + sp[2] + '" title="speed ' + sp[0] + '">' + sp[1] + '</button>';
      }).join('') + '</span></div>';
    html += '</div>';
    html += '<div class="menuGroup"><div class="sub" style="line-height:1.5">Settings save to this browser. Game progress autosaves separately and survives a refresh.</div></div>';
    html += '<div class="choices" style="margin-top:10px"><button class="primary" data-act="closeSettings">done</button></div>';
    modal.innerHTML = html;
    SW.ui.showModal('settingsModal');
  }

  // ============ import save (textarea modal, not a raw prompt) ============
  function showImport() {
    const modal = $('#importModal');
    modal.innerHTML = '<h2>IMPORT SAVE</h2>' +
      '<div class="sub" style="margin-bottom:8px">Paste a save you exported earlier. This replaces your current run.</div>' +
      '<textarea id="importBox" class="importBox" placeholder="paste exported save here…" spellcheck="false"></textarea>' +
      '<div class="choices" style="margin-top:10px;flex-direction:row;gap:8px">' +
      '<button class="primary grow" data-act="confirmImport">load this save</button>' +
      '<button data-act="closeLeaf">cancel</button></div>';
    SW.ui.showModal('importModal');
    const box = document.getElementById('importBox');
    if (box && box.focus) box.focus();
  }

  // ============ generic confirm ============
  // SW.ui.confirm(text, onYes, opts) routes here. Keeps destructive actions one
  // deliberate click away from a benign one.
  let _confirmYes = null;
  function showConfirm(opts) {
    _confirmYes = opts.onYes || null;
    const modal = $('#confirmModal');
    modal.innerHTML = '<h2>' + esc(opts.title || 'Are you sure?') + '</h2>' +
      '<div class="body">' + esc(opts.text || '') + '</div>' +
      '<div class="choices" style="flex-direction:row;gap:8px">' +
      '<button class="' + (opts.danger ? 'danger' : 'primary') + ' grow" data-act="confirmYes">' + esc(opts.yes || 'Yes') + '</button>' +
      '<button data-act="closeModal">' + esc(opts.no || 'Cancel') + '</button></div>';
    SW.ui.showModal('confirmModal');
  }
  function runConfirm() {
    const fn = _confirmYes;
    _confirmYes = null;
    SW.ui.hideModals();
    if (fn) fn();
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
      '<b>Lost?</b> The <b>◈ objective bar</b> along the bottom always names your next step. The <b>Journal</b> tab (in the dock) holds your contracts, signals, and run log — open it any time you\'re unsure what to do. You are never truly stranded: lose your last ship and a salvage advance will let you rebuild at home.\n\n' +
      '<span class="kbd">Space</span> pause · <span class="kbd">1/2/3</span> speed · <span class="kbd">Esc</span> back, then the pause menu · <span class="kbd">F</span> center · the infobox (bottom-left) explains whatever you hover.</div>' +
      '<div class="choices"><button class="primary" data-act="closeLeaf">got it</button></div>';
    SW.ui.showModal('helpModal');
  }

  // ============ tactical simulacrum (manual combat) ============
  // A timed lane-defense engagement. Performance bends the raid odds by up to
  // ±25% (clamped in the sim) — skill is an edge, never a guarantee. The
  // AUTO-RESOLVE button keeps the stats-only path for players who'd rather not.
  function openRaidChoice(ship, sys) {
    const s = st();
    if (!s || !ship || !sys) return;
    const power = SW.combat.power(s, ship);
    let defense = 3 + (sys.pop || 0) * 0.15 + SW.combat.patrolPower(s, sys.region);
    if (sys.ideology === 'vigil') defense += 6;
    raidChoice = { ship: ship, sys: sys, wasPaused: s.paused };
    $('#combatSim').innerHTML = '<div class="modalCard"><h3>RAID PLAN</h3>' +
      '<div class="sub">' + esc(ship.name) + ' (pwr ' + power + ') vs ' + esc(sys.name) + ' (def ~' + Math.round(defense) + ')</div>' +
      '<p class="sub">The Simulacrum sketches patrol lanterns, decoy manifests, and one very nervous customs clerk.</p>' +
      '<div class="choices"><button class="primary" data-act="simManual">MANUAL BREACH</button>' +
      '<button data-act="simAuto">AUTO-RESOLVE</button><button class="danger" data-act="simAbort">ABORT</button></div></div>';
    SW.ui.showModal('combatSim');
  }

  function beginRaidManual() {
    const w = raidChoice;
    raidChoice = null;
    if (!w) return;
    openCombatSim(w.ship, w.sys);
  }

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
      '<div class="row"><span class="sub grow">←/→ or A/D to fly · guns are automatic · bright kites carry fat manifests</span>' +
      '<button data-act="simAuto">AUTO-RESOLVE</button><button class="danger" data-act="simAbort">ABORT</button></div></div>';
    SW.ui.showModal('combatSim');
    const cv = document.getElementById('simCanvas');
    const wasPaused = s.paused;
    s.paused = true;
    const total = Math.max(4, Math.min(24, Math.round(defense * 1.5)));
    const inv = [];
    for (let i = 0; i < total; i++) {
      inv.push({ x: 60 + (i % 8) * 52, y: 36 + Math.floor(i / 8) * 34, alive: true, ph: i * 0.7, prize: i % 7 === 3 });
    }
    sim = {
      ship: ship, sys: sys, cv: cv, wasPaused: wasPaused,
      px: 260, keys: {}, shots: [], bombs: [], inv: inv, total: total,
      hp: 3, lootPips: 0, t0: 0, lastShot: 0, lastBomb: 0, over: false,
      bombRate: Math.min(900, 280 + 4000 / Math.max(2, defense)),
    };
    requestAnimationFrame(simFrame);
  }
  function closeCombatSim(autoResolve) {
    const s = st();
    const wasSim = sim || raidChoice;
    SW.ui.hideModals();
    $('#combatSim').innerHTML = '';
    sim = null; raidChoice = null;
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
    SW.ui.hideModals();
    $('#combatSim').innerHTML = '';
    sim = null;
    if (s) {
      s.paused = w.wasPaused;
      const r = A().raid(s, w.ship.id, w.sys.id, edge);
      if (!r.ok) SW.ui.toast({ kind: 'bad', text: r.msg });
      else {
        SW.audio.sfx('raid');
        SW.ui.toast({ kind: 'info', text: '⌖ Simulacrum: ' + kills + '/' + w.total + ' cleared, ' + (w.lootPips || 0) + ' fat manifests tagged, hull ' + Math.max(0, w.hp) + '/3 — odds ' + (edge >= 0 ? '+' : '') + Math.round(edge * 100) + '%.' });
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
        if (Math.abs(sh.x - (i.x + i.dx)) < 14 && Math.abs(sh.y - i.y) < 12) { i.alive = false; if (i.prize) w.lootPips++; sh.y = -99; }
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
      c2.fillStyle = i.prize ? 'hsla(45,90%,72%,0.95)' : 'rgba(160,170,185,0.95)';
      c2.fillText(i.prize ? '◇' : '∆', i.x + i.dx - 6, i.y + 6);
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
  m.showNewRun = showNewRun;
  m.showDailyBrief = showDailyBrief;
  m.dailyConfig = dailyConfig;
  m.showMenu = showMenu;
  m.showSettings = showSettings;
  m.showImport = showImport;
  m.showConfirm = showConfirm;
  m.runConfirm = runConfirm;
  m.showCheats = showCheats;
  m.showHelp = showHelp;
  m.openRaidChoice = openRaidChoice;
  m.beginRaidManual = beginRaidManual;
  m.openCombatSim = openCombatSim;
  m.closeCombatSim = closeCombatSim;
  m.simKeys = simKeys;
  return m;
})();
