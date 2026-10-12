import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import gameRecordsModule from '../../src/domain/game/game-records.js';
import objectUtilsModule from '../../src/shared/data/object-utils.js';
import initialLayoutModule from '../../src/domain/scene/initial-layout.js';
import gameStateModule from '../../src/domain/game/game-state.js';
import { gameComposition } from '../helpers/game-composition-fixture.mjs';

function moduleValue(factory) {
  const module = {};
  factory(module, {});
  return module.exports;
}
const records = moduleValue(gameRecordsModule);
const layout = moduleValue(initialLayoutModule);
const utils = moduleValue(objectUtilsModule);
const state = moduleValue(gameStateModule);

function session() {
  const loadModule = (id) =>
    ({
      'domain/scene/initial-layout': layout,
      'shared/data/object-utils': utils,
    })[id];
  loadModule.n = (value) => ({ a: value });
  return gameComposition({
    name: 'composeSession',
    entry: 'src/application/composition/compose-session.js',

    inputs: { gameRecords: { a: records }, EventEmitter: { a: EventEmitter }, loadModule },
    globals: { setTimeout },
  });
}
const user = {
  userId: 'user',
  displayName: 'Player',
  level: 3,
  stickName: 'stickAlpha',
  gameDefineId: 'default',
};

test('local launch restores named identity and retains the default offline session', async () => {
  const family = session();
  const model = new family.LocalGameModel();
  const route = await new Promise((resolve, reject) => {
    model.asyncLaunch({ userId: 'local-player', displayName: 'PLAYER 1' }, (error, name) => {
      if (error) {
        reject(error);
      } else {
        resolve(name);
      }
    });
  });
  assert.equal(route, 'home');
  assert.deepEqual(
    { ...family.localGameSettings.getLocalUserInfo() },
    {
      userId: 'local-player',
      displayName: 'PLAYER 1',
      level: 1,
      stickName: 'stickAlpha',
    },
  );
  assert.equal(family.localGameSettings.getGameSettings('camera').fov, 0.88);
  assert.deepEqual(family.localGameSettings.getGameDefineData('ballSet'), layout.default.ballSet);
});

test('session settings retain defaults, deep layout copies and nested restore merging', () => {
  const first = session();
  const settings = first.localGameSettings;
  assert.equal(settings.restore({ ...user, settings: { camera: { fov: 0.9 } } }), true);
  assert.equal(settings.getGameSettings('camera').fov, 0.9);
  assert.equal(settings.getGameSettings('camera').minZ, 0.01);
  assert.equal(settings.getGameSettings('personController').eyeStandHeight, 1.7);
  const ballSet = settings.getGameDefineData('ballSet');
  ballSet[0] = 99;
  assert.equal(settings.getGameDefineData('ballSet')[0], 0);
  assert.equal(layout.default.ballSet[0], 0);
  const camera = settings.getGameSettings('camera');
  assert.equal(
    new first.BaseGameModel().getControllerSetting(),
    settings.getGameSettings('personController'),
  );
  settings.restore(user);
  assert.notEqual(settings.getGameSettings('camera'), camera);
  assert.equal(settings.getGameSettings('camera').fov, 0.88);
  assert.equal(settings.getLocalUserInfoData('displayName'), 'Player');
});

test('settings and controller counters are shared within a session and independent between sessions', () => {
  const first = session();
  const second = session();
  first.localGameSettings.restore(user);
  second.localGameSettings.restore({ ...user, displayName: 'Other' });
  const a = new first.BaseController('a');
  const b = new first.BaseController('b');
  assert.equal(a.id, 1);
  assert.equal(b.id, 2);
  a.launch();
  assert.equal(a.state, first.ControllerState.PENDING);
  a.free();
  assert.equal(new first.BaseController('c').id, 3);
  assert.equal(new second.BaseController('d').id, 1);
  assert.equal(first.localGameSettings.getLocalUserInfo().displayName, 'Player');
  assert.equal(second.localGameSettings.getLocalUserInfo().displayName, 'Other');
});

