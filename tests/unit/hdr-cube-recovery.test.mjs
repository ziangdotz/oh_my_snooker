import test from 'node:test';
import assert from 'node:assert/strict';
import babylonModule from '../../src/third-party/rendering/babylon-engine.js';
import dynamicLightingMaterialModule from '../../src/adapters/rendering/dynamic-lighting-material.js';
import legacyFactory from '../../src/compatibility/legacy-factory.js';
import installHdrCubeRecovery from '../../src/compatibility/install-hdr-cube-recovery.js';

function fixture() {
  const module = { exports: {} };
  legacyFactory(babylonModule)(module, module.exports, () => ({}));
  const B = module.exports;
  dynamicLightingMaterialModule({}, {}, () => B);
  installHdrCubeRecovery(B);
  const engine = new B.NullEngine();
  const scene = new B.Scene(engine);
  const faces = new B.PcolCubeMapData(2);
  B.PcolCubeMapDataManager.getInstance()._cachedDatas['test.hdr'] = [faces];
  const uploads = [];
  engine.createRawCubeTexture = (...args) => {
    const texture = new B.InternalTexture(engine, B.InternalTexture.DATASOURCE_CUBERAW);
    Object.assign(texture, {
      _bufferViewArray: args[0],
      width: args[1],
      format: args[2],
      type: args[3],
      generateMipMaps: args[4],
      invertY: args[5],
      samplingMode: args[6],
      _webGLTexture: { generation: uploads.length },
    });
    uploads.push(args);
    return texture;
  };
  return { B, engine, scene, faces, uploads };
}

test('HDR cubes rebuild retained faces twice through the actual scene texture lifecycle', () => {
  const { B, engine, scene, faces, uploads } = fixture();
  try {
    const texture = new B.PcolHdrCubeTexture(scene, 'probe', 'test.hdr');
    const internal = texture.getInternalTexture();
    const originalGpu = internal._webGLTexture;
    const material = new B.StandardMaterial('frozen', scene);
    material.reflectionTexture = texture;
    material.freeze();
    assert.equal(engine.getLoadedTexturesCache().includes(internal), false);
    scene._rebuildTextures();
    const restoredGpu = internal._webGLTexture;
    assert.notEqual(restoredGpu, originalGpu);
    scene._rebuildTextures();
    assert.notEqual(internal._webGLTexture, restoredGpu);
    assert.equal(texture.getInternalTexture(), internal);
    assert.equal(material.reflectionTexture, texture);
    assert.equal(material.isFrozen, true);
    assert.equal(texture.isReady(), true);
    assert.equal(uploads.length, 3);
    for (const upload of uploads) {
      assert.equal(upload[0], faces.getFaceArray());
      assert.deepEqual(upload.slice(1, 7), uploads[0].slice(1, 7));
      assert.equal(upload[7], undefined);
    }
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

test('uninitialized, disposed, and engine-tracked HDR cubes are not rebuilt twice', () => {
  const { B, engine, scene, uploads } = fixture();
  try {
    const manager = B.PcolCubeMapDataManager.getInstance();
    // An in-flight resource has not produced a GPU texture yet.
    manager._pendingDatas['pending.hdr'] = true;
    const pending = new B.PcolHdrCubeTexture(scene, 'pending', 'pending.hdr');
    assert.equal(pending.getInternalTexture(), undefined);
    pending._rebuild();
    assert.equal(uploads.length, 0);
    manager._cachedDatas['pending.hdr'] = manager._cachedDatas['test.hdr'];
    assert.equal(pending.isReady(), true);
    pending._rebuild();
    assert.equal(uploads.length, 2);
    const tracked = new B.PcolHdrCubeTexture(scene, 'tracked', 'test.hdr');
    engine.getLoadedTexturesCache().push(tracked.getInternalTexture());
    const count = uploads.length;
    tracked._rebuild();
    assert.equal(uploads.length, count);
    pending.dispose();
    pending._rebuild();
    assert.equal(uploads.length, count);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
