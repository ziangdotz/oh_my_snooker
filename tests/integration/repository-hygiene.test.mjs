import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cp, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { ROOT, filesIn, sha256 } from '../../tooling/lib/integrity.mjs';

const execute = promisify(execFile);

async function withRepository(context, check) {
  try {
    await execute('git', ['--version'], { windowsHide: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      context.skip('Git is not installed; repository-specific checks require Git');
      return;
    }
    throw error;
  }
  const cache = path.resolve(ROOT, '.cache');
  await mkdir(cache, { recursive: true });
  const root = await mkdtemp(path.join(cache, 'repository-hygiene-'));
  const emptyConfig = path.join(root, 'empty-git-config');
  try {
    await writeFile(emptyConfig, '');
    const git = async (...args) =>
      (
        await execute(
          'git',
          [
            '-C',
            root,
            '-c',
            'core.autocrlf=true',
            '-c',
            'core.safecrlf=false',
            '-c',
            'core.attributesFile=' + emptyConfig,
            ...args,
          ],
          {
            windowsHide: true,
            env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: emptyConfig },
          },
        )
      ).stdout;
    await git('init', '--quiet');
    for (const file of ['.gitignore', '.gitattributes']) {
      await cp(path.join(ROOT, file), path.join(root, file));
    }
    await check({ root, git });
  } finally {
    assert.equal(path.dirname(root), cache);
    await rm(root, { recursive: true, force: true });
  }
}

test('Git ignores generated output and private overrides while retaining required source and evidence', async (context) => {
  await withRepository(context, async ({ git }) => {
    const ignored = [
      'node_modules/dependency/index.js',
      '.pnpm-store/file',
      '.cache/probe.mjs',
      'build/development/index.html',
      'dist/index.html',
      'artifacts/testing/scene.png',
      '.env',
      '.env.production',
      'settings.local',
      'reports/measurement/gameplay-motion-attempt-1.json',
    ];
    const maintained = [
      'src/start.mjs',
      'baselines/pcol/game/res/index.js',
      'pnpm-lock.yaml',
      'reports/validation/architecture-migration-map.json',
      'reports/validation/project-maintenance.json',
      'reports/measurement/gameplay-smoothness-summary.json',
      'reports/measurement/camera-rate-characterization-after.json',
      '.env.example',
    ];
    const result = await git('check-ignore', '--no-index', ...ignored, ...maintained);
    assert.deepEqual(result.trim().split(/\r?\n/).sort(), ignored.sort());
  });
});

test('Git checkout preserves every frozen file, retained dependency and asset byte even with autocrlf', async (context) => {
  await withRepository(context, async ({ root, git }) => {
    const hashes = new Map();
    for (const directory of ['baselines', 'src/third-party', 'src/assets']) {
      await cp(path.join(ROOT, directory), path.join(root, directory), { recursive: true });
      for (const file of await filesIn(path.join(root, directory))) {
        const relative = directory + '/' + file;
        hashes.set(relative, sha256(await readFile(path.join(root, relative))));
      }
    }
    await mkdir(path.join(root, 'src/application'), { recursive: true });
    await writeFile(
      path.join(root, 'src/application/example.js'),
      'export default function() {}\r\n',
    );
    await writeFile(path.join(root, 'start.cmd'), '@echo off\n');
    await git('add', '.gitattributes', 'baselines', 'src', 'start.cmd');
    for (const file of [...hashes.keys(), 'src/application/example.js', 'start.cmd']) {
      await unlink(path.join(root, file));
    }
    await git('checkout-index', '--all', '--force');
    for (const [file, hash] of hashes) {
      assert.equal(sha256(await readFile(path.join(root, file))), hash, file);
    }
    assert.equal(
      await readFile(path.join(root, 'src/application/example.js'), 'utf8'),
      'export default function() {}\n',
    );
    assert.equal(await readFile(path.join(root, 'start.cmd'), 'utf8'), '@echo off\r\n');
    assert.ok(hashes.size > 100);
    context.diagnostic(`Verified ${hashes.size} protected files through actual Git checkout`);
  });
});
