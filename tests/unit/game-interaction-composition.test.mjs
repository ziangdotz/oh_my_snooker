import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import babylonModule from '../../src/third-party/rendering/babylon-engine.js';
import legacyFactory from '../../src/compatibility/legacy-factory.js';
import vectorThreeModule from '../../src/domain/math/vector-three.js';
import quaternionModule from '../../src/domain/math/quaternion.js';
import planeModule from '../../src/domain/geometry/plane.js';
import createVectorTwo from '../../src/domain/math/vector-two.js';
import createLineTwo from '../../src/domain/geometry/line-two.js';
import createEllipseTwo from '../../src/domain/geometry/ellipse-two.js';
import { factoryContext } from '../helpers/composition-fixture.mjs';
import { gameComposition } from '../helpers/game-composition-fixture.mjs';

function moduleValue(factory, loadModule = () => ({})) {
  const module = { exports: {} };
  factory(module, module.exports, loadModule);
  return module.exports;
}
const Babylon = moduleValue(legacyFactory(babylonModule));
const Vec3 = moduleValue(vectorThreeModule);
const Quaternion = moduleValue(quaternionModule);
const physicsApi = { a: { Vec3, Quaternion } };
const Plane = { a: moduleValue(planeModule, () => physicsApi.a) };
const globals = { window: { PointerEvent: class {} } };

function family(name, inputs = {}) {
  return gameComposition({
    name,
    inputs,
    globals,
    entry:
      'src/application/composition/' +
      name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase()) +
      '.js',
  });
}
function animation() {
  return factoryContext('src/application/composition/compose-animation.js')({
    EventEmitter: { a: EventEmitter },
  });
}
function motion() {
  return factoryContext('src/application/composition/compose-motion-animation.js')({
    EventEmitter: { a: EventEmitter },
  });
}
function controls() {
  return family('composeControls');
}
function orbit() {
  return family('composeOrbitCamera', {
    ...animation(),
    ...motion(),
    Babylon,
    VectorTwo: createVectorTwo({ geometryPrecision: 1e-6 }),
    LineTwo: createLineTwo({ geometryPrecision: 1e-6 }),
    EllipseTwo: createEllipseTwo({ geometryPrecision: 1e-6, ellipseIntersections: [] }),
  });
}
function cueInput() {
  return family('composeCueInput', {
    ...animation(),
    Babylon,
    physicsApi,
    Plane,
    EventEmitter: { a: EventEmitter },
  });
}
function aimCamera() {
  return family('composeAimCamera', {
    ...animation(),
    ...motion(),
    Babylon,
  });
}

test('control instances isolate keyboard state and release held keys on disable and unbind', () => {
  const { ControlGroup, controlEvents } = controls();
  const first = new ControlGroup('first', 1, 2);
  const second = new ControlGroup('second', 1, 2);
  assert.notEqual(first._evtManager, second._evtManager);
  const operations = [];
  const input = first._evtManager;
  input.initialize({
    65: {
      ss: 4,
      down() {
        operations.push('down');
      },
      up() {
        operations.push('up');
      },
    },
  });
  input.state = 4;
  const event = { keyCode: 65, preventDefault() {}, repeat: false };
  input._onKeyDown(event);
  input._onKeyDown(event);
  input.enabled = false;
  assert.deepEqual(operations, ['down', 'up']);
  input.enabled = true;
  input._onKeyDown(event);
  const listeners = new Map();
  const canvas = {
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name, listener) {
      assert.equal(listeners.get(name), listener);
      listeners.delete(name);
    },
  };
  input.bindEvents(canvas);
  input.unbindEvents(canvas);
  assert.deepEqual(operations, ['down', 'up', 'down', 'up']);
  assert.equal(listeners.size, 0);
  assert.equal(second._evtManager.state, 0);
  assert.equal(controlEvents.SWITCH, 'switch');
});

