import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, rm, rmdir, readdir } from 'node:fs/promises';
import { BUILD_OUTPUTS, LAYOUT } from '../../config/project.config.mjs';
import { buildTarget, ensureBuild } from '../../tooling/build/build-target.mjs';
import { verifyBuild } from '../../tooling/build/verify-build.mjs';
import { createServer } from '../../tooling/server/static-server.mjs';
import { makeBuildFixture } from '../helpers/build-fixture.mjs';

test('first startup builds from local inputs, serves them and reuses a current build', async (t) => {
  const root = await makeBuildFixture(t);
  assert.equal((await ensureBuild('development', { root })).rebuilt, true);
  const output = path.join(root, BUILD_OUTPUTS.development);
  const before = await readFile(path.join(output, 'build-manifest.json'));
  assert.deepEqual(await ensureBuild('development', { root }), { rebuilt: false });
  assert.deepEqual(await readFile(path.join(output, 'build-manifest.json')), before);
  const server = createServer({ runtime: output, frozen: path.join(root, LAYOUT.baseline) });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/', '/pcol/', '/assets/texture.bin', '/compatibility/browser.js']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    await response.arrayBuffer();
  }
  assert.deepEqual(await readdir(path.join(root, LAYOUT.cache)), []);
});

test('startup rebuilds missing, damaged and unexpected output files plus invalid manifests', async (t) => {
  const root = await makeBuildFixture(t);
  await buildTarget('development', { root });
  const output = path.join(root, BUILD_OUTPUTS.development);
  const scenarios = [
    () => rm(path.join(output, 'assets/texture.bin')),
    () => writeFile(path.join(output, 'scripts/runtime-bootstrap.js'), 'damaged output'),
    () => writeFile(path.join(output, 'unexpected.txt'), 'extra output'),
    () => writeFile(path.join(output, 'build-manifest.json'), '{invalid json'),
    () =>
      writeFile(path.join(output, 'build-manifest.json'), JSON.stringify({ schemaVersion: 999 })),
  ];
  for (const mutate of scenarios) {
    await mutate();
    assert.equal((await ensureBuild('development', { root })).rebuilt, true);
    await verifyBuild('development', { root });
  }
  assert.deepEqual(await readdir(path.join(root, LAYOUT.cache)), []);
});

test('compatibility changes and added files invalidate the build while the frozen inputs stay unchanged', async (t) => {
  const root = await makeBuildFixture(t);
  await buildTarget('development', { root });
  const baseline = await readFile(path.join(root, LAYOUT.baseline, 'compatibility/browser.js'));
  await writeFile(
    path.join(root, LAYOUT.compatibility, 'browser.js'),
    'window.fixtureCompatibility = 2;',
  );
  await writeFile(
    path.join(root, LAYOUT.compatibility, 'diagnostics.js'),
    'export default function () { return 42; }',
  );
  await assert.rejects(verifyBuild('development', { root }), /Unregistered runtime source/);
  const entry = path.join(root, 'src/application/fixture.js');
  const entryBefore = await readFile(entry);
  await writeFile(
    entry,
    "import diagnostics from '../compatibility/diagnostics.js'; export default function (module) { module.exports = diagnostics(); }",
  );
  await assert.rejects(verifyBuild('development', { root }), /manifest differs/);
  assert.equal((await ensureBuild('development', { root })).rebuilt, true);
  assert.equal(
    await readFile(path.join(root, BUILD_OUTPUTS.development, 'compatibility/browser.js'), 'utf8'),
    'window.fixtureCompatibility = 2;',
  );
  await verifyBuild('development', { root });
  assert.deepEqual(await readdir(path.join(root, BUILD_OUTPUTS.development, 'compatibility')), [
    'browser.js',
  ]);
  assert.ok(
    (
      await readFile(
        path.join(root, BUILD_OUTPUTS.development, 'scripts/runtime-bootstrap.js'),
        'utf8',
      )
    ).includes('return 42;'),
  );
  await writeFile(entry, entryBefore);
  await rm(path.join(root, LAYOUT.compatibility, 'diagnostics.js'));
  assert.equal((await ensureBuild('development', { root })).rebuilt, true);
  await verifyBuild('development', { root });
  assert.deepEqual(
    await readFile(path.join(root, LAYOUT.baseline, 'compatibility/browser.js')),
    baseline,
  );
});

test('invalid baseline and missing source inputs stop startup/build and retain the previous output', async (t) => {
  const root = await makeBuildFixture(t);
  await buildTarget('development', { root });
  const output = path.join(root, BUILD_OUTPUTS.development);
  const previous = await readFile(path.join(output, 'build-manifest.json'));
  const asset = path.join(root, LAYOUT.baseline, 'res/texture.bin');
  const assetBefore = await readFile(asset);
  await writeFile(asset, 'damaged baseline');
  await assert.rejects(ensureBuild('development', { root }), /Frozen integrity failure/);
  await assert.rejects(buildTarget('development', { root }), /Frozen integrity failure/);
  assert.deepEqual(await readFile(path.join(output, 'build-manifest.json')), previous);
  await writeFile(asset, assetBefore);
  await rm(path.join(root, LAYOUT.compatibility, 'browser.js'));
  await rmdir(path.join(root, LAYOUT.compatibility));
  await assert.rejects(ensureBuild('development', { root }), /Missing asset reference/);
  assert.deepEqual(await readFile(path.join(output, 'build-manifest.json')), previous);
  assert.deepEqual(await readdir(path.join(root, LAYOUT.cache)), []);
});
