/* STARWEFT signals.js — the beacon model (SPEC[UI-SIGNALS]). DOM-free.

   One derivation shared by three consumers: render.js draws beacons at the
   systems they concern (the map tells you, not the topbar), ui.js folds the
   same list into the strip's overflow counter, and the edge compass (F6)
   points at whatever falls off-screen. The strip stops being the place
   alerts live and becomes the place their *count* lives.

   Kinds (glyph, urgency per the ratified table):
     threat   △  urgent, red      — scourge warning at a discovered system
     stranded ▲  slow, ink-dim    — a ship out of upkeep
     hail     ◌  steady, accent   — a signal waiting, when it names a system
     board    ◈  gentle, accent   — open Guild-board offers at a destination
     boundary ◈◈ strong, radiates — an act boundary open at the Heart

   Hails that name no system stay as strip chips (a conversation with no
   place has no beacon). Pure reads, no mutation, headless-testable. */
var SW = globalThis.SW = globalThis.SW || {};

SW.signals = (function () {
  const SG = {};

  // list(state) -> [{sys, kind, glyph, urgent, n, shipId?, hailKey?}]
  SG.list = function (state) {
    const out = [];
    if (!state || !state.systems) return out;

    const offers = {};
    for (const o of (state.board || [])) offers[o.to] = (offers[o.to] || 0) + 1;

    for (const sys of state.systems) {
      if (sys.scourge === 1 && sys.discovered) out.push({ sys: sys.id, kind: 'threat', glyph: '△', urgent: true, n: 1 });
      if (offers[sys.id] && sys.discovered && sys.scourge !== 2) out.push({ sys: sys.id, kind: 'board', glyph: '◈', urgent: false, n: offers[sys.id] });
    }

    const strandedAt = {};
    for (const sh of (state.ships || [])) {
      if (!sh.stranded) continue;
      const at = (sh.mode === 'travel' && sh.leg) ? sh.leg.to : sh.at;
      if (at === null || at === undefined || !state.systems[at]) continue;
      if (!strandedAt[at]) {
        strandedAt[at] = { sys: at, kind: 'stranded', glyph: '▲', urgent: false, n: 0, shipId: sh.id };
        out.push(strandedAt[at]);
      }
      strandedAt[at].n++;
    }

    const hails = (state.story && state.story.hails) || [];
    for (const h of hails) {
      const sysId = h.ctx && (typeof h.ctx.sys === 'number' ? h.ctx.sys
        : (typeof h.ctx.sysId === 'number' ? h.ctx.sysId : null));
      if (sysId === null || sysId === undefined || !state.systems[sysId]) continue;
      out.push({ sys: sysId, kind: 'hail', glyph: '◌', urgent: false, n: h.count || 1, hailKey: h.key });
    }

    if (SW.acts && SW.acts.active(state) && state.acts.boundary) {
      out.push({ sys: state.homeId, kind: 'boundary', glyph: '◈◈', urgent: false, n: 1 });
    }
    return out;
  };

  // Hails with no system anchor: these keep their strip chips.
  SG.unanchoredHails = function (state) {
    const hails = (state && state.story && state.story.hails) || [];
    return hails.filter(function (h) {
      const sysId = h.ctx && (typeof h.ctx.sys === 'number' ? h.ctx.sys
        : (typeof h.ctx.sysId === 'number' ? h.ctx.sysId : null));
      return sysId === null || sysId === undefined || !(state.systems && state.systems[sysId]);
    });
  };

  // Strip overflow counter: totals per kind, stable order, boundary excluded
  // (the act chip already owns that story).
  SG.counts = function (state) {
    const c = {};
    for (const b of SG.list(state)) {
      if (b.kind === 'boundary') continue;
      c[b.kind] = (c[b.kind] || 0) + (b.kind === 'board' ? 1 : b.n);
    }
    return c;
  };

  return SG;
})();
