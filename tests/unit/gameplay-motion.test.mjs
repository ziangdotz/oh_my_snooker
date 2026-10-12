import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import composeMotionAnimation from '../../src/application/composition/compose-motion-animation.js';
import composeAnimation from '../../src/application/composition/compose-animation.js';
import composeOrbitCamera from '../../src/application/composition/compose-orbit-camera.js';
import createVectorTwo from '../../src/domain/math/vector-two.js';
import createLineTwo from '../../src/domain/geometry/line-two.js';
import createEllipseTwo from '../../src/domain/geometry/ellipse-two.js';
import createTimedLinearController from '../../src/presentation/camera/timed-linear-controller.js';
import createQuickStrokeMotion from '../../src/application/controls/quick-stroke-motion.js';
import createStrokeMotion from '../../src/application/controls/stroke-motion.js';
import createSmoothPersonController from '../../src/presentation/input/smooth-person-controller.js';
import createTimedAimCameraController from '../../src/presentation/camera/timed-aim-camera-controller.js';
import createImmediateGuideControl from '../../src/application/controls/immediate-guide-control.js';
import installRenderResolutionPolicy from '../../src/presentation/rendering/render-resolution-policy.js';

const motion = composeMotionAnimation({ EventEmitter: { a: EventEmitter } });
const animation = composeAnimation({ EventEmitter: { a: EventEmitter } });
const LinearController = createTimedLinearController(motion.LinearController);
const { OrbitController } = composeOrbitCamera({
  ...motion,
  ...animation,
  VectorTwo: createVectorTwo({ geometryPrecision: 1e-6 }),
  LineTwo: createLineTwo({ geometryPrecision: 1e-6 }),
  EllipseTwo: createEllipseTwo({ geometryPrecision: 1e-6, ellipseIntersections: [] }),
});

function advance(seconds, deltas, update) {
  let elapsed = 0;
  let index = 0;
  while (elapsed < seconds - 1e-10) {
    const delta = Math.min(deltas[index++ % deltas.length], seconds - elapsed);
    update(delta);
    elapsed += delta;
  }
}

function characterize(deltas, scale = 1) {
  const controller = new OrbitController({ needsUpdate: 0 }, 1);
  const position = { x: 0, y: 1.7, z: 0 };
  const transition = { renderedRatio: 0 };
  controller.reset(0, 0, 2, scale, 0.38, 0, 0);
  controller.orbit(undefined, 1);
  const update = (delta) => {
    controller.frameDelta = delta;
    return controller.update(0, transition, position);
  };
  advance(2, deltas, update);
  const angle = controller._tracks[0].angle;
  controller.orbit(undefined, 0);
  let release = 0;
  let index = 0;
  while (update(deltas[index % deltas.length])) {
    release += deltas[index++ % deltas.length];
    assert.ok(release < 2, 'release must settle');
  }
  const stoppedAngle = controller._tracks[0].angle;
  advance(1, deltas, update);
  assert.equal(controller._tracks[0].angle, stoppedAngle);
  assert.ok(Number.isFinite(position.x) && Number.isFinite(position.z));
  return { angle, release };
}

test('walking covers the same angle at 30/60/120/144 Hz and irregular frame intervals', () => {
  const results = [30, 60, 120, 144].map((hz) => characterize([1 / hz]));
  results.push(characterize([0.008, 0.027, 0.011, 0.041, 0.013]));
  for (const result of results) {
    assert.ok(Math.abs(result.angle - results[0].angle) < 1e-10);
    assert.ok(result.release < 0.5, `release took ${result.release}s`);
  }
  const elliptical = [30, 60, 120, 144].map((hz) => characterize([1 / hz], 1.8));
  for (const result of elliptical) {
    assert.ok(Math.abs(result.angle - elliptical[0].angle) < 0.002);
  }
});

