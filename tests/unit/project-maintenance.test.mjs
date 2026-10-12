import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { ROOT } from '../../config/project.config.mjs';
import {
  auditDocumentLinks,
  auditRuntimeReachability,
} from '../../tooling/validation/project-maintenance.mjs';

test('maintenance finds isolated modules and rejects missing dependency IDs', () => {
  const catalog = {
    entry: 'main',
    modules: [
      { id: 'main', dependencies: ['used'] },
      { id: 'used', dependencies: ['main'] },
      { id: 'unused', dependencies: [] },
    ],
  };
  const report = auditRuntimeReachability(catalog);
  assert.equal(report.passed, false);
  assert.equal(report.reached, 2);
  assert.deepEqual(report.unreachable, ['unused']);
  catalog.modules[0].dependencies.push('missing');
  assert.throws(() => auditRuntimeReachability(catalog), /Unknown runtime dependency/);
});

test('documentation audit distinguishes missing maintained inputs from optional generated evidence', async () => {
  const cache = path.resolve(ROOT, '.cache');
  await mkdir(cache, { recursive: true });
  const root = await mkdtemp(path.join(cache, 'maintenance-docs-'));
  try {
    await mkdir(path.join(root, 'docs'));
    await writeFile(path.join(root, 'README.md'), '# Current');
    await writeFile(
      path.join(root, 'docs/guide.md'),
      '[root](../README.md#current) [missing](missing.md) [generated](../artifacts/testing/test/report.json) [summary](../reports/measurement/test-summary.json) [escaped](../../outside.md) [bad anchor](../README.md#absent) [web](https://example.com)',
    );
    const report = await auditDocumentLinks(root, ['docs/guide.md']);
    assert.equal(report.passed, false);
    assert.equal(report.links.filter((link) => link.generated).length, 1);
    assert.equal(report.issues.length, 4);
    assert.ok(report.issues.some((issue) => issue.reason === 'Missing maintained link target'));
    assert.ok(report.issues.some((issue) => issue.reason === 'Link leaves the project'));
    assert.ok(report.issues.some((issue) => issue.reason === 'Missing document anchor'));
    await writeFile(path.join(root, 'docs/missing.md'), 'Present');
    await mkdir(path.join(root, 'reports/measurement'), { recursive: true });
    await writeFile(path.join(root, 'reports/measurement/test-summary.json'), '{}');
    const text = await readFile(path.join(root, 'docs/guide.md'), 'utf8');
    await writeFile(
      path.join(root, 'docs/guide.md'),
      text
        .replace('[escaped](../../outside.md)', '')
        .replace('[bad anchor](../README.md#absent)', ''),
    );
    assert.equal((await auditDocumentLinks(root, ['docs/guide.md'])).passed, true);
  } finally {
    assert.equal(path.dirname(root), cache);
    await rm(root, { recursive: true, force: true });
  }
});
