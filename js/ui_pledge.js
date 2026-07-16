/* STARWEFT ui_pledge.js — the PLEDGE surface (board + manifest). DOM allowed.
   Renders into the dock's Pledges tab: your live WEAVE and THREAD at the top,
   the manifest of pledges you're holding (with their deadlines), and the Guild
   board of open offers you can take. Every action goes through A.takePledge /
   A.abandonPledge; this module only reads state and paints. */
var SW = globalThis.SW = globalThis.SW || {};

SW.uiPledge = (function () {
  const P = {};
  const U = SW.util, D = SW.data;
  function st() { return SW.game.state; }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  function comm(c) { return D.COMMODITIES[c] ? (D.COMMODITIES[c].icon + ' ' + D.COMMODITIES[c].name) : c; }

  // A compact, always-honest read of what the next completion would score.
  P.threadBreakdown = function (s) {
    const PG = SW.pledges; PG.ensure(s);
    const others = Math.max(0, s.pledges.length - 1);
    const streakBonus = Math.min(D.TUNE.pledgeStreakCap, s.pledgeStreak * D.TUNE.pledgeStreakThread);
    const thread = 1 + others * D.TUNE.pledgeConcurrentThread + streakBonus;
    return { thread: thread, others: others, streakBonus: streakBonus };
  };

  // The act HUD + the boundary (bank / push-with-boon / summit) banner.
  function actBlock(s) {
    const AC = SW.acts, a = s.acts;
    const com = D.COMMISSIONS[a.commission] || { name: a.commission, line: '' };
    const prog = Math.round(AC.progress(s)), quota = a.quota, left = AC.ticksLeft(s);
    const pct = Math.max(0, Math.min(100, Math.round(prog / Math.max(1, quota) * 100)));
    let h = '<div class="listItem" data-info="ui:acts" style="border-color:var(--accent)">';
    h += '<div class="row"><span class="title grow">Act ' + AC.roman(a.n) + ' · ' + esc(com.name) + '</span>' +
      '<span class="sub num">' + (a.boundary ? '◈ met' : left + ' ticks') + '</span></div>';
    h += '<div class="row"><span class="sub grow">' + esc(com.line) + '</span></div>';
    // quota progress bar (pure CSS via inline width; monochrome + accent)
    h += '<div class="row"><span class="sub num grow">' + U.fmt(prog) + ' / ' + U.fmt(quota) + ' WEAVE</span></div>';
    h += '<div style="height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden;margin:2px 0 4px">' +
      '<div style="height:100%;width:' + pct + '%;background:var(--accent)"></div></div>';
    // owned boons (your build so far)
    if ((a.boons || []).length) {
      h += '<div class="row"><span class="sub grow">Boons: ' + a.boons.map(function (id) { return esc((D.BOONS[id] || {}).name || id); }).join(' · ') + '</span></div>';
    }
    // the boundary: the run's defining choice
    if (a.boundary) {
      if (a.summit) {
        h += '<div class="row"><span class="title grow" style="color:var(--accent)">◈ THE SUMMIT HOLDS</span></div>';
        h += '<div class="row"><span class="sub grow">Retire in good standing, or graduate into the open Long Weave — keep everything you built, lose the clock.</span></div>';
        h += '<div class="row"><button class="primary" data-act="bankThread" title="End the run in glory — banked as a completed campaign">retire ✦</button>' +
          '<button class="primary" data-act="graduateThread" title="Drop the ladder and continue in the open sandbox with everything intact">graduate →</button></div>';
      } else {
        h += '<div class="row"><span class="title grow" style="color:var(--accent)">◈ BANK or PUSH</span></div>';
        h += '<div class="row"><button class="primary" data-act="bankThread" title="End the run now, in good standing (a clean win)">bank ✦</button>' +
          '<span class="sub grow">…or draft a Boon and push into Act ' + AC.roman(a.n + 1) + ' — quota ' + U.fmt(AC.quotaOf(a.n + 1)) + '.</span></div>';
        for (const id of (a.draft || [])) {
          const bn = D.BOONS[id] || { name: id, line: '' };
          h += '<div class="listItem"><div class="row"><span class="title grow">' + esc(bn.name) + '</span>' +
            '<button class="primary" data-act="pushThread" data-boon="' + id + '" title="Draft this boon and push on">push ▸</button></div>' +
            '<div class="row"><span class="sub grow">' + esc(bn.line) + '</span></div></div>';
        }
      }
    }
    h += '</div>';
    return h;
  }

  P.renderPledges = function (body) {
    const s = st();
    if (!s) { body.innerHTML = ''; return; }
    const PG = SW.pledges; PG.ensure(s);
    const bd = P.threadBreakdown(s);
    const trust = PG.trust(s);
    let html = '';

    // ---- the Act Ladder HUD (focused runs only) ----
    if (SW.acts && SW.acts.active(s)) html += actBlock(s);

    // headline: WEAVE + live THREAD
    html += '<div class="row" data-info="ui:weave"><span class="title grow">◈ WEAVE</span>' +
      '<span class="num" style="font-size:1.2em">' + U.fmt(s.weave || 0) + '</span></div>';
    html += '<div class="row"><span class="sub grow">THREAD next ×' + bd.thread.toFixed(1) +
      '  <span class="sub">(1 base' + (bd.others ? ' +' + (bd.others * D.TUNE.pledgeConcurrentThread).toFixed(1) + ' held' : '') +
      (bd.streakBonus ? ' +' + bd.streakBonus.toFixed(1) + ' streak' : '') + ')</span></span>' +
      '<span class="sub num">streak ' + (s.pledgeStreak || 0) + '</span></div>';
    if (trust < 1) html += '<div class="row"><span class="sub grow">Guild trust ' + Math.round(trust * 100) + '% — busts dim the board.</span></div>';

    // the manifest — pledges you are holding
    html += '<h4 data-info="ui:pledges">◈ Your manifest (' + s.pledges.length + '/' + PG.maxActive(s) + ')</h4>';
    if (!s.pledges.length) {
      html += '<div class="row"><span class="sub grow">No pledges held. Take one from the board below — every crate you land on it scores WEAVE.</span></div>';
    } else {
      for (const p of s.pledges) {
        const left = PG.ticksLeft(s, p);
        const urgent = left < D.TUNE.pledgeWindowBase * 0.3;
        const prog = Math.min(p.qty, Math.floor(p.progress));
        html += '<div class="listItem' + (urgent ? ' bad' : '') + '">' +
          '<div class="row"><span class="title grow">' + p.qty + '× ' + comm(p.c) + ' → ' + esc(p.toName) + '</span>' +
          '<span class="num">' + U.fmt(Math.round(p.chips * bd.thread)) + ' WEAVE</span></div>' +
          '<div class="row"><span class="sub num grow">' + prog + '/' + p.qty + ' delivered · ' +
          (urgent ? '⧗ ' : 'due in ') + left + ' ticks · bond ' + U.fmt(p.bond) + '¤</span>' +
          '<button data-act="focusSys" data-sys="' + p.to + '" title="Centre the map on ' + esc(p.toName) + '">locate</button>' +
          '<button data-act="abandonPledge" data-id="' + p.id + '" title="Drop this pledge — forfeits the bond and snaps your streak">abandon</button>' +
          '</div></div>';
      }
    }

    // the Guild board — open offers
    html += '<h4 data-info="ui:pledges">◈ The Guild board</h4>';
    if (!s.board || !s.board.length) {
      html += '<div class="row"><span class="sub grow">The board is quiet. Chart more settled worlds and offers will post.</span></div>';
    } else {
      const full = s.pledges.length >= PG.maxActive(s);
      // preview THREAD as if one more pledge were held
      const nextThread = 1 + Math.max(0, s.pledges.length) * D.TUNE.pledgeConcurrentThread + bd.streakBonus;
      for (const o of s.board) {
        const canAfford = s.credits >= o.bond;
        const dis = full || !canAfford;
        const weaveIf = Math.round(o.chips * nextThread);
        html += '<div class="listItem">' +
          '<div class="row"><span class="title grow">' + o.qty + '× ' + comm(o.c) + ' → ' + esc(o.toName) + '</span>' +
          '<span class="num" title="WEAVE if taken now, at ×' + nextThread.toFixed(1) + '">+' + U.fmt(weaveIf) + '</span></div>' +
          '<div class="row"><span class="sub num grow">' + o.hops + ' hops · ' + o.window + '-tick window · fare ' + U.fmt(o.fare) + '¤ · bond ' + U.fmt(o.bond) + '¤</span>' +
          '<button class="primary" data-act="takePledge" data-id="' + o.id + '"' + (dis ? ' disabled' : '') +
          ' title="' + (full ? 'Manifest full' : (canAfford ? 'Seal this pledge (escrow the bond)' : 'Cannot cover the bond')) + '">take</button>' +
          '</div></div>';
      }
    }

    body.innerHTML = html;
  };

  return P;
})();
