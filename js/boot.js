/* STARWEFT boot.js — power-on self-test that wakes into the fiction. Browser only.
   A hybrid TUI overlay: opens as a dry hardware POST, then the last lines slip
   diegetic as the Weave comes online. Shown once per session, fully skippable,
   honors prefers-reduced-motion. Self-contained: owns its own DOM layer and
   tears it down on completion. No sim state, no RNG dependency — purely cosmetic.

   Contract: SW.boot.play(onComplete) renders the sequence and calls onComplete
   exactly once when it finishes (or is skipped). In a headless/stub environment
   (no window.matchMedia) it short-circuits synchronously so the boot test still
   reaches the title screen deterministically. */
(function () {
  const SW = globalThis.SW || (globalThis.SW = {});
  const boot = SW.boot || (SW.boot = {});

  // Detect a real browser. The stub DOM in test/browser_boot.js has no matchMedia,
  // so this cleanly separates "animate" from "headless: skip straight to done".
  function isRealBrowser() {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      typeof document !== 'undefined' &&
      typeof document.createElement === 'function';
  }

  function prefersReducedMotion() {
    try {
      // Player setting wins, then the OS-level media query.
      const prefs = JSON.parse(localStorage.getItem('starweft_prefs') || '{}');
      if (prefs && (prefs.reduceMotion || prefs.skipBoot)) return true;
    } catch (e) {}
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  // Once per browser session. sessionStorage clears on tab close, so a refresh
  // mid-session won't re-run the whole crawl, but a fresh visit always will.
  const SEEN_KEY = 'sw_boot_seen';
  function alreadySeen() {
    try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
  }

  // ---- the wordmark, drawn line by line as the loom "threads" it ----
  const LOGO = [
    '   ___ _____ _    ___ _    _ ___ ___ _____ ',
    '  / __|_   _/_\\  | _ \\ |  | | __| __|_   _|',
    '  \\__ \\ | |/ _ \\ |   / |/\\| | _|| _|  | |  ',
    '  |___/ |_/_/ \\_\\|_|_\\__/\\__|___|_|   |_|  ',
  ];

  // ---- the script. Each line: text, a class for color, and a delay (ms) before
  //      the NEXT line appears. A dense 90s-BIOS POST that drifts diegetic at the
  //      end. Tighter cadence than a teletype — lines land in quick bursts. ----
  // kinds: dim (faint scaffolding), ok (green pass), info (ink), warn (red),
  //        weave (accent, the fiction breaking through), logo (drawn separately).
  const SCRIPT = [
    { t: '+----------------------------------------------------------+', k: 'dim', d: 14 },
    { t: '|  STARWEFT LOOM CONTROLLER BIOS  rev 3.11                  |', k: 'dim', d: 14 },
    { t: '|  WeftCore Logistics Engine  (c) The Provisional Weft      |', k: 'dim', d: 14 },
    { t: '+----------------------------------------------------------+', k: 'dim', d: 110 },
    { t: '', k: 'dim', d: 40 },
    { t: 'Main Processor    : WeftCore LX-7   @ 1 tick / cycle', k: 'info', d: 30 },
    { t: 'Co-Processor      : Mulberry32 PRNG  (seeded, deterministic)', k: 'info', d: 30 },
    { t: 'Lane Bus          : Gabriel-graph, 8 strands, synchronous', k: 'info', d: 30 },
    { t: 'Chronometer       : tick pipeline armed', k: 'info', d: 90 },
    { t: '', k: 'dim', d: 30 },
    { t: 'Memory Test : 65536 weft-cells', k: 'dim', d: 30, memtest: true },
    { t: '', k: 'dim', d: 30 },
    { t: 'POST  ....................................................', k: 'dim', d: 70 },
    { t: '  [CORE] economy solver  (prices, prosperity) ........', k: 'info', d: 26, ok: true },
    { t: '  [GEN ] galaxy seeder  (planets, lanes, sites) ......', k: 'info', d: 26, ok: true },
    { t: '  [SIM ] ships, routes, directives ...................', k: 'info', d: 26, ok: true },
    { t: '  [RIV ] rival trade networks ........................', k: 'info', d: 26, ok: true },
    { t: '  [WIRE] market terminal  (Mercantile Wire) ..........', k: 'info', d: 26, ok: true },
    { t: '  [WEAV] Living Weave  (lane-flow, presence) .........', k: 'info', d: 26, ok: true },
    { t: '  [SCRG] the Scourge  ......... contained ............', k: 'warn', d: 120, ok: true, slow: true },
    { t: '', k: 'dim', d: 30 },
    { t: 'Lane Map:', k: 'dim', d: 18 },
    { t: '  0x00  ################  [SOL / HOME]', k: 'dim', d: 12 },
    { t: '  0x40  ########::::::::  [THE BUBBLE]', k: 'dim', d: 12 },
    { t: '  0x80  ::::............  [THE VERGE]', k: 'dim', d: 12 },
    { t: '  0xC0  ................  [DEEP WILDS]', k: 'dim', d: 70 },
    { t: '', k: 'dim', d: 30 },
    { t: 'Handshake : >>> SYN  the worlds  ... <<< no answer', k: 'dim', d: 60 },
    { t: 'Handshake : >>> SYN  the worlds  ... <<< no answer', k: 'dim', d: 60 },
    { t: 'Handshake : >>> SYN  the worlds  ... <<< ......', k: 'dim', d: 240 },
    { t: '', k: 'dim', d: 30 },
    { t: '> loom spinning up', k: 'weave', d: 260 },
    { t: '> thread integrity ......... 100%', k: 'weave', d: 240 },
    { t: '> a single answer returns from the dark', k: 'weave', d: 360 },
    { t: '> the worlds drifted apart.', k: 'weave', d: 460 },
    { t: '> you are the thread.', k: 'weave', d: 560 },
    { t: '', k: 'dim', d: 160 },
    { t: 'the worlds are listening. press any key to begin _', k: 'info', d: 0, prompt: true },
  ];

  let active = false;
  let cleanup = null;

  function play(onComplete) {
    const done = function () {
      if (cleanup) { cleanup(); cleanup = null; }
      active = false;
      markSeen();
      if (typeof onComplete === 'function') onComplete();
    };

    // Headless, already-seen, or reduced motion: skip straight to the title.
    if (!isRealBrowser() || alreadySeen() || prefersReducedMotion()) {
      done();
      return;
    }

    active = true;
    buildAndRun(done);
  }

  function buildAndRun(done) {
    const overlay = document.createElement('div');
    overlay.id = 'bootScreen';
    overlay.setAttribute('role', 'presentation');
    overlay.setAttribute('aria-hidden', 'true');

    const crt = document.createElement('div');
    crt.className = 'bootScan';
    overlay.appendChild(crt);

    const term = document.createElement('pre');
    term.className = 'bootTerm';
    overlay.appendChild(term);

    const skip = document.createElement('div');
    skip.className = 'bootSkip';
    skip.textContent = 'press any key / click to skip';
    overlay.appendChild(skip);

    document.body.appendChild(overlay);

    const timers = [];
    let finished = false;

    function clearTimers() { for (let i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers.length = 0; }

    function teardown() {
      clearTimers();
      removeListeners();
      if (overlay.parentNode) {
        overlay.classList.add('bootOut');
        // Let the fade play, then yank it. Guard parentNode in case of double-call.
        setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 420);
      }
    }

    cleanup = teardown;

    function finish() {
      if (finished) return;
      finished = true;
      done();
    }

    // ---- skip handling: any key, click, or touch ends the crawl early ----
    function onKey(e) {
      // Don't swallow devtools / refresh chords; any plain key skips.
      finish();
    }
    function onPointer() { finish(); }
    function removeListeners() {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onPointer, true);
      window.removeEventListener('touchstart', onPointer, true);
    }
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('mousedown', onPointer, true);
    window.addEventListener('touchstart', onPointer, true);

    // ---- render the script line by line ----
    let i = 0;
    function appendLine(spec) {
      const line = document.createElement('span');
      line.className = 'bl bl-' + (spec.k || 'dim') + (spec.slow ? ' bl-slow' : '');
      if (spec.ok) {
        const txt = document.createElement('span');
        txt.textContent = spec.t;
        line.appendChild(txt);
        const tag = document.createElement('span');
        tag.className = 'bl-ok';
        tag.textContent = '  [ OK ]';
        line.appendChild(tag);
      } else if (spec.prompt) {
        line.className += ' bl-prompt';
        line.textContent = spec.t;
      } else {
        line.textContent = spec.t;
      }
      term.appendChild(line);
      term.scrollTop = term.scrollHeight;
      return line;
    }

    // Animate a counting memory test on its line, then call `after`.
    function runMemtest(line, after) {
      const target = 65536, stepK = 8192;
      let v = 0;
      function tickMem() {
        if (finished) { line.textContent = 'Memory Test : ' + target + ' weft-cells  OK'; after(); return; }
        v += stepK;
        if (v >= target) {
          line.textContent = 'Memory Test : ' + target + ' weft-cells';
          const tag = document.createElement('span'); tag.className = 'bl-ok'; tag.textContent = '  [ OK ]';
          line.appendChild(tag);
          timers.push(setTimeout(after, 90));
          return;
        }
        line.textContent = 'Memory Test : ' + ('     ' + v).slice(-5) + ' weft-cells';
        term.scrollTop = term.scrollHeight;
        timers.push(setTimeout(tickMem, 24));
      }
      tickMem();
    }

    function drawLogo(after) {
      const wrap = document.createElement('span');
      wrap.className = 'bl bl-logo';
      term.appendChild(wrap);
      let li = 0;
      function nextLogoLine() {
        if (li < LOGO.length) {
          const ln = document.createElement('span');
          ln.className = 'bootLogoLine';
          ln.textContent = LOGO[li];
          wrap.appendChild(ln);
          term.scrollTop = term.scrollHeight;
          li++;
          timers.push(setTimeout(nextLogoLine, 110));
        } else {
          term.appendChild(document.createTextNode('\n'));
          timers.push(setTimeout(after, 360));
        }
      }
      nextLogoLine();
    }

    function step() {
      if (finished) return;
      if (i >= SCRIPT.length) {
        // Crawl complete: hold on the prompt, then auto-advance so an idle
        // player isn't stranded. They can press a key any time to skip the wait.
        timers.push(setTimeout(finish, 2600));
        return;
      }
      const spec = SCRIPT[i++];
      const line = appendLine(spec);
      if (spec.memtest && !finished) { runMemtest(line, step); return; }
      timers.push(setTimeout(step, spec.d));
    }

    // Sequence: brief power-on flicker -> draw logo -> run the POST crawl.
    timers.push(setTimeout(function () {
      drawLogo(function () { step(); });
    }, 280));
  }

  boot.play = play;
  boot.isActive = function () { return active; };
})();
