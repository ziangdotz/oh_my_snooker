import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyProjectStructure } from '../../tooling/lib/project-structure.mjs';

test('maintained sources, third-party snapshots and generated output occupy separate named directories', async () => {
  const result = await verifyProjectStructure();
  assert.ok(result.codeFiles >= 15);
});
