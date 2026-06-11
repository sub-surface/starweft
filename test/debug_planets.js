'use strict';
const path = require('path');
const FILES = ['util', 'data', 'starcat', 'lore', 'events_data', 'planets', 'galaxy', 'economy', 'ships', 'combat', 'rivals', 'scourge', 'tech', 'story', 'worldevents', 'game'];
for (const f of FILES) require(path.join(__dirname, '..', 'js', f + '.js'));
const SW = globalThis.SW;
const st = SW.game.newGame({ seed: 'smoke-2', difficulty: 'standard' });
for (const sys of st.systems.slice(0, 80)) {
  const data = SW.planets.get(st, sys.id);
  let lastA = 0, lastP = 0;
  data.bodies.forEach(function (b, i) {
    const bad = (b.a < lastA) || (b.period < lastP - 1e-9) || !isFinite(b.teq) || !isFinite(b.period);
    if (bad) {
      console.log('OFFENDER:', sys.name, '(spec ' + sys.spec + ', wonder ' + sys.wonder + ')');
      console.log('  body[' + i + ']:', JSON.stringify(b));
      console.log('  prev a=' + lastA + ' P=' + lastP);
      console.log('  all:', data.bodies.map(function (x) { return x.name + ' a=' + x.a + ' P=' + x.period; }).join(' | '));
    }
    lastA = b.a; lastP = b.period;
  });
}
console.log('done');
