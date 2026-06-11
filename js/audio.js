/* STARWEFT audio.js — synthesized blips + a slow ambient engine. Browser only.
   The ambient layer plays sparse, quiet pads (FTL-adjacent): minor-pentatonic
   when the weave is calm, narrower and darker as the Scourge spreads,
   thin and glassy inside a system view. All from oscillators; no assets. */
var SW = globalThis.SW = globalThis.SW || {};

SW.audio = (function () {
  const A = { muted: false, musicMuted: false };
  let ctx = null, master = null, musicBus = null, delaySend = null;
  let scene = 'galaxy';
  let mood = 'calm';            // calm | dark | dread
  let nextPadAt = 0, droneOsc = null, droneGain = null, padTimer = null;

  try { A.muted = localStorage.getItem('starweft_muted') === '1'; } catch (e) {}
  try { A.musicMuted = localStorage.getItem('starweft_music') === '1'; } catch (e) {}

  A.ensure = function () {
    if (ctx || typeof AudioContext === 'undefined') return;
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);

      musicBus = ctx.createGain();
      musicBus.gain.value = A.musicMuted ? 0 : 0.5;
      const delay = ctx.createDelay(2.0);
      delay.delayTime.value = 0.48;
      const fb = ctx.createGain(); fb.gain.value = 0.34;
      const wet = ctx.createGain(); wet.gain.value = 0.5;
      delaySend = ctx.createGain(); delaySend.gain.value = 1;
      delaySend.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet);
      musicBus.connect(master);
      wet.connect(musicBus);
      startAmbient();
    } catch (e) { ctx = null; }
  };

  A.toggleMute = function () {
    A.muted = !A.muted;
    try { localStorage.setItem('starweft_muted', A.muted ? '1' : '0'); } catch (e) {}
    return A.muted;
  };
  A.toggleMusic = function () {
    A.musicMuted = !A.musicMuted;
    try { localStorage.setItem('starweft_music', A.musicMuted ? '1' : '0'); } catch (e) {}
    if (musicBus) musicBus.gain.linearRampToValueAtTime(A.musicMuted ? 0 : 0.5, ctx.currentTime + 1);
    return A.musicMuted;
  };

  A.setScene = function (s) { scene = s; };

  // 0 = inside the bubble, 1 = galactic scale. Out here the music gets thin:
  // longer silences, duller pads, the drone almost gone. Space is mostly space.
  let depth = 0;
  A.setDepth = function (d) {
    d = d < 0 ? 0 : d > 1 ? 1 : d;
    if (Math.abs(d - depth) < 0.04) { depth = d; return; }
    depth = d;
    if (ctx && droneGain) droneGain.gain.linearRampToValueAtTime(0.05 * (1 - 0.75 * depth), ctx.currentTime + 1.5);
  };

  // Called periodically with game state: derives the ambient mood.
  A.updateMood = function (state) {
    if (!state) return;
    let m = 'calm';
    if (state.scourge && state.scourge.phase === 'active') {
      m = 'dark';
      const threatened = state.systems.some(function (s) { return s.scourge === 1 && s.discovered; });
      const corrupted = SW.scourge.corruptedCount(state);
      if (threatened || corrupted > 14) m = 'dread';
    }
    if (state.gameOver) m = state.gameOver.win ? 'calm' : 'dread';
    if (m !== mood) {
      mood = m;
      retuneDrone();
    }
  };

  // ---------- ambient engine ----------
  const MOODS = {
    calm:  { root: 55,   scale: [0, 3, 5, 7, 10, 12, 15], cutoff: 1100, gap: [9, 15],  vol: 0.16, voices: 3 },
    dark:  { root: 49,   scale: [0, 3, 5, 8, 10, 12],     cutoff: 700,  gap: [7, 12],  vol: 0.15, voices: 3 },
    dread: { root: 46.2, scale: [0, 1, 5, 6, 10, 13],     cutoff: 420,  gap: [5, 9],   vol: 0.17, voices: 4 },
  };

  function startAmbient() {
    // sub drone, barely there
    droneOsc = ctx.createOscillator();
    droneOsc.type = 'sine';
    droneGain = ctx.createGain();
    droneGain.gain.value = 0.05;
    droneOsc.connect(droneGain); droneGain.connect(musicBus);
    droneOsc.frequency.value = MOODS[mood].root / 2;
    droneOsc.start();
    nextPadAt = ctx.currentTime + 2;
    padTimer = setInterval(schedulePads, 1000);
  }
  function retuneDrone() {
    if (droneOsc) droneOsc.frequency.linearRampToValueAtTime(MOODS[mood].root / 2, ctx.currentTime + 4);
  }
  function schedulePads() {
    if (!ctx || A.musicMuted) return;
    if (ctx.currentTime < nextPadAt) return;
    const M = MOODS[mood];
    nextPadAt = ctx.currentTime + (M.gap[0] + Math.random() * (M.gap[1] - M.gap[0])) * (1 + 1.4 * depth);
    playPad(M);
    if (scene === 'system' && Math.random() < 0.7) playPluck(M);
  }
  function playPad(M) {
    const t0 = ctx.currentTime + 0.05;
    const n = M.voices;
    const chosen = [];
    while (chosen.length < n) {
      const iv = M.scale[Math.floor(Math.random() * M.scale.length)];
      if (chosen.indexOf(iv) < 0) chosen.push(iv);
    }
    const dur = 7 + Math.random() * 5;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = M.cutoff * (0.8 + Math.random() * 0.5) * (1 - 0.45 * depth);
    filt.Q.value = 0.4;
    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0, t0);
    padGain.gain.linearRampToValueAtTime(M.vol * (scene === 'system' ? 0.6 : 1) * (1 - 0.55 * depth), t0 + dur * 0.4);
    padGain.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    filt.connect(padGain); padGain.connect(musicBus); padGain.connect(delaySend);
    for (const iv of chosen) {
      const f = M.root * Math.pow(2, iv / 12) * (scene === 'system' ? 2 : 1);
      [['sine', 0], ['triangle', 2.5]].forEach(function (cfg) {
        const o = ctx.createOscillator();
        o.type = cfg[0];
        o.frequency.value = f;
        o.detune.value = cfg[1] + (Math.random() * 4 - 2);
        const g = ctx.createGain(); g.gain.value = cfg[0] === 'sine' ? 0.5 : 0.18;
        o.connect(g); g.connect(filt);
        o.start(t0); o.stop(t0 + dur + 0.2);
      });
    }
  }
  function playPluck(M) {
    const t0 = ctx.currentTime + 0.4 + Math.random() * 2;
    const iv = M.scale[Math.floor(Math.random() * M.scale.length)];
    const f = M.root * 4 * Math.pow(2, iv / 12);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.08, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
    o.connect(g); g.connect(musicBus); g.connect(delaySend);
    o.start(t0); o.stop(t0 + 2.6);
  }

  // ---------- one-shot sfx ----------
  function tone(freq, dur, opts) {
    if (!ctx || A.muted) return;
    opts = opts || {};
    const t0 = ctx.currentTime + (opts.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(opts.vol || 0.5, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  const SFX = {
    click:    function () { tone(700, 0.05, { type: 'triangle', vol: 0.22 }); },
    buy:      function () { tone(420, 0.08, { type: 'triangle' }); tone(560, 0.08, { type: 'triangle', delay: 0.06 }); },
    sell:     function () { tone(660, 0.07, { type: 'triangle' }); tone(880, 0.09, { type: 'triangle', delay: 0.06 }); tone(1100, 0.12, { type: 'triangle', delay: 0.12, vol: 0.35 }); },
    discover: function () { tone(520, 0.3, { type: 'sine', slide: 1040, vol: 0.3 }); },
    chime:    function () { tone(880, 0.2, { vol: 0.3 }); tone(1320, 0.3, { delay: 0.1, vol: 0.2 }); },
    tech:     function () { tone(523, 0.1); tone(659, 0.1, { delay: 0.09 }); tone(784, 0.18, { delay: 0.18 }); },
    build:    function () { tone(220, 0.12, { type: 'square', vol: 0.2 }); tone(330, 0.15, { type: 'square', delay: 0.1, vol: 0.2 }); },
    dread:    function () { tone(140, 0.7, { type: 'sawtooth', slide: 70, vol: 0.25 }); },
    fall:     function () { tone(200, 0.9, { type: 'sawtooth', slide: 50, vol: 0.3 }); tone(95, 1.1, { type: 'sine', delay: 0.15, slide: 40, vol: 0.3 }); },
    shield:   function () { tone(500, 0.15, { type: 'square', vol: 0.2 }); tone(750, 0.2, { delay: 0.1, vol: 0.25 }); },
    loss:     function () { tone(330, 0.25, { slide: 165, vol: 0.3 }); },
    raid:     function () { tone(180, 0.2, { type: 'sawtooth', vol: 0.25 }); tone(120, 0.35, { type: 'square', delay: 0.12, slide: 80, vol: 0.2 }); },
    panacea:  function () { tone(523, 0.12); tone(659, 0.12, { delay: 0.1 }); tone(784, 0.12, { delay: 0.2 }); tone(1047, 0.3, { delay: 0.3 }); },
    survey:   function () { tone(700, 0.1, { vol: 0.25 }); tone(933, 0.16, { delay: 0.1, vol: 0.22 }); },
    victory:  function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.4, { delay: i * 0.15, vol: 0.35 }); }); },
    defeat:   function () { [392, 370, 349, 330].forEach(function (f, i) { tone(f, 0.5, { delay: i * 0.3, type: 'sawtooth', vol: 0.2 }); }); },
  };

  A.sfx = function (name) {
    if (SFX[name]) { try { SFX[name](); } catch (e) {} }
  };

  return A;
})();
