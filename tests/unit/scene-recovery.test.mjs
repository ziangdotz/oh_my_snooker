import test from 'node:test';
import assert from 'node:assert/strict';
import babylonModule from '../../src/third-party/rendering/babylon-engine.js';
import dynamicLightingMaterialModule from '../../src/adapters/rendering/dynamic-lighting-material.js';
import legacyFactory from '../../src/compatibility/legacy-factory.js';
import installSceneRecovery from '../../src/compatibility/install-scene-recovery.js';
import { setTimeout, clearTimeout } from 'node:timers';

test('scene recovery preserves HDR filtering, invalidates frozen bindings, and releases observers', () => {
  const module = { exports: {} };
  legacyFactory(babylonModule)(module, module.exports, () => ({}));
  const B = module.exports;
  dynamicLightingMaterialModule({}, {}, () => B);
  const engine = new B.NullEngine();
  const scene = new B.Scene(engine);
  const lostCount = engine.onContextLostObservable._observers.length;
  const restoredCount = engine.onContextRestoredObservable._observers.length;
  try {
    const hdr = new B.HDRCubeTexture('', scene);
    hdr._texture = new B.InternalTexture(engine, B.InternalTexture.DATASOURCE_CUBERAW);
    const raw = new B.HDRCubeTexture('', scene);
    raw._texture = new B.InternalTexture(engine, B.InternalTexture.DATASOURCE_CUBERAW);
    raw._texture.samplingMode = B.Texture.NEAREST_SAMPLINGMODE;
    const delayed = new B.HDRCubeTexture('', scene);
    const frozen = new B.PBRMetallicRoughnessMaterial('frame', scene);
    frozen.freeze();
    // NullEngine lacks WebGL 2 UBOs; exercise the real uniform-buffer flags.
    frozen._uniformBuffer._noUBO = false;
    frozen._uniformBuffer._needSync = false;
    const dynamic = new B.StandardMaterial('dynamic', scene);
    dynamic._uniformBuffer._noUBO = false;
    dynamic._uniformBuffer._needSync = false;
    installSceneRecovery(B, scene);
    engine._cachedVertexBuffers = { stale: true };
    engine.onContextLostObservable.notifyObservers(engine);
    assert.equal(engine._cachedVertexBuffers, null);
    assert.equal(hdr._texture.samplingMode, B.Texture.TRILINEAR_SAMPLINGMODE);
    assert.equal(raw._texture.samplingMode, B.Texture.NEAREST_SAMPLINGMODE);
    assert.equal(delayed.getInternalTexture(), undefined);
    scene._cachedMaterial = frozen;
    engine.onContextRestoredObservable.notifyObservers(engine);
    assert.equal(hdr._texture.samplingMode, undefined);
    assert.equal(frozen._uniformBuffer.isSync, false);
    assert.equal(frozen.isFrozen, true);
    assert.equal(dynamic._uniformBuffer.isSync, true);
    assert.equal(scene._cachedMaterial, null);
    frozen._uniformBuffer._needSync = false;
    engine.onContextRestoredObservable.notifyObservers(engine);
    assert.equal(frozen._uniformBuffer.isSync, false);
    scene.dispose();
    assert.equal(engine.onContextLostObservable._observers.length, lostCount);
    assert.equal(engine.onContextRestoredObservable._observers.length, restoredCount);
  } finally {
    if (!scene.isDisposed) {
      scene.dispose();
    }
    engine.dispose();
  }
});

test('on-demand redraw waits for rebuilt textures and cancels pending refresh on disposal', async () => {
  const module = { exports: {} };
  legacyFactory(babylonModule)(module, module.exports, () => ({}));
  const B = module.exports;
  dynamicLightingMaterialModule({}, {}, () => B);
  const engine = new B.NullEngine();
  const scene = new B.Scene(engine);
  let deadline;
  try {
    const texture = new B.BaseTexture(scene);
    texture._texture = new B.InternalTexture(engine, B.InternalTexture.DATASOURCE_RAW);
    texture._texture.isReady = false;
    let requests = 0;
    let complete;
    const refreshed = new Promise((resolve) => {
      complete = resolve;
    });
    installSceneRecovery(B, scene, () => {
      requests++;
      if (requests === 2) {
        complete();
      }
    });
    engine.onContextRestoredObservable.notifyObservers(engine);
    assert.equal(requests, 1, 'Request the first frame even while textures are pending');
    texture._texture.isReady = true;
    await Promise.race([
      refreshed,
      new Promise((_resolve, reject) => {
        deadline = setTimeout(() => reject(new Error('Ready redraw timed out')), 1000);
      }),
    ]);
    assert.equal(requests, 2);
    texture._texture.isReady = false;
    engine.onContextRestoredObservable.notifyObservers(engine);
    assert.equal(requests, 3);
    scene.dispose();
    // Give a formerly queued readiness poll a turn to run; it must be cancelled.
    await new Promise((resolve) => setTimeout(resolve, 32));
    assert.equal(requests, 3);
  } finally {
    clearTimeout(deadline);
    if (!scene.isDisposed) {
      scene.dispose();
    }
    engine.dispose();
  }
});
