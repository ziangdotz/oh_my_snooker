import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { gameComposition } from '../helpers/game-composition-fixture.mjs';

function animation() {
  return gameComposition({
    name: 'composeAnimation',
    entry: 'src/application/composition/compose-animation.js',

    inputs: { EventEmitter: { a: EventEmitter } },
  });
}

test('animation family preserves easing curves, receiver parameters and independent ownership', () => {
  const first = animation();
  const second = animation();
  assert.notEqual(first.Easing, second.Easing);
  assert.notEqual(first.Tween, second.Tween);
  for (const t of [0, 0.125, 0.5, 0.875, 1]) {
    assert.equal(first.Easing.defaultEase(t), t);
    for (let power = 1; power <= 4; power++) {
      const curves = first.Easing['Power' + power];
      const p = power + 1;
      assert.ok(Math.abs(curves.easeIn(t) - t ** p) < 1e-14);
      assert.ok(Math.abs(curves.easeOut(t) - (1 - (1 - t) ** p)) < 1e-14);
      const expected = t < 0.5 ? 2 ** power * t ** p : 1 - 2 ** power * (1 - t) ** p;
      assert.ok(Math.abs(curves.easeInOut(t) - expected) < 1e-14);
    }
  }
  first.Easing.Back._p1 = 2;
  assert.equal(first.Easing.Back.easeIn(0.5), -0.125);
  assert.equal(second.Easing.Back._p1, 1.70158);
  assert.equal(new first.Tween().ease, first.Easing.defaultEase);
});

test('animation types share one update event contract and the original time boundary', () => {
  const { Easing, Tween, ValueTween, PropertyTween } = animation();
  assert.ok(new ValueTween() instanceof Tween);
  assert.ok(new PropertyTween() instanceof ValueTween);
  const tween = new Tween();
  const updates = [];
  tween.onUpdateRequired(() => updates.push(tween.time));
  tween.resetBase(Easing.Power1.easeIn, 1, 0).play(0);
  assert.equal(Tween.updEvtType, 'require_update');
  tween.tickTime(1 - 0.5e-6);
  assert.equal(tween.time, 1);
  assert.equal(tween.state, 0);
  assert.equal(tween.ease, Easing.Power1.easeIn);
  assert.ok(updates.length > 0);
});

test('scene family keeps shared textures, lazy cushions, material arguments and design order', () => {
  const operations = [];
  class Texture {
    constructor(...args) {
      this.args = args;
      operations.push(['texture', ...args]);
    }
  }
  class Probe {
    constructor(...args) {
      this.args = args;
    }
  }
  class Material {
    constructor(...args) {
      this.args = args;
    }
    setLodFallOff(...args) {
      this.lod = args;
    }
    freeze() {
      this.frozen = true;
    }
  }
  class Color {
    constructor(...args) {
      this.values = args;
    }
  }
  class Cushion {
    constructor(...args) {
      this.args = args;
    }
  }
  const values = gameComposition({
    name: 'composeScenes',
    entry: 'src/application/composition/compose-scenes.js',

    inputs: {
      loadModule: (id) => id,
      Texture,
      PcolHdrCubeTexture: Texture,
      LightProbeManager: Probe,
      DynamicLightingMaterial: Material,
      ColorThree: Color,
      CushionBodyType: Cushion,
      interiorDesignRegistry: null,
      originalInterior: {
        initialize(scene, manifest) {
          operations.push(['original', scene, manifest]);
        },
      },
      applyModernWallStudy: (scene) => operations.push(['wall', scene]),
      interiorDesign: {
        apply(scene) {
          operations.push(['design', scene]);
        },
      },
    },
  });
  const definition = values.scenes.tigerClubSno;
  assert.equal(definition.id, 'tigerClubSno');
  assert.equal(definition.playArea.w, 3.66);
  assert.equal(definition.cushionData.bounds.length, 48);
  assert.equal(definition.getCushionBody(), definition.getCushionBody());
  assert.equal(definition.getCushionBody().args[1], definition.cushionData);
  const scene = {};
  const shared = {};
  definition.addSharedTextures(shared, scene);
  assert.equal(shared.tableUI.args[0], definition.commons['table-ui']);
  assert.equal(shared.ballAO.args[0], scene);
  const probe = definition.createLightProbeManager(scene);
  assert.equal(probe.args[0], scene);
  assert.equal(probe.args[3].id, 'tcs');
  const material = definition.createBallMaterial(4, scene, shared, probe);
  assert.equal(material.args[2], probe);
  assert.equal(material.aoTexture, shared.ballAO);
  assert.equal(material.roughness, 0.1);
  assert.equal(material.frozen, true);
  assert.deepEqual(Array.from(material.lod), [1.5, 3, 5, 2]);
  definition.beautify(scene);
  assert.deepEqual(
    operations.slice(-3).map((op) => op[0]),
    ['original', 'wall', 'design'],
  );
});

test('display atlas keeps cached UV identity, orientation, failure and isolated caches', () => {
  const fixture = () =>
    gameComposition({
      name: 'composeDisplayPlanes',
      entry: 'src/application/composition/compose-display-planes.js',

      inputs: {
        Babylon: { ShaderMaterial: class {}, Mesh: class {} },
        EventEmitter: { a: EventEmitter },
        loadModule: () => {},
      },
    });
  const first = fixture().tableUiAtlas;
  const second = fixture().tableUiAtlas;
  assert.equal(first.getUVs('powerTrack'), first.getUVs('powerTrack'));
  assert.notEqual(first.getUVs('powerTrack'), second.getUVs('powerTrack'));
  assert.deepEqual(Array.from(first.getUVs('powerTrack')), [
    12 / 512,
    272 / 512,
    28 / 512,
    272 / 512,
    28 / 512,
    312 / 512,
    12 / 512,
    312 / 512,
  ]);
  assert.throws(() => first.getUVs('missing'), /Frame \[missing\] not found/);
});
