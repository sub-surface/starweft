/* STARWEFT tech.js — the branched research tree. DOM-free.
   Branches: core / logistics / frontier / vanguard / scourge, plus mutually
   exclusive Doctrines (pick one per run — path dependence is the point). */
var SW = globalThis.SW = globalThis.SW || {};

SW.tech = (function () {
  const D = SW.data;
  const T = {};

  T.has = function (state, id) { return state.tech.unlocked.indexOf(id) >= 0; };

  T.doctrine = function (state) {
    return state.tech.unlocked.find(function (id) { return D.TECHS[id] && D.TECHS[id].group === 'doctrine'; }) || null;
  };

  T.costOf = function (state, id) {
    const t = D.TECHS[id];
    if (!t) return 0;
    let cost = t.cost;
    const doc = T.doctrine(state);
    if (doc && D.DOCTRINE_DISCOUNT[doc] === t.branch) cost = Math.round(cost * 0.75);
    // Doctrine lean (chosen at run start): a gentle -12% to that branch BEFORE a
    // doctrine is formally chosen, so the pre-commitment pays off early without
    // replacing the real mid-run choice. Stops once an actual doctrine is taken.
    else if (!doc && state.doctrineLean && D.DOCTRINE_DISCOUNT[state.doctrineLean] === t.branch) cost = Math.round(cost * 0.88);
    if (id === 'deepdrives' && state.scourgeStance === 'exodus') cost = Math.round(cost * 0.75);
    return cost;
  };

  T.visible = function (state, id) {
    const t = D.TECHS[id];
    if (!t) return false;
    if (t.visibleIf && !state.story.flags[t.visibleIf]) return false;
    if (t.group === 'doctrine') {
      // doctrines surface once you've proven yourself, vanish once one is chosen (except the pick)
      if (state.tech.unlocked.length < D.DOCTRINE_UNLOCK_COUNT) return false;
      const doc = T.doctrine(state);
      if (doc && doc !== id) return false;
    }
    return true;
  };

  T.available = function (state, id) {
    const t = D.TECHS[id];
    if (!t || T.has(state, id) || !T.visible(state, id)) return false;
    if (t.group && T.doctrine(state)) return false; // one doctrine per run
    for (const req of t.req) if (!T.has(state, req)) return false;
    return true;
  };

  T.research = function (state, id) {
    const t = D.TECHS[id];
    if (!T.available(state, id)) return { ok: false, msg: 'Not available yet.' };
    const cost = T.costOf(state, id);
    if (state.research < cost) return { ok: false, msg: 'Needs ' + cost + ' research (have ' + Math.floor(state.research) + ').' };
    state.research -= cost;
    state.tech.unlocked.push(id);
    state.stats.techs = (state.stats.techs || 0) + 1;
    if (id === 'panacea') state.story.flags.panacea_ready = true;
    if (id === 'scourge2') state.story.flags.inoculated_hulls = true;
    if (t.group === 'doctrine') state.story.flags.doctrine_chosen = id;
    SW.game.emit('toast', { kind: 'good', text: '◇ Research complete: ' + t.name });
    SW.game.emit('sfx', 'tech');
    return { ok: true };
  };

  // Flat list for simple UIs.
  T.list = function (state) {
    return Object.keys(D.TECHS)
      .filter(function (id) { return T.visible(state, id); })
      .map(function (id) {
        const t = D.TECHS[id];
        const cost = T.costOf(state, id);
        return {
          id: id, name: t.name, cost: cost, desc: t.desc, req: t.req,
          branch: t.branch, tier: t.tier, group: t.group || null,
          owned: T.has(state, id), available: T.available(state, id),
          affordable: state.research >= cost,
        };
      });
  };

  // Tree layout for the canvas tech-tree view: columns by branch, rows by tier.
  T.tree = function (state) {
    const branches = ['logistics', 'core', 'frontier', 'vanguard', 'scourge'];
    const nodes = [], edges = [];
    const byBranchTier = {};
    for (const id in D.TECHS) {
      const t = D.TECHS[id];
      if (t.branch === 'doctrine') continue; // doctrines render as a separate row
      const key = t.branch + ':' + t.tier;
      byBranchTier[key] = byBranchTier[key] || [];
      byBranchTier[key].push(id);
    }
    for (const id in D.TECHS) {
      const t = D.TECHS[id];
      if (t.branch === 'doctrine') continue;
      const col = branches.indexOf(t.branch);
      const peers = byBranchTier[t.branch + ':' + t.tier];
      const slot = peers.indexOf(id);
      nodes.push({
        id: id, name: t.name, branch: t.branch, tier: t.tier,
        col: col, slot: slot, slots: peers.length,
        owned: T.has(state, id), available: T.available(state, id),
        visible: T.visible(state, id), cost: T.costOf(state, id),
        affordable: state.research >= T.costOf(state, id),
      });
      for (const req of t.req) edges.push([req, id]);
    }
    const doctrines = ['doc_mercantile', 'doc_wayfarer', 'doc_vanguard'].map(function (id) {
      const t = D.TECHS[id];
      return {
        id: id, name: t.name, desc: t.desc, cost: T.costOf(state, id),
        owned: T.has(state, id), available: T.available(state, id), visible: T.visible(state, id),
        affordable: state.research >= T.costOf(state, id),
      };
    });
    return { nodes: nodes, edges: edges, doctrines: doctrines, branches: branches };
  };

  return T;
})();
