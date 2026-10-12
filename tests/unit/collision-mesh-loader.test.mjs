import test from 'node:test';
import assert from 'node:assert/strict';
import queueFactory from '../../src/infrastructure/assets/asset-queue.js';
import collisionFactory from '../../src/infrastructure/assets/collision-mesh-loader.js';

function fixture(options = {}) {
  const requests = [];
  const images = [];
  const extensions = [];
  const queueModule = { exports: {} };
  queueFactory(queueModule, queueModule.exports);
  const dependencies = {
    'infrastructure/assets/asset-queue': queueModule.exports,
    'infrastructure/assets/resource-paths': { rgb: '/collision/' },
    'infrastructure/network/local-request': {
      ajaxGet(url, done) {
        if (options.requestThrows) {
          throw new Error('request failed');
        }
        requests.push({ url, done });
      },
      loadImg(url, done) {
        if (options.imageRequestThrows) {
          throw new Error('image request failed');
        }
        const image = { url };
        images.push({ image, done });
        if (options.imageImmediateSuccess) {
          done(null, image);
        }
        return image;
      },
      img2ImgData(image) {
        if (image.decodeError) {
          throw new Error('image decode failed');
        }
        return image;
      },
    },
    'domain/physics/physics-api': {
      MeshBody: class {
        constructor(data) {
          if (options.meshThrows) {
            throw new Error('mesh failed');
          }
          this.groups = Object.keys(data).map((name) => ({ name }));
        }
      },
      exts: {
        uv4pg: {
          createNTableWithImgData(image) {
            if (options.normalTableThrows) {
              throw new Error('normal table failed');
            }
            return { image };
          },
          extendPolyGroup(group, table) {
            if (options.extensionThrows) {
              throw new Error('extension failed');
            }
            extensions.push({ group, table });
          },
        },
      },
    },
  };
  const module = { exports: {} };
  collisionFactory(module, module.exports, (id) => dependencies[id]);
  module.exports._concurrency = 1;
  return { loader: module.exports, requests, images, extensions };
}

test('malformed JSON completes with an error, drains the queue and permits retry', () => {
  const state = fixture();
  state.loader.reload('broken.json');
  state.loader.reload('next.json');
  assert.doesNotThrow(() => state.requests[0].done(null, '{broken'));
  assert.equal(state.loader.getCache('broken.json', true).isError, true);
  assert.equal(state.requests[1].url, '/collision/next.json');
  state.requests[1].done(null, '{}');
  assert.equal(state.loader._currentTaskCount, 0);
  state.loader.reload('broken.json');
  state.requests[2].done(null, '{}');
  assert.equal(state.loader.getCache('broken.json', true).isError, undefined);
  assert.equal(state.loader._currentTaskCount, 0);
});

test('network and synchronous mesh/request failures release the queue slot', () => {
  for (const options of [{}, { requestThrows: true }, { meshThrows: true }]) {
    const state = fixture(options);
    assert.doesNotThrow(() => state.loader.reload('table.json'));
    if (!options.requestThrows) {
      assert.doesNotThrow(() =>
        state.requests[0].done(options.meshThrows ? null : new Error('network failed'), '{}'),
      );
    }
    assert.equal(state.loader.getCache('table.json', true).isError, true);
    assert.equal(state.loader._currentTaskCount, 0);
  }
});

test('shared normal maps load once and preserve group identity and extension order', () => {
  const state = fixture();
  state.loader.reload('table.json');
  state.requests[0].done(
    null,
    JSON.stringify({ first: { nt: 'atlas.png' }, second: { nt: 'atlas.png' } }),
  );
  assert.equal(state.images.length, 1);
  assert.equal(state.loader.getCache('table.json', true), null);
  state.images[0].done(null, state.images[0].image);
  const mesh = state.loader.getCache('table.json', true);
  assert.deepEqual(
    state.extensions.map(({ group }) => group),
    mesh.groups,
  );
  assert.equal(state.extensions[0].table, state.extensions[1].table);
  assert.ok(mesh.groups.every((group) => !Object.hasOwn(group, 'pendingImg')));
  assert.equal(state.loader._currentTaskCount, 0);
});

test('normal-map decode, construction, extension and request failures finish as errors', () => {
  for (const options of [
    { decodeError: true },
    { normalTableThrows: true },
    { extensionThrows: true },
    { imageRequestThrows: true },
  ]) {
    const state = fixture(options);
    state.loader.reload('table.json');
    assert.doesNotThrow(() => state.requests[0].done(null, '{"first":{"nt":"atlas.png"}}'));
    if (!options.imageRequestThrows) {
      const { image, done } = state.images[0];
      image.decodeError = options.decodeError;
      assert.doesNotThrow(() => done(null, image));
    }
    assert.equal(state.loader.getCache('table.json', true).isError, true);
    assert.equal(state.loader._currentTaskCount, 0);
  }
});

test('image failures wait for remaining maps and duplicate callbacks cannot complete twice', () => {
  const state = fixture();
  state.loader.reload('table.json');
  state.loader.reload('next.json');
  const response = '{"first":{"nt":"first.png"},"second":{"nt":"second.png"}}';
  state.requests[0].done(null, response);
  state.requests[0].done(null, response);
  assert.equal(state.images.length, 2);
  state.images[0].done(new Error('image failed'), state.images[0].image);
  state.images[0].done(null, state.images[0].image);
  assert.equal(state.requests.length, 1);
  state.images[1].done(null, state.images[1].image);
  assert.equal(state.loader.getCache('table.json', true).isError, true);
  assert.equal(state.requests.length, 2);
  state.images[1].done(null, state.images[1].image);
  assert.equal(state.loader._currentTaskCount, 1);
  state.requests[1].done(null, '{}');
  assert.equal(state.loader._currentTaskCount, 0);
});

test('synchronous image callbacks preserve all shared groups and finish exactly once', () => {
  const state = fixture({ imageImmediateSuccess: true });
  state.loader.reload('table.json');
  state.requests[0].done(null, '{"first":{"nt":"atlas.png"},"second":{"nt":"atlas.png"}}');
  const mesh = state.loader.getCache('table.json', true);
  assert.equal(mesh.groups.length, 2);
  assert.equal(state.extensions.length, 2);
  assert.equal(state.images.length, 1);
  assert.ok(mesh.groups.every((group) => !Object.hasOwn(group, 'pendingImg')));
  assert.equal(state.loader._currentTaskCount, 0);
});

test('out-of-order maps preserve body group order and late failures cannot overwrite success', () => {
  const state = fixture();
  state.loader.reload('table.json');
  state.requests[0].done(null, '{"first":{"nt":"first.png"},"second":{"nt":"second.png"}}');
  state.images[1].done(null, state.images[1].image);
  assert.equal(state.loader.getCache('table.json', true), null);
  state.images[0].done(null, state.images[0].image);
  const mesh = state.loader.getCache('table.json', true);
  assert.deepEqual(
    mesh.groups.map((group) => group.name),
    ['first', 'second'],
  );
  assert.deepEqual(
    state.extensions.map(({ group }) => group.name),
    ['second', 'first'],
  );
  state.images[0].done(new Error('late duplicate'), state.images[0].image);
  assert.equal(state.loader.getCache('table.json', true), mesh);
  assert.equal(state.loader._currentTaskCount, 0);
});
