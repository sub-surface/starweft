/* STARWEFT main.js — boot. Browser only. */
(function () {
  const G = SW.game;

  // Wire sim → UI hooks
  G.handlers.toast = function (t) { SW.ui.toast(t); };
  G.handlers.event = function () { SW.ui.showEvent(); };
  G.handlers.sfx = function (name) { SW.audio.sfx(name); };
  G.handlers.gameover = function (go) { SW.ui.showGameOver(go); };
  G.handlers.objective = function () { /* topbar refresh picks it up */ };

  SW.render.init(document.getElementById('map'));
  SW.ui.init();
  G.startLoop();

  // Boot into the title screen; a fresh paused world shimmers behind it.
  G.newGame({ difficulty: 'standard' });
  SW.ui.afterLoad();
  SW.ui.showTitle();
})();
