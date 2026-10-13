import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import composeMatchModel from '../../src/application/composition/compose-match-model.js';
import createHotseatGameModel from '../../src/application/models/hotseat-game-model.js';
import createHotseatMatchController from '../../src/application/controllers/hotseat-match-controller.js';
import playerModule from '../../src/domain/game/player.js';
import stateModule from '../../src/domain/game/game-state.js';
import recordsModule from '../../src/domain/game/game-records.js';
import createHotseatSettings from '../../src/shared/data/hotseat-settings.js';
import createHotseatSession from '../../src/infrastructure/navigation/hotseat-session.js';
const { normalizeHotseatNames, validateHotseatNames } = createHotseatSettings();

function value(factory) {
  const module = {};
  factory(module, {});
  return module.exports;
}
const State = value(stateModule);
function fixture() {
  let score = 0;
  const referee = {
    syncAreaWithSimulator() {},
    resetGContext(context) {
      context.ballOn = 2;
      context.inHand = 2;
    },
    checkResult(_context, _simulator, result) {
      result.score = score;
      result.foulCode = score < 0 ? 1 : 0;
    },
  };
  const dependencies = {
    BaseGameModel: EventEmitter,
    GameState: { a: State },
    Player: { a: value(playerModule) },
    gameRecords: { a: value(recordsModule) },
    aiRegistry: {
      getSelectedAIInfo: () => ({ userId: 'ai', displayName: 'AI', stickName: 'stickAlpha' }),
    },
    refereeRegistry: { a: { getInstance: () => referee } },
    localGameSettings: {
      getLocalUserInfo: () => ({ userId: 'local', displayName: 'LOCAL', stickName: 'stickAlpha' }),
      getGameDefineData: (key) =>
        ({ sceneId: 'main', ballSet: [0, 1, 2], ballRadius: 0.02, ballMass: 1, refId: 'snooker' })[
          key
        ],
    },
    session: { config: { names: ['Alice', 'Bob'] } },
  };
  const Base = composeMatchModel(dependencies).SnookerGameModel;
  const Model = createHotseatGameModel(Base, dependencies);
  const model = new Model();
  const simulator = {
    nAwakened: 0,
    reset() {
      return this;
    },
    save() {},
  };
  model.asyncLaunch(() => {});
  model.reqReset(simulator);
  return {
    model,
    dependencies,
    simulator,
    setScore: (value) => {
      score = value;
    },
  };
}

test('two human identities ignore selected AI and alternate only their own rematches', () => {
  const { model, dependencies, simulator } = fixture();
  assert.deepEqual(
    model.players.map((player) => [player.id, player.type, player.displayName]),
    [
      ['hotseat-player-1', 0, 'Alice'],
      ['hotseat-player-2', 0, 'Bob'],
    ],
  );
  assert.equal(model.getContext('playerIndex'), 0);
  model.players[0].pts = 12;
  model.reqReset(simulator);
  assert.equal(model.getContext('playerIndex'), 1);
  assert.equal(model.players[0].pts, 0);
  model.reqReset(simulator);
  assert.equal(model.getContext('playerIndex'), 0);
  dependencies.session.config = null;
  model.asyncLaunch(() => {});
  model.reqReset(simulator);
  assert.equal(model.isHotseat, false);
  assert.equal(model.players[1].type, 1);
  assert.equal(model.getContext('playerIndex'), 0, 'hotseat did not consume the AI counter');
  dependencies.session.config = { names: ['Carol', 'Dan'] };
  model.asyncLaunch(() => {});
  model.reqReset(simulator);
  assert.equal(model.getContext('playerIndex'), 0, 'new match starts with first seat');
});

