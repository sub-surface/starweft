'use strict';
const path = require('path');
const FILES = ['util', 'data', 'events_data', 'galaxy', 'economy', 'ships', 'rivals', 'scourge', 'tech', 'story', 'game'];
for (const f of FILES) require(path.join(__dirname, '..', 'js', f + '.js'));
const SW = globalThis.SW;
const G = SW.game, A = SW.game.actions;

const st = G.newGame({ seed: 'smoke-6', difficulty: 'standard' });

function chooseAny(state) {
  if (!state.story.pending) return;
  const e = SW.story.pendingEvent(state);
  for (let i = 0; i < e.choices.length; i++) {
    const ch = e.choices[i];
    if (!ch.req || ch.req(state)) { SW.story.choose(state, i); return; }
  }
  SW.story.choose(state, 0);
}

for (let i = 0; i < 120; i++) {
  G.tick(st);
  chooseAny(st);
  if (st.tick % 5 === 0) {
    const ship = st.ships[0];
    const opsRaw = SW.economy.opportunities(st, 60);
    const ops = opsRaw.filter(function (o) {
      return SW.ships.inRange(st, st.systems[o.from]) && SW.ships.inRange(st, st.systems[o.to]);
    });
    console.log('t=' + st.tick, 'mode=' + ship.mode, 'at=' + (ship.at !== null ? st.systems[ship.at].name : '(transit)'),
      'cargo=' + JSON.stringify(ship.cargo), 'credits=' + Math.floor(st.credits),
      'opsRaw=' + opsRaw.length, 'opsInRange=' + ops.length,
      ops[0] ? ('top: ' + ops[0].c + ' ' + st.systems[ops[0].from].name + '->' + st.systems[ops[0].to].name + ' m=' + ops[0].margin.toFixed(1)) : 'none');
    if (ship.mode === 'idle' && !ship.routeId && !ship.mission) {
      const here = ops.find(function (o) { return o.from === ship.at; });
      if (here) {
        const b = A.shipBuy(st, ship.id, here.c, 999);
        const s = A.shipSend(st, ship.id, here.to, true);
        console.log('   BUY ' + here.c + ' -> ' + JSON.stringify(b) + ' SEND -> ' + JSON.stringify(s));
      } else if (ops.length) {
        const s = A.shipSend(st, ship.id, ops[0].from, false);
        console.log('   REPOSITION to ' + st.systems[ops[0].from].name + ' -> ' + JSON.stringify(s));
      }
    }
  }
}