function geometry() {
  return gameComposition({
    name: 'composeRouteGeometry',
    entry: 'src/application/composition/compose-route-geometry.js',
  });
}
function ai() {
  const types = geometry();
  class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
      Object.assign(this, { x, y, z });
    }
  }
  Vec3.EPSILON = 1e-6;
  return gameComposition({
    name: 'composeAi',
    entry: 'src/application/composition/compose-ai.js',

    inputs: {
      ...types,
      physicsApi: { a: { Vec3 } },
      geometryUtils: { a: {} },
      gameRecords: { a: records },
      BaseGameModel: EventEmitter,
      localGameSettings: {},
    },
  });
}

test('AI registration retains all three configurations and reuses one planner across selection', () => {
  const { aiRegistry } = ai();
  assert.equal(aiRegistry.getSelectedAIInfo(), null);
  assert.equal(aiRegistry.getSelectedAIInstance(), null);
  assert.deepEqual(
    Array.from(aiRegistry.getInfoList(), (info) => info.userId),
    ['ai1', 'ai2', 'ai3'],
  );
  aiRegistry.setSelectedIndex(0);
  const planner = aiRegistry.getSelectedAIInstance();
  assert.equal(planner._props.range, 1.9);
  assert.equal(planner._props.abf, 1.2);
  aiRegistry.setSelectedIndex(1);
  assert.equal(aiRegistry.getSelectedAIInstance(), planner);
  assert.equal(planner._props.range, 2.5);
  aiRegistry.setSelectedIndex(2);
  assert.equal(aiRegistry.getSelectedAIInstance(), planner);
  assert.equal(planner._props.chaoticSeed, 2);
  assert.equal(planner._props.mpm, 0.45);
  assert.equal(aiRegistry.getSelectedAIInfo(), aiRegistry.getInfoList()[2]);
  aiRegistry.setSelectedIndex(3);
  assert.equal(aiRegistry.getSelectedAIInstance(), null);
});

test('independent AI compositions own distinct route caches and selection state', () => {
  const first = ai().aiRegistry;
  const second = ai().aiRegistry;
  first.setSelectedIndex(0);
  second.setSelectedIndex(2);
  const a = first.getSelectedAIInstance();
  const b = second.getSelectedAIInstance();
  assert.notEqual(a, b);
  assert.notEqual(a._routeCache, b._routeCache);
  a._routeCache.next(1, 2, 3, 4, 5, 6);
  assert.equal(a._routeCache.length, 1);
  assert.equal(b._routeCache.length, 0);
  assert.equal(first.getSelectedAIInfo().userId, 'ai1');
});

function matchFamily() {
  return gameComposition({
    name: 'composeMatchModel',
    entry: 'src/application/composition/compose-match-model.js',

    inputs: {
      BaseGameModel: EventEmitter,
      GameState: { a: state },
      gameRecords: { a: records },
      Player: {},
      aiRegistry: {},
      localGameSettings: {},
      refereeRegistry: {},
    },
  }).SnookerGameModel;
}
function playable(Model, nPlayers = 2) {
  const model = new Model();
  model._players = Array.from({ length: nPlayers }, () => ({ clearScores() {} }));
  model._locRef = {
    resetGContext(context) {
      context.ballOn = 2;
    },
    syncAreaWithSimulator() {},
  };
  model._changeState(state.READY);
  return model;
}
const simulator = {
  nAwakened: 0,
  reset() {
    return this;
  },
  save() {},
};

test('match models retain one starting-player rotation across models and repeated resets', () => {
  const Model = matchFamily();
  const first = playable(Model);
  const second = playable(Model);
  first.reqReset(simulator);
  second.reqReset(simulator);
  first.reqReset(simulator);
  assert.equal(first.getContext('playerIndex'), 0);
  assert.equal(second.getContext('playerIndex'), 1);
  assert.equal(first.getContext('nRounds'), 0);
  assert.equal(first.gState, state.READY);
  second.reqReset(simulator);
  assert.equal(second.getContext('playerIndex'), 1);
  const Independent = matchFamily();
  const independent = playable(Independent);
  independent.reqReset(simulator);
  assert.equal(independent.getContext('playerIndex'), 0);
});

test('unlaunched models do not consume rotation and single-player resets keep the shared counter', () => {
  const Model = matchFamily();
  new Model().reqReset(simulator);
  const practice = playable(Model, 1);
  practice.reqReset(simulator);
  assert.equal(practice.getContext('playerIndex'), 0);
  const match = playable(Model, 2);
  match.reqReset(simulator);
  assert.equal(match.getContext('playerIndex'), 1);
});