test('orbit controllers retain shared reusable intersection points and independent family caches', () => {
  const { OrbitController } = orbit();
  const first = new OrbitController({ needsUpdate: 0 }, 1);
  const second = new OrbitController({ needsUpdate: 0 }, 1);
  first._tracks[0].reset(0, 0, 2, 1);
  second._tracks[0].reset(0, 0, 3, 1);
  const point = first._tracks[0].getLineCrossedPoint(-4, 0, 4, 0);
  const shared = second._tracks[0].getLineCrossedPoint(-4, 0, 4, 0);
  assert.equal(point, shared);
  assert.equal(Math.abs(shared.x), 3);
  const Independent = orbit().OrbitController;
  const independent = new Independent({ needsUpdate: 0 }, 1);
  independent._tracks[0].reset(0, 0, 2, 1);
  assert.notEqual(independent._tracks[0].getLineCrossedPoint(-4, 0, 4, 0), shared);
});

test('cue input keeps individual contact properties, angle clamp and release lifecycle', () => {
  const { CueMotionController } = cueInput();
  const first = new CueMotionController();
  const second = new CueMotionController();
  assert.notEqual(first._state1._cachedProps, second._state1._cachedProps);
  first.setAngleV(Math.PI);
  assert.equal(first._state1._angleV, Math.PI / 4);
  assert.equal(second._state1._angleV, 0);
  assert.equal(first._state0.getPosition().y, 1.86);
  const stick = {
    stickName: 'stickAlpha',
    specs: { tipRadius: 0.005, buttRadius: 0.015, len: 1.45 },
  };
  first.reset(stick, [{ radius: 0.02625 }]);
  assert.equal(first._state1._cachedProps.stickLen, 1.45);
  assert.equal(first._state1._cachedProps.tipRadius, 0.005);
  first.release();
  assert.equal(first._state1._balls, null);
  assert.equal(first._state1._potentialTouches.length, 0);
});

test('aim camera keeps the angle precision, reset offsets and per-instance tween state', () => {
  const { AimCameraController } = aimCamera();
  const first = new AimCameraController({ needsUpdate: 0 }, 16);
  const second = new AimCameraController({ needsUpdate: 0 }, 16);
  assert.equal(first.setAngles(1e-6, 0), false);
  assert.equal(first.setAngles(0.2, 0.1), true);
  first.reset(0.38);
  assert.equal(first._locOrigX, -0.38);
  assert.equal(first._locOrigY, 0.12);
  assert.equal(first._locLookAtOffset[1].crt, 0.38);
  assert.notEqual(first._lookAtSpd, second._lookAtSpd);
  assert.equal(second._angleH, 0);
});

test('person composition connects the original controller types and isolates player state', () => {
  const values = family('composePerson', {
    ...animation(),
    ...orbit(),
    ...cueInput(),
    ...aimCamera(),
    Babylon,
  });
  const first = new values.PersonController();
  const second = new values.PersonController();
  assert.equal(first.state, values.PersonState.STATE_STAND);
  assert.notEqual(first.bodyPosition, second.bodyPosition);
  assert.notEqual(first.stickCtl, second.stickCtl);
  assert.notEqual(first._stateTransitionTween, second._stateTransitionTween);
  first.strokePower = 2;
  assert.equal(first.strokePower, 1);
  assert.equal(second.strokePower, 0);
  assert.equal(first.nPhysicsChanged, 1);
  assert.equal(values.PersonEvents.STATE_CHANGE_START, 'sc_start');
});

test('player turn retains pullback limit and stroke completion/reset ownership', () => {
  const { ControlGroup, controlEvents, ToolbarGroup } = controls();
  const { PlayerTurnControl } = family('composePlayerTurn', {
    ...animation(),
    physicsApi,
    ControlGroup,
    controlEvents,
    ToolbarGroup,
    GameState: { a: { READY: 4, SIMULATING: 8, JUDGING: 16 } },
    ControlsDialog: class {},
    MessageDialog: class {},
    ShortcutBar: class {},
    PersonEvents: { STATE_CHANGE_START: 'sc_start', STATE_CHANGE_END: 'sc_end' },
    PersonState: { STATE_STAND: 0, STATE_AIM: 1 },
  });
  const clip = new (replay().MovieClip)();
  const first = new PlayerTurnControl('gaming', 1, 2, clip);
  const second = new PlayerTurnControl('gaming', 1, 2, clip);
  assert.notEqual(first._tipMotion, second._tipMotion);
  assert.equal(first._tipMotion.maxPullbackLen, 0.25);
  first._tipMotion.launch({
    strokePower: 0.5,
    getStickTouchSpd: () => 1,
    getStickSlowDownDistance: () => 0.1,
    getTipRadius: () => 0.005,
    getKissDir: () => new Vec3(1, 0, 0),
    getKissPoint: () => new Vec3(),
  });
  assert.equal(first._tipMotion.needsUpdate, true);
  assert.equal(second._tipMotion.needsUpdate, false);
  first._tipMotion.reset();
  assert.equal(first._tipMotion.isReady(), true);
  assert.equal(first._tipMotion.launchingController, null);
});

