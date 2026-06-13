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
  //      the NEXT line appears. Starts as a dry POST, drifts diegetic at the end. ----
  // kinds: dim (faint scaffolding), ok (green pass), info (ink), warn (accent),
  //        weave (accent, the fiction breaking through), logo (drawn separately).
  const SCRIPT = [
    { t: 'STARWEFT LOOM CONTROLLER  rev 3.11  (c) The Provisional Weft', k: 'dim', d: 240 },
    { t: 'POST  ............................................', k: 'dim', d: 200 },
    { t: '  core memory ......... 65536 weft-cells', k: 'info', d: 90, ok: true },
    { t: '  thread bus .......... synchronous, 8 strands', k: 'info', d: 90, ok: true },
    { t: '  rng entropy ......... seeded, deterministic', k: 'info', d: 90, ok: true },
    { t: '  chronometer ........ tick pipeline armed', k: 'info', d: 120, ok: true },
    { t: 'enumerating bodies ...', k: 'dim', d: 160 },
    { t: '  planets ............ scanning lanes', k: 'info', d: 80, ok: true },
    { t: '  sites .............. drift surveyed', k: 'info', d: 80, ok: true },
    { t: '  rivals ............. trade-lines detected', k: 'info', d: 80, ok: true },
    { t: '  Scourge ............ contained ...........', k: 'warn', d: 240, ok: true, slow: true },
    { t: 'mounting market terminal ..................', k: 'dim', d: 150, ok: true },
    { t: 'calibrating Living Weave ..................', k: 'dim', d: 320, ok: true },
    { t: '', k: 'dim', d: 120 },
    { t: '> loom spinning up', k: 'weave', d: 360 },
    { t: '> thread integrity ......... 100%', k: 'weave', d: 300 },
    { t: '> the worlds drifted apart.', k: 'weave', d: 520 },
    { t: '> you are the thread.', k: 'weave', d: 640 },
    { t: '', k: 'dim', d: 200 },
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
      term.appendChild(document.createTextNode('\n'));
      term.scrollTop = term.scrollHeight;
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
          ln.textContent = LOGO[li] + '\n';
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
      appendLine(spec);
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