test('steady walking retains the original 60 Hz speed and opposing keys stop input', () => {
  const controller = new OrbitController({ needsUpdate: 0 }, 1);
  const position = { x: 0, z: 0 };
  const transition = { renderedRatio: 0 };
  controller.reset(0, 0, 2, 1, 0.38, 0, 0);
  controller.orbit(undefined, 1);
  advance(4, [1 / 60], () => controller.update(0, transition, position));
  const start = controller._tracks[0].angle;
  advance(1, [1 / 60], () => controller.update(0, transition, position));
  assert.ok(
    Math.abs(controller._tracks[0].angle - start - (60 * 0.8 * 0.82 * 0.0018) / 0.18) < 1e-7,
  );
  controller.orbit(1, 1);
  assert.equal(controller._orbitSpd.tgt, 0);
});

test('look spring matches the legacy response at 60 Hz and interpolates higher refresh rates', () => {
  const original = new motion.LinearController(0.5, 0.25, 0.5, 3e-4);
  const timed = new LinearController(0.5, 0.25, 0.5, 3e-4);
  original.to(1);
  timed.to(1);
  for (let frame = 0; frame < 30; frame++) {
    original.update();
    timed.update();
    assert.ok(Math.abs(original.crt - timed.crt) < 1e-12);
  }
  const positions = [30, 60, 120, 144].map((hz) => {
    const spring = new LinearController(0.5, 0.25, 0.5, 3e-4);
    spring.to(1);
    advance(0.5, [1 / hz], (delta) => {
      spring.frameDelta = delta;
      spring.update();
    });
    return spring.crt;
  });
  assert.ok(Math.max(...positions) - Math.min(...positions) < 1e-12);
  timed.frameDelta = 0;
  const paused = timed.crt;
  timed.update();
  assert.equal(timed.crt, paused);
});

test('look springs settle, respect target clamps, and do not teleport after a long frame', () => {
  for (const hz of [30, 60, 120, 144]) {
    const spring = new LinearController(0.4, 0.25, 0.5, 0.001);
    spring.clamp(-0.7, 0.7).to(4);
    advance(2, [1 / hz], (delta) => {
      spring.frameDelta = delta;
      spring.update();
    });
    assert.equal(spring.crt, 0.7);
    assert.equal(spring.needsUpdate, false);
    spring.to(-0.7);
    spring.frameDelta = 30;
    spring.update();
    assert.ok(spring.crt > -0.7 && spring.crt < 0.7);
  }
});

test('person and aim tween receive elapsed seconds and keep per-person timing isolated', () => {
  class Person {
    constructor() {
      this._stateTransitionTween = new animation.Tween().resetBase(undefined, 1.2);
      this._horizonCtl = {};
      this._headCtl = {};
    }
    update(delta) {
      this._stateTransitionTween.update(delta);
    }
  }
  const SmoothPerson = createSmoothPersonController(Person);
  const first = new SmoothPerson();
  const second = new SmoothPerson();
  first._stateTransitionTween.play();
  first.update(0.02);
  assert.equal(first._stateTransitionTween.duration, 0.8);
  assert.equal(first._horizonCtl.frameDelta, 0.02);
  assert.equal(second._horizonCtl.frameDelta, undefined);
  class Aim {
    constructor() {
      this._locLookAtOffset = [];
      this._lookAtSpd = new animation.Tween().resetBase(undefined, 0.5).play();
    }
    update() {
      this._lookAtSpd.update(0.016);
    }
  }
  const TimedAim = createTimedAimCameraController(Aim);
  const aim = new TimedAim();
  aim.frameDelta = 0.05;
  aim.update();
  assert.equal(aim._lookAtSpd.time, 0.05);
});