function replay() {
  return family('composeReplay', {
    ...animation(),
    ...controls(),
    physicsApi,
    UiComponent: EventEmitter,
    GameState: { a: { READY: 4, SIMULATING: 8, JUDGING: 16 } },
    dialogEvents: { ITEM_CLICK: 'i_click' },
    loadModule: () => '<div></div>',
  });
}

test('ball placement retains one scratch vector per family and individual placement state', () => {
  const receivers = [];
  class ObservedVector extends Vec3 {
    subVectors(...args) {
      receivers.push(this);
      return super.subVectors(...args);
    }
  }
  const create = () =>
    family('composeBallInHand', {
      ...controls(),
      physicsApi: { a: { Vec3: ObservedVector } },
      GameState: { a: { READY: 4, SIMULATING: 8, JUDGING: 16 } },
      UiColors: { GREEN: [0, 1, 0], RED: [1, 0, 0] },
      MessageKind: {},
    }).BallInHandControl;
  const Control = create();
  const first = new Control('inHand', 1, 2);
  const second = new Control('inHand', 1, 2);
  const Independent = create();
  const other = new Independent('inHand', 1, 2);
  for (const control of [first, second, other]) {
    control._fpc = {
      stateRatio: 0,
      bodyPosition: new Vec3(),
      azimuth: { forward: new Vec3(1, 0, 0) },
      lookTo() {},
    };
    control._model = { getLocValidRegionGeoCenter: () => new Vec3(1, 0, 0) };
    control._gView = {};
    control._playerCtls = [];
    control._tipPopped = true;
    control._needsUpdate = false;
    control._defaultUpdateHandler({ dt: 0.1 });
  }
  assert.equal(receivers[0], receivers[1]);
  assert.notEqual(receivers[0], receivers[2]);
  assert.notEqual(first._spot, second._spot);
  assert.equal(first._firstLookToSet, true);
});

test('replay retains track capacity, independent buffers and repeatable camera parsing', () => {
  const { ReplayControl, MovieClip } = replay();
  const first = new MovieClip();
  const second = new MovieClip();
  assert.equal(first.maxBallTracks, 22);
  assert.equal(Object.keys(first.tracks).length, 24);
  assert.notEqual(first.getTrack('b0').data, second.getTrack('b0').data);
  const ball = { active: true, asleep: false, position: new Vec3(0, 1, 0) };
  first.getTrack('b0').setSource(ball, { alpha: 1 }).record(0);
  ball.position.x = 0.2;
  first.getTrack('b0').record(0.1, true);
  assert.equal(second.getTrack('b0').totalFrames, 0);
  const control = new ReplayControl('replay', 1, 2, first);
  control._gView = {
    playArea: {
      position: { x: 0, y: 0.9, z: 0 },
      size: { w: 3.66, h: 1.859 },
      pockets: Array.from({ length: 6 }, () => ({ position: { x: 100, z: 100 } })),
    },
  };
  control._parseMovieClip();
  control._parseMovieClip();
  assert.equal(control._nActiveCamCtls, 1);
  assert.equal(control._camCtls.length, 5);
  assert.notEqual(control._camCtls[0]._position, control._camCtls[1]._position);
  const camera = control._camCtls[0];
  const view = { position: { x: 0, y: 0, z: 0 }, lockedTarget: { x: 0, y: 0, z: 0 } };
  camera.setPosition(1, 2, 3).setTargetPoint(4, 5, 6).update(view, 0);
  assert.deepEqual(view.position, { x: 1, y: 2, z: 3 });
  assert.deepEqual(view.lockedTarget, { x: 4, y: 5, z: 6 });
});
