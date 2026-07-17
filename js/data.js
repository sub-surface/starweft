/* STARWEFT data.js — static game data tables. DOM-free. */
var SW = globalThis.SW = globalThis.SW || {};

SW.data = (function () {
  const D = {};

  D.SAVE_VERSION = 3;
  D.TICK_MS = 500;            // real ms per tick at 1x
  D.SPEEDS = [0, 1, 3, 10];

  // ---- Stellar physics (hard-spec backbone) ----
  // freq: relative abundance for procedural fill. mass M☉, lum L☉, tempK, tint for render.
  D.SPECTRAL = {
    O:  { freq: 0.0000003, mass: 30,  lum: 100000, temp: 40000, tint: '#9bb0ff', label: 'O — blue colossus' },
    B:  { freq: 0.0013,    mass: 8,   lum: 800,    temp: 18000, tint: '#aabfff', label: 'B — blue-white' },
    A:  { freq: 0.006,     mass: 1.9, lum: 20,     temp: 8500,  tint: '#cad7ff', label: 'A — white' },
    F:  { freq: 0.03,      mass: 1.3, lum: 3.2,    temp: 6800,  tint: '#f8f7ff', label: 'F — yellow-white' },
    G:  { freq: 0.076,     mass: 1.0, lum: 1.0,    temp: 5700,  tint: '#fff4ea', label: 'G — yellow, Sol-like' },
    K:  { freq: 0.12,      mass: 0.7, lum: 0.3,    temp: 4500,  tint: '#ffd2a1', label: 'K — orange' },
    M:  { freq: 0.70,      mass: 0.3, lum: 0.04,   temp: 3000,  tint: '#ffb98a', label: 'M — red dwarf' },
    D:  { freq: 0.05,      mass: 0.6, lum: 0.001,  temp: 10000, tint: '#dfe8ff', label: 'D — white dwarf remnant' },
    III:{ freq: 0.012,     mass: 1.5, lum: 60,     temp: 4300,  tint: '#ffc285', label: 'III — evolved giant' },
  };
  D.specClass = function (spec) { // 'G2V'->'G', 'DA2'->'D', 'K1.5III'->'III', 'sdM1'->'M'
    if (!spec) return 'M';
    if (/III/.test(spec)) return 'III';
    if (/^D[A-Z]/.test(spec)) return 'D';
    const m = spec.match(/([OBAFGKM])/);
    return m ? m[1] : 'M';
  };

  // ---- Commodities ----
  D.COMMODITIES = {
    ORE:     { name: 'Ore',     icon: '▦', base: 8,   tier: 0 },
    GAS:     { name: 'Gas',     icon: '◌', base: 10,  tier: 0 },
    BIO:     { name: 'Biomass', icon: '❀', base: 7,   tier: 0 },
    CRYSTAL: { name: 'Crystal', icon: '◆', base: 24,  tier: 0 },
    ALLOY:   { name: 'Alloy',   icon: '▣', base: 24,  tier: 1 },
    FUEL:    { name: 'Fuel',    icon: '▲', base: 28,  tier: 1 },
    FOOD:    { name: 'Food',    icon: '✦', base: 20,  tier: 1 },
    TECH:    { name: 'Tech',    icon: '⬡', base: 62,  tier: 2 },
    MEDS:    { name: 'Meds',    icon: '✚', base: 50,  tier: 2 },
    PANACEA: { name: 'Panacea', icon: '✺', base: 220, tier: 3, locked: true },
  };
  D.COMM_IDS = Object.keys(D.COMMODITIES);

  D.RECIPES = [
    { out: 'ALLOY',   qty: 1, inputs: { ORE: 2 },                       rate: 0.7 },
    { out: 'FUEL',    qty: 1, inputs: { GAS: 2 },                       rate: 0.7 },
    { out: 'FOOD',    qty: 1, inputs: { BIO: 2 },                       rate: 0.7 },
    { out: 'TECH',    qty: 1, inputs: { ALLOY: 1, CRYSTAL: 1 },         rate: 0.45 },
    { out: 'MEDS',    qty: 1, inputs: { BIO: 1, GAS: 1 },               rate: 0.45 },
    { out: 'PANACEA', qty: 1, inputs: { MEDS: 1, TECH: 1, CRYSTAL: 1 }, rate: 0.25, tech: 'panacea', playerFabOnly: true },
  ];

  // ---- Ship hulls (speed in ly/tick; power = combat strength) ----
  // Hull speeds scaled with the distance rescale (see D.TUNE SCALE NOTE) — ~3.4x
  // the original — so a haul still takes about the same number of ticks it used
  // to despite the now-vast distances.
  D.HULLS = {
    // trade line
    sparrow:    { name: 'Sparrow',     cap: 10,  speed: 2.90, cost: 400,   upkeep: 2,  power: 0,  tech: null,          line: 'trade',   glyph: '·', desc: 'A plucky little probe. Where it all begins.' },
    courier:    { name: 'Courier',     cap: 25,  speed: 3.80, cost: 1600,  upkeep: 4,  power: 0,  tech: 'couriers',    line: 'trade',   glyph: '▸', berths: 4,  desc: 'Faster, roomier, still cute. Four bolted-in berths.' },
    freighter:  { name: 'Freighter',   cap: 60,  speed: 2.60, cost: 6200,  upkeep: 9,  power: 1,  tech: 'freighters',  line: 'trade',   glyph: '◆', berths: 6,  desc: 'The backbone of any serious weave.' },
    liner:      { name: 'Liner',       cap: 15,  speed: 3.30, cost: 9500,  upkeep: 11, power: 1,  tech: 'freighters',  line: 'trade',   glyph: '⬗', berths: 40, desc: 'Rows of berths and a galley that almost apologizes. People are the cargo.' },
    superhauler:{ name: 'Superhauler', cap: 150, speed: 2.20, cost: 24000, upkeep: 18, power: 2,  tech: 'superhaulers',line: 'trade',   glyph: '⬢', desc: 'A cathedral of cargo.' },
    // frontier line
    pathfinder: { name: 'Pathfinder',  cap: 4,   speed: 5.50, cost: 900,   upkeep: 2,  power: 0,  tech: 'scouts',      line: 'frontier',glyph: '↟', desc: 'Surveys systems while idle. Sells the charts.', survey: 1 },
    surveyor:   { name: 'Surveyor',    cap: 12,  speed: 4.50, cost: 4200,  upkeep: 5,  power: 1,  tech: 'surveycorps', line: 'frontier',glyph: '⌖', desc: 'Deep-survey vessel. Finds what hides.', survey: 3 },
    // vanguard line
    corvette:   { name: 'Corvette',    cap: 8,   speed: 3.80, cost: 3500,  upkeep: 6,  power: 6,  tech: 'corvettes',   line: 'vanguard',glyph: '∆', desc: 'Escort hull. Assign to a route to guard it.' },
    lancer:     { name: 'Lancer',      cap: 4,   speed: 3.40, cost: 11000, upkeep: 12, power: 16, tech: 'lancers',     line: 'vanguard',glyph: '✠', desc: 'A wing of fighters and the ship that carries them.' },
  };

  // ---- Buildings ----
  D.BUILDINGS = {
    relay:     { name: 'Relay Beacon',       icon: '◬', cost: 800,   mats: { ALLOY: 8 },            tech: null,          desc: 'Extends command range from this system.' },
    depot:     { name: 'Depot',              icon: '▢', cost: 500,   mats: { ALLOY: 5 },            tech: 'depots',      desc: 'Private stockpile. Routes can drop/take goods.' },
    extractor: { name: 'Extractor Array',    icon: '✱', cost: 1400,  mats: { ALLOY: 10 },           tech: null,          desc: '+60% production here.', onlyType: 'producer' },
    fabricator:{ name: 'Fabricator',         icon: '⌬', cost: 2600,  mats: { ALLOY: 15, TECH: 5 },  tech: 'fabricators', desc: 'Adds a factory slot (required for Panacea).' },
    enclave:   { name: 'Research Enclave',   icon: '◉', cost: 1800,  mats: { TECH: 8 },             tech: 'enclaves',    desc: '+100% research from this population.', onlyType: 'pop' },
    bastion:   { name: 'Quarantine Bastion', icon: '⛨', cost: 2200,  mats: { ALLOY: 12, TECH: 4 },  tech: 'bastions',    desc: 'Blocks 80% of Scourge spread into this system.' },
    gate:      { name: 'Warp Gate',          icon: '✪', cost: 12000, mats: { ALLOY: 40, TECH: 25 }, tech: 'gates',       desc: 'Instant travel between any two gates.' },
    penrosetap:{ name: 'Penrose Tap',        icon: '◐', cost: 8000,  mats: { ALLOY: 30, TECH: 15 }, tech: 'penrose',     desc: 'Harvests rotational energy. Mints FUEL from nothing.', onlyWonder: 'blackhole' },
  };

  // ---- Body facilities (the in-system layer; SPEC.md §5) ----
  // sites: body types that can host it; one facility per body.
  // fx.prod / fx.research apply per tick while the system lives;
  // fx.cap / fx.pop are applied once at construction.
  D.FACILITIES = {
    mine:       { name: 'Mining Station',   icon: '▦', cost: 1200, mats: { ALLOY: 6 },          sites: ['belt', 'rock', 'desert'],  fx: { prod: { ORE: 0.45 } },     desc: 'Drills and drones. The belt gives what worlds hoard.' },
    skimmer:    { name: 'Atmos Skimmer',    icon: '◌', cost: 1400, mats: { ALLOY: 8 },          sites: ['gas', 'icegiant'],         fx: { prod: { GAS: 0.45 } },     desc: 'Ramscoops drinking from the cloud tops.' },
    hydrofarm:  { name: 'Hydrofarm',        icon: '❀', cost: 1000, mats: { ALLOY: 5 },          sites: ['terran', 'ocean'],         fx: { prod: { BIO: 0.45 } },     desc: 'Kelp vats under orbital mirrors.' },
    crucible:   { name: 'Crystal Crucible', icon: '◆', cost: 2200, mats: { ALLOY: 8, TECH: 3 }, sites: ['lava', 'carbon'],          fx: { prod: { CRYSTAL: 0.22 } }, desc: 'Lattices grown in the melt, pulled out glowing.' },
    cryoarchive:{ name: 'Cryo-Archive',     icon: '✻', cost: 1800, mats: { TECH: 5 },           sites: ['ice', 'icegiant'],         fx: { research: 0.25 },          desc: 'Cold storage for warm knowledge.' },
    habitat:    { name: 'Orbital Habitat',  icon: '◍', cost: 2600, mats: { ALLOY: 12, TECH: 4 },sites: ['terran', 'ocean', 'desert', 'rock', 'gas', 'icegiant'], fx: { cap: 40, pop: 2 }, desc: 'A ring of lights. People follow.' },
    ringworks:  { name: 'Ring Dredge',      icon: '⊚', cost: 1500, mats: { ALLOY: 7 },          sites: ['rock', 'desert', 'terran', 'ocean', 'ice', 'gas', 'icegiant', 'carbon', 'lava'], requiresRing: true, fx: { prod: { ORE: 0.35, CRYSTAL: 0.05 } }, desc: 'Combs planetary rings for ice-bound ore and lattice shards.' },
    spindle:    { name: 'Orbital Spindle',  icon: '✶', cost: 1600, mats: { ALLOY: 8, TECH: 2 }, sites: [], orbital: true, fx: { cap: 30 }, desc: 'A dock, a customs desk, and one bar with no name. Anchors in any orbit.' },
  };

  // How many facilities a body can anchor (stations orbit, the rest dig in)
  D.SITE_SLOTS = { belt: 3, terran: 3 };
  D.SITE_SLOTS_DEFAULT = 2;

  // ---- Berth price character: what a body's docks pay and charge ----
  // A ship berthed AT a body trades the system market through local rates.
  // <1 = cheap here (source), >1 = dear here (demand). The hub is neutral.
  // This is the in-system game: ore is cheap in the belt, food is dear on
  // a frontier settlement, and the spread between berths is honest work.
  D.BERTH = {
    belt:     { ORE: 0.6, CRYSTAL: 0.85, FOOD: 1.2, FUEL: 1.15 },
    rock:     { ORE: 0.85 },
    desert:   { ORE: 0.8, FOOD: 1.15 },
    lava:     { CRYSTAL: 0.75, ORE: 0.9 },
    carbon:   { CRYSTAL: 0.7 },
    gas:      { GAS: 0.6 },
    icegiant: { GAS: 0.7 },
    ice:      { GAS: 0.85 },
    terran:   { BIO: 0.8 },
    ocean:    { BIO: 0.7 },
  };
  // Settled outposts (Mars): hungry mouths far from the vats.
  D.BERTH_SETTLED = { FOOD: 1.3, MEDS: 1.25, BIO: 1.2 };

  // ---- Aptitude perks (the captain, not the network; SPEC[PROG-APTITUDES]) ----
  // Earned via milestones, one point each. Chains within four disciplines.
  D.PERKS = {
    silver:   { name: 'Silver Tongue',    icon: '✦', cat: 'Brokerage',   req: null,       desc: 'Sell prices +4% everywhere your name is known.' },
    maker:    { name: 'Market Maker',     icon: '✦', cat: 'Brokerage',   req: 'silver',   desc: 'Your dominance price edge is 50% stronger.' },
    baron:    { name: 'Weftbaron',        icon: '✦', cat: 'Brokerage',   req: 'maker',    desc: 'Buy prices −4%. Sellers blink first.' },
    keeneyes: { name: 'Keen Eyes',        icon: '⌖', cat: 'Wayfinding',  req: null,       desc: 'Surveys complete 25% faster.' },
    starread: { name: 'Star Reader',      icon: '⌖', cat: 'Wayfinding',  req: 'keeneyes', desc: 'Anomaly finds 50% likelier.' },
    voidborn: { name: 'Void Born',        icon: '⌖', cat: 'Wayfinding',  req: 'starread', desc: 'Command range +10%.' },
    gunner:   { name: 'Gunner',           icon: '✠', cat: 'Aegis',       req: null,       desc: 'Combat power +15%, every hull.' },
    boarder:  { name: 'Boarding Parties', icon: '✠', cat: 'Aegis',       req: 'gunner',   desc: 'Raid loot +25%.' },
    dread:    { name: 'Dread Sigil',      icon: '✠', cat: 'Aegis',       req: 'boarder',  desc: 'Raid cooldowns −33%. They remember your silhouette.' },
    foreman:  { name: 'Foreman',          icon: '⌬', cat: 'Stewardship', req: null,       desc: 'Body facilities cost −15%.' },
    planner:  { name: 'Civic Planner',    icon: '⌬', cat: 'Stewardship', req: 'foreman',  desc: 'Orbital habitats bring 1M extra settlers.' },
    living:   { name: 'Living Worlds',    icon: '⌬', cat: 'Stewardship', req: 'planner',  desc: 'Facility production +20%.' },
  };
  // Milestones grant one aptitude point each, once.
  // Each milestone grants one aptitude point, once. `prog(s)` returns
  // {cur, goal} for countable ones (drives the progress bars in the panel) or
  // null for binary story beats. `hint` is the in-fiction nudge / why it matters.
  D.PERK_MILESTONES = [
    { id: 'm_surveys5',  label: 'Chart 5 systems',          group: 'explore', hint: 'Send a scout to idle-survey unknown systems.',
      test: function (s) { return (s.stats.surveys || 0) >= 5; }, prog: function (s) { return { cur: s.stats.surveys || 0, goal: 5 }; } },
    { id: 'm_surveys15', label: 'Chart 15 systems',         group: 'explore', hint: 'Keep surveying — the dark pays research and lore.',
      test: function (s) { return (s.stats.surveys || 0) >= 15; }, prog: function (s) { return { cur: s.stats.surveys || 0, goal: 15 }; } },
    { id: 'm_disc30',    label: 'Discover 30 systems',      group: 'explore', hint: 'Push your reach outward; relays extend command range.',
      test: function (s) { return (s.stats.discovered || 0) >= 30; }, prog: function (s) { return { cur: s.stats.discovered || 0, goal: 30 }; } },
    { id: 'm_deliv25',   label: '25 deliveries',            group: 'trade', hint: 'Buy cheap, sell hungry. Routes automate it.',
      test: function (s) { return (s.stats.deliveries || 0) >= 25; }, prog: function (s) { return { cur: s.stats.deliveries || 0, goal: 25 }; } },
    { id: 'm_deliv150',  label: '150 deliveries',           group: 'trade', hint: 'Thicken the weave — let routes run the milk circuits.',
      test: function (s) { return (s.stats.deliveries || 0) >= 150; }, prog: function (s) { return { cur: s.stats.deliveries || 0, goal: 150 }; } },
    { id: 'm_ships6',    label: 'Launch 6 hulls',           group: 'trade', hint: 'A bigger fleet covers more lanes at once.',
      test: function (s) { return (s.stats.shipsBuilt || 0) >= 6; }, prog: function (s) { return { cur: s.stats.shipsBuilt || 0, goal: 6 }; } },
    { id: 'm_tech6',     label: 'Research 6 technologies',  group: 'build', hint: 'Well-fed populations pay you in research.',
      test: function (s) { return s.tech.unlocked.length >= 6; }, prog: function (s) { return { cur: s.tech.unlocked.length, goal: 6 }; } },
    { id: 'm_site',      label: 'Anchor a facility',        group: 'build', hint: 'Build a mine, skimmer, or habitat from the orbital view.',
      test: function (s) { return (s.stats.sitesBuilt || 0) >= 1; }, prog: function (s) { return { cur: s.stats.sitesBuilt || 0, goal: 1 }; } },
    { id: 'm_frag4',     label: 'Recover 4 chronicle fragments', group: 'lore', hint: 'Surveys, ruins, and strangers carry the Chronicle.',
      test: function (s) { return (s.fragments || []).length >= 4; }, prog: function (s) { return { cur: (s.fragments || []).length, goal: 4 }; } },
    { id: 'm_wake',      label: 'Witness the Scourge wake', group: 'lore', hint: 'It wakes coreward-out, in time. Be ready.',
      test: function (s) { return !!s.story.flags.scourge_awake; }, prog: null },
  ];
  D.MILESTONE_GROUPS = { explore: 'Explore', trade: 'Trade', build: 'Build', lore: 'Chronicle' };

  // ---- Tech tree (DAG with branches; pos = column/row for the tree view) ----
  // branch: core | logistics | frontier | vanguard | scourge | doctrine
  D.TECHS = {
    // core
    cargopods:    { name: 'Cargo Pods',          cost: 60,  req: [],                branch: 'core', tier: 1, desc: '+25% cargo capacity, all ships.' },
    iondrives:    { name: 'Ion Drives',          cost: 60,  req: [],                branch: 'core', tier: 1, desc: '+25% speed, all ships.' },
    orbitalworks: { name: 'Orbital Works',       cost: 150, req: ['cargopods'],     branch: 'core', tier: 2, desc: 'Body facilities cost 25% less to anchor.' },
    // logistics
    couriers:     { name: 'Courier Hulls',       cost: 50,  req: [],                branch: 'logistics', tier: 1, desc: 'Unlock the Courier (cap 25, fast).' },
    depots:       { name: 'Depot Logistics',     cost: 50,  req: [],                branch: 'logistics', tier: 1, desc: 'Build Depots; routes can drop/take goods.' },
    analytics:    { name: 'Market Analytics',    cost: 90,  req: [],                branch: 'logistics', tier: 1, desc: 'Opportunities feed + price trends.' },
    freighters:   { name: 'Freighter Hulls',     cost: 180, req: ['couriers'],      branch: 'logistics', tier: 2, desc: 'Unlock the Freighter (cap 60).' },
    smartroutes:  { name: 'Smart Routing',       cost: 150, req: ['analytics'],     branch: 'logistics', tier: 2, desc: 'Route stops can auto-pick the best cargo.' },
    fabricators:  { name: 'Fabricators',         cost: 160, req: ['depots'],        branch: 'logistics', tier: 2, desc: 'Build factory slots anywhere.' },
    foundries:    { name: 'Drone Foundries',     cost: 160, req: ['couriers'],      branch: 'logistics', tier: 2, desc: 'Ships cost 25% less.' },
    exchange:     { name: 'Exchange Terminal',   cost: 280, req: ['analytics'],     branch: 'logistics', tier: 3, desc: 'THE MARKET: full trading dashboard + fleet orchestration.' },
    directives:   { name: 'Logistics Directives',cost: 400, req: ['smartroutes'],   branch: 'logistics', tier: 3, desc: '"Keep X stocked with Y" — the network self-plans.' },
    diplomacy:    { name: 'Corporate Diplomacy', cost: 250, req: ['analytics'],     branch: 'logistics', tier: 3, desc: 'Pacts and buyouts with rival networks.' },
    superhaulers: { name: 'Superhauler Hulls',   cost: 450, req: ['freighters'],    branch: 'logistics', tier: 4, desc: 'Unlock the Superhauler (cap 150).' },
    metaroutes:   { name: 'Weftworks',           cost: 420, req: ['directives'],    branch: 'logistics', tier: 4, desc: 'Chain routes spanning whole supply chains: raw inputs → factory → market.' },
    autoyards:    { name: 'Tessellation Yards',  cost: 480, req: ['foundries', 'directives'], branch: 'logistics', tier: 4, desc: 'Home yards build and scrap haulers to match route demand.' },
    // frontier
    scouts:       { name: 'Pathfinder Hulls',    cost: 70,  req: [],                branch: 'frontier', tier: 1, desc: 'Scout ships that survey systems while idle.' },
    relays2:      { name: 'Long-Range Relays',   cost: 80,  req: [],                branch: 'frontier', tier: 1, desc: '+45% command range.' },
    surveycorps:  { name: 'Survey Corps',        cost: 200, req: ['scouts'],        branch: 'frontier', tier: 2, desc: 'Surveyor hulls; surveys 3× faster.' },
    enclaves:     { name: 'Research Enclaves',   cost: 140, req: [],                branch: 'frontier', tier: 2, desc: 'Build Enclaves at population centers.' },
    deepcharts:   { name: 'Deep Charts',         cost: 260, req: ['surveycorps'],   branch: 'frontier', tier: 3, desc: 'Anomaly bearings revealed; +50% survey rewards.' },
    driftholds:   { name: 'Drifthold Anchorage', cost: 320, req: ['relays2'],       branch: 'frontier', tier: 3, desc: 'Home becomes mobile: relocate the anchorage to any surveyed system.' },
    gates:        { name: 'Warp Gates',          cost: 500, req: ['relays2'],       branch: 'frontier', tier: 4, desc: 'Build paired Warp Gates: instant lanes.' },
    loomres:      { name: 'Loom Resonance',      cost: 420, req: ['deepcharts'],    branch: 'frontier', tier: 4, desc: 'Precursor harmonics: +25% range, gates half price.', visibleIf: 'husk_surveyed' },
    deepdrives:   { name: 'Deep Drives',         cost: 520, req: ['deepcharts'],    branch: 'frontier', tier: 4, desc: 'Cross the dark between webs: badlands lanes open to your ships.' },
    // vanguard
    corvettes:    { name: 'Corvette Hulls',      cost: 90,  req: [],                branch: 'vanguard', tier: 1, desc: 'Escort hulls. Raiders think twice.' },
    simulacrum:   { name: 'Tactical Simulacrum', cost: 120, req: ['corvettes'],     branch: 'vanguard', tier: 2, desc: 'Take direct command when raiding — or let the stats decide.' },
    retainers:    { name: 'Vigil Retainers',     cost: 150, req: ['corvettes'],     branch: 'vanguard', tier: 2, desc: 'Hire Vigil patrols to guard a region.' },
    convoys:      { name: 'Convoy Doctrine',     cost: 180, req: ['corvettes'],     branch: 'vanguard', tier: 2, desc: 'Escorts protect their whole route, +4 defense.' },
    bastions:     { name: 'Quarantine Protocols',cost: 150, req: [],                branch: 'vanguard', tier: 2, desc: 'Build Quarantine Bastions.', visibleIf: 'scourge_known' },
    lancers:      { name: 'Lancer Wings',        cost: 380, req: ['convoys'],       branch: 'vanguard', tier: 3, desc: 'Carrier hulls with fighter wings (power 16).' },
    marque:       { name: 'Letters of Marque',   cost: 300, req: ['corvettes'],     branch: 'vanguard', tier: 3, desc: 'Sanctioned raiding: +50% loot, half infamy.' },
    penrose:      { name: 'Penrose Taps',        cost: 450, req: ['lancers'],       branch: 'vanguard', tier: 4, desc: 'Drink from a black hole\'s spin.', visibleIf: 'hole_surveyed' },
    // doctrines (mutually exclusive — pick one per run)
    doc_mercantile:{ name: 'Doctrine: Mercantile', cost: 220, req: [], branch: 'doctrine', tier: 0, group: 'doctrine', desc: 'Your presence edge doubles. Logistics techs -25%.' },
    doc_wayfarer:  { name: 'Doctrine: Wayfarer',   cost: 220, req: [], branch: 'doctrine', tier: 0, group: 'doctrine', desc: '+20% range, surveys 2×. Frontier techs -25%.' },
    doc_vanguard:  { name: 'Doctrine: Vanguard',   cost: 220, req: [], branch: 'doctrine', tier: 0, group: 'doctrine', desc: '+40% combat power. Vanguard techs -25%.' },
    // scourge chain
    scourge1:     { name: 'Scourge Analysis I',  cost: 200, req: [],            branch: 'scourge', tier: 1, desc: 'It is not alive. It is a gardener, mis-told.', visibleIf: 'sample_collected' },
    scourge2:     { name: 'Scourge Analysis II', cost: 350, req: ['scourge1'],  branch: 'scourge', tier: 2, desc: 'Inoculated Hulls: your ships may enter corrupted systems.' },
    panacea:      { name: 'PANACEA',             cost: 500, req: ['scourge2'],  branch: 'scourge', tier: 3, desc: 'The counter-instruction. Manufacture it. Deliver it.' },
  };
  // Doctrines unlock after any 4 techs; enforced in tech.js.
  D.DOCTRINE_UNLOCK_COUNT = 4;
  D.DOCTRINE_DISCOUNT = { doc_mercantile: 'logistics', doc_wayfarer: 'frontier', doc_vanguard: 'vanguard' };

  // ---- Run origins (roguelite starts; some legacy-locked) ----
  D.ORIGINS = {
    courier: {
      name: 'Courier Remnant', locked: null,
      desc: 'The classic. One Sparrow, Sol, and the Guild\'s last goodwill.',
      ships: ['sparrow'], credits: 0, rep: {},
    },
    vigil: {
      name: 'Vigil Cutter', locked: 'won',
      desc: 'A decommissioned escort and standing orders no one is left to give. Combat-ready; poorer; the Scourge stirs early.',
      ships: ['corvette'], credits: -200, rep: { vigil: 2 }, techs: ['corvettes'], scourgeEarlier: 80,
    },
    surveyor: {
      name: 'Surveyor Errant', locked: 'wonder',
      desc: 'A Pathfinder, a head full of charts, and an itch. Routes come later; the dark comes first.',
      ships: ['pathfinder', 'sparrow'], credits: -100, rep: {}, techs: ['scouts'], surveyBonus: true,
    },
    severed: {
      name: 'Severed Debt', locked: 'infamy',
      desc: 'You owe the Reach. Start among pirates with a fast hull, black market access, and a reputation problem.',
      ships: ['corvette'], credits: 100, rep: { severed: 3, vigil: -2 }, infamy: 3, startReach: true,
    },
  };
  D.LEGACY_HINTS = { won: 'Win a run', wonder: 'Survey a galactic wonder', infamy: 'Reach infamy 5' };

  // ---- Founders (SPEC[RUN-FOUNDERS]): who the Guild seats at the Loomship's helm ----
  // Orthogonal to Origin (which still sets ships/credits/rep flavor): a Founder
  // is chosen for a *focused* (Act Ladder) run and layers one rule-bend, one
  // liability, and a lore line on top. `fx` reuses the exact bag SW.acts.mods()
  // already folds Commission x Boons through (a Founder's law and a drafted
  // Boon can literally be the same rule — see 'firstlight' below); fields that
  // fx has no shape for (tier bump, board-slot penalty, bust-forfeit) are read
  // directly by SW.founders' small pure helpers. No founder touches a D.TUNE
  // Base number (SPEC[DESIGN-RULEBENDS]) — every effect is conditional, not a percent.
  // stacked on the same old thing. All three ship unlocked (Chronicle gating
  // for the other five is R8).
  D.FOUNDERS = {
    courier: {
      name: 'The Courier', locked: null,
      bend: 'The first pledge you keep each act scores double THREAD.',
      liability: 'None — the classic.',
      lore: 'Every haul before this one was practice.',
      fx: { firstlightX2: true },
    },
    underwriter: {
      name: 'The Underwriter', locked: null,
      bend: 'May hold two pledges beyond the normal manifest cap.',
      liability: 'A bust forfeits double the bond.',
      lore: 'She never met an overcommitment she liked less than the last one.',
      fx: { maxActiveBonus: 2 },
      bustForfeitMult: 2,
    },
    rockhopper: {
      name: 'The Rockhopper', locked: null,
      bend: 'Raw goods (Ore, Gas, Biomass, Crystal) count one tier higher for TONNAGE.',
      liability: 'Settled worlds distrust an outsider: the board runs one offer thinner.',
      lore: 'Grew up reading rock, not charts.',
      tierBumpComms: ['ORE', 'GAS', 'BIO', 'CRYSTAL'],
      boardSlotPenalty: 1,
      startBelt: true, credits: 250, // "starts in the belt with a rig"
    },
  };
  D.FOUNDER_IDS = Object.keys(D.FOUNDERS);

  // ---- Story flag registry ----
  // Every literal story-flag key must be listed here (dynamic keys by prefix).
  // The smoke test scans the source and fails on unregistered flags, so a
  // typo'd flag is a test failure instead of a silent nothing.
  D.FLAGS = [
    'scourge_awake', 'scourge_known', 'scourge_cured', 'victory_seen', 'postgame',
    'routes_unlocked', 'sol_net_authorized', 'first_route', 'built_relay', 'sample_collected', 'panacea_ready', 'inoculated_hulls',
    'hole_surveyed', 'husk_surveyed', 'deep_exodus',
    'cats_aboard', 'crew_hired', 'doctrine_chosen', 'doctrine_prompted',
    'archivist_sys', 'archivist_quest', 'archivist_friend', 'archivist_dead',
    'met_helix', 'met_mariner', 'panic_done', 'stance_chosen',
    'first_thread', 'heart_drift', 'graduated',
  ];
  D.FLAG_PREFIXES = ['met_', 'rival_collapsed_', 'absorbed_', 'mourned_'];

  // ---- Galactic regions ("biomes") ----
  D.REGIONS = {
    nebula:   { name: 'Nebula',      fx: 'Sensor fog: unsurveyed systems hide. Crystal- and gas-rich.', tint: '#aab6cc', surveyMult: 1.25 },
    flarezone:{ name: 'Flare Belt',  fx: 'Young flare stars. Cheap ore, periodic flares damage idlers.', tint: '#ccb39a', surveyMult: 1.2 },
    oldstream:{ name: 'Halo Stream', fx: 'Ancient passing stars. Metal-poor, ruin-rich, +research.', tint: '#9aa3b5', surveyMult: 1.1 },
    verge:    { name: 'The Verge',   fx: 'Coreward edge. Where the silence started.', tint: '#b59aa8', surveyMult: 1.5 },
    reach:    { name: 'Severed Reach', fx: 'Pirate space. Raids common; black markets pay 15% over.', tint: '#b5a08e', surveyMult: 1.3 },
    quiet:    { name: 'The Quiet',   fx: 'A dust pocket. Dim, calm, slightly slow.', tint: '#8e96a3', surveyMult: 1.0 },
  };

  // ---- Ideologies (system politics) ----
  D.IDEOLOGIES = {
    free:    { name: 'Unaligned',        bias: {},                        desc: 'Frontier folk. They take credits.' },
    synod:   { name: 'Stellar Synod',    bias: { MEDS: 1.15, FOOD: 1.1, TECH: 0.9 }, desc: 'Preservationist theocracy. Pays well for life.' },
    combine: { name: 'Combine Charter',  bias: { TECH: 1.1, ALLOY: 1.05 }, desc: 'Corporate worlds. Sharp lawyers, sharper margins.' },
    mariners:{ name: 'Mariner Commons',  bias: { FUEL: 1.1 },              desc: 'Syndicalist haulers. Respect earned in cargo.' },
    vigil:   { name: 'The Vigil',        bias: { ALLOY: 1.15, FUEL: 1.05 }, desc: 'Militarist quarantine order. They remember the last time.' },
    loom:    { name: 'Loomkeepers',      bias: { CRYSTAL: 1.2 },           desc: 'Precursor cultists. They say the lanes are prayers.' },
  };

  // ---- System archetypes ----
  D.SYS_TYPES = {
    mining:    { name: 'Mining System',     icon: '▦' },
    gas:       { name: 'Gas Siphon',        icon: '◌' },
    agri:      { name: 'Agriworld',         icon: '❀' },
    industrial:{ name: 'Industrial Hub',    icon: '✱' },
    pop:       { name: 'Population Center', icon: '◉' },
    frontier:  { name: 'Frontier',          icon: '○' },
    derelict:  { name: 'Derelict',          icon: '✧' },
    wonder:    { name: 'Anomaly',           icon: '◈' },
  };

  // ---- Cartography data buyers: who pays over the odds for which charts ----
  D.DATA_BUYERS = {
    synod:   { wonderRecord: 1.3, anomalyTrace: 1.2 },
    combine: { survey: 1.2 },
    mariners:{ firstlight: 1.25 },
    loom:    { deepFieldMap: 1.3, wonderRecord: 1.2 },
    vigil:   { deepFieldMap: 1.2 },
  };

  // ---- World setup presets (run parameters; SPEC[SETUP-ADVANCED]) ----
  D.WORLD = {
    // Distances doubled again (see D.TUNE SCALE NOTE). Mean lane length is a real
    // commitment; the sky reads as vast and uncrowded even at catalogue scale.
    density: {
      sparse:   { name: 'Sparse — the long dark', sysCount: 160, bubbleR: 248, minSysDist: 12.8 },
      standard: { name: 'Standard',               sysCount: 230, bubbleR: 200, minSysDist: 9.0 },
      crowded:  { name: 'Crowded — close skies',  sysCount: 310, bubbleR: 176, minSysDist: 6.6 },
    },
    wealth: {
      deprived: { name: 'Deprived — you are the thread', mult: 0.55 },
      standard: { name: 'Standard',                      mult: 1.0 },
      gilded:   { name: 'Gilded — fat and slow',         mult: 1.6 },
    },
    // Galaxy Age — the Sundering. Tints generation, not difficulty. `reveal`
    // is how many lanes deep the home neighborhood starts charted; `ruinMult`
    // nudges Halo/ruin-rich region weighting and their research payoff.
    age: {
      young:   { name: 'Young — a recent Sundering', reveal: 2, ruinMult: 0.85, desc: 'Old lanes linger; home is better charted.' },
      settled: { name: 'Settled',                    reveal: 1, ruinMult: 1.0,  desc: 'The standard galaxy.' },
      ancient: { name: 'Ancient — the Long Forgetting', reveal: 0, ruinMult: 1.35, desc: 'Fully dark, but old wealth lies buried.' },
    },
    // Weave Pattern — biases the procedural fill's clumping. The Gabriel graph
    // stays the lane source of truth; this only shapes where stars land.
    topology: {
      natural:   { name: 'Natural drift',  clump: 0,    spread: 1.0, desc: 'Uniform, coreward-dense. The default.' },
      filaments: { name: 'Filaments',      clump: -0.3, spread: 1.25, desc: 'Long sparse strings — every lane precious.' },
      cluster:   { name: 'Clustered',      clump: 0.5,  spread: 0.9, desc: 'Tight knots, lonely bridges between.' },
      halo:      { name: 'Bright Halo',    clump: 0.25, spread: 1.1, desc: 'A rich core ringed by a dark frontier.' },
    },
    badlands: { name: 'Deep Wilds', count: 180, R: 170 },
  };
  // The Heart — where you wake. Decoupled from origin (origin.startReach still
  // composes/overrides). Resolved to a concrete start system in game.newGame.
  D.HEART = {
    home:  { name: 'The Old Orchard', desc: 'Home is Sol — central, settled, safe. The establishment is at your door.' },
    rim:   { name: 'The Far Rim',     desc: 'Home is a distant settled world far from Sol. Exposed, but yours, and the Scourge comes for you late.', credits: 0 },
    drift: { name: 'The Drift',       desc: 'No home given. Wake at an unsettled star out in the dark and claim it yourself.', credits: 250 },
  };
  // Founding Myth — one line of lore. Pure flavor, never a mechanical lever.
  D.MYTHS = {
    none:     { name: '— no myth —',          line: '' },
    courier:  { name: 'The Last Courier',     line: 'You were a courier who never lost a parcel. The worlds remember.' },
    keeper:   { name: 'The Loom-Keeper',      line: 'You tended the old Loom until the lanes went quiet. Now you re-spin them.' },
    exile:    { name: 'The Exile',            line: 'Cast out from a world that no longer answers. You owe the dark nothing.' },
    heir:     { name: 'The Ferry-Heir',       line: 'Your family ran the ferries before the Sundering. The debt is yours now.' },
    nobody:   { name: 'Nobody In Particular', line: 'No legend, no lineage. Just a hull, a stick, and a long way to go.' },
  };
  D.MYTH_ORDER = ['none', 'courier', 'keeper', 'exile', 'heir', 'nobody'];
  // The Scourge, named. Seeded at scourge.init; threads into news and events.
  D.SCOURGE_NAMES = ['the Hush', 'the Unweaving', 'the Grey Tide', 'the Last Silence', 'the Sundering Bloom', 'the Quiet Rot', 'the Pale Verge'];
  // Temperament lightly modulates spread *feel*. The neutral profile leaves all
  // multipliers at 1 so 'inherit' threat = no balance change unless chosen.
  D.SCOURGE_TEMPERAMENTS = {
    neutral:    { name: 'methodical',  intervalMult: 1.0,  richBias: 1.0, variance: 0.0 },
    patient:    { name: 'patient',     intervalMult: 1.15, richBias: 0.9, variance: 0.0 },
    ravenous:   { name: 'ravenous',    intervalMult: 0.85, richBias: 1.4, variance: 0.0 },
    capricious: { name: 'capricious',  intervalMult: 1.0,  richBias: 1.0, variance: 0.4 },
  };
  D.resolveWorld = function (opts) {
    opts = opts || {};
    const den = D.WORLD.density[opts.density] || D.WORLD.density.standard;
    const wea = D.WORLD.wealth[opts.wealth] || D.WORLD.wealth.standard;
    const bad = D.WORLD.badlands;
    return {
      density: opts.density || 'standard', wealth: opts.wealth || 'standard',
      age: D.WORLD.age[opts.age] ? opts.age : 'settled',
      topology: D.WORLD.topology[opts.topology] ? opts.topology : 'natural',
      heart: D.HEART[opts.heart] ? opts.heart : 'home',
      badlandsPreset: 'deep',
      sysCount: den.sysCount, bubbleR: den.bubbleR, minSysDist: den.minSysDist,
      wealthMult: wea.mult,
      // The dark shell sits beyond the bubble; scale its outer radius with the
      // bubble (inner edge is bubbleR*1.12 in makeBadlands) so it stays a shell
      // at any distance scale rather than collapsing inside an enlarged bubble.
      badlandsCount: bad.count, badlandsR: Math.max(bad.R, den.bubbleR * 2.0),
    };
  };

  // ---- Difficulty ----
  D.DIFFICULTY = {
    relaxed:  { name: 'Relaxed',  desc: 'No Scourge. Pure sandbox weaving.',            startCredits: 900, scourgeStart: -1,  spreadEvery: 0,  spreadAccel: 0,    research: 1.2 },
    standard: { name: 'Standard', desc: 'The Scourge wakes in time. Win by Panacea.',   startCredits: 700, scourgeStart: 420, spreadEvery: 72, spreadAccel: 0.45, research: 1.0 },
    brutal:   { name: 'Brutal',   desc: 'It is already hungry.',                        startCredits: 500, scourgeStart: 280, spreadEvery: 50, spreadAccel: 0.8,  research: 0.9 },
  };

  // ---- Threat: the Scourge clock, decoupled from economic difficulty ----
  // 'inherit' (default) just follows the chosen difficulty. The rest override
  // the scourge timing only, so a relaxed economy can still face a scary clock
  // (or a brutal economy can have a slow burn). Applied in scourge.init.
  D.THREAT = {
    inherit:  { name: 'As difficulty', desc: 'The Scourge follows your difficulty.' },
    dormant:  { name: 'Dormant',       desc: 'The Scourge never wakes. Pure builder.',          scourgeStart: -1 },
    slow:     { name: 'Slow burn',     desc: 'Wakes late, creeps. Time to prepare.',            scourgeStart: 560, spreadEvery: 90, spreadAccel: 0.3 },
    looming:  { name: 'Looming',       desc: 'The standard reckoning.',                          scourgeStart: 420, spreadEvery: 72, spreadAccel: 0.45 },
    early:    { name: 'Early stir',    desc: 'It wakes soon. Build under pressure.',             scourgeStart: 240, spreadEvery: 60, spreadAccel: 0.55 },
    relentless:{ name: 'Relentless',   desc: 'Already hungry, and fast.',                        scourgeStart: 180, spreadEvery: 44, spreadAccel: 0.9 },
  };

  // ---- Weave conditions: optional, stackable run modifiers (roguelite spice) ----
  // Each is a pure data descriptor; effects are read by the owning subsystem at
  // the marked hook. `tag` is the short glyph+name shown on cards and run badges.
  // Keep effects small and legible — one or two levers each.
  D.CONDITIONS = {
    pirateTithe:  { name: 'Pirate Tithe',   glyph: '☠', kind: 'harder',
      desc: 'Raids come oftener and bite harder — but black markets run rich, and the bold get paid.',
      fx: { raidRate: 1.6, raidBite: 1.25, blackMarket: 1.4 } },
    boomBust:     { name: 'Boom & Bust',    glyph: '↯', kind: 'wild',
      desc: 'Prices swing wide and fast. Fortunes are made and unmade on a single run.',
      fx: { volatility: 2.0 } },
    longQuiet:    { name: 'The Long Quiet',  glyph: '◐', kind: 'wild',
      desc: 'The Scourge sleeps deep — but rival networks grow bold and crowd your lanes.',
      fx: { scourgeStartMult: 1.6, rivalAggression: 1.5 } },
    scarcity:     { name: 'Scarcity Start',  glyph: '▽', kind: 'harder',
      desc: 'One key commodity is rare galaxy-wide at the outset. Find it, corner it, profit.',
      fx: { scarcityStart: true } },
    fatPurse:     { name: 'Fat Purse',       glyph: '◈', kind: 'kinder',
      desc: 'You begin with a swollen treasury. Buy your way to a flying start.',
      fx: { startCreditsBonus: 600 } },
    ironThread:   { name: 'Iron Thread',     glyph: '⛓', kind: 'harder',
      desc: 'No safety net. A losing fight is far likelier to cost the whole hull, not just the cargo. Every ship is precious.',
      fx: { noGiftHulls: true } },
    goldenAge:    { name: 'Golden Age',      glyph: '✸', kind: 'kinder',
      desc: 'Populations thrive and pay you back. Research flows faster everywhere.',
      fx: { research: 1.4, prosperity: 1.25 } },
    wanderlust:   { name: 'Wanderlust',      glyph: '✧', kind: 'wild',
      desc: 'Surveys pay double. The dark is full of secrets and the urge to chart them — explorers, this one is for you.',
      fx: { surveyMult: 2.0 } },
    longMemory:   { name: 'The Long Memory',  glyph: '⟲', kind: 'harder',
      desc: 'Rivals hold a grudge. Undercut one and it presses your lanes harder, longer — competition gets personal.',
      fx: { rivalGrudge: true, rivalAggression: 1.25 } },
    pilgrimTide:  { name: 'Pilgrim Tide',     glyph: '⚑', kind: 'wild',
      desc: 'People are leaving. Passenger demand surges across the weave — ferry the fleeing and be paid for it.',
      fx: { passengerMult: 1.8 } },
    quietYear:    { name: 'The Quiet Year',   glyph: '❍', kind: 'kinder',
      desc: 'The first stretch is utterly still — no events, no alarms. A meditative opening to find your feet.',
      fx: { quietUntil: 50 } },
  };
  D.CONDITION_ORDER = ['fatPurse', 'goldenAge', 'wanderlust', 'quietYear', 'boomBust', 'longQuiet', 'pilgrimTide', 'scarcity', 'pirateTithe', 'longMemory', 'ironThread'];

  // Multiply together every active condition's fx[key]; default 1 (or `def`).
  // For boolean fx (e.g. scarcityStart) use D.condHas instead.
  D.condFx = function (state, key, def) {
    let v = (def === undefined ? 1 : def);
    const list = (state && state.conditions) || [];
    for (let i = 0; i < list.length; i++) {
      const c = D.CONDITIONS[list[i]];
      if (c && c.fx && typeof c.fx[key] === 'number') v *= c.fx[key];
    }
    return v;
  };
  D.condHas = function (state, key) {
    const list = (state && state.conditions) || [];
    for (let i = 0; i < list.length; i++) {
      const c = D.CONDITIONS[list[i]];
      if (c && c.fx && c.fx[key]) return true;
    }
    return false;
  };
  // Largest fx[key] across active conditions (for thresholds like quietUntil,
  // where stacking should take the longest, not multiply). Default 0.
  D.condMax = function (state, key) {
    let v = 0;
    const list = (state && state.conditions) || [];
    for (let i = 0; i < list.length; i++) {
      const c = D.CONDITIONS[list[i]];
      if (c && c.fx && typeof c.fx[key] === 'number') v = Math.max(v, c.fx[key]);
    }
    return v;
  };

  // ---- Tuning ----
  // SCALE NOTE: the bubble was widened in two passes (~1.7x, then doubled again)
  // for a genuine sense of a vast, drifted-apart galaxy. Every distance lever
  // moves together so travel commitment and command reach stay constant in
  // *relative* terms — only the absolute distances (and the screen gaps between
  // stars) grow. The Gabriel lane graph still auto-connects, so the network
  // stays legible; the lanes are simply long now.
  //   distScale stretches the REAL star catalogue (starcat.js) by the same factor
  //   the procedural bubble grew (bubbleR / 58, the original radius), so the real
  //   neighbourhood spreads on screen too while keeping its true proportions
  //   (Proxima & Alpha Centauri stay correctly ~0.2 ly apart).
  // Keep D.TUNE.bubbleR == D.WORLD.density.standard.bubbleR (render reads TUNE for
  // the initial zoom-to-fit and the labels).
  D.TUNE = {
    bubbleR: 200,              // playable bubble radius, ly
    distScale: 200 / 58,       // real-catalogue stretch (bubbleR / original 58)
    sysCount: 230,             // total systems (real + procedural)
    minSysDist: 9.0,           // ly — the floor that stops stars clumping
    baseRange: 68,             // command range, ly
    rangeBoost: 1.45,
    priceLo: 0.35, priceHi: 2.75, priceK: 1.5, priceMid: 1.7,
    capDefault: 120, capProducer: 260,
    presenceEdge: 0.08,
    presenceDecay: 0.999,
    sellFriction: 0.97,
    prosperityDrift: 0.02,
    researchPerPop: 0.02,
    popGrow: 0.0004,
    smartMinProfit: 4,
    scourgeWarnTicks: 45,
    scourgeMinInterval: 26,
    panaceaToWin: 20,
    panaceaToInoculate: 2,
    inoculateImmunity: 250,
    bastionBlock: 0.8,
    autosaveEvery: 40,
    rivalTradeEvery: 6,
    rivalQty: 14,
    arrivalEventChance: 0.16,
    hailMax: 8,                // bounded active hail list (oldest drops first)
    hailTtl: 90,               // ticks before an unanswered hail expires
    logGroupWindow: 10,        // recent journal entries scanned for repeat grouping
    projectMax: 6,             // concurrent supply-and-build projects
    berthPop: 0.05,            // population (M) carried per berth
    evacFarePerPop: 600,       // ¤ per M of evacuees landed safely
    cohortConvoyEvery: 10,     // ticks between NPC civilian convoy departures
    cohortConvoyPop: 0.4,      // M per NPC convoy
    cohortHopTicks: 4,         // travel ticks per lane hop for civilian convoys
    charterEvery: 110,         // ticks between passenger charter offers
    charterMax: 3,             // open charters at once
    charterTtl: 240,           // ticks before a charter lapses
    charterBase: 300,          // ¤ per M base fare
    charterPerLy: 6,           // ¤ per M per ly (scaled down with the distance rescale so fares stay balanced)
    // v2
    surveyTicks: 60,           // base ticks for a pathfinder to survey a system
    surveyResearch: 18,        // research per completed survey
    surveyChart: 120,          // credits per completed survey
    surveyDistFactor: 1.0,     // survey rewards scale up to +100% at the bubble edge
    surveyFindChance: 0.10,    // chance a completed survey turns up an anomaly find
    surveyFindChanceDeep: 0.22,// ...with Deep Charts researched
    discoverCredits: 30,       // first-light data value for charting a new system (distance-scaled)
    dataSellAt: 500,           // auto-explorers head home to sell once charts are worth this
    relocateCost: 2500,        // credits to move the Home anchorage (driftholds)
    badlandsCount: 90,         // systems in the dark shell beyond the bubble
    badlandsR: 120,            // outer radius of the badlands shell, ly
    badlandsLaneMax: 22,       // badlands lanes stretch farther (sparser stars)
    exodusX: 22,               // galactic +x beyond which relocation counts as a deep exodus
    autoYardEvery: 60,         // ticks between Tessellation Yard decisions
    autoYardReserve: 2500,     // credit buffer the yards never spend below
    autoYardIdleTicks: 150,    // unassigned idle time before a hauler is scrapped
    scrapRefund: 0.5,          // fraction of hull cost refunded on scrap
    raidBaseEvery: 90,         // pirate raid cadence baseline
    raidBasePower: 4,          // raid strength floor (scales with tick)
    raidPowerPer1k: 6,         // + per 1000 ticks
    infamyBlackMarket: 3,      // infamy needed for black market access
    blackMarketBonus: 1.15,    // sell multiplier at Reach systems w/ access
    raidCooldown: 90,          // player raid cooldown per ship
    retainerCost: 900,         // per contract
    retainerTicks: 300,
    retainerPower: 10,
    blitzCost: 600, blitzTicks: 120,
    embargoCost: 1200, embargoTicks: 200,
    contractEvery: 220,        // world event cadence
    priceHistoryEvery: 25,     // sample cadence
    priceHistoryLen: 24,       // samples kept (600 ticks of memory)
    flareDamageChance: 0.25,
    wonderResearch: 400,       // research for surveying a wonder
    // market analytics
    marketReserveMin: 12,           // absolute floor for consumer reserve target
    marketReserveCapFraction: 0.25, // fraction of capacity used as reserve floor
    marketConsumerReserveTicks: 160,// consumption ticks to cover as reserve
    marketFactoryReserveTicks: 24,  // factory input ticks to cover as reserve
    // Living Weave: lane flow heat
    laneFlowDecay: 0.9985,          // per-tick decay multiplier (~460 tick half-life ≈ several in-game weeks)
    laneFlowSaturation: 400,        // flow value where visual t reaches 1
    // Weave Health composite (market terminal headline)
    weaveWeightProsperity: 0.35,
    weaveWeightSupply: 0.30,
    weaveWeightIndustry: 0.20,
    weaveWeightCoverage: 0.15,
    weaveCoverageFlow: 2,           // min lane flow for a system to count as 'on the weave'
    // Civic Works: NPC infrastructure ambition
    civicCreditFloor: 800,          // a system never civic-spends below this wallet
    civicEvery: 25,                 // ticks between civic accumulation passes
    civicProsperityMin: 68,         // minimum prosperity to start accumulating civic momentum
    civicMomentum: 12,              // momentum needed to attempt a civic build
    // In-system shuttle hops (ship.body berths)
    hopTicksBase: 2,                // floor for any berth-to-berth hop
    hopTicksPerAU: 2.2,             // x |sqrt(a1)-sqrt(a2)| — sqrt keeps outer hops sane
    // Sol prologue
    prologueEscrow: 600,            // the Guild escrow granted at wake
    prologueGift: 400,              // the Guildmaster's parting gift at the jump beat
    prologueStipend: 150,           // Guild advance when a prologue run goes broke
    prologueStipendEvery: 60,       // ticks between advances (bankruptcy is never a wall)
    prologueOreBeat: 6,             // ore aboard to clear the first-cargo beat
    prologueProfitBeat: 70,         // creditsEarned to clear the first-sale beat
    // Stranded guard (post-tutorial): if the player has zero ships and can't
    // afford the cheapest hull at home, a salvage advance tops them up so a lost
    // last ship is never a dead end. Throttled so it can't be farmed.
    strandedAidEvery: 80,           // ticks between salvage advances
    // ---- PLEDGE foundation (SPEC[RUN-PLEDGE]). WEAVE = TONNAGE x THREAD.
    pledgeBoardEvery: 30,           // ticks between board refreshes
    pledgeBoardMax: 4,              // open offers on a full-trust board
    pledgeMaxActive: 3,             // concurrent pledges held (Founders bend this)
    pledgeTierChips: [10, 16, 26, 44], // TONNAGE chips per unit, by commodity tier
    pledgeDistChips: 0.5,           // + fraction of chips per hop of distance
    pledgeConcurrentThread: 0.5,    // +THREAD per *other* pledge held at completion
    pledgeStreakThread: 0.2,        // +THREAD per consecutive no-bust completion
    pledgeStreakCap: 2.0,           // ceiling on the streak's THREAD contribution
    pledgeWindowBase: 90,           // deadline ticks granted, baseline
    pledgeWindowPerHop: 24,         // + deadline ticks per hop (far pledges get time)
    pledgeQtyBase: 8,               // baseline pledged quantity
    pledgeQtyPerHop: 1.5,           // + quantity per hop (bigger far hauls)
    pledgeFarePerChip: 1.2,         // credits paid on completion, per chip of TONNAGE
    pledgeBondFrac: 0.2,            // escrow to seal a pledge, as fraction of fare; forfeit on bust
    pledgeOfferTtl: 150,            // ticks an untaken offer lingers on the board
  };

  // ---- The Act Ladder (SPEC[RUN-ACTS]). A focused run is 1..maxActs Guild Charter
  // periods, each with a WEAVE quota and a tick clock. Meet quota -> bank or push. ----
  D.ACTS = {
    quotaBase: 1600,        // WEAVE to clear act I
    quotaGrowth: 1.85,      // each act's quota multiplies by this
    clockBase: 900,         // ticks granted for act I (generous; > any test's tick budget)
    clockGrowth: 1.12,      // later acts get a little more time as quotas bite
    maxActs: 3,             // act III is the summit (retire or graduate)
    apertureGrowth: 1.25,   // command range x this on each push (the reach widens)
    boundaryPerk: 1,        // aptitude points granted on a push
    draftSize: 3,           // boons offered at a push boundary
  };

  // Commissions — the *character* of an act. One is drawn (seeded, no repeats)
  // when an act begins: a named Guild charter with a flavour and a rule-tint on
  // the pledge economy. This is the "blind" that makes each act — and each run's
  // sequence of acts — feel distinct. fx keys are read by SW.acts.mods().
  D.COMMISSIONS = {
    open:     { name: 'An Open Loom',        line: 'A quiet charter. Weave as you will.', fx: {} },
    drought:  { name: 'The Long Drought',    line: 'The starved worlds pay dearest. Carry to the empty.', fx: { shortageChipMult: 1.6 } },
    tithe:    { name: 'The Tithe of the Front', line: 'Serve the edge, where the Fray leans close, and the Guild pays a tithe.', fx: { frontChipMult: 1.7 } },
    flood:    { name: 'A Flood of Charters', line: 'The board overflows — more berths, tighter clocks.', fx: { maxActiveBonus: 1, windowMult: 0.8 } },
    festival: { name: 'The Founders’ Festival', line: 'The old songs are sung; a kept thread sings louder.', fx: { threadBonus: 0.5 } },
    salt:     { name: 'The Salt Roads',      line: 'Bulk and raw and heavy. The plain hauls pay this season.', fx: { tierChipMult: [1.5, 1.4, 1, 1] } },
    relics:   { name: 'The Relic Run',       line: 'Only the refined and the rare are wanted now.', fx: { tierChipMult: [1, 1, 1.5, 1.6] } },
    quiet:    { name: 'The Quiet Commission', line: 'A gentle charter, and time to breathe.', fx: { windowMult: 1.4, chipMult: 0.9 } },
  };
  D.COMMISSION_IDS = Object.keys(D.COMMISSIONS);

  // Boons — the boundary draft (SPEC[RUN-BOONS]). Pushing into the next act
  // lets you draft ONE of three. Per-run, kept until the run ends; the seed of
  // the future Charter layer. Every boon bends a *rule*, never a flat number
  // (SPEC[DESIGN-RULEBENDS]). fx read by SW.acts.mods(); a few carry per-completion state.
  D.BOONS = {
    ballast:     { name: 'Ghost Manifest', line: 'Empty holds are ballast: far pledges (5+ hops) score +0.5 THREAD.', fx: { farThreadBonus: 0.5 } },
    fifthseal:   { name: 'The Fifth Seal', line: 'Every fifth pledge you keep scores twice.', fx: { fifthSeal: true } },
    widemanifest:{ name: 'Wide Manifest',  line: 'Hold one more pledge at a time.', fx: { maxActiveBonus: 1 } },
    shortsight:  { name: 'Shortage Sense',  line: 'Deliver a good a world is starved of (<25% stock): +40% TONNAGE.', fx: { shortageChipMult: 1.4 } },
    firstlight:  { name: 'The Courier’s Habit', line: 'The first pledge you keep each act scores double THREAD.', fx: { firstlightX2: true } },
    grace:       { name: 'Guild Grace',    line: 'The first pledge you bust each act is forgiven — bond returned, thread intact.', fx: { graceEnabled: true } },
    taut:        { name: 'Wayleave',       line: 'Deliver again to a world you already served this act: +0.3 THREAD.', fx: { tautThreadBonus: 0.3 } },
    patient:     { name: 'Slow Weave',     line: 'New pledges grant +25% more time on the clock.', fx: { windowMult: 1.25 } },
    deepcoffer:  { name: 'Deep Coffers',   line: 'Every pledge bond is halved.', fx: { bondMult: 0.5 } },
    streakward:  { name: 'Streakward Knot', line: 'Your streak’s THREAD ceiling rises by +1.0.', fx: { streakCapBonus: 1.0 } },
  };
  D.BOON_IDS = Object.keys(D.BOONS);

  D.RIVAL_DEFS = [
    { id: 'helix',   name: 'Helix Combine',       archetype: 'industrial cartel', color: '#8a8f98', blurb: 'Polished, predatory, punctual. Combine Charter\'s sharpest blade.', preferred: ['TECH', 'ALLOY'], lineTarget: 4, maxShips: 8, qtyMult: 1.2, expand: 'industrial' },
    { id: 'mariner', name: 'Mariner Syndicate',   archetype: 'commons haulers',   color: '#6e7681', blurb: 'Old routes, older grudges. The Commons made flesh.', preferred: ['FUEL', 'FOOD'], lineTarget: 4, maxShips: 8, qtyMult: 1.1, expand: 'ports' },
    { id: 'vigilant',name: 'Vigil Picket Line',   archetype: 'quarantine order',  color: '#7c8798', blurb: 'Escorts, inspections, and a long memory for plague routes.', preferred: ['ALLOY', 'MEDS', 'FUEL'], lineTarget: 3, maxShips: 7, qtyMult: 0.9, expand: 'front' },
    { id: 'synodic', name: 'Synod Relief Chain',  archetype: 'relief mission',    color: '#91969f', blurb: 'Pilgrim barges following need, prayer, and famine.', preferred: ['FOOD', 'MEDS'], lineTarget: 3, maxShips: 7, qtyMult: 1.0, expand: 'population' },
    { id: 'loomward',name: 'Loomward Tithes',     archetype: 'relic convoy',      color: '#777f8f', blurb: 'Crystal, ruins, and debts paid to dead infrastructure.', preferred: ['CRYSTAL', 'TECH'], lineTarget: 3, maxShips: 6, qtyMult: 0.8, expand: 'ruins' },
    { id: 'severedco', name: 'Severed Freeholds', archetype: 'corsair brokers',   color: '#686f7c', blurb: 'Insurance, tolls, and smiles with teeth.', preferred: ['ORE', 'CRYSTAL'], lineTarget: 3, maxShips: 7, qtyMult: 1.0, expand: 'reach' },
  ];

  return D;
})();
