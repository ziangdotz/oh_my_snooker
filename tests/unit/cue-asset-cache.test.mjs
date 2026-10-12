import test from 'node:test';
import assert from 'node:assert/strict';
import { cueFixture as fixture } from '../helpers/cue-fixture.mjs';

test('cue cache counts loaded files, reuses pending/data and uses the model path for mesh identity', () => {
  const { cache, requests } = fixture();
  assert.equal(cache.nCachedFiles, 0);
  assert.equal(cache.getParsedMesh('stickAlpha', true), null);
  assert.equal(requests.length, 0);
  assert.equal(cache.cacheDefaultFile(), null);
  assert.equal(cache.cacheDefaultFile(), null);
  assert.equal(requests.length, 1);
  requests[0].success('{"meshes":[{"name":"StickAlpha","id":"alpha"}]}');
  assert.equal(cache.nCachedFiles, 1);
  const mesh = cache.getParsedMesh('stickAlpha');
  assert.equal(mesh.name, cache.getStickSourceMeshName('stickAlpha'));
  assert.equal(mesh.id, 'assets/models/alpha-cue.babylon/alpha');
  assert.equal(cache.getParsedMesh('stickAlpha'), mesh);
  assert.equal(cache.cacheDefaultFile(), mesh);
  assert.equal(requests.length, 1);
  assert.equal(cache.nCachedFiles, 1);
  assert.equal(cache.defaultStickName, 'stickAlpha');
  assert.equal(cache.getStickSpecs('stickAlpha').len, 1.45);
  assert.equal(cache.getStickSpecs('stickAlpha').tipRadius, 0.005);
  assert.equal(cache.getStickSpecs('stickAlpha').buttRadius, 0.015);
  assert.equal(cache.getStickSpecs('stickAlpha'), cache.getStickSpecs('stickAlpha'));
  assert.equal(cache.getStickMaterialName('stickAlpha'), 'stickAlphaMat');
  assert.throws(() => cache.stickRootFolder, /no more stickRootFolder/);
  assert.equal(requests[0].progress, null);
  assert.equal(requests[0].database, null);
  assert.equal(requests[0].binary, false);
});

test('cue parse and missing-mesh failures remain explicit without re-requesting cached responses', () => {
  for (const response of ['{broken', '{"meshes":[]}']) {
    const { cache, requests } = fixture();
    cache.cacheDefaultFile();
    assert.doesNotThrow(() => requests[0].success(response));
    assert.equal(cache.getParsedMesh('stickAlpha').isError, true);
    assert.equal(cache.nCachedFiles, 1);
    assert.equal(requests.length, 1);
  }
  const { cache } = fixture();
  assert.equal(cache.getParsedMesh('missing').isError, true);
});

test('cue request retries are bounded and exhausted requests do not count as cached files', () => {
  const { cache, requests } = fixture();
  cache.cacheDefaultFile();
  for (let index = 0; index < 4; index++) {
    requests[index].failure();
  }
  assert.equal(requests.length, 4);
  assert.equal(cache.getParsedMesh('stickAlpha').isError, true);
  assert.equal(cache.nCachedFiles, 0);
  assert.equal(cache.cacheDefaultFile().message, 'bbl file load error...');
  assert.equal(requests.length, 4, 'Exhausted results stay cached');
});

test('cue cache retries the same URL and counts only the eventual response', () => {
  const { cache, requests } = fixture();
  cache.cacheDefaultFile();
  requests[0].failure();
  requests[1].failure();
  assert.equal(cache.nCachedFiles, 0);
  assert.equal(cache.cacheDefaultFile(), null);
  assert.equal(requests.length, 3);
  assert.ok(requests.every((request) => request.url === requests[0].url));
  requests[2].success('{"meshes":[{"name":"StickAlpha","id":"alpha","positions":[1,2,3]}]}');
  const mesh = cache.cacheDefaultFile();
  assert.deepEqual([...mesh.positions], [1, 2, 3]);
  assert.equal(cache.nCachedFiles, 1);
  assert.equal(requests.length, 3);
});

test('cue definitions sharing a model share one request and preserve mesh/spec identities', () => {
  const { cache, definitions, requests } = fixture();
  const specs = { len: 1.2 };
  definitions.second = { ...definitions.stickAlpha, meshName: 'Second', specs };
  assert.equal(cache.getParsedMesh('second'), null);
  assert.equal(cache.getParsedMesh('stickAlpha'), null);
  assert.equal(cache.getParsedMesh('second', true), null);
  assert.equal(requests.length, 1);
  requests[0].success('{"meshes":[{"name":"StickAlpha","id":"a"},{"name":"Second","id":"b"}]}');
  assert.equal(cache.getParsedMesh('second').name, cache.getStickSourceMeshName('second'));
  assert.equal(cache.getParsedMesh('second').id, requests[0].url + '/b');
  assert.equal(cache.getStickSpecs('second'), specs);
  assert.notEqual(cache.getParsedMesh('second'), cache.getParsedMesh('stickAlpha'));
  assert.equal(cache.nCachedFiles, 1);
});

test('a synchronous response is retained while the initiating cache lookup still returns null', () => {
  const { cache, Babylon } = fixture();
  let requests = 0;
  Babylon.Tools.LoadFile = (_url, success) => {
    requests++;
    success('{"meshes":[{"name":"StickAlpha","id":"alpha"}]}');
  };
  assert.equal(cache.cacheDefaultFile(), null);
  assert.ok(cache.cacheDefaultFile());
  assert.equal(requests, 1);
  assert.equal(cache.nCachedFiles, 1);
});