test('quick preparation preserves contact speed, acceleration, travel and recovery at every power', () => {
  class Vector {
    copy(value) {
      Object.assign(this, value);
    }
  }
  const StrokeMotion = createStrokeMotion({
    Easing: animation.Easing,
    StrokeVector: Vector,
    maxPullbackLength: 0.25,
  });
  const QuickStroke = createQuickStrokeMotion(StrokeMotion);
  for (const power of [0.1, 0.5, 1]) {
    const controller = {
      strokePower: power,
      getStickTouchSpd: () => 1 + 9 * power,
      getStickSlowDownDistance: () => 0.1,
      getTipRadius: () => 0.005,
      getKissDir: () => ({ x: 1, y: 0, z: 0 }),
      getKissPoint: () => ({ x: 0, y: 0, z: 0 }),
    };
    const original = new StrokeMotion();
    const quick = new QuickStroke();
    const originalContact = original.launch(controller);
    const quickContact = quick.launch(controller);
    assert.ok(quickContact < originalContact);
    for (const field of [
      '_distance_s1',
      '_dura_s2',
      '_acc_s2',
      '_dura_s3',
      '_distance_s3',
      '_tipRadius',
    ]) {
      assert.equal(quick[field], original[field]);
    }
    assert.ok(Math.abs(quick._dura_s2 * quick._acc_s2 - controller.getStickTouchSpd()) < 1e-12);
    while (quick.needsUpdate) {
      quick.tick(1 / 60);
    }
    quick.reset();
    assert.equal(quick.isReady(), true);
  }
});

test('first guide opens synchronously once per player control, before input can begin', () => {
  const operations = [];
  class Control {
    constructor() {
      this._needsPopNaviBox = 1;
      this._evtBus = { emit: (...args) => operations.push(args) };
    }
    _onActvate() {
      assert.equal(this._needsPopNaviBox, 0, 'no delayed legacy guide may be scheduled');
    }
    bindUI() {}
  }
  const Immediate = createImmediateGuideControl(Control, { POP_BOX: 'pop' });
  const first = new Immediate();
  let commits = 0;
  const layer = {
    update(delta) {
      assert.equal(delta, 0);
      commits++;
    },
  };
  first.bindUI(layer, []);
  first._onActvate();
  assert.deepEqual(operations, [['pop', 'controlsNaviBox']]);
  assert.equal(commits, 1);
  first._onActvate();
  assert.equal(operations.length, 1);
  assert.equal(commits, 1);
  const second = new Immediate();
  second.bindUI(layer, []);
  second._onActvate();
  assert.equal(operations.length, 2);
  assert.equal(commits, 2);
});

test('render density caps at 1.5, follows resize without oscillation, and removes its listener', () => {
  for (const density of [0.25, 0.75, 1, 1.25, 1.5, 2, 3]) {
    const listeners = new Map();
    let observer;
    let redraws = 0;
    let scaling = 0.5;
    const browser = {
      devicePixelRatio: density,
      addEventListener: (name, handler) => listeners.set(name, handler),
      removeEventListener: (name, handler) => {
        assert.equal(listeners.get(name), handler);
        listeners.delete(name);
      },
    };
    const engine = {
      getHardwareScalingLevel: () => scaling,
      setHardwareScalingLevel: (value) => {
        scaling = value;
      },
      onDisposeObservable: {
        add: (handler) => {
          observer = handler;
        },
      },
    };
    installRenderResolutionPolicy(engine, { requireRender: () => redraws++ }, browser);
    assert.equal(scaling, 1 / Math.min(Math.max(density, 0.5), 1.5));
    const before = redraws;
    listeners.get('resize')();
    assert.equal(redraws, before);
    browser.devicePixelRatio = 1;
    listeners.get('resize')();
    assert.equal(scaling, 1);
    observer();
    assert.equal(listeners.size, 0);
  }
});

test('render policy supports the Babylon 3.2 engine without a disposal observable', () => {
  const listeners = new Map();
  let scaling = 1;
  const browser = {
    devicePixelRatio: 2,
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
  };
  installRenderResolutionPolicy(
    {
      getHardwareScalingLevel: () => scaling,
      setHardwareScalingLevel: (value) => {
        scaling = value;
      },
    },
    { requireRender() {} },
    browser,
  );
  assert.equal(scaling, 2 / 3);
  listeners.get('pagehide')({ persisted: true });
  assert.equal(listeners.size, 2, 'back/forward cache must retain density handling');
  listeners.get('pagehide')();
  assert.equal(listeners.size, 0);
});
