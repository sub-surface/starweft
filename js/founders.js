/* STARWEFT founders.js — the Founder's rule-bends (SPEC[RUN-FOUNDERS]). DOM-free.

   A Founder is chosen once, at a Focused run's start, and stored as the
   plain id `state.founder`. Effects that fit SW.acts.mods()'s existing
   Commission x Boon bag (firstlightX2, maxActiveBonus) are folded straight
   into it there; the handful that don't (tier bump, board-slot penalty,
   bust-forfeit) live here as small pure helpers pledges.js calls at its
   existing seams. No new state beyond the one id — additive, no
   SAVE_VERSION bump, defensive at every read (an old save with no founder
   behaves exactly as if none were chosen). */
var SW = globalThis.SW = globalThis.SW || {};

SW.founders = (function () {
  const F = {};
  const D = SW.data;

  F.current = function (state) { return (state && D.FOUNDERS[state.founder]) || null; };
  F.list = function () { return D.FOUNDER_IDS.map(function (id) { return Object.assign({ id: id }, D.FOUNDERS[id]); }); };

  // Rockhopper: raw goods count one tier higher for TONNAGE (pledges.js's
  // P.chips looks this up when pricing a commodity's chip rate).
  F.chipTier = function (state, c, baseTier) {
    const f = F.current(state);
    if (f && f.tierBumpComms && f.tierBumpComms.indexOf(c) >= 0) return baseTier + 1;
    return baseTier;
  };

  // Rockhopper: the board runs one offer thinner (SPEC[RUN-FOUNDERS] liability;
  // under the current pledge model every destination is already a
  // population center by definition — see eligibleDest — so this reads as
  // a flat board-wide reduction rather than a per-system slot count).
  F.boardSlotPenalty = function (state) {
    const f = F.current(state);
    return (f && f.boardSlotPenalty) || 0;
  };

  // Underwriter: a bust forfeits double the bond — the extra amount beyond
  // the bond already lost by simply not being returned at pledges.js's bust().
  F.bustForfeitExtra = function (state, bond) {
    const f = F.current(state);
    if (f && f.bustForfeitMult && f.bustForfeitMult > 1) return Math.round(bond * (f.bustForfeitMult - 1));
    return 0;
  };

  return F;
})();