test('retained round adjudication keeps scorer, switches misses/fouls, rejects duplicate shots', () => {
  const { model, simulator, setScore } = fixture();
  assert.equal(model.reportPlayerStroke(1), false);
  setScore(7);
  assert.equal(model.reportPlayerStroke(0), true);
  assert.equal(model.reportPlayerStroke(0), false);
  model.reqRoundResult(simulator);
  assert.equal(model.getContext('playerIndex'), 0);
  assert.equal(model.players[0].pts, 7);
  assert.equal(model.players[0].maxbrk, 7);
  setScore(0);
  model.reportPlayerStroke(0);
  model.reqRoundResult(simulator);
  assert.equal(model.getContext('playerIndex'), 1);
  setScore(-4);
  model.reportPlayerStroke(1);
  model.reqRoundResult(simulator);
  assert.equal(model.getContext('playerIndex'), 0);
  assert.equal(model.players[1].penalty, -4);
  assert.deepEqual(
    model.players.map((player) => player.shootingCount),
    [2, 1],
  );
  const previous = JSON.stringify(model._gContext);
  model.reqRoundResult(simulator);
  assert.equal(JSON.stringify(model._gContext), previous);
});

test('handover unbinds old control before one shared local owner is reactivated', () => {
  const calls = [];
  class Base {
    _createPlayerControllers() {
      calls.push('single');
    }
    _onModelResponse() {
      calls.push('response');
    }
  }
  const Controller = createHotseatMatchController(Base, State, { ACTING: 3 });
  const controller = new Controller();
  controller._model = {
    isHotseat: true,
    getContext: () => 1,
    getControllerSetting: () => ({}),
    players: [{ getInfoData: () => 'cue' }, {}],
  };
  controller._playerCtls = [];
  controller._gView = { camera: { position: {} } };
  controller._state = 3;
  controller._fpc = {
    _gPlayerIndex: 0,
    get gPlayerIndex() {
      return this._gPlayerIndex;
    },
    reset() {},
    deactivate() {
      calls.push('deactivate');
    },
    syncEnter() {
      calls.push('sync');
    },
    gotoState0() {
      calls.push('stand');
    },
  };
  controller._activeSubControl = {
    deactivate() {
      calls.push('unbind');
    },
  };
  controller._createPlayerControllers();
  assert.equal(controller._playerCtls.length, 1);
  assert.equal(new Set(controller._playerCtls).size, 1);
  controller._onModelResponse({ score: 0 });
  assert.equal(controller._fpc.gPlayerIndex, 1);
  assert.deepEqual(calls, ['unbind', 'deactivate', 'sync', 'stand', 'response']);
  calls.length = 0;
  controller._onModelResponse({ score: 7 });
  assert.deepEqual(calls, ['response']);
});

test('names trim spaces, retain Unicode, bound code points and reject duplicate defaults', () => {
  assert.deepEqual(normalizeHotseatNames(['  王  小明  ', '']), ['王 小明', 'PLAYER 2']);
  assert.equal(Array.from(normalizeHotseatNames(['🎱'.repeat(22), 'B'])[0]).length, 20);
  assert.ok(validateHotseatNames(['Alice', ' alice ']).error);
  assert.ok(validateHotseatNames(['PLAYER 2', '']).error);
  assert.deepEqual(validateHotseatNames(['', '']).names, ['PLAYER 1', 'PLAYER 2']);
  assert.equal(validateHotseatNames(['🎱'.repeat(21), 'B']).invalidIndex, 0);
});

test('draft persistence restores setup without auto-start and tolerates disabled/corrupt storage', () => {
  let stored = null;
  const host = {
    sessionStorage: {
      getItem: () => stored,
      setItem: (_key, value) => {
        stored = value;
      },
    },
  };
  const session = createHotseatSession(host);
  const draft = { names: ['王小明', 'Bob'], venue: 'interior-design-002' };
  session.saveDraft(draft);
  const restored = createHotseatSession(host);
  assert.deepEqual(restored.draft, draft);
  assert.equal(restored.returnToSetup, true);
  assert.equal(restored.config, null);
  restored.saveDraft(draft, 'overview');
  assert.equal(createHotseatSession(host).returnToSetup, false);
  stored = '{';
  assert.equal(createHotseatSession(host).draft, null);
  stored = JSON.stringify({
    version: 1,
    mode: 'hotseat',
    returnTo: 'setup',
    names: ['A', 'B'],
    venue: 'foreign',
  });
  assert.equal(createHotseatSession(host).draft, null);
  const blocked = {
    get sessionStorage() {
      throw new Error('disabled');
    },
  };
  const memory = createHotseatSession(blocked);
  memory.saveDraft(draft);
  assert.deepEqual(memory.draft, draft);
});
