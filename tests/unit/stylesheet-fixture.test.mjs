import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { ROOT } from '../../config/project.config.mjs';
import { removeBuildPath } from '../../tooling/build/build-transaction.mjs';
import { readStylesheet } from '../helpers/stylesheet-fixture.mjs';

test('CSS comparison expands both source and build imports in order and rejects cycles', async () => {
  await mkdir(path.join(ROOT, '.cache'), { recursive: true });
  const directory = await mkdtemp(path.join(ROOT, '.cache/test-stylesheet-'));
  try {
    await writeFile(
      path.join(directory, 'entry.css'),
      "@import url('./base.css');\n@import url('typography.css');",
    );
    await writeFile(path.join(directory, 'base.css'), 'body { margin: 0; }');
    await writeFile(path.join(directory, 'typography.css'), 'h2 { font-weight: 700; }');
    assert.equal(
      await readStylesheet(path.join(directory, 'entry.css')),
      'body { margin: 0; }\nh2 { font-weight: 700; }',
    );
    await writeFile(path.join(directory, 'typography.css'), "@import url('./entry.css');");
    await assert.rejects(
      readStylesheet(path.join(directory, 'entry.css')),
      /Circular stylesheet import/,
    );
  } finally {
    await removeBuildPath(ROOT, directory);
  }
});
