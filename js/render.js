/* STARWEFT render.js — the bubble in three dimensions. Browser only.
   Canvas-2D with manual perspective: orbit camera, Milky Way skybox,
   nebula regions, wonders, and an in-system orbital view.
   Palette: monochrome ink; spectral tints whisper; red is reserved for harm. */
var SW = globalThis.SW = globalThis.SW || {};

SW.render = (function () {
  const U = SW.util, D = SW.data;
  const R = {};

  let canvas, ctx, dpr = 1, W = 0, H = 0;
  R.mode = 'galaxy';              // 'galaxy' | 'system'
  R.systemId = null;              // when mode==='system'
  R.cam = { yaw: 0.6, pitch: 0.45, dist: 150, tx: 0, ty: 0, tz: 0 };
  R.systemPan = { x: 0, y: 0 };
  R.systemZoom = 1;
  R.systemAngle = 0;
  R.systemPitch = 0.42;
  R.selectedSys = null;
  R.selectedShip = null;
  R.selectedBody = null;
  R.hoverSys = null;
  R.hoverBody = null;
  R.showRange = false;
  R.showPerf = false;             // F3: fps + frame/tick budget readout
  R.followShip = null;            // ship id the camera shadows (cleared by panning)

  let sky = [];                   // skybox point cloud (directions)
  let galaxyPts = [];             // positioned Milky Way point cloud (ly), for far zoom
  let armLabels = [];             // spiral arm name anchors
  const GAL_CENTER = { x: 26600, y: 0, z: 0 };  // Sgr A*, ~26.6 kly coreward

  // Render LOD thresholds (camera distance, ly). All zoom tuning lives here.
  const LOD = {
    deepStart: 350, deepRange: 1400,    // deep-galaxy crossfade window
    regionFade: 650, regionFadeRange: 700,
    regions: 1400, lanes: 900, rivalShips: 900,
    simpleStars: 800,                   // dots instead of glow sprites past this
    systems: 2400, playerShips: 2400,   // bubble collapses to a mote past this
    armLabels: 4500, armLabelRange: 6000,
  };
  const trails = {};
  const laneHeat = {};
  let fxLive = [];
  let pickables = [];             // [{x,y,r,sys}] rebuilt per frame
  let bodyPickables = [];
  let orbitGuideUntil = 0;
  const SYSTEM_PLANE_OFFSET = -Math.PI / 2;

  function accent(a) {
    const st = SW.game.state;
    const hue = st && st.identity ? st.identity.hue : 195;
    return 'hsla(' + hue + ',55%,72%,' + (a === undefined ? 1 : a) + ')';
  }

  // System view: a body's facilities. Ground sites stack their icons above
  // the body; orbital stations circle it on a squashed ellipse, slowly.
  function drawBodySites(sys, b, bx, by, br) {
    const all = sys.sites ? sys.sites.filter(function (x) { return x.body === b.name; }) : [];
    if (!all.length) return;
    const ground = [], orbital = [];
    for (const site of all) {
      const f = D.FACILITIES[site.fac];
      if (f) (f.orbital ? orbital : ground).push(f);
    }
    if (ground.length) {
      ctx.fillStyle = accent(0.9);
      ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      for (let i = 0; i < ground.length; i++) {
        ctx.fillText(ground[i].icon, bx + (i - (ground.length - 1) / 2) * 10, by - br - 6);
      }
      ctx.textAlign = 'left';
    }
    const st = SW.game.state;
    for (let i = 0; i < orbital.length; i++) {
      const ang = (st ? st.tick : 0) * 0.045 + i * 2.1 + b.name.length * 0.7;
      const orad = br + 7 + i * 4;
      const ox = bx + Math.cos(ang) * orad, oy = by + Math.sin(ang) * orad * 0.45;
      ctx.strokeStyle = 'rgba(200,210,224,0.18)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.ellipse(bx, by, orad, orad * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = accent(0.95);
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-1.6, -1.6, 3.2, 3.2);
      ctx.restore();
    }
  }

  // ---------- setup ----------
  R.init = function (cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    makeSky();
    makeGalaxy();
    bindInput();
    requestAnimationFrame(frame);
  };

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    W = canvas.clientWidth; H = canvas.clientHeight;
  }

  // Milky Way as a directional point cloud: dense band in the galactic plane,
  // bulge toward +x (the center, ~26 kly thataway).
  function makeSky() {
    let s = 99991;
    function rnd() { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }
    sky = [];
    for (let i = 0; i < 1500; i++) {
      const inBand = rnd() < 0.72;
      let x, y, z;
      if (inBand) {
        const lon = (rnd() * 2 - 1) * Math.PI;
        const lat = (rnd() + rnd() + rnd() - 1.5) * 0.16;       // tight around the plane
        x = Math.cos(lat) * Math.cos(lon); y = Math.cos(lat) * Math.sin(lon); z = Math.sin(lat);
      } else {
        const a = rnd() * Math.PI * 2, b = Math.acos(2 * rnd() - 1);
        x = Math.sin(b) * Math.cos(a); y = Math.sin(b) * Math.sin(a); z = Math.cos(b);
      }
      const towardCore = (x + 1) / 2;
      sky.push({
        x: x, y: y, z: z,
        mag: inBand ? (0.05 + rnd() * 0.16) * (0.6 + towardCore * 0.9) : 0.10 + rnd() * 0.30,
        size: rnd() < 0.04 ? 1.6 : 1,
        band: inBand,
      });
    }
  }

  // The Milky Way itself, as a positioned point cloud in light-years.
  // Only visible when the camera pulls far enough out that the skybox band
  // would lie: at that scale you can see the disk you live inside.
  function makeGalaxy() {
    let s = 424243;
    function rnd() { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }
    function g3() { return (rnd() + rnd() + rnd()) / 3; }
    galaxyPts = [];
    const C = GAL_CENTER;
    // central bulge + bar (tilted ~25° to our sightline)
    for (let i = 0; i < 850; i++) {
      const a = rnd() * Math.PI * 2, r = g3() * 6800;
      const bar = 1 + 1.1 * Math.pow(Math.abs(Math.cos(a - 0.45)), 3) * (1 - r / 9000);
      const flat = U.clamp(1 - r / 9000, 0.15, 1);
      galaxyPts.push({
        x: C.x + Math.cos(a) * r * 0.62 * bar,
        y: C.y + Math.sin(a) * r * 0.62,
        z: (g3() * 2 - 1) * 2400 * flat,
        mag: 0.16 + rnd() * 0.34 * flat,
        size: rnd() < 0.06 ? 1.7 : 1,
      });
    }
    // four logarithmic spiral arms (pitch ~13°); Sol sits in a spur between two
    const ARM_PHASES = [0.9, 0.9 + Math.PI / 2, 0.9 + Math.PI, 0.9 + Math.PI * 1.5];
    const B = 0.23, R0 = 3300;
    for (let arm = 0; arm < 4; arm++) {
      for (let i = 0; i < 800; i++) {
        const th = 0.4 + rnd() * 6.4;                 // winds ~1 turn
        const r = R0 * Math.exp(B * th);
        if (r > 46000) continue;
        const a = th + ARM_PHASES[arm];
        const spread = 700 + r * 0.055;
        const jr = (g3() * 2 - 1) * spread, ja = (g3() * 2 - 1) * spread / Math.max(1, r);
        galaxyPts.push({
          x: C.x + Math.cos(a + ja) * (r + jr),
          y: C.y + Math.sin(a + ja) * (r + jr),
          z: (g3() * 2 - 1) * 380,
          mag: (0.10 + rnd() * 0.26) * U.clamp(1.25 - r / 40000, 0.35, 1),
          size: rnd() < 0.05 ? 1.6 : 1,
        });
      }
    }
    // the Orion Spur: the short arm-segment we actually live in
    for (let i = 0; i < 260; i++) {
      const t = rnd() * 2 - 1;
      galaxyPts.push({
        x: (g3() * 2 - 1) * 900 + t * 2400,
        y: t * 7000 + (g3() * 2 - 1) * 1100,
        z: (g3() * 2 - 1) * 300,
        mag: 0.10 + rnd() * 0.22,
        size: 1,
      });
    }
    // smooth thin-disk infill + faint halo
    for (let i = 0; i < 1700; i++) {
      const a = rnd() * Math.PI * 2, r = -Math.log(1 - rnd() * 0.96) * 13000;
      if (r > 48000) continue;
      galaxyPts.push({
        x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r,
        z: (g3() * 2 - 1) * 420,
        mag: 0.05 + rnd() * 0.13,
        size: 1,
      });
    }
    for (let i = 0; i < 220; i++) {
      const a = rnd() * Math.PI * 2, b = Math.acos(2 * rnd() - 1), r = 12000 + rnd() * 34000;
      galaxyPts.push({
        x: C.x + Math.sin(b) * Math.cos(a) * r, y: C.y + Math.sin(b) * Math.sin(a) * r, z: Math.cos(b) * r * 0.8,
        mag: 0.04 + rnd() * 0.07, size: 1,
      });
    }
    // arm name anchors, sampled from the same spirals
    function armPt(phase, th) {
      const r = R0 * Math.exp(B * th);
      return { x: GAL_CENTER.x + Math.cos(th + phase) * r, y: GAL_CENTER.y + Math.sin(th + phase) * r, z: 0 };
    }
    armLabels = [
      { p: { x: 1200, y: 4200, z: 0 }, t: 'ORION SPUR' },
      { p: armPt(ARM_PHASES[0], 9.55), t: 'PERSEUS ARM' },
      { p: armPt(ARM_PHASES[2], 8.6), t: 'SAGITTARIUS ARM' },
      { p: armPt(ARM_PHASES[1], 8.9), t: 'SCUTUM–CENTAURUS' },
      { p: armPt(ARM_PHASES[3], 10.1), t: 'OUTER ARM' },
      { p: GAL_CENTER, t: 'SAGITTARIUS A✶' },
    ];
  }

  const DIST_MIN = 22, DIST_MAX = 90000;
  R.fit = function () {
    R.cam.tx = 8; R.cam.ty = 0; R.cam.tz = 0;
    R.cam.dist = 160; R.cam.distTarget = 160;
    R.cam.yaw = 0.6; R.cam.pitch = 0.45;
    R.cam.yawTarget = 0.6; R.cam.pitchTarget = 0.45;
  };
  R.alignToPlane = function () {
    R.cam.yaw = 0.6;
    R.cam.pitch = 0.45;
    R.cam.yawTarget = 0.6;
    R.cam.pitchTarget = 0.45;
  };
  R.centerOn = function (sysId) {
    const st = SW.game.state;
    if (!st || !st.systems[sysId]) return;
    const s = st.systems[sysId];
    R.cam.tx = s.x; R.cam.ty = s.y; R.cam.tz = s.z;
    if (R.cam.dist > 90) { R.cam.distTarget = 70; if (R.cam.dist > 600) R.cam.dist = 600; }
  };
  R.enterSystem = function (sysId) {
    R.mode = 'system'; R.systemId = sysId; R.selectedBody = null;
    R.systemPan.x = 0; R.systemPan.y = 0; R.systemZoom = 1; R.systemAngle = 0; R.systemPitch = 0.42;
    SW.audio.setScene('system');
  };
  R.exitSystem = function () {
    const s = SW.game && SW.game.state;
    if (s && SW.tutorial && SW.tutorial.mapLocked(s)) return; // the prologue holds the door
    R.mode = 'galaxy'; R.systemId = null; R.selectedBody = null; SW.audio.setScene('galaxy');
  };
  function panDragComponents(dx, dy, thresholded) {
    if (!thresholded) return { dx: dx, dy: dy };
    const ax = Math.abs(dx), ay = Math.abs(dy);
    const dead = 6, ratio = 0.35;
    let x = ax >= dead ? dx : 0;
    let y = ay >= dead ? dy : 0;
    if (x && y) {
      if (ay < ax * ratio) y = 0;
      else if (ax < ay * ratio) x = 0;
    }
    return { dx: x, dy: y };
  }
  R.panGalaxyView = function (dx, dy, thresholded) {
    R.followShip = null; // a deliberate pan breaks the follow
    updateCamera();
    const k = R.cam.dist / focal;
    const p = panDragComponents(dx, dy, thresholded);
    R.cam.tx -= (p.dx * cosY + p.dy * sinP * sinY) * k;
    R.cam.ty -= (-p.dx * sinY + p.dy * sinP * cosY) * k;
    R.cam.tz += p.dy * cosP * k;
  };
  R.panSystemView = function (dx, dy, thresholded) {
    const p = panDragComponents(dx, dy, thresholded);
    R.systemPan.x = U.clamp(R.systemPan.x + p.dx, -W * 0.6, W * 0.6);
    R.systemPan.y = U.clamp(R.systemPan.y + p.dy, -H * 0.6, H * 0.6);
  };
  R.rotateSystemView = function (delta, tiltDelta) {
    R.systemAngle += delta;
    R.systemPitch = U.clamp(R.systemPitch + (tiltDelta || 0), 0.16, 0.95);
  };
  R.systemOrbitShape = function () {
    return { rotation: R.systemAngle + SYSTEM_PLANE_OFFSET, squash: R.systemPitch };
  };
  R.systemSkyPoint = function (base, other) {
    return systemSkyPointFor(base, other, W / 2, H / 2 + 10, systemSkyScale());
  };

  // ---------- projection ----------
  let cosY = 1, sinY = 0, cosP = 1, sinP = 0, focal = 700;
  function updateCamera() {
    cosY = Math.cos(R.cam.yaw); sinY = Math.sin(R.cam.yaw);
    cosP = Math.cos(R.cam.pitch); sinP = Math.sin(R.cam.pitch);
    focal = Math.min(W, H) * 1.05;
  }
  function project(p) {
    const dx = p.x - R.cam.tx, dy = p.y - R.cam.ty, dz = (p.z || 0) - R.cam.tz;
    const x1 = dx * cosY - dy * sinY;
    const y1 = dx * sinY + dy * cosY;
    const y2 = y1 * cosP - dz * sinP;
    const z2 = y1 * sinP + dz * cosP;
    const depth = y2 + R.cam.dist;
    if (depth < 2) return null;
    const s = focal / depth;
    return { x: W / 2 + x1 * s, y: H / 2 - z2 * s, s: s, depth: depth };
  }
  function projectDir(d) { // skybox: direction only, no translation
    const x1 = d.x * cosY - d.y * sinY;
    const y1 = d.x * sinY + d.y * cosY;
    const y2 = y1 * cosP - d.z * sinP;
    const z2 = y1 * sinP + d.z * cosP;
    if (y2 < 0.08) return null;
    return { x: W / 2 + (x1 / y2) * focal * 0.85, y: H / 2 - (z2 / y2) * focal * 0.85 };
  }
  function fog(depth) { return U.clamp(1.45 - depth / (R.cam.dist * 1.9), 0.12, 1); }

  // Mid-field stars: the seeded dust between the badlands rim and the galactic
  // cloud, so zooming out never passes through empty black. Deterministic from
  // the game seed; regenerated on the fly whenever the seed changes.
  let midPts = [], midSeed = null;
  function makeMidField(seed) {
    midSeed = seed;
    let s = U.seedFrom('midfield|' + seed);
    function rnd() { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }
    midPts = [];
    for (let i = 0; i < 4200; i++) {
      // log-radius shells 70 → 3000 ly: similar sprinkle density at every zoom
      const r = 70 * Math.pow(3000 / 70, rnd());
      const a = rnd() * Math.PI * 2, c2 = 2 * rnd() - 1;
      const sq = Math.sqrt(1 - c2 * c2);
      midPts.push({
        x: r * sq * Math.cos(a),
        y: r * sq * Math.sin(a),
        z: r * c2 * 0.55,
        mag: 0.05 + rnd() * 0.16,
        size: rnd() < 0.05 ? 1.6 : 1,
      });
    }
  }
  function drawMidFieldInto(c2ctx) {
    // visible from just past the bubble until the deep cloud owns the frame
    const a = U.clamp((R.cam.dist - 130) / 180, 0, 1) * U.clamp(1 - (R.cam.dist - 2200) / 1400, 0, 1);
    if (a <= 0.01) return;
    c2ctx.fillStyle = '#cdd6e4';
    for (const p of midPts) {
      const q = project(p);
      if (!q || q.x < -4 || q.x > W + 4 || q.y < -4 || q.y > H + 4) continue;
      c2ctx.globalAlpha = p.mag * a;
      c2ctx.fillRect(q.x, q.y, p.size, p.size);
    }
    c2ctx.globalAlpha = 1;
  }

  function galacticGuideAxes(len) {
    const c = { x: R.cam.tx, y: R.cam.ty, z: R.cam.tz };
    return {
      center: project(c),
      core: project({ x: c.x + len, y: c.y, z: c.z }),
      rim: project({ x: c.x - len, y: c.y, z: c.z }),
      spin: project({ x: c.x, y: c.y + len, z: c.z }),
      trail: project({ x: c.x, y: c.y - len, z: c.z }),
    };
  }
  R.galacticGuideAxes = function (len) {
    updateCamera();
    return galacticGuideAxes(len || 10);
  };

  // ---------- input ----------
  function bindInput() {
    let drag = null; // {btn, x, y, moved}
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('pointerdown', function (e) {
      drag = { btn: e.button, x: e.clientX, y: e.clientY, moved: 0 };
      canvas.classList.add('dragging');
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.moved += Math.abs(dx) + Math.abs(dy);
        if (drag.moved > 4) {
          if (R.mode === 'system') {
            if (drag.btn === 2 || e.shiftKey) R.panSystemView(dx, dy, false);
            else R.rotateSystemView(dx * 0.008, -dy * 0.004);
          } else if (drag.btn === 2 || e.shiftKey) { // pan in view plane — free, no axis snapping
            R.panGalaxyView(dx, dy, false);
          } else {
            // orbit through eased targets: direct but damped, the Elite feel
            if (R.cam.yawTarget == null) { R.cam.yawTarget = R.cam.yaw; R.cam.pitchTarget = R.cam.pitch; }
            R.cam.yawTarget += dx * 0.006;
            R.cam.pitchTarget = U.clamp(R.cam.pitchTarget + dy * 0.005, -1.35, 1.35);
            orbitGuideUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 900;
          }
        }
        drag.x = e.clientX; drag.y = e.clientY;
      } else {
        updateHover(mx, my, e.clientX, e.clientY);
      }
    });
    canvas.addEventListener('pointerup', function (e) {
      canvas.classList.remove('dragging');
      if (drag && drag.moved <= 4 && drag.btn === 0) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        if (R.mode === 'system') {
          const b = pickBody(mx, my);
          SW.ui.bodyClick(b);
        } else {
          SW.ui.mapClick(pickSystem(mx, my));
        }
      }
      drag = null;
    });
    canvas.addEventListener('pointerleave', function () { drag = null; R.hoverSys = null; R.hoverBody = null; SW.ui.mapHover(null); });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (R.mode === 'system') {
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        R.systemZoom = U.clamp(R.systemZoom * factor, 0.55, 2.4);
      } else {
        const cur = R.cam.distTarget == null ? R.cam.dist : R.cam.distTarget;
        // continuous zoom on screen center: factor scales with actual wheel delta
        // (smooth on trackpads, still quick on notched wheels), eased in frame()
        const k = cur > 600 ? 0.0018 : 0.0012;
        const factor = Math.exp(U.clamp(e.deltaY, -160, 160) * k);
        R.cam.distTarget = U.clamp(cur * factor, DIST_MIN, DIST_MAX);
      }
    }, { passive: false });
    canvas.addEventListener('dblclick', function (e) {
      const rect = canvas.getBoundingClientRect();
      const sys = pickSystem(e.clientX - rect.left, e.clientY - rect.top);
      if (sys && sys.discovered && R.mode === 'galaxy') { R.selectedSys = sys.id; SW.ui.enterSystem(sys.id); }
    });
  }

  function updateHover(mx, my, cx, cy) {
    if (R.mode === 'system') {
      const b = pickBody(mx, my);
      R.hoverBody = b;
      SW.ui.bodyHover(b, cx, cy);
      canvas.style.cursor = b ? 'pointer' : '';
    } else {
      const sys = pickSystem(mx, my);
      R.hoverSys = sys ? sys.id : null;
      SW.ui.mapHover(sys, cx, cy);
      canvas.style.cursor = sys ? 'pointer' : '';
    }
  }
  function pickSystem(mx, my) {
    let best = null, bestD = 15;
    for (const p of pickables) {
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < bestD + p.r * 0.4) { bestD = d; best = p.sys; }
    }
    return best;
  }
  function pickBody(mx, my) {
    let best = null, bestD = 17;
    for (const p of bodyPickables) {
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < bestD + p.r * 0.5) { bestD = d; best = p.body; }
    }
    return best;
  }

  // ---------- frame ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const st = SW.game.state;
    // eased camera: zoom and orbit glide toward their targets
    if (R.cam.distTarget != null && R.cam.distTarget !== R.cam.dist) {
      const d = R.cam.distTarget - R.cam.dist;
      R.cam.dist = Math.abs(d) < R.cam.dist * 0.001 ? R.cam.distTarget : R.cam.dist + d * 0.18;
    }
    if (R.cam.yawTarget != null) {
      const dy2 = R.cam.yawTarget - R.cam.yaw, dp2 = R.cam.pitchTarget - R.cam.pitch;
      R.cam.yaw = Math.abs(dy2) < 0.0004 ? R.cam.yawTarget : R.cam.yaw + dy2 * 0.3;
      R.cam.pitch = Math.abs(dp2) < 0.0004 ? R.cam.pitchTarget : R.cam.pitch + dp2 * 0.3;
    }
    // follow camera: shadow the chosen ship
    if (R.followShip && st && R.mode === 'galaxy') {
      const fs = st.ships.find(function (x) { return x.id === R.followShip; });
      if (!fs) R.followShip = null;
      else {
        const fp = shipSmoothPos(st, fs);
        R.cam.tx += (fp.x - R.cam.tx) * 0.12;
        R.cam.ty += (fp.y - R.cam.ty) * 0.12;
        R.cam.tz += (fp.z - R.cam.tz) * 0.12;
      }
    }
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#040507';
    ctx.fillRect(0, 0, W, H);
    updateCamera();
    drawBackground();
    if (st) {
      if (R.mode === 'system' && R.systemId !== null) drawSystemView(st, now);
      else drawGalaxy(st, now);
    }
    if (SW.audio && SW.audio.setDepth) SW.audio.setDepth(R.mode === 'galaxy' ? deepFade() : 0);
    if (R.showPerf) drawPerf(now);
    ctx.restore();
  }

  // F3 budget readout: render fps + frame ms + last sim tick ms
  let perfEmaMs = 16.7, perfLastT = 0;
  function drawPerf(now) {
    if (perfLastT) perfEmaMs += (Math.min(200, now - perfLastT) - perfEmaMs) * 0.06;
    perfLastT = now;
    const fps = Math.round(1000 / Math.max(1, perfEmaMs));
    const txt = fps + ' FPS · frame ' + perfEmaMs.toFixed(1) + 'ms · tick ' + (SW.game.lastTickMs || 0).toFixed(2) + 'ms';
    ctx.font = '10px Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = fps < 50 ? 'rgba(255,77,87,0.9)' : 'rgba(140,150,165,0.9)';
    ctx.fillText(txt, W - 10, 48);
    ctx.textAlign = 'left';
  }

  // LOD: 0→1 as the camera pulls from bubble scale to galactic scale
  function deepFade() { return U.clamp((R.cam.dist - LOD.deepStart) / LOD.deepRange, 0, 1); }

  // The starfield + deep galaxy only change when the camera does, so they live
  // on a cached layer: idle frames blit one image instead of projecting ~5k points.
  let bgCv = null, bgKey = '';
  function drawBackground() {
    if (!bgCv) bgCv = document.createElement('canvas');
    const key = R.mode + '|' + R.cam.yaw.toFixed(4) + '|' + R.cam.pitch.toFixed(4) + '|' + R.cam.dist.toFixed(2) +
      '|' + R.cam.tx.toFixed(2) + '|' + R.cam.ty.toFixed(2) + '|' + R.cam.tz.toFixed(2) + '|' + canvas.width + 'x' + canvas.height +
      '|' + (SW.game.state ? SW.game.state.seed : '');
    if (key !== bgKey) {
      bgKey = key;
      if (bgCv.width !== canvas.width || bgCv.height !== canvas.height) { bgCv.width = canvas.width; bgCv.height = canvas.height; }
      const c2 = bgCv.getContext('2d');
      if (!c2) return;
      c2.clearRect(0, 0, bgCv.width, bgCv.height);
      c2.save();
      c2.scale(dpr, dpr);
      drawSkyInto(c2);
      if (R.mode === 'galaxy') {
        const st = SW.game.state;
        if (st && st.seed !== midSeed) makeMidField(st.seed);
        drawMidFieldInto(c2);
        const deep = deepFade();
        if (deep > 0) drawDeepInto(c2, deep);
      }
      c2.restore();
    }
    ctx.drawImage(bgCv, 0, 0, W, H);
  }

  function drawSkyInto(c2) {
    // the directional band dissolves as the positioned galaxy takes over —
    // you stop seeing the Milky Way as a stripe and start seeing it as a place
    const bandFade = R.mode === 'system' ? 1 : 1 - deepFade() * 0.92;
    // core glow toward +x
    const core = projectDir({ x: 1, y: 0, z: 0 });
    if (core && bandFade > 0.1) {
      const g = c2.createRadialGradient(core.x, core.y, 0, core.x, core.y, Math.min(W, H) * 0.5);
      g.addColorStop(0, 'rgba(214,222,235,' + 0.10 * bandFade + ')');
      g.addColorStop(0.4, 'rgba(190,200,215,' + 0.04 * bandFade + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c2.fillStyle = g;
      c2.fillRect(0, 0, W, H);
    }
    c2.fillStyle = '#cdd6e4';
    const sceneDim = R.mode === 'system' ? 0.45 : 1;
    for (const p of sky) {
      const q = projectDir(p);
      if (!q || q.x < -8 || q.x > W + 8 || q.y < -8 || q.y > H + 8) continue;
      c2.globalAlpha = p.mag * sceneDim * (p.band ? bandFade : 1);
      if (c2.globalAlpha < 0.01) continue;
      c2.fillRect(q.x, q.y, p.size, p.size);
    }
    c2.globalAlpha = 1;
  }

  // ---------- galaxy mode ----------
  function laneKey(a, b) { return a < b ? a + '-' + b : b + '-' + a; }

  function drawGalaxy(st, now) {
    pickables = [];
    const dist = R.cam.dist, deep = deepFade();
    // one projection pass shared by lanes + systems
    let proj = null;
    if (dist < LOD.systems) {
      proj = new Array(st.systems.length);
      for (const sys of st.systems) proj[sys.id] = project(sys);
    }
    if (dist < LOD.regions) drawRegions(st, now);
    if (dist < LOD.lanes) drawLanes(st, now, proj);
    if (R.showRange && dist < LOD.regions) drawRange(st);
    drawRouteDraft(st);

    // systems, far-to-near (beyond ~2400 ly the bubble is a single mote)
    if (proj) {
      const order = [];
      for (const sys of st.systems) {
        const p = proj[sys.id];
        if (!p || p.x < -80 || p.x > W + 80 || p.y < -80 || p.y > H + 80) continue;
        order.push({ sys: sys, p: p });
      }
      order.sort(function (a, b) { return b.p.depth - a.p.depth; });
      for (const o of order) drawSystem(st, o.sys, o.p, now);
    }
    if (deep > 0.25) drawBubbleMarker(st, now, U.clamp((deep - 0.25) / 0.5, 0, 1));
    drawBubbleBeacon(st, now);

    if (dist < LOD.rivalShips) drawRivalShips(st);
    if (dist < LOD.playerShips) drawPlayerShips(st, now);
    drawFx(st, now);
    drawCompass(st);
    drawOrbitGuide(now);
  }

  // The whole Milky Way, and your little life inside it. Drawn into the cached
  // background layer — it only changes when the camera does.
  function drawDeepInto(c2, deep) {
    // disk sheen under the points
    const c = project(GAL_CENTER);
    if (c) {
      const sheenR = Math.max(30, 30000 * c.s);
      const g = c2.createRadialGradient(c.x, c.y, 0, c.x, c.y, sheenR);
      g.addColorStop(0, 'rgba(226,232,242,' + 0.16 * deep + ')');
      g.addColorStop(0.25, 'rgba(200,210,224,' + 0.05 * deep + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c2.fillStyle = g;
      c2.fillRect(0, 0, W, H);
    }
    c2.fillStyle = '#cdd6e4';
    for (const p of galaxyPts) {
      const q = project(p);
      if (!q || q.x < -4 || q.x > W + 4 || q.y < -4 || q.y > H + 4) continue;
      c2.globalAlpha = p.mag * deep;
      c2.fillRect(q.x, q.y, p.size, p.size);
    }
    c2.globalAlpha = 1;
    // names appear once the shapes do
    const labelA = U.clamp((R.cam.dist - LOD.armLabels) / LOD.armLabelRange, 0, 1) * 0.55;
    if (labelA > 0.02) {
      c2.font = '600 9.5px "Segoe UI", sans-serif';
      c2.textAlign = 'center';
      for (const L of armLabels) {
        const q = project(L.p);
        if (!q || q.x < 20 || q.x > W - 20 || q.y < 20 || q.y > H - 20) continue;
        c2.fillStyle = L.p === GAL_CENTER ? 'rgba(226,232,242,' + labelA * 1.4 + ')' : 'rgba(140,150,165,' + labelA + ')';
        c2.fillText(L.t, q.x, q.y);
      }
      c2.textAlign = 'left';
    }
  }

  // Never lose home: when the bubble slips off-screen (or behind you), a quiet
  // accent chevron at the screen edge points the way back. [Home] recenters.
  function drawBubbleBeacon(st, now) {
    if (R.cam.dist < 300) return;
    const p = project({ x: 8, y: 0, z: 0 });
    const m = 26;
    const onScreen = p && p.x > -m && p.x < W + m && p.y > -m && p.y < H + m;
    if (onScreen) return;
    // direction from screen center toward the bubble (or its mirror if behind)
    let dx, dy;
    if (p) { dx = p.x - W / 2; dy = p.y - H / 2; }
    else {
      // behind the camera: project the reversed offset to get a usable bearing
      const q = project({ x: R.cam.tx - (8 - R.cam.tx), y: R.cam.ty * 2, z: R.cam.tz * 2 });
      if (!q) return;
      dx = W / 2 - q.x; dy = H / 2 - q.y;
    }
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len, ny = dy / len;
    const ex = U.clamp(W / 2 + nx * 9999, 34, W - 34);
    const ey = U.clamp(H / 2 + ny * 9999, 54, H - 70);
    const ang = Math.atan2(ny, nx);
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(now / 700));
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(ang);
    ctx.fillStyle = accent(0.9 * pulse);
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, 6); ctx.lineTo(-1, 0); ctx.lineTo(-4, -6); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = accent(0.75);
    ctx.font = '8.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOME', ex, ey + 16);
    ctx.textAlign = 'left';
  }

  // At galactic scale, everything you have ever done is this dot.
  function drawBubbleMarker(st, now, a) {
    const p = project({ x: 8, y: 0, z: 0 });
    if (!p) return;
    const r = Math.max(5, D.TUNE.bubbleR * p.s);
    const pulse = 0.75 + 0.25 * Math.sin(now / 900);
    ctx.strokeStyle = accent(0.55 * a * pulse);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = accent(0.9 * a);
    ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill();
    const name = (st.identity && st.identity.name ? st.identity.name : 'THE WEAVE').toUpperCase();
    ctx.fillStyle = accent(0.85 * a);
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, p.x, p.y - r - 16);
    ctx.fillStyle = 'rgba(140,150,165,' + 0.8 * a + ')';
    ctx.font = '8.5px "Segoe UI", sans-serif';
    ctx.fillText('EVERYONE YOU KNOW · ' + Math.round(D.TUNE.bubbleR * 2) + ' LY', p.x, p.y - r - 6);
    const threats = st.systems.filter(function (s) { return s.scourge === 1; }).length;
    const eaten = st.systems.filter(function (s) { return s.scourge === 2; }).length;
    if (threats || eaten) {
      ctx.fillStyle = 'rgba(255,77,87,' + 0.85 * a + ')';
      ctx.fillText((eaten ? eaten + ' SYSTEMS DARK' : '') + (threats ? (eaten ? ' · ' : '') + '⚠ ' + threats : ''), p.x, p.y + r + 14);
    }
    ctx.textAlign = 'left';
    pickables.push({ x: p.x, y: p.y, r: Math.max(12, r), sys: st.systems[st.homeId] });
  }

  function regionTint(type, a) {
    const t = { nebula: '170,182,204', flarezone: '204,179,154', oldstream: '154,163,181', verge: '181,154,168', reach: '181,160,142', quiet: '142,150,163' }[type] || '160,160,170';
    return 'rgba(' + t + ',' + a + ')';
  }
  function drawRegions(st, now) {
    // regions belong to bubble scale; they thin out as the galaxy takes over
    const rf = U.clamp(1 - (R.cam.dist - LOD.regionFade) / LOD.regionFadeRange, 0, 1);
    if (rf <= 0) return;
    for (const reg of st.regions) {
      const p = project(reg);
      if (!p) continue;
      const r = reg.r * p.s;
      const breathe = 1 + 0.04 * Math.sin(now / 4000 + reg.id);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * breathe);
      g.addColorStop(0, regionTint(reg.type, 0.05 * fog(p.depth) * rf));
      g.addColorStop(0.7, regionTint(reg.type, 0.025 * fog(p.depth) * rf));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * breathe, 0, Math.PI * 2); ctx.fill();
      // label at low zoom
      if (R.cam.dist > 120) {
        ctx.fillStyle = regionTint(reg.type, 0.4 * rf);
        ctx.font = '600 10px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(reg.name.toUpperCase(), p.x, p.y - r * 0.4);
        ctx.textAlign = 'left';
      }
    }
  }

  // Living Weave: lane-style cache — recomputed once per tick, read every frame.
  // Keyed by lane key; each entry: { t, weavedStrand } where t is the flow param [0,1].
  let laneStyleCache = {};
  let laneStyleTick = -1;

  function rebuildLaneStyleCache(st) {
    if (st.tick === laneStyleTick) return;
    laneStyleTick = st.tick;
    laneStyleCache = {};
    const lf = st.laneFlow || {};
    const sat = D.TUNE.laneFlowSaturation || 400;
    for (const k in lf) {
      const flow = lf[k];
      if (!isFinite(flow) || flow <= 0) continue;
      const t = U.clamp(Math.log(1 + flow) / Math.log(1 + sat), 0, 1);
      laneStyleCache[k] = { t: t, weaved: t > 0.6 };
    }
  }

  // Lerp two RGB triplet strings at ratio r; base is 'r,g,b', acc is hsl-derived.
  // We extract the accent's approximate RGB from HSL at the player's hue.
  function accentRGB(st) {
    const hue = (st && st.identity ? st.identity.hue : 195);
    // HSL(hue,55%,72%) -> approximate RGB via math
    const h = hue / 360, s = 0.55, l = 0.72;
    function hue2rgb(p, q, t2) {
      if (t2 < 0) t2 += 1; if (t2 > 1) t2 -= 1;
      if (t2 < 1 / 6) return p + (q - p) * 6 * t2;
      if (t2 < 1 / 2) return q;
      if (t2 < 2 / 3) return p + (q - p) * (2 / 3 - t2) * 6;
      return p;
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    };
  }

  function drawLanes(st, now, proj) {
    for (const k in laneHeat) { laneHeat[k] *= 0.995; if (laneHeat[k] < 0.02) delete laneHeat[k]; }
    for (const ship of st.ships) {
      if (ship.mode === 'travel' && ship.leg && !ship.leg.gate) {
        const k = laneKey(ship.leg.from, ship.leg.to);
        laneHeat[k] = Math.min(1, (laneHeat[k] || 0) + 0.02);
      }
    }

    // Rebuild per-lane weave style cache once per tick
    rebuildLaneStyleCache(st);
    const acc = accentRGB(st);

    ctx.lineCap = 'round';
    for (const sys of st.systems) {
      const a = proj[sys.id];
      if (!a) continue;
      for (const nb of sys.links) {
        if (nb < sys.id) continue;
        const o = st.systems[nb];
        const b = proj[nb];
        if (!b) continue;

        const corrupt = sys.scourge === 2 || o.scourge === 2;
        const weaveStyle = !corrupt ? laneStyleCache[laneKey(sys.id, nb)] : null;

        // LOD: ordinary dim lanes are culled beyond LOD.lanes, but high-weave lanes
        // persist further so the tapestry remains visible at galaxy scale.
        if (!weaveStyle || weaveStyle.t < 0.35) {
          if ((a.x < 0 && b.x < 0) || (a.x > W && b.x > W) || (a.y < 0 && b.y < 0) || (a.y > H && b.y > H)) continue;
        }
        const f = fog((a.depth + b.depth) / 2);
        const blocked = SW.worldevents.laneBlocked(st, sys.id, nb);
        const known = sys.discovered || o.discovered;
        const heat = laneHeat[laneKey(sys.id, nb)] || 0;
        if (corrupt) {
          ctx.strokeStyle = 'rgba(255,77,87,' + 0.18 * f + ')';
          ctx.setLineDash([3, 7]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        } else if (blocked) {
          ctx.strokeStyle = 'rgba(255,77,87,' + 0.30 * f + ')';
          ctx.setLineDash([8, 5]); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        } else if (sys.badlands || o.badlands) {
          // old weftlines into the dark: thin, broken, patient
          ctx.setLineDash([2, 6]);
          ctx.strokeStyle = 'rgba(190,200,216,' + ((known ? 0.05 + heat * 0.4 : 0.018) * f) + ')';
          ctx.lineWidth = 0.7 + heat * 1.5;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        } else if (weaveStyle && weaveStyle.t > 0) {
          // Living Weave: threads thicken and brighten with sustained flow
          const t = weaveStyle.t;
          // Lerp base gray (190,200,216) toward accent color
          const br = Math.round(190 + (acc.r - 190) * t);
          const bg = Math.round(200 + (acc.g - 200) * t);
          const bb = Math.round(216 + (acc.b - 216) * t);
          // alpha: from dim base up to 0.85 at full saturation
          const baseAlpha = known ? 0.07 + heat * 0.5 : 0.025;
          const weaveAlpha = baseAlpha + (0.85 - baseAlpha) * t;
          ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(' + br + ',' + bg + ',' + bb + ',' + weaveAlpha * f + ')';
          ctx.lineWidth = 0.8 + heat * 2 + t * 1.7; // hairline at t=0 → ~2.5px at t=1
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          // Second strand: "woven" doubling at t > 0.6 — subtle perpendicular offset
          if (weaveStyle.weaved) {
            const dx = b.x - a.x, dy = b.y - a.y;
            const len2 = Math.hypot(dx, dy) || 1;
            const nx2 = -dy / len2 * 1.4, ny2 = dx / len2 * 1.4; // offset ~1.4px perp
            const strandA = (t - 0.6) / 0.4 * 0.28 * f; // fades in smoothly
            ctx.strokeStyle = 'rgba(' + br + ',' + bg + ',' + bb + ',' + strandA + ')';
            ctx.lineWidth = 0.7 + t * 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x + nx2, a.y + ny2);
            ctx.lineTo(b.x + nx2, b.y + ny2);
            ctx.stroke();
          }
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(190,200,216,' + ((known ? 0.07 + heat * 0.5 : 0.025) * f) + ')';
          ctx.lineWidth = 0.8 + heat * 2;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    ctx.setLineDash([]);
    // gates shimmer
    const gates = st.systems.filter(function (s) { return s.buildings.indexOf('gate') >= 0; });
    for (let i = 0; i < gates.length; i++) {
      for (let j = i + 1; j < gates.length; j++) {
        const a = project(gates[i]), b = project(gates[j]);
        if (!a || !b) continue;
        ctx.strokeStyle = accent(0.18 + 0.1 * Math.sin(now / 300));
        ctx.setLineDash([2, 10]); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function drawRange(st) {
    const range = SW.ships.rangeOf(st);
    for (const a of SW.ships.rangeAnchors(st)) {
      const p = project(a);
      if (!p) continue;
      ctx.strokeStyle = accent(0.16 * fog(p.depth));
      ctx.setLineDash([5, 7]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, range * p.s, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawRouteDraft(st) {
    const draft = SW.ui.routeDraft;
    if (!draft || !draft.length) return;
    ctx.strokeStyle = 'rgba(230,237,243,0.65)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    draft.forEach(function (stop, i) {
      const p = project(st.systems[stop.sys]);
      if (!p) return;
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    if (draft.length > 1) {
      const p0 = project(st.systems[draft[0].sys]);
      if (p0) ctx.lineTo(p0.x, p0.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e6edf3';
    ctx.font = '700 10px sans-serif';
    draft.forEach(function (stop, i) {
      const p = project(st.systems[stop.sys]);
      if (p) ctx.fillText(String(i + 1), p.x + 9, p.y - 9);
    });
  }

  const tintCache = {};
  function specRGB(sys) {
    const cls = D.specClass(sys.spec);
    let rgb = tintCache[cls];
    if (!rgb) {
      const tint = (D.SPECTRAL[cls] || D.SPECTRAL.M).tint;
      const r = parseInt(tint.slice(1, 3), 16), g = parseInt(tint.slice(3, 5), 16), b = parseInt(tint.slice(5, 7), 16);
      // desaturate toward paper-white for the mono aesthetic
      const mix = 0.45;
      rgb = tintCache[cls] = Math.round(U.lerp(r, 226, mix)) + ',' + Math.round(U.lerp(g, 232, mix)) + ',' + Math.round(U.lerp(b, 240, mix));
    }
    return rgb;
  }
  function specTint(sys, f) { return 'rgba(' + specRGB(sys) + ',' + f + ')'; }

  // Glow sprites: radial gradients are the slowest thing Canvas 2D does per-call,
  // and we used to build ~260 of them per frame. Render each tint's halo once
  // to a small offscreen sprite and drawImage it scaled instead.
  const glowSprites = {};
  function glowSprite(rgb) {
    let sp = glowSprites[rgb];
    if (!sp) {
      sp = glowSprites[rgb] = document.createElement('canvas');
      sp.width = sp.height = 64;
      const c2 = sp.getContext('2d');
      const g = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(' + rgb + ',1)');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      c2.fillStyle = g;
      c2.fillRect(0, 0, 64, 64);
    }
    return sp;
  }
  function drawGlow(c2, rgb, x, y, r, alpha) {
    if (alpha <= 0.01 || r <= 0.5) return;
    c2.globalAlpha = alpha;
    c2.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2);
    c2.globalAlpha = 1;
  }

  function drawSystem(st, sys, p, now) {
    const f = fog(p.depth);
    const radius = Math.max(1.6, (1.6 + Math.min(6, Math.sqrt(Math.max(0, sys.pop)) * 1.1)) * p.s * 0.16);
    pickables.push({ x: p.x, y: p.y, r: radius, sys: sys });

    if (!sys.discovered) {
      ctx.strokeStyle = 'rgba(110,118,129,' + 0.35 * f + ')';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.4, radius * 0.8), 0, Math.PI * 2); ctx.stroke();
      return;
    }
    if (sys.scourge === 2) { drawCorrupted(st, sys, p, radius, f, now); return; }
    if (sys.wonder === 'blackhole') { drawBlackHole(st, sys, p, radius, f, now); return; }

    // far LOD: plain dots, no gradients — 260 stars stay crisp at any pull-back
    const far = R.cam.dist > LOD.simpleStars;
    if (far) {
      ctx.fillStyle = specTint(sys, 0.9 * f);
      ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
      if (sys.id === st.homeId) {
        ctx.strokeStyle = accent(0.8 * f);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.stroke();
      }
      if (sys.scourge === 1) {
        const blink = 0.45 + 0.55 * Math.abs(Math.sin(now / 280));
        ctx.fillStyle = 'rgba(255,77,87,' + blink + ')';
        ctx.fillRect(p.x - 1.2, p.y - 1.2, 2.4, 2.4);
      }
      return;
    }

    // glow + body (sprite-cached halo — see drawGlow)
    drawGlow(ctx, specRGB(sys), p.x, p.y, radius * 3.2, 0.5 * f);
    ctx.fillStyle = specTint(sys, 0.95 * f);
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();

    // husk: the Lattice ring
    if (sys.wonder === 'husk') {
      ctx.strokeStyle = accent(0.7 * f);
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const ph = now / 5000 + i * 2.1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, radius * 2.4, radius * (0.7 + 0.3 * Math.sin(ph)), ph, 0, Math.PI * 1.5);
        ctx.stroke();
      }
    }

    // presence ring: player accent solid, rivals gray dashed
    drawPresence(st, sys, p, radius, f);

    // threatened blink + countdown — the one true red
    if (sys.scourge === 1) {
      const blink = 0.45 + 0.55 * Math.abs(Math.sin(now / 280));
      ctx.strokeStyle = 'rgba(255,77,87,' + blink * f + ')';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(p.x, p.y, radius + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,77,87,' + blink + ')';
      ctx.font = '700 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⚠ ' + Math.max(0, sys.threatAt - st.tick), p.x, p.y - radius - 10);
      ctx.textAlign = 'left';
    }

    // selection / hover / home / bookmarks
    if (R.selectedSys === sys.id || R.hoverSys === sys.id) {
      ctx.strokeStyle = 'rgba(240,246,252,' + (R.selectedSys === sys.id ? 0.9 : 0.45) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2); ctx.stroke();
    }
    if (sys.id === st.homeId) {
      ctx.strokeStyle = accent(0.8 * f);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, radius + 7, 0, Math.PI * 2); ctx.stroke();
    }
    if (st.bookmarks && st.bookmarks.indexOf(sys.id) >= 0) {
      ctx.fillStyle = accent(0.9);
      ctx.font = '9px sans-serif';
      ctx.fillText('◈', p.x + radius + 4, p.y - radius - 2);
    }

    // labels: nearby or important
    const labeled = p.s > 6 || R.selectedSys === sys.id || R.hoverSys === sys.id || sys.id === st.homeId || sys.wonder;
    if (labeled) {
      const alpha = U.clamp((p.s - 3) / 8, 0.35, 1) * f;
      ctx.fillStyle = 'rgba(201,209,217,' + alpha + ')';
      ctx.font = (p.s > 10 ? '11px' : '10px') + ' "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sys.name, p.x, p.y + radius + 11);
      if (p.s > 9 && sys.type !== 'frontier') {
        ctx.fillStyle = 'rgba(110,118,129,' + alpha + ')';
        ctx.font = '8.5px "Segoe UI", sans-serif';
        ctx.fillText(D.SYS_TYPES[sys.type].icon + ' ' + D.SYS_TYPES[sys.type].name.toUpperCase(), p.x, p.y + radius + 21);
      }
      ctx.textAlign = 'left';
    }
  }

  function drawPresence(st, sys, p, radius, f) {
    const factions = Object.keys(sys.presence).filter(function (k) { return sys.presence[k] > 0.3; });
    if (!factions.length) return;
    let total = 0;
    for (const k of factions) total += sys.presence[k];
    let angle = -Math.PI / 2;
    for (const k of factions) {
      const frac = (sys.presence[k] / total) * Math.min(1, total / 4) * Math.PI * 2 * 0.9;
      if (k === 'player') {
        ctx.strokeStyle = accent(0.9 * f);
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = 'rgba(140,148,158,' + 0.8 * f + ')';
        ctx.setLineDash([2, 2]);
      }
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 4.5, angle, angle + frac);
      ctx.stroke();
      angle += frac + 0.12;
    }
    ctx.setLineDash([]);
  }

  function drawCorrupted(st, sys, p, radius, f, now) {
    const r = Math.max(2.2, radius + 1.5);
    const wob = 1 + 0.1 * Math.sin(now / 600 + sys.id);
    drawGlow(ctx, '210,55,66', p.x, p.y, r * 3 * wob, 0.2 * f);
    ctx.strokeStyle = 'rgba(255,77,87,' + (0.3 + 0.15 * Math.sin(now / 450 + sys.id)) * f + ')';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + now / 5000 + sys.id;
      const len = r * (1.5 + 0.5 * Math.sin(now / 700 + i * 2));
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(a) * r * 0.5, p.y + Math.sin(a) * r * 0.5);
      ctx.lineTo(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.fillStyle = '#16070a';
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,77,87,' + 0.55 * f + ')';
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    if (sys.id === st.scourge.originId) {
      ctx.fillStyle = 'rgba(255,77,87,0.85)';
      ctx.font = '700 9.5px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('THE SCOURGE', p.x, p.y + r + 12);
      if (st.scourge.delivered > 0) ctx.fillText('✺ ' + st.scourge.delivered + '/' + D.TUNE.panaceaToWin, p.x, p.y + r + 23);
      ctx.textAlign = 'left';
    }
  }

  function drawBlackHole(st, sys, p, radius, f, now) {
    const r = Math.max(3, radius * 1.4);
    // lensing ring
    ctx.strokeStyle = 'rgba(226,232,240,' + 0.65 * f + ')';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.7, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(226,232,240,' + 0.2 * f + ')';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 2.6, r * 0.7, now / 9000, 0, Math.PI * 2); ctx.stroke();
    // the hole
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,' + 0.85 * f + ')';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    if (R.selectedSys === sys.id || R.hoverSys === sys.id || p.s > 5) {
      ctx.fillStyle = 'rgba(201,209,217,' + 0.8 * f + ')';
      ctx.font = '10px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(sys.name, p.x, p.y + r * 1.7 + 12);
      ctx.textAlign = 'left';
    }
    if (R.selectedSys === sys.id) {
      ctx.strokeStyle = 'rgba(240,246,252,0.9)';
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawPlayerShips(st, now) {
    for (const ship of st.ships) {
      const pos = shipSmoothPos(st, ship);
      const p = project(pos);
      if (!p) continue;
      const f = fog(p.depth);
      const tr = trails[ship.id] = trails[ship.id] || [];
      if (ship.mode === 'travel') {
        if (!tr.length || U.dist(tr[tr.length - 1], pos) > 0.25) {
          tr.push({ x: pos.x, y: pos.y, z: pos.z });
          if (tr.length > 12) tr.shift();
        }
      } else if (tr.length) tr.shift();
      if (tr.length > 1) {
        for (let i = 1; i < tr.length; i++) {
          const a = project(tr[i - 1]), b = project(tr[i]);
          if (!a || !b) continue;
          ctx.strokeStyle = accent(0.35 * i / tr.length * f);
          ctx.lineWidth = 1.2 * i / tr.length + 0.3;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const sz = Math.max(2, (D.HULLS[ship.hull].cap >= 60 ? 4 : 3) * p.s * 0.12);
      let angle = 0;
      if (ship.mode === 'travel' && pos.from && pos.to) {
        const a = project(pos.from), b = project(pos.to);
        if (a && b) angle = Math.atan2(b.y - a.y, b.x - a.x);
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.fillStyle = R.selectedShip === ship.id ? '#ffffff' : accent(0.95 * f);
      ctx.beginPath();
      ctx.moveTo(sz * 1.7, 0); ctx.lineTo(-sz, sz * 0.75); ctx.lineTo(-sz * 0.45, 0); ctx.lineTo(-sz, -sz * 0.75);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      if (R.selectedShip === ship.id) {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(p.x, p.y, sz * 2.4, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '9.5px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(ship.name, p.x, p.y - sz * 2.6 - 3);
        ctx.textAlign = 'left';
      }
    }
  }

  function shipSmoothPos(st, ship) {
    if (ship.mode !== 'travel' || !ship.leg) {
      const sys = st.systems[ship.at];
      return { x: sys.x, y: sys.y, z: sys.z };
    }
    const from = st.systems[ship.leg.from], to = st.systems[ship.leg.to];
    const t = U.clamp((SW.game.smoothTick() - ship.leg.depart) / Math.max(1, ship.leg.arrive - ship.leg.depart), 0, 1);
    return { x: U.lerp(from.x, to.x, t), y: U.lerp(from.y, to.y, t), z: U.lerp(from.z, to.z, t), from: from, to: to };
  }

  function drawRivalShips(st) {
    const smooth = SW.game.smoothTick();
    ctx.fillStyle = 'rgba(140,148,158,0.8)';
    for (const rival of st.rivals) {
      if (!rival.alive) continue;
      for (const sh of rival.ships) {
        const from = st.systems[sh.from], to = st.systems[sh.to];
        const t = U.clamp((smooth - sh.depart) / Math.max(1, sh.arrive - sh.depart), 0, 1);
        if (t >= 1) continue;
        const p = project({ x: U.lerp(from.x, to.x, t), y: U.lerp(from.y, to.y, t), z: U.lerp(from.z, to.z, t) });
        if (!p) continue;
        const s = Math.max(1.5, 2 * p.s * 0.12);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
  }

  function drawFx(st, now) {
    while (SW.game.fx.length) {
      const f = SW.game.fx.shift();
      f.t0 = now;
      fxLive.push(f);
    }
    fxLive = fxLive.filter(function (f) {
      const age = (now - f.t0) / 1400;
      if (age >= 1) return false;
      if (f.kind === 'floater' && st.systems[f.sysId]) {
        const p = project(st.systems[f.sysId]);
        if (p) {
          ctx.globalAlpha = 1 - age;
          ctx.fillStyle = f.good === false ? 'rgba(255,160,168,1)' : 'rgba(226,232,240,1)';
          ctx.font = '700 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(f.text, p.x, p.y - 14 - age * 24);
          ctx.textAlign = 'left';
          ctx.globalAlpha = 1;
        }
      }
      return true;
    });
  }

  function drawCompass(st) {
    // coreward indicator + scale bar: quiet instruments in the corner
    const cx = W < 620 ? Math.max(72, W - 170) : 392, cy = H - 56;
    const dir = projectDir({ x: 1, y: 0, z: 0 });
    ctx.strokeStyle = 'rgba(110,118,129,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
    if (dir) {
      const a = Math.atan2(dir.y - cy, dir.x - cx);
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
      ctx.strokeStyle = 'rgba(201,209,217,0.9)';
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(110,118,129,0.8)';
    ctx.font = '8.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COREWARD', cx, cy + 30);
    // scale bar: picks a clean 1/2/5×10ⁿ ly unit that fits ~70px at any zoom
    const p0 = project({ x: R.cam.tx, y: R.cam.ty, z: R.cam.tz });
    if (p0 && p0.s > 0) {
      const raw = 70 / p0.s;
      const pow = Math.pow(10, Math.floor(Math.log10(raw)));
      const mant = raw / pow;
      const unit = (mant < 1.5 ? 1 : mant < 3.5 ? 2 : mant < 7.5 ? 5 : 10) * pow;
      const lyPx = p0.s * unit;
      const label = unit >= 1000 ? (unit / 1000) + ' KLY' : unit + ' LY';
      ctx.strokeStyle = 'rgba(110,118,129,0.7)';
      ctx.beginPath(); ctx.moveTo(cx + 40, cy + 14); ctx.lineTo(cx + 40 + lyPx, cy + 14); ctx.stroke();
      ctx.fillText(label, cx + 40 + lyPx / 2, cy + 26);
    }
    ctx.textAlign = 'left';
  }

  function drawOrbitGuide(now) {
    if (now > orbitGuideUntil || R.mode !== 'galaxy') return;
    const g = galacticGuideAxes(10);
    if (!g.center) return;
    const age = U.clamp((orbitGuideUntil - now) / 900, 0, 1);
    const cx = g.center.x, cy = g.center.y;
    ctx.save();
    ctx.globalAlpha = 0.25 + age * 0.55;
    ctx.strokeStyle = 'rgba(201,209,217,0.75)';
    ctx.fillStyle = 'rgba(201,209,217,0.75)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    drawGuideAxis(g.rim, g.core);
    drawGuideAxis(g.trail, g.spin);
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '700 9px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    labelGuide(g.core, 'CORE');
    labelGuide(g.rim, 'RIM');
    labelGuide(g.spin, 'SPIN');
    labelGuide(g.trail, 'TRAIL');
    ctx.restore();
  }

  function drawGuideAxis(a, b) {
    if (!a || !b) return;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  function labelGuide(p, text) {
    if (!p) return;
    ctx.fillText(text, p.x, p.y - 5);
  }

  // ---------- system view ----------
  function systemSkyScale() {
    return Math.max(2, Math.min(W || 900, H || 600) / ((D.TUNE.bubbleR || 90) * 2.35));
  }
  function systemSkyPointFor(base, other, cx, cy, scale) {
    if (!base || !other) return null;
    const dx = other.x - base.x, dy = other.y - base.y, dz = (other.z || 0) - (base.z || 0);
    const shape = R.systemOrbitShape();
    const ca = Math.cos(shape.rotation), sa = Math.sin(shape.rotation);
    const px = dx * ca - dy * sa;
    const py = (dx * sa + dy * ca) * shape.squash - dz * 0.55;
    return { x: cx + px * scale, y: cy + py * scale, depth: Math.hypot(dx, dy, dz) };
  }
  function drawSystemGalaxyBackdrop(st, sys, cx, cy) {
    const scale = systemSkyScale();
    ctx.save();
    ctx.strokeStyle = 'rgba(160,170,185,0.085)';
    ctx.lineWidth = 0.8;
    const shape = R.systemOrbitShape();
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.min(W, H) * 0.43, Math.min(W, H) * 0.43 * shape.squash, shape.rotation, 0, Math.PI * 2);
    ctx.stroke();
    for (const other of st.systems) {
      if (other.id === sys.id) continue;
      const p = systemSkyPointFor(sys, other, cx, cy, scale);
      if (!p || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
      const discovered = other.discovered;
      const a = other.id === st.homeId ? 0.28 : discovered ? 0.16 : 0.055;
      const size = other.wonder ? 1.8 : discovered ? 1.2 : 0.8;
      ctx.fillStyle = other.id === st.homeId ? accent(a) : 'rgba(201,209,217,' + a + ')';
      ctx.fillRect(p.x, p.y, size, size);
    }
    ctx.restore();
  }

  function drawSystemView(st, now) {
    bodyPickables = [];
    const sys = st.systems[R.systemId];
    if (!sys) { R.exitSystem(); return; }
    const data = SW.planets.get(st, R.systemId);
    const cx = W / 2 + R.systemPan.x, cy = H / 2 + 10 + R.systemPan.y;
    const t = SW.game.smoothTick();
    drawSystemGalaxyBackdrop(st, sys, cx, cy);

    // header
    ctx.fillStyle = 'rgba(201,209,217,0.9)';
    ctx.font = '600 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sys.name.toUpperCase(), cx, 30);
    ctx.fillStyle = 'rgba(110,118,129,0.9)';
    ctx.font = '10px "Segoe UI", sans-serif';
    const starDesc = data.stars.map(function (s2) { return (s2.suffix ? sys.cat + ' ' + s2.suffix : sys.cat) + ' · ' + s2.spec; }).join('   ');
    ctx.fillText(starDesc + (sys.region ? '   ·   ' + D.REGIONS[sys.region].name.toUpperCase() : ''), cx, 46);
    if (data.note) { ctx.fillText(data.note, cx, 62); }
    ctx.textAlign = 'left';

    const maxA = Math.max(1, data.bodies.length ? data.bodies[data.bodies.length - 1].a : 1);
    const scale = Math.min(W, H) * 0.40 * R.systemZoom / Math.sqrt(maxA + 0.4);
    function orbitR(a) { return Math.sqrt(a) * scale + 30; }
    const orbitShape = R.systemOrbitShape();
    const squash = orbitShape.squash; // orbital inclination from the viewer angle
    const viewRot = orbitShape.rotation;
    // rotate-then-squash: dragging slides bodies along their orbits while the
    // ellipses stay level — the camera orbits the system, the system never rolls
    function orbitPoint(a, r) {
      const aa = a + viewRot;
      return { x: cx + Math.cos(aa) * r, y: cy + Math.sin(aa) * r * squash };
    }

    // habitable zone annulus
    if (data.hz[1] > 0 && data.hz[0] < maxA * 1.4) {
      const r1 = orbitR(data.hz[0]), r2 = orbitR(Math.min(data.hz[1], maxA * 1.4));
      ctx.strokeStyle = 'rgba(160,170,185,0.10)';
      ctx.lineWidth = Math.max(2, r2 - r1);
      ctx.beginPath(); ctx.ellipse(cx, cy, (r1 + r2) / 2, (r1 + r2) / 2 * squash, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // star(s)
    if (sys.wonder === 'blackhole') {
      drawBlackHole(st, sys, { x: cx, y: cy, s: 12, depth: 50 }, 9, 1, now);
    } else {
      data.stars.forEach(function (star, i) {
        const off = data.stars.length > 1 ? 16 + i * 4 : 0;
        const sa = now / 3000 + i * Math.PI;
        const sp = orbitPoint(sa, off);
        const sx2 = sp.x, sy2 = sp.y;
        const cls = star.cls, tint = (D.SPECTRAL[cls] || D.SPECTRAL.M).tint;
        const sr = cls === 'D' ? 4 : cls === 'M' ? 7 : cls === 'III' ? 16 : 11;
        const g = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, sr * 4);
        g.addColorStop(0, tint + 'cc');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx2, sy2, sr * 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = tint;
        ctx.beginPath(); ctx.arc(sx2, sy2, sr, 0, Math.PI * 2); ctx.fill();
      });
    }

    // orbits + bodies
    for (const b of data.bodies) {
      const orad = orbitR(b.a);
      ctx.strokeStyle = 'rgba(160,170,185,0.16)';
      ctx.lineWidth = b.type === 'belt' ? 6 : 0.7;
      if (b.type === 'belt') ctx.strokeStyle = 'rgba(160,170,185,0.07)';
      ctx.beginPath(); ctx.ellipse(cx, cy, orad, orad * squash, 0, 0, Math.PI * 2); ctx.stroke();

      const angle = (t * 0.0022 / Math.max(0.02, b.period)) * Math.PI * 2 + b.a * 7;
      const bp = orbitPoint(angle, orad);
      const bx = bp.x, by = bp.y;
      if (b.type === 'belt') {
        // belt: stippled arc near the body's position
        ctx.fillStyle = 'rgba(180,190,205,0.5)';
        for (let k = 0; k < 26; k++) {
          const ba = (k / 26) * Math.PI * 2;
          const jitter = ((k * 7919) % 13) / 13 * 6 - 3;
          const pp = orbitPoint(ba, orad + jitter);
          ctx.fillRect(pp.x, pp.y, 1, 1);
        }
        drawBodySites(sys, b, bx, by, 8);
        bodyPickables.push({ x: bx, y: by, r: 8, body: b });
        continue;
      }
      const br = b.type === 'gas' ? 8 : b.type === 'icegiant' ? 6 : b.radius > 1.5 ? 5 : 3.5;
      const sel = R.selectedBody && R.selectedBody.name === b.name;
      const hov = R.hoverBody && R.hoverBody.name === b.name;
      ctx.fillStyle = b.type === 'terran' ? accent(0.95) :
        b.type === 'ocean' ? 'rgba(200,215,232,0.95)' :
        b.type === 'lava' ? 'rgba(232,170,160,0.95)' :
        b.type === 'gas' ? 'rgba(214,206,194,0.95)' :
        b.type === 'icegiant' ? 'rgba(196,208,224,0.95)' :
        b.type === 'carbon' ? 'rgba(150,150,160,0.95)' :
        'rgba(190,196,206,0.95)';
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      if (b.pop || b.settled) {
        ctx.strokeStyle = accent(0.9);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(bx, by, br + 3, 0, Math.PI * 2); ctx.stroke();
      }
      drawBodySites(sys, b, bx, by, br);
      if (sel || hov) {
        ctx.strokeStyle = 'rgba(240,246,252,' + (sel ? 0.95 : 0.5) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(bx, by, br + 5.5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(201,209,217,0.75)';
      ctx.font = '9.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      const shortName = b.real ? b.name : b.name.split(' ').pop();
      ctx.fillText(shortName, bx, by + br + 12);
      ctx.textAlign = 'left';
      bodyPickables.push({ x: bx, y: by, r: br + 4, body: b });
    }

    // your ships docked here
    const here = st.ships.filter(function (sh) { return sh.at === R.systemId; });
    if (here.length) {
      ctx.fillStyle = accent(0.9);
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲ ' + here.length + ' of your ships docked', cx, H - 64);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = 'rgba(110,118,129,0.8)';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('[ESC] back to the bubble  ·  click a body for details', cx, H - 46);
    ctx.textAlign = 'left';
  }

  return R;
})();
