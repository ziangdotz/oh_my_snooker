import test from 'node:test';
import assert from 'node:assert/strict';
import { compareManifestSnapshots } from '../../tooling/testing/manifest-snapshots.mjs';

test('version guard diagnostics distinguish delivered bytes, source changes and graph changes', () => {
  const before = {
    'build/build-manifest.json': {
      sha256: 'before',
      files: [{ path: 'scripts/game.js', sha256: 'same' }],
      sources: [{ path: 'src/game.js', sha256: 'old' }],
      modulesSHA256: 'same',
      referencesSHA256: 'old',
    },
  };
  const after = {
    'build/build-manifest.json': {
      sha256: 'after',
      files: [{ path: 'scripts/game.js', sha256: 'same' }],
      sources: [{ path: 'src/game.js', sha256: 'new' }],
      modulesSHA256: 'same',
      referencesSHA256: 'new',
    },
  };
  assert.deepEqual(compareManifestSnapshots(before, after), [
    {
      manifest: 'build/build-manifest.json',
      changedOutputs: [],
      changedSources: ['src/game.js'],
      moduleCatalogChanged: false,
      referencesChanged: true,
    },
  ]);
  assert.deepEqual(compareManifestSnapshots(before, before), []);
});
