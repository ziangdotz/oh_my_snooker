import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import babylonModule from '../../src/third-party/rendering/babylon-engine.js';
import dynamicLightingMaterialModule from '../../src/adapters/rendering/dynamic-lighting-material.js';
import legacyFactory from '../../src/compatibility/legacy-factory.js';
import { factoryContext } from '../helpers/composition-fixture.mjs';

test('compiled cue composition parses the actual model and retains registered materials across scenes', async () => {
  const response = await readFile(
    new URL('../../src/assets/models/alpha-cue.babylon', import.meta.url),
    'utf8',
  );
  const sourceMesh = JSON.parse(response).meshes.find((mesh) => mesh.name === 'StickAlpha');
  const module = { exports: {} };
  legacyFactory(babylonModule)(module, module.exports, () => ({}));
  const B = module.exports;
  dynamicLightingMaterialModule({}, {}, () => B);
  const engine = new B.NullEngine();
  const scenes = [new B.Scene(engine), new B.Scene(engine), new B.Scene(engine)];
  const probe = {};
  const timers = new Map();
  let nextTimer = 0;
  let requests = 0;
  // This engine is isolated to the test; no browser/global I/O API is replaced.
  B.Tools.LoadFile = (url, success, progress, database, binary) => {
    assert.equal(url, './assets/models/alpha-cue.babylon');
    assert.equal(progress, null);
    assert.equal(database, null);
    assert.equal(binary, false);
    requests++;
    success(response);
  };
  const composeCues = factoryContext('src/application/composition/compose-cues.js', {
    // Babylon 3.2 uses instanceof Array for vertex data. Keep parsed arrays in
    // the same realm as the injected engine, as they are in the real browser.
    JSON,
    window: {
      setTimeout(callback, milliseconds) {
        assert.equal(milliseconds, 120);
        const id = ++nextTimer;
        timers.set(id, callback);
        return id;
      },
      clearTimeout(id) {
        timers.delete(id);
      },
    },
  });
  try {
    const { CueMeshManager } = composeCues({
      Babylon: B,
      EventEmitter: { a: EventEmitter },
      CueMaterial: B.PcolDyIBLMaterial,
      CueTexture: B.Texture,
      manifest: {
        model: './assets/models/alpha-cue.babylon',
        glossy: './assets/textures/cue/cue-gloss.png',
        color: './assets/textures/cue/cue-color.jpg',
      },
    });
    const first = new CueMeshManager();
    const second = new CueMeshManager();
    first.resetScene(scenes[0], probe);
    second.resetScene(scenes[1], probe);
    assert.ok(
      first.requireStick('stickAlpha'),
      'Synchronous default prefetch is available to the manager immediately',
    );
    first.cancelPendingCheck();
    const mesh = first.requireStick('stickAlpha');
    const otherMesh = second.requireStick('stickAlpha');
    assert.equal(requests, 1);
    assert.ok(mesh instanceof B.Mesh);
    assert.equal(mesh.name, './assets/models/alpha-cue.babylon/StickAlpha');
    assert.equal(mesh.getTotalVertices(), sourceMesh.positions.length / 3);
    assert.deepEqual(Array.from(mesh.getIndices()), sourceMesh.indices);
    assert.deepEqual(
      Array.from(Float32Array.from(mesh.getVerticesData(B.VertexBuffer.PositionKind))),
      Array.from(Float32Array.from(sourceMesh.positions)),
    );
    assert.equal(mesh.material.getScene(), scenes[0]);
    assert.equal(otherMesh.material.getScene(), scenes[1]);
    assert.notEqual(mesh.material, otherMesh.material);
    assert.equal(mesh.specs, otherMesh.specs);
    const material = mesh.material;
    assert.ok(material instanceof B.PcolDyIBLMaterial);
    assert.equal(material._lightProbeManager, probe);
    assert.equal(material.isFrozen, true);
    assert.equal(material.radianceLevel, 0.12);
    assert.equal(material.irradianceLevel, 1);
    assert.equal(material.roughness, 1);
    assert.equal(material.useRadianceLodRoughness, true);
    assert.equal(material.toneMappingMode, 2);
    assert.deepEqual(material.lodFallOffFactor, {
      near: 1.5,
      farSubNear: 8.5,
      radMax: 2,
      iradMax: 1.5,
    });
    assert.equal(material.reflectivityRoughnessTexture.url, './assets/textures/cue/cue-gloss.png');
    assert.equal(material.diffuseTexture.url, './assets/textures/cue/cue-color.jpg');
    mesh.inUse = otherMesh.inUse = true;
    assert.equal(first.requireStick('stickAlpha').name, mesh.name + '1');
    assert.equal(second.requireStick('stickAlpha').name, otherMesh.name + '2');
    first.unload();
    scenes[0].dispose();
    assert.equal(otherMesh.isDisposed(), false);
    assert.equal(otherMesh.material.isFrozen, true);
    first.resetScene(scenes[2], probe);
    const reloaded = first.requireStick('stickAlpha');
    assert.equal(reloaded.specs, mesh.specs);
    assert.equal(reloaded.material.getScene(), scenes[2]);
    assert.equal(requests, 1);
    first.unload();
    second.unload();
    assert.equal(timers.size, 0);
  } finally {
    for (const scene of scenes) {
      if (!scene.isDisposed) {
        scene.dispose();
      }
    }
    engine.dispose();
  }
});
