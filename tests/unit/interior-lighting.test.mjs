import test from 'node:test';
import assert from 'node:assert/strict';
import babylonModule from '../../src/third-party/rendering/babylon-engine.js';
import legacyFactory from '../../src/compatibility/legacy-factory.js';
import createInteriorLighting from '../../src/presentation/scenes/interior-lighting.js';

test('static room shadows refresh after resize/restoration and release engine observers on disposal', () => {
  const module = { exports: {} };
  legacyFactory(babylonModule)(module, module.exports, () => ({}));
  const B = module.exports;
  const engine = new B.NullEngine();
  const scene = new B.Scene(engine);
  try {
    const mesh = B.MeshBuilder.CreateBox('chair', {}, scene);
    const resizeObservers = engine.onResizeObservable._observers.length;
    const restoreObservers = engine.onContextRestoredObservable._observers.length;
    createInteriorLighting(B, scene, 'interior-design-001-', [mesh], [mesh], {
      windows: [0, 3],
      picturePosition: [0, 3, 0],
      floorIntensity: 0.4,
      ambientIntensity: 0.2,
      galleryIntensity: 0.3,
      loungeIntensity: 0.3,
    });
    const shadows = scene.lights.map((light) => light.getShadowGenerator()).filter(Boolean);
    assert.equal(shadows.length, 2);
    assert.deepEqual(
      shadows.map((shadow) => shadow.getShadowMap().getRenderSize()),
      [2048, 1024],
    );
    for (const shadow of shadows) {
      const map = shadow.getShadowMap();
      assert.equal(map.refreshRate, B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE);
      assert.equal(map._shouldRender(), true);
      assert.equal(map._shouldRender(), false);
    }
    engine.onResizeObservable.notifyObservers(engine);
    for (const shadow of shadows) {
      assert.equal(shadow.getShadowMap()._shouldRender(), true);
      assert.equal(shadow.getShadowMap()._shouldRender(), false);
    }
    // Old Babylon recreates shadow render targets during context restoration.
    for (const shadow of shadows) {
      shadow.recreateShadowMap();
    }
    engine.onContextRestoredObservable.notifyObservers(engine);
    for (const shadow of shadows) {
      const map = shadow.getShadowMap();
      assert.equal(map.refreshRate, 0);
      assert.deepEqual(map.renderList, [mesh]);
      assert.equal(map._shouldRender(), true);
      assert.equal(map._shouldRender(), false);
    }
    scene.dispose();
    assert.equal(engine.onResizeObservable._observers.length, resizeObservers);
    assert.equal(engine.onContextRestoredObservable._observers.length, restoreObservers);
  } finally {
    if (!scene.isDisposed) {
      scene.dispose();
    }
    engine.dispose();
  }
});
