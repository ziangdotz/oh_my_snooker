import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile, readFile, rename, readdir, symlink } from 'node:fs/promises';
import {
  buildPaths,
  withBuildLock,
  publishBuildOutput,
  recoverBuildOutput,
  pathExists,
  assertWorkspacePath,
  moveBuildDirectory,
} from '../../tooling/build/build-transaction.mjs';
import { makeBuildFixture } from '../helpers/build-fixture.mjs';

async function publicationFixture(t) {
  const root = await makeBuildFixture(t);
  const paths = buildPaths('development', root);
  await mkdir(paths.cache, { recursive: true });
  await mkdir(paths.target, { recursive: true });
  await writeFile(path.join(paths.target, 'index.html'), 'previous output');
  const staging = await mkdtemp(path.join(paths.cache, 'build-development-'));
  await writeFile(path.join(staging, 'index.html'), 'new output');
  return { paths, staging };
}

test('short file locks retry with a fixed bound; unknown and permanent failures still surface', async (t) => {
  const { paths, staging } = await publicationFixture(t);
  const waits = [];
  let attempts = 0;
  await moveBuildDirectory(paths.root, staging, path.join(paths.cache, 'moved'), {
    renameDirectory: async (from, to) => {
      if (++attempts < 3) {
        throw Object.assign(new Error('temporary lock'), { code: 'EPERM' });
      }
      await rename(from, to);
    },
    wait: async (ms) => waits.push(ms),
  });
  assert.deepEqual(waits, [50, 100]);
  attempts = 0;
  await assert.rejects(
    moveBuildDirectory(paths.root, paths.target, paths.backup, {
      renameDirectory: async () => {
        attempts++;
        throw Object.assign(new Error('permanent lock'), { code: 'EBUSY' });
      },
      wait: async () => {},
    }),
    /permanent lock/,
  );
  assert.equal(attempts, 4);
  attempts = 0;
  await assert.rejects(
    moveBuildDirectory(paths.root, paths.target, paths.backup, {
      renameDirectory: async () => {
        attempts++;
        throw Object.assign(new Error('disk failure'), { code: 'EIO' });
      },
      wait: async () => assert.fail('Unexpected retry'),
    }),
    /disk failure/,
  );
  assert.equal(attempts, 1);
});

test('failed publication restores the previous output and releases its lock', async (t) => {
  const { paths, staging } = await publicationFixture(t);
  await assert.rejects(
    withBuildLock(paths, () =>
      publishBuildOutput(paths, staging, {
        renameDirectory: async (from, to) => {
          if (from === staging) {
            throw new Error('simulated publication failure');
          }
          return rename(from, to);
        },
      }),
    ),
    /simulated publication failure/,
  );
  assert.equal(await readFile(path.join(paths.target, 'index.html'), 'utf8'), 'previous output');
  assert.equal(await pathExists(paths.backup), false);
  assert.equal(await pathExists(paths.lock), false);
  await withBuildLock(paths, () => publishBuildOutput(paths, staging));
  assert.equal(await readFile(path.join(paths.target, 'index.html'), 'utf8'), 'new output');
  assert.deepEqual(await readdir(paths.cache), []);
});

test('failed rollback preserves the old files and the next attempt can recover them', async (t) => {
  const { paths, staging } = await publicationFixture(t);
  await assert.rejects(
    withBuildLock(paths, () =>
      publishBuildOutput(paths, staging, {
        renameDirectory: async (from, to) => {
          if (from === staging || from === paths.backup) {
            throw new Error('simulated file lock');
          }
          return rename(from, to);
        },
      }),
    ),
    (error) => error instanceof AggregateError && error.message.includes(paths.backup),
  );
  assert.equal(await readFile(path.join(paths.backup, 'index.html'), 'utf8'), 'previous output');
  assert.equal(await pathExists(paths.target), false);
  assert.equal(await pathExists(paths.lock), false);
  await withBuildLock(paths, () => recoverBuildOutput(paths));
  assert.equal(await readFile(path.join(paths.target, 'index.html'), 'utf8'), 'previous output');
});

test('failure to move the old output leaves its files intact', async (t) => {
  const { paths, staging } = await publicationFixture(t);
  await assert.rejects(
    withBuildLock(paths, () =>
      publishBuildOutput(paths, staging, {
        renameDirectory: async () => {
          throw new Error('previous output is busy');
        },
      }),
    ),
    /previous output is busy/,
  );
  assert.equal(await readFile(path.join(paths.target, 'index.html'), 'utf8'), 'previous output');
  assert.equal(await pathExists(paths.backup), false);
  assert.equal(await pathExists(paths.lock), false);
});

test('ambiguous leftover backups stop recovery without deleting either output', async (t) => {
  const { paths } = await publicationFixture(t);
  await mkdir(paths.backup);
  await writeFile(path.join(paths.backup, 'index.html'), 'saved previous output');
  await assert.rejects(
    withBuildLock(paths, () => recoverBuildOutput(paths)),
    /requires inspection/,
  );
  assert.equal(
    await readFile(path.join(paths.backup, 'index.html'), 'utf8'),
    'saved previous output',
  );
  assert.equal(await readFile(path.join(paths.target, 'index.html'), 'utf8'), 'previous output');
});

test('same-target builds are mutually exclusive and different targets remain independent', async (t) => {
  const root = await makeBuildFixture(t);
  const paths = buildPaths('development', root);
  let release;
  let entered;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const ready = new Promise((resolve) => {
    entered = resolve;
  });
  const first = withBuildLock(paths, async () => {
    entered();
    await gate;
  });
  await ready;
  try {
    await assert.rejects(
      withBuildLock(paths, () => assert.fail('Locked callback ran')),
      (error) => error.code === 'EBUILDLOCK' && error.message.includes(`pid=${process.pid}`),
    );
    await withBuildLock(buildPaths('production', root), async () => {});
    assert.equal(await pathExists(paths.lock), true);
  } finally {
    release();
    await first;
  }
  assert.equal(await pathExists(paths.lock), false);
});

test('unknown targets, paths outside the workspace and linked build directories are rejected', async (t) => {
  const root = await makeBuildFixture(t);
  assert.throws(() => buildPaths('unknown', root), /Unsupported/);
  await assert.rejects(assertWorkspacePath(root, path.dirname(root)), /outside workspace/);
  await mkdir(path.join(root, 'redirect'), { recursive: true });
  await symlink(
    path.join(root, 'redirect'),
    path.join(root, 'build'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await assert.rejects(
    assertWorkspacePath(root, path.join(root, 'build/development')),
    /through a link/,
  );
});
