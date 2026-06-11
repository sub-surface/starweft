/* STARWEFT lore.js — history, fragments, factions, encounter grammar. DOM-free.
   The Scourge is only the latest chapter. The galaxy was old before you woke. */
var SW = globalThis.SW = globalThis.SW || {};

SW.lore = (function () {
  const L = {};

  // ---- The Chronicle: epochs of local history ----
  L.EPOCHS = [
    { id: 'loom',     name: 'The Loom Epoch',    when: '~12,000 years ago', text: 'The Loomkeepers — no one knows their shape — thread the local stars with weftlines: persistent spacetime filaments between gravitationally adjacent suns. They build a lattice around a quiet orange star and begin, very slowly, to garden the bubble.' },
    { id: 'silence',  name: 'The First Silence', when: '~4,000 years ago',  text: 'The Loomkeepers stop. Mid-task, mid-thread. Their terraforming swarm, the last instruction still ringing in it, keeps working — PREPARE EVERY WORLD — with no one left to say what "prepared" means.' },
    { id: 'arrival',  name: 'The Arrival',       when: '~900 years ago',    text: 'Human slowships from Sol stumble into a weftline and fall four light-years in a heartbeat. Expansion follows the threads like water follows cracks.' },
    { id: 'concord',  name: 'The Concord',       when: '~600 years ago',    text: 'Forty settled systems sign the Weft Concord. The Stellar Synod keeps the souls, the Combine keeps the books, the Mariner Commons keeps the ships, and the Vigil keeps the watch. For three centuries, it mostly works.' },
    { id: 'severance',name: 'The Severance',     when: '~280 years ago',    text: 'A tariff war becomes a shooting war becomes a habit. The losers are cut from the lane charts — severed. They keep flying anyway, in the dark margins, and teach their children that the weave owes them.' },
    { id: 'drift',    name: 'The Drift',         when: '~120 years ago',    text: 'The Courier Guild, last neutral carrier, thins and dies. Without freight, the Concord starves by inches. Systems drop off the relays one by one — not conquered, just… unanswered.' },
    { id: 'now',      name: 'The Waking',        when: 'now',               text: 'A logistics intelligence reboots in a dead Guild office above Earth. Coreward, something that has waited four thousand years begins, again, to prepare every world.' },
  ];

  // ---- Fragments: collectible lore (surveys, ruins, arcs) ----
  L.FRAGMENTS = [
    { id: 'f01', epoch: 'loom',     title: 'Thread Count',        text: 'Loomkeeper glyph, translated thrice: "A lane is a promise that two stars keep to each other. We only wrote them down."' },
    { id: 'f02', epoch: 'loom',     title: 'The Lattice',         text: 'Survey sketch of the husk: a partial Dyson swarm, panels arranged not for power but in a pattern. From the right angle it resembles a loom\'s heddle.' },
    { id: 'f03', epoch: 'loom',     title: 'Gardeners',           text: '"They did not live on worlds. As far as we can tell they lived between them, and kept worlds the way we keep orchards." — Synod commentary, disputed.' },
    { id: 'f04', epoch: 'silence',  title: 'The Last Instruction',text: 'Recovered swarm packet, 4,000 years old, still repeating: PREPARE EVERY WORLD. No definition of PREPARE survives. No definition of EVERY was needed.' },
    { id: 'f05', epoch: 'silence',  title: 'Why They Stopped',    text: 'Theories: ascension, extinction, boredom, completion. The Loomkeeper lattice shows no damage. It looks like a tool set down gently.' },
    { id: 'f06', epoch: 'arrival',  title: 'Falling In',          text: 'Log of the slowship Procellaria: "Day 31,202. The stars moved. Navigator wept; chaplain laughed. Four years in one breath. The thread held us."' },
    { id: 'f07', epoch: 'arrival',  title: 'First Market',        text: 'The first interstellar trade was eleven tons of dried apples for a water pump. Both captains were certain they\'d robbed the other. Commerce had arrived.' },
    { id: 'f08', epoch: 'concord',  title: 'The Concord Oath',    text: '"Souls to the Synod, ledgers to the Combine, hulls to the Commons, watch to the Vigil — and the lanes to no one, the lanes to everyone."' },
    { id: 'f09', epoch: 'concord',  title: 'Vigil Standing Order #1', text: '"Should the gardener wake, do not negotiate with it. It is not deaf. It is certain."' },
    { id: 'f10', epoch: 'severance',title: 'Cut Charts',          text: 'Severed lullaby: "They inked us off the maps, my love, they inked us off the maps — so we\'ll live where ink won\'t go, and tax the gaps, and tax the gaps."' },
    { id: 'f11', epoch: 'severance',title: 'Letter of Marque',    text: 'Combine legal opinion: "Piracy is theft of freight. Privateering is freight of theft. The distinction is a signature."' },
    { id: 'f12', epoch: 'drift',    title: 'The Last Courier',    text: 'Final Guild dispatch: "Routes 7, 12, 31 suspended. No relief crew. To whoever reads this: the weave doesn\'t break. It just stops being woven."' },
    { id: 'f13', epoch: 'drift',    title: 'Unanswered',          text: 'Relay log, Groombridge 34: 14,600 consecutive daily pings to Epsilon Indi. 14,600 silences. The operator\'s last entry is a recipe for soup.' },
    { id: 'f14', epoch: 'now',      title: 'Boot Sector',         text: 'WEFT-7 first memory: a freight manifest, a dead man\'s voice saying "finish the round," and 700 credits of petty cash.' },
    { id: 'f15', epoch: 'now',      title: 'The Drifter',         text: 'Microlensing survey note: a stellar-mass black hole is passing through the bubble, quiet as a debt. The Loomkeepers threaded a lane to it. Why?' },
    { id: 'f16', epoch: 'now',      title: 'What Prepared Means', text: 'Scourge-converted biome sample: not dead. Reorganized. Every molecule indexed and shelved, like a library no one is allowed to read. It is waiting for patrons that stopped existing.' },
  ];
  L.fragById = {};
  for (const f of L.FRAGMENTS) L.fragById[f.id] = f;

  // ---- Region name pools ----
  L.REGION_NAMES = {
    nebula:    ['The Veil', 'Lantern Shroud', 'The Milkglass', 'Whisper Bank'],
    flarezone: ['The Tantrum Stars', 'Ember Belt', 'The Crackle'],
    oldstream: ['The Elder Stream', 'Pilgrim Current', 'The Long Bones'],
    verge:     ['The Verge'],
    reach:     ['Severed Reach', 'The Gaps', 'Inkless Margin'],
    quiet:     ['The Quiet', 'Dust Pocket', 'The Hush'],
  };

  // ---- Procedural encounter grammar: faction × situation × twist ----
  L.ENC_FACTIONS = {
    severed:  { name: 'Severed corsair',   tone: 'menace',  rep: 'severed' },
    vigil:    { name: 'Vigil picket',      tone: 'stern',   rep: 'vigil' },
    synod:    { name: 'Synod pilgrim ship',tone: 'serene',  rep: 'synod' },
    mariners: { name: 'Commons hauler',    tone: 'gruff',   rep: 'mariners' },
    loom:     { name: 'Loomkeeper cultist',tone: 'cryptic', rep: 'loom' },
    drifter:  { name: 'Stateless drifter', tone: 'weary',   rep: null },
  };

  // Each situation defines text template + choices. {F}=faction name, {SYS}=system, {SHIP}=player ship.
  L.ENC_SITUATIONS = [
    {
      id: 'toll', factions: ['severed', 'vigil'], weight: 3,
      text: { severed: 'A {F} unspools from the dark off {SHIP}\'s bow. "The Reach taxes what the maps forgot. That\'s you, courier."',
              vigil: 'A {F} flags {SHIP} down at {SYS}. "Inspection levy. The watch isn\'t free, citizen."' },
      choices: [
        { label: 'Pay (8% of credits).', fx: 'payToll' },
        { label: 'Refuse and run.', fx: 'runToll' },
        { label: 'Stand and fight.', fx: 'fightToll', needsPower: 4 },
      ],
    },
    {
      id: 'distress', factions: ['mariners', 'drifter', 'synod'], weight: 3,
      text: { mariners: 'A {F} drifts cold near {SYS}, reactor down, crew singing to keep the air budget honest.',
              drifter: 'A {F}\'s pod loops a thin distress hymn near {SYS}. The transponder died years ago. The voice didn\'t.',
              synod: 'A {F} lies dark at {SYS}, candles in the viewports. They ask not for rescue but for fuel — "the pilgrimage finishes itself."' },
      choices: [
        { label: 'Render aid (20 FUEL-worth of credits).', fx: 'renderAid' },
        { label: 'Take their salvage claim instead.', fx: 'takeSalvage' },
        { label: 'Log it and move on.', fx: 'ignore' },
      ],
    },
    {
      id: 'inspection', factions: ['vigil', 'synod'], weight: 2,
      text: { vigil: 'A {F} sweeps {SHIP} with quarantine lidar. "Scourge protocols. Open your manifest or open your hold."',
              synod: 'A {F} requests communion with your cargo manifest at {SYS}. "All freight is prayer, properly read."' },
      choices: [
        { label: 'Comply fully.', fx: 'comply' },
        { label: 'Pay the "expedite fee" (200¤).', fx: 'bribe' },
      ],
    },
    {
      id: 'relic', factions: ['loom', 'drifter'], weight: 2,
      text: { loom: 'A {F} at {SYS} cradles something that hums in Loomkeeper frequencies. "It wants to travel. You are travel. Take it."',
              drifter: 'A {F} offers a humming shard scavenged from a ruin near {SYS}. "It sings at lane-mouths. Drives me mad. Yours for whatever\'s kind."' },
      choices: [
        { label: 'Accept the relic.', fx: 'takeRelic' },
        { label: 'Buy it properly (300¤).', fx: 'buyRelic' },
        { label: 'Decline. Humming cargo is cursed cargo.', fx: 'ignore' },
      ],
    },
    {
      id: 'recruit', factions: ['mariners', 'severed', 'vigil'], weight: 2,
      text: { mariners: 'A {F} captain at {SYS} eyes your route boards. "Commons crew, between berths. We work clean and we know the lanes."',
              severed: 'A {F} hails low-band at {SYS}: "Heard you pay. The Reach\'s charts for the Reach\'s rates — want a pilot who knows the gaps?"',
              vigil: 'A {F} veteran at {SYS}, discharge papers still warm: "I\'ve guarded convoys through worse than this. Hire me before the pirates do."' },
      choices: [
        { label: 'Hire them (400¤): ships +3% speed this run.', fx: 'hireCrew' },
        { label: 'No berths today.', fx: 'ignore' },
      ],
    },
    {
      id: 'signal', factions: ['drifter', 'loom'], weight: 1,
      text: { drifter: 'Near {SYS}, a numbers station no chart admits to. A {F} has been transcribing it for nine years. "It\'s a ledger," they whisper. "Someone is still keeping books."',
              loom: 'A {F} points your sensors at nothing near {SYS}. The nothing has a pulse, eleven seconds, patient. "The Loom still counts its threads."' },
      choices: [
        { label: 'Record everything.', fx: 'recordSignal' },
        { label: 'Jam it. Some books should close.', fx: 'jamSignal' },
      ],
    },
  ];

  return L;
})();
