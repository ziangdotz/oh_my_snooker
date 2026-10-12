import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, LAYOUT } from '../../config/project.config.mjs';
import { sha256 } from '../../tooling/lib/integrity.mjs';
import { removeBuildPath } from '../../tooling/build/build-transaction.mjs';

/** 小型隔离输入覆盖构建故障；不改写真实冻结基准或交付目录。 */
export async function makeBuildFixture(t) {
  const cache = path.join(ROOT, LAYOUT.cache);
  await mkdir(cache, { recursive: true });
  const root = await mkdtemp(path.join(cache, 'test-build-'));
  t.after(() => removeBuildPath(ROOT, root));
  const files = [];
  const resources = {
    'index.html':
      '<!doctype html><script src="./compatibility/browser.js"></script><script src="./res/index.js"></script>',
    'res/index.js': 'window.fixture = true;',
    'res/texture.bin': 'fixture asset',
    'compatibility/browser.js': 'window.fixtureCompatibility = 1;',
  };
  for (const file of Object.keys(resources).sort()) {
    const bytes = Buffer.from(resources[file]);
    const output = path.join(root, LAYOUT.baseline, file);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, bytes);
    files.push({ path: file, bytes: bytes.length, sha256: sha256(bytes) });
  }
  await mkdir(path.dirname(path.join(root, LAYOUT.baselineManifest)), { recursive: true });
  await writeFile(
    path.join(root, LAYOUT.baselineManifest),
    JSON.stringify({
      schemaVersion: 1,
      baselineId: 'fixture-v1',
      files,
    }),
  );
  await mkdir(path.join(root, LAYOUT.compatibility), { recursive: true });
  await writeFile(
    path.join(root, LAYOUT.compatibility, 'browser.js'),
    resources['compatibility/browser.js'],
  );
  const owned = {
    'src/index.html':
      '<!doctype html><script src="./compatibility/browser.js"></script><script src="./scripts/runtime-bootstrap.js"></script>',
    'src/assets/texture.bin': resources['res/texture.bin'],
    'src/application/fixture.js': 'export default function (module) { module.exports = true; }',
    'src/runtime/module-loader.js': await readFile(
      path.join(ROOT, 'src/runtime/module-loader.js'),
      'utf8',
    ),
    [LAYOUT.runtimeCatalog]: JSON.stringify({
      schemaVersion: 1,
      entry: 'application/fixture',
      bundles: {
        bootstrap: 'scripts/runtime-bootstrap.js',
        'render-engine': 'scripts/render-engine.js',
        'snooker-game': 'scripts/snooker-game.js',
      },
      modules: [
        {
          id: 'application/fixture',
          source: 'src/application/fixture.js',
          bundle: 'bootstrap',
          dependencies: [],
        },
      ],
    }),
  };
  for (const [file, bytes] of Object.entries(owned)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), bytes);
  }
  await mkdir(path.join(root, LAYOUT.thirdParty), { recursive: true });
  return root;
}
