/* STARWEFT perks.js — captain aptitudes, Fallout-style. DOM-free.
   Research grows the network; perks grow YOU. Points come from milestones
   (one each, once), spent on chains within four disciplines. Effects are
   read at their point of use via SW.perks.has — no central modifier soup. */
var SW = globalThis.SW = globalThis.SW || {};

SW.perks = (function () {
  const D = SW.data;
  const P = {};

  P.has = function (state, id) {
    return !!(state && state.perks && state.perks.indexOf(id) >= 0);
  };

  P.available = function (state, id) {
    const p = D.PERKS[id];
    if (!p || P.has(state, id)) return false;
    if (p.req && !P.has(state, p.req)) return false;
    return true;
  };

  P.buy = function (state, id) {
    const p = D.PERKS[id];
    if (!p) return { ok: false, msg: 'Unknown aptitude.' };
    if (P.has(state, id)) return { ok: false, msg: 'Already mastered.' };
    if (p.req && !P.has(state, p.req)) return { ok: false, msg: 'Requires ' + D.PERKS[p.req].name + ' first.' };
    if ((state.perkPoints || 0) < 1) return { ok: false, msg: 'No aptitude points. Milestones grant them.' };
    state.perkPoints--;
    state.perks = state.perks || [];
    state.perks.push(id);
    SW.game.emit('toast', { kind: 'good', text: p.icon + ' Aptitude mastered: ' + p.name + '.' });
    SW.game.emit('sfx', 'tech');
    return { ok: true };
  };

  // Milestones checked on a slow cadence; each grants one point, once.
  P.tick = function (state) {
    if (state.tick % 25 !== 0) return;
    state.milestones = state.milestones || {};
    for (const m of D.PERK_MILESTONES) {
      if (state.milestones[m.id]) continue;
      let hit = false;
      try { hit = m.test(state); } catch (e) { hit = false; }
      if (hit) {
        state.milestones[m.id] = state.tick;
        state.perkPoints = (state.perkPoints || 0) + 1;
        SW.game.emit('toast', { kind: 'good', text: '◆ Milestone — ' + m.label + ': +1 aptitude point.' });
        SW.game.emit('sfx', 'chime');
      }
    }
  };

  P.list = function (state) {
    return Object.keys(D.PERKS).map(function (id) {
      const p = D.PERKS[id];
      return {
        id: id, name: p.name, icon: p.icon, cat: p.cat, desc: p.desc, req: p.req,
        owned: P.has(state, id), available: P.available(state, id),
      };
    });
  };

  return P;
})();
