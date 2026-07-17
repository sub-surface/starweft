/* STARWEFT campaign.js - lifetime schemas, save migration, and campaign identity.
   Headless and deterministic. SPEC[SW-STATE-001], SPEC[SW-TECH-001]. */
var SW = globalThis.SW = globalThis.SW || {};

SW.campaign = (function () {
  'use strict';
  const C = {};
  const U = SW.util;

  C.SAVE_VERSION = 3;
  C.ACCOUNT_VERSION = 1;
  C.CAMPAIGN_VERSION = 1;
  C.THREAD_VERSION = 1;
  C.ACT_VERSION = 1;

  // Existing modules still address state.foo. These frozen ownership lists let
  // them do so through non-enumerable accessors while JSON contains only the
  // canonical lifetime sections. New fields must be assigned to one owner here.
  const CAMPAIGN_FIELDS = [
    'seed', 'world', 'systems', 'regions', 'homeId', 'rivals',
    'scourge', 'scourgeOriginId', 'laneFlow', 'rep', 'infamy',
    'scarceCommodity', 'conditions', 'threat'
  ];
  const THREAD_FIELDS = [
    'daily', 'difficulty', 'doctrineLean', 'founder', 'identity', 'origin',
    'rngState', 'credits', 'research', 'ships', 'routes', 'directives', 'stats', 'tech',
    'bookmarks', 'perks', 'perkPoints', 'milestones', 'scourgeStance',
    'originBonusSurvey', 'autoYardsOff', 'gameOver', 'journal',
    'lastStrandedAid', 'loomshipId', 'pledgeMaxActiveBonus', 'pledgeRng',
    'pledges', 'board', 'nextPledgeId', 'pledgeStats', 'pledgeStreak',
    'projects', 'nextProjectId', 'retainers', 'combat', 'weave', 'story', 'ops',
    'tick', 'nextWorldAt', 'contracts', 'charters', 'nextCharterId',
    'nextCohortId', 'news', 'nextId', 'paused', 'speed', 'fragments',
    'blockades', 'cohorts'
  ];
  const ACT_FIELDS = ['acts', 'tutorial'];

  // Canonical v3 data is closed at every lifetime boundary, not merely at the
  // JSON root. This prevents a field such as campaign.credits from silently
  // acquiring two owners. Legacy-only payloads remain intact inside the one
  // explicitly quarantined legacyUnknown object.
  const CAMPAIGN_META = [
    'version', 'id', 'status', 'solId', 'seeds', 'threadNumber',
    'completedThreads', 'archive', 'capabilities', 'holdings', 'scars',
    'summit', 'generation', 'generationStreams', 'migration', 'legacyUnknown'
  ];
  const THREAD_META = [
    'version', 'id', 'index', 'status', 'elapsedTicks', 'launch', 'replay',
    'build', 'objectives', 'mode'
  ];
  const ACT_META = [
    'version', 'id', 'index', 'scale', 'startedAt', 'aperture'
  ];
  const ACCOUNT_FIELDS = [
    'version', 'id', 'settings', 'accessibility', 'chronicle',
    'activeCampaignId', 'activeSaveKind', 'nextCampaign'
  ];
  const CHRONICLE_FIELDS = ['version', 'flags', 'records', 'unlocks', 'campaigns'];

  const OWNER = Object.create(null);
  CAMPAIGN_FIELDS.forEach(function (name) { OWNER[name] = 'campaign'; });
  THREAD_FIELDS.forEach(function (name) { OWNER[name] = 'thread'; });
  ACT_FIELDS.forEach(function (name) { OWNER[name] = 'act'; });

  C.fields = function () {
    return {
      campaign: CAMPAIGN_FIELDS.slice(),
      thread: THREAD_FIELDS.slice(),
      act: ACT_FIELDS.slice()
    };
  };

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function hex32(n) {
    return (n >>> 0).toString(16).padStart(8, '0');
  }

  C.deriveSeeds = function (seed) {
    seed = String(seed);
    return {
      version: 1,
      galaxy: U.seedFrom(seed + ':galaxy'),
      bubble: U.seedFrom(seed + ':bubble'),
      system: U.seedFrom(seed + ':system'),
      objectives: U.seedFrom(seed + ':objectives'),
      runtime: U.seedFrom(seed + ':runtime')
    };
  };

  // Isolated deterministic sub-streams. Callers consume the returned local
  // state and explicitly persist a cursor only when their lifetime owns one;
  // diagnostics and generation validators therefore never perturb runtime RNG.
  C.seedStream = function (stateOrSeed, layer, cursor) {
    const seed = typeof stateOrSeed === 'object' ? stateOrSeed.seed : stateOrSeed;
    const layers = typeof stateOrSeed === 'object' && stateOrSeed.campaign && stateOrSeed.campaign.seeds
      ? stateOrSeed.campaign.seeds : C.deriveSeeds(seed);
    if (!Object.prototype.hasOwnProperty.call(layers, layer) || layer === 'version') throw new Error('Unknown seed layer: ' + layer);
    const stream = { rngState: layers[layer] >>> 0, layer: layer, cursor: 0 };
    const n = Math.max(0, Number.isInteger(cursor) ? cursor : 0);
    for (let i = 0; i < n; i++) U.rnd(stream);
    stream.cursor = n;
    return stream;
  };

  C.withSeedLayer = function (state, layer, fn) {
    if (!state || !state.campaign || typeof fn !== 'function') throw new Error('Seed layer requires canonical campaign state.');
    const original = state.rngState;
    const stream = C.seedStream(state, layer);
    state.campaign.generationStreams = state.campaign.generationStreams || { version: 1 };
    state.rngState = stream.rngState;
    try {
      const result = fn(state);
      state.campaign.generationStreams[layer] = {
        start: stream.rngState,
        end: state.rngState >>> 0
      };
      return result;
    } finally {
      state.rngState = original;
    }
  };

  function defaultCampaign(seed, id) {
    return {
      version: C.CAMPAIGN_VERSION,
      id: id || ('weave-' + hex32(U.seedFrom(String(seed)))),
      status: 'active',
      solId: 0,
      seeds: C.deriveSeeds(seed),
      threadNumber: 1,
      completedThreads: [],
      archive: { version: 1, entries: [], capacity: 4 },
      capabilities: { reach: 0, resilience: 0, accord: 0 },
      holdings: [],
      scars: [],
      summit: { version: 1, available: false, resolved: false },
      generationStreams: { version: 1 }
    };
  }

  function defaultThread(campaignId, index) {
    return {
      version: C.THREAD_VERSION,
      id: campaignId + '-thread-' + index,
      index: index,
      status: 'active',
      elapsedTicks: 0,
      launch: null,
      replay: { version: 1, complete: true },
      build: { version: 1, slots: 4, active: [], pool: [], rerolls: 1 },
      objectives: { version: 1, active: [], completed: [], failed: [], nextId: 1 }
    };
  }

  function defaultAct(campaignId, index) {
    return {
      version: C.ACT_VERSION,
      id: campaignId + '-thread-' + index + '-act-1',
      index: 1,
      scale: 'system',
      startedAt: 0,
      aperture: null
    };
  }

  function defineAlias(state, name, owner) {
    const current = Object.getOwnPropertyDescriptor(state, name);
    if (current && current.get && current.set) return;
    Object.defineProperty(state, name, {
      // Lifetime aliases are structural: allowing `delete state.foo` would
      // let a later assignment recreate an enumerable, unpartitioned root.
      configurable: false,
      enumerable: false,
      get: function () { return state[owner][name]; },
      set: function (value) { state[owner][name] = value; }
    });
  }

  C.attach = function (state) {
    if (!state || typeof state !== 'object') return state;
    state.schema = state.schema || {
      account: C.ACCOUNT_VERSION,
      campaign: C.CAMPAIGN_VERSION,
      thread: C.THREAD_VERSION,
      act: C.ACT_VERSION
    };
    state.kind = state.kind || 'campaign-save';
    state.accountId = state.accountId || 'local';
    state.campaign = state.campaign || defaultCampaign('unknown');
    state.thread = state.thread || defaultThread(state.campaign.id, state.campaign.threadNumber || 1);
    state.act = state.act || defaultAct(state.campaign.id, state.thread.index || 1);
    Object.keys(OWNER).forEach(function (name) { defineAlias(state, name, OWNER[name]); });
    return state;
  };

  C.create = function (flat, opts) {
    flat = flat || {};
    opts = opts || {};
    const seed = flat.seed === undefined ? 'unknown' : String(flat.seed);
    const campaign = defaultCampaign(seed, opts.campaignId);
    const thread = defaultThread(campaign.id, 1);
    const act = defaultAct(campaign.id, 1);
    const state = {
      version: C.SAVE_VERSION,
      kind: 'campaign-save',
      schema: {
        account: C.ACCOUNT_VERSION,
        campaign: C.CAMPAIGN_VERSION,
        thread: C.THREAD_VERSION,
        act: C.ACT_VERSION
      },
      accountId: opts.accountId || 'local',
      campaign: campaign,
      thread: thread,
      act: act
    };
    Object.keys(flat).forEach(function (name) {
      if (name === 'version') return;
      const owner = OWNER[name];
      if (owner) state[owner][name] = clone(flat[name]);
      else if (opts.fromVersion) {
        state.campaign.legacyUnknown = state.campaign.legacyUnknown || {};
        state.campaign.legacyUnknown[name] = clone(flat[name]);
      } else {
        throw new Error('Unowned canonical state field: ' + name);
      }
    });
    C.attach(state);
    return state;
  };

  C.migrate = function (input) {
    if (!input || typeof input !== 'object') return { ok: false, msg: 'Not a save file.' };
    if (input.version === C.SAVE_VERSION) {
      const state = clone(input);
      let adapted = false;
      const replayClaimsComplete = !state.thread || !state.thread.replay || state.thread.replay.complete !== false;
      const preLayered = !state.campaign || !state.campaign.seeds ||
        !Number.isInteger(state.campaign.seeds.runtime) ||
        !state.campaign.generationStreams || state.campaign.generationStreams.version !== 1 ||
        (replayClaimsComplete && (!state.thread || !state.thread.launch || !Number.isInteger(state.thread.launch.runtimeSeed)));
      if (preLayered && state.campaign && state.thread) {
        // v3 checkpoints written before generator/runtime isolation remain
        // physically authoritative, but cannot recreate their launch world.
        // Adapt their schema without altering saved matter or runtime RNG and
        // refuse a replay that would silently construct a different galaxy.
        const derived = C.deriveSeeds(state.campaign.seed === undefined ? 'unknown' : state.campaign.seed);
        state.campaign.seeds = Object.assign({}, derived, state.campaign.seeds || {});
        state.campaign.generationStreams = state.campaign.generationStreams || { version: 1, legacy: true };
        state.campaign.migration = Object.assign({}, state.campaign.migration || {}, { adapter: 'pre-layer-v3' });
        state.thread.replay = Object.assign({}, state.thread.replay || {}, {
          version: 1,
          complete: false,
          reason: 'This v3 checkpoint predates isolated generation streams; saved play is intact, but deterministic replay is unavailable.'
        });
        adapted = true;
      }
      const errors = C.validate(state);
      if (errors.length) return { ok: false, msg: errors.join('; '), errors: errors };
      C.attach(state);
      return { ok: true, state: state, migrated: false, adapted: adapted, fromVersion: C.SAVE_VERSION };
    }
    if (input.version === 2) {
      // v2 was one flat run object. Preserve every known field under its explicit
      // owner and quarantine unknown fields so no user data vanishes.
      const state = C.create(input, { fromVersion: 2 });
      state.kind = 'legacy-weave';
      state.campaign.status = 'legacy';
      state.thread.mode = 'legacy';
      state.campaign.migration = { fromVersion: 2, adapter: 'flat-run-v2' };
      state.thread.replay.complete = false;
      state.thread.replay.reason = 'Imported v2 journals do not contain a complete launch envelope.';
      const sol = Array.isArray(state.systems)
        ? state.systems.find(function (sys) { return sys && sys.name === 'Sol'; }) : null;
      state.campaign.solId = sol ? sol.id : 0;
      if (state.acts && state.acts.n) {
        state.act.index = state.acts.n;
        state.act.scale = state.acts.n === 1 ? 'system' : (state.acts.n === 2 ? 'bubble' : 'galaxy');
        state.act.startedAt = state.acts.startTick || 0;
      }
      const errors = C.validate(state);
      return errors.length ? { ok: false, msg: errors.join('; '), errors: errors } :
        { ok: true, state: state, migrated: true, fromVersion: 2 };
    }
    return { ok: false, msg: 'Save is from version ' + input.version + '; no safe migration is available.' };
  };

  C.validate = function (state) {
    const errors = [];
    if (!state || typeof state !== 'object') return ['not an object'];
    if (state.version !== C.SAVE_VERSION) errors.push('save version must be ' + C.SAVE_VERSION);
    if (state.kind !== 'campaign-save' && state.kind !== 'legacy-weave') errors.push('save kind invalid');
    if (!state.schema || state.schema.account !== C.ACCOUNT_VERSION ||
        state.schema.campaign !== C.CAMPAIGN_VERSION ||
        state.schema.thread !== C.THREAD_VERSION || state.schema.act !== C.ACT_VERSION) {
      errors.push('lifetime schema versions are missing or unsupported');
    }
    if (state.schema && typeof state.schema === 'object') {
      const schemaKeys = { account: true, campaign: true, thread: true, act: true };
      Object.keys(state.schema).forEach(function (name) {
        if (!schemaKeys[name]) errors.push('unknown lifetime schema: ' + name);
      });
    }
    if (!state.campaign || state.campaign.version !== C.CAMPAIGN_VERSION || !state.campaign.id) errors.push('campaign schema invalid');
    if (!state.thread || state.thread.version !== C.THREAD_VERSION || !state.thread.id) errors.push('thread schema invalid');
    if (!state.act || state.act.version !== C.ACT_VERSION || !state.act.id) errors.push('act schema invalid');
    if (!state.campaign || !state.campaign.seeds || !Number.isInteger(state.campaign.seeds.runtime) ||
        !state.campaign.generationStreams || state.campaign.generationStreams.version !== 1) errors.push('generation stream schema invalid');
    if (state.thread && state.thread.replay && state.thread.replay.complete &&
        (!state.thread.launch || !Number.isInteger(state.thread.launch.runtimeSeed))) errors.push('replayable thread lacks a runtime seed');
    if (!state.campaign || !Array.isArray(state.campaign.systems) || !state.campaign.systems.length) errors.push('campaign has no galaxy');
    if (!state.thread || !Array.isArray(state.thread.ships)) errors.push('thread ships missing');
    const allowedRoot = { version: true, kind: true, schema: true, accountId: true, campaign: true, thread: true, act: true };
    Object.keys(state).forEach(function (name) {
      if (!allowedRoot[name]) errors.push('unpartitioned root field: ' + name);
    });
    function closedOwner(owner, metadata, fields) {
      const value = state[owner];
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;
      const allowed = Object.create(null);
      metadata.concat(fields).forEach(function (name) { allowed[name] = true; });
      Object.keys(value).forEach(function (name) {
        if (!allowed[name]) errors.push('unowned ' + owner + ' field: ' + name);
      });
    }
    closedOwner('campaign', CAMPAIGN_META, CAMPAIGN_FIELDS);
    closedOwner('thread', THREAD_META, THREAD_FIELDS);
    closedOwner('act', ACT_META, ACT_FIELDS);
    return errors;
  };

  C.serialize = function (state) {
    const errors = C.validate(state);
    if (errors.length) return { ok: false, msg: errors.join('; '), errors: errors };
    try {
      const raw = JSON.stringify(state);
      const parsed = JSON.parse(raw);
      return { ok: true, raw: raw, value: parsed };
    } catch (e) {
      return { ok: false, msg: 'Campaign serialization failed: ' + e.message };
    }
  };

  C.newAccount = function (legacyFlags) {
    return {
      version: C.ACCOUNT_VERSION,
      id: 'local',
      settings: {},
      accessibility: {},
      chronicle: {
        version: 1,
        flags: clone(legacyFlags || {}),
        records: [],
        unlocks: [],
        campaigns: []
      },
      activeCampaignId: null,
      activeSaveKind: 'campaign-save',
      nextCampaign: 1
    };
  };

  C.account = function (input, legacyFlags) {
    if (!input || typeof input !== 'object') return C.newAccount(legacyFlags);
    if (input.version !== C.ACCOUNT_VERSION) return C.newAccount(legacyFlags);
    input.id = input.id || 'local';
    input.settings = input.settings || {};
    input.accessibility = input.accessibility || {};
    input.chronicle = input.chronicle || { version: 1, flags: {}, records: [], unlocks: [], campaigns: [] };
    input.chronicle.flags = input.chronicle.flags || {};
    input.chronicle.records = input.chronicle.records || [];
    input.chronicle.unlocks = input.chronicle.unlocks || [];
    input.chronicle.campaigns = input.chronicle.campaigns || [];
    input.activeSaveKind = input.activeSaveKind === 'legacy-weave' ? 'legacy-weave' : 'campaign-save';
    input.nextCampaign = Number.isInteger(input.nextCampaign) && input.nextCampaign > 0 ? input.nextCampaign : 1;
    Object.keys(legacyFlags || {}).forEach(function (key) {
      if (legacyFlags[key]) input.chronicle.flags[key] = true;
    });
    return input;
  };

  C.validateAccount = function (account) {
    const errors = [];
    if (!account || account.version !== C.ACCOUNT_VERSION) errors.push('account version invalid');
    if (!account || !account.chronicle || account.chronicle.version !== 1 || !account.chronicle.flags ||
        typeof account.chronicle.flags !== 'object' || Array.isArray(account.chronicle.flags) ||
        !Array.isArray(account.chronicle.records) || !Array.isArray(account.chronicle.unlocks) ||
        !Array.isArray(account.chronicle.campaigns)) errors.push('Chronicle schema invalid');
    if (!account || (account.activeSaveKind !== 'campaign-save' && account.activeSaveKind !== 'legacy-weave')) errors.push('account active save kind invalid');
    function closed(value, names, label) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;
      const allowed = Object.create(null);
      names.forEach(function (name) { allowed[name] = true; });
      Object.keys(value).forEach(function (name) {
        if (!allowed[name]) errors.push('unowned ' + label + ' field: ' + name);
      });
    }
    closed(account, ACCOUNT_FIELDS, 'account');
    closed(account && account.chronicle, CHRONICLE_FIELDS, 'Chronicle');
    return errors;
  };

  C.register = function (account, state) {
    if (!account || !state || !state.campaign) return;
    const list = account.chronicle.campaigns;
    const summary = {
      id: state.campaign.id,
      kind: state.kind,
      seed: state.seed,
      status: state.campaign.status,
      threadNumber: state.campaign.threadNumber,
      tick: state.tick,
      capabilityTotal: (state.campaign.capabilities.reach || 0) +
        (state.campaign.capabilities.resilience || 0) + (state.campaign.capabilities.accord || 0)
    };
    const at = list.findIndex(function (item) { return item.id === summary.id; });
    if (at >= 0) list[at] = summary;
    else { list.push(summary); account.nextCampaign = (account.nextCampaign || 1) + 1; }
    account.activeCampaignId = state.campaign.id;
    account.activeSaveKind = state.kind;
  };

  return C;
})();
